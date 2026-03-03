import { ConflictDetectionResultSchema, type ConflictDetectionResult } from '@/lib/schemas/conflict'
import type { FiveLayerModel } from '@/lib/schemas/requirement'
import { generateStructuredOutput } from '@/server/ai/structured-output'
import { agentRegistry } from './registry'

interface RequirementSnapshot {
  id: string
  title: string
  rawInput: string
  model: FiveLayerModel
}

export interface ConflictDetectorInput {
  requirement: RequirementSnapshot
  relatedRequirements: RequirementSnapshot[]
}

const CONFLICT_DETECTION_SHAPE_HINT = `{
  "conflicts": [
    {
      "scope": "INTERNAL | CROSS_REQUIREMENT",
      "severity": "LOW | MEDIUM | HIGH",
      "title": "string",
      "summary": "string",
      "rationale": "string",
      "evidence": ["string"],
      "relatedRequirementId": "string (optional for cross-requirement only)",
      "relatedRequirementTitle": "string (optional for cross-requirement only)",
      "recommendedAction": "string"
    }
  ]
}`

function summarizeRequirement(requirement: RequirementSnapshot): string {
  return JSON.stringify({
    id: requirement.id,
    title: requirement.title,
    rawInput: requirement.rawInput,
    goal: requirement.model.goal,
    assumptions: requirement.model.assumption.items,
    behaviors: requirement.model.behavior.actions,
    scenarios: requirement.model.scenario,
  }, null, 2)
}

function buildConflictPrompt(input: ConflictDetectorInput): string {
  const relatedSection = input.relatedRequirements.length > 0
    ? input.relatedRequirements
      .map((item, index) => `### Candidate ${index + 1}\n${summarizeRequirement(item)}`)
      .join('\n\n')
    : 'No related requirements are currently available.'

  return `You are a requirement conflict detector.

Review the current requirement and identify only material contradictions.

You must detect:
1. Internal contradictions between assumptions, behaviors, scenarios, or stated goals.
2. Cross-requirement contradictions where the current requirement conflicts with another requirement.

Rules:
- Output language must match the language of the current requirement.
- Only report conflicts that are concrete and actionable.
- Do not report duplicates.
- Use CROSS_REQUIREMENT only when there is a real contradiction with a candidate requirement.
- Populate relatedRequirementId and relatedRequirementTitle for CROSS_REQUIREMENT conflicts.
- Return an empty list when no meaningful contradiction exists.

## Current Requirement
${summarizeRequirement(input.requirement)}

## Candidate Requirements
${relatedSection}`
}

export const conflictDetectorAgent = agentRegistry.register<ConflictDetectorInput, ConflictDetectionResult>({
  id: 'conflict-detector',
  label: 'Conflict Detector Agent',
  description: 'Finds contradictions inside a requirement model and across related requirements.',
  version: '1.0.0',
  run: async (input) => {
    const output = await generateStructuredOutput({
      schema: ConflictDetectionResultSchema,
      schemaName: 'conflict_detection_result',
      prompt: buildConflictPrompt(input),
      maxOutputTokens: 900,
      shapeHint: CONFLICT_DETECTION_SHAPE_HINT,
    })

    return output ?? { conflicts: [] }
  },
})
