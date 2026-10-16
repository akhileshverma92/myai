import { PROVIDERS, type ProviderId } from "@/src/config/accountApiConfig"
import { createCloudflareAdapter } from "@/lib/ai/providers/cloudflare"
import { createGeminiAdapter } from "@/lib/ai/providers/gemini"
import { createOllamaAdapter } from "@/lib/ai/providers/ollama"
import { createOpenAiCompatibleAdapter } from "@/lib/ai/providers/openai-compatible"
import { loadSecrets, providerHasCredentials } from "@/lib/ai/secrets"
import type { ProviderAdapter, ProviderAvailability } from "@/lib/ai/types"
import { getCachedAvailability } from "@/lib/ai/health"

function createGroqAdapter() {
  return createOpenAiCompatibleAdapter({
    id: "groq",
    getApiKey: () => loadSecrets().groq.apiKey,
    getBaseUrl: () => "https://api.groq.com/openai/v1",
  })
}

function createOpenRouterAdapter() {
  return createOpenAiCompatibleAdapter({
    id: "openrouter",
    getApiKey: () => loadSecrets().openrouter.apiKey,
    getBaseUrl: () => "https://openrouter.ai/api/v1",
    defaultHeaders: () => ({
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_APP_NAME || "Auralink",
    }),
  })
}

function createOpenAiAdapter() {
  return createOpenAiCompatibleAdapter({
    id: "openai",
    getApiKey: () => loadSecrets().openai.apiKey,
    getBaseUrl: () => "https://api.openai.com/v1",
  })
}

function createHuggingFaceAdapter() {
  return createOpenAiCompatibleAdapter({
    id: "huggingface",
    getApiKey: () => loadSecrets().huggingface.apiKey,
    getBaseUrl: () => "https://router.huggingface.co/v1",
  })
}

const factories: Record<ProviderId, () => ProviderAdapter> = {
  cloudflare: createCloudflareAdapter,
  gemini: createGeminiAdapter,
  groq: createGroqAdapter,
  openrouter: createOpenRouterAdapter,
  openai: createOpenAiAdapter,
  huggingface: createHuggingFaceAdapter,
  ollama: createOllamaAdapter,
}

let cached: ProviderAdapter[] | null = null

/** Register every enabled provider that has valid credentials. */
export function getRegisteredProviders(forceRefresh = false): ProviderAdapter[] {
  if (cached && !forceRefresh) return cached
  const secrets = loadSecrets()
  cached = PROVIDERS.filter((p) => p.enabled && providerHasCredentials(p.id, secrets))
    .sort((a, b) => a.priority - b.priority)
    .map((p) => factories[p.id]())
  return cached
}

export function getProviderAdapter(id: ProviderId): ProviderAdapter | undefined {
  return getRegisteredProviders().find((p) => p.id === id)
}

export function resolveProviderAvailability(adapter: ProviderAdapter): ProviderAvailability {
  if (!adapter.isConfigured()) return "misconfigured"
  const cachedHealth = getCachedAvailability(adapter.id)
  if (cachedHealth) return cachedHealth
  return adapter.getAvailability()
}

export function resetRegistryForTests() {
  cached = null
}
