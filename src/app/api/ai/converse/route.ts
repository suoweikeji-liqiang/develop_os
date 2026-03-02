import { streamText, Output, convertToModelMessages } from 'ai'
import { openai } from '@ai-sdk/openai'
import { ConversationResponseSchema } from '@/lib/schemas/conversation'
import { buildConversationPrompt } from '@/server/ai/conversation-prompt'
import { verifySession } from '@/lib/dal'
import type { FiveLayerModel } from '@/lib/schemas/requirement'
import { retrieveRelevantChunks, type RetrievedChunk } from '@/server/ai/rag/retrieve'

function extractLatestUserMessage(messages: unknown): string {
  if (!Array.isArray(messages)) return ''

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i] as {
      role?: string
      parts?: Array<{ type?: string; text?: string }>
    }

    if (message?.role !== 'user' || !Array.isArray(message.parts)) continue

    const text = message.parts
      .filter((part) => part.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text!.trim())
      .filter(Boolean)
      .join('\n')

    if (text) return text
  }

  return ''
}

export async function POST(req: Request) {
  await verifySession()

  const { messages, requirementId, currentModel } = await req.json()
  const userMessage = extractLatestUserMessage(messages)

  let ragContext: RetrievedChunk[] = []
  if (userMessage) {
    try {
      ragContext = await retrieveRelevantChunks(userMessage, 3, ['history'])
    } catch (error) {
      console.error('[rag] history retrieval failed:', error)
    }
  }

  const result = streamText({
    model: openai('gpt-4o'),
    output: Output.object({ schema: ConversationResponseSchema }),
    system: buildConversationPrompt(currentModel as FiveLayerModel, ragContext),
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
