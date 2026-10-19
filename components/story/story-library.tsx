"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowUpRight, Clock3, Flame, Heart, MessageCircle, Sparkles } from "lucide-react"
import { AuthButton } from "@/components/story/auth-button"
import { StoryShell } from "@/components/story/story-shell"
import { getAllStoryHype } from "@/lib/firebase/social"
import type { StoryHype } from "@/lib/firebase/types"
import type { StoryCatalogItem } from "@/lib/stories/types"

export function StoryLibrary() {
  const [stories, setStories] = useState<StoryCatalogItem[]>([])
  const [hypeMap, setHypeMap] = useState<Record<string, StoryHype>>({})
  const [engineReady, setEngineReady] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/stories")
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to load stories")
        if (!cancelled) {
          setStories(data.stories)
          setEngineReady(Boolean(data.engine?.ready))
        }
        const hype = await getAllStoryHype()
        if (!cancelled) setHypeMap(hype)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const ranked = useMemo(() => {
    return [...stories].sort((a, b) => {
      const ha = hypeMap[a.id]
      const hb = hypeMap[b.id]
      const scoreA = (ha?.starts ?? 0) * 2 + (ha?.likes ?? 0) * 3 + (ha?.comments ?? 0)
      const scoreB = (hb?.starts ?? 0) * 2 + (hb?.likes ?? 0) * 3 + (hb?.comments ?? 0)
      return scoreB - scoreA
    })
  }, [stories, hypeMap])

  return (
    <StoryShell showNav>
      <header className="safe-top px-4 pb-2 pt-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-xl items-start justify-between gap-3">
          <div className="story-rise min-w-0">
            <p
              className="text-[clamp(2rem,8vw,2.75rem)] font-semibold leading-none tracking-tight text-[var(--story-ink)]"
              style={{ fontFamily: "Fraunces, Georgia, serif" }}
            >
              Storylink
            </p>
            <p className="mt-2 max-w-[18rem] text-sm leading-snug text-[var(--story-muted)]">
              Pick a story. Step into the scene. Chase the ending.
            </p>
          </div>
          <div className="shrink-0 pt-1">
            <AuthButton />
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-6">
        <div className="story-glass mx-auto mt-3 flex w-full max-w-xl items-center gap-2 rounded-2xl px-3 py-2.5 text-xs text-[var(--story-muted)]">
          <span
            className="inline-flex size-2 shrink-0 rounded-full"
            style={{
              background: engineReady ? "#0f766e" : engineReady == null ? "#d97706" : "#dc2626",
            }}
            aria-hidden
          />
          <Sparkles className="size-3.5 shrink-0 text-[var(--story-accent)]" />
          <span className="min-w-0 leading-snug">
            {engineReady == null
              ? "Checking AI…"
              : engineReady
                ? "Ready · signed-in progress syncs to your account"
                : "Add Cloudflare tokens in .env.local to chat"}
          </span>
        </div>
        {error ? <p className="mx-auto mt-2 max-w-xl text-sm text-red-600">{error}</p> : null}
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-4 sm:px-6">
        <div className="mx-auto mb-3 flex w-full max-w-xl items-center gap-2 text-xs font-medium text-[var(--story-muted)]">
          <Flame className="size-3.5 text-orange-500" />
          Sorted by community hype
        </div>
        <ul className="mx-auto grid w-full max-w-xl gap-3 sm:gap-4">
          {ranked.map((story, index) => {
            const hype = hypeMap[story.id]
            return (
              <motion.li
                key={story.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 + index * 0.05, duration: 0.4 }}
              >
                <Link
                  href={`/story/${story.id}`}
                  className="group block overflow-hidden rounded-[1.35rem] border border-[var(--story-line)] bg-white/70 shadow-[0_10px_30px_rgba(18,32,28,0.06)] transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--story-accent)]"
                >
                  <div
                    className="relative aspect-[16/10] min-h-[132px] w-full sm:aspect-[2.1/1]"
                    style={{ background: story.coverGradient }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
                    <div className="absolute left-3 top-3 flex items-center gap-2">
                      <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-md">
                        {story.genre}
                      </span>
                      {index === 0 && (hype?.starts || hype?.likes) ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                          <Flame className="size-3" />
                          Hot
                        </span>
                      ) : null}
                    </div>
                    <span className="absolute right-3 top-3 text-2xl drop-shadow" aria-hidden>
                      {story.character.avatarEmoji}
                    </span>
                    <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                      <h2 className="text-[1.35rem] font-semibold leading-tight tracking-tight sm:text-2xl">
                        {story.title}
                      </h2>
                      <p className="mt-1 text-sm text-white/85">{story.tagline}</p>
                    </div>
                  </div>
                  <div className="space-y-2 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--story-ink)]">
                          with {story.character.name}
                        </p>
                        <p className="truncate text-xs text-[var(--story-muted)]">
                          {story.character.role}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs font-medium text-[var(--story-muted)]">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--story-accent-soft)] px-2 py-1 text-[var(--story-accent)]">
                          <Clock3 className="size-3" />
                          {story.estimatedMinutes}m
                        </span>
                        <ArrowUpRight className="size-4 text-[var(--story-accent)] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-[11px] text-[var(--story-muted)]">
                      <span className="inline-flex items-center gap-1">
                        <Flame className="size-3 text-orange-500" />
                        {hype?.starts ?? 0}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Heart className="size-3 text-rose-500" />
                        {hype?.likes ?? 0}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="size-3 text-[var(--story-accent)]" />
                        {hype?.comments ?? 0}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.li>
            )
          })}
        </ul>
        <p className="mx-auto mt-6 max-w-xl px-2 text-center text-[11px] leading-relaxed text-[var(--story-muted)]">
          Sign in to save every start to your account and leave tips for other players.
        </p>
      </main>
    </StoryShell>
  )
}
