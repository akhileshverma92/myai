"use client"

import Link from "next/link"
import { ArrowUpRight, Clock3 } from "lucide-react"
import type { StoryCatalogItem } from "@/lib/stories/types"

export function StoryCard({
  story,
  compact,
}: {
  story: StoryCatalogItem
  compact?: boolean
}) {
  return (
    <Link
      href={`/story/${story.id}`}
      className="group block overflow-hidden rounded-[1.25rem] border border-[var(--story-line)] bg-white/80 shadow-[0_8px_24px_rgba(18,32,28,0.05)] transition active:scale-[0.99]"
    >
      <div
        className={compact ? "relative h-24" : "relative aspect-[16/10] min-h-[120px]"}
        style={{ background: story.coverGradient }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <span className="absolute left-2.5 top-2.5 rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
          {story.genre}
        </span>
        <span className="absolute right-2.5 top-2 text-xl" aria-hidden>
          {story.character.avatarEmoji}
        </span>
        <div className="absolute inset-x-0 bottom-0 p-3 text-white">
          <h2 className="text-base font-semibold leading-tight tracking-tight sm:text-lg">
            {story.title}
          </h2>
          {!compact ? <p className="mt-0.5 text-xs text-white/85">{story.tagline}</p> : null}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <p className="min-w-0 truncate text-xs text-[var(--story-muted)]">
          with {story.character.name}
        </p>
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[var(--story-accent)]">
          <Clock3 className="size-3" />
          {story.estimatedMinutes}m
          <ArrowUpRight className="size-3.5 opacity-70" />
        </span>
      </div>
    </Link>
  )
}
