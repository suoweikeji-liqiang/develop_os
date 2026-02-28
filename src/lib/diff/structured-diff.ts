import diff, { type Difference } from 'microdiff'
import type { FiveLayerModel } from '@/lib/schemas/requirement'

export type DiffType = 'CREATE' | 'CHANGE' | 'REMOVE'

export interface LayerDiffEntry {
  readonly path: string[]
  readonly type: DiffType
  readonly oldValue?: unknown
  readonly newValue?: unknown
  readonly label: string
}

export interface StructuredDiff {
  readonly goal: readonly LayerDiffEntry[]
  readonly assumption: readonly LayerDiffEntry[]
  readonly behavior: readonly LayerDiffEntry[]
  readonly scenario: readonly LayerDiffEntry[]
  readonly verifiability: readonly LayerDiffEntry[]
  readonly summary: {
    readonly added: number
    readonly changed: number
    readonly removed: number
  }
}

const LAYER_KEYS: ReadonlyArray<keyof FiveLayerModel> = [
  'goal',
  'assumption',
  'behavior',
  'scenario',
  'verifiability',
] as const

const LAYER_LABELS: Record<string, Record<string, string>> = {
  goal: {
    summary: '修改了目标概述',
    before: '修改了目标前置状态',
    after: '修改了目标后置状态',
    metrics: '修改了成功指标',
    _default: '修改了目标',
    _add: '添加了目标字段',
    _remove: '删除了目标字段',
  },
  assumption: {
    items: '修改了假设',
    _default: '修改了假设',
    _add: '添加了假设',
    _remove: '删除了假设',
  },
  behavior: {
    actors: '修改了参与者',
    actions: '修改了行为动作',
    _default: '修改了行为',
    _add: '添加了行为',
    _remove: '删除了行为',
  },
  scenario: {
    normal: '修改了正常场景',
    edge: '修改了边界场景',
    error: '修改了错误场景',
    _default: '修改了场景',
    _add: '添加了场景',
    _remove: '删除了场景',
  },
  verifiability: {
    automated: '修改了自动化验证标准',
    manual: '修改了人工验证标准',
    _default: '修改了可验证性',
    _add: '添加了验证标准',
    _remove: '删除了验证标准',
  },
}

function mapDiffType(microdiffType: Difference['type']): DiffType {
  switch (microdiffType) {
    case 'CREATE': return 'CREATE'
    case 'CHANGE': return 'CHANGE'
    case 'REMOVE': return 'REMOVE'
  }
}

function buildChangeLabel(layer: string, change: Difference): string {
  const labels = LAYER_LABELS[layer] ?? {}
  const path = change.path
  const topKey = typeof path[0] === 'string' ? path[0] : ''
  const diffType = change.type

  // Array item index detection
  const arrayIndex = path.find((p): p is number => typeof p === 'number')

  if (diffType === 'CREATE') {
    const addLabel = labels._add ?? `添加了${layer}字段`
    if (arrayIndex !== undefined) {
      return `${addLabel} #${arrayIndex + 1}`
    }
    return topKey ? (labels[topKey] ?? addLabel) : addLabel
  }

  if (diffType === 'REMOVE') {
    const removeLabel = labels._remove ?? `删除了${layer}字段`
    if (arrayIndex !== undefined) {
      return `${removeLabel} #${arrayIndex + 1}`
    }
    return topKey ? (labels[topKey] ?? removeLabel) : removeLabel
  }

  // CHANGE
  const baseLabel = topKey ? (labels[topKey] ?? labels._default ?? `修改了${layer}`) : (labels._default ?? `修改了${layer}`)

  if (arrayIndex !== undefined && path.length > 1) {
    const fieldAfterIndex = path.find((p, i) => i > path.indexOf(arrayIndex) && typeof p === 'string')
    if (fieldAfterIndex) {
      return `${baseLabel} #${arrayIndex + 1} 的 ${String(fieldAfterIndex)}`
    }
    return `${baseLabel} #${arrayIndex + 1}`
  }

  return baseLabel
}

function toLayerDiffEntry(change: Difference, layer: string): LayerDiffEntry {
  const type = mapDiffType(change.type)
  const label = buildChangeLabel(layer, change)

  const entry: LayerDiffEntry = {
    path: change.path.map(String),
    type,
    label,
    ...(change.type === 'CREATE' ? { newValue: change.value } : {}),
    ...(change.type === 'CHANGE' ? { oldValue: change.oldValue, newValue: change.value } : {}),
    ...(change.type === 'REMOVE' ? { oldValue: change.oldValue } : {}),
  }

  return entry
}

export function computeStructuredDiff(
  oldModel: FiveLayerModel,
  newModel: FiveLayerModel,
): StructuredDiff {
  let added = 0
  let changed = 0
  let removed = 0

  const result = {} as Record<keyof FiveLayerModel, LayerDiffEntry[]>

  for (const layer of LAYER_KEYS) {
    const oldLayer = oldModel[layer] ?? {}
    const newLayer = newModel[layer] ?? {}
    const changes = diff(oldLayer, newLayer)

    const entries = changes.map((c) => toLayerDiffEntry(c, layer))

    for (const entry of entries) {
      switch (entry.type) {
        case 'CREATE': added++; break
        case 'CHANGE': changed++; break
        case 'REMOVE': removed++; break
      }
    }

    result[layer] = entries
  }

  return {
    ...result,
    summary: { added, changed, removed },
  }
}
