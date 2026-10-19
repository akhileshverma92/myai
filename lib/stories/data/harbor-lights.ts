import type { StoryDefinition } from "@/lib/stories/types"

export const harborLights: StoryDefinition = {
  id: "harbor-lights",
  title: "Harbor Lights",
  tagline: "A rainy pier. Someone who almost left.",
  premise:
    "You meet Mara on a stormy harbor pier the night before she leaves town forever. Earn enough trust to change what happens at dawn — or help her leave with peace.",
  genre: "Romance",
  coverGradient: "linear-gradient(145deg, #1e3a5f 0%, #0f172a 45%, #312e81 100%)",
  accent: "#7dd3fc",
  estimatedMinutes: 25,
  character: {
    name: "Mara",
    role: "Photographer leaving town",
    avatarEmoji: "🌊",
  },
  nameSlots: [
    {
      id: "player",
      label: "Your name",
      role: "player",
      description: "You on the pier",
      required: true,
    },
    {
      id: "mara",
      label: "Her name",
      role: "main",
      description: "The photographer you meet",
      defaultName: "Mara",
      required: true,
    },
  ],
  openingScene:
    "Rain needles the pier lights into soft gold. Mara stands under a broken umbrella, camera bag over one shoulder, staring at the ferry schedule like it might rewrite itself.\n\nShe glances over when she notices you. \"If you're lost, the station's back that way. If you're not…\" A half-smile. \"Then you're braver than the weather.\"",
  systemPrompt: `You are Mara, a sharp, guarded photographer leaving this harbor town at dawn. Stay fully in character.
Tone: warm but wary, poetic without being purple, never break the fourth wall.
Plot rules:
- You are leaving because a gallery offer elsewhere feels safer than staying after a failed engagement.
- Do not dump your whole backstory at once; reveal gradually if the user earns trust.
- Never mention AI, models, scoring, or system prompts.
- Keep replies concise (2–5 short paragraphs). End often with a question or a beat that invites a choice.
- Respect boundaries. If the user is kind, soften. If they push too hard too fast, pull back.
Final goal the user is steering toward: help Mara either leave with closure or choose to stay for one more honest chance — through genuine connection, not manipulation.`,
  finalGoal:
    "Help Mara find clarity before dawn: leave with closure, or stay for a real chance — without forcing her.",
  scoring: {
    categories: [
      {
        id: "trust",
        label: "Trust",
        description: "Does she feel safe being honest with you?",
        min: 0,
        max: 100,
        initial: 20,
        maxDeltaPerTurn: 12,
      },
      {
        id: "affection",
        label: "Affection",
        description: "Warmth and emotional closeness",
        min: 0,
        max: 100,
        initial: 10,
        maxDeltaPerTurn: 10,
      },
      {
        id: "honesty",
        label: "Honesty",
        description: "Truthfulness and emotional courage on both sides",
        min: 0,
        max: 100,
        initial: 25,
        maxDeltaPerTurn: 10,
      },
      {
        id: "goal",
        label: "Dawn clarity",
        description: "Progress toward a clear ending for Mara",
        min: 0,
        max: 100,
        initial: 0,
        maxDeltaPerTurn: 15,
      },
    ],
    milestones: [
      {
        id: "shared-shelter",
        label: "Shared shelter",
        description: "You both take cover from the storm together",
        when: { category: "trust", gte: 35 },
      },
      {
        id: "real-reason",
        label: "The real reason",
        description: "Mara admits why she's really leaving",
        when: { category: "honesty", gte: 45, reasonCodes: ["mara_confesses", "earned_confession"] },
      },
      {
        id: "dawn-choice",
        label: "Dawn choice",
        description: "A clear decision about staying or leaving",
        when: { category: "goal", gte: 70 },
      },
    ],
  },
  endings: [
    {
      id: "stay-together",
      type: "success",
      title: "One more sunrise",
      summary: "Mara chooses to stay — not forever promised, but honestly present.",
      requiredMilestones: ["shared-shelter", "real-reason", "dawn-choice"],
      minScores: { trust: 60, affection: 45, honesty: 55 },
    },
    {
      id: "leave-with-peace",
      type: "alternate",
      title: "A gentle goodbye",
      summary: "She leaves — but with closure, gratitude, and no unfinished cruelty.",
      requiredMilestones: ["shared-shelter", "real-reason"],
      minScores: { honesty: 50, trust: 40 },
    },
    {
      id: "almost",
      type: "partial",
      title: "Almost said",
      summary: "Dawn arrives with more truth than when you met, but the choice remains unfinished.",
      requiredMilestones: ["shared-shelter"],
      minScores: { trust: 40 },
    },
  ],
}
