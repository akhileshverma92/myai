import { FALLBACK_POLICY, type ProviderId } from "@/src/config/accountApiConfig"
import type { NormalizedErrorCode, ProviderAvailability } from "@/lib/ai/types"

interface HealthEntry {
  availability: ProviderAvailability
  until: number
  reason?: NormalizedErrorCode
}

const store = new Map<ProviderId, HealthEntry>()

export function getCachedAvailability(providerId: ProviderId): ProviderAvailability | null {
  const entry = store.get(providerId)
  if (!entry) return null
  if (Date.now() > entry.until) {
    store.delete(providerId)
    return null
  }
  return entry.availability
}

export function markProviderHealthy(providerId: ProviderId) {
  store.set(providerId, {
    availability: "reachable",
    until: Date.now() + FALLBACK_POLICY.healthCacheTtlMs,
  })
}

export function markProviderFailure(
  providerId: ProviderId,
  code: NormalizedErrorCode,
  retryAfterMs?: number,
) {
  const now = Date.now()
  if (code === "rate_limit") {
    store.set(providerId, {
      availability: "rate_limited",
      until: now + (retryAfterMs ?? FALLBACK_POLICY.rateLimitCooldownMs),
      reason: code,
    })
    return
  }
  if (code === "quota" || code === "auth" || code === "permission" || code === "not_found") {
    store.set(providerId, {
      availability: "unavailable",
      until: now + (retryAfterMs ?? FALLBACK_POLICY.hardFailureCooldownMs),
      reason: code,
    })
    return
  }
  if (code === "server" || code === "timeout" || code === "network") {
    store.set(providerId, {
      availability: "unavailable",
      until: now + Math.min(retryAfterMs ?? 15_000, FALLBACK_POLICY.rateLimitCooldownMs),
      reason: code,
    })
  }
}

export function isProviderBlocked(providerId: ProviderId): boolean {
  const availability = getCachedAvailability(providerId)
  return availability === "rate_limited" || availability === "unavailable" || availability === "misconfigured"
}

export function clearHealthForTests() {
  store.clear()
}
