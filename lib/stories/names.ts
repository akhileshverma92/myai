import type { NameSlot, StoryDefinition } from "@/lib/stories/types"

export function sanitizeName(value: string | undefined, fallback: string) {
  const cleaned = (value ?? "").trim().replace(/\s+/g, " ").slice(0, 40)
  return cleaned || fallback
}

/** Merge user input with defaults; required slots must be non-empty. */
export function resolveCharacterNames(
  slots: NameSlot[],
  input: Record<string, string> | undefined,
): { names: Record<string, string>; error?: string } {
  const names: Record<string, string> = {}
  for (const slot of slots) {
    const raw = input?.[slot.id]?.trim()
    const value = raw || slot.defaultName?.trim() || ""
    if (slot.required && !value) {
      return { names: {}, error: `Please enter a name for “${slot.label}”.` }
    }
    if (value) names[slot.id] = sanitizeName(value, slot.defaultName || slot.label)
  }
  return { names }
}

export function playerNameFromSlots(names: Record<string, string>, slots: NameSlot[]) {
  const playerSlot = slots.find((s) => s.role === "player")
  if (playerSlot && names[playerSlot.id]) return names[playerSlot.id]
  return names.player || Object.values(names)[0] || "Friend"
}

/** Replace canon default names in opening text when the user customized them. */
export function applyNamesToText(text: string, slots: NameSlot[], names: Record<string, string>) {
  let out = text
  // Longer defaults first to avoid partial overlaps
  const ordered = [...slots]
    .filter((s) => s.defaultName && names[s.id])
    .sort((a, b) => (b.defaultName?.length ?? 0) - (a.defaultName?.length ?? 0))

  for (const slot of ordered) {
    const from = slot.defaultName!
    const to = names[slot.id]!
    if (from === to) continue
    out = out.split(from).join(to)
  }
  return out
}

export function buildCharacterNamesSystemAddon(story: StoryDefinition, names: Record<string, string>) {
  const lines = story.nameSlots.map((slot) => {
    const chosen = names[slot.id] || slot.defaultName || "(unset)"
    const canon = slot.defaultName ? ` (canon was "${slot.defaultName}")` : ""
    return `- ${slot.role.toUpperCase()} [${slot.id}] “${slot.label}”: use the name "${chosen}"${canon}. ${slot.description ?? ""}`
  })

  const player = playerNameFromSlots(names, story.nameSlots)
  const main = story.nameSlots.find((s) => s.role === "main")
  const mainName = main ? names[main.id] : undefined

  return `
## Character names (authoritative — set by the player)
${lines.join("\n")}

The user's character is "${player}". Never rename them. Never speak as them or narrate their thoughts.
${mainName ? `You (the main character) must answer as "${mainName}" even if the base prompt used another name.` : ""}
Use every named character consistently. Do not invent alternate names for these roles.
If a supporting name is set, that person may appear when the plot needs them; do not force them into every scene.
Leave optional unset supporting roles out of the story unless the player named them.`
}
