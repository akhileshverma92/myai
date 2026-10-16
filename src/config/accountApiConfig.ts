/**
 * Single source of truth for AI provider metadata, env var names,
 * priorities, model capabilities, and fallback policy.
 * Secrets are never stored here — only env key names.
 */

export type ProviderId =
  | "cloudflare"
  | "gemini"
  | "groq"
  | "openrouter"
  | "openai"
  | "huggingface"
  | "ollama"

export type TaskType =
  | "general"
  | "conversation"
  | "coding"
  | "writing"
  | "summarization"
  | "research"
  | "structured"
  | "pdf"
  | "pptx"
  | "document_analysis"

export type ModelCapability =
  | "text"
  | "chat"
  | "streaming"
  | "json"
  | "long_form"
  | "coding"
  | "summarization"

export type UiModelSlotId = "haiku" | "gemini" | "muse" | "gpt"

export interface ModelConfig {
  id: string
  displayName: string
  providerId: ProviderId
  capabilities: ModelCapability[]
  contextWindow: number
  free: boolean
  /** How this model expects the REST body to be shaped */
  requestFormat: "messages" | "prompt" | "openai_chat"
  maxOutputTokensDefault: number
}

export interface ProviderConfig {
  id: ProviderId
  name: string
  enabled: boolean
  priority: number
  envKeys: Record<string, string>
  endpoint?: string
  defaultModelId: string
  models: ModelConfig[]
  freeOnlyEligible: boolean
}

export interface FallbackPolicy {
  maxRetriesPerProvider: number
  maxFallbackDepth: number
  requestTimeoutMs: number
  initialBackoffMs: number
  maxBackoffMs: number
  /** Cooldown after 429 / quota exhaustion */
  rateLimitCooldownMs: number
  /** Cooldown after auth / invalid model (do not hammer) */
  hardFailureCooldownMs: number
  healthCacheTtlMs: number
}

export interface UiModelSlot {
  id: UiModelSlotId
  name: string
  description: string
  color: string
  /** Preferred Cloudflare (or routed) model id for this slot */
  preferredModelId: string
  envOverrideKey: string
  /** Optional per-slot Cloudflare API token env var */
  tokenEnvKey: string
}

export const FALLBACK_POLICY: FallbackPolicy = {
  maxRetriesPerProvider: 2,
  maxFallbackDepth: 4,
  requestTimeoutMs: 60_000,
  initialBackoffMs: 400,
  maxBackoffMs: 8_000,
  rateLimitCooldownMs: 60_000,
  hardFailureCooldownMs: 5 * 60_000,
  healthCacheTtlMs: 5 * 60_000,
}

/** Validated against Cloudflare Workers AI catalog (2026). */
export const CLOUDFLARE_MODELS: ModelConfig[] = [
  {
    id: "@cf/meta/llama-3.2-3b-instruct",
    displayName: "Llama 3.2 3B",
    providerId: "cloudflare",
    capabilities: ["text", "chat", "streaming", "json", "summarization"],
    contextWindow: 80_000,
    free: true,
    requestFormat: "messages",
    maxOutputTokensDefault: 1024,
  },
  {
    id: "@cf/meta/llama-3.1-8b-instruct-fp8",
    displayName: "Llama 3.1 8B",
    providerId: "cloudflare",
    capabilities: ["text", "chat", "streaming", "json", "long_form", "summarization", "coding"],
    contextWindow: 32_000,
    free: true,
    requestFormat: "messages",
    maxOutputTokensDefault: 2048,
  },
  {
    id: "@cf/qwen/qwen2.5-coder-32b-instruct",
    displayName: "Qwen2.5 Coder 32B",
    providerId: "cloudflare",
    capabilities: ["text", "chat", "streaming", "coding", "json", "long_form"],
    contextWindow: 32_768,
    free: true,
    requestFormat: "messages",
    maxOutputTokensDefault: 4096,
  },
  {
    id: "@cf/openai/gpt-oss-120b",
    displayName: "GPT-OSS 120B",
    providerId: "cloudflare",
    capabilities: ["text", "chat", "streaming", "json", "long_form", "coding", "summarization"],
    contextWindow: 128_000,
    free: true,
    requestFormat: "messages",
    maxOutputTokensDefault: 4096,
  },
  {
    id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    displayName: "Llama 3.3 70B Fast",
    providerId: "cloudflare",
    capabilities: ["text", "chat", "streaming", "json", "long_form", "coding", "summarization"],
    contextWindow: 24_000,
    free: true,
    requestFormat: "messages",
    maxOutputTokensDefault: 4096,
  },
]

export const UI_MODEL_SLOTS: Record<UiModelSlotId, UiModelSlot> = {
  haiku: {
    id: "haiku",
    name: "Claude Haiku",
    description: "Fast, concise responses",
    color: "bg-violet-500",
    preferredModelId: "@cf/meta/llama-3.1-8b-fast-v2",
    envOverrideKey: "CLOUDFLARE_HAIKU_MODEL",
    tokenEnvKey: "CLOUDFLARE_HAIKU_API_TOKEN",
  },
  gemini: {
    id: "gemini",
    name: "Gemini Argon",
    description: "Technical and analytical",
    color: "bg-cyan-500",
    preferredModelId: "@cf/meta/llama-3.1-8b-fast-v2",
    envOverrideKey: "CLOUDFLARE_GEMINI_MODEL",
    tokenEnvKey: "CLOUDFLARE_GEMINI_API_TOKEN",
  },
  muse: {
    id: "muse",
    name: "Muse Spark",
    description: "Creative and conversational",
    color: "bg-amber-500",
    preferredModelId: "@cf/meta/llama-3.1-8b-fast-v2",
    envOverrideKey: "CLOUDFLARE_MUSE_MODEL",
    tokenEnvKey: "CLOUDFLARE_MUSE_API_TOKEN",
  },
  gpt: {
    id: "gpt",
    name: "GPT 6.1",
    description: "Balanced reasoning and writing",
    color: "bg-emerald-500",
    preferredModelId: "@cf/meta/llama-3.1-8b-fast-v2",
    envOverrideKey: "CLOUDFLARE_GPT_MODEL",
    tokenEnvKey: "CLOUDFLARE_GPT_API_TOKEN",
  },
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "cloudflare",
    name: "Cloudflare Workers AI",
    enabled: true,
    priority: 1,
    envKeys: {
      accountId: "CLOUDFLARE_ACCOUNT_ID",
      apiToken: "CLOUDFLARE_API_TOKEN",
      haikuToken: "CLOUDFLARE_HAIKU_API_TOKEN",
      geminiToken: "CLOUDFLARE_GEMINI_API_TOKEN",
      museToken: "CLOUDFLARE_MUSE_API_TOKEN",
      gptToken: "CLOUDFLARE_GPT_API_TOKEN",
    },
    endpoint: "https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/run/{model}",
    defaultModelId: "@cf/meta/llama-3.1-8b-fast-v2",
    models: CLOUDFLARE_MODELS,
    freeOnlyEligible: true,
  },
  {
    id: "gemini",
    name: "Google Gemini",
    enabled: true,
    priority: 2,
    envKeys: {
      apiKey: "GOOGLE_GEMINI_API_KEY",
    },
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
    defaultModelId: "gemini-2.0-flash",
    models: [
      {
        id: "gemini-2.0-flash",
        displayName: "Gemini 2.0 Flash",
        providerId: "gemini",
        capabilities: ["text", "chat", "streaming", "json", "long_form", "coding", "summarization"],
        contextWindow: 1_000_000,
        free: true,
        requestFormat: "messages",
        maxOutputTokensDefault: 4096,
      },
    ],
    freeOnlyEligible: true,
  },
  {
    id: "groq",
    name: "Groq",
    enabled: true,
    priority: 3,
    envKeys: {
      apiKey: "GROQ_API_KEY",
    },
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    defaultModelId: "llama-3.3-70b-versatile",
    models: [
      {
        id: "llama-3.3-70b-versatile",
        displayName: "Llama 3.3 70B (Groq)",
        providerId: "groq",
        capabilities: ["text", "chat", "streaming", "json", "coding", "summarization"],
        contextWindow: 128_000,
        free: true,
        requestFormat: "openai_chat",
        maxOutputTokensDefault: 4096,
      },
      {
        id: "llama-3.1-8b-instant",
        displayName: "Llama 3.1 8B Instant",
        providerId: "groq",
        capabilities: ["text", "chat", "streaming", "summarization"],
        contextWindow: 128_000,
        free: true,
        requestFormat: "openai_chat",
        maxOutputTokensDefault: 2048,
      },
    ],
    freeOnlyEligible: true,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    enabled: true,
    priority: 4,
    envKeys: {
      apiKey: "OPENROUTER_API_KEY",
    },
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    defaultModelId: "meta-llama/llama-3.2-3b-instruct:free",
    models: [
      {
        id: "meta-llama/llama-3.2-3b-instruct:free",
        displayName: "Llama 3.2 3B (OpenRouter Free)",
        providerId: "openrouter",
        capabilities: ["text", "chat", "streaming", "summarization"],
        contextWindow: 128_000,
        free: true,
        requestFormat: "openai_chat",
        maxOutputTokensDefault: 2048,
      },
    ],
    freeOnlyEligible: true,
  },
  {
    id: "openai",
    name: "OpenAI",
    enabled: true,
    priority: 5,
    envKeys: {
      apiKey: "OPENAI_API_KEY",
    },
    endpoint: "https://api.openai.com/v1/chat/completions",
    defaultModelId: "gpt-4o-mini",
    models: [
      {
        id: "gpt-4o-mini",
        displayName: "GPT-4o mini",
        providerId: "openai",
        capabilities: ["text", "chat", "streaming", "json", "long_form", "coding", "summarization"],
        contextWindow: 128_000,
        free: false,
        requestFormat: "openai_chat",
        maxOutputTokensDefault: 4096,
      },
    ],
    freeOnlyEligible: false,
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    enabled: true,
    priority: 6,
    envKeys: {
      apiKey: "HF_TOKEN",
    },
    endpoint: "https://router.huggingface.co/v1/chat/completions",
    defaultModelId: "meta-llama/Llama-3.2-3B-Instruct",
    models: [
      {
        id: "meta-llama/Llama-3.2-3B-Instruct",
        displayName: "Llama 3.2 3B (HF)",
        providerId: "huggingface",
        capabilities: ["text", "chat", "streaming", "summarization"],
        contextWindow: 128_000,
        free: true,
        requestFormat: "openai_chat",
        maxOutputTokensDefault: 2048,
      },
    ],
    freeOnlyEligible: true,
  },
  {
    id: "ollama",
    name: "Ollama",
    enabled: true,
    priority: 7,
    envKeys: {
      baseUrl: "OLLAMA_BASE_URL",
    },
    endpoint: "{baseUrl}/api/chat",
    defaultModelId: "llama3.2",
    models: [
      {
        id: "llama3.2",
        displayName: "Llama 3.2 (Ollama)",
        providerId: "ollama",
        capabilities: ["text", "chat", "streaming", "json", "coding", "summarization"],
        contextWindow: 128_000,
        free: true,
        requestFormat: "messages",
        maxOutputTokensDefault: 2048,
      },
    ],
    freeOnlyEligible: true,
  },
]

export const TASK_CAPABILITY_MAP: Record<TaskType, ModelCapability[]> = {
  general: ["text", "chat"],
  conversation: ["chat"],
  coding: ["coding", "chat"],
  writing: ["long_form", "chat"],
  summarization: ["summarization", "chat"],
  research: ["long_form", "chat"],
  structured: ["json", "chat"],
  pdf: ["long_form", "json"],
  pptx: ["json", "chat"],
  document_analysis: ["long_form", "summarization"],
}

export function getProviderConfig(id: ProviderId): ProviderConfig | undefined {
  return PROVIDERS.find((p) => p.id === id)
}

export function getModelConfig(providerId: ProviderId, modelId: string): ModelConfig | undefined {
  return getProviderConfig(providerId)?.models.find((m) => m.id === modelId)
}

export function findModelAnywhere(modelId: string): ModelConfig | undefined {
  for (const provider of PROVIDERS) {
    const model = provider.models.find((m) => m.id === modelId)
    if (model) return model
  }
  return undefined
}

export function isKnownCloudflareModel(modelId: string): boolean {
  return CLOUDFLARE_MODELS.some((m) => m.id === modelId)
}

export function resolveUiSlotModelId(slotId: UiModelSlotId, env: NodeJS.ProcessEnv = process.env): string {
  const slot = UI_MODEL_SLOTS[slotId]
  const override = env[slot.envOverrideKey]
  if (override && override.startsWith("@cf/") && isKnownCloudflareModel(override)) {
    return override
  }
  if (override && override.startsWith("@cf/")) {
    // Allow env override even if not in static catalog (ops may add newer models)
    return override
  }
  return slot.preferredModelId
}
