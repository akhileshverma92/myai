import { NextResponse } from "next/server"
import { z } from "zod"
import { ProviderError, userFacingErrorMessage } from "@/lib/ai/errors"
import { generateWithRouting, streamWithRouting } from "@/lib/ai/router"
import { classifyTask } from "@/lib/ai/task-classifier"
import type { ChatMessage } from "@/lib/ai/types"
import { getConfiguredModelId } from "@/lib/api-constants"
import type { TaskType } from "@/src/config/accountApiConfig"

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().max(50_000),
})

const bodySchema = z.object({
  prompt: z.string().max(12_000).optional(),
  messages: z.array(messageSchema).max(80).optional(),
  model: z.string().optional(),
  models: z.array(z.string()).max(4).optional(),
  compare: z.boolean().optional(),
  freeOnly: z.boolean().optional().default(false),
  taskHint: z
    .enum([
      "general",
      "conversation",
      "coding",
      "writing",
      "summarization",
      "research",
      "structured",
      "pdf",
      "pptx",
      "document_analysis",
    ])
    .optional(),
  stream: z.boolean().optional().default(false),
  jsonMode: z.boolean().optional(),
})

const MAX_OUTPUT_CHARS = 100_000

function buildMessages(prompt: string | undefined, messages: ChatMessage[] | undefined): ChatMessage[] {
  if (messages && messages.length > 0) {
    return messages
      .filter((m) => m.content.trim())
      .map((m) => ({ role: m.role, content: m.content.trim() }))
  }
  if (prompt?.trim()) {
    return [{ role: "user", content: prompt.trim() }]
  }
  return []
}

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
    }

    const body = parsed.data
    const chatMessages = buildMessages(body.prompt, body.messages as ChatMessage[] | undefined)
    if (chatMessages.length === 0) {
      return NextResponse.json({ error: "Please provide a prompt under 12,000 characters." }, { status: 400 })
    }

    const lastUser = [...chatMessages].reverse().find((m) => m.role === "user")?.content ?? ""
    const taskType = classifyTask({
      prompt: lastUser,
      messages: chatMessages,
      hint: body.taskHint as TaskType | undefined,
    })

    // Multi-model compare (non-streaming JSON)
    if (body.compare || (body.models && body.models.length > 1)) {
      const slots = (body.models?.length ? body.models : [body.model ?? "haiku"]).slice(0, 4)
      const results = await Promise.all(
        slots.map(async (slot) => {
          const modelSlot = getConfiguredModelId(slot)
          try {
            const result = await generateWithRouting({
              messages: chatMessages,
              taskType,
              freeOnly: body.freeOnly,
              preferredModelId: modelSlot,
              preferredSlotId: modelSlot,
              preferredProviderId: "cloudflare",
              jsonMode: body.jsonMode,
              signal: request.signal,
            })
            return {
              ok: true as const,
              slot: modelSlot,
              answer: result.text.slice(0, MAX_OUTPUT_CHARS),
              provider: result.providerName,
              providerId: result.providerId,
              model: result.modelDisplayName,
              modelId: result.modelId,
              latencyMs: result.latencyMs,
              usage: result.usage,
              fallbackUsed: result.fallbackUsed,
              taskType: result.taskType,
            }
          } catch (error) {
            const normalized =
              error instanceof ProviderError
                ? error.normalized
                : { code: "unknown" as const, message: "Failed", retryable: true }
            return {
              ok: false as const,
              slot: modelSlot,
              error: userFacingErrorMessage(normalized),
              retryable: normalized.retryable,
            }
          }
        }),
      )

      return NextResponse.json({ compare: true, results, taskType })
    }

    const modelSlot = getConfiguredModelId(body.model)

    if (body.stream) {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          const send = (payload: unknown) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
          }
          try {
            for await (const chunk of streamWithRouting({
              messages: chatMessages,
              taskType,
              freeOnly: body.freeOnly,
              preferredModelId: modelSlot,
              preferredSlotId: modelSlot,
              preferredProviderId: "cloudflare",
              jsonMode: body.jsonMode,
              signal: request.signal,
              stream: true,
            })) {
              send(chunk)
            }
          } catch (error) {
            const normalized =
              error instanceof ProviderError
                ? error.normalized
                : { code: "unknown" as const, message: "Stream failed", retryable: true }
            send({ type: "error", error: { ...normalized, message: userFacingErrorMessage(normalized) } })
          } finally {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"))
            controller.close()
          }
        },
      })

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      })
    }

    const result = await generateWithRouting({
      messages: chatMessages,
      taskType,
      freeOnly: body.freeOnly,
      preferredModelId: modelSlot,
      preferredSlotId: modelSlot,
      preferredProviderId: "cloudflare",
      jsonMode: body.jsonMode,
      signal: request.signal,
    })

    return NextResponse.json({
      answer: result.text.slice(0, MAX_OUTPUT_CHARS),
      model: result.modelDisplayName,
      modelId: result.modelId,
      provider: result.providerName,
      providerId: result.providerId,
      latencyMs: result.latencyMs,
      usage: result.usage,
      fallbackUsed: result.fallbackUsed,
      attemptedProviders: result.attemptedProviders,
      taskType: result.taskType,
      selectedSlot: modelSlot,
    })
  } catch (error) {
    if (error instanceof ProviderError) {
      const code = error.normalized.code
      const status =
        code === "auth" || code === "permission" || code === "misconfigured"
          ? 503
          : code === "rate_limit"
            ? 429
            : code === "quota"
              ? 429
              : code === "unavailable"
                ? 503
                : 502
      return NextResponse.json(
        {
          error: userFacingErrorMessage(error.normalized),
          code,
          retryable: error.normalized.retryable,
          // Never include tokens, account IDs, or raw provider bodies.
        },
        { status },
      )
    }
    return NextResponse.json({ error: "Unable to generate a response.", retryable: true }, { status: 500 })
  }
}
