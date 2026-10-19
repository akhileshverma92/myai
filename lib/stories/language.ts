export type StoryLanguage = "en" | "hi"

export const STORY_LANGUAGES: Array<{
  id: StoryLanguage
  label: string
  nativeLabel: string
  hint: string
}> = [
  {
    id: "en",
    label: "English",
    nativeLabel: "English",
    hint: "Stories and chat in English",
  },
  {
    id: "hi",
    label: "Hindi",
    nativeLabel: "हिन्दी",
    hint: "कहानी और चैट हिंदी में",
  },
]

const LOCAL_KEY = "storylink-preferred-language"

export function isStoryLanguage(value: unknown): value is StoryLanguage {
  return value === "en" || value === "hi"
}

export function loadPreferredLanguage(): StoryLanguage | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return isStoryLanguage(raw) ? raw : null
  } catch {
    return null
  }
}

export function savePreferredLanguage(language: StoryLanguage) {
  if (typeof window === "undefined") return
  localStorage.setItem(LOCAL_KEY, language)
}

export function languageDisplayName(language: StoryLanguage): string {
  return STORY_LANGUAGES.find((l) => l.id === language)?.nativeLabel ?? language
}

/** System-prompt addon so the character replies in the player's language. */
export function buildLanguageSystemAddon(language: StoryLanguage): string {
  if (language === "hi") {
    return `
LANGUAGE (required):
- Write ALL story narration, internal thoughts, and character dialogue in Hindi.
- Prefer natural Devanagari Hindi. Light Hinglish is fine only if the player writes in Latin script.
- Do not switch to full English unless the player explicitly asks to change language.
- Keep the same plot, tone, and character voice — only the language changes.
`.trim()
  }

  return `
LANGUAGE (required):
- Write ALL story narration and character dialogue in English.
- Stay in character; do not mention this language rule.
`.trim()
}

export function openingLocalizePrompt(opening: string, language: StoryLanguage): string {
  if (language === "en") return opening
  return `Rewrite the following story opening in natural Hindi (Devanagari preferred). Keep the same events, tone, names, and intimacy level. Output only the rewritten opening, no preface.

OPENING:
${opening}`
}
