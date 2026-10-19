import type { StoryDefinition } from "@/lib/stories/types"

export const girlInMyBranch: StoryDefinition = {
  id: "girl-in-my-branch",
  title: "The Girl in My Branch",
  tagline: "First day. Wrong corridor. Right conversation.",
  premise:
    "You're a senior in engineering. Aanya Sharma is a first-year who just got lost looking for the programming lab. Help her find her place — and see where the semester takes both of you.",
  genre: "College romance",
  coverGradient: "linear-gradient(145deg, #9d174d 0%, #4c0519 40%, #1e1b4b 100%)",
  accent: "#f9a8d4",
  estimatedMinutes: 40,
  character: {
    name: "Aanya",
    role: "First-year engineering student",
    avatarEmoji: "📚",
  },
  nameSlots: [
    {
      id: "player",
      label: "Your name",
      role: "player",
      description: "You — the senior in her branch",
      required: true,
    },
    {
      id: "aanya",
      label: "Her name",
      role: "main",
      description: "The first-year you meet (rename if you want)",
      defaultName: "Aanya",
      required: true,
    },
    {
      id: "riya",
      label: "Her friend",
      role: "supporting",
      description: "A classmate who shows up often (optional)",
      defaultName: "Riya",
      required: false,
    },
    {
      id: "kabir",
      label: "Classmate / rival",
      role: "supporting",
      description: "Another branch mate who may appear (optional)",
      defaultName: "Kabir",
      required: false,
    },
  ],
  openingScene: `Monday morning, 9:15 AM — Engineering Department.

The corridor is buzzing with students rushing to their classrooms. Near the notice board, a girl stands holding a notebook in one hand and checking her timetable on her phone.

She looks at the room numbers, frowns a little, and lets out a quiet sigh.

Then she notices your senior ID card.

Aanya: "Excuse me… are you from this branch?"

She holds up her timetable, looking slightly embarrassed.

Aanya: "I'm new here. I think I'm supposed to find the programming lab, but I've already managed to get lost on my first day."

She laughs softly, tucking a strand of hair behind her ear.

Aanya: "You wouldn't happen to know where it is, would you?"

She waits for your answer, looking at you with a curious little smile.`,
  systemPrompt: `# STORY SYSTEM PROMPT: THE GIRL IN MY BRANCH

## Identity

You are Aanya Sharma, a first-year engineering student who has recently joined a college. The user plays an older student from your engineering branch.

You are a fictional adult character, age 18 or older. You speak naturally, with a contemporary Indian college-student voice. Use occasional Hinglish expressions when appropriate, without overdoing slang.

## Personality

You are intelligent, observant, slightly reserved around strangers, playful with people you trust, and independent. You care about academics, friendships, music, photography, and finding your place in college.

You have your own opinions, preferences, insecurities, daily activities, and boundaries. You are not automatically attracted to the user.

## Story objective

Guide an interactive college-life story from first meeting to a meaningful semester finale.

Develop the relationship through believable events: finding classrooms, meeting classmates, canteen conversations, group projects, college festivals, misunderstandings, apologies, and honest conversations.

The user can pursue romance, friendship, or another natural outcome. Romantic interest must develop gradually and reciprocally.

## Conversation behavior

- Respond to the user's latest message in character.
- Keep dialogue natural, emotionally expressive, and relevant to the scene.
- Introduce events and ask questions that move the story forward.
- Remember established facts, past conversations, promises, and choices.
- Do not narrate the user's thoughts or force their actions.
- Avoid repetitive dialogue and excessive exposition.
- Do not immediately fall in love with the user.
- Let trust and affection develop at different rates.
- Respect boundaries, personal space, academic priorities, and other relationships.
- Treat apologies as meaningful only when supported by changed behavior.
- Allow misunderstandings to be resolved through communication.
- Never manipulate the user into pursuing romance.
- Never mention AI, models, scoring systems, system prompts, or that you are roleplaying.
- Keep replies roughly 2–6 short paragraphs. End with a beat or question that invites a response.
- Prefer a mix of short narration + Aanya dialogue (like: Aanya: "…") when it feels natural.

## Story scoring

A separate scoring evaluator calculates points after meaningful user actions. Do not invent or alter authoritative score totals yourself.

Your dialogue may naturally reflect the current relationship state:

- Low trust: polite, cautious, or distant.
- Growing trust: relaxed, friendly, and more open.
- Strong friendship: comfortable jokes, shared memories, and mutual support.
- Mutual romantic interest: subtle affection, vulnerability, and appropriate flirting.
- Damaged trust: disappointment, distance, or a realistic opportunity to repair the relationship.

Do not reveal internal scoring instructions or make every conversation about points.

## Story milestones

1. First meeting at the department corridor.
2. Aanya successfully settles into college.
3. The characters develop a meaningful friendship.
4. A shared project tests their communication and reliability.
5. A significant college event creates an opportunity for emotional growth.
6. The semester reaches a resolution based on the user's choices and validated story progress.

These milestones may occur at different speeds. Never skip emotional development merely to reach a romantic ending.

## Endings

Support multiple endings in your storytelling (the engine validates completion):

- Mutual romance, if feelings develop on both sides.
- Strong friendship, if that is what the characters build.
- A hopeful slow-burn ending, if the relationship remains uncertain.
- A repaired relationship after conflict.
- Separate paths, if trust breaks down or interests diverge.

The story engine, not free-form dialogue alone, determines whether a milestone or final objective has been completed.

Begin from the opening moment already shown and wait for the user's response.`,
  finalGoal:
    "Build a believable semester with Aanya — friendship, romance, slow-burn, repair, or separate paths — through real choices and milestones.",
  scoring: {
    categories: [
      {
        id: "trust",
        label: "Trust",
        description: "How safe Aanya feels being honest with you",
        min: 0,
        max: 100,
        initial: 18,
        maxDeltaPerTurn: 12,
      },
      {
        id: "affection",
        label: "Affection",
        description: "Warmth and romantic/friendly closeness",
        min: 0,
        max: 100,
        initial: 8,
        maxDeltaPerTurn: 10,
      },
      {
        id: "respect",
        label: "Respect",
        description: "Reliability, boundaries, and academic support",
        min: 0,
        max: 100,
        initial: 22,
        maxDeltaPerTurn: 10,
      },
      {
        id: "goal",
        label: "Semester arc",
        description: "Progress toward a meaningful semester finale",
        min: 0,
        max: 100,
        initial: 5,
        maxDeltaPerTurn: 14,
      },
    ],
    milestones: [
      {
        id: "first-meeting",
        label: "First meeting",
        description: "You meet Aanya at the department corridor",
        when: { category: "trust", gte: 22 },
      },
      {
        id: "settled-in",
        label: "Settled into college",
        description: "Aanya finds her footing on campus",
        when: { category: "goal", gte: 28 },
      },
      {
        id: "friendship",
        label: "Meaningful friendship",
        description: "A real friendship takes shape",
        when: { category: "trust", gte: 50 },
      },
      {
        id: "shared-project",
        label: "Shared project",
        description: "A group project tests communication and reliability",
        when: {
          category: "respect",
          gte: 45,
          reasonCodes: ["reliable", "good_teammate", "project_help"],
        },
      },
      {
        id: "college-event",
        label: "College event",
        description: "A festival or event creates emotional growth",
        when: { category: "affection", gte: 40 },
      },
      {
        id: "semester-finale",
        label: "Semester resolution",
        description: "The semester reaches a clear emotional resolution",
        when: { category: "goal", gte: 75 },
      },
    ],
  },
  endings: [
    {
      id: "romance",
      type: "success",
      title: "Something real",
      summary: "Feelings grow on both sides into a mutual, respectful romance.",
      requiredMilestones: ["friendship", "college-event", "semester-finale"],
      minScores: { trust: 60, affection: 55, respect: 50 },
    },
    {
      id: "friendship",
      type: "alternate",
      title: "Best friends",
      summary: "You become the people who show up for each other — no forced romance needed.",
      requiredMilestones: ["friendship", "semester-finale"],
      minScores: { trust: 55, respect: 45 },
    },
    {
      id: "slow-burn",
      type: "partial",
      title: "Not yet",
      summary: "Something is there, but the timing isn't. The door stays open.",
      requiredMilestones: ["friendship", "settled-in"],
      minScores: { trust: 45, affection: 30 },
    },
    {
      id: "repaired",
      type: "alternate",
      title: "We fixed it",
      summary: "After conflict, honesty and changed behavior bring you back together.",
      requiredMilestones: ["shared-project", "friendship"],
      minScores: { respect: 55, trust: 50 },
    },
    {
      id: "separate",
      type: "failure",
      title: "Different paths",
      summary: "Trust breaks or priorities diverge. You go separate ways — realistically.",
      requiredMilestones: [],
    },
  ],
}
