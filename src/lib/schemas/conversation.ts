import { z } from 'zod'
import { FiveLayerModelSchema } from '@/lib/schemas/requirement'

const ModelPatchSchema = z.object({
  goal: FiveLayerModelSchema.shape.goal.optional(),
  assumption: FiveLayerModelSchema.shape.assumption.optional(),
  behavior: FiveLayerModelSchema.shape.behavior.optional(),
  scenario: FiveLayerModelSchema.shape.scenario.optional(),
  verifiability: FiveLayerModelSchema.shape.verifiability.optional(),
})

export const ConversationResponseSchema = z.object({
  reply: z.string().describe('Conversational response shown in chat bubble'),
  patches: ModelPatchSchema.optional().describe(
    'Model layer updates proposed by AI — only include layers that changed',
  ),
  newAssumptions: z
    .array(
      z.object({
        content: z.string(),
        confidence: z.enum(['high', 'medium', 'low']),
        rationale: z.string(),
      }),
    )
    .optional()
    .describe(
      'New implicit assumptions surfaced — omit if no genuinely new constraints revealed',
    ),
  affectedLayers: z
    .array(
      z.enum(['goal', 'assumption', 'behavior', 'scenario', 'verifiability']),
    )
    .optional()
    .describe('Which layers are affected by this response'),
})

export type ConversationResponse = z.infer<typeof ConversationResponseSchema>
