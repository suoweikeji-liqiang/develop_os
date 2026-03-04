import { z } from 'zod'
import { FiveLayerModelSchema } from './requirement'

export const ClarificationQuestionCategorySchema = z.enum([
  'GOAL',
  'SCOPE',
  'USER',
  'IO',
  'CONSTRAINT',
  'ACCEPTANCE',
  'RISK',
  'OTHER',
])

export const ClarificationQuestionStatusSchema = z.enum(['OPEN', 'ANSWERED', 'RESOLVED', 'SKIPPED'])

export const ClarificationSessionStatusSchema = z.enum(['OPEN', 'CLOSED'])

export const ChangeSourceSchema = z.enum(['manual', 'ai-structure', 'ai-converse', 'assumption'])

export const UnknownableStringSchema = z.string().min(1).default('Unknown')

export const RequirementStructuredBundleSchema = z.object({
  model: FiveLayerModelSchema,
  assumptions: z.array(z.object({
    type: z.enum(['assumption', 'risk']),
    content: z.string(),
    confidence: z.enum(['high', 'medium', 'low']).default('medium'),
    rationale: z.string().default('Derived from raw input and pending clarification.'),
  })).min(3),
  clarificationQuestions: z.array(z.object({
    category: ClarificationQuestionCategorySchema,
    questionText: z.string().min(6),
  })).min(5),
  decisionPoints: z.array(z.object({
    title: z.string(),
    options: z.array(z.string()).min(2),
    recommendation: z.string().optional(),
  })).default([]),
})

export type RequirementStructuredBundle = z.infer<typeof RequirementStructuredBundleSchema>

export const ClarificationAnswerResultSchema = z.object({
  modelPatch: z.array(z.object({
    path: z.string().min(1),
    value: z.unknown(),
    confidence: z.number().min(0).max(1),
    rationale: z.string().min(1),
    evidence: z.array(z.string()).min(1),
  })),
  resolved: z.boolean().default(false),
})

export type ClarificationAnswerResult = z.infer<typeof ClarificationAnswerResultSchema>

export const SpecDraftSchema = z.object({
  backgroundAndGoals: z.string(),
  scope: z.object({
    inScope: z.array(z.string()),
    outOfScope: z.array(z.string()),
  }),
  usersAndScenarios: z.array(z.string()),
  featureList: z.object({
    must: z.array(z.string()),
    should: z.array(z.string()),
    could: z.array(z.string()),
  }),
  constraintsAndNfr: z.array(z.string()),
  risksAndAssumptions: z.array(z.string()),
  acceptanceCriteria: z.array(z.string()),
  milestonesAndTasks: z.array(z.string()),
})

export type SpecDraft = z.infer<typeof SpecDraftSchema>
