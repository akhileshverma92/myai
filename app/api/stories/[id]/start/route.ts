import { NextResponse } from "next/server"
import { z } from "zod"
import { getPublicStory } from "@/lib/stories/catalog"
import { startStorySession } from "@/lib/stories/engine"

const bodySchema = z.object({
  characterNames: z.record(z.string(), z.string().max(40)).optional(),
})

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const publicStory = getPublicStory(id)
  if (!publicStory) {
    return NextResponse.json({ error: "Story not found." }, { status: 404 })
  }

  let json: unknown = {}
  try {
    json = await request.json()
  } catch {
    // empty
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid name setup." }, { status: 400 })
  }

  const result = startStorySession(id, { characterNames: parsed.data.characterNames })
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({
    session: result.session,
    story: publicStory,
  })
}
