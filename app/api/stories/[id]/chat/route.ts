import { NextResponse } from "next/server"
import { z } from "zod"
import { getPublicStory } from "@/lib/stories/catalog"
import { runStoryTurn } from "@/lib/stories/engine"

const messageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().max(12_000),
  createdAt: z.string(),
  feedbackLabel: z.string().nullable().optional(),
  scoreDelta: z.record(z.string(), z.number()).nullable().optional(),
})

const progressSchema = z.object({
  storyId: z.string(),
  totals: z.record(z.string(), z.number()),
  unlockedMilestones: z.array(z.string()),
  endingId: z.string().nullable(),
  processedMessageIds: z.array(z.string()),
  ledger: z.array(z.any()).max(500),
  goalProgress: z.number(),
  updatedAt: z.string(),
})

const bodySchema = z.object({
  message: z.string().min(1).max(4000),
  messageId: z.string().min(1),
  history: z.array(messageSchema).max(80),
  progress: progressSchema,
  characterNames: z.record(z.string(), z.string().max(40)),
})

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const publicStory = getPublicStory(id)
  if (!publicStory) {
    return NextResponse.json({ error: "Story not found." }, { status: 404 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const body = parsed.data
  if (body.progress.storyId !== id) {
    return NextResponse.json({ error: "Progress story mismatch." }, { status: 400 })
  }

  try {
    const result = await runStoryTurn({
      storyId: id,
      userMessage: body.message.trim(),
      messageId: body.messageId,
      history: body.history,
      progress: body.progress,
      characterNames: body.characterNames,
    })

    return NextResponse.json({
      assistantMessage: result.assistantMessage,
      progress: result.progress,
      feedbackLabel: result.feedbackLabel,
      scoreDelta: result.scoreDelta,
      newlyUnlocked: result.newlyUnlocked,
      ending: result.ending,
      evalFailed: result.evalFailed,
      story: publicStory,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Story turn failed."
    const status = /Cloudflare|configured|not running|Please enter/i.test(message) ? 503 : 500
    return NextResponse.json({ error: message }, { status: status === 503 && message.includes("Please") ? 400 : status })
  }
}
