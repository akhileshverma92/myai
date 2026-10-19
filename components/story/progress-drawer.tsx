"use client"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { StoryProgressState } from "@/lib/stories/types"

type PublicStory = {
  finalGoal: string
  scoring: {
    categories: Array<{ id: string; label: string; description?: string }>
    milestones: Array<{ id: string; label: string; description?: string }>
  }
  endings: Array<{ id: string; type: string; title: string; summary: string }>
}

export function ProgressDrawer({
  open,
  onOpenChange,
  story,
  progress,
  accent,
  playerName,
  characterNames,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  story: PublicStory
  progress: StoryProgressState
  accent: string
  playerName?: string
  characterNames?: Record<string, string>
}) {
  const ending = progress.endingId
    ? story.endings.find((e) => e.id === progress.endingId)
    : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Story progress</SheetTitle>
          <SheetDescription>
            {playerName ? `Playing as ${playerName}. ${story.finalGoal}` : story.finalGoal}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-5 px-1 pb-6">
          {characterNames && Object.keys(characterNames).length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Cast names</h3>
              <ul className="space-y-1 text-sm">
                {Object.entries(characterNames).map(([id, name]) => (
                  <li key={id} className="flex justify-between gap-2">
                    <span className="text-[var(--aura-muted)] capitalize">{id}</span>
                    <span>{name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-[var(--aura-muted)]">
              <span>Goal progress</span>
              <span style={{ color: accent }}>{progress.goalProgress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--aura-surface-strong)]">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress.goalProgress}%`, background: accent }}
              />
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Relationships</h3>
            <ul className="space-y-2">
              {story.scoring.categories.map((cat) => (
                <li key={cat.id} className="text-sm">
                  <div className="flex justify-between">
                    <span>{cat.label}</span>
                    <span className="tabular-nums" style={{ color: accent }}>
                      {Math.round(progress.totals[cat.id] ?? 0)}
                    </span>
                  </div>
                  {cat.description ? (
                    <p className="text-xs text-[var(--aura-muted)]">{cat.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Milestones</h3>
            <ul className="space-y-2">
              {story.scoring.milestones.map((m) => {
                const unlocked = progress.unlockedMilestones.includes(m.id)
                return (
                  <li
                    key={m.id}
                    className="rounded-lg border border-[var(--aura-border)] px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span aria-hidden>{unlocked ? "✓" : "○"}</span>
                      <span className={unlocked ? "font-medium" : "text-[var(--aura-muted)]"}>
                        {m.label}
                      </span>
                    </div>
                    {m.description ? (
                      <p className="mt-1 pl-5 text-xs text-[var(--aura-muted)]">{m.description}</p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>

          {ending ? (
            <div
              className="rounded-xl border px-3 py-3"
              style={{ borderColor: `${accent}66`, background: `${accent}14` }}
            >
              <p className="text-xs uppercase tracking-wide text-[var(--aura-muted)]">
                Ending · {ending.type}
              </p>
              <p className="mt-1 font-semibold">{ending.title}</p>
              <p className="mt-1 text-sm text-[var(--aura-muted)]">{ending.summary}</p>
            </div>
          ) : null}

          <div>
            <h3 className="mb-2 text-sm font-semibold">Recent score ledger</h3>
            {progress.ledger.length === 0 ? (
              <p className="text-xs text-[var(--aura-muted)]">
                Meaningful choices will appear here. Greetings won&apos;t score.
              </p>
            ) : (
              <ul className="max-h-40 space-y-2 overflow-y-auto text-xs">
                {[...progress.ledger].reverse().slice(0, 12).map((ev) => (
                  <li key={ev.id} className="border-b border-[var(--aura-border)] pb-2">
                    <div className="font-medium">{ev.feedbackLabel || "Score update"}</div>
                    <div className="text-[var(--aura-muted)]">
                      {Object.entries(ev.deltas)
                        .map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}`)
                        .join(" · ") || "—"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
