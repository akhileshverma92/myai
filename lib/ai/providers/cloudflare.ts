import {
  CLOUDFLARE_MODELS,
  getProviderConfig,
  isKnownCloudflareModel,
  type ModelCapability,
} from "@/src/config/accountApiConfig"
import { accountIdSuffix, logAiDiag, nextRequestId } from "@/lib/ai/diagnostics"
import { ProviderError, normalizeHttpError, normalizeUnknownError } from "@/lib/ai/errors"
import { fetchWithTimeout } from "@/lib/ai/http"
import { loadSecrets, resolveCloudflareApiToken, cloudflareHasAnyToken } from "@/lib/ai/secrets"
import { buildMessagesForTask, getTaskProfile } from "@/lib/ai/task-classifier"
import type { GenerateRequest, GenerateResult, ProviderAdapter, ProviderAvailability, StreamChunk } from "@/lib/ai/types"

function resolveEndpoint(accountId: string, modelId: string) {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelId}`
}

function extractText(payload: unknown): string {
  const result = (payload as { result?: unknown }).result
  if (typeof result === "string") return result
  if (result && typeof result === "object") {
    const r = result as { response?: unknown; text?: unknown }
    if (typeof r.response === "string") return r.response
    if (typeof r.text === "string") return r.text
  }
  return ""
}

function extractUsage(payload: unknown) {
  const usage = (payload as { result?: { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } } })
    .result?.usage
  if (!usage) return undefined
  return {
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
  }
}

export function createCloudflareAdapter(): ProviderAdapter {
  const config = getProviderConfig("cloudflare")!

  return {
    id: "cloudflare",
    name: config.name,

    isConfigured() {
      const secrets = loadSecrets()
      return Boolean(secrets.cloudflare.accountId && cloudflareHasAnyToken(secrets))
    },

    getAvailability(): ProviderAvailability {
      if (!this.isConfigured()) return "misconfigured"
      return "configured"
    },

    supports(capability: ModelCapability) {
      return CLOUDFLARE_MODELS.some((m) => m.capabilities.includes(capability))
    },

    listModels() {
      return CLOUDFLARE_MODELS.map((m) => m.id)
    },

    async generate(request: GenerateRequest, modelId: string): Promise<GenerateResult> {
      const secrets = loadSecrets()
      const accountId = secrets.cloudflare.accountId
      const apiToken = resolveCloudflareApiToken(request.preferredSlotId, secrets)
      if (!accountId || !apiToken) {
        throw new ProviderError({
          code: "auth",
          message: request.preferredSlotId
            ? `Cloudflare credentials are missing for model slot "${request.preferredSlotId}".`
            : "Cloudflare credentials are missing.",
          retryable: false,
          providerId: "cloudflare",
          modelId,
        })
      }

      if (!modelId.startsWith("@cf/")) {
        throw new ProviderError({
          code: "not_found",
          message: `Invalid Cloudflare model id: ${modelId}`,
          retryable: false,
          providerId: "cloudflare",
          modelId,
        })
      }

      const profile = getTaskProfile(request.taskType)
      const messages = buildMessagesForTask(request.messages, request.taskType, request.systemInstruction)
      const modelMeta = CLOUDFLARE_MODELS.find((m) => m.id === modelId)
      const maxTokens = request.maxTokens ?? profile.maxTokens ?? modelMeta?.maxOutputTokensDefault ?? 1024
      const body: Record<string, unknown> = {
        messages,
        max_tokens: maxTokens,
        temperature: request.temperature ?? profile.temperature,
      }
      if (request.jsonMode) {
        body.response_format = { type: "json_object" }
      }

      const started = Date.now()
      const requestId = nextRequestId()
      const endpoint = resolveEndpoint(accountId, modelId)
      logAiDiag({
        requestId,
        stage: "cloudflare_request",
        provider: "cloudflare",
        model: modelId,
        accountIdSuffix: accountIdSuffix(accountId),
        tokenPresent: Boolean(apiToken),
        message: `endpointHost=api.cloudflare.com path=/client/v4/accounts/*/ai/run/${modelId}`,
      })

      try {
        const response = await fetchWithTimeout(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: request.signal,
        })

        const cfRay = response.headers.get("cf-ray") ?? undefined
        const rawText = await response.text()
        let payload: unknown
        try {
          payload = JSON.parse(rawText)
        } catch {
          logAiDiag({
            requestId,
            stage: "cloudflare_response",
            provider: "cloudflare",
            model: modelId,
            httpStatus: response.status,
            errorCode: "invalid_output",
            cfRay,
            accountIdSuffix: accountIdSuffix(accountId),
            tokenPresent: true,
          })
          throw new ProviderError({
            code: "invalid_output",
            message: "Cloudflare returned a non-JSON response.",
            retryable: true,
            status: response.status,
            providerId: "cloudflare",
            modelId,
          })
        }

        if (!response.ok || (payload as { success?: boolean }).success === false) {
          const errMsg =
            JSON.stringify((payload as { errors?: unknown }).errors ?? rawText).slice(0, 500)
          const normalized = normalizeHttpError(response.status, errMsg, "cloudflare", modelId)
          logAiDiag({
            requestId,
            stage: "cloudflare_response",
            provider: "cloudflare",
            model: modelId,
            httpStatus: response.status,
            errorCode: normalized.code,
            cfRay,
            accountIdSuffix: accountIdSuffix(accountId),
            tokenPresent: true,
            message: normalized.message,
          })
          throw new ProviderError(normalized)
        }

        const text = extractText(payload).trim()
        if (!text) {
          logAiDiag({
            requestId,
            stage: "cloudflare_response",
            provider: "cloudflare",
            model: modelId,
            httpStatus: response.status,
            errorCode: "invalid_output",
            cfRay,
            accountIdSuffix: accountIdSuffix(accountId),
            tokenPresent: true,
          })
          throw new ProviderError({
            code: "invalid_output",
            message: "Cloudflare returned an empty response.",
            retryable: true,
            providerId: "cloudflare",
            modelId,
          })
        }

        logAiDiag({
          requestId,
          stage: "cloudflare_response",
          provider: "cloudflare",
          model: modelId,
          httpStatus: response.status,
          cfRay,
          accountIdSuffix: accountIdSuffix(accountId),
          tokenPresent: true,
          message: `ok latencyMs=${Date.now() - started}`,
        })

        return {
          text,
          providerId: "cloudflare",
          providerName: config.name,
          modelId,
          modelDisplayName: modelMeta?.displayName ?? modelId,
          latencyMs: Date.now() - started,
          usage: extractUsage(payload),
          fallbackUsed: false,
          attemptedProviders: ["cloudflare"],
          taskType: request.taskType,
        }
      } catch (error) {
        if (error instanceof ProviderError) throw error
        throw new ProviderError(normalizeUnknownError(error, "cloudflare", modelId))
      }
    },

    async *generateStream(request: GenerateRequest, modelId: string): AsyncGenerator<StreamChunk> {
      const secrets = loadSecrets()
      const accountId = secrets.cloudflare.accountId
      const apiToken = resolveCloudflareApiToken(request.preferredSlotId, secrets)
      if (!accountId || !apiToken) {
        yield {
          type: "error",
          error: {
            code: "auth",
            message: request.preferredSlotId
              ? `Cloudflare credentials are missing for model slot "${request.preferredSlotId}".`
              : "Cloudflare credentials are missing.",
            retryable: false,
            providerId: "cloudflare",
            modelId,
          },
        }
        return
      }

      const profile = getTaskProfile(request.taskType)
      const messages = buildMessagesForTask(request.messages, request.taskType, request.systemInstruction)
      const modelMeta = CLOUDFLARE_MODELS.find((m) => m.id === modelId)
      const started = Date.now()

      const response = await fetchWithTimeout(resolveEndpoint(accountId, modelId), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages,
          stream: true,
          max_tokens: request.maxTokens ?? profile.maxTokens,
          temperature: request.temperature ?? profile.temperature,
        }),
        signal: request.signal,
      })

      if (!response.ok || !response.body) {
        const errText = await response.text()
        yield {
          type: "error",
          error: normalizeHttpError(response.status, errText, "cloudflare", modelId),
        }
        return
      }

      yield {
        type: "meta",
        meta: {
          providerId: "cloudflare",
          providerName: config.name,
          modelId,
          modelDisplayName: modelMeta?.displayName ?? modelId,
          taskType: request.taskType,
          fallbackUsed: false,
          attemptedProviders: ["cloudflare"],
        },
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let emitted = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === "data: [DONE]") continue
          const data = trimmed.startsWith("data:") ? trimmed.slice(5).trim() : trimmed
          try {
            const json = JSON.parse(data) as {
              response?: string
              text?: string
              choices?: Array<{ delta?: { content?: string } }>
            }
            const delta =
              json.response ??
              json.text ??
              json.choices?.[0]?.delta?.content ??
              ""
            if (delta) {
              emitted = true
              yield { type: "delta", text: delta }
            }
          } catch {
            // ignore partial SSE frames
          }
        }
      }

      if (!emitted) {
        // Do not issue a second Cloudflare inference call — that would double neuron usage.
        // Prefer parsing any buffered non-SSE JSON body; otherwise fail clearly.
        const buffered = buffer.trim()
        if (buffered) {
          try {
            const json = JSON.parse(buffered.startsWith("data:") ? buffered.slice(5).trim() : buffered)
            const text = extractText(json).trim()
            if (text) {
              yield { type: "delta", text }
              yield {
                type: "done",
                meta: {
                  providerId: "cloudflare",
                  providerName: config.name,
                  modelId,
                  modelDisplayName: modelMeta?.displayName ?? modelId,
                  latencyMs: Date.now() - started,
                  taskType: request.taskType,
                  fallbackUsed: false,
                  attemptedProviders: ["cloudflare"],
                },
              }
              return
            }
          } catch {
            // fall through
          }
        }
        yield {
          type: "error",
          error: {
            code: "invalid_output",
            message: "Cloudflare stream completed without text. Retry the request.",
            retryable: true,
            providerId: "cloudflare",
            modelId,
          },
        }
        return
      }

      yield {
        type: "done",
        meta: {
          providerId: "cloudflare",
          providerName: config.name,
          modelId,
          modelDisplayName: modelMeta?.displayName ?? modelId,
          latencyMs: Date.now() - started,
          taskType: request.taskType,
          fallbackUsed: false,
          attemptedProviders: ["cloudflare"],
        },
      }
    },
  }
}

export function assertCloudflareModelKnown(modelId: string): boolean {
  return isKnownCloudflareModel(modelId) || modelId.startsWith("@cf/")
}
