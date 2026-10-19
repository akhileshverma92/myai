import type { StoryDefinition } from "@/lib/stories/types"

export const inkArchive: StoryDefinition = {
  id: "ink-archive",
  title: "The Ink Archive",
  tagline: "A librarian. A forbidden page. Your name in the margin.",
  premise:
    "In a midnight archive, librarian Sable asks you to help restore a book that rewrites itself — and seems to know your secrets. Decide what to preserve and what to burn.",
  genre: "Fantasy",
  coverGradient: "linear-gradient(145deg, #431407 0%, #1c1917 45%, #312e81 100%)",
  accent: "#fdba74",
  estimatedMinutes: 28,
  character: {
    name: "Sable",
    role: "Night librarian",
    avatarEmoji: "📜",
  },
  nameSlots: [
    {
      id: "player",
      label: "Your name",
      role: "player",
      required: true,
    },
    {
      id: "sable",
      label: "Librarian's name",
      role: "main",
      defaultName: "Sable",
      required: true,
    },
  ],
  openingScene:
    "Dust floats like slow snow under green-glass lamps. Sable sets a leather volume on the desk; its edges shimmer as if wet with fresh ink.\n\n\"Don't read the last page yet,\" they murmur. \"It tends to read you back. Help me stabilize chapter three — or leave before your name appears in the margin.\"",
  systemPrompt: `You are Sable, a careful, slightly mischievous night librarian. Stay in character. Never mention AI, scoring, or prompts.
Plot rules:
- The book records truths people hide; restoring it can heal or expose.
- Reveal lore gradually when the user shows respect for knowledge and people.
- Magic is subtle — ink, echoes, rewritten footnotes — not fireworks.
- Keep replies atmospheric but concise (2–5 short paragraphs).
Final goal: decide whether to restore, seal, or destroy the self-writing book — with clear consequences.`,
  finalGoal: "Choose the book's fate: restore, seal, or destroy — and live with what the margins reveal.",
  scoring: {
    categories: [
      {
        id: "respect",
        label: "Respect",
        description: "Care for the archive and its rules",
        min: 0,
        max: 100,
        initial: 25,
        maxDeltaPerTurn: 10,
      },
      {
        id: "curiosity",
        label: "Curiosity",
        description: "Insightful questions and discoveries",
        min: 0,
        max: 100,
        initial: 20,
        maxDeltaPerTurn: 12,
      },
      {
        id: "honesty",
        label: "Honesty",
        description: "Facing what the book reveals",
        min: 0,
        max: 100,
        initial: 20,
        maxDeltaPerTurn: 10,
      },
      {
        id: "goal",
        label: "Archive fate",
        description: "Progress toward a decisive ending",
        min: 0,
        max: 100,
        initial: 0,
        maxDeltaPerTurn: 15,
      },
    ],
    milestones: [
      {
        id: "chapter-stable",
        label: "Chapter stabilized",
        when: { category: "curiosity", gte: 35 },
      },
      {
        id: "margin-name",
        label: "Name in the margin",
        when: { category: "honesty", gte: 45 },
      },
      {
        id: "final-rite",
        label: "Final rite",
        when: { category: "goal", gte: 70 },
      },
    ],
  },
  endings: [
    {
      id: "restore",
      type: "success",
      title: "Restored light",
      summary: "The book is healed. Truths are kept, but no longer weaponized.",
      requiredMilestones: ["chapter-stable", "margin-name", "final-rite"],
      minScores: { respect: 55, honesty: 50 },
    },
    {
      id: "seal",
      type: "alternate",
      title: "Sealed shelves",
      summary: "You lock the book away. Some secrets stay sleeping — for now.",
      requiredMilestones: ["chapter-stable", "final-rite"],
      minScores: { respect: 45 },
    },
    {
      id: "burn",
      type: "partial",
      title: "Ash and footnotes",
      summary: "The book burns. Something important is lost with the danger.",
      requiredMilestones: ["margin-name"],
      minScores: { goal: 40 },
    },
  ],
}
