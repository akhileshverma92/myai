import { getProviderConfig, type ModelCapability } from "@/src/config/accountApiConfig"
import { ProviderError, normalizeHttpError, normalizeUnknownError } from "@/lib/ai/errors"
import { fetchWithTimeout } from "@/lib/ai/http"
import { loadSecrets } from "@/lib/ai/secrets"
import { buildMessagesForTask, getTaskProfile } from "@/lib/ai/task-classifier"
import type { GenerateRequest, GenerateResult, ProviderAdapter, ProviderAvailability } from "@/lib/ai/types"

export function createOllamaAdapter(): ProviderAdapter {
  const config = getProviderConfig("ollama")!

  return {
    id: "ollama",
    name: config.name,

    isConfigured() {
      return Boolean(loadSecrets().ollama.baseUrl)
    },

    getAvailability(): ProviderAvailability {
      return this.isConfigured() ? "configured" : "misconfigured"
    },

    supports(capability: ModelCapability) {
      return config.models.some((m) => m.capabilities.includes(capability))
    },

    listModels() {
      return config.models.map((m) => m.id)
    },

    async generate(request: GenerateRequest, modelId: string): Promise<GenerateResult> {
      const baseUrl = loadSecrets().ollama.baseUrl
      if (!baseUrl) {
        throw new ProviderError({
          code: "auth",
          message: "OLLAMA_BASE_URL is not configured.",
          retryable: false,
          providerId: "ollama",
          modelId,
        })
      }

      const profile = getTaskProfile(request.taskType)
      const messages = buildMessagesForTask(request.messages, request.taskType, request.systemInstruction)
      const modelMeta = config.models.find((m) => m.id === modelId)
      const started = Date.now()

      try {
        const response = await fetchWithTimeout(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelId,
            messages,
            stream: false,
            options: {
              temperature: request.temperature ?? profile.temperature,
              num_predict: request.maxTokens ?? profile.maxTokens,
            },
            ...(request.jsonMode ? { format: "json" } : {}),
          }),
          signal: request.signal,
        })

        const raw = await response.text()
        let payload: unknown
        try {
          payload = JSON.parse(raw)
        } catch {
          throw new ProviderError({
            code: "invalid_output",
            message: "Ollama returned non-JSON.",
            retryable: true,
            status: response.status,
            providerId: "ollama",
            modelId,
          })
        }

        if (!response.ok) {
          throw new ProviderError(normalizeHttpError(response.status, raw, "ollama", modelId))
        }

        const text = String((payload as { message?: { content?: string } }).message?.content ?? "").trim()
        if (!text) {
          throw new ProviderError({
            code: "invalid_output",
            message: "Ollama returned an empty response.",
            retryable: true,
            providerId: "ollama",
            modelId,
          })
        }

        return {
          text,
          providerId: "ollama",
          providerName: config.name,
          modelId,
          modelDisplayName: modelMeta?.displayName ?? modelId,
          latencyMs: Date.now() - started,
          fallbackUsed: false,
          attemptedProviders: ["ollama"],
          taskType: request.taskType,
        }
      } catch (error) {
        if (error instanceof ProviderError) throw error
        throw new ProviderError(normalizeUnknownError(error, "ollama", modelId))
      }
    },
  }
}
