import { z } from 'zod'
import { generateStructuredOutput } from './structured-output'
import {
  ClarificationAnswerResultSchema,
  type ClarificationAnswerResult,
  RequirementStructuredBundleSchema,
  type RequirementStructuredBundle,
  SpecDraftSchema,
  type SpecDraft,
} from '@/lib/schemas/clarification'
import type { FiveLayerModel } from '@/lib/schemas/requirement'

const RETRY_TIMES = 3

const STRUCTURE_PROMPT = `You are a senior product + tech analyst. Convert raw requirement input into an executable structured bundle.
Rules:
1) Return STRICT JSON only.
2) Fill unknown fields with explicit "Unknown".
3) Provide >=5 clarificationQuestions, >=3 assumptions/risks.
4) Questions should cover GOAL, SCOPE, USER, IO, CONSTRAINT, ACCEPTANCE when possible.`

const ANSWER_PROMPT = `You update only impacted fields from one clarification Q&A.
Rules:
1) Return strict JSON.
2) modelPatch contains JSON-path-like dot paths rooted at model.
3) Each patch item must include confidence/rationale/evidence.`

const SPEC_PROMPT = `Generate final executable spec sections from current model and clarification context.
Return strict JSON.`

export async function deriveStructuredBundle(input: { title: string; rawInput: string }): Promise<RequirementStructuredBundle> {
  let lastError: unknown
  for (let i = 0; i < RETRY_TIMES; i++) {
    try {
      return await generateStructuredOutput({
        schema: RequirementStructuredBundleSchema,
        schemaName: 'requirement_structured_bundle',
        prompt: `${STRUCTURE_PROMPT}\n\nTitle: ${input.title}\nRawInput:\n${input.rawInput}`,
      })
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

export async function deriveClarificationPatch(input: {
  questionId: string
  questionText: string
  answerText: string
  currentModel: FiveLayerModel
}): Promise<ClarificationAnswerResult> {
  let lastError: unknown
  for (let i = 0; i < RETRY_TIMES; i++) {
    try {
      return await generateStructuredOutput({
        schema: ClarificationAnswerResultSchema,
        schemaName: 'clarification_patch',
        prompt: `${ANSWER_PROMPT}\n\nQuestionId: ${input.questionId}\nQuestion: ${input.questionText}\nAnswer: ${input.answerText}\nCurrentModel:${JSON.stringify(input.currentModel)}`,
      })
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

export async function deriveSpecDraft(input: {
  model: FiveLayerModel
  assumptions: Array<{ type: string; content: string }>
  decisionPoints: Array<{ title: string; selected?: string | null; options?: string[] }>
}): Promise<SpecDraft> {
  let lastError: unknown
  for (let i = 0; i < RETRY_TIMES; i++) {
    try {
      return await generateStructuredOutput({
        schema: SpecDraftSchema,
        schemaName: 'spec_draft',
        prompt: `${SPEC_PROMPT}\n\nModel:${JSON.stringify(input.model)}\nAssumptions:${JSON.stringify(input.assumptions)}\nDecisionPoints:${JSON.stringify(input.decisionPoints)}`,
      })
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

export function applyPathPatch<T extends object>(target: T, path: string, value: unknown): T {
  const segments = path.replace(/^model\./, '').split('.').filter(Boolean)
  const cloned = structuredClone(target) as Record<string, unknown>
  let cursor: Record<string, unknown> = cloned

  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i]
    const next = cursor[key]
    if (next === null || typeof next !== 'object' || Array.isArray(next)) {
      cursor[key] = {}
    }
    cursor = cursor[key] as Record<string, unknown>
  }

  const lastKey = segments[segments.length - 1]
  cursor[lastKey] = value
  return cloned as T
}

const CompletenessCheckSchema = z.object({
  score: z.number().min(0).max(100),
  missingFields: z.array(z.string()),
})

export function computeCompleteness(model: FiveLayerModel | null | undefined): z.infer<typeof CompletenessCheckSchema> {
  if (!model) {
    return { score: 0, missingFields: ['goal.summary', 'behavior.actions', 'scenario.normal', 'verifiability.automated'] }
  }

  const missing: string[] = []
  const unknown = (value?: string) => !value || value.trim().toLowerCase() === 'unknown'

  if (unknown(model.goal.summary)) missing.push('goal.summary')
  if (!model.goal.metrics.length) missing.push('goal.metrics')
  if (!model.behavior.actors.length) missing.push('behavior.actors')
  if (!model.behavior.actions.length) missing.push('behavior.actions')
  if (!model.scenario.normal.length) missing.push('scenario.normal')
  if (!model.scenario.edge.length) missing.push('scenario.edge')
  if (!model.scenario.error.length) missing.push('scenario.error')
  if (!model.verifiability.automated.length && !model.verifiability.manual.length) {
    missing.push('verifiability')
  }
  if (!model.assumption.items.length) missing.push('assumption.items')

  const score = Math.max(0, Math.round(((10 - missing.length) / 10) * 100))
  return CompletenessCheckSchema.parse({ score, missingFields: missing })
}

export function renderSpecMarkdown(spec: SpecDraft): string {
  return `# Spec Draft\n\n## 1. 背景与目标\n${spec.backgroundAndGoals}\n\n## 2. In/Out of scope\n### In Scope\n${spec.scope.inScope.map((item) => `- ${item}`).join('\n')}\n\n### Out of Scope\n${spec.scope.outOfScope.map((item) => `- ${item}`).join('\n')}\n\n## 3. 用户与使用场景\n${spec.usersAndScenarios.map((item) => `- ${item}`).join('\n')}\n\n## 4. 功能列表（Must/Should/Could）\n### Must\n${spec.featureList.must.map((item) => `- ${item}`).join('\n')}\n\n### Should\n${spec.featureList.should.map((item) => `- ${item}`).join('\n')}\n\n### Could\n${spec.featureList.could.map((item) => `- ${item}`).join('\n')}\n\n## 5. 约束与非功能指标\n${spec.constraintsAndNfr.map((item) => `- ${item}`).join('\n')}\n\n## 6. 风险与假设\n${spec.risksAndAssumptions.map((item) => `- ${item}`).join('\n')}\n\n## 7. 验收标准\n${spec.acceptanceCriteria.map((item) => `- ${item}`).join('\n')}\n\n## 8. 里程碑与任务列表\n${spec.milestonesAndTasks.map((item) => `- ${item}`).join('\n')}\n`
}
