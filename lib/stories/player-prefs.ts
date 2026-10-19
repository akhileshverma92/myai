"use client"

const KEY = "storylink-character-names"

type Stored = {
  /** Last player name used across stories */
  player?: string
  /** Per-story slot values */
  byStory?: Record<string, Record<string, string>>
}

function read(): Stored {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Stored
  } catch {
    return {}
  }
}

function write(data: Stored) {
  if (typeof window === "undefined") return
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function loadStoryNameDraft(storyId: string): Record<string, string> {
  const data = read()
  const story = data.byStory?.[storyId] ?? {}
  if (data.player && !story.player) {
    return { ...story, player: data.player }
  }
  return { ...story }
}

export function saveStoryNameDraft(storyId: string, names: Record<string, string>) {
  const data = read()
  const byStory = { ...(data.byStory ?? {}), [storyId]: names }
  const player = names.player || data.player
  write({ player, byStory })
}
