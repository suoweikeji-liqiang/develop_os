import { z } from 'zod'

export const TestCaseTypeSchema = z.enum([
  'functional',
  'edge',
  'error',
  'permission',
  'integration',
  'manual',
])

export const TestCasePrioritySchema = z.enum(['P0', 'P1', 'P2'])

export const TestCaseLayerSchema = z.enum([
  'goal',
  'assumption',
  'behavior',
  'scenario',
  'verifiability',
])

export const TestCaseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: TestCaseTypeSchema,
  priority: TestCasePrioritySchema,
  objective: z.string().min(1),
  preconditions: z.array(z.string().min(1)),
  steps: z.array(z.string().min(1)).min(1),
  expectedResults: z.array(z.string().min(1)).min(1),
  automationCandidate: z.boolean(),
  relatedLayers: z.array(TestCaseLayerSchema).min(1),
  sourceSignals: z.array(z.string().min(1)).min(1),
})

export const TestCaseSuiteSchema = z.object({
  summary: z.string().min(1),
  coverageFocus: z.array(z.string().min(1)).min(1),
  risks: z.array(z.string().min(1)),
  cases: z.array(TestCaseSchema).min(3).max(12),
})

export type TestCase = z.infer<typeof TestCaseSchema>
export type TestCaseSuite = z.infer<typeof TestCaseSuiteSchema>
