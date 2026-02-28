import { streamText, Output, convertToModelMessages } from 'ai'
import { openai } from '@ai-sdk/openai'
import { ConversationResponseSchema } from '@/lib/schemas/conversation'
import { buildConversationPrompt } from '@/server/ai/conversation-prompt'
import { verifySession } from '@/lib/dal'
import type { FiveLayerModel } from '@/lib/schemas/requirement'

export async function POST(req: Request) {
  await verifySession()

  const { messages, requirementId, currentModel } = await req.json()

  const result = streamText({
    model: openai('gpt-4o'),
    output: Output.object({ schema: ConversationResponseSchema }),
    system: buildConversationPrompt(currentModel as FiveLayerModel),
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
