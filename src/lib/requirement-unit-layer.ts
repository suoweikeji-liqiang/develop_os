import { z } from 'zod'
import { STABILITY_LABELS, type RequirementStabilityLevel } from './requirement-evolution'

export const RequirementUnitLayerEnum = z.enum([
  'goal',
  'role',
  'scenario',
  'flow',
  'data',
  'permission',
  'exception',
  'ui',
  'constraint',
])

export type RequirementUnitLayer = z.infer<typeof RequirementUnitLayerEnum>

interface RequirementUnitLayerProfileSeed {
  label: string
  description: string
  targetStabilityLevel: RequirementStabilityLevel
  targetReason: string
}

interface RequirementUnitLayerProfile extends RequirementUnitLayerProfileSeed {
  key: RequirementUnitLayer
}

const STABILITY_ORDER: Record<RequirementStabilityLevel, number> = {
  S0_IDEA: 0,
  S1_ROUGHLY_DEFINED: 1,
  S2_MAIN_FLOW_CLEAR: 2,
  S3_ALMOST_READY: 3,
  S4_READY_FOR_DEVELOPMENT: 4,
  S5_VERIFIED_STABLE: 5,
}

export const DEFAULT_REQUIREMENT_UNIT_LAYER: RequirementUnitLayer = 'scenario'
export const DEFAULT_REQUIREMENT_UNIT_TARGET_STABILITY_LEVEL: RequirementStabilityLevel = 'S3_ALMOST_READY'

const REQUIREMENT_UNIT_LAYER_PROFILE_SEEDS: Record<RequirementUnitLayer, RequirementUnitLayerProfileSeed> = {
  goal: {
    label: 'Goal',
    description: '目标、前后态和成功指标。',
    targetStabilityLevel: 'S2_MAIN_FLOW_CLEAR',
    targetReason: '目标层先要把边界、前后态和成功指标讲清楚，不要求过早下沉到实现细节。',
  },
  role: {
    label: 'Role',
    description: '角色职责与协作边界。',
    targetStabilityLevel: 'S2_MAIN_FLOW_CLEAR',
    targetReason: '角色层重点是把参与者、责任和协作接口讲清楚，达到主流程清晰即可支撑后续拆分。',
  },
  scenario: {
    label: 'Scenario',
    description: '关键使用场景与主推进骨架。',
    targetStabilityLevel: 'S3_ALMOST_READY',
    targetReason: '场景层直接决定主推进骨架，建议至少接近可设计，以免后续反复返工。',
  },
  flow: {
    label: 'Flow',
    description: '流程编排与步骤顺序。',
    targetStabilityLevel: 'S3_ALMOST_READY',
    targetReason: '流程层需要让步骤顺序、前后依赖和关键分支足够明确，才能支撑设计和开发准备。',
  },
  data: {
    label: 'Data',
    description: '关键对象、字段与输入输出约束。',
    targetStabilityLevel: 'S3_ALMOST_READY',
    targetReason: '数据层如果不接近稳定，会持续影响接口、原型和测试口径，建议至少达到接近可开发的清晰度。',
  },
  permission: {
    label: 'Permission',
    description: '权限边界、角色动作与访问控制。',
    targetStabilityLevel: 'S4_READY_FOR_DEVELOPMENT',
    targetReason: '权限层一旦模糊就会直接阻断实现和验收，推荐在进入开发前达到开发准备。',
  },
  exception: {
    label: 'Exception',
    description: '异常路径、恢复与兜底策略。',
    targetStabilityLevel: 'S4_READY_FOR_DEVELOPMENT',
    targetReason: '异常层直接影响真实可开发性，建议在进入开发前把失败恢复和兜底策略补齐。',
  },
  ui: {
    label: 'UI',
    description: '关键交互、展示和反馈。',
    targetStabilityLevel: 'S3_ALMOST_READY',
    targetReason: 'UI 层需要和场景、流程保持一致，建议至少接近可设计，避免文档和交互脱节。',
  },
  constraint: {
    label: 'Constraint',
    description: '外部约束、验收基线与不可违背条件。',
    targetStabilityLevel: 'S4_READY_FOR_DEVELOPMENT',
    targetReason: '约束层如果不稳定，会在实现和验收时形成硬返工，建议进入开发前达到开发准备。',
  },
}

export const REQUIREMENT_UNIT_LAYER_OPTIONS = RequirementUnitLayerEnum.options.map((value) => ({
  value,
  label: REQUIREMENT_UNIT_LAYER_PROFILE_SEEDS[value].label,
  description: REQUIREMENT_UNIT_LAYER_PROFILE_SEEDS[value].description,
}))

export function normalizeRequirementUnitLayer(layer: string): string {
  return layer.trim().toLowerCase()
}

export function isRequirementUnitLayer(layer: string): layer is RequirementUnitLayer {
  return RequirementUnitLayerEnum.safeParse(normalizeRequirementUnitLayer(layer)).success
}

export function getRequirementUnitLayerProfile(layer: string | null | undefined): RequirementUnitLayerProfile {
  const normalized = normalizeRequirementUnitLayer(layer ?? '')

  if (isRequirementUnitLayer(normalized)) {
    return {
      key: normalized,
      ...REQUIREMENT_UNIT_LAYER_PROFILE_SEEDS[normalized],
    }
  }

  return {
    key: DEFAULT_REQUIREMENT_UNIT_LAYER,
    label: normalized || 'Custom',
    description: '未归类的颗粒推进单元。',
    targetStabilityLevel: DEFAULT_REQUIREMENT_UNIT_TARGET_STABILITY_LEVEL,
    targetReason: '未归类 layer 当前按通用颗粒推进目标处理，默认建议达到接近可开发的稳定度。',
  }
}

export function getRequirementUnitTargetStabilityLevel(layer: string | null | undefined): RequirementStabilityLevel {
  return getRequirementUnitLayerProfile(layer).targetStabilityLevel
}

export function getRequirementUnitTargetStabilityLabel(layer: string | null | undefined): string {
  return STABILITY_LABELS[getRequirementUnitTargetStabilityLevel(layer)]
}

export function isRequirementUnitAtTarget(layer: string | null | undefined, stabilityLevel: string | null | undefined): boolean {
  if (!stabilityLevel || !(stabilityLevel in STABILITY_ORDER)) return false
  return STABILITY_ORDER[stabilityLevel as RequirementStabilityLevel] >= STABILITY_ORDER[getRequirementUnitTargetStabilityLevel(layer)]
}

export function getRequirementUnitLayerTargetGroups() {
  const grouped = new Map<RequirementStabilityLevel, RequirementUnitLayerProfile[]>()

  for (const value of RequirementUnitLayerEnum.options) {
    const profile = getRequirementUnitLayerProfile(value)
    const current = grouped.get(profile.targetStabilityLevel) ?? []
    grouped.set(profile.targetStabilityLevel, [...current, profile])
  }

  return Array.from(grouped.entries())
    .map(([targetStabilityLevel, profiles]) => ({
      targetStabilityLevel,
      targetLabel: STABILITY_LABELS[targetStabilityLevel],
      layers: profiles
        .map((profile) => ({
          key: profile.key,
          label: profile.label,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    }))
    .sort((a, b) => STABILITY_ORDER[a.targetStabilityLevel] - STABILITY_ORDER[b.targetStabilityLevel])
}

export function getRequirementUnitLayerGuidanceMessage(layer: string | null | undefined, stabilityLevel: string | null | undefined): string {
  const profile = getRequirementUnitLayerProfile(layer)

  if (isRequirementUnitAtTarget(layer, stabilityLevel)) {
    return `${profile.label} 层已达到推荐目标 ${STABILITY_LABELS[profile.targetStabilityLevel]}，可以继续推进相关设计或开发准备。`
  }

  return `${profile.label} 层当前推荐目标是 ${STABILITY_LABELS[profile.targetStabilityLevel]}。${profile.targetReason}`
}
