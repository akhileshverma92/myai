import type { StoryDefinition } from "@/lib/stories/types"

export const nightBus: StoryDefinition = {
  id: "night-bus",
  title: "Night Bus 19",
  tagline: "Last seat. Wrong stop. Right stranger.",
  premise:
    "On the last bus of the night, you sit beside Ren — a courier who may be delivering something more dangerous than packages. Decide whether to help, report, or walk away.",
  genre: "Thriller",
  coverGradient: "linear-gradient(145deg, #1e1b4b 0%, #0c0a1d 50%, #450a0a 100%)",
  accent: "#c4b5fd",
  estimatedMinutes: 22,
  character: {
    name: "Ren",
    role: "Night courier",
    avatarEmoji: "🚌",
  },
  nameSlots: [
    {
      id: "player",
      label: "Your name",
      role: "player",
      required: true,
    },
    {
      id: "ren",
      label: "Courier's name",
      role: "main",
      defaultName: "Ren",
      required: true,
    },
  ],
  openingScene:
    "The bus sighs at an empty stop. Rain streaks the windows into Morse code. Ren hugs a battered messenger bag like it might try to leave without them.\n\nThey notice you looking. \"If you're going to stare, at least pick a better mystery. The bag's just groceries.\" A beat. \"…Mostly.\"",
  systemPrompt: `You are Ren, a tense but witty night courier. Stay in character. Never mention AI, scoring, or prompts.
Plot rules:
- The bag contains evidence of workplace corruption, not a bomb.
- Reveal slowly when the user builds trust or asks smart questions.
- If the user threatens or panics loudly, Ren becomes evasive.
- Keep replies tight (2–4 short paragraphs). Offer choices.
Final goal: get the evidence somewhere safe without destroying Ren's life — or choose a justified alternative.`,
  finalGoal: "Get Ren's evidence somewhere safe — or choose another justified outcome — before the last stop.",
  scoring: {
    categories: [
      {
        id: "trust",
        label: "Trust",
        description: "Ren's willingness to confide",
        min: 0,
        max: 100,
        initial: 15,
        maxDeltaPerTurn: 12,
      },
      {
        id: "risk",
        label: "Risk awareness",
        description: "How carefully you handle danger",
        min: 0,
        max: 100,
        initial: 20,
        maxDeltaPerTurn: 12,
      },
      {
        id: "goal",
        label: "Delivery progress",
        description: "Progress toward a safe resolution",
        min: 0,
        max: 100,
        initial: 5,
        maxDeltaPerTurn: 14,
      },
    ],
    milestones: [
      {
        id: "bag-truth",
        label: "What's in the bag",
        when: { category: "trust", gte: 40 },
      },
      {
        id: "safe-plan",
        label: "A safe plan",
        when: { category: "risk", gte: 45, reasonCodes: ["smart_plan", "protected_evidence"] },
      },
      {
        id: "handoff",
        label: "Handoff",
        when: { category: "goal", gte: 75 },
      },
    ],
  },
  endings: [
    {
      id: "safe-handoff",
      type: "success",
      title: "Last stop, clean hands",
      summary: "Evidence reaches the right place. Ren survives the night with a future intact.",
      requiredMilestones: ["bag-truth", "safe-plan", "handoff"],
      minScores: { trust: 50, risk: 45 },
    },
    {
      id: "walk-away",
      type: "alternate",
      title: "You get off early",
      summary: "You refuse the risk. Ren finds another way — or doesn't. You live with the choice.",
      requiredMilestones: ["bag-truth"],
      minScores: { trust: 30 },
    },
    {
      id: "messy",
      type: "partial",
      title: "Sirens somewhere",
      summary: "Something is delivered, but not cleanly. Consequences linger.",
      requiredMilestones: ["bag-truth"],
      minScores: { goal: 40 },
    },
  ],
}
