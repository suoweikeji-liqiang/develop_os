import { describe, expect, it } from 'vitest'
import '@/server/agents'
import { agentRegistry } from './registry'

describe('agent registry', () => {
  it('registers the built-in agents', () => {
    const agents = agentRegistry.list()
    expect(agents.some((agent) => agent.id === 'clarifier')).toBe(true)
    expect(agents.some((agent) => agent.id === 'conflict-detector')).toBe(true)
    expect(agents.some((agent) => agent.id === 'test-case-generator')).toBe(true)
  })

  it('throws on unknown agent ids', () => {
    expect(() => agentRegistry.get('missing-agent')).toThrow('Agent plugin not found')
  })
})
