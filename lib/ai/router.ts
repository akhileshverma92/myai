import {
  FALLBACK_POLICY,
  TASK_CAPABILITY_MAP,
  findModelAnywhere,
  getProviderConfig,
  resolveUiSlotModelId,
  type ProviderId,
  type TaskType,
  type UiModelSlotId,
  UI_MODEL_SLOTS,
} from "@/src/config/accountApiConfig"
import { accountIdSuffix, logAiDiag, nextRequestId } from "@/lib/ai/diagnostics"
import { ProviderError, isTransient, normalizeUnknownError } from "@/lib/ai/errors"
import { backoffWithJitter, sleep } from "@/lib/ai/http"
import { isProviderBlocked, markProviderFailure, markProviderHealthy } from "@/lib/ai/health"
import { getRegisteredProviders, resolveProviderAvailability } from "@/lib/ai/registry"
import { loadSecrets, listConfiguredProviderIds } from "@/lib/ai/secrets"
import type { GenerateRequest, GenerateResult, ProviderAdapter, StreamChunk } from "@/lib/ai/types"

export interface RouteCandidate {
  providerId: ProviderId
  modelId: string
  adapter: ProviderAdapter
}

function modelMatchesTask(modelId: string, taskType: TaskType, freeOnly: boolean): boolean {
  const model = findModelAnywhere(modelId)
  if (!model) {
    // Unknown external model — allow only if not free-only, or if it looks like a free OpenRouter model
    if (freeOnly) return modelId.includes(":free") || modelId.startsWith("@cf/")
    return true
  }
  if (freeOnly && !model.free) return false
  const needed = TASK_CAPABILITY_MAP[taskType]
  return needed.some((cap) => model.capabilities.includes(cap))
}

export function pickModelForProvider(
  providerId: ProviderId,
  taskType: TaskType,
  freeOnly: boolean,
  preferredModelId?: string,
): string | null {
  const config = getProviderConfig(providerId)
  if (!config) return null

  if (preferredModelId) {
    const preferred = findModelAnywhere(preferredModelId)
    if (preferred) {
      if (preferred.providerId === providerId && modelMatchesTask(preferredModelId, taskType, freeOnly)) {
        return preferredModelId
      }
    } else if (
      providerId === "cloudflare" &&
      preferredModelId.startsWith("@cf/") &&
      modelMatchesTask(preferredModelId, taskType, freeOnly)
    ) {
      // Honor env / slot overrides even when the model is not in the static catalog.
      return preferredModelId
    }
  }

  const candidates = config.models.filter((m) => modelMatchesTask(m.id, taskType, freeOnly))
  if (candidates.length === 0) return null
  if (candidates.some((m) => m.id === config.defaultModelId)) return config.defaultModelId
  return candidates[0].id
}

export function buildRoutePlan(request: GenerateRequest): RouteCandidate[] {
  const adapters = getRegisteredProviders()
  const freeOnly = Boolean(request.freeOnly)
  const preferredProvider = request.preferredProviderId
  let preferredModelId = request.preferredModelId
  const slotId = resolveSlotFromRequest(request)

  if (preferredModelId && preferredModelId in UI_MODEL_SLOTS) {
    preferredModelId = resolveUiSlotModelId(preferredModelId as UiModelSlotId)
  } else if (!preferredModelId && slotId) {
    preferredModelId = resolveUiSlotModelId(slotId)
  }

  const ordered = [...adapters].sort((a, b) => {
    const pa = getProviderConfig(a.id)?.priority ?? 99
    const pb = getProviderConfig(b.id)?.priority ?? 99
    if (preferredProvider) {
      if (a.id === preferredProvider && b.id !== preferredProvider) return -1
      if (b.id === preferredProvider && a.id !== preferredProvider) return 1
    }
    // Cloudflare always first among equals when no explicit provider preference
    if (a.id === "cloudflare" && b.id !== "cloudflare" && !preferredProvider) return -1
    if (b.id === "cloudflare" && a.id !== "cloudflare" && !preferredProvider) return 1
    return pa - pb
  })

  const plan: RouteCandidate[] = []
  for (const adapter of ordered) {
    const config = getProviderConfig(adapter.id)
    if (!config?.enabled) continue
    if (freeOnly && !config.freeOnlyEligible) continue
    if (isProviderBlocked(adapter.id)) continue

    const availability = resolveProviderAvailability(adapter)
    if (availability === "misconfigured" || availability === "unavailable" || availability === "rate_limited") {
      continue
    }

    const modelId = pickModelForProvider(adapter.id, request.taskType, freeOnly, preferredModelId)
    if (!modelId) continue
    plan.push({ providerId: adapter.id, modelId, adapter })
  }

  return plan.slice(0, FALLBACK_POLICY.maxFallbackDepth)
}

function resolveSlotFromRequest(request: GenerateRequest): UiModelSlotId | undefined {
  if (request.preferredSlotId) return request.preferredSlotId
  if (request.preferredModelId && request.preferredModelId in UI_MODEL_SLOTS) {
    return request.preferredModelId as UiModelSlotId
  }
  return undefined
}

async function tryProvider(
  candidate: RouteCandidate,
  request: GenerateRequest,
): Promise<GenerateResult> {
  let lastError: ProviderError | null = null

  for (let attempt = 0; attempt <= FALLBACK_POLICY.maxRetriesPerProvider; attempt++) {
    try {
      const result = await candidate.adapter.generate(request, candidate.modelId)
      markProviderHealthy(candidate.providerId)
      return result
    } catch (error) {
      const normalized =
        error instanceof ProviderError
          ? error.normalized
          : normalizeUnknownError(error, candidate.providerId, candidate.modelId)
      lastError = new ProviderError(normalized)
      markProviderFailure(candidate.providerId, normalized.code, normalized.retryAfterMs)

      if (!isTransient(normalized.code) || !normalized.retryable) break
      if (attempt >= FALLBACK_POLICY.maxRetriesPerProvider) break
      await sleep(backoffWithJitter(attempt, normalized.retryAfterMs), request.signal)
    }
  }

  throw lastError ?? new ProviderError({
    code: "unknown",
    message: "Provider failed without details.",
    retryable: false,
    providerId: candidate.providerId,
    modelId: candidate.modelId,
  })
}

function emptyPlanError(): ProviderError {
  const configured = listConfiguredProviderIds()
  const secrets = loadSecrets()
  const requestId = nextRequestId()
  logAiDiag({
    requestId,
    stage: "route_plan_empty",
    errorCode: configured.length === 0 ? "misconfigured" : "unavailable",
    accountIdSuffix: accountIdSuffix(secrets.cloudflare.accountId),
    tokenPresent: Boolean(secrets.cloudflare.apiToken),
    routePlanSize: 0,
    message:
      configured.length === 0
        ? "No provider credentials loaded from environment"
        : "Configured providers are blocked, rate-limited, or incompatible with this task",
  })

  if (configured.length === 0) {
    return new ProviderError({
      code: "misconfigured",
      message:
        "No AI provider credentials are configured on the server. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in .env.local.",
      retryable: false,
    })
  }

  return new ProviderError({
    code: "unavailable",
    message:
      "No eligible AI providers are available right now. They may be cooling down after a previous failure, or none support this task under the current free-only settings.",
    retryable: true,
  })
}

export async function generateWithRouting(request: GenerateRequest): Promise<GenerateResult> {
  const requestId = nextRequestId()
  const preferredSlotId = resolveSlotFromRequest(request)
  const routedRequest: GenerateRequest = { ...request, preferredSlotId }
  const plan = buildRoutePlan(routedRequest)
  logAiDiag({
    requestId,
    stage: "route_plan",
    routePlanSize: plan.length,
    model: preferredSlotId
      ? `${preferredSlotId}->${resolveUiSlotModelId(preferredSlotId)}`
      : request.preferredModelId,
    message: plan.map((p) => `${p.providerId}:${p.modelId}`).join(",") || "empty",
  })

  if (plan.length === 0) {
    throw emptyPlanError()
  }

  const attempted: ProviderId[] = []
  let lastError: ProviderError | null = null

  for (let i = 0; i < plan.length; i++) {
    const candidate = plan[i]
    attempted.push(candidate.providerId)
    logAiDiag({
      requestId,
      stage: "provider_attempt",
      provider: candidate.providerId,
      model: candidate.modelId,
      attempt: i + 1,
      routePlanSize: plan.length,
      message: preferredSlotId ? `slot=${preferredSlotId}` : undefined,
    })
    try {
      const result = await tryProvider(candidate, routedRequest)
      const slotLabel = preferredSlotId ? UI_MODEL_SLOTS[preferredSlotId].name : undefined
      logAiDiag({
        requestId,
        stage: "provider_success",
        provider: result.providerId,
        model: result.modelId,
        errorCode: undefined,
        message: `latencyMs=${result.latencyMs}`,
      })
      return {
        ...result,
        modelDisplayName: slotLabel ?? result.modelDisplayName,
        fallbackUsed: i > 0,
        attemptedProviders: attempted,
      }
    } catch (error) {
      lastError =
        error instanceof ProviderError
          ? error
          : new ProviderError(normalizeUnknownError(error, candidate.providerId, candidate.modelId))
      logAiDiag({
        requestId,
        stage: "provider_failure",
        provider: candidate.providerId,
        model: candidate.modelId,
        httpStatus: lastError.normalized.status,
        errorCode: lastError.normalized.code,
        message: lastError.normalized.message,
      })
      // continue to next provider — never invent quota from empty remaining plan
    }
  }

  // Preserve the last real provider error. Do not remap unrelated failures to quota.
  throw lastError ?? new ProviderError({
    code: "unavailable",
    message: "All eligible providers failed.",
    retryable: true,
  })
}

/**
 * Stream from the first provider that emits text. If a provider fails before any
 * tokens, fall back. If tokens already started, yield an interrupt error instead
 * of concatenating another provider's full answer.
 */
export async function* streamWithRouting(request: GenerateRequest): AsyncGenerator<StreamChunk> {
  const preferredSlotId = resolveSlotFromRequest(request)
  const routedRequest: GenerateRequest = { ...request, preferredSlotId }
  const plan = buildRoutePlan(routedRequest)
  if (plan.length === 0) {
    const err = emptyPlanError().normalized
    yield { type: "error", error: err }
    return
  }

  const attempted: ProviderId[] = []

  for (let i = 0; i < plan.length; i++) {
    const candidate = plan[i]
    attempted.push(candidate.providerId)
    let emittedText = false

    try {
      if (!candidate.adapter.generateStream) {
        const result = await tryProvider(candidate, routedRequest)
        yield {
          type: "meta",
          meta: {
            ...result,
            fallbackUsed: i > 0,
            attemptedProviders: attempted,
          },
        }
        yield { type: "delta", text: result.text }
        yield {
          type: "done",
          meta: {
            ...result,
            fallbackUsed: i > 0,
            attemptedProviders: attempted,
          },
        }
        return
      }

      for await (const chunk of candidate.adapter.generateStream(routedRequest, candidate.modelId)) {
        if (chunk.type === "delta" && chunk.text) emittedText = true
        if (chunk.type === "error") {
          markProviderFailure(
            candidate.providerId,
            chunk.error?.code ?? "unknown",
            chunk.error?.retryAfterMs,
          )
          if (emittedText) {
            yield {
              type: "error",
              error: {
                code: chunk.error?.code ?? "server",
                message:
                  "Generation was interrupted after partial output. Retry or restart instead of continuing with another provider.",
                retryable: true,
                providerId: candidate.providerId,
                modelId: candidate.modelId,
              },
            }
            return
          }
          break
        }
        if (chunk.type === "meta" || chunk.type === "done") {
          yield {
            ...chunk,
            meta: {
              ...chunk.meta,
              fallbackUsed: i > 0,
              attemptedProviders: attempted,
            },
          }
          if (chunk.type === "done") {
            markProviderHealthy(candidate.providerId)
            return
          }
        } else {
          yield chunk
        }
      }

      if (emittedText) return
    } catch (error) {
      const normalized =
        error instanceof ProviderError
          ? error.normalized
          : normalizeUnknownError(error, candidate.providerId, candidate.modelId)
      markProviderFailure(candidate.providerId, normalized.code, normalized.retryAfterMs)
      if (emittedText) {
        yield {
          type: "error",
          error: {
            ...normalized,
            message:
              "Generation was interrupted after partial output. Retry or restart instead of continuing with another provider.",
          },
        }
        return
      }
    }
  }

  yield {
    type: "error",
    error: {
      code: "server",
      message: "All eligible providers failed before producing a response.",
      retryable: true,
    },
  }
}

export function listPublicProviderStatus() {
  return getRegisteredProviders().map((adapter) => {
    const config = getProviderConfig(adapter.id)!
    return {
      id: adapter.id,
      name: adapter.name,
      priority: config.priority,
      availability: resolveProviderAvailability(adapter),
      models: adapter.listModels(),
      freeOnlyEligible: config.freeOnlyEligible,
    }
  })
}
