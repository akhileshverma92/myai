import { NextResponse } from "next/server"
import { getPublicStory } from "@/lib/stories/catalog"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const story = getPublicStory(id)
  if (!story) {
    return NextResponse.json({ error: "Story not found." }, { status: 404 })
  }
  return NextResponse.json({ story })
}
