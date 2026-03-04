import { describe, expect, it } from 'vitest'
import { FiveLayerModelSchema } from '@/lib/schemas/requirement'
import {
  applyPathPatch,
  computeCompleteness,
  renderSpecMarkdown,
} from '@/server/ai/clarification'
import { RequirementStructuredBundleSchema } from '@/lib/schemas/clarification'

const baseModel = FiveLayerModelSchema.parse({
  goal: {
    summary: 'Improve checkout conversion',
    before: 'Users abandon in checkout',
    after: 'Checkout flow is simplified',
    metrics: ['Conversion +10%'],
  },
  assumption: {
    items: [{ content: 'Users prefer fewer steps', confidence: 'medium', rationale: 'Observed support tickets' }],
  },
  behavior: {
    actors: ['Buyer', 'System'],
    actions: [{ actor: 'Buyer', action: 'Submit order' }],
  },
  scenario: {
    normal: [{ name: 'Happy path', steps: ['Input', 'Submit'] }],
    edge: [{ name: 'Slow network', trigger: 'latency', steps: ['Retry'] }],
    error: [{ name: 'Payment fails', recovery: 'Show retry', steps: ['Fail', 'Recover'] }],
  },
  verifiability: {
    automated: [{ criterion: 'Order succeeds', method: 'integration test' }],
    manual: [],
  },
})

describe('clarification utilities', () => {
  it('applies path patch without mutating original model', () => {
    const patched = applyPathPatch(baseModel, 'model.goal.summary', 'Improve checkout conversion by 15%')

    expect(baseModel.goal.summary).toBe('Improve checkout conversion')
    expect(patched.goal.summary).toBe('Improve checkout conversion by 15%')
  })

  it('computes completeness and missing fields', () => {
    const score = computeCompleteness(baseModel)
    expect(score.score).toBeGreaterThan(70)
    expect(score.missingFields).toEqual([])

    const incomplete = applyPathPatch(baseModel, 'model.goal.summary', 'Unknown')
    const score2 = computeCompleteness(incomplete)
    expect(score2.missingFields).toContain('goal.summary')
    expect(score2.score).toBeLessThan(score.score)
  })

  it('validates structured bundle schema and renders spec markdown sections', () => {
    const bundle = RequirementStructuredBundleSchema.parse({
      model: baseModel,
      assumptions: [
        { type: 'assumption', content: 'Backend capacity is sufficient', confidence: 'medium', rationale: 'initial estimate' },
        { type: 'risk', content: 'Third-party payment latency', confidence: 'medium', rationale: 'history' },
        { type: 'risk', content: 'Mobile UI regressions', confidence: 'low', rationale: 'new flow' },
      ],
      clarificationQuestions: [
        { category: 'GOAL', questionText: 'How do we define success KPI?' },
        { category: 'SCOPE', questionText: 'Should guest checkout be included?' },
        { category: 'USER', questionText: 'Which user segment is first priority?' },
        { category: 'IO', questionText: 'What are required checkout inputs/outputs?' },
        { category: 'ACCEPTANCE', questionText: 'What acceptance test threshold is required?' },
      ],
      decisionPoints: [{ title: 'Payment fallback', options: ['A', 'B'] }],
    })

    expect(bundle.clarificationQuestions).toHaveLength(5)

    const markdown = renderSpecMarkdown({
      backgroundAndGoals: 'Increase conversion',
      scope: { inScope: ['Checkout page'], outOfScope: ['Catalog'] },
      usersAndScenarios: ['Buyer completes order'],
      featureList: { must: ['One-page checkout'], should: ['Address autofill'], could: ['Promo hints'] },
      constraintsAndNfr: ['p95 < 300ms'],
      risksAndAssumptions: ['Payment gateway instability'],
      acceptanceCriteria: ['Conversion >= baseline +10%'],
      milestonesAndTasks: ['Design', 'Build', 'QA'],
    })

    expect(markdown).toContain('## 1. 背景与目标')
    expect(markdown).toContain('## 8. 里程碑与任务列表')
  })
})
