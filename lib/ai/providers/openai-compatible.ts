import type { ProviderId, ModelCapability } from "@/src/config/accountApiConfig"
import { getProviderConfig } from "@/src/config/accountApiConfig"
import { ProviderError, normalizeHttpError, normalizeUnknownError } from "@/lib/ai/errors"
import { extractOpenAiText, extractOpenAiUsage, fetchWithTimeout } from "@/lib/ai/http"
import { buildMessagesForTask, getTaskProfile } from "@/lib/ai/task-classifier"
import type { GenerateRequest, GenerateResult, ProviderAdapter, ProviderAvailability, StreamChunk } from "@/lib/ai/types"

export interface OpenAiCompatibleOptions {
  id: ProviderId
  getApiKey: () => string | undefined
  getBaseUrl: () => string
  defaultHeaders?: () => Record<string, string>
  isConfiguredExtra?: () => boolean
}

export function createOpenAiCompatibleAdapter(options: OpenAiCompatibleOptions): ProviderAdapter {
  const config = getProviderConfig(options.id)!

  return {
    id: options.id,
    name: config.name,

    isConfigured() {
      const keyOk = Boolean(options.getApiKey())
      const extra = options.isConfiguredExtra ? options.isConfiguredExtra() : true
      return keyOk && extra
    },

    getAvailability(): ProviderAvailability {
      if (!this.isConfigured()) return "misconfigured"
      return "configured"
    },

    supports(capability: ModelCapability) {
      return config.models.some((m) => m.capabilities.includes(capability))
    },

    listModels() {
      return config.models.map((m) => m.id)
    },

    async generate(request: GenerateRequest, modelId: string): Promise<GenerateResult> {
      const apiKey = options.getApiKey()
      if (!apiKey && options.id !== "ollama") {
        throw new ProviderError({
          code: "auth",
          message: `${config.name} API key is missing.`,
          retryable: false,
          providerId: options.id,
          modelId,
        })
      }

      const profile = getTaskProfile(request.taskType)
      const messages = buildMessagesForTask(request.messages, request.taskType, request.systemInstruction)
      const modelMeta = config.models.find((m) => m.id === modelId)
      const started = Date.now()
      const url = `${options.getBaseUrl().replace(/\/$/, "")}/chat/completions`

      try {
        const response = await fetchWithTimeout(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
            ...(options.defaultHeaders?.() ?? {}),
          },
          body: JSON.stringify({
            model: modelId,
            messages,
            max_tokens: request.maxTokens ?? profile.maxTokens,
            temperature: request.temperature ?? profile.temperature,
            ...(request.jsonMode ? { response_format: { type: "json_object" } } : {}),
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
            message: `${config.name} returned non-JSON.`,
            retryable: true,
            status: response.status,
            providerId: options.id,
            modelId,
          })
        }

        if (!response.ok) {
          throw new ProviderError(normalizeHttpError(response.status, raw, options.id, modelId))
        }

        const text = extractOpenAiText(payload).trim()
        if (!text) {
          throw new ProviderError({
            code: "invalid_output",
            message: `${config.name} returned an empty response.`,
            retryable: true,
            providerId: options.id,
            modelId,
          })
        }

        return {
          text,
          providerId: options.id,
          providerName: config.name,
          modelId,
          modelDisplayName: modelMeta?.displayName ?? modelId,
          latencyMs: Date.now() - started,
          usage: extractOpenAiUsage(payload),
          fallbackUsed: false,
          attemptedProviders: [options.id],
          taskType: request.taskType,
        }
      } catch (error) {
        if (error instanceof ProviderError) throw error
        throw new ProviderError(normalizeUnknownError(error, options.id, modelId))
      }
    },

    async *generateStream(request: GenerateRequest, modelId: string): AsyncGenerator<StreamChunk> {
      const result = await this.generate({ ...request, stream: false }, modelId)
      yield {
        type: "meta",
        meta: {
          providerId: result.providerId,
          providerName: result.providerName,
          modelId: result.modelId,
          modelDisplayName: result.modelDisplayName,
          taskType: result.taskType,
          fallbackUsed: result.fallbackUsed,
          attemptedProviders: result.attemptedProviders,
        },
      }
      yield { type: "delta", text: result.text }
      yield { type: "done", meta: result }
    },
  }
}
