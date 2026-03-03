import { describe, expect, it } from 'vitest'
import {
  GenerationPhase,
  getGenerationPhase,
  getGenerationPhaseMessage,
  getGenerationTimeoutMessage,
} from './generation-phase'

describe('generation phase', () => {
  it('returns phase by elapsed time thresholds', () => {
    expect(getGenerationPhase(0)).toBe(GenerationPhase.ANALYZING)
    expect(getGenerationPhase(999)).toBe(GenerationPhase.ANALYZING)
    expect(getGenerationPhase(1000)).toBe(GenerationPhase.STRUCTURING)
    expect(getGenerationPhase(2999)).toBe(GenerationPhase.STRUCTURING)
    expect(getGenerationPhase(3000)).toBe(GenerationPhase.STRESS_TESTING)
  })

  it('returns semantic copy for each phase', () => {
    expect(getGenerationPhaseMessage(GenerationPhase.ANALYZING)).toContain('Analyzing structural intent')
    expect(getGenerationPhaseMessage(GenerationPhase.STRUCTURING)).toContain('Constructing abstraction model')
    expect(getGenerationPhaseMessage(GenerationPhase.STRESS_TESTING)).toContain('Running boundary stress tests')
    expect(getGenerationPhaseMessage(GenerationPhase.COMPLETE)).toContain('Model abstraction is ready')
  })

  it('returns timeout message only after six seconds', () => {
    expect(getGenerationTimeoutMessage(5999)).toBeNull()
    expect(getGenerationTimeoutMessage(6001)).toBe(
      'This abstraction requires deeper structural computation...'
    )
  })
})
