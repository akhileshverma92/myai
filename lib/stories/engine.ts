import { randomUUID } from "crypto"
import { getStoryById } from "@/lib/stories/catalog"
import {
  applyNamesToText,
  buildCharacterNamesSystemAddon,
  playerNameFromSlots,
  resolveCharacterNames,
} from "@/lib/stories/names"
import {
  applyScoreTurn,
  buildEvaluationPrompt,
  createInitialProgress,
  parseEvaluation,
} from "@/lib/stories/scoring"
import { storyModelChat } from "@/lib/stories/model"
import type { StoryChatMessage, StoryProgressState, StorySession } from "@/lib/stories/types"

function extractJsonObject(text: string): unknown {
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

export function startStorySession(
  storyId: string,
  opts?: { characterNames?: Record<string, string> },
): { session: StorySession } | { error: string } {
  const story = getStoryById(storyId)
  if (!story) return { error: "Story not found." }

  const resolved = resolveCharacterNames(story.nameSlots, opts?.characterNames)
  if (resolved.error) return { error: resolved.error }

  const characterNames = resolved.names
  const playerName = playerNameFromSlots(characterNames, story.nameSlots)
  const now = new Date().toISOString()
  const opening = applyNamesToText(story.openingScene, story.nameSlots, characterNames)

  return {
    session: {
      id: randomUUID(),
      storyId,
      startedAt: now,
      updatedAt: now,
      characterNames,
      playerName,
      messages: [
        {
          id: randomUUID(),
          role: "assistant",
          content: opening,
          createdAt: now,
        },
      ],
      progress: createInitialProgress(story),
    },
  }
}

export async function runStoryTurn(args: {
  storyId: string
  userMessage: string
  messageId: string
  history: StoryChatMessage[]
  progress: StoryProgressState
  characterNames: Record<string, string>
  signal?: AbortSignal
}): Promise<{
  assistantMessage: StoryChatMessage
  progress: StoryProgressState
  feedbackLabel: string | null
  scoreDelta: Record<string, number> | null
  newlyUnlocked: string[]
  ending: { id: string; title: string; summary: string; type: string } | null
  evalFailed: boolean
}> {
  const story = getStoryById(args.storyId)
  if (!story) throw new Error("Story not found.")

  const resolved = resolveCharacterNames(story.nameSlots, args.characterNames)
  if (resolved.error) throw new Error(resolved.error)

  const systemPrompt = `${story.systemPrompt}\n${buildCharacterNamesSystemAddon(story, resolved.names)}`

  const historyForModel = args.history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-16)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))

  const recentContext = historyForModel
    .slice(-6)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n")

  const [characterResult, evalResult] = await Promise.allSettled([
    storyModelChat({
      messages: [
        { role: "system", content: systemPrompt },
        ...historyForModel,
        { role: "user", content: args.userMessage },
      ],
      temperature: 0.8,
      maxTokens: 700,
      signal: args.signal,
    }),
    storyModelChat({
      messages: [
        {
          role: "system",
          content: "You output valid JSON only for story scoring.",
        },
        {
          role: "user",
          content: buildEvaluationPrompt({
            story,
            userMessage: args.userMessage,
            recentContext,
          }),
        },
      ],
      jsonMode: true,
      temperature: 0.2,
      maxTokens: 400,
      signal: args.signal,
    }),
  ])

  if (characterResult.status === "rejected") {
    throw characterResult.reason instanceof Error
      ? characterResult.reason
      : new Error("Character generation failed.")
  }

  let evalFailed = false
  let evaluation = parseEvaluation({ meaningful: false, deltas: {}, reasonCodes: [] })
  if (evalResult.status === "fulfilled") {
    try {
      evaluation = parseEvaluation(extractJsonObject(evalResult.value.text))
    } catch {
      evalFailed = true
    }
  } else {
    evalFailed = true
    evaluation = {
      meaningful: false,
      deltas: {},
      reasonCodes: ["eval_failed"],
      feedbackLabel: null,
    }
  }

  const replyText = characterResult.value.text
  const scored = applyScoreTurn({
    story,
    progress: args.progress,
    messageId: args.messageId,
    evaluation,
    eventId: randomUUID(),
  })

  const endingDef = scored.endingId
    ? story.endings.find((e) => e.id === scored.endingId) ?? null
    : null

  const now = new Date().toISOString()
  const assistantMessage: StoryChatMessage = {
    id: randomUUID(),
    role: "assistant",
    content: replyText,
    createdAt: now,
    feedbackLabel: scored.event?.feedbackLabel ?? null,
    scoreDelta: scored.event?.deltas ?? null,
  }

  return {
    assistantMessage,
    progress: scored.progress,
    feedbackLabel: scored.event?.feedbackLabel ?? null,
    scoreDelta: scored.event && Object.keys(scored.event.deltas).length ? scored.event.deltas : null,
    newlyUnlocked: scored.newlyUnlocked,
    ending: endingDef
      ? {
          id: endingDef.id,
          title: endingDef.title,
          summary: endingDef.summary,
          type: endingDef.type,
        }
      : null,
    evalFailed,
  }
}
