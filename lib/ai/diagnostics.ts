import { randomUUID } from "node:crypto"

/** Safe structured logs — never include tokens or full secrets. */

export type AiDiagEvent = {
  requestId: string
  stage: string
  provider?: string
  model?: string
  httpStatus?: number
  errorCode?: string
  cfRay?: string
  accountIdSuffix?: string
  tokenPresent?: boolean
  attempt?: number
  requestCount?: number
  routePlanSize?: number
  message?: string
}

let requestCounter = 0

export function nextRequestId(): string {
  requestCounter += 1
  return `ai_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`
}

export function getRequestCount(): number {
  return requestCounter
}

export function accountIdSuffix(accountId: string | undefined): string | undefined {
  if (!accountId) return undefined
  return accountId.length <= 4 ? "****" : `…${accountId.slice(-4)}`
}

export function logAiDiag(event: AiDiagEvent): void {
  // Single-line JSON for easy filtering; secrets never included.
  console.info(
    JSON.stringify({
      level: "info",
      source: "ai-diagnostics",
      ...event,
      requestCount: event.requestCount ?? requestCounter,
      ts: new Date().toISOString(),
    }),
  )
}

export function resetDiagnosticsForTests(): void {
  requestCounter = 0
}
