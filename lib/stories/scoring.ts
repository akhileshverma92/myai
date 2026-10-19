import {
  evaluationResultSchema,
  type EvaluationResult,
  type ScoreEvent,
  type StoryDefinition,
  type StoryProgressState,
} from "@/lib/stories/types"

export function initialTotals(story: StoryDefinition): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const cat of story.scoring.categories) {
    totals[cat.id] = clamp(cat.initial, cat.min, cat.max)
  }
  return totals
}

export function createInitialProgress(story: StoryDefinition): StoryProgressState {
  return {
    storyId: story.id,
    totals: initialTotals(story),
    unlockedMilestones: [],
    endingId: null,
    processedMessageIds: [],
    ledger: [],
    goalProgress: 0,
    updatedAt: new Date().toISOString(),
  }
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

/** Parse + sanitize model evaluation; never trusts raw totals. */
export function parseEvaluation(raw: unknown): EvaluationResult {
  const parsed = evaluationResultSchema.safeParse(raw)
  if (!parsed.success) {
    return { meaningful: false, deltas: {}, reasonCodes: ["eval_parse_failed"], feedbackLabel: null }
  }
  return parsed.data
}

export function sanitizeDeltas(
  story: StoryDefinition,
  deltas: Record<string, number>,
  meaningful: boolean,
): Record<string, number> {
  if (!meaningful) return {}
  const out: Record<string, number> = {}
  for (const cat of story.scoring.categories) {
    const raw = deltas[cat.id]
    if (typeof raw !== "number" || Number.isNaN(raw) || raw === 0) continue
    const capped = clamp(Math.round(raw), -cat.maxDeltaPerTurn, cat.maxDeltaPerTurn)
    if (capped !== 0) out[cat.id] = capped
  }
  return out
}

export function applyScoreTurn(args: {
  story: StoryDefinition
  progress: StoryProgressState
  messageId: string
  evaluation: EvaluationResult
  eventId: string
}): {
  progress: StoryProgressState
  event: ScoreEvent | null
  newlyUnlocked: string[]
  endingId: string | null
} {
  const { story, messageId, evaluation, eventId } = args
  const progress: StoryProgressState = {
    ...args.progress,
    totals: { ...args.progress.totals },
    unlockedMilestones: [...args.progress.unlockedMilestones],
    processedMessageIds: [...args.progress.processedMessageIds],
    ledger: [...args.progress.ledger],
  }

  if (progress.processedMessageIds.includes(messageId)) {
    return {
      progress,
      event: null,
      newlyUnlocked: [],
      endingId: progress.endingId,
    }
  }

  progress.processedMessageIds.push(messageId)

  const deltas = sanitizeDeltas(story, evaluation.deltas, evaluation.meaningful)
  const hasDelta = Object.keys(deltas).length > 0

  if (hasDelta) {
    for (const [key, delta] of Object.entries(deltas)) {
      const cat = story.scoring.categories.find((c) => c.id === key)
      if (!cat) continue
      progress.totals[key] = clamp((progress.totals[key] ?? cat.initial) + delta, cat.min, cat.max)
    }
  }

  // Reason-code / threshold milestones
  const newlyUnlocked: string[] = []
  for (const mile of story.scoring.milestones) {
    if (progress.unlockedMilestones.includes(mile.id)) continue
    let ok = false
    if (mile.when.category != null && mile.when.gte != null) {
      ok = (progress.totals[mile.when.category] ?? 0) >= mile.when.gte
    }
    if (mile.when.reasonCodes?.length) {
      const hit = mile.when.reasonCodes.some((code) => evaluation.reasonCodes.includes(code))
      ok = mile.when.category != null ? ok && hit : hit
    }
    if (ok) {
      progress.unlockedMilestones.push(mile.id)
      newlyUnlocked.push(mile.id)
    }
  }

  const milestoneRatio =
    story.scoring.milestones.length === 0
      ? 0
      : progress.unlockedMilestones.length / story.scoring.milestones.length
  const hint =
    typeof evaluation.goalProgressHint === "number" ? evaluation.goalProgressHint / 100 : milestoneRatio
  progress.goalProgress = clamp(Math.round(Math.max(milestoneRatio, hint) * 100), 0, 100)

  let event: ScoreEvent | null = null
  if (hasDelta || newlyUnlocked.length > 0) {
    event = {
      id: eventId,
      messageId,
      storyId: story.id,
      createdAt: new Date().toISOString(),
      deltas,
      reasonCodes: evaluation.reasonCodes,
      feedbackLabel: evaluation.meaningful ? evaluation.feedbackLabel ?? null : null,
      totalsAfter: { ...progress.totals },
    }
    progress.ledger.push(event)
  }

  const endingId = resolveEnding(story, progress)
  progress.endingId = endingId
  progress.updatedAt = new Date().toISOString()

  return { progress, event, newlyUnlocked, endingId }
}

export function resolveEnding(
  story: StoryDefinition,
  progress: StoryProgressState,
): string | null {
  // Prefer most specific success/alternate/partial that matches; failure last
  const order = ["success", "alternate", "partial", "failure"] as const
  const sorted = [...story.endings].sort(
    (a, b) => order.indexOf(a.type) - order.indexOf(b.type),
  )

  for (const ending of sorted) {
    const milestonesOk = ending.requiredMilestones.every((id) =>
      progress.unlockedMilestones.includes(id),
    )
    if (!milestonesOk) continue
    if (ending.minScores) {
      const scoresOk = Object.entries(ending.minScores).every(
        ([cat, min]) => (progress.totals[cat] ?? 0) >= min,
      )
      if (!scoresOk) continue
    }
    // Failure endings only if explicitly reached via required milestones
    if (ending.type === "failure" && ending.requiredMilestones.length === 0) continue
    return ending.id
  }
  return progress.endingId
}

export function buildEvaluationPrompt(args: {
  story: StoryDefinition
  userMessage: string
  recentContext: string
}): string {
  const cats = args.story.scoring.categories
    .map((c) => `- ${c.id} (${c.label}): max ±${c.maxDeltaPerTurn} per turn. ${c.description ?? ""}`)
    .join("\n")

  return `You are a silent story scoring engine. Evaluate ONLY the latest user message in context.
Return JSON only, no markdown.

Story goal: ${args.story.finalGoal}
Categories:
${cats}

Rules:
- Ordinary greetings, repeated messages, and neutral questions → meaningful=false and empty deltas.
- Do not punish disagreement, boundaries, or reasonable alternate choices.
- Award positive/negative/zero based on story context.
- reasonCodes: short snake_case codes (e.g. showed_empathy, found_clue).
- feedbackLabel: brief user-visible label only when meaningful (max 6 words), else null.
- goalProgressHint: 0-100 estimate of objective completion, or null.

Recent context:
${args.recentContext}

Latest user message:
"""${args.userMessage}"""

JSON shape:
{"meaningful":boolean,"deltas":{"categoryId":number},"reasonCodes":["string"],"feedbackLabel":string|null,"goalProgressHint":number|null}`
}
