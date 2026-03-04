import { streamText, Output, convertToModelMessages } from 'ai'
import { ConversationResponseSchema } from '@/lib/schemas/conversation'
import { buildConversationPrompt } from '@/server/ai/conversation-prompt'
import { verifySession } from '@/lib/dal'
import type { FiveLayerModel } from '@/lib/schemas/requirement'
import { retrieveRelevantChunks, type RetrievedChunk } from '@/server/ai/rag/retrieve'
import { getStructuredChatModel } from '@/server/ai/provider'
import {
  appendStructuredOutputInstructions,
  supportsNativeStructuredOutput,
  withJsonKeywordHint,
} from '@/server/ai/structured-output'

const CONVERSATION_RESPONSE_SHAPE_HINT = `{
  "reply": "string",
  "patches": {
    "goal": "goal layer object (optional)",
    "assumption": "assumption layer object (optional)",
    "behavior": "behavior layer object (optional)",
    "scenario": "scenario layer object (optional)",
    "verifiability": "verifiability layer object (optional)"
  },
  "newAssumptions": [
    {
      "content": "string",
      "confidence": "high | medium | low",
      "rationale": "string"
    }
  ],
  "affectedLayers": ["goal | assumption | behavior | scenario | verifiability"]
}`

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

  const { messages, currentModel } = await req.json()
  const userMessage = extractLatestUserMessage(messages)

  let ragContext: RetrievedChunk[] = []
  if (userMessage) {
    try {
      ragContext = await retrieveRelevantChunks(userMessage, 3, ['history'])
    } catch (error) {
      console.error('[rag] history retrieval failed:', error)
    }
  }

  const systemPrompt = buildConversationPrompt(currentModel as FiveLayerModel, ragContext)
  const modelMessages = await convertToModelMessages(messages)

  const result = supportsNativeStructuredOutput()
    ? streamText({
      model: getStructuredChatModel(),
      output: Output.object({ schema: ConversationResponseSchema }),
      system: withJsonKeywordHint(systemPrompt),
      messages: modelMessages,
      maxOutputTokens: 1000,
    })
    : streamText({
      model: getStructuredChatModel(),
      system: appendStructuredOutputInstructions(
        systemPrompt,
        ConversationResponseSchema,
        'conversation_response',
        CONVERSATION_RESPONSE_SHAPE_HINT,
      ),
      messages: modelMessages,
      maxOutputTokens: 1000,
    })

  return result.toUIMessageStreamResponse()
}
