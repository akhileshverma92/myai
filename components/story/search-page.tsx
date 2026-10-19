"use client"

import { useMemo, useState } from "react"
import { Search as SearchIcon, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { AuthButton } from "@/components/story/auth-button"
import { StoryCard } from "@/components/story/story-card"
import { StoryShell } from "@/components/story/story-shell"
import { useStoryCatalog } from "@/lib/stories/hooks"

export function SearchPage() {
  const { stories, loading, error } = useStoryCatalog()
  const [q, setQ] = useState("")

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return stories
    return stories.filter((s) => {
      const hay = [
        s.title,
        s.tagline,
        s.premise,
        s.genre,
        s.character.name,
        s.character.role,
        s.finalGoal,
      ]
        .join(" ")
        .toLowerCase()
      return hay.includes(needle)
    })
  }, [stories, q])

  return (
    <StoryShell showNav>
      <header className="safe-top px-4 pb-2 pt-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3">
          <div>
            <p
              className="text-2xl font-semibold text-[var(--story-ink)]"
              style={{ fontFamily: "Fraunces, Georgia, serif" }}
            >
              Search
            </p>
            <p className="text-xs text-[var(--story-muted)]">Find a story or character</p>
          </div>
          <AuthButton />
        </div>
      </header>

      <div className="px-4 sm:px-6">
        <div className="relative mx-auto w-full max-w-xl">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--story-muted)]" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Romance, Aanya, detective…"
            className="h-12 rounded-2xl border-[var(--story-line)] bg-white pl-10 pr-10 text-[15px] shadow-sm"
            autoFocus
          />
          {q ? (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--story-muted)]"
              onClick={() => setQ("")}
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4 sm:px-6">
        <div className="mx-auto w-full max-w-xl space-y-3">
          {loading ? (
            <p className="text-sm text-[var(--story-muted)]">Loading stories…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--story-line)] bg-white/70 px-4 py-8 text-center text-sm text-[var(--story-muted)]">
              No stories match “{q.trim()}”.
            </div>
          ) : (
            <>
              <p className="text-xs font-medium text-[var(--story-muted)]">
                {results.length} stor{results.length === 1 ? "y" : "ies"}
                {q.trim() ? ` for “${q.trim()}”` : ""}
              </p>
              <ul className="grid gap-3">
                {results.map((story) => (
                  <li key={story.id}>
                    <StoryCard story={story} compact={Boolean(q.trim())} />
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
