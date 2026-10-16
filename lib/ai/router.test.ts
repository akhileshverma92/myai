import assert from "node:assert/strict"
import { afterEach, describe, it } from "node:test"
import { ProviderError } from "./errors"
import { clearHealthForTests } from "./health"
import { resetRegistryForTests } from "./registry"
import { generateWithRouting, pickModelForProvider } from "./router"

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key]
  }
  Object.assign(process.env, ORIGINAL_ENV)
  resetRegistryForTests()
  clearHealthForTests()
})

describe("pickModelForProvider", () => {
  it("honors preferred @cf model ids even when not in the static catalog", () => {
    const modelId = pickModelForProvider(
      "cloudflare",
      "general",
      true,
      "@cf/meta/llama-3.1-8b-fast-v2",
    )
    assert.equal(modelId, "@cf/meta/llama-3.1-8b-fast-v2")
  })
})

describe("generateWithRouting empty plan", () => {
  it("does not report daily quota when Cloudflare credentials are missing", async () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID
    delete process.env.CLOUDFLARE_API_TOKEN
    delete process.env.GOOGLE_GEMINI_API_KEY
    delete process.env.GROQ_API_KEY
    delete process.env.OPENROUTER_API_KEY
    delete process.env.OPENAI_API_KEY
    delete process.env.HF_TOKEN
    delete process.env.OLLAMA_BASE_URL
    resetRegistryForTests()

    await assert.rejects(
      () =>
        generateWithRouting({
          messages: [{ role: "user", content: "hello" }],
          taskType: "general",
          freeOnly: true,
          preferredModelId: "haiku",
        }),
      (error: unknown) => {
        assert.ok(error instanceof ProviderError)
        assert.equal(error.normalized.code, "misconfigured")
        assert.notEqual(error.normalized.code, "quota")
        assert.match(error.normalized.message, /credentials|CLOUDFLARE/i)
        return true
      },
    )
  })
})
