import { describe, expect, it } from 'vitest'
import {
  getRequirementUnitLayerGuidanceMessage,
  getRequirementUnitLayerProfile,
  getRequirementUnitProgressHint,
  getRequirementUnitLayerTargetGroups,
  getRequirementUnitTargetStabilityLevel,
  isRequirementUnitAtTarget,
} from './requirement-unit-layer'

describe('requirement unit layer rules', () => {
  it('maps core layers to different target stability levels', () => {
    expect(getRequirementUnitTargetStabilityLevel('goal')).toBe('S2_MAIN_FLOW_CLEAR')
    expect(getRequirementUnitTargetStabilityLevel('scenario')).toBe('S3_ALMOST_READY')
    expect(getRequirementUnitTargetStabilityLevel('exception')).toBe('S4_READY_FOR_DEVELOPMENT')
  })

  it('evaluates target achievement by layer instead of a single global line', () => {
    expect(isRequirementUnitAtTarget('goal', 'S2_MAIN_FLOW_CLEAR')).toBe(true)
    expect(isRequirementUnitAtTarget('goal', 'S1_ROUGHLY_DEFINED')).toBe(false)
    expect(isRequirementUnitAtTarget('exception', 'S3_ALMOST_READY')).toBe(false)
    expect(isRequirementUnitAtTarget('exception', 'S4_READY_FOR_DEVELOPMENT')).toBe(true)
  })

  it('exposes guidance copy and grouped target bands', () => {
    const exceptionProfile = getRequirementUnitLayerProfile('exception')
    expect(exceptionProfile.label).toBe('Exception')
    expect(exceptionProfile.targetReason).toContain('进入开发前')

    expect(getRequirementUnitLayerGuidanceMessage('ui', 'S2_MAIN_FLOW_CLEAR')).toContain('S3 Almost Ready')
    expect(getRequirementUnitLayerTargetGroups().map((item) => item.targetStabilityLevel)).toEqual([
      'S2_MAIN_FLOW_CLEAR',
      'S3_ALMOST_READY',
      'S4_READY_FOR_DEVELOPMENT',
    ])
  })

  it('turns layer-aware stability into actionable unit progress hints', () => {
    expect(getRequirementUnitProgressHint({
      layer: 'scenario',
      stabilityLevel: 'S3_ALMOST_READY',
      status: 'READY_FOR_DESIGN',
    }).label).toContain('推进设计')

    expect(getRequirementUnitProgressHint({
      layer: 'exception',
      stabilityLevel: 'S3_ALMOST_READY',
      status: 'REFINING',
    }).kind).toBe('stabilize')
  })
})
