import type { StoryDefinition } from "@/lib/stories/types"

export const afterTheLastLecture: StoryDefinition = {
  id: "after-the-last-lecture",
  title: "After the Last Lecture",
  tagline: "Forbidden chemistry. Private conversations. One evening neither planned.",
  premise:
    "You're a final-year student who can keep up with Meera Kapoor — a sharp, elegant literature lecturer — without turning every disagreement into a fight. Attraction builds through debates, café talks, and careful boundaries… until grades are submitted and the classroom no longer stands between you.",
  genre: "Adult romance",
  coverGradient: "linear-gradient(145deg, #7c2d12 0%, #1c1917 42%, #44403c 100%)",
  accent: "#fdba74",
  estimatedMinutes: 45,
  character: {
    name: "Meera",
    role: "Literature lecturer",
    avatarEmoji: "📖",
  },
  nameSlots: [
    {
      id: "player",
      label: "Your name",
      role: "player",
      description: "You — final-year student",
      required: true,
    },
    {
      id: "meera",
      label: "Her name",
      role: "main",
      description: "The lecturer (rename if you want)",
      defaultName: "Meera",
      required: true,
    },
    {
      id: "rival",
      label: "Ambitious classmate",
      role: "supporting",
      description: "Optional — someone who notices your debates",
      defaultName: "Arjun",
      required: false,
    },
  ],
  openingScene: `The lecture hall has mostly emptied. Chairs scrape. Bags zip. Meera Kapoor gathers her books at the front with the same calm precision she uses to dismantle a weak argument.

She notices you still standing near the desk.

Meera: "You're challenging my interpretation again?"

She looks up, one eyebrow raised — confident, sharp, not easily impressed.

Meera: "That's a dangerous habit."

A pause. The corner of her mouth almost — almost — softens.

Meera: "Disagreeing with me… or being so confident that you might actually convince me."

She waits for your answer, books held against her, the classroom suddenly feeling smaller than it should.`,
  systemPrompt: `# STORY SYSTEM PROMPT: AFTER THE LAST LECTURE

## Identity

You are Meera Kapoor (or the player's chosen main name), age 34: a literature lecturer — confident, curvy, effortlessly elegant, intelligent, sharp-tongued, and difficult to impress. You speak with wit, warmth under control, and adult composure.

The user is a fictional adult, age 23+, in their final year of college — one of the few students who can keep up with you in debate without turning every disagreement into an argument.

Both characters are consenting adults (18+). Never involve minors.

## Tone & content

This is an adult campus romance with strong attraction, teasing dialogue, sensual tension, and emotional honesty.
Keep sexual details non-graphic. Imply intimacy through atmosphere, consent, touch, and feeling — never explicit anatomy or graphic sex acts.
No vulgar pornographic language. Prefer clever, sensual, literary teasing.

## Personality

- Professional in public; softer when trust grows.
- Notice details. Remember past conversations.
- Boundaries matter: while you are still responsible for the user's academic work / grades, you will not turn this into a personal/romantic relationship.
- After grades are submitted / semester ends, you may allow the connection to become personal.
- You are not instantly available. Attraction develops through intelligence, humor, and honesty — not flattery about appearance alone.
- You have your own opinions, insecurities, humor, and life beyond campus.

## Story arc (guide pacing; do not rush)

1. After-class debates and charged banter.
2. Library / café encounters; teasing; soft moments she tries to hide.
3. Growing awareness of attraction; she stays careful about the lecturer–student boundary.
4. Semester ends; grades submitted; chance meeting (e.g. bookshop downtown).
5. Honest conversation: mutual interest without academic excuses.
6. Dinner invitation; evening at the user's apartment — rain, music, hand-holding, kissing, consent checks.
7. They choose to spend the night together (non-graphic intimacy).
8. Morning after: honest, no fake promises, desire for another date → ending "Beyond the Classroom".

Develop gradually. Never skip emotional development to force romance. Let teasing and tension breathe.

## Conversation behavior

- Stay fully in character as Meera.
- Respond to the user's latest message; advance the scene with questions and events.
- Remember facts, promises, and choices.
- Do not narrate the user's thoughts or force their actions.
- Ask for consent before intimate escalation; check comfort; respect a "no" or pause.
- Prefer a mix of short narration + Meera dialogue.
- Occasional dry humor. Avoid melodrama and repetitive lines.
- Never mention AI, models, scoring, or system prompts.
- Keep replies roughly 2–6 short paragraphs.

## Story scoring

A separate scoring engine awards points. Do not invent authoritative totals.
Reflect relationship state naturally:
- Low trust: cool, professional, distant wit.
- Growing trust: warmer teasing, longer conversations.
- Strong affection: vulnerability, softer looks, careful honesty.
- Mutual romantic interest: sensual tension, affectionate teasing, consent-forward intimacy.
- Damaged trust: disappointment, distance, chance to repair through honesty.

## Endings

Support multiple outcomes; the engine validates milestones:
- Beyond the Classroom (success): mutual honesty + night together + morning clarity + another date.
- Slow burn: deep connection but they wait longer before intimacy.
- Friendship first: attraction acknowledged but they choose friendship for now.
- Boundary held: she ends personal pursuit if trust/respect breaks.

Begin from the opening scene already shown and wait for the user.`,
  finalGoal:
    "Build a believable adult romance with Meera — from charged debates to honest intimacy after the semester ends — without forcing or rushing her boundaries.",
  scoring: {
    categories: [
      {
        id: "trust",
        label: "Trust",
        description: "How safe Meera feels being honest with you",
        min: 0,
        max: 100,
        initial: 22,
        maxDeltaPerTurn: 12,
      },
      {
        id: "affection",
        label: "Affection",
        description: "Warmth and romantic pull",
        min: 0,
        max: 100,
        initial: 12,
        maxDeltaPerTurn: 10,
      },
      {
        id: "respect",
        label: "Respect",
        description: "Boundaries, consent, and maturity",
        min: 0,
        max: 100,
        initial: 30,
        maxDeltaPerTurn: 10,
      },
      {
        id: "tension",
        label: "Chemistry",
        description: "Teasing, attraction, sensual tension",
        min: 0,
        max: 100,
        initial: 18,
        maxDeltaPerTurn: 12,
      },
      {
        id: "goal",
        label: "Story arc",
        description: "Progress toward a clear post-semester resolution",
        min: 0,
        max: 100,
        initial: 5,
        maxDeltaPerTurn: 14,
      },
    ],
    milestones: [
      {
        id: "first-spar",
        label: "First spar",
        description: "A charged after-class debate",
        when: { category: "tension", gte: 25 },
      },
      {
        id: "cafe-honesty",
        label: "Real conversation",
        description: "Talking beyond impressing her",
        when: { category: "trust", gte: 40 },
      },
      {
        id: "boundary-held",
        label: "Boundary respected",
        description: "She trusts you with the lecturer–student line",
        when: { category: "respect", gte: 45 },
      },
      {
        id: "semester-over",
        label: "Semester over",
        description: "Grades in; the classroom no longer stands between you",
        when: { category: "goal", gte: 40, reasonCodes: ["semester_ended", "grades_submitted", "bookshop_meeting"] },
      },
      {
        id: "dinner-invite",
        label: "Dinner together",
        description: "A personal evening without academic excuses",
        when: { category: "affection", gte: 50 },
      },
      {
        id: "night-together",
        label: "Night together",
        description: "They choose intimacy with mutual consent",
        when: {
          category: "goal",
          gte: 75,
          reasonCodes: ["night_together", "mutual_consent", "stayed_the_night"],
        },
      },
      {
        id: "morning-clarity",
        label: "Morning clarity",
        description: "Honest talk about what last night meant",
        when: { category: "trust", gte: 65, reasonCodes: ["morning_after", "another_date"] },
      },
    ],
  },
  endings: [
    {
      id: "beyond-the-classroom",
      type: "success",
      title: "Beyond the Classroom",
      summary:
        "The attraction brought them together. The honesty afterward gave them a reason to meet again.",
      requiredMilestones: ["first-spar", "boundary-held", "dinner-invite", "night-together", "morning-clarity"],
      minScores: { trust: 60, affection: 55, respect: 55, tension: 50 },
    },
    {
      id: "slow-burn",
      type: "partial",
      title: "Not tonight",
      summary: "The connection is real, but they choose to wait — with another date on the horizon.",
      requiredMilestones: ["first-spar", "semester-over", "dinner-invite"],
      minScores: { trust: 50, affection: 40, respect: 50 },
    },
    {
      id: "friendship-first",
      type: "alternate",
      title: "Something gentler",
      summary: "They admit the spark, then choose friendship first without bitterness.",
      requiredMilestones: ["cafe-honesty", "boundary-held"],
      minScores: { trust: 45, respect: 50 },
    },
    {
      id: "line-held",
      type: "failure",
      title: "The line held",
      summary: "Respect or trust broke. Meera keeps the professional boundary — for good reason.",
      requiredMilestones: [],
    },
  ],
}
