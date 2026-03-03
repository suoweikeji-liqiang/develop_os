import { prisma } from '@/server/db/client'
import { chunkText, embedAndStore } from './embed'
import { isEmbeddingConfigured } from '@/server/ai/provider'

interface ConversationPart {
  type?: string
  text?: string
}

interface ConversationMessageInput {
  id: string
  requirementId: string
  role: string
  content: unknown
}

export function extractTextFromConversationContent(content: unknown): string {
  const parts = Array.isArray(content)
    ? content
    : (content as { parts?: unknown[] } | null)?.parts ?? []

  const text = (parts as ConversationPart[])
    .filter((part) => part?.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text!.trim())
    .filter(Boolean)
    .join('\n')

  return text.trim()
}

export async function embedConversationMessage(message: ConversationMessageInput): Promise<void> {
  if (!isEmbeddingConfigured()) return
  if (message.role !== 'assistant') return

  const text = extractTextFromConversationContent(message.content)
  if (text.length < 50) return

  const chunks = chunkText(text)
  if (chunks.length === 0) return

  await embedAndStore(chunks, 'history', message.requirementId, {
    sourceName: `conversation:${message.id}`,
    messageId: message.id,
  })
}

export async function backfillConversationHistory(): Promise<{ processed: number; skipped: number }> {
  if (!isEmbeddingConfigured()) {
    return { processed: 0, skipped: 0 }
  }

  const messages = await prisma.conversationMessage.findMany({
    where: { role: 'assistant' },
    select: {
      id: true,
      requirementId: true,
      role: true,
      content: true,
    },
  })

  let processed = 0
  let skipped = 0

  for (const message of messages) {
    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "KnowledgeChunk"
      WHERE metadata->>'messageId' = ${message.id}
      LIMIT 1
    `

    if (existing.length > 0) {
      skipped++
      continue
    }

    await embedConversationMessage(message)
    processed++
  }

  return { processed, skipped }
}
