import { loadSecrets } from "@/lib/ai/secrets"
import { fetchWithTimeout } from "@/lib/ai/http"

const DEFAULT_MODEL = process.env.STORY_OLLAMA_MODEL || process.env.OLLAMA_MODEL || "llama3.2"

export function getStoryModelId() {
  return DEFAULT_MODEL
}

export function isOllamaReady() {
  return Boolean(loadSecrets().ollama.baseUrl)
}

function friendlyFetchError(error: unknown): Error {
  const cause = error instanceof Error ? (error as Error & { cause?: unknown }).cause : undefined
  const code =
    cause && typeof cause === "object" && "code" in cause
      ? String((cause as { code?: string }).code)
      : ""
  if (code === "ECONNREFUSED" || (error instanceof TypeError && /fetch failed/i.test(error.message))) {
    return new Error(
      "Ollama is not running. Install/start it (`ollama serve`), then pull the model (`ollama pull llama3.2`).",
    )
  }
  if (error instanceof Error) return error
  return new Error("Ollama request failed.")
}

export async function ollamaChat(args: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
  jsonMode?: boolean
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}): Promise<string> {
  const baseUrl = loadSecrets().ollama.baseUrl
  if (!baseUrl) {
    throw new Error("OLLAMA_BASE_URL is not configured. Start Ollama and set OLLAMA_BASE_URL.")
  }

  const model = getStoryModelId()
  try {
    const response = await fetchWithTimeout(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: args.messages,
        stream: false,
        options: {
          temperature: args.temperature ?? 0.7,
          num_predict: args.maxTokens ?? 700,
        },
        ...(args.jsonMode ? { format: "json" } : {}),
      }),
      signal: args.signal,
      timeoutMs: 120_000,
    })

    const raw = await response.text()
    let payload: unknown
    try {
      payload = JSON.parse(raw)
    } catch {
      throw new Error("Ollama returned non-JSON.")
    }

    if (!response.ok) {
      throw new Error(`Ollama error ${response.status}: ${raw.slice(0, 200)}`)
    }

    const text = String((payload as { message?: { content?: string } }).message?.content ?? "").trim()
    if (!text) throw new Error("Ollama returned an empty response.")
    return text
  } catch (error) {
    throw friendlyFetchError(error)
  }
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf("{")
    const end = trimmed.lastIndexOf("}")
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1))
    }
    throw new Error("Could not parse JSON from model output.")
  }
}
