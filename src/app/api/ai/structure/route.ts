import { verifySession } from '@/lib/dal'
import { retrieveRelevantChunks, type RetrievedChunk } from '@/server/ai/rag/retrieve'
import { prisma } from '@/server/db/client'
import { runAgent } from '@/server/agents/registry'
import '@/server/agents'

export async function POST(req: Request) {
  const session = await verifySession()

  let body: { rawInput?: string; requirementId?: string }
  try {
    body = await req.json() as { rawInput?: string; requirementId?: string }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!body.rawInput || typeof body.rawInput !== 'string' || body.rawInput.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'rawInput is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!body.requirementId || typeof body.requirementId !== 'string') {
    return new Response(JSON.stringify({ error: 'requirementId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let ragContext: RetrievedChunk[] = []
  try {
    ragContext = await retrieveRelevantChunks(body.rawInput, 5)
  } catch (error) {
    console.error('[rag] retrieval failed, proceeding without context:', error)
  }

  const result = await runAgent<{
    rawInput: string
    requirementId: string
    ragContext: RetrievedChunk[]
  }, {
    success: boolean
    model?: unknown
    error?: unknown
  }>('clarifier', {
    rawInput: body.rawInput,
    requirementId: body.requirementId,
    ragContext,
  }, {
    userId: session.userId,
    requirementId: body.requirementId,
  })

  if (!result.success || !result.model) {
    return new Response(JSON.stringify({ error: 'Failed to generate structured model' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  void prisma.requirement.update({
    where: { id: body.requirementId },
    data: {
      citations: ragContext.map((chunk) => ({
        chunkId: chunk.id,
        sourceName: chunk.sourceName,
        sourceType: chunk.sourceType,
        excerpt: chunk.content.slice(0, 200),
      })),
    },
  }).catch((error) => {
    console.error('[citations] failed to save:', error)
  })

  return new Response(JSON.stringify(result.model), {
    headers: { 'Content-Type': 'application/json' },
  })
}
