import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isExplicitQuotaMessage,
  normalizeHttpError,
  userFacingErrorMessage,
} from "./errors"

describe("isExplicitQuotaMessage", () => {
  it("accepts clear Cloudflare-style daily quota exhaustion", () => {
    assert.equal(
      isExplicitQuotaMessage("You have exceeded your daily free allocation of neurons"),
      true,
    )
    assert.equal(isExplicitQuotaMessage('{"code":"quota_exceeded","message":"quota exhausted"}'), true)
  })

  it("does not treat the word daily alone as quota", () => {
    assert.equal(isExplicitQuotaMessage("model daily-co/phonellm failed validation"), false)
    assert.equal(isExplicitQuotaMessage("please try again later"), false)
    assert.equal(isExplicitQuotaMessage("rate limit exceeded, retry after 30"), false)
  })
})

describe("normalizeHttpError quota mapping", () => {
  it("maps 429 + explicit quota to quota", () => {
    const err = normalizeHttpError(429, "daily quota exceeded for this account", "cloudflare")
    assert.equal(err.code, "quota")
    assert.equal(err.retryable, false)
  })

  it("maps 429 without quota language to rate_limit", () => {
    const err = normalizeHttpError(429, "Too Many Requests — retry after 12", "cloudflare")
    assert.equal(err.code, "rate_limit")
    assert.equal(err.retryable, true)
  })

  it("does not invent quota from generic 502 bodies mentioning daily logs", () => {
    const err = normalizeHttpError(502, "upstream failed during daily health check", "cloudflare")
    assert.notEqual(err.code, "quota")
  })

  it("surfaces quota user copy only for quota codes", () => {
    const msg = userFacingErrorMessage({
      code: "misconfigured",
      message: "No AI provider credentials are configured on the server.",
      retryable: false,
    })
    assert.match(msg, /credentials|environment/i)
    assert.doesNotMatch(msg, /daily ai quota/i)
  })
})
