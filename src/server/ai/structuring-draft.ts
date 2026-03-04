import { z } from 'zod'
import type { FiveLayerModel } from '@/lib/schemas/requirement'

const NonEmptyString = z.string().trim().min(1)
const ConfidenceLevel = z.enum(['high', 'medium', 'low'])

const CompactScenarioSchema = z.object({
  name: NonEmptyString,
  steps: z.array(NonEmptyString).min(2).max(3),
})

const CompactEdgeScenarioSchema = CompactScenarioSchema.extend({
  trigger: NonEmptyString,
})

const CompactErrorScenarioSchema = CompactScenarioSchema.extend({
  recovery: NonEmptyString,
})

export const CompactStructuringDraftSchema = z.object({
  summary: NonEmptyString,
  before: NonEmptyString,
  after: NonEmptyString,
  actors: z.array(NonEmptyString).min(1).max(3),
  metrics: z.array(NonEmptyString).min(1).max(2),
  assumptions: z.array(
    z.object({
      content: NonEmptyString,
      confidence: ConfidenceLevel,
    }),
  ).min(1).max(3),
  actions: z.array(
    z.object({
      actor: NonEmptyString,
      action: NonEmptyString,
    }),
  ).min(2).max(4),
  scenarios: z.object({
    normal: z.array(CompactScenarioSchema).min(1).max(1),
    edge: z.array(CompactEdgeScenarioSchema).min(1).max(1),
    error: z.array(CompactErrorScenarioSchema).min(1).max(1),
  }),
  automatedChecks: z.array(NonEmptyString).min(1).max(2),
  manualChecks: z.array(NonEmptyString).min(1).max(2),
})

export type CompactStructuringDraft = z.infer<typeof CompactStructuringDraftSchema>

export const COMPACT_STRUCTURING_DRAFT_SHAPE_HINT = `{
  "summary": "string",
  "before": "string",
  "after": "string",
  "actors": ["string"],
  "metrics": ["string"],
  "assumptions": [
    {
      "content": "string",
      "confidence": "high | medium | low"
    }
  ],
  "actions": [
    {
      "actor": "string",
      "action": "string"
    }
  ],
  "scenarios": {
    "normal": [{ "name": "string", "steps": ["string"] }],
    "edge": [{ "name": "string", "trigger": "string", "steps": ["string"] }],
    "error": [{ "name": "string", "recovery": "string", "steps": ["string"] }]
  },
  "automatedChecks": ["string"],
  "manualChecks": ["string"]
}`

function uniqueValues(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function buildAssumptionRationale(
  content: string,
  confidence: CompactStructuringDraft['assumptions'][number]['confidence'],
): string {
  if (confidence === 'high') {
    return `需求描述已经把“${content}”作为关键前提，若不成立会直接影响方案落地。`
  }

  if (confidence === 'low') {
    return `当前输入对“${content}”的支撑较弱，需要补充业务数据或规则后再确认。`
  }

  return `“${content}”与当前需求高度相关，但边界和例外情况仍需要在评审中核实。`
}

function buildActionPrecondition(
  index: number,
  draft: CompactStructuringDraft,
): string | undefined {
  if (index === 0) {
    return `已具备启动“${draft.summary}”所需的基础上下文与触发条件。`
  }

  return `上一步已经完成：${draft.actions[index - 1]?.action ?? draft.summary}`
}

function buildActionPostcondition(
  index: number,
  draft: CompactStructuringDraft,
): string | undefined {
  if (index === draft.actions.length - 1) {
    return `核心流程闭环，可以据此验证“${draft.summary}”是否达成。`
  }

  return `为下一步“${draft.actions[index + 1]?.action ?? draft.summary}”提供输入。`
}

function buildAutomatedMethod(criterion: string): string {
  return `为“${criterion}”编写接口、服务或端到端断言，并验证结果符合预期。`
}

function buildManualReason(criterion: string): string {
  return `“${criterion}”仍需要业务或设计判断语义是否正确，暂不适合完全自动化。`
}

function buildFallbackNormalScenario(draft: CompactStructuringDraft) {
  return {
    name: '完成关键闭环',
    steps: draft.actions.map((item) => `${item.actor}${item.action}`),
  }
}

function buildFallbackEdgeScenario(draft: CompactStructuringDraft) {
  return {
    name: '关键信息不足',
    trigger: `执行“${draft.summary}”时缺少必要输入或上下文。`,
    steps: [
      '系统识别当前输入不足以支撑完整闭环',
      '流程保留核心目标与待确认项',
      '团队补充信息后继续推进',
    ],
  }
}

function buildFallbackErrorScenario(draft: CompactStructuringDraft) {
  return {
    name: '执行过程异常',
    recovery: `中断当前流程并保留“${draft.summary}”相关上下文，等待人工处理或重试。`,
    steps: [
      '系统检测到关键步骤失败',
      '系统阻断错误继续扩散',
      '团队根据保留的上下文重新处理',
    ],
  }
}

export function expandCompactStructuringDraft(
  draft: CompactStructuringDraft,
): FiveLayerModel {
  const actors = uniqueValues([
    ...draft.actors,
    ...draft.actions.map((item) => item.actor),
  ])

  return {
    goal: {
      summary: draft.summary,
      before: draft.before,
      after: draft.after,
      metrics: uniqueValues(draft.metrics),
    },
    assumption: {
      items: draft.assumptions.map((item) => ({
        content: item.content,
        confidence: item.confidence,
        rationale: buildAssumptionRationale(item.content, item.confidence),
      })),
    },
    behavior: {
      actors,
      actions: draft.actions.map((item, index) => ({
        actor: item.actor,
        action: item.action,
        precondition: buildActionPrecondition(index, draft),
        postcondition: buildActionPostcondition(index, draft),
      })),
    },
    scenario: {
      normal: draft.scenarios.normal.length > 0
        ? draft.scenarios.normal
        : [buildFallbackNormalScenario(draft)],
      edge: draft.scenarios.edge.length > 0
        ? draft.scenarios.edge
        : [buildFallbackEdgeScenario(draft)],
      error: draft.scenarios.error.length > 0
        ? draft.scenarios.error
        : [buildFallbackErrorScenario(draft)],
    },
    verifiability: {
      automated: uniqueValues(draft.automatedChecks).map((criterion) => ({
        criterion,
        method: buildAutomatedMethod(criterion),
      })),
      manual: uniqueValues(draft.manualChecks).map((criterion) => ({
        criterion,
        reason: buildManualReason(criterion),
      })),
    },
  }
}
