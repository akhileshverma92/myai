"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bookmark, BookmarkCheck, Flame, Heart, MessageCircle, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFirebaseUser } from "@/components/story/auth-button"
import { LanguagePicker } from "@/components/story/language-picker"
import { StoryComments } from "@/components/story/story-comments"
import { StoryShell } from "@/components/story/story-shell"
import { addFavorite, isStoryFavorited, removeFavorite } from "@/lib/firebase/favorites"
import { mapFirebaseError } from "@/lib/firebase/errors"
import { syncProgressToCloud } from "@/lib/firebase/progress"
import { getStoryHype, likeStory } from "@/lib/firebase/social"
import { ensureUserProfile, updatePreferredLanguage } from "@/lib/firebase/users"
import type { StoryHype } from "@/lib/firebase/types"
import {
  loadPreferredLanguage,
  savePreferredLanguage,
  type StoryLanguage,
} from "@/lib/stories/language"
import { loadStoryNameDraft, saveStoryNameDraft } from "@/lib/stories/player-prefs"
import { getLatestSessionForStory } from "@/lib/stories/storage"
import type { NameSlot } from "@/lib/stories/types"

type PublicStory = {
  id: string
  title: string
  tagline: string
  premise: string
  genre: string
  coverGradient: string
  accent: string
  estimatedMinutes: number
  character: { name: string; role: string; avatarEmoji: string }
  finalGoal: string
  openingScene: string
  nameSlots: NameSlot[]
}

export function StoryDetail({ storyId }: { storyId: string }) {
  const router = useRouter()
  const user = useFirebaseUser()
  const [story, setStory] = useState<PublicStory | null>(null)
  const [hasSave, setHasSave] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [names, setNames] = useState<Record<string, string>>({})
  const [hype, setHype] = useState<StoryHype | null>(null)
  const [liking, setLiking] = useState(false)
  const [favorited, setFavorited] = useState(false)
  const [favBusy, setFavBusy] = useState(false)
  const [language, setLanguage] = useState<StoryLanguage | null>(null)

  useEffect(() => {
    setLanguage(loadPreferredLanguage())
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/stories/${storyId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Not found")
        if (cancelled) return
        setStory(data.story)
        const draft = loadStoryNameDraft(storyId)
        const next: Record<string, string> = {}
        for (const slot of data.story.nameSlots as NameSlot[]) {
          next[slot.id] = draft[slot.id] || slot.defaultName || ""
        }
        setNames(next)
        const existing = await getLatestSessionForStory(storyId)
        if (!cancelled) setHasSave(Boolean(existing))
        const stats = await getStoryHype(storyId)
        if (!cancelled) setHype(stats)
        if (user) {
          try {
            const profile = await ensureUserProfile(user)
            if (!cancelled && profile?.preferredLanguage) {
              setLanguage(profile.preferredLanguage)
            }
          } catch {
            // local language still works
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [storyId, user])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!user) {
        setFavorited(false)
        return
      }
      try {
        const liked = await isStoryFavorited(user.uid, storyId)
        if (!cancelled) setFavorited(liked)
      } catch {
        if (!cancelled) setFavorited(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, storyId])

  const canStart = useMemo(() => {
    if (!story || !language) return false
    return story.nameSlots.every((slot) => !slot.required || Boolean(names[slot.id]?.trim()))
  }, [story, names, language])

  const playerLabel = names.player?.trim()

  async function handleLanguageChange(next: StoryLanguage) {
    setLanguage(next)
    savePreferredLanguage(next)
    if (user) {
      try {
        await updatePreferredLanguage(user.uid, next)
      } catch {
        // local still ok
      }
    }
  }

  async function startFresh() {
    if (!story || !canStart || !language) {
      setError(
        !language
          ? "Choose English or Hindi before starting."
          : "Fill in the required character names to start.",
      )
      return
    }
    setLoading(true)
    setError(null)
    try {
      saveStoryNameDraft(storyId, names)
      savePreferredLanguage(language)
      const res = await fetch(`/api/stories/${storyId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterNames: names, language }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not start")
      const { saveSession } = await import("@/lib/stories/storage")
      await saveSession(data.session)

      if (user) {
        try {
          await ensureUserProfile(user)
          await syncProgressToCloud({
            uid: user.uid,
            progress: data.session.progress,
            meta: {
              title: story.title,
              genre: story.genre,
              characterName: story.character.name,
              playerName: data.session.playerName,
              characterNames: data.session.characterNames,
              startedAt: data.session.startedAt,
              isNewStart: true,
            },
          })
          setHype((prev) =>
            prev
              ? { ...prev, starts: prev.starts + 1 }
              : { storyId, starts: 1, comments: 0, likes: 0, updatedAt: new Date().toISOString() },
          )
        } catch {
          // local still works
        }
      }

      router.push(`/play/${storyId}?session=${data.session.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start")
      setLoading(false)
    }
  }

  async function continueSave() {
    setLoading(true)
    const existing = await getLatestSessionForStory(storyId)
    if (!existing) {
      await startFresh()
      return
    }
    router.push(`/play/${storyId}?session=${existing.id}`)
  }

  async function onHype() {
    if (!user) {
      setError("Sign in to hype this story.")
      return
    }
    setLiking(true)
    try {
      await likeStory(storyId, user.uid)
      setHype((prev) =>
        prev
          ? { ...prev, likes: prev.likes + 1 }
          : { storyId, starts: 0, comments: 0, likes: 1, updatedAt: new Date().toISOString() },
      )
    } catch (e) {
      setError(mapFirebaseError(e, "Could not hype"))
    } finally {
      setLiking(false)
    }
  }

  async function onToggleFavorite() {
    if (!user || !story) {
      setError("Sign in to save favorites.")
      return
    }
    setFavBusy(true)
    setError(null)
    try {
      if (favorited) {
        await removeFavorite(user.uid, storyId)
        setFavorited(false)
      } else {
        await addFavorite(user.uid, {
          storyId,
          title: story.title,
          genre: story.genre,
          characterName: story.character.name,
          coverGradient: story.coverGradient,
          accent: story.accent,
        })
        setFavorited(true)
      }
    } catch (e) {
      setError(mapFirebaseError(e, "Could not update favorites."))
    } finally {
      setFavBusy(false)
    }
  }

  if (error && !story) {
    return (
      <StoryShell className="items-center justify-center gap-3 px-4">
        <p className="text-sm text-red-600">{error}</p>
        <Button asChild variant="secondary">
          <Link href="/">Back</Link>
        </Button>
      </StoryShell>
    )
  }

  if (!story) {
    return (
      <StoryShell className="items-center justify-center text-sm text-[var(--story-muted)]">
        Loading story…
      </StoryShell>
    )
  }

  return (
    <StoryShell>
      <div
        className="relative min-h-[36dvh] shrink-0 sm:min-h-[40dvh]"
        style={{ background: story.coverGradient }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--story-bg)] via-black/10 to-black/25" />
        <div className="safe-top relative flex items-center justify-between px-3 pt-2">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-10 rounded-full bg-white/90 text-[var(--story-ink)] shadow-sm hover:bg-white"
          >
            <Link href="/" aria-label="Back to library">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--story-ink)] shadow-sm">
            {story.genre}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
          <p className="text-3xl" aria-hidden>
            {story.character.avatarEmoji}
          </p>
          <h1
            className="mt-1 text-[clamp(1.75rem,6vw,2.4rem)] font-semibold leading-tight tracking-tight text-white drop-shadow"
            style={{ fontFamily: "Fraunces, Georgia, serif" }}
          >
            {story.title}
          </h1>
          <p className="mt-1 text-sm text-white/90">{story.tagline}</p>
        </div>
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-40 pt-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[var(--story-ink)] shadow-sm">
              <Flame className="size-3.5 text-orange-500" />
              {hype?.starts ?? 0} starts
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[var(--story-ink)] shadow-sm">
              <Heart className="size-3.5 text-rose-500" />
              {hype?.likes ?? 0} hype
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[var(--story-ink)] shadow-sm">
              <MessageCircle className="size-3.5 text-[var(--story-accent)]" />
              {hype?.comments ?? 0} tips
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100"
              disabled={liking}
              onClick={() => void onHype()}
            >
              <Heart className="size-3.5" />
              Hype
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 rounded-full bg-[var(--story-accent-soft)] text-[var(--story-accent)] hover:bg-[var(--story-accent-soft)]/80"
              disabled={favBusy}
              onClick={() => void onToggleFavorite()}
            >
              {favorited ? <BookmarkCheck className="size-3.5" /> : <Bookmark className="size-3.5" />}
              {favorited ? "Saved" : "Favorite"}
            </Button>
          </div>

          <p className="text-[15px] leading-relaxed text-[var(--story-muted)]">{story.premise}</p>

          <div className="story-glass rounded-2xl px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--story-accent)]">
              Your goal
            </p>
            <p className="mt-1 text-sm font-medium leading-snug text-[var(--story-ink)]">
              {story.finalGoal}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--story-line)] bg-white p-4 shadow-[0_8px_24px_rgba(18,32,28,0.05)]">
            <p className="text-sm font-semibold text-[var(--story-ink)]">Name the cast</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--story-muted)]">
              {story.nameSlots.length === 1
                ? "Choose your name for this story."
                : `Set ${story.nameSlots.length} names. Optional roles can stay blank.`}
            </p>
            <div className="mt-4 space-y-3">
              {story.nameSlots.map((slot) => (
                <div key={slot.id} className="space-y-1.5">
                  <Label htmlFor={`slot-${slot.id}`} className="text-[var(--story-ink)]">
                    {slot.label}
                    {!slot.required ? (
                      <span className="font-normal text-[var(--story-muted)]"> · optional</span>
                    ) : null}
                  </Label>
                  {slot.description ? (
                    <p className="text-[11px] text-[var(--story-muted)]">{slot.description}</p>
                  ) : null}
                  <Input
                    id={`slot-${slot.id}`}
                    value={names[slot.id] ?? ""}
                    onChange={(e) => setNames((prev) => ({ ...prev, [slot.id]: e.target.value }))}
                    placeholder={slot.defaultName || slot.label}
                    maxLength={40}
                    className="h-11 rounded-xl border-[var(--story-line)] bg-[var(--story-bg)]/60"
                    autoComplete={slot.role === "player" ? "nickname" : "off"}
                  />
                </div>
              ))}
            </div>

            <div
              className={`mt-4 rounded-xl border px-3 py-3 ${
                language
                  ? "border-[var(--story-line)] bg-[var(--story-bg)]/50"
                  : "border-amber-200 bg-amber-50/80"
              }`}
            >
              <LanguagePicker
                value={language}
                onChange={(next) => void handleLanguageChange(next)}
                askFirst
              />
            </div>
          </div>

          <StoryComments
            storyId={storyId}
            onCommentAdded={() =>
              setHype((prev) =>
                prev
                  ? { ...prev, comments: prev.comments + 1 }
                  : {
                      storyId,
                      starts: 0,
                      comments: 1,
                      likes: 0,
                      updatedAt: new Date().toISOString(),
                    },
              )
            }
          />

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </main>

      <div className="safe-bottom fixed inset-x-0 bottom-0 border-t border-[var(--story-line)] bg-white/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-2">
          <Button
            type="button"
            className="h-12 w-full rounded-2xl text-base font-semibold shadow-md"
            disabled={loading || !canStart}
            onClick={() => void startFresh()}
            style={{ background: story.accent, color: "#12201c" }}
          >
            <Play className="size-4" />
            {playerLabel ? `Start as ${playerLabel}` : "Start story"}
          </Button>
          {hasSave ? (
            <Button
              type="button"
              variant="secondary"
              className="h-11 w-full rounded-2xl bg-[var(--story-accent-soft)] text-[var(--story-ink)] hover:bg-[var(--story-accent-soft)]/80"
              disabled={loading}
              onClick={() => void continueSave()}
            >
              Continue saved chat
            </Button>
          ) : null}
        </div>
      </div>
    </StoryShell>
  )
}
