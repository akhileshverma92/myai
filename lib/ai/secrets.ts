import {
  PROVIDERS,
  UI_MODEL_SLOTS,
  type ProviderId,
  type UiModelSlotId,
} from "@/src/config/accountApiConfig"

/** Server-only secret resolution. Never import this from client components. */

export interface ResolvedSecrets {
  cloudflare: {
    accountId?: string
    apiToken?: string
    slotTokens: Partial<Record<UiModelSlotId, string>>
  }
  gemini: { apiKey?: string }
  groq: { apiKey?: string }
  openrouter: { apiKey?: string }
  openai: { apiKey?: string }
  huggingface: { apiKey?: string }
  ollama: { baseUrl?: string }
}

function read(envKey: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const value = env[envKey]?.trim()
  return value || undefined
}

export function loadSecrets(env: NodeJS.ProcessEnv = process.env): ResolvedSecrets {
  return {
    cloudflare: {
      accountId: read("CLOUDFLARE_ACCOUNT_ID", env),
      apiToken: read("CLOUDFLARE_API_TOKEN", env),
      slotTokens: {
        haiku: read(UI_MODEL_SLOTS.haiku.tokenEnvKey, env),
        gemini: read(UI_MODEL_SLOTS.gemini.tokenEnvKey, env),
        muse: read(UI_MODEL_SLOTS.muse.tokenEnvKey, env),
        gpt: read(UI_MODEL_SLOTS.gpt.tokenEnvKey, env),
      },
    },
    gemini: { apiKey: read("GOOGLE_GEMINI_API_KEY", env) },
    groq: { apiKey: read("GROQ_API_KEY", env) },
    openrouter: { apiKey: read("OPENROUTER_API_KEY", env) },
    openai: { apiKey: read("OPENAI_API_KEY", env) },
    huggingface: { apiKey: read("HF_TOKEN", env) },
    ollama: { baseUrl: read("OLLAMA_BASE_URL", env) || read("OLLAMA_HOST", env) },
  }
}

export function resolveCloudflareApiToken(
  slotId?: UiModelSlotId,
  secrets = loadSecrets(),
): string | undefined {
  if (slotId) {
    const slotToken = secrets.cloudflare.slotTokens[slotId]
    if (slotToken) return slotToken
  }
  return secrets.cloudflare.apiToken
}

export function cloudflareHasAnyToken(secrets = loadSecrets()): boolean {
  if (secrets.cloudflare.apiToken) return true
  return Object.values(secrets.cloudflare.slotTokens).some(Boolean)
}

export function providerHasCredentials(providerId: ProviderId, secrets = loadSecrets()): boolean {
  switch (providerId) {
    case "cloudflare":
      return Boolean(secrets.cloudflare.accountId && cloudflareHasAnyToken(secrets))
    case "gemini":
      return Boolean(secrets.gemini.apiKey)
    case "groq":
      return Boolean(secrets.groq.apiKey)
    case "openrouter":
      return Boolean(secrets.openrouter.apiKey)
    case "openai":
      return Boolean(secrets.openai.apiKey)
    case "huggingface":
      return Boolean(secrets.huggingface.apiKey)
    case "ollama":
      return Boolean(secrets.ollama.baseUrl)
    default:
      return false
  }
}

export function listConfiguredProviderIds(secrets = loadSecrets()): ProviderId[] {
  return PROVIDERS.filter((p) => p.enabled && providerHasCredentials(p.id, secrets)).map((p) => p.id)
}

export function listConfiguredCloudflareSlots(secrets = loadSecrets()): UiModelSlotId[] {
  return (Object.keys(UI_MODEL_SLOTS) as UiModelSlotId[]).filter(
    (slot) => Boolean(resolveCloudflareApiToken(slot, secrets)),
  )
}
