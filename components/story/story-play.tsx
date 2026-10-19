"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, ChartNoAxesColumn, SendHorizonal } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useFirebaseUser } from "@/components/story/auth-button"
import { ProgressDrawer } from "@/components/story/progress-drawer"
import { ScoreChips, ScoreToast } from "@/components/story/score-chips"
import { StoryShell } from "@/components/story/story-shell"
import { syncProgressToCloud } from "@/lib/firebase/progress"
import { getSession, saveSession } from "@/lib/stories/storage"
import type { StoryChatMessage, StoryProgressState, StorySession } from "@/lib/stories/types"
import { cn } from "@/lib/utils"

type PublicStory = {
  id: string
  title: string
  genre?: string
  accent: string
  coverGradient: string
  character: { name: string; role: string; avatarEmoji: string }
  finalGoal: string
  scoring: {
    categories: Array<{ id: string; label: string; description?: string }>
    milestones: Array<{ id: string; label: string; description?: string }>
  }
  endings: Array<{ id: string; type: string; title: string; summary: string }>
}

export function StoryPlay({ storyId }: { storyId: string }) {
  const search = useSearchParams()
  const sessionId = search.get("session")
  const user = useFirebaseUser()
  const [story, setStory] = useState<PublicStory | null>(null)
  const [session, setSession] = useState<StorySession | null>(null)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toast, setToast] = useState<{
    label?: string | null
    deltas?: Record<string, number> | null
  } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/stories/${storyId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Story not found")
        if (!cancelled) setStory(data.story)

        if (sessionId) {
          const local = await getSession(sessionId)
          if (local && !cancelled) {
            setSession(local)
            return
          }
        }

        // Name is required on the story detail page — don't auto-start without it.
        if (!cancelled) {
          setError("Open the story page and enter your name to start.")
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load")
      }
    })()
    return () => {
      cancelled = true
      abortRef.current?.abort()
    }
  }, [storyId, sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [session?.messages.length, sending])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(t)
  }, [toast])

  const categoryLabels = useMemo(() => {
    const map: Record<string, string> = {}
    story?.scoring.categories.forEach((c) => {
      map[c.id] = c.label
    })
    return map
  }, [story])

  const persist = useCallback(
    async (next: StorySession) => {
      setSession(next)
      await saveSession(next)
      if (user && story) {
        try {
          await syncProgressToCloud({
            uid: user.uid,
            progress: next.progress,
            meta: {
              title: story.title,
              genre: story.genre || "Story",
              characterName: story.character.name,
              playerName: next.playerName,
              characterNames: next.characterNames || { player: next.playerName },
              startedAt: next.startedAt,
            },
          })
        } catch {
          // local save still ok
        }
      }
    },
    [user, story],
  )

  async function sendMessage() {
    if (!session || !story || sending) return
    const trimmed = input.trim()
    if (!trimmed) return

    setSending(true)
    setError(null)
    setInput("")

    const userMsg: StoryChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    }

    const optimistic: StorySession = {
      ...session,
      updatedAt: userMsg.createdAt,
      messages: [...session.messages, userMsg],
    }
    setSession(optimistic)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`/api/stories/${storyId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: trimmed,
          messageId: userMsg.id,
          history: session.messages,
          progress: session.progress,
          characterNames:
            session.characterNames && Object.keys(session.characterNames).length
              ? session.characterNames
              : { player: session.playerName || "Friend" },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Chat failed")

      const progress = data.progress as StoryProgressState
      const assistant = data.assistantMessage as StoryChatMessage
      const next: StorySession = {
        ...optimistic,
        updatedAt: assistant.createdAt,
        messages: [...optimistic.messages, assistant],
        progress,
      }
      await persist(next)

      if (data.feedbackLabel || (data.scoreDelta && Object.keys(data.scoreDelta).length)) {
        setToast({ label: data.feedbackLabel, deltas: data.scoreDelta })
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return
      setError(e instanceof Error ? e.message : "Chat failed")
      setSession(session)
      setInput(trimmed)
    } finally {
      setSending(false)
    }
  }

  if (error && !session) {
    return (
      <StoryShell className="items-center justify-center gap-3 px-4">
        <p className="text-center text-sm text-red-600">{error}</p>
        <Button asChild variant="secondary">
          <Link href={`/story/${storyId}`}>Back</Link>
        </Button>
      </StoryShell>
    )
  }

  if (!session || !story) {
    return (
      <StoryShell className="items-center justify-center text-sm text-[var(--story-muted)]">
        Opening story…
      </StoryShell>
    )
  }

  const ending = session.progress.endingId
    ? story.endings.find((e) => e.id === session.progress.endingId)
    : null
  const mainName =
    (session.characterNames &&
      Object.entries(session.characterNames).find(([id]) => id !== "player")?.[1]) ||
    story.character.name

  return (
    <StoryShell>
      <ScoreToast
        label={toast?.label}
        deltas={toast?.deltas}
        categoryLabels={categoryLabels}
      />

      <header className="safe-top z-10 border-b border-[var(--story-line)] bg-white/80 px-2 py-2 backdrop-blur-xl sm:px-3">
        <div className="mx-auto flex w-full max-w-xl items-center gap-1">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-10 shrink-0 rounded-full hover:bg-[var(--story-accent-soft)]"
          >
            <Link href={`/story/${storyId}`} aria-label="Back">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--story-accent-soft)] text-base"
                aria-hidden
              >
                {story.character.avatarEmoji}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--story-ink)]">{mainName}</p>
                <p className="truncate text-[11px] text-[var(--story-muted)]">
                  {session.playerName ? `with ${session.playerName}` : story.title}
                </p>
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 shrink-0 rounded-full hover:bg-[var(--story-accent-soft)]"
            aria-label="Story progress"
            onClick={() => setDrawerOpen(true)}
          >
            <ChartNoAxesColumn className="size-5" />
          </Button>
        </div>
        <div className="mx-auto mt-2 w-full max-w-xl px-2">
          <ScoreChips
            compact
            categories={story.scoring.categories}
            totals={session.progress.totals}
            accent={story.accent}
          />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4">
        <ul className="mx-auto flex w-full max-w-xl flex-col gap-3">
          {session.messages.map((msg) => (
            <motion.li
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "max-w-[88%] rounded-[1.15rem] px-3.5 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap shadow-sm sm:max-w-[80%]",
                msg.role === "user"
                  ? "ml-auto rounded-br-md bg-[var(--story-user)] text-[var(--story-user-fg)]"
                  : "mr-auto rounded-bl-md border border-[var(--story-line)] bg-white text-[var(--story-ink)]",
              )}
            >
              {msg.content}
            </motion.li>
          ))}
          {sending ? (
            <li className="mr-auto rounded-[1.15rem] rounded-bl-md border border-[var(--story-line)] bg-white px-3.5 py-2.5 text-sm text-[var(--story-muted)] shadow-sm">
              {mainName} is typing…
            </li>
          ) : null}
          {ending ? (
            <li
              className="rounded-2xl border px-3.5 py-3 text-sm shadow-sm"
              style={{ borderColor: `${story.accent}88`, background: `${story.accent}22` }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--story-muted)]">
                Ending · {ending.type}
              </p>
              <p className="mt-1 font-semibold text-[var(--story-ink)]">{ending.title}</p>
              <p className="mt-1 text-[var(--story-muted)]">{ending.summary}</p>
            </li>
          ) : null}
          <div ref={bottomRef} />
        </ul>
      </main>

      <div className="safe-bottom border-t border-[var(--story-line)] bg-white/90 px-3 py-2.5 backdrop-blur-xl sm:px-4">
        {error ? <p className="mb-1.5 px-1 text-xs text-red-600">{error}</p> : null}
        <form
          className="mx-auto flex w-full max-w-xl items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void sendMessage()
          }}
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={ending ? "Story complete — keep talking…" : "What do you say?"}
            rows={1}
            className="max-h-32 min-h-[48px] flex-1 resize-none rounded-2xl border-[var(--story-line)] bg-[var(--story-bg)] text-[15px] shadow-inner"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void sendMessage()
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            className="size-12 shrink-0 rounded-full shadow-md"
            disabled={sending || !input.trim()}
            style={{ background: story.accent, color: "#12201c" }}
            aria-label="Send"
          >
            <SendHorizonal className="size-4" />
          </Button>
        </form>
      </div>

      <ProgressDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        story={story}
        progress={session.progress}
        accent={story.accent}
        playerName={session.playerName}
        characterNames={session.characterNames}
      />
    </StoryShell>
  )
}
