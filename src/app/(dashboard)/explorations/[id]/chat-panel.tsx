'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { Bot, ChevronLeft, ChevronRight, SendHorizontal, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { FiveLayerModel } from '@/lib/schemas/requirement'
import type { ConversationResponse } from '@/lib/schemas/conversation'
import type { PendingAssumption } from './assumption-card'
import {
  getGenerationPhase,
  getGenerationPhaseMessage,
  getGenerationTimeoutMessage,
} from '@/lib/ai/generation-phase'

function extractJsonBlock(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }

  return trimmed
}

interface Props {
  requirementId: string
  currentModel: FiveLayerModel
  initialMessages: UIMessage[]
  autoOpen?: boolean
  hasPendingDiff?: boolean
  onPatchProposed: (response: ConversationResponse) => void
}

function parseConversationPayload(text: string): ConversationResponse | null {
  try {
    return JSON.parse(extractJsonBlock(text)) as ConversationResponse
  } catch {
    return null
  }
}

function getMessageText(message: UIMessage): string {
  const text = message.parts
    ?.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('\n') ?? ''

  if (message.role !== 'assistant') return text

  const parsed = parseConversationPayload(text)
  return parsed?.reply ?? text
}

function statusLabel(status: string): string {
  if (status === 'streaming') return 'Thinking'
  if (status === 'submitted') return 'Queued'
  if (status === 'error') return 'Issue'
  return 'Ready'
}

export function ChatPanel({
  requirementId,
  currentModel,
  initialMessages,
  autoOpen,
  hasPendingDiff,
  onPatchProposed,
}: Props) {
  const [isOpen, setIsOpen] = useState(autoOpen || initialMessages.length > 0)
  const [inputValue, setInputValue] = useState('')
  const [pendingAssumptions, setPendingAssumptions] = useState<PendingAssumption[]>([])
  const [elapsedMs, setElapsedMs] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, error } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/ai/converse',
      body: { requirementId, currentModel },
    }),
    onFinish: async ({ message }) => {
      await fetch('/api/trpc/conversation.saveMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementId,
          role: 'assistant',
          content: message.parts ?? [],
        }),
      })

      const textPart = message.parts?.find(
        (part): part is { type: 'text'; text: string } => part.type === 'text',
      )

      if (!textPart) return

      const parsed = parseConversationPayload(textPart.text)
      if (!parsed) return

      if (parsed.patches || parsed.newAssumptions?.length) {
        onPatchProposed(parsed)
      }

      if (parsed.newAssumptions?.length) {
        setPendingAssumptions((prev) => [
          ...prev,
          ...parsed.newAssumptions!.map((assumption) => ({
            id: crypto.randomUUID(),
            ...assumption,
          })),
        ])
      }
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (status !== 'streaming') return
    const startedAt = Date.now()
    const timer = setInterval(() => {
      setElapsedMs(Date.now() - startedAt)
    }, 150)
    return () => clearInterval(timer)
  }, [status])

  async function handleSend() {
    if (!inputValue.trim() || status === 'streaming') return
    const text = inputValue.trim()
    setInputValue('')

    await fetch('/api/trpc/conversation.saveMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirementId,
        role: 'user',
        content: [{ type: 'text', text }],
      }),
    })

    sendMessage({ text })
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  const displayedElapsedMs = status === 'streaming' ? elapsedMs : 0
  const phaseMessage = getGenerationPhaseMessage(getGenerationPhase(displayedElapsedMs))
  const timeoutMessage = getGenerationTimeoutMessage(displayedElapsedMs)
  const showPhaseFeedback = status === 'streaming' && displayedElapsedMs >= 300

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        disabled={status === 'streaming'}
        className="app-panel flex flex-col items-center justify-center gap-2 px-3 py-5 text-slate-700 hover:-translate-y-0.5"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="text-xs [writing-mode:vertical-lr]">对话</span>
      </button>
    )
  }

  return (
    <div className="app-panel flex h-[680px] flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <Bot className="size-4 text-primary" />
            AI 对话
          </div>
          <p className="text-xs text-slate-500">
            继续澄清上下文、挑战假设，并把修正建议送回 ModelCard。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium',
              status === 'streaming'
                ? 'border-cyan-200/80 bg-cyan-100/80 text-cyan-950'
                : status === 'error'
                  ? 'border-rose-200/80 bg-rose-100/80 text-rose-950'
                  : 'border-slate-200 bg-white text-slate-600',
            )}
          >
            {statusLabel(status)}
          </span>
          <Button size="icon-sm" variant="ghost" onClick={() => setIsOpen(false)} disabled={status === 'streaming'}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 px-4 py-4">
          {messages.length === 0 && (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-500">
              还没有对话。先描述新的疑问、冲突点或想验证的假设。
            </div>
          )}

          {messages.map((message) => {
            const text = getMessageText(message)
            if (!text.trim()) return null

            const isUser = message.role === 'user'

            return (
              <div
                key={message.id}
                className={isUser ? 'flex justify-end' : 'flex justify-start'}
              >
                <div
                  className={cn(
                    'max-w-[88%] rounded-[24px] px-4 py-3 text-sm leading-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]',
                    isUser
                      ? 'bg-[linear-gradient(135deg,rgba(32,99,246,0.98),rgba(15,195,255,0.92))] text-white'
                      : 'border border-slate-200/80 bg-slate-50/85 text-slate-700',
                  )}
                >
                  {text}
                </div>
              </div>
            )
          })}

          {showPhaseFeedback && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="max-w-[88%] rounded-[22px] border border-cyan-200/70 bg-cyan-50/80 px-4 py-3 text-sm text-cyan-950">
                <div className="flex items-center gap-2 font-medium">
                  <Sparkles className="size-4" />
                  {phaseMessage}
                </div>
                {timeoutMessage && (
                  <p className="mt-2 text-xs text-cyan-900/70">{timeoutMessage}</p>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {(error || pendingAssumptions.length > 0 || hasPendingDiff) && (
        <div className="space-y-2 border-t border-slate-200/80 bg-slate-50/80 px-4 py-3">
          {error && (
            <p className="rounded-[16px] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {error.message}
            </p>
          )}
          {pendingAssumptions.length > 0 && (
            <p className="rounded-[16px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              发现 {pendingAssumptions.length} 条新假设，请在假设标签页查看。
            </p>
          )}
          {hasPendingDiff && (
            <p className="rounded-[16px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              请先确认或拒绝建议的变更，再继续对话。
            </p>
          )}
        </div>
      )}

      <div className="border-t border-slate-200/80 px-4 py-4">
        <div className="flex gap-3">
          <Textarea
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入新的澄清问题、修正建议或边界条件..."
            rows={3}
            disabled={status === 'streaming' || hasPendingDiff}
            className="resize-none text-sm"
          />
          <Button
            size="icon"
            onClick={() => void handleSend()}
            disabled={
              status === 'streaming' || !inputValue.trim() || hasPendingDiff
            }
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
