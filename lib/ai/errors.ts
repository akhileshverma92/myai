import type { NormalizedErrorCode, NormalizedProviderError } from "@/lib/ai/types"
import type { ProviderId } from "@/src/config/accountApiConfig"

export class ProviderError extends Error {
  readonly normalized: NormalizedProviderError

  constructor(normalized: NormalizedProviderError) {
    super(normalized.message)
    this.name = "ProviderError"
    this.normalized = normalized
  }
}

/**
 * Only classify as quota when the provider response clearly indicates
 * account/daily/neuron quota exhaustion — not mere rate limiting, and
 * not absence of configured providers.
 */
export function isExplicitQuotaMessage(bodyText: string): boolean {
  const lower = bodyText.toLowerCase()

  // Strong phrases used by Cloudflare Workers AI and similar APIs
  const strongPatterns = [
    /daily\s+(free\s+)?(quota|allocation|limit)/i,
    /quota\s+(exceeded|exhausted|reached)/i,
    /exceeded\s+your\s+(daily|monthly)?\s*(free\s+)?(quota|allocation|limit)/i,
    /out\s+of\s+(neurons|quota)/i,
    /neuron[s]?\s+(quota|limit|budget).*(exceed|exhaust|over)/i,
    /(exceed|exhaust).*(neuron[s]?\s+(quota|limit|budget))/i,
    /billing\s+(quota|limit)/i,
    /insufficient[_\s-]?quota/i,
    /code["']?\s*:\s*["']?(err_)?quota/i,
  ]

  if (strongPatterns.some((re) => re.test(bodyText))) return true

  // Require "quota"/"neurons" together with exhaustion language — never "daily" alone.
  const hasQuotaWord = /\bquota\b/.test(lower) || /\bneurons?\b/.test(lower)
  const hasExhaustion =
    /\b(exceeded|exhausted|depleted|reached|over\s*limit|no\s+remaining)\b/.test(lower)
  return hasQuotaWord && hasExhaustion
}

export function normalizeHttpError(
  status: number,
  bodyText: string,
  providerId?: ProviderId,
  modelId?: string,
): NormalizedProviderError {
  const lower = bodyText.toLowerCase()
  const retryAfterMatch = bodyText.match(/retry[- ]after["\s:]+(\d+)/i)
  const retryAfterMs = retryAfterMatch ? Number(retryAfterMatch[1]) * 1000 : undefined
  const explicitQuota = isExplicitQuotaMessage(bodyText)

  if (status === 401) {
    return {
      code: "auth",
      message: "Provider authentication failed. Check API credentials.",
      retryable: false,
      status,
      providerId,
      modelId,
    }
  }
  if (status === 403) {
    // Some gateways use 403 for quota; only map when message supports it.
    if (explicitQuota) {
      return {
        code: "quota",
        message: "Provider quota exhausted according to the API response.",
        retryable: false,
        status,
        retryAfterMs,
        providerId,
        modelId,
      }
    }
    return {
      code: "permission",
      message: "Provider denied access. Check API token permissions.",
      retryable: false,
      status,
      providerId,
      modelId,
    }
  }
  if (status === 404) {
    return {
      code: "not_found",
      message: "Model not found or unavailable for this provider.",
      retryable: false,
      status,
      providerId,
      modelId,
    }
  }
  if (status === 429) {
    if (explicitQuota) {
      return {
        code: "quota",
        message: "Provider quota exhausted according to the API response.",
        retryable: false,
        status,
        retryAfterMs,
        providerId,
        modelId,
      }
    }
    return {
      code: "rate_limit",
      message: "Provider rate limited this request.",
      retryable: true,
      status,
      retryAfterMs,
      providerId,
      modelId,
    }
  }

  // Non-429 responses that still explicitly declare quota exhaustion
  if (explicitQuota) {
    return {
      code: "quota",
      message: "Provider quota exhausted according to the API response.",
      retryable: false,
      status,
      retryAfterMs,
      providerId,
      modelId,
    }
  }

  if (
    lower.includes("context length") ||
    lower.includes("context window") ||
    (lower.includes("too many tokens") && lower.includes("limit")) ||
    lower.includes("maximum context") ||
    lower.includes("prompt is too long")
  ) {
    return {
      code: "context_overflow",
      message: "Prompt exceeds the model context window.",
      retryable: false,
      status,
      providerId,
      modelId,
    }
  }
  if (status >= 500) {
    return {
      code: "server",
      message: "Provider experienced a temporary server error.",
      retryable: true,
      status,
      retryAfterMs,
      providerId,
      modelId,
    }
  }
  return {
    code: "unknown",
    message: sanitizeProviderMessage(bodyText) || `Provider returned HTTP ${status}.`,
    retryable: status >= 500,
    status,
    providerId,
    modelId,
  }
}

/** Strip likely secrets from provider error snippets before surfacing. */
export function sanitizeProviderMessage(bodyText: string): string {
  return bodyText
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [redacted]")
    .replace(/cfut_[A-Za-z0-9]+/gi, "[redacted-token]")
    .replace(/sk-[A-Za-z0-9]+/gi, "[redacted-key]")
    .slice(0, 280)
}

export function normalizeUnknownError(
  error: unknown,
  providerId?: ProviderId,
  modelId?: string,
): NormalizedProviderError {
  if (error instanceof ProviderError) return error.normalized
  if (error instanceof DOMException && error.name === "AbortError") {
    return { code: "cancelled", message: "Request was cancelled.", retryable: false, providerId, modelId }
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes("timeout") || msg.includes("timed out")) {
      return { code: "timeout", message: "Provider request timed out.", retryable: true, providerId, modelId }
    }
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("econn")) {
      return { code: "network", message: "Network error reaching the provider.", retryable: true, providerId, modelId }
    }
    return { code: "unknown", message: error.message, retryable: false, providerId, modelId }
  }
  return { code: "unknown", message: "Unknown provider error.", retryable: false, providerId, modelId }
}

export function isTransient(code: NormalizedErrorCode): boolean {
  return code === "rate_limit" || code === "server" || code === "timeout" || code === "network"
}

export function userFacingErrorMessage(error: NormalizedProviderError): string {
  switch (error.code) {
    case "auth":
    case "permission":
      return "AI providers are misconfigured. An administrator needs to fix API credentials."
    case "not_found":
      return "The selected model is unavailable. Choose another model or try again later."
    case "rate_limit":
      return "The AI service is busy. Please wait a moment and retry."
    case "quota":
      return "This AI provider reports that your account quota is exhausted. Try again later or use another provider."
    case "unavailable":
      return error.message || "No eligible AI providers are available right now."
    case "misconfigured":
      return error.message || "AI providers are misconfigured. Check server environment variables."
    case "timeout":
      return "The request timed out. You can retry safely."
    case "context_overflow":
      return "Your conversation is too long for this model. Start a new chat or shorten the prompt."
    case "cancelled":
      return "Generation was cancelled."
    default:
      return error.message || "Unable to generate a response. Please retry."
  }
}
