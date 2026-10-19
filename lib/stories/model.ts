import { resolveUiSlotModelId } from "@/src/config/accountApiConfig"
import { getProviderAdapter } from "@/lib/ai/registry"

/** Single hidden model for all stories: Cloudflare GPT slot. */
const STORY_SLOT = "gpt" as const

export function getStoryModelId() {
  return process.env.STORY_CF_MODEL || resolveUiSlotModelId(STORY_SLOT)
}

export function getStoryEngineStatus() {
  const cloudflare = getProviderAdapter("cloudflare")
  const ready = Boolean(cloudflare?.isConfigured())
  return {
    provider: "cloudflare" as const,
    slot: STORY_SLOT,
    ready,
    model: getStoryModelId(),
  }
}

/**
 * Cloudflare Workers AI only — no Ollama.
 * Pass story-specific system prompts via messages[role=system]; they become the character instructions.
 */
export async function storyModelChat(args: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
  jsonMode?: boolean
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}): Promise<{ text: string; provider: "cloudflare"; modelId: string }> {
  const cloudflare = getProviderAdapter("cloudflare")
  if (!cloudflare?.isConfigured()) {
    throw new Error(
      "Cloudflare AI is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_GPT_API_TOKEN (or CLOUDFLARE_API_TOKEN) in .env.local.",
    )
  }

  const modelId = getStoryModelId()
  const system = args.messages.find((m) => m.role === "system")?.content
  const messages = args.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))

  const result = await cloudflare.generate(
    {
      messages,
      taskType: args.jsonMode ? "structured" : "conversation",
      systemInstruction: system,
      jsonMode: args.jsonMode,
      temperature: args.temperature,
      maxTokens: args.maxTokens,
      preferredSlotId: STORY_SLOT,
      preferredProviderId: "cloudflare",
      signal: args.signal,
    },
    modelId,
  )

  return { text: result.text, provider: "cloudflare", modelId }
}
