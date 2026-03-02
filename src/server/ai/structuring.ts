import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { FiveLayerModelSchema, type FiveLayerModel } from '@/lib/schemas/requirement'
import { eventBus } from '@/server/events/bus'
import { buildStructuringPrompt } from './prompt'
import type { RetrievedChunk } from './rag/retrieve'

const MAX_RETRIES = 3

// Zod 4 schemas work natively with AI SDK 6's Output.object() —
// no jsonSchema() bridge needed. Verified at install time.

export type StructuringResult =
  | { success: true; model: FiveLayerModel; attempts: number }
  | { success: false; error: unknown; attempts: number }

/**
 * Generate a structured five-layer model from natural language input.
 * Retries up to 3 times silently on failure, emitting lifecycle events.
 */
export async function generateStructuredModel(
  input: string,
  requirementId: string,
  userId: string,
  ragContext: RetrievedChunk[] = [],
): Promise<StructuringResult> {
  eventBus.emit('requirement.structuring.started', { requirementId, userId })

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { output } = await generateText({
        model: openai('gpt-4o'),
        output: Output.object({ schema: FiveLayerModelSchema }),
        prompt: buildStructuringPrompt(input, ragContext),
      })

      if (!output) {
        throw new Error('No structured output generated')
      }

      eventBus.emit('requirement.structuring.completed', {
        requirementId,
        attempts: attempt,
      })

      return { success: true, model: output, attempts: attempt }
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)

        eventBus.emit('requirement.structuring.failed', {
          requirementId,
          attempts: attempt,
          error: errorMessage,
        })

        return { success: false, error, attempts: attempt }
      }
      // Silent retry — continue loop
    }
  }

  // TypeScript exhaustiveness: unreachable but satisfies return type
  return { success: false, error: new Error('Unexpected retry exit'), attempts: MAX_RETRIES }
}
