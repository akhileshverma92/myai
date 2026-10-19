import { NextResponse } from "next/server"
import { listCatalog } from "@/lib/stories/catalog"
import { getStoryEngineStatus } from "@/lib/stories/model"

export async function GET() {
  const engine = getStoryEngineStatus()
  return NextResponse.json({
    stories: listCatalog(),
    engine: {
      provider: engine.provider,
      ready: engine.ready,
      model: engine.model,
      slot: engine.slot,
    },
  })
}
