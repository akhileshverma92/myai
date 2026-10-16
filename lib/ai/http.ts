import { FALLBACK_POLICY } from "@/src/config/accountApiConfig"

export async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = FALLBACK_POLICY.requestTimeoutMs, signal, ...rest } = init
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const onAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener("abort", onAbort, { once: true })
  }

  try {
    return await fetch(url, { ...rest, signal: controller.signal, cache: "no-store" })
  } finally {
    clearTimeout(timer)
    if (signal) signal.removeEventListener("abort", onAbort)
  }
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"))
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException("Aborted", "AbortError"))
    }
    signal?.addEventListener("abort", onAbort, { once: true })
  })
}

export function backoffWithJitter(attempt: number, retryAfterMs?: number): number {
  if (retryAfterMs && retryAfterMs > 0) return retryAfterMs
  const base = Math.min(
    FALLBACK_POLICY.maxBackoffMs,
    FALLBACK_POLICY.initialBackoffMs * 2 ** attempt,
  )
  const jitter = Math.floor(Math.random() * base * 0.3)
  return base + jitter
}

export function extractOpenAiText(payload: unknown): string {
  const data = payload as {
    choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> }; text?: string }>
    output_text?: string
  }
  if (typeof data.output_text === "string") return data.output_text
  const choice = data.choices?.[0]
  const content = choice?.message?.content
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content.map((part) => (typeof part.text === "string" ? part.text : "")).join("")
  }
  if (typeof choice?.text === "string") return choice.text
  return ""
}

export function extractOpenAiUsage(payload: unknown) {
  const usage = (payload as { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } })
    .usage
  if (!usage) return undefined
  return {
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
  }
}
