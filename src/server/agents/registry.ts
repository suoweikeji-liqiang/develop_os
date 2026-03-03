import type { AgentExecutionContext, AgentPlugin } from './types'

class AgentRegistry {
  private readonly plugins = new Map<string, AgentPlugin>()

  register<TInput, TOutput>(plugin: AgentPlugin<TInput, TOutput>) {
    this.plugins.set(plugin.id, plugin as AgentPlugin)
    return plugin
  }

  get<TInput, TOutput>(id: string): AgentPlugin<TInput, TOutput> {
    const plugin = this.plugins.get(id)
    if (!plugin) {
      throw new Error(`Agent plugin not found: ${id}`)
    }
    return plugin as AgentPlugin<TInput, TOutput>
  }

  list(): AgentPlugin[] {
    return [...this.plugins.values()]
  }
}

const globalForAgents = globalThis as unknown as { agentRegistry?: AgentRegistry }

export const agentRegistry = globalForAgents.agentRegistry ?? new AgentRegistry()

if (process.env.NODE_ENV !== 'production') {
  globalForAgents.agentRegistry = agentRegistry
}

export async function runAgent<TInput, TOutput>(
  agentId: string,
  input: TInput,
  context: AgentExecutionContext,
) {
  const plugin = agentRegistry.get<TInput, TOutput>(agentId)
  return plugin.run(input, context)
}
