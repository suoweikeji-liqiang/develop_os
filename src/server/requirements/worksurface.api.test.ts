import { describe, expect, it } from 'vitest'
import { buildRequirementImpactSummary, summarizeUnitsBelowLayerTarget } from './worksurface'

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
})
