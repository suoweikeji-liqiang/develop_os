export enum GenerationPhase {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  STRUCTURING = 'STRUCTURING',
  STRESS_TESTING = 'STRESS_TESTING',
  COMPLETE = 'COMPLETE',
}

export function getGenerationPhase(elapsedMs: number): GenerationPhase {
  if (elapsedMs >= 3000) return GenerationPhase.STRESS_TESTING
  if (elapsedMs >= 1000) return GenerationPhase.STRUCTURING
  return GenerationPhase.ANALYZING
}

export function getGenerationPhaseMessage(phase: GenerationPhase): string {
  switch (phase) {
    case GenerationPhase.ANALYZING:
      return 'Analyzing structural intent...'
    case GenerationPhase.STRUCTURING:
      return 'Constructing abstraction model...'
    case GenerationPhase.STRESS_TESTING:
      return 'Running boundary stress tests...'
    case GenerationPhase.COMPLETE:
      return 'Model abstraction is ready.'
    default:
      return 'Awaiting generation...'
  }
}

export function getGenerationTimeoutMessage(elapsedMs: number): string | null {
  if (elapsedMs > 6000) {
    return 'This abstraction requires deeper structural computation...'
  }
  return null
}
