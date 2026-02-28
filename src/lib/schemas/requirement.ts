import { z } from 'zod'

const ConfidenceLevel = z
  .enum(['high', 'medium', 'low'])
  .describe('Confidence level for this assumption')

const GoalSchema = z.object({
  summary: z.string().describe('One-sentence goal statement'),
  before: z.string().describe('Current state before this requirement is met'),
  after: z.string().describe('Desired state after this requirement is met'),
  metrics: z.array(z.string()).describe('Measurable success indicators'),
}).describe('What the requirement aims to achieve')

const AssumptionItemSchema = z.object({
  content: z.string().describe('The assumption statement'),
  confidence: ConfidenceLevel,
  rationale: z.string().describe('Why this assumption is believed to be true'),
})

const AssumptionSchema = z.object({
  items: z.array(AssumptionItemSchema).describe('List of assumptions underlying this requirement'),
}).describe('Assumptions that must hold for the requirement to be valid')

const ActionSchema = z.object({
  actor: z.string().describe('Who performs this action'),
  action: z.string().describe('What the actor does'),
  precondition: z.string().optional().describe('State required before this action'),
  postcondition: z.string().optional().describe('State guaranteed after this action'),
})

const BehaviorSchema = z.object({
  actors: z.array(z.string()).describe('All actors involved in this requirement'),
  actions: z.array(ActionSchema).describe('Sequence of actor-action pairs'),
}).describe('Who does what and in what order')

const NormalScenarioSchema = z.object({
  name: z.string().describe('Scenario name'),
  steps: z.array(z.string()).describe('Ordered steps in the happy path'),
})

const EdgeScenarioSchema = z.object({
  name: z.string().describe('Edge case scenario name'),
  steps: z.array(z.string()).describe('Steps when this edge case occurs'),
  trigger: z.string().describe('What triggers this edge case'),
})

const ErrorScenarioSchema = z.object({
  name: z.string().describe('Error scenario name'),
  steps: z.array(z.string()).describe('Steps when this error occurs'),
  recovery: z.string().describe('How the system recovers from this error'),
})

const ScenarioSchema = z.object({
  normal: z.array(NormalScenarioSchema).describe('Happy path scenarios'),
  edge: z.array(EdgeScenarioSchema).describe('Edge case scenarios'),
  error: z.array(ErrorScenarioSchema).describe('Error handling scenarios'),
}).describe('Concrete usage scenarios covering normal, edge, and error paths')

const AutomatedCriterionSchema = z.object({
  criterion: z.string().describe('What to verify'),
  method: z.string().describe('How to verify it automatically'),
})

const ManualCriterionSchema = z.object({
  criterion: z.string().describe('What to verify'),
  reason: z.string().describe('Why this cannot be automated'),
})

const VerifiabilitySchema = z.object({
  automated: z.array(AutomatedCriterionSchema).describe('Criteria verifiable by automated tests'),
  manual: z.array(ManualCriterionSchema).describe('Criteria requiring manual verification'),
}).describe('How to verify the requirement is correctly implemented')

export const FiveLayerModelSchema = z.object({
  goal: GoalSchema,
  assumption: AssumptionSchema,
  behavior: BehaviorSchema,
  scenario: ScenarioSchema,
  verifiability: VerifiabilitySchema,
}).describe('Five-layer structured requirement model')

export type FiveLayerModel = z.infer<typeof FiveLayerModelSchema>

export const CreateRequirementSchema = z.object({
  title: z.string().min(1).describe('Requirement title'),
  rawInput: z.string().min(1).describe('Original user input text'),
})

export type CreateRequirement = z.infer<typeof CreateRequirementSchema>
