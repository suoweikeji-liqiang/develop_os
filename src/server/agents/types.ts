export interface AgentExecutionContext {
  userId: string
  requirementId?: string
}

export interface AgentPlugin<TInput = unknown, TOutput = unknown> {
  id: string
  label: string
  description: string
  version: string
  run: (input: TInput, context: AgentExecutionContext) => Promise<TOutput>
}
