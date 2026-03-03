import { generateStructuredModel, type StructuringResult } from '@/server/ai/structuring'
import type { RetrievedChunk } from '@/server/ai/rag/retrieve'
import { agentRegistry } from './registry'

export interface ClarifierAgentInput {
  rawInput: string
  requirementId: string
  ragContext?: RetrievedChunk[]
}

export type ClarifierAgentOutput = StructuringResult

export const clarifierAgent = agentRegistry.register<ClarifierAgentInput, ClarifierAgentOutput>({
  id: 'clarifier',
  label: 'Clarifier Agent',
  description: 'Generates the five-layer requirement model from natural language input.',
  version: '1.0.0',
  run: async (input, context) => {
    return generateStructuredModel(
      input.rawInput,
      input.requirementId,
      context.userId,
      input.ragContext ?? [],
    )
  },
})
