"use client"

import { useEffect, useState } from "react"
import type { StoryCatalogItem } from "@/lib/stories/types"

export function useStoryCatalog() {
  const [stories, setStories] = useState<StoryCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/stories")
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to load stories")
        if (!cancelled) setStories(data.stories as StoryCatalogItem[])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { stories, loading, error }
}

export function uniqueGenres(stories: StoryCatalogItem[]) {
  const set = new Set(stories.map((s) => s.genre))
  return [...set].sort((a, b) => a.localeCompare(b))
}
