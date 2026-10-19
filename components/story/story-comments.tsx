"use client"

import { useEffect, useState } from "react"
import { MessageCirclePlus, SendHorizonal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useFirebaseUser } from "@/components/story/auth-button"
import { addStoryComment, listStoryComments } from "@/lib/firebase/social"
import { isFirebaseConfigured } from "@/lib/firebase/client"
import type { StoryComment } from "@/lib/firebase/types"

export function StoryComments({
  storyId,
  onCommentAdded,
}: {
  storyId: string
  onCommentAdded?: () => void
}) {
  const user = useFirebaseUser()
  const configured = isFirebaseConfigured()
  const [comments, setComments] = useState<StoryComment[]>([])
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!configured) {
        setLoading(false)
        return
      }
      try {
        const list = await listStoryComments(storyId)
        if (!cancelled) setComments(list)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load tips.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [storyId, configured])

  async function submit() {
    if (!user) {
      setError("Sign in to leave a tip for other players.")
      return
    }
    setSending(true)
    setError(null)
    try {
      const created = await addStoryComment({
        storyId,
        uid: user.uid,
        authorName: user.displayName || "Player",
        authorPhoto: user.photoURL,
        text,
      })
      setComments((prev) => [created, ...prev])
      setText("")
      onCommentAdded?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post tip.")
    } finally {
      setSending(false)
    }
  }

  if (!configured) {
    return (
      <div className="rounded-2xl border border-[var(--story-line)] bg-white/80 px-4 py-3 text-sm text-[var(--story-muted)]">
        Comments need Firebase. Add your Firebase keys to enable tips from other players.
      </div>
    )
  }

  return (
    <section className="rounded-2xl border border-[var(--story-line)] bg-white p-4 shadow-[0_8px_24px_rgba(18,32,28,0.05)]">
      <div className="flex items-center gap-2">
        <MessageCirclePlus className="size-4 text-[var(--story-accent)]" />
        <h2 className="text-sm font-semibold text-[var(--story-ink)]">Player tips</h2>
        <span className="text-xs text-[var(--story-muted)]">{comments.length}</span>
      </div>
      <p className="mt-1 text-xs text-[var(--story-muted)]">
        Share spoiler-light advice to help others with this story.
      </p>

      <div className="mt-3 space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={user ? "Helpful tip (no major spoilers)…" : "Sign in to comment…"}
          rows={3}
          maxLength={500}
          disabled={!user || sending}
          className="rounded-xl border-[var(--story-line)] bg-[var(--story-bg)]/50 text-sm"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-[var(--story-muted)]">{text.length}/500</span>
          <Button
            type="button"
            size="sm"
            className="rounded-full bg-[var(--story-accent)] text-white hover:bg-[var(--story-accent)]/90"
            disabled={!user || sending || text.trim().length < 2}
            onClick={() => void submit()}
          >
            <SendHorizonal className="size-3.5" />
            Post tip
          </Button>
        </div>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>

      <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto">
        {loading ? (
          <li className="text-xs text-[var(--story-muted)]">Loading tips…</li>
        ) : comments.length === 0 ? (
          <li className="text-xs text-[var(--story-muted)]">No tips yet — be the first.</li>
        ) : (
          comments.map((c) => (
            <li key={c.id} className="rounded-xl bg-[var(--story-bg)]/70 px-3 py-2.5">
              <div className="flex items-center gap-2">
                {c.authorPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.authorPhoto} alt="" className="size-6 rounded-full object-cover" />
                ) : (
                  <span className="flex size-6 items-center justify-center rounded-full bg-[var(--story-accent-soft)] text-[10px] font-semibold text-[var(--story-accent)]">
                    {c.authorName.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <p className="text-xs font-semibold text-[var(--story-ink)]">{c.authorName}</p>
                <time className="ml-auto text-[10px] text-[var(--story-muted)]">
                  {new Date(c.createdAt).toLocaleDateString()}
                </time>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--story-ink)]">{c.text}</p>
            </li>
          ))
        )}
      </ul>
    </section>
  )
}
