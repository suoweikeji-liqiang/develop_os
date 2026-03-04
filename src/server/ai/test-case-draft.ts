import { z } from 'zod'
import type { FiveLayerModel } from '@/lib/schemas/requirement'
import type { TestCase, TestCaseSuite } from '@/lib/schemas/test-case'

const CompactTestCaseDraftSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['functional', 'edge', 'error', 'permission', 'integration', 'manual']),
  priority: z.enum(['P0', 'P1', 'P2']),
  objective: z.string().min(1),
  anchors: z.array(z.string().min(1)).min(1).max(3),
  steps: z.array(z.string().min(1)).min(1).max(5),
  expectedResults: z.array(z.string().min(1)).min(1).max(4),
  automationCandidate: z.boolean(),
})

export const CompactTestCaseSuiteDraftSchema = z.object({
  summary: z.string().min(1),
  coverageFocus: z.array(z.string().min(1)).min(1).max(5),
  risks: z.array(z.string().min(1)).max(5),
  cases: z.array(CompactTestCaseDraftSchema).min(4).max(8),
})

export type CompactTestCaseSuiteDraft = z.infer<typeof CompactTestCaseSuiteDraftSchema>

export const COMPACT_TEST_CASE_DRAFT_SHAPE_HINT = `{
  "summary": "string",
  "coverageFocus": ["string"],
  "risks": ["string"],
  "cases": [
    {
      "title": "string",
      "type": "functional | edge | error | permission | integration | manual",
      "priority": "P0 | P1 | P2",
      "objective": "string",
      "anchors": [
        "quote short phrases copied from the requirement model"
      ],
      "steps": ["string"],
      "expectedResults": ["string"],
      "automationCandidate": true
    }
  ]
}`

type LayerKey = 'goal' | 'assumption' | 'behavior' | 'scenario' | 'verifiability'

interface SourceDescriptor {
  text: string
  layers: LayerKey[]
  preconditions: string[]
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function compactText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.map((value) => compactText(value)).filter(Boolean))]
}

function collectSourceDescriptors(model: FiveLayerModel): SourceDescriptor[] {
  const sources: SourceDescriptor[] = []

  sources.push({
    text: model.goal.summary,
    layers: ['goal'],
    preconditions: [model.goal.before],
  })

  for (const metric of model.goal.metrics) {
    sources.push({
      text: metric,
      layers: ['goal', 'verifiability'],
      preconditions: [model.goal.before],
    })
  }

  for (const item of model.assumption.items) {
    sources.push({
      text: item.content,
      layers: ['assumption'],
      preconditions: [item.rationale],
    })
  }

  for (const action of model.behavior.actions) {
    sources.push({
      text: `${action.actor}: ${action.action}`,
      layers: ['behavior'],
      preconditions: [action.precondition ?? '', model.goal.before],
    })
    sources.push({
      text: action.action,
      layers: ['behavior'],
      preconditions: [action.precondition ?? '', model.goal.before],
    })
  }

  for (const scenario of model.scenario.normal) {
    sources.push({
      text: scenario.name,
      layers: ['scenario', 'behavior'],
      preconditions: [model.goal.before],
    })
  }

  for (const scenario of model.scenario.edge) {
    sources.push({
      text: scenario.name,
      layers: ['scenario', 'behavior'],
      preconditions: [scenario.trigger],
    })
    sources.push({
      text: scenario.trigger,
      layers: ['scenario'],
      preconditions: [scenario.trigger],
    })
  }

  for (const scenario of model.scenario.error) {
    sources.push({
      text: scenario.name,
      layers: ['scenario', 'verifiability'],
      preconditions: [scenario.recovery],
    })
    sources.push({
      text: scenario.recovery,
      layers: ['scenario', 'verifiability'],
      preconditions: [scenario.recovery],
    })
  }

  for (const item of model.verifiability.automated) {
    sources.push({
      text: item.criterion,
      layers: ['verifiability'],
      preconditions: [item.method],
    })
  }

  for (const item of model.verifiability.manual) {
    sources.push({
      text: item.criterion,
      layers: ['verifiability'],
      preconditions: [item.reason],
    })
  }

  return sources
}

function matchSources(anchor: string, sources: SourceDescriptor[]): SourceDescriptor[] {
  const normalizedAnchor = normalizeText(anchor)
  if (!normalizedAnchor) return []

  return sources.filter((source) => {
    const normalizedSource = normalizeText(source.text)
    return normalizedSource.includes(normalizedAnchor) || normalizedAnchor.includes(normalizedSource)
  })
}

function defaultLayersForType(type: TestCase['type']): LayerKey[] {
  if (type === 'functional' || type === 'integration') {
    return ['goal', 'behavior', 'scenario', 'verifiability']
  }

  if (type === 'edge' || type === 'error' || type === 'permission') {
    return ['behavior', 'scenario', 'verifiability']
  }

  return ['goal', 'verifiability']
}

function derivePreconditions(
  type: TestCase['type'],
  matchedSources: SourceDescriptor[],
  model: FiveLayerModel,
): string[] {
  const preconditions = matchedSources.flatMap((source) => source.preconditions)

  if (type === 'manual') {
    preconditions.push('测试环境已具备可观察的页面与通知反馈。')
  } else {
    preconditions.push(model.goal.before)
  }

  return dedupe(preconditions).slice(0, 4)
}

function deriveLayers(
  type: TestCase['type'],
  matchedSources: SourceDescriptor[],
): LayerKey[] {
  return [...new Set([
    ...defaultLayersForType(type),
    ...matchedSources.flatMap((source) => source.layers),
  ])]
}

export function expandCompactTestCaseDraft(
  draft: CompactTestCaseSuiteDraft,
  model: FiveLayerModel,
): TestCaseSuite {
  const sources = collectSourceDescriptors(model)

  const cases: TestCase[] = draft.cases.map((item, index) => {
    const matchedSources = item.anchors.flatMap((anchor) => matchSources(anchor, sources))
    const sourceSignals = dedupe([
      ...item.anchors,
      ...matchedSources.map((source) => source.text),
    ])

    return {
      id: `TC-${String(index + 1).padStart(3, '0')}`,
      title: compactText(item.title),
      type: item.type,
      priority: item.priority,
      objective: compactText(item.objective),
      preconditions: derivePreconditions(item.type, matchedSources, model),
      steps: item.steps.map((step) => compactText(step)),
      expectedResults: item.expectedResults.map((result) => compactText(result)),
      automationCandidate: item.automationCandidate,
      relatedLayers: deriveLayers(item.type, matchedSources),
      sourceSignals,
    }
  })

  return {
    summary: compactText(draft.summary),
    coverageFocus: dedupe(draft.coverageFocus),
    risks: dedupe(draft.risks),
    cases,
  }
}
