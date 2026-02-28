'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, ChevronRight, ChevronLeft } from 'lucide-react'
import type { FiveLayerModel } from '@/lib/schemas/requirement'
import type { ConversationResponse } from '@/lib/schemas/conversation'
import type { PendingAssumption } from './assumption-card'

interface Props {
  requirementId: string
  currentModel: FiveLayerModel
  initialMessages: UIMessage[]
  autoOpen?: boolean
  hasPendingDiff?: boolean
  onPatchProposed: (response: ConversationResponse) => void
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, error } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/ai/converse',
      body: { requirementId, currentModel },
    }),
    onFinish: async ({ message }) => {
      // Save assistant message to DB
      await fetch('/api/trpc/conversation.saveMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          json: { requirementId, role: 'assistant', content: message.parts ?? [] },
        }),
      })
      // Extract structured response from text part
      try {
        const textPart = message.parts?.find(
          (p: { type: string }) => p.type === 'text',
        )
        if (textPart && 'text' in textPart) {
          const parsed = JSON.parse(
            (textPart as { text: string }).text,
          ) as ConversationResponse
          if (parsed.patches || parsed.newAssumptions?.length) {
            onPatchProposed(parsed)
          }
          if (parsed.newAssumptions?.length) {
            setPendingAssumptions((prev) => [
              ...prev,
              ...parsed.newAssumptions!.map((a) => ({
                id: crypto.randomUUID(),
                ...a,
              })),
            ])
          }
        }
      } catch {
        // parse failure — skip silently
      }
    },
  })

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!inputValue.trim() || status === 'streaming') return
    const text = inputValue.trim()
    setInputValue('')
    // Save user message to DB
    await fetch('/api/trpc/conversation.saveMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        json: { requirementId, role: 'user', content: [{ type: 'text', text }] },
      }),
    })
    sendMessage({ text })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex flex-col items-center justify-center gap-1 rounded-md border bg-muted/50 px-2 py-4 hover:bg-muted transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="text-xs [writing-mode:vertical-lr]">对话</span>
      </button>
    )
  }

  return (
    <div className="flex flex-col rounded-md border bg-background h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">AI 对话</span>
        <Button size="icon" variant="ghost" onClick={() => setIsOpen(false)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={
                msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'
              }
            >
              <div
                className={
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-lg px-3 py-2 max-w-[85%] text-sm'
                    : 'bg-muted rounded-lg px-3 py-2 max-w-[85%] text-sm'
                }
              >
                {msg.parts
                  ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                  .map((p, i) => (
                    <span key={i}>{p.text}</span>
                  ))}
              </div>
            </div>
          ))}

          {status === 'streaming' &&
            messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="space-y-2 bg-muted rounded-lg px-3 py-2 max-w-[85%]">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 px-3 py-1">{error.message}</p>
      )}

      {/* Pending assumptions notification */}
      {pendingAssumptions.length > 0 && (
        <p className="text-sm text-amber-600 px-3 py-1">
          发现新假设，请在假设标签页查看
        </p>
      )}

      {/* Pending diff warning */}
      {hasPendingDiff && (
        <p className="text-xs text-amber-600 px-3 mb-1">
          请先确认或拒绝建议的变更
        </p>
      )}

      {/* Input area */}
      <div className="border-t p-3 flex gap-2">
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          rows={2}
          disabled={status === 'streaming' || hasPendingDiff}
          className="resize-none text-sm"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={
            status === 'streaming' || !inputValue.trim() || hasPendingDiff
          }
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
