import type { TaskType } from "@/src/config/accountApiConfig"
import type { ChatMessage } from "@/lib/ai/types"

const TASK_SYSTEM: Record<TaskType, { instruction: string; maxTokens: number; temperature: number }> = {
  general: {
    instruction:
      "You are Auralink, a helpful assistant. Answer concisely and accurately. Do not claim fact-checking or sources unless verification was performed.",
    maxTokens: 1024,
    temperature: 0.4,
  },
  conversation: {
    instruction:
      "You are Auralink in a multi-turn conversation. Be natural, remember prior context, and keep replies clear. Preserve the user's language and tone.",
    maxTokens: 1536,
    temperature: 0.6,
  },
  coding: {
    instruction:
      "You are Auralink coding assistant. Provide correct, runnable code with brief explanations and note relevant edge cases. Prefer clarity over verbosity.",
    maxTokens: 4096,
    temperature: 0.2,
  },
  writing: {
    instruction:
      "You are Auralink writing assistant. Produce coherent long-form content with clear sections when useful. Match the requested tone, audience, length, and language.",
    maxTokens: 4096,
    temperature: 0.7,
  },
  summarization: {
    instruction:
      "You are Auralink summarizer. Capture key points faithfully without inventing details. Use bullets when helpful. Preserve the source language unless asked to translate.",
    maxTokens: 2048,
    temperature: 0.3,
  },
  research: {
    instruction:
      "You are Auralink research assistant. Structure findings clearly. Only cite sources when they were provided in the prompt or retrieved material. Do not invent citations.",
    maxTokens: 3072,
    temperature: 0.35,
  },
  structured: {
    instruction:
      "You are Auralink structured-output assistant. Return valid JSON only when asked for JSON. Follow the schema exactly. No markdown fences unless requested.",
    maxTokens: 3072,
    temperature: 0.2,
  },
  pdf: {
    instruction:
      "You are Auralink document generator. Produce organized document content with headings, sections, and tables when useful. Use clear hierarchy suitable for PDF layout.",
    maxTokens: 4096,
    temperature: 0.45,
  },
  pptx: {
    instruction:
      'You are Auralink presentation generator. Return slide-by-slide structured JSON like {"slides":[{"title":"...","bullets":["..."]}]}. Keep bullets short and presentation-ready.',
    maxTokens: 3072,
    temperature: 0.45,
  },
  document_analysis: {
    instruction:
      "You are Auralink document analyst. Ground answers in the provided document content. Quote or reference passages when useful. Do not invent document contents.",
    maxTokens: 3072,
    temperature: 0.3,
  },
}

export function classifyTask(input: {
  prompt: string
  messages?: ChatMessage[]
  hint?: TaskType
}): TaskType {
  if (input.hint) return input.hint

  const text = `${input.prompt}\n${(input.messages ?? []).map((m) => m.content).join("\n")}`.toLowerCase()

  if (/\b(slide|powerpoint|pptx|deck)\b/.test(text)) return "pptx"
  if (/\b(pdf|report document|generate a document)\b/.test(text)) return "pdf"
  if (/\b(json|schema|structured|as an object)\b/.test(text)) return "structured"
  if (/\b(summarize|summary|tldr|key points)\b/.test(text)) return "summarization"
  if (/\b(analyze|analyse).*(document|pdf|file|attachment)|based on (this|the) (doc|document|text)\b/.test(text)) {
    return "document_analysis"
  }
  if (/\b(research|cite|sources|with references)\b/.test(text)) return "research"
  if (/\b(code|function|typescript|javascript|python|bug|refactor|api route)\b/.test(text)) return "coding"
  if (/\b(write|draft|essay|blog|rewrite|tone|story)\b/.test(text)) return "writing"
  if ((input.messages?.length ?? 0) > 2) return "conversation"
  return "general"
}

export function getTaskProfile(taskType: TaskType) {
  return TASK_SYSTEM[taskType]
}

export function buildMessagesForTask(
  messages: ChatMessage[],
  taskType: TaskType,
  extraSystem?: string,
): ChatMessage[] {
  const profile = getTaskProfile(taskType)
  const system = [profile.instruction, extraSystem].filter(Boolean).join("\n\n")
  const withoutSystem = messages.filter((m) => m.role !== "system")
  return [{ role: "system", content: system }, ...withoutSystem]
}
