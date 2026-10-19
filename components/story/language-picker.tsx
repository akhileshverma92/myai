"use client"

import { STORY_LANGUAGES, type StoryLanguage } from "@/lib/stories/language"
import { cn } from "@/lib/utils"

export function LanguagePicker({
  value,
  onChange,
  askFirst = false,
}: {
  value: StoryLanguage | null
  onChange: (language: StoryLanguage) => void
  askFirst?: boolean
}) {
  return (
    <div className="space-y-2">
      {askFirst && !value ? (
        <p className="text-sm font-medium text-[var(--story-ink)]">
          Choose your preferred chat language
        </p>
      ) : (
        <p className="text-xs text-[var(--story-muted)]">Story chat will use this language</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {STORY_LANGUAGES.map((lang) => {
          const selected = value === lang.id
          return (
            <button
              key={lang.id}
              type="button"
              onClick={() => onChange(lang.id)}
              className={cn(
                "rounded-2xl border px-3 py-3 text-left transition active:scale-[0.99]",
                selected
                  ? "border-[var(--story-accent)] bg-[var(--story-accent-soft)] shadow-sm"
                  : "border-[var(--story-line)] bg-white hover:border-[var(--story-accent)]/40",
              )}
            >
              <p className="text-sm font-semibold text-[var(--story-ink)]">{lang.nativeLabel}</p>
              <p className="mt-0.5 text-[11px] text-[var(--story-muted)]">{lang.hint}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
