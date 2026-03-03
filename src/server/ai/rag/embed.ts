import { embedMany } from 'ai'
import pgvector from 'pgvector'
import { prisma } from '@/server/db/client'
import type { KnowledgeSourceType } from './sources'
import { getEmbeddingModelConfig } from '@/server/ai/provider'

export const CHUNK_SIZE = 400
export const CHUNK_OVERLAP = 50

export function chunkText(text: string): string[] {
  const normalized = text.trim()
  if (!normalized) return []

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (paragraphs.length === 0) return []

  const maxChars = CHUNK_SIZE * 4
  const overlapChars = CHUNK_OVERLAP * 4
  const chunks: string[] = []
  let current = ''

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph
    if (candidate.length <= maxChars) {
      current = candidate
      continue
    }

    if (current.length >= 50) {
      chunks.push(current.trim())
    }

    if (paragraph.length <= maxChars) {
      current = paragraph
      continue
    }

    let start = 0
    while (start < paragraph.length) {
      const end = Math.min(paragraph.length, start + maxChars)
      const segment = paragraph.slice(start, end).trim()
      if (segment.length >= 50) {
        chunks.push(segment)
      }
      if (end >= paragraph.length) break
      start = Math.max(end - overlapChars, start + 1)
    }
    current = ''
  }

  if (current.length >= 50) {
    chunks.push(current.trim())
  }

  return chunks
}

export async function embedAndStore(
  chunks: string[],
  sourceType: KnowledgeSourceType,
  sourceId: string,
  metadata: Record<string, string> = {},
): Promise<void> {
  if (chunks.length === 0) return

  const embeddingConfig = getEmbeddingModelConfig()
  if (!embeddingConfig) {
    throw new Error('Embedding provider is not configured')
  }

  const { embeddings } = await embedMany({
    ...embeddingConfig,
    values: chunks,
    maxParallelCalls: 5,
  })

  const sourceName = metadata.sourceName ?? sourceId
  const metadataJson = JSON.stringify(metadata)

  for (let i = 0; i < chunks.length; i++) {
    const vectorSql = pgvector.toSql(embeddings[i])
    await prisma.$executeRaw`
      INSERT INTO "KnowledgeChunk" (id, "sourceType", "sourceId", "sourceName", content, embedding, metadata, "createdAt")
      VALUES (gen_random_uuid()::text, ${sourceType}, ${sourceId}, ${sourceName}, ${chunks[i]}, ${vectorSql}::vector, ${metadataJson}::jsonb, NOW())
    `
  }
}
