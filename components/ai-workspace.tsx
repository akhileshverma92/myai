"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  FileText,
  Menu,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Sparkles,
  SquarePen,
  Trash2,
  X,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { AI_MODELS, type AiModelId } from "@/lib/api-constants"
import { useIsMobile } from "@/hooks/use-mobile"
import { MarkdownContent } from "@/components/markdown-content"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  model?: string
  provider?: string
  modelId?: string
  latencyMs?: number
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number }
  fallbackUsed?: boolean
  slot?: AiModelId
  timestamp: string
}

type Conversation = {
  id: string
  title: string
  updatedAt: string
  messages: Message[]
  pinned?: boolean
}

type CompareResult = {
  ok: boolean
  slot: AiModelId
  answer?: string
  provider?: string
  model?: string
  modelId?: string
  latencyMs?: number
  usage?: Message["usage"]
  fallbackUsed?: boolean
  error?: string
}

const models = Object.values(AI_MODELS)
const ALL_MODEL_IDS = models.map((model) => model.id as AiModelId)
const DEFAULT_COMPARE_IDS: AiModelId[] = ["haiku", "muse", "gpt"]

const starterConversations: Conversation[] = [
  {
    id: "welcome",
    title: "Welcome to Auralink",
    updatedAt: "Just now",
    messages: [
      {
        id: "intro",
        role: "assistant",
        content:
          "Welcome to Auralink. I can help you think, write, research, and create. What would you like to work on?",
        model: "Aurora 3.2",
        timestamp: "Just now",
      },
    ],
  },
  {
    id: "launch",
    title: "Product launch ideas",
    updatedAt: "Yesterday",
    messages: [
      {
        id: "launch-q",
        role: "user",
        content: "Help me plan a thoughtful product launch.",
        timestamp: "Yesterday",
      },
    ],
  },
  {
    id: "research",
    title: "Research notes",
    updatedAt: "Mon",
    messages: [
      {
        id: "research-q",
        role: "user",
        content: "Summarize my research notes into themes.",
        timestamp: "Mon",
      },
    ],
  },
]

const starters = [
  {
    icon: Zap,
    title: "Brainstorm",
    hint: "Explore product ideas",
    prompt: "Help me brainstorm a new product idea",
  },
  {
    icon: FileText,
    title: "Write",
    hint: "Draft clear copy",
    prompt: "Write a clear, engaging introduction about ",
  },
  {
    icon: Search,
    title: "Learn",
    hint: "Explain simply",
    prompt: "Explain this concept simply: ",
  },
] as const

const nowLabel = () =>
  new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date())

export function AiWorkspace() {
  const isMobile = useIsMobile()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState("welcome")
  const [prompt, setPrompt] = useState("")
  const [selectedModelId, setSelectedModelId] = useState<AiModelId>("haiku")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareModelIds, setCompareModelIds] = useState<AiModelId[]>(DEFAULT_COMPARE_IDS)
  const [compareResults, setCompareResults] = useState<CompareResult[] | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hydrated = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  const selectedModel = AI_MODELS[selectedModelId]
  const activeCompareIds = useMemo(
    () => (compareModelIds.length ? compareModelIds : DEFAULT_COMPARE_IDS),
    [compareModelIds],
  )

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeId) ?? conversations[0]

  const visibleConversations = useMemo(
    () =>
      conversations.filter((conversation) =>
        conversation.title.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [conversations, searchTerm],
  )

  const hasMessages = Boolean(activeConversation?.messages.length) || Boolean(compareResults?.length)

  const modelTriggerLabel = compareMode
    ? `${activeCompareIds.length} models`
    : selectedModel.name

  const toggleCompareModel = (id: AiModelId) => {
    setCompareModelIds((current) => {
      if (current.includes(id)) {
        if (current.length === 1) return current
        return current.filter((slot) => slot !== id)
      }
      return [...current, id]
    })
  }

  useEffect(() => {
    // Mobile-first: drawer closed until we know we're on a large screen.
    const mq = window.matchMedia("(min-width: 1024px)")
    const sync = () => setSidebarOpen(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    const request = indexedDB.open("auralink-workspace", 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore("conversations", { keyPath: "id" })
    }
    request.onsuccess = () => {
      const db = request.result
      const getRequest = db.transaction("conversations", "readonly").objectStore("conversations").getAll()
      getRequest.onsuccess = () => {
        setConversations(getRequest.result.length ? getRequest.result : starterConversations)
        hydrated.current = true
      }
    }
  }, [])

  useEffect(() => {
    if (!hydrated.current || !conversations.length) return
    const request = indexedDB.open("auralink-workspace", 1)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction("conversations", "readwrite")
      conversations.forEach((conversation) => {
        transaction.objectStore("conversations").put(conversation)
      })
    }
  }, [conversations])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [activeConversation?.messages.length, isGenerating, activeId, compareResults])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "0px"
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [prompt])

  const createConversation = () => {
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      title: "New chat",
      updatedAt: "Just now",
      messages: [],
    }
    setConversations((current) => [conversation, ...current])
    setActiveId(conversation.id)
    setPrompt("")
    setErrorMessage(null)
    setCompareResults(null)
    if (isMobile) setSidebarOpen(false)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const sendPrompt = async (retrySlot?: AiModelId) => {
    const trimmedPrompt = prompt.trim()
    if (isGenerating || !activeConversation) return

    const conversationId = activeId
    const priorUser = [...activeConversation.messages].reverse().find((m) => m.role === "user")?.content
    if (!trimmedPrompt && !priorUser && !retrySlot) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const history = activeConversation.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    if (trimmedPrompt) {
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmedPrompt,
        timestamp: nowLabel(),
      }
      history.push({ role: "user", content: trimmedPrompt })
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                title: conversation.messages.length ? conversation.title : trimmedPrompt.slice(0, 40),
                updatedAt: "Just now",
                messages: [...conversation.messages, userMessage],
              }
            : conversation,
        ),
      )
      setPrompt("")
    }

    setIsGenerating(true)
    setErrorMessage(null)
    setCompareResults(null)
    setModelMenuOpen(false)

    try {
      if (compareMode && !retrySlot) {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messages: history,
            compare: true,
            models: activeCompareIds,
            freeOnly: false,
          }),
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || "The AI request failed.")
        setCompareResults(payload.results as CompareResult[])
        return
      }

      const modelId = retrySlot ?? selectedModelId
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: history,
          model: modelId,
          freeOnly: false,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "The AI request failed.")

      const responseMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: payload.answer,
        model: payload.model || AI_MODELS[modelId].name,
        provider: payload.provider,
        modelId: payload.modelId,
        latencyMs: payload.latencyMs,
        usage: payload.usage,
        fallbackUsed: payload.fallbackUsed,
        slot: modelId,
        timestamp: nowLabel(),
      }

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, messages: [...conversation.messages, responseMessage] }
            : conversation,
        ),
      )
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
      setErrorMessage(error instanceof Error ? error.message : "Unable to generate a response.")
    } finally {
      setIsGenerating(false)
    }
  }

  const preferCompareAnswer = (result: CompareResult) => {
    if (!result.ok || !result.answer) return
    const responseMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: result.answer,
      model: result.model || AI_MODELS[result.slot]?.name,
      provider: result.provider,
      modelId: result.modelId,
      latencyMs: result.latencyMs,
      usage: result.usage,
      fallbackUsed: result.fallbackUsed,
      slot: result.slot,
      timestamp: nowLabel(),
    }
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeId
          ? { ...conversation, messages: [...conversation.messages, responseMessage] }
          : conversation,
      ),
    )
    setCompareResults(null)
    setCompareMode(false)
    setSelectedModelId(result.slot)
  }

  const deleteConversation = (id: string) => {
    const remaining = conversations.filter((conversation) => conversation.id !== id)
    setConversations(remaining.length ? remaining : starterConversations)
    if (activeId === id) setActiveId(remaining[0]?.id ?? "welcome")
  }

  const copyMessage = async (message: Message) => {
    await navigator.clipboard.writeText(message.content)
    setCopiedId(message.id)
    window.setTimeout(() => setCopiedId(null), 1500)
  }

  const selectConversation = (id: string) => {
    setActiveId(id)
    if (isMobile) setSidebarOpen(false)
  }

  return (
    <div className="aura-shell relative flex h-dvh max-h-dvh w-full overflow-hidden bg-[var(--aura-bg)] text-[var(--aura-fg)]">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[min(100%,18.5rem)] flex-col border-r border-[var(--aura-border)] bg-[var(--aura-sidebar)] transition-transform duration-300 ease-out md:w-72 lg:relative lg:z-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          !sidebarOpen && "lg:hidden",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex min-w-0 items-center gap-2.5 px-1">
            <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--aura-fg)] text-[var(--aura-bg)]">
              <Sparkles className="size-3.5" />
            </div>
            <span className="truncate text-[15px] font-semibold tracking-tight">Auralink</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close sidebar"
            className="size-9 shrink-0 rounded-xl lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="px-3">
          <Button
            onClick={createConversation}
            className="h-10 w-full justify-start gap-2 rounded-xl bg-[var(--aura-fg)] text-[var(--aura-bg)] hover:opacity-90"
          >
            <Plus className="size-4" />
            New chat
          </Button>
        </div>

        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--aura-muted)]" />
            <Input
              aria-label="Search conversations"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search"
              className="h-9 rounded-xl border-0 bg-[var(--aura-surface)] pl-9 text-sm shadow-none focus-visible:ring-1"
            />
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4">
          <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--aura-muted)]">
            Chats
          </p>
          <div className="flex flex-col gap-0.5">
            {visibleConversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => selectConversation(conversation.id)}
                className={cn(
                  "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                  activeId === conversation.id
                    ? "bg-[var(--aura-surface-strong)] font-medium"
                    : "hover:bg-[var(--aura-surface)]",
                )}
              >
                <MessageSquare className="size-3.5 shrink-0 text-[var(--aura-muted)]" />
                <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Delete ${conversation.title}`}
                  className="grid size-7 place-items-center rounded-lg opacity-0 transition group-hover:opacity-100 hover:bg-[var(--aura-surface)]"
                  onClick={(event) => {
                    event.stopPropagation()
                    deleteConversation(conversation.id)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      event.stopPropagation()
                      deleteConversation(conversation.id)
                    }
                  }}
                >
                  <Trash2 className="size-3.5 text-[var(--aura-muted)]" />
                </span>
              </button>
            ))}
          </div>
        </div>

      </aside>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main chat */}
      <section className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-[var(--aura-border)] bg-[var(--aura-bg)]/90 px-2 backdrop-blur-md sm:h-14 sm:px-4 pt-[env(safe-area-inset-top)]">
          <div className="flex min-w-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={sidebarOpen ? "Hide sidebar" : "Open sidebar"}
              className="size-9 shrink-0 rounded-xl"
              onClick={() => setSidebarOpen((open) => !open)}
            >
              <Menu className="size-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-tight sm:text-[15px]">
                {activeConversation?.title ?? "New chat"}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="New chat"
              className="size-9 rounded-xl"
              onClick={createConversation}
            >
              <SquarePen className="size-4" />
            </Button>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {hasMessages ? (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-3 py-5 sm:gap-6 sm:px-5 sm:py-8">
              {activeConversation?.messages.map((message) => (
                <article
                  key={message.id}
                  className={cn(
                    "aura-message flex w-full",
                    message.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "min-w-0 max-w-[92%] sm:max-w-[85%]",
                      message.role === "user" ? "items-end" : "items-start",
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--aura-muted)]">
                        <span className="grid size-6 place-items-center rounded-lg bg-[var(--aura-surface-strong)]">
                          <Sparkles className="size-3" />
                        </span>
                        <span>
                          {[
                            message.provider,
                            message.model ?? "Auralink",
                            message.latencyMs != null ? `${message.latencyMs}ms` : null,
                            message.fallbackUsed ? "fallback" : null,
                            message.usage?.totalTokens != null
                              ? `${message.usage.totalTokens} tok`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                    )}

                    <div
                      className={cn(
                        "text-[15px] leading-7",
                        message.role === "user"
                          ? "rounded-3xl rounded-br-lg bg-[var(--aura-user)] px-4 py-2.5 text-[var(--aura-user-fg)]"
                          : "text-[var(--aura-fg)]",
                      )}
                    >
                      {message.role === "assistant" ? (
                        <MarkdownContent content={message.content} />
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      )}
                    </div>

                    {message.role === "assistant" && (
                      <div className="mt-2 flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Copy response"
                          className="size-8 rounded-lg text-[var(--aura-muted)]"
                          onClick={() => copyMessage(message)}
                        >
                          {copiedId === message.id ? (
                            <Check className="size-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </Button>
                        <span className="text-[11px] text-[var(--aura-muted)]">{message.timestamp}</span>
                      </div>
                    )}
                  </div>
                </article>
              ))}

              {compareResults && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">Compare results</p>
                      <p className="text-[11px] text-[var(--aura-muted)]">
                        Review side by side, then prefer one answer to continue chatting.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-xl text-[var(--aura-muted)]"
                      onClick={() => setCompareResults(null)}
                    >
                      Dismiss
                    </Button>
                  </div>
                  <div
                    className={cn(
                      "grid gap-3",
                      compareResults.length === 1 && "grid-cols-1",
                      compareResults.length === 2 && "md:grid-cols-2",
                      compareResults.length >= 3 && "md:grid-cols-2 xl:grid-cols-4",
                    )}
                  >
                    {compareResults.map((result) => (
                      <div
                        key={result.slot}
                        className="flex min-h-[220px] flex-col rounded-2xl border border-[var(--aura-border)] bg-[var(--aura-surface)] p-4"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={cn(
                                "size-2 shrink-0 rounded-full",
                                AI_MODELS[result.slot]?.color ?? "bg-slate-400",
                              )}
                            />
                            <p className="truncate text-sm font-medium">
                              {AI_MODELS[result.slot]?.name ?? result.slot}
                            </p>
                          </div>
                          {result.ok && result.latencyMs != null && (
                            <span className="shrink-0 text-[11px] text-[var(--aura-muted)]">
                              {result.latencyMs}ms
                            </span>
                          )}
                        </div>
                        {result.ok ? (
                          <>
                            <p className="mb-2 text-[11px] text-[var(--aura-muted)]">
                              {[result.provider, result.modelId || result.model, result.fallbackUsed ? "fallback" : null]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                            <div className="min-h-0 flex-1">
                              <MarkdownContent content={result.answer ?? ""} compact />
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                className="rounded-xl"
                                onClick={() => preferCompareAnswer(result)}
                              >
                                Prefer this
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl"
                                onClick={() => {
                                  void navigator.clipboard.writeText(result.answer ?? "")
                                }}
                              >
                                Copy
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-1 flex-col justify-between gap-3">
                            <p className="text-sm text-red-600 dark:text-red-300">{result.error}</p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              disabled={isGenerating}
                              onClick={() => void sendPrompt(result.slot)}
                            >
                              Retry this model
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isGenerating && (
                <div className="flex items-center gap-2 text-[var(--aura-muted)]">
                  <span className="grid size-6 place-items-center rounded-lg bg-[var(--aura-surface-strong)]">
                    <Sparkles className="size-3 animate-pulse" />
                  </span>
                  <div className="flex gap-1 px-1 py-2">
                    <span className="size-1.5 animate-bounce rounded-full bg-[var(--aura-muted)]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-[var(--aura-muted)] [animation-delay:120ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-[var(--aura-muted)] [animation-delay:240ms]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="mx-auto flex h-full w-full max-w-xl flex-col items-center justify-center px-4 text-center">
              <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-[var(--aura-fg)] text-[var(--aura-bg)] shadow-lg shadow-black/10">
                <Sparkles className="size-5" />
              </div>
              <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                What&apos;s on your mind?
              </h2>
              <p className="mt-2 max-w-sm text-pretty text-sm leading-6 text-[var(--aura-muted)]">
                Ask anything — write, research, or think through an idea.
              </p>
              <div className="mt-7 grid w-full gap-2 sm:grid-cols-3">
                {starters.map((starter) => (
                  <button
                    key={starter.title}
                    type="button"
                    onClick={() => {
                      setPrompt(starter.prompt)
                      textareaRef.current?.focus()
                    }}
                    className="flex items-start gap-3 rounded-2xl border border-[var(--aura-border)] bg-[var(--aura-surface)] p-3.5 text-left transition hover:bg-[var(--aura-surface-strong)] active:scale-[0.99] sm:flex-col sm:gap-4"
                  >
                    <starter.icon className="size-4 shrink-0 text-[var(--aura-muted)]" />
                    <span>
                      <span className="block text-sm font-medium">{starter.title}</span>
                      <span className="mt-0.5 block text-xs text-[var(--aura-muted)]">{starter.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[var(--aura-border)] bg-[var(--aura-bg)]/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md sm:px-4">
          <div className="mx-auto w-full max-w-3xl">
            {errorMessage && (
              <div
                role="alert"
                className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300"
              >
                <p className="min-w-0 flex-1">{errorMessage}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 rounded-xl"
                  disabled={isGenerating}
                  onClick={() => void sendPrompt()}
                >
                  Retry
                </Button>
              </div>
            )}

            <div
              className={cn(
                "rounded-[1.35rem] border border-[var(--aura-border)] bg-[var(--aura-composer)] shadow-[0_8px_30px_rgba(0,0,0,0.06)]",
                modelMenuOpen ? "relative z-[120] overflow-visible" : "overflow-hidden",
              )}
            >
              <Textarea
                ref={textareaRef}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing &&
                    event.keyCode !== 229
                  ) {
                    event.preventDefault()
                    void sendPrompt()
                  }
                }}
                placeholder="Message Auralink…"
                aria-label="Message Auralink"
                rows={1}
                className="max-h-40 min-h-[48px] resize-none border-0 bg-transparent px-4 py-3.5 text-[15px] leading-6 shadow-none focus-visible:ring-0"
              />

              <div className="flex items-center justify-between gap-2 px-2 pb-2">
                <div className="flex min-w-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Attach file"
                    className="size-9 rounded-xl text-[var(--aura-muted)]"
                  >
                    <Paperclip className="size-4" />
                  </Button>

                  <div className={cn("relative", modelMenuOpen && "z-[130]")}>
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      aria-expanded={modelMenuOpen}
                      onClick={(event) => {
                        event.stopPropagation()
                        setModelMenuOpen((open) => !open)
                      }}
                      className="flex max-w-[12rem] items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs text-[var(--aura-muted)] transition hover:bg-[var(--aura-surface)] sm:max-w-none"
                    >
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          compareMode
                            ? "bg-gradient-to-r from-violet-500 via-amber-400 to-emerald-500"
                            : selectedModel.color,
                        )}
                      />
                      <span className="truncate">{modelTriggerLabel}</span>
                      <ChevronDown className="size-3 shrink-0" />
                    </button>

                    {modelMenuOpen && (
                      <>
                        <button
                          type="button"
                          aria-label="Close model menu"
                          className="fixed inset-0 z-[125] cursor-default bg-transparent"
                          onClick={() => setModelMenuOpen(false)}
                        />
                        <div
                          role="dialog"
                          aria-label="Choose models"
                          className="absolute bottom-[calc(100%+0.4rem)] left-0 z-[130] w-[min(18.5rem,calc(100vw-2rem))] rounded-2xl border border-[var(--aura-border)] bg-[var(--aura-composer)] p-2 shadow-xl"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="mb-2 grid grid-cols-2 gap-1 rounded-xl bg-[var(--aura-surface)] p-1">
                            <button
                              type="button"
                              onClick={() => setCompareMode(false)}
                              className={cn(
                                "rounded-lg px-2 py-2 text-xs font-medium transition",
                                !compareMode && "bg-[var(--aura-composer)] shadow-sm",
                              )}
                            >
                              Single
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCompareMode(true)
                                if (!compareModelIds.length) setCompareModelIds(DEFAULT_COMPARE_IDS)
                              }}
                              className={cn(
                                "rounded-lg px-2 py-2 text-xs font-medium transition",
                                compareMode && "bg-[var(--aura-composer)] shadow-sm",
                              )}
                            >
                              Multi compare
                            </button>
                          </div>

                          <p className="px-1 pb-2 text-[11px] text-[var(--aura-muted)]">
                            {compareMode
                              ? "Select 2+ models. We’ll generate all answers side by side."
                              : "Choose one model for this reply."}
                          </p>

                          <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
                            {models.map((model) => {
                              const id = model.id as AiModelId
                              const checked = compareMode
                                ? activeCompareIds.includes(id)
                                : selectedModelId === id
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => {
                                    if (compareMode) {
                                      toggleCompareModel(id)
                                      return
                                    }
                                    setSelectedModelId(id)
                                    setCompareMode(false)
                                    setModelMenuOpen(false)
                                  }}
                                  className={cn(
                                    "flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-sm transition hover:bg-[var(--aura-surface)]",
                                    checked && "bg-[var(--aura-surface)]",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "mt-0.5 grid size-4 shrink-0 place-items-center rounded border",
                                      checked
                                        ? "border-emerald-500 bg-emerald-500 text-white"
                                        : "border-[var(--aura-border)]",
                                    )}
                                  >
                                    {checked && <Check className="size-3" />}
                                  </span>
                                  <span className={cn("mt-1 size-2 shrink-0 rounded-full", model.color)} />
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate font-medium">{model.name}</span>
                                    <span className="block truncate text-[11px] text-[var(--aura-muted)]">
                                      {model.description}
                                    </span>
                                  </span>
                                </button>
                              )
                            })}
                          </div>

                          {compareMode && (
                            <div className="mt-2 flex items-center justify-between gap-2 border-t border-[var(--aura-border)] pt-2">
                              <button
                                type="button"
                                className="rounded-lg px-2 py-1.5 text-[11px] text-[var(--aura-muted)] hover:bg-[var(--aura-surface)]"
                                onClick={() => setCompareModelIds(ALL_MODEL_IDS)}
                              >
                                Select all
                              </button>
                              <Button
                                size="sm"
                                className="rounded-xl"
                                disabled={activeCompareIds.length < 2}
                                onClick={() => setModelMenuOpen(false)}
                              >
                                Use {activeCompareIds.length} models
                              </Button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <Button
                  size="icon"
                  aria-label={compareMode ? "Generate with selected models" : "Send message"}
                  disabled={
                    !prompt.trim() ||
                    isGenerating ||
                    (compareMode && activeCompareIds.length < 2)
                  }
                  onClick={() => void sendPrompt()}
                  className="size-9 rounded-xl bg-[var(--aura-fg)] text-[var(--aura-bg)] hover:opacity-90 disabled:opacity-30"
                >
                  <ArrowUp className="size-4" />
                </Button>
              </div>
            </div>

            <p className="mt-2 text-center text-[10px] text-[var(--aura-muted)] sm:text-[11px]">
              Auralink can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
