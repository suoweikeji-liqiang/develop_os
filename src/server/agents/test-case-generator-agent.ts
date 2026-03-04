import type { FiveLayerModel } from '@/lib/schemas/requirement'
import type { RetrievedChunk } from '@/server/ai/rag/retrieve'
import {
  generateRequirementTestCaseSuite,
  type TestCaseGenerationResult,
} from '@/server/ai/test-case-generation'
import { agentRegistry } from './registry'

export interface TestCaseGeneratorAgentInput {
  requirementId: string
  title: string
  rawInput: string
  model: FiveLayerModel
  sourceVersion: number
  ragContext?: RetrievedChunk[]
}

export type TestCaseGeneratorAgentOutput = TestCaseGenerationResult

export const testCaseGeneratorAgent = agentRegistry.register<
  TestCaseGeneratorAgentInput,
  TestCaseGeneratorAgentOutput
>({
  id: 'test-case-generator',
  label: 'Test Case Generator Agent',
  description: 'Generates a structured suite of test cases from the current requirement model.',
  version: '1.0.0',
  run: async (input, context) => {
    return generateRequirementTestCaseSuite({
      requirementId: input.requirementId,
      title: input.title,
      rawInput: input.rawInput,
      model: input.model,
      sourceVersion: input.sourceVersion,
      userId: context.userId,
      ragContext: input.ragContext ?? [],
    })
  },
})
