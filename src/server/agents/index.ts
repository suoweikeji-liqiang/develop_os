import { clarifierAgent } from './clarifier-agent'
import { conflictDetectorAgent } from './conflict-detector-agent'
import { testCaseGeneratorAgent } from './test-case-generator-agent'

export const defaultAgents = [clarifierAgent, conflictDetectorAgent, testCaseGeneratorAgent]
