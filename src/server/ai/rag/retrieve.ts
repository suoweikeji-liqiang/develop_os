import { embed } from 'ai'
import { openai } from '@ai-sdk/openai'
import pgvector from 'pgvector'
import { prisma } from '@/server/db/client'
import type { KnowledgeSourceType } from './sources'

const MAX_DISTANCE = 0.35

export interface RetrievedChunk {
  id: string
  sourceType: string
  sourceId: string
  content: string
  sourceName: string
  distance: number
}

export async function retrieveRelevantChunks(
  query: string,
  topK = 5,
  sourceTypes?: KnowledgeSourceType[],
): Promise<RetrievedChunk[]> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return []

  const { embedding } = await embed({
    model: openai.embeddingModel('text-embedding-3-small'),
    value: trimmedQuery,
  })

  const vectorSql = pgvector.toSql(embedding)
  const fetchLimit = sourceTypes && sourceTypes.length > 0
    ? Math.max(topK * 4, topK)
    : topK

  const rows = await prisma.$queryRaw<RetrievedChunk[]>`
    SELECT id, "sourceType", "sourceId", content, "sourceName", embedding <=> ${vectorSql}::vector AS distance
    FROM "KnowledgeChunk"
    ORDER BY embedding <=> ${vectorSql}::vector
    LIMIT ${fetchLimit}
  `

  const typeSet = sourceTypes && sourceTypes.length > 0 ? new Set(sourceTypes) : null

  return rows
    .filter((row) => row.distance < MAX_DISTANCE)
    .filter((row) => (typeSet ? typeSet.has(row.sourceType as KnowledgeSourceType) : true))
    .slice(0, topK)
}
