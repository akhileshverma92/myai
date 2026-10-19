import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  applyScoreTurn,
  createInitialProgress,
  parseEvaluation,
  sanitizeDeltas,
} from "@/lib/stories/scoring"
import { getStoryById } from "@/lib/stories/catalog"

describe("story scoring", () => {
  const story = getStoryById("harbor-lights")!

  it("parses invalid evaluation as no-op", () => {
    const result = parseEvaluation({ nonsense: true })
    assert.equal(result.meaningful, false)
  })

  it("caps deltas per category", () => {
    const deltas = sanitizeDeltas(story, { trust: 99, affection: -50 }, true)
    const trust = story.scoring.categories.find((c) => c.id === "trust")!
    assert.ok(Math.abs(deltas.trust) <= trust.maxDeltaPerTurn)
  })

  it("deduplicates processed message ids", () => {
    let progress = createInitialProgress(story)
    const first = applyScoreTurn({
      story,
      progress,
      messageId: "m1",
      eventId: "e1",
      evaluation: {
        meaningful: true,
        deltas: { trust: 5 },
        reasonCodes: ["showed_empathy"],
        feedbackLabel: "Warm honesty",
      },
    })
    progress = first.progress
    const second = applyScoreTurn({
      story,
      progress,
      messageId: "m1",
      eventId: "e2",
      evaluation: {
        meaningful: true,
        deltas: { trust: 5 },
        reasonCodes: ["showed_empathy"],
        feedbackLabel: "Warm honesty",
      },
    })
    assert.equal(second.event, null)
    assert.equal(progress.totals.trust, first.progress.totals.trust)
  })

  it("unlocks milestones and endings from validated totals", () => {
    let progress = createInitialProgress(story)
    // Drive trust high enough for first milestone if defined
    const mile = story.scoring.milestones[0]
    if (!mile?.when.category || mile.when.gte == null) return

    while ((progress.totals[mile.when.category] ?? 0) < mile.when.gte) {
      const turn = applyScoreTurn({
        story,
        progress,
        messageId: `msg-${progress.processedMessageIds.length}`,
        eventId: `ev-${progress.processedMessageIds.length}`,
        evaluation: {
          meaningful: true,
          deltas: { [mile.when.category]: 10 },
          reasonCodes: mile.when.reasonCodes ?? ["progress"],
          feedbackLabel: "Progress",
        },
      })
      progress = turn.progress
    }

    assert.ok(progress.unlockedMilestones.includes(mile.id))
  })
})
