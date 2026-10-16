import { getProviderConfig, type ModelCapability } from "@/src/config/accountApiConfig"
import { ProviderError, normalizeHttpError, normalizeUnknownError } from "@/lib/ai/errors"
import { fetchWithTimeout } from "@/lib/ai/http"
import { loadSecrets } from "@/lib/ai/secrets"
import { buildMessagesForTask, getTaskProfile } from "@/lib/ai/task-classifier"
import type { GenerateRequest, GenerateResult, ProviderAdapter, ProviderAvailability } from "@/lib/ai/types"

export function createGeminiAdapter(): ProviderAdapter {
  const config = getProviderConfig("gemini")!

  return {
    id: "gemini",
    name: config.name,

    isConfigured() {
      return Boolean(loadSecrets().gemini.apiKey)
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
      const apiKey = loadSecrets().gemini.apiKey
      if (!apiKey) {
        throw new ProviderError({
          code: "auth",
          message: "Google Gemini API key is missing.",
          retryable: false,
          providerId: "gemini",
          modelId,
        })
      }

      const profile = getTaskProfile(request.taskType)
      const messages = buildMessagesForTask(request.messages, request.taskType, request.systemInstruction)
      const system = messages.find((m) => m.role === "system")?.content
      const contents = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }))

      const modelMeta = config.models.find((m) => m.id === modelId)
      const started = Date.now()
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`

      try {
        const response = await fetchWithTimeout(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: system ? { parts: [{ text: system }] } : undefined,
            generationConfig: {
              maxOutputTokens: request.maxTokens ?? profile.maxTokens,
              temperature: request.temperature ?? profile.temperature,
              ...(request.jsonMode ? { responseMimeType: "application/json" } : {}),
            },
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
            message: "Gemini returned non-JSON.",
            retryable: true,
            status: response.status,
            providerId: "gemini",
            modelId,
          })
        }

        if (!response.ok) {
          throw new ProviderError(normalizeHttpError(response.status, raw, "gemini", modelId))
        }

        const text =
          (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
            .candidates?.[0]?.content?.parts?.map((p) => p.text ?? "")
            .join("")
            .trim() ?? ""

        if (!text) {
          throw new ProviderError({
            code: "invalid_output",
            message: "Gemini returned an empty response.",
            retryable: true,
            providerId: "gemini",
            modelId,
          })
        }

        const usageMeta = (payload as {
          usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number }
        }).usageMetadata

        return {
          text,
          providerId: "gemini",
          providerName: config.name,
          modelId,
          modelDisplayName: modelMeta?.displayName ?? modelId,
          latencyMs: Date.now() - started,
          usage: usageMeta
            ? {
                inputTokens: usageMeta.promptTokenCount,
                outputTokens: usageMeta.candidatesTokenCount,
                totalTokens: usageMeta.totalTokenCount,
              }
            : undefined,
          fallbackUsed: false,
          attemptedProviders: ["gemini"],
          taskType: request.taskType,
        }
      } catch (error) {
        if (error instanceof ProviderError) throw error
        throw new ProviderError(normalizeUnknownError(error, "gemini", modelId))
      }
    },
  }
}
