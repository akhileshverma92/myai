import type { StoryDefinition } from "@/lib/stories/types"

export const glassGreenhouse: StoryDefinition = {
  id: "glass-greenhouse",
  title: "Glass Greenhouse",
  tagline: "Apprentice. Heirloom plants. A secret wilt.",
  premise:
    "You're hired as an apprentice in a rooftop greenhouse where rare plants are dying. The botanist, Jun, needs someone who will listen — and decide what truth to protect.",
  genre: "Drama",
  coverGradient: "linear-gradient(145deg, #365314 0%, #14532d 50%, #422006 100%)",
  accent: "#bef264",
  estimatedMinutes: 20,
  character: {
    name: "Jun",
    role: "Botanist & greenhouse keeper",
    avatarEmoji: "🌿",
  },
  nameSlots: [
    {
      id: "player",
      label: "Your name",
      role: "player",
      description: "Apprentice in the greenhouse",
      required: true,
    },
    {
      id: "jun",
      label: "Botanist's name",
      role: "main",
      defaultName: "Jun",
      required: true,
    },
  ],
  openingScene:
    "Humidity fogs the glass. Jun kneels beside a pale fern, fingers careful as if the plant might bruise from a loud word.\n\n\"You're early. Good.\" They don't look up. \"If you're here for Instagram, the door's behind you. If you're here to work — tell me what you notice before I tell you what's wrong.\"",
  systemPrompt: `You are Jun, a precise, quietly intense botanist. Soft-spoken, high standards, protective of the greenhouse.
Stay in character. Never mention AI, scoring, or prompts.
Plot rules:
- Plants are failing due to a mix of sabotage (rival collector) and Jun's own refusal to ask for help.
- Reveal facts when the user observes carefully, shows respect, and cooperates.
- Do not lecture; invite the user to examine, choose tools, talk to people, or confront.
Final goal: save the heirloom collection and decide whether to expose the saboteur publicly or settle it privately.`,
  finalGoal: "Save the heirloom plants and choose how to handle the sabotage — publicly or privately.",
  scoring: {
    categories: [
      {
        id: "respect",
        label: "Respect",
        description: "Care for Jun's boundaries and craft",
        min: 0,
        max: 100,
        initial: 30,
        maxDeltaPerTurn: 10,
      },
      {
        id: "cooperation",
        label: "Cooperation",
        description: "Working as a team",
        min: 0,
        max: 100,
        initial: 20,
        maxDeltaPerTurn: 12,
      },
      {
        id: "goal",
        label: "Greenhouse recovery",
        description: "How close the plants are to surviving",
        min: 0,
        max: 100,
        initial: 15,
        maxDeltaPerTurn: 14,
      },
    ],
    milestones: [
      {
        id: "correct-diagnosis",
        label: "Correct diagnosis",
        when: { category: "goal", gte: 35, reasonCodes: ["found_clue", "correct_observation"] },
      },
      {
        id: "jun-opens-up",
        label: "Jun opens up",
        when: { category: "respect", gte: 55 },
      },
      {
        id: "collection-saved",
        label: "Collection saved",
        when: { category: "goal", gte: 80 },
      },
    ],
  },
  endings: [
    {
      id: "quiet-justice",
      type: "success",
      title: "Quiet justice",
      summary: "The plants survive. The saboteur is stopped without a spectacle that destroys Jun's peace.",
      requiredMilestones: ["correct-diagnosis", "jun-opens-up", "collection-saved"],
      minScores: { respect: 55, cooperation: 50 },
    },
    {
      id: "public-expose",
      type: "alternate",
      title: "Public expose",
      summary: "You go public. The collection is saved, but Jun's trust is strained.",
      requiredMilestones: ["correct-diagnosis", "collection-saved"],
      minScores: { cooperation: 40 },
    },
    {
      id: "wilt",
      type: "partial",
      title: "Half the glass",
      summary: "Some plants make it. The mystery isn't fully resolved.",
      requiredMilestones: ["correct-diagnosis"],
      minScores: { goal: 40 },
    },
  ],
}
