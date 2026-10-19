"use client"

import { useMemo, useState } from "react"
import { AuthButton } from "@/components/story/auth-button"
import { StoryCard } from "@/components/story/story-card"
import { StoryShell } from "@/components/story/story-shell"
import { uniqueGenres, useStoryCatalog } from "@/lib/stories/hooks"
import { cn } from "@/lib/utils"

export function CategoriesPage() {
  const { stories, loading, error } = useStoryCatalog()
  const genres = useMemo(() => uniqueGenres(stories), [stories])
  const [active, setActive] = useState<string>("All")

  const filtered = useMemo(() => {
    if (active === "All") return stories
    return stories.filter((s) => s.genre === active)
  }, [stories, active])

  return (
    <StoryShell showNav>
      <header className="safe-top px-4 pb-2 pt-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3">
          <div>
            <p
              className="text-2xl font-semibold text-[var(--story-ink)]"
              style={{ fontFamily: "Fraunces, Georgia, serif" }}
            >
              Category
            </p>
            <p className="text-xs text-[var(--story-muted)]">Browse by genre</p>
          </div>
          <AuthButton />
        </div>
      </header>

      <div className="px-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-xl gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {["All", ...genres].map((genre) => {
            const selected = active === genre
            return (
              <button
                key={genre}
                type="button"
                onClick={() => setActive(genre)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition",
                  selected
                    ? "bg-[var(--story-accent)] text-white shadow-sm"
                    : "bg-white text-[var(--story-ink)] ring-1 ring-[var(--story-line)]",
                )}
              >
                {genre}
              </button>
            )
          })}
        </div>
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4 sm:px-6">
        <div className="mx-auto w-full max-w-xl space-y-3">
          {loading ? (
            <p className="text-sm text-[var(--story-muted)]">Loading…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--story-line)] bg-white/70 px-4 py-8 text-center text-sm text-[var(--story-muted)]">
              No stories in this category yet.
            </div>
          ) : (
            <>
              <p className="text-xs font-medium text-[var(--story-muted)]">
                {filtered.length} in {active}
              </p>
              <ul className="grid gap-3">
                {filtered.map((story) => (
                  <li key={story.id}>
                    <StoryCard story={story} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </main>
    </StoryShell>
  )
}
