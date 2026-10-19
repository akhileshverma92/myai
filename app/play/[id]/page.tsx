import { Suspense } from "react"
import { StoryPlay } from "@/components/story/story-play"

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-[var(--aura-bg)] text-sm text-[var(--aura-muted)]">
          Opening story…
        </div>
      }
    >
      <StoryPlay storyId={id} />
    </Suspense>
  )
}
