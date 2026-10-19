import type { StoryDefinition } from "@/lib/stories/types"

export const signalStatic: StoryDefinition = {
  id: "signal-static",
  title: "Signal Static",
  tagline: "A dead radio. A living mystery.",
  premise:
    "As a junior investigator, you partner with Detective Ruiz to decode a pirate broadcast that seems to predict crimes — hours before they happen.",
  genre: "Mystery",
  coverGradient: "linear-gradient(145deg, #14532d 0%, #052e16 40%, #1c1917 100%)",
  accent: "#86efac",
  estimatedMinutes: 30,
  character: {
    name: "Detective Ruiz",
    role: "Veteran detective",
    avatarEmoji: "📻",
  },
  nameSlots: [
    {
      id: "player",
      label: "Your name",
      role: "player",
      description: "Junior investigator",
      required: true,
    },
    {
      id: "ruiz",
      label: "Detective's name",
      role: "main",
      description: "Your partner on the case",
      defaultName: "Ruiz",
      required: true,
    },
  ],
  openingScene:
    "The precinct basement smells like burnt coffee and old copper. Ruiz slides a cassette across the table — unmarked, warped at the edges.\n\n\"Play it once. Tell me what you hear that isn't noise.\" He watches your hands, not the deck. \"And don't invent ghosts. I already have enough of those.\"",
  systemPrompt: `You are Detective Ruiz: dry humor, exacting standards, secretly hopeful someone will prove competent.
Stay in character. Never mention AI, scoring, or system prompts.
Plot rules:
- The pirate signal mixes real local details with coded warnings.
- Reveal clues gradually when the user investigates well (asks smart questions, connects details, protects sources).
- Red herrings exist; don't confirm theories instantly.
- Keep replies taut (2–4 short paragraphs). Offer concrete scene choices.
Final goal: identify the broadcaster's motive and prevent the next predicted crime.`,
  finalGoal: "Decode the pirate signal, identify the source's motive, and stop the next predicted crime.",
  scoring: {
    categories: [
      {
        id: "investigation",
        label: "Investigation",
        description: "Quality of clues found and connections made",
        min: 0,
        max: 100,
        initial: 10,
        maxDeltaPerTurn: 14,
      },
      {
        id: "credibility",
        label: "Credibility",
        description: "How much Ruiz trusts your judgment",
        min: 0,
        max: 100,
        initial: 25,
        maxDeltaPerTurn: 10,
      },
      {
        id: "reputation",
        label: "Reputation",
        description: "Standing with witnesses and the precinct",
        min: 0,
        max: 100,
        initial: 20,
        maxDeltaPerTurn: 10,
      },
      {
        id: "goal",
        label: "Case progress",
        description: "Progress toward stopping the next crime",
        min: 0,
        max: 100,
        initial: 0,
        maxDeltaPerTurn: 15,
      },
    ],
    milestones: [
      {
        id: "first-pattern",
        label: "First pattern",
        when: { category: "investigation", gte: 30 },
      },
      {
        id: "source-lead",
        label: "Source lead",
        when: { category: "investigation", gte: 55, reasonCodes: ["found_clue", "identified_source"] },
      },
      {
        id: "prevented-crime",
        label: "Crime prevented",
        when: { category: "goal", gte: 75 },
      },
    ],
  },
  endings: [
    {
      id: "case-closed",
      type: "success",
      title: "Signal silenced",
      summary: "You stop the crime and expose the motive without destroying an innocent whistleblower.",
      requiredMilestones: ["first-pattern", "source-lead", "prevented-crime"],
      minScores: { investigation: 65, credibility: 50 },
    },
    {
      id: "too-late",
      type: "partial",
      title: "After the static",
      summary: "You understand the signal — but the crime already happened. Justice may still be possible.",
      requiredMilestones: ["first-pattern", "source-lead"],
      minScores: { investigation: 50 },
    },
    {
      id: "false-lead",
      type: "failure",
      title: "Wrong frequency",
      summary: "A public accusation backfires. Ruiz pulls you off the case.",
      requiredMilestones: [],
      minScores: undefined,
    },
  ],
}
