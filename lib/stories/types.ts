import { z } from "zod"

export const scoreCategorySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  min: z.number().default(0),
  max: z.number().default(100),
  initial: z.number().default(0),
  maxDeltaPerTurn: z.number().positive().default(12),
})

export const milestoneSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  /** Category that must reach `gte`, and/or reason codes from evaluation */
  when: z.object({
    category: z.string().optional(),
    gte: z.number().optional(),
    reasonCodes: z.array(z.string()).optional(),
  }),
})

export const endingSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["success", "partial", "alternate", "failure"]),
  title: z.string().min(1),
  summary: z.string().min(1),
  requiredMilestones: z.array(z.string()).default([]),
  minScores: z.record(z.string(), z.number()).optional(),
})

export const storyScoringSchema = z.object({
  categories: z.array(scoreCategorySchema).min(1),
  milestones: z.array(milestoneSchema).default([]),
})

/** User-configurable names for this story (max 4). One-character stories use a single player slot. */
export const nameSlotSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  role: z.enum(["player", "main", "supporting"]),
  description: z.string().optional(),
  /** Suggested / canon name; used in opening scene until the user overrides */
  defaultName: z.string().max(40).optional(),
  required: z.boolean().default(true),
})

export const storyDefinitionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  tagline: z.string().min(1),
  premise: z.string().min(1),
  genre: z.string().min(1),
  coverGradient: z.string().min(1),
  accent: z.string().min(1),
  estimatedMinutes: z.number().int().positive(),
  character: z.object({
    name: z.string().min(1),
    role: z.string().min(1),
    avatarEmoji: z.string().min(1),
  }),
  /** 1–4 name slots the user can set before starting */
  nameSlots: z.array(nameSlotSchema).min(1).max(4),
  openingScene: z.string().min(1),
  /** Hidden from clients — personality, plot rules, tone */
  systemPrompt: z.string().min(1),
  /** User-visible objective */
  finalGoal: z.string().min(1),
  scoring: storyScoringSchema,
  endings: z.array(endingSchema).min(1),
})

export type ScoreCategory = z.infer<typeof scoreCategorySchema>
export type MilestoneDef = z.infer<typeof milestoneSchema>
export type EndingDef = z.infer<typeof endingSchema>
export type NameSlot = z.infer<typeof nameSlotSchema>
export type StoryDefinition = z.infer<typeof storyDefinitionSchema>

/** Public catalog card — never includes systemPrompt */
export type StoryCatalogItem = {
  id: string
  title: string
  tagline: string
  premise: string
  genre: string
  coverGradient: string
  accent: string
  estimatedMinutes: number
  character: StoryDefinition["character"]
  finalGoal: string
}

export const scoreDeltaSchema = z.record(z.string(), z.number())

export const evaluationResultSchema = z.object({
  meaningful: z.boolean(),
  deltas: scoreDeltaSchema.default({}),
  reasonCodes: z.array(z.string()).default([]),
  feedbackLabel: z.string().max(80).optional().nullable(),
  goalProgressHint: z.number().min(0).max(100).optional().nullable(),
})

export type EvaluationResult = z.infer<typeof evaluationResultSchema>

export const scoreEventSchema = z.object({
  id: z.string(),
  messageId: z.string(),
  storyId: z.string(),
  createdAt: z.string(),
  deltas: scoreDeltaSchema,
  reasonCodes: z.array(z.string()),
  feedbackLabel: z.string().optional().nullable(),
  totalsAfter: z.record(z.string(), z.number()),
})

export type ScoreEvent = z.infer<typeof scoreEventSchema>

export type StoryProgressState = {
  storyId: string
  totals: Record<string, number>
  unlockedMilestones: string[]
  endingId: string | null
  processedMessageIds: string[]
  ledger: ScoreEvent[]
  goalProgress: number
  updatedAt: string
}

export type StoryChatMessage = {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  createdAt: string
  feedbackLabel?: string | null
  scoreDelta?: Record<string, number> | null
}

export type StorySession = {
  id: string
  storyId: string
  startedAt: string
  updatedAt: string
  /** Resolved names keyed by nameSlot.id (player, main, supporting…) */
  characterNames: Record<string, string>
  /** Convenience: player slot name */
  playerName: string
  messages: StoryChatMessage[]
  progress: StoryProgressState
}
