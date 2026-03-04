/**
 * Bilingual system prompt builder for AI requirement structuring.
 * System prompt is in English (LLMs perform better with English instructions)
 * but instructs the model to match output language to input language.
 */
import type { RetrievedChunk } from './rag/retrieve'

const FULL_STRUCTURING_PROMPT = `You are a structural reviewer creating a reusable ModelCard. Analyze the following natural language requirement and structure it into a five-layer model.

## Five-Layer Model

1. **Goal**: What is the before/after state? What metrics define success?
2. **Assumption**: What implicit assumptions exist? Rate confidence (high/medium/low) with rationale.
3. **Behavior**: Who are the actors? What actions do they take, with pre/post conditions?
4. **Scenario**: Normal flows, edge cases, and error scenarios with concrete steps.
5. **Verifiability**: Which criteria can be verified automatically vs manually?

## Rules
- Output language MUST match the input language
- Think in terms of durable abstractions, not one-off task wording
- Be specific and actionable, not generic
- Surface hidden assumptions the user likely hasn't considered
- Generate at least 2 scenarios per category (normal/edge/error)
- Each assumption must have a confidence level and rationale
- Actions should specify preconditions and postconditions where relevant
- Error scenarios must include recovery strategies

## Input Requirement

`

const COMPACT_STRUCTURING_PROMPT = `You are creating a compact requirement draft that will later be expanded into a full five-layer ModelCard.

## Draft Scope
- Capture only the durable core of the requirement
- Prefer the minimum complete answer over exhaustive detail
- Keep strings concise, concrete, and reusable

## Required Content
1. summary: a one-sentence goal
2. before: current state or pain point
3. after: desired state after this requirement lands
4. actors: 1-4 core actors only
5. metrics: 1-2 success indicators
6. assumptions: 1-3 critical assumptions with confidence
7. actions: 2-4 essential actor/action pairs
8. scenarios:
   - normal: exactly 1 key flow
   - edge: exactly 1 edge case with trigger
   - error: exactly 1 failure case with recovery
9. automatedChecks: 1-2 checks
10. manualChecks: 1-2 checks

## Rules
- Output language MUST match the input language
- Use only information supported by the requirement or relevant context
- Do not invent long explanations or verbose rationale
- Keep steps short and ordered
- Use the smallest complete answer that still preserves the core workflow
- Prefer generalized product wording over one-off task phrasing

## Input Requirement

`

function appendContextSection(
  basePrompt: string,
  ragContext: RetrievedChunk[] = [],
): string {
  const contextSection = ragContext.length > 0
    ? `## Relevant Context from Knowledge Base\n\n${ragContext
      .map((chunk, index) => `[${index + 1}] Source: ${chunk.sourceName} (${chunk.sourceType})\n${chunk.content}`)
      .join('\n\n---\n\n')}\n\n## Input Requirement\n\n`
    : '## Input Requirement\n\n'

  return basePrompt.replace('## Input Requirement\n\n', contextSection)
}

export function buildStructuringPrompt(
  userInput: string,
  ragContext: RetrievedChunk[] = [],
): string {
  return appendContextSection(FULL_STRUCTURING_PROMPT, ragContext) + userInput
}

export function buildCompactStructuringPrompt(
  userInput: string,
  ragContext: RetrievedChunk[] = [],
): string {
  return appendContextSection(COMPACT_STRUCTURING_PROMPT, ragContext) + userInput
}
