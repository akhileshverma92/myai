import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { classifyTask, getTaskProfile } from "./task-classifier"
import { isTransient, normalizeHttpError } from "./errors"

describe("classifyTask", () => {
  it("detects coding prompts", () => {
    assert.equal(classifyTask({ prompt: "Fix this TypeScript bug in my API route" }), "coding")
  })

  it("detects summarization", () => {
    assert.equal(classifyTask({ prompt: "Summarize the key points of this email" }), "summarization")
  })

  it("detects pptx", () => {
    assert.equal(classifyTask({ prompt: "Create a powerpoint deck about climate" }), "pptx")
  })

  it("respects hint", () => {
    assert.equal(classifyTask({ prompt: "hello", hint: "writing" }), "writing")
  })
})

describe("task profiles", () => {
  it("gives coding a lower temperature than writing", () => {
    assert.ok(getTaskProfile("coding").temperature < getTaskProfile("writing").temperature)
  })
})

describe("normalizeHttpError", () => {
  it("marks 401 as non-retryable auth", () => {
    const err = normalizeHttpError(401, "unauthorized", "cloudflare")
    assert.equal(err.code, "auth")
    assert.equal(err.retryable, false)
    assert.equal(isTransient(err.code), false)
  })

  it("marks 429 as rate limit", () => {
    const err = normalizeHttpError(429, "too many requests", "groq")
    assert.equal(err.code, "rate_limit")
    assert.equal(err.retryable, true)
  })

  it("marks explicit quota exhaustion as non-retryable quota", () => {
    const err = normalizeHttpError(429, "daily quota exceeded", "openai")
    assert.equal(err.code, "quota")
    assert.equal(err.retryable, false)
  })

  it("does not mark generic 429 as quota", () => {
    const err = normalizeHttpError(429, "Too Many Requests", "openai")
    assert.equal(err.code, "rate_limit")
    assert.equal(err.retryable, true)
  })
})
