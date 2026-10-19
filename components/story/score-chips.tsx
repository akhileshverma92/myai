"use client"

import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

type Category = { id: string; label: string }

export function ScoreChips({
  categories,
  totals,
  accent,
  compact,
}: {
  categories: Category[]
  totals: Record<string, number>
  accent: string
  compact?: boolean
}) {
  const shown = compact ? categories.slice(0, 3) : categories
  return (
    <div className={cn("flex flex-wrap gap-1.5", compact && "gap-1")}>
      {shown.map((cat) => {
        const value = totals[cat.id] ?? 0
        return (
          <div
            key={cat.id}
            className="story-chip rounded-full px-2.5 py-1 text-[11px] font-medium tabular-nums"
          >
            <span className="text-[var(--story-muted)]">{cat.label}</span>{" "}
            <span style={{ color: accent || "var(--story-accent)" }}>{Math.round(value)}</span>
          </div>
        )
      })}
    </div>
  )
}

export function ScoreToast({
  label,
  deltas,
  categoryLabels,
}: {
  label?: string | null
  deltas?: Record<string, number> | null
  categoryLabels: Record<string, string>
}) {
  if (!label && (!deltas || !Object.keys(deltas).length)) return null
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="pointer-events-none absolute left-1/2 top-[4.5rem] z-20 max-w-[min(92vw,22rem)] -translate-x-1/2 rounded-full border border-[var(--story-line)] bg-white px-3.5 py-1.5 text-xs shadow-lg"
        role="status"
        aria-live="polite"
      >
        {label ? <span className="font-semibold text-[var(--story-ink)]">{label}</span> : null}
        {deltas && Object.keys(deltas).length > 0 ? (
          <span className="ml-2 text-[var(--story-muted)]">
            {Object.entries(deltas)
              .map(([id, d]) => `${categoryLabels[id] ?? id} ${d > 0 ? "+" : ""}${d}`)
              .join(" · ")}
          </span>
        ) : null}
      </motion.div>
    </AnimatePresence>
  )
}
