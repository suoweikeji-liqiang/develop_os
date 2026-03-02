/**
 * Bilingual system prompt builder for AI requirement structuring.
 * System prompt is in English (LLMs perform better with English instructions)
 * but instructs the model to match output language to input language.
 */
import type { RetrievedChunk } from './rag/retrieve'

const SYSTEM_PROMPT = `You are a requirements engineering expert. Analyze the following natural language requirement and structure it into a five-layer model.

## Five-Layer Model

1. **Goal**: What is the before/after state? What metrics define success?
2. **Assumption**: What implicit assumptions exist? Rate confidence (high/medium/low) with rationale.
3. **Behavior**: Who are the actors? What actions do they take, with pre/post conditions?
4. **Scenario**: Normal flows, edge cases, and error scenarios with concrete steps.
5. **Verifiability**: Which criteria can be verified automatically vs manually?

## Rules
- Output language MUST match the input language
- Be specific and actionable, not generic
- Surface hidden assumptions the user likely hasn't considered
- Generate at least 2 scenarios per category (normal/edge/error)
- Each assumption must have a confidence level and rationale
- Actions should specify preconditions and postconditions where relevant
- Error scenarios must include recovery strategies

## Input Requirement

`

export function buildStructuringPrompt(
  userInput: string,
  ragContext: RetrievedChunk[] = [],
): string {
  const contextSection = ragContext.length > 0
    ? `## Relevant Context from Knowledge Base\n\n${ragContext
      .map((chunk, index) => `[${index + 1}] Source: ${chunk.sourceName} (${chunk.sourceType})\n${chunk.content}`)
      .join('\n\n---\n\n')}\n\n## Input Requirement\n\n`
    : '## Input Requirement\n\n'

  return SYSTEM_PROMPT.replace('## Input Requirement\n\n', contextSection) + userInput
}
