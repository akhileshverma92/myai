import {
  UI_MODEL_SLOTS,
  type UiModelSlotId,
  resolveUiSlotModelId,
} from "@/src/config/accountApiConfig"

/** Client-safe model slot metadata (no secrets). */
export const AI_MODELS = {
  haiku: {
    id: "haiku" as const,
    name: UI_MODEL_SLOTS.haiku.name,
    provider: "Cloudflare AI",
    envKey: UI_MODEL_SLOTS.haiku.envOverrideKey,
    color: UI_MODEL_SLOTS.haiku.color,
    description: UI_MODEL_SLOTS.haiku.description,
  },
  gemini: {
    id: "gemini" as const,
    name: UI_MODEL_SLOTS.gemini.name,
    provider: "Cloudflare AI",
    envKey: UI_MODEL_SLOTS.gemini.envOverrideKey,
    color: UI_MODEL_SLOTS.gemini.color,
    description: UI_MODEL_SLOTS.gemini.description,
  },
  muse: {
    id: "muse" as const,
    name: UI_MODEL_SLOTS.muse.name,
    provider: "Cloudflare AI",
    envKey: UI_MODEL_SLOTS.muse.envOverrideKey,
    color: UI_MODEL_SLOTS.muse.color,
    description: UI_MODEL_SLOTS.muse.description,
  },
  gpt: {
    id: "gpt" as const,
    name: UI_MODEL_SLOTS.gpt.name,
    provider: "Cloudflare AI",
    envKey: UI_MODEL_SLOTS.gpt.envOverrideKey,
    color: UI_MODEL_SLOTS.gpt.color,
    description: UI_MODEL_SLOTS.gpt.description,
  },
} as const

export type AiModelId = UiModelSlotId

export function getConfiguredModelId(model: string | undefined): AiModelId {
  if (model && model in AI_MODELS) return model as AiModelId
  return "haiku"
}

export function getModelName(model: AiModelId) {
  return AI_MODELS[model].name
}

export const DEFAULT_MODEL_IDS: Record<AiModelId, string> = {
  haiku: UI_MODEL_SLOTS.haiku.preferredModelId,
  gemini: UI_MODEL_SLOTS.gemini.preferredModelId,
  muse: UI_MODEL_SLOTS.muse.preferredModelId,
  gpt: UI_MODEL_SLOTS.gpt.preferredModelId,
}

/** Env var names only — never put real tokens here. */
export const CLOUDFLARE_ENV_KEYS = {
  accountId: "CLOUDFLARE_ACCOUNT_ID",
  apiToken: "CLOUDFLARE_API_TOKEN",
} as const

export function resolveSlotModelId(slot: AiModelId) {
  return resolveUiSlotModelId(slot)
}

export const API_CONSTANTS = { AI_MODELS, DEFAULT_MODEL_IDS, CLOUDFLARE_ENV_KEYS } as const
