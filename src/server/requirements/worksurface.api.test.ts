import { describe, expect, it } from 'vitest'
import {
  buildRequirementImpactSummary,
  buildRequirementStabilityGovernance,
  summarizeUnitsBelowLayerTarget,
} from './worksurface'

describe('requirement worksurface impact summary', () => {
  it('explains why the current requirement state affects downstream work', () => {
    const unitsBelowTargetSummary = summarizeUnitsBelowLayerTarget([
      { layer: 'exception', stabilityLevel: 'S2_MAIN_FLOW_CLEAR' },
      { layer: 'exception', stabilityLevel: 'S3_ALMOST_READY' },
      { layer: 'scenario', stabilityLevel: 'S2_MAIN_FLOW_CLEAR' },
      { layer: 'goal', stabilityLevel: 'S2_MAIN_FLOW_CLEAR' },
    ])

    const summary = buildRequirementImpactSummary({
      affectedRequirementUnitCount: 3,
      affectedRequirementUnits: [
        {
          id: 'ru-1',
          unitKey: 'RU-01',
          title: '注册主流程',
          reasons: ['关联阻断问题 Risk', '当前低于 S3_ALMOST_READY 的分层目标'],
        },
      ],
      advanceUnits: [
        {
          id: 'ru-advance',
          unitKey: 'RU-03',
          title: '验证码发送',
          layerLabel: 'Scenario',
          recommendation: '当前已达到本层目标，可继续推进到设计或开发准备。',
        },
      ],
      focusUnits: [
        {
          id: 'ru-focus',
          unitKey: 'RU-02',
          title: '异常兜底',
          layerLabel: 'Exception',
          recommendation: '异常层还未达到开发前目标，建议先补齐失败恢复边界。',
        },
      ],
      openIssueCount: 5,
      blockingIssueCount: 2,
      openConflictCount: 1,
      pendingClarificationCount: 2,
      unitsBelowTarget: 3,
      unitsBelowTargetSummary,
      requirementStabilityLevel: 'S1_ROUGHLY_DEFINED',
    })

    expect(summary.headline).toContain('3 个 Requirement Units')
    expect(summary.nextStep).toContain('Issue Queue')
    expect(summary.openConflictCount).toBe(1)
    expect(summary.pendingClarificationCount).toBe(2)
    expect(summary.unitsBelowTarget).toBe(3)
    expect(summary.affectedRequirementUnits[0]?.unitKey).toBe('RU-01')
    expect(summary.focusUnits[0]?.unitKey).toBe('RU-02')
    expect(summary.advanceUnits[0]?.unitKey).toBe('RU-03')
    expect(summary.nextActions[0]).toContain('阻断问题')
    expect(summary.nextActions.some((action) => action.includes('RU-02'))).toBe(true)
    expect(summary.signals.map((signal) => signal.title)).toEqual(expect.arrayContaining([
      '阻断问题会直接影响推进',
      '冲突投影仍未收敛',
      '澄清问题可能继续外溢',
      '部分 Requirement Units 仍低于分层目标',
      '总体稳定度仍会放大影响面',
    ]))
  })

  it('stays lightweight when no obvious signals exist', () => {
    const summary = buildRequirementImpactSummary({
      affectedRequirementUnitCount: 0,
      affectedRequirementUnits: [],
      advanceUnits: [],
      focusUnits: [],
      openIssueCount: 0,
      blockingIssueCount: 0,
      openConflictCount: 0,
      pendingClarificationCount: 0,
      unitsBelowTarget: 0,
      unitsBelowTargetSummary: [],
      requirementStabilityLevel: 'S4_READY_FOR_DEVELOPMENT',
    })

    expect(summary.mayAffectStability).toBe(false)
    expect(summary.headline).toContain('影响面相对可控')
    expect(summary.signals).toHaveLength(0)
  })

  it('surfaces governance suggestions for ready units, lagging units and stage advance', () => {
    const unitsBelowTargetSummary = summarizeUnitsBelowLayerTarget([
      { layer: 'exception', stabilityLevel: 'S2_MAIN_FLOW_CLEAR' },
      { layer: 'scenario', stabilityLevel: 'S2_MAIN_FLOW_CLEAR' },
    ])

    const governance = buildRequirementStabilityGovernance({
      requirementStatus: 'CONSENSUS',
      requirementStabilityLevel: 'S2_MAIN_FLOW_CLEAR',
      units: [
        {
          id: 'unit-ready',
          unitKey: 'RU-01',
          title: '注册主流程',
          layer: 'scenario',
          status: 'READY_FOR_DESIGN',
          stabilityLevel: 'S3_ALMOST_READY',
        },
        {
          id: 'unit-risk',
          unitKey: 'RU-02',
          title: '异常兜底',
          layer: 'exception',
          status: 'REFINING',
          stabilityLevel: 'S2_MAIN_FLOW_CLEAR',
        },
      ],
      unitsBelowTargetSummary,
      blockingIssueCount: 1,
      openConflictCount: 1,
      pendingClarificationCount: 2,
    })

    expect(governance.readyUnits[0]?.unitKey).toBe('RU-01')
    expect(governance.focusUnits[0]?.unitKey).toBe('RU-02')
    expect(governance.riskLayers[0]?.layerLabel).toBe('Exception')
    expect(governance.stageAdvanceHint.title).toContain('实现中')
    expect(governance.stageAdvanceHint.message).toContain('阻断问题')
  })
})
