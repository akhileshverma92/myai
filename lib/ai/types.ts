import type { ModelCapability, ProviderId, TaskType, UiModelSlotId } from "@/src/config/accountApiConfig"

export type ChatRole = "system" | "user" | "assistant"

export interface ChatMessage {
  role: ChatRole
  content: string
}

export type ProviderAvailability =
  | "configured"
  | "reachable"
  | "rate_limited"
  | "unavailable"
  | "misconfigured"

export type NormalizedErrorCode =
  | "auth"
  | "permission"
  | "not_found"
  | "rate_limit"
  | "quota"
  | "unavailable"
  | "timeout"
  | "network"
  | "server"
  | "context_overflow"
  | "unsupported"
  | "invalid_output"
  | "cancelled"
  | "misconfigured"
  | "unknown"

export interface NormalizedProviderError {
  code: NormalizedErrorCode
  message: string
  retryable: boolean
  status?: number
  retryAfterMs?: number
  providerId?: ProviderId
  modelId?: string
}

export interface TokenUsage {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}

export interface GenerateRequest {
  messages: ChatMessage[]
  taskType: TaskType
  systemInstruction?: string
  maxTokens?: number
  temperature?: number
  jsonMode?: boolean
  freeOnly?: boolean
  /** Preferred UI slot or explicit model id */
  preferredModelId?: string
  /** UI slot used for per-slot Cloudflare tokens and labels */
  preferredSlotId?: UiModelSlotId
  preferredProviderId?: ProviderId
  signal?: AbortSignal
  stream?: boolean
}

export interface GenerateResult {
  text: string
  providerId: ProviderId
  providerName: string
  modelId: string
  modelDisplayName: string
  latencyMs: number
  usage?: TokenUsage
  fallbackUsed: boolean
  attemptedProviders: ProviderId[]
  taskType: TaskType
}

export interface StreamChunk {
  type: "delta" | "meta" | "error" | "done"
  text?: string
  meta?: Partial<GenerateResult>
  error?: NormalizedProviderError
}

export interface ProviderAdapter {
  id: ProviderId
  name: string
  isConfigured(): boolean
  getAvailability(): ProviderAvailability
  supports(capability: ModelCapability): boolean
  listModels(): string[]
  generate(request: GenerateRequest, modelId: string): Promise<GenerateResult>
  generateStream?(
    request: GenerateRequest,
    modelId: string,
  ): AsyncGenerator<StreamChunk, void, unknown>
}
