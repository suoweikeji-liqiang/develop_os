import { FiveLayerModelSchema, type FiveLayerModel } from '@/lib/schemas/requirement'
import type { RequirementUnitLayer } from '@/lib/requirement-unit-layer'

interface DraftRequirementUnit {
  title: string
  summary: string
  layer: RequirementUnitLayer
  sourceRef: string
}

function compactLines(lines: Array<string | null | undefined>): string {
  return lines
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line))
    .join('\n')
}

function uniqueByKey(items: DraftRequirementUnit[]): DraftRequirementUnit[] {
  const seen = new Set<string>()
  const next: DraftRequirementUnit[] = []

  for (const item of items) {
    const key = `${item.layer}::${item.title.trim().toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    next.push(item)
  }

  return next
}

export function deriveRequirementUnitsFromModel(modelInput: unknown): DraftRequirementUnit[] {
  const model = FiveLayerModelSchema.parse(modelInput) as FiveLayerModel
  const drafts: DraftRequirementUnit[] = []

  drafts.push({
    title: '目标与结果基线',
    layer: 'goal',
    sourceRef: 'goal',
    summary: compactLines([
      `目标：${model.goal.summary}`,
      `现状：${model.goal.before}`,
      `目标态：${model.goal.after}`,
      model.goal.metrics.length > 0 ? `指标：${model.goal.metrics.join('；')}` : null,
    ]),
  })

  for (const actor of model.behavior.actors.slice(0, 8)) {
    drafts.push({
      title: `${actor}职责与参与边界`,
      layer: 'role',
      sourceRef: `behavior.actor:${actor}`,
      summary: compactLines([
        `角色：${actor}`,
        `该角色参与的动作需要在后续继续细化权限、异常与界面边界。`,
      ]),
    })
  }

  for (const scenario of model.scenario.normal.slice(0, 6)) {
    drafts.push({
      title: scenario.name,
      layer: 'scenario',
      sourceRef: `scenario.normal:${scenario.name}`,
      summary: compactLines([
        '主流程：',
        ...scenario.steps.map((step, index) => `${index + 1}. ${step}`),
      ]),
    })
  }

  for (const scenario of model.scenario.edge.slice(0, 4)) {
    drafts.push({
      title: scenario.name,
      layer: 'exception',
      sourceRef: `scenario.edge:${scenario.name}`,
      summary: compactLines([
        `触发条件：${scenario.trigger}`,
        ...scenario.steps.map((step, index) => `${index + 1}. ${step}`),
      ]),
    })
  }

  for (const scenario of model.scenario.error.slice(0, 4)) {
    drafts.push({
      title: scenario.name,
      layer: 'exception',
      sourceRef: `scenario.error:${scenario.name}`,
      summary: compactLines([
        '异常处理：',
        ...scenario.steps.map((step, index) => `${index + 1}. ${step}`),
        `恢复方式：${scenario.recovery}`,
      ]),
    })
  }

  if (model.verifiability.automated.length > 0 || model.verifiability.manual.length > 0) {
    drafts.push({
      title: '验证与验收基线',
      layer: 'constraint',
      sourceRef: 'verifiability',
      summary: compactLines([
        model.verifiability.automated.length > 0
          ? `自动化验证：${model.verifiability.automated.map((item) => item.criterion).join('；')}`
          : null,
        model.verifiability.manual.length > 0
          ? `人工验证：${model.verifiability.manual.map((item) => item.criterion).join('；')}`
          : null,
      ]),
    })
  }

  return uniqueByKey(drafts)
}
