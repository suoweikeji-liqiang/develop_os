import { streamText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { FiveLayerModelSchema } from '@/lib/schemas/requirement'
import { buildStructuringPrompt } from '@/server/ai/prompt'
import { verifySession } from '@/lib/dal'
import { eventBus } from '@/server/events/bus'

export async function POST(req: Request) {
  const session = await verifySession()

  const body = await req.json() as { rawInput?: string; requirementId?: string }

  if (!body.rawInput || typeof body.rawInput !== 'string' || body.rawInput.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'rawInput is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (body.requirementId) {
    eventBus.emit('requirement.structuring.started', {
      requirementId: body.requirementId,
      userId: session.userId,
    })
  }

  const result = streamText({
    model: openai('gpt-4o'),
    output: Output.object({ schema: FiveLayerModelSchema }),
    prompt: buildStructuringPrompt(body.rawInput),
  })

  return result.toTextStreamResponse()
}
