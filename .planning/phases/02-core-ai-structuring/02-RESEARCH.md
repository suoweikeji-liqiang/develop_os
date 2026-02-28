# Phase 02 Research: Core AI Structuring

**Phase:** 02-core-ai-structuring
**Researched:** 2026-02-28
**Overall Confidence:** MEDIUM-HIGH
**Mode:** Ecosystem (phase-scoped)

## Executive Summary

This phase introduces the AI engine that transforms fuzzy natural language requirements into a structured five-layer model (goal/assumption/behavior/scenario/verifiability). The core technical challenge is threefold: (1) designing a Zod schema that captures the five-layer model while remaining LLM-friendly, (2) integrating the Vercel AI SDK for structured output generation with automatic retry on validation failure, and (3) building a tab-based UI that streams and displays each layer.

The project already has Zod 4, Prisma 7 with PostgreSQL (JSONB via `Json?` field on `Requirement`), tRPC 11, and an event bus in place from Phase 1. The AI SDK needs to be installed fresh. A critical compatibility finding: AI SDK 6 supports a "Standard JSON Schema" interface, and Zod 4 has native `z.toJSONSchema()` — but the AI SDK's built-in `zodSchema()` helper internally uses `zod-to-json-schema` which is deprecated and incompatible with Zod 4. This requires either using AI SDK 6's Standard JSON Schema path directly, or wrapping Zod 4 schemas with the `zodSchema()` helper (which AI SDK 6 may have updated for Zod 4 support). This must be verified at install time.

The recommended approach: use `generateText` with `Output.object()` (not the deprecated `generateObject`) for structured output, wrap it in a server action with a retry loop (max 3 attempts), and use the `useObject` hook on the client for streaming partial results. The five-layer model schema should be flat at the top level (one key per layer) with nested arrays/objects within each layer, keeping the schema simple enough for LLMs to follow reliably.

## Requirements Addressed

| Requirement | Description | How |
|-------------|-------------|-----|
| AI-01 | Natural language input -> five-layer structured model | `generateText` + `Output.object()` with five-layer Zod schema |
| AI-05 | Schema validation with auto-retry on failure | Zod validation built into Output API + custom retry loop (3 attempts) |

---

## 1. AI SDK Integration

### Current State (AI SDK 6)

The Vercel AI SDK has reached v6 (released Dec 2025). Key changes relevant to this phase:

- `generateObject()` and `streamObject()` are **DEPRECATED**. Use `generateText` / `streamText` with the `output` property instead.
- The new `Output` API provides: `Output.object()`, `Output.array()`, `Output.choice()`, `Output.json()`, `Output.text()`
- AI SDK 6 supports "Standard JSON Schema V1" interface — any schema library implementing this works without SDK converters
- `NoObjectGeneratedError` is thrown when structured output generation fails

**Confidence:** HIGH (verified via official AI SDK 6 blog post and documentation at ai-sdk.dev)

### Recommended Packages

```
npm install ai @ai-sdk/openai
```

| Package | Version | Purpose |
|---------|---------|---------|
| `ai` | ^6.x | Core AI SDK — generateText, streamText, Output API, useObject hook |
| `@ai-sdk/openai` | ^1.x | OpenAI provider (GPT-4o for structured output) |

Optional future addition: `@ai-sdk/anthropic` for Claude models (longer context windows for large requirement documents).

**Why OpenAI first:** GPT-4o has native Structured Outputs support (constrained decoding), meaning 100% schema adherence at the provider level. Anthropic models use prompt-based JSON mode which is less reliable for complex schemas. Start with OpenAI, add Anthropic as fallback later.

### Zod 4 Compatibility

**Critical finding:** The project uses Zod 4.3.6. The old `zod-to-json-schema` library (used internally by older AI SDK versions) is deprecated and incompatible with Zod 4. However:

- Zod 4 has native `z.toJSONSchema()` for JSON Schema conversion
- AI SDK 6 supports "Standard JSON Schema V1" interface
- AI SDK 6's `zodSchema()` helper may have been updated for Zod 4

**Action required:** After installing `ai@^6`, test that `Output.object({ schema: yourZodSchema })` works with Zod 4 schemas. If it fails, use the `jsonSchema()` helper with `z.toJSONSchema()` as a bridge:

```typescript
import { jsonSchema } from 'ai';
import { z } from 'zod/v4';

const mySchema = z.object({ /* ... */ });
const aiSchema = jsonSchema(z.toJSONSchema(mySchema));
```

**Confidence:** MEDIUM (Zod 4 + AI SDK 6 integration is new territory; needs verification at install time)

### API Pattern: generateText + Output.object()

```typescript
import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';

const { output } = await generateText({
  model: openai('gpt-4o'),
  output: Output.object({ schema: fiveLayerModelSchema }),
  prompt: buildStructuringPrompt(userInput),
});
// output is fully typed and validated against the Zod schema
```

For streaming to the client, use `streamText` + `Output.object()` on the server and `useObject` hook on the client.

**Confidence:** HIGH (verified via official AI SDK documentation)

---

## 2. Five-Layer Model Schema Design

### Schema Strategy

The five-layer model must be:
1. Simple enough for LLMs to generate reliably (flat top-level, nested within layers)
2. Rich enough to capture meaningful structure per layer
3. Extensible for Phase 3 (conversational refinement) and Phase 4 (versioning)

### Recommended Schema Structure

```typescript
const FiveLayerModelSchema = z.object({
  goal: z.object({
    summary: z.string().describe('One-sentence goal statement'),
    before: z.string().describe('Current state (before)'),
    after: z.string().describe('Desired state (after)'),
    metrics: z.array(z.string()).describe('Measurable success indicators'),
  }),
  assumption: z.object({
    items: z.array(z.object({
      content: z.string().describe('The assumption'),
      confidence: z.enum(['high', 'medium', 'low']),
      rationale: z.string().describe('Why this confidence level'),
    })),
  }),
  behavior: z.object({
    actors: z.array(z.string()).describe('Who interacts with the system'),
    actions: z.array(z.object({
      actor: z.string(),
      action: z.string(),
      precondition: z.string().optional(),
      postcondition: z.string().optional(),
    })),
  }),
  scenario: z.object({
    normal: z.array(z.object({
      name: z.string(),
      steps: z.array(z.string()),
    })),
    edge: z.array(z.object({
      name: z.string(),
      steps: z.array(z.string()),
      trigger: z.string().describe('What triggers this edge case'),
    })),
    error: z.array(z.object({
      name: z.string(),
      steps: z.array(z.string()),
      recovery: z.string().describe('How to recover'),
    })),
  }),
  verifiability: z.object({
    automated: z.array(z.object({
      criterion: z.string(),
      method: z.string().describe('How to verify automatically'),
    })),
    manual: z.array(z.object({
      criterion: z.string(),
      reason: z.string().describe('Why manual verification is needed'),
    })),
  }),
});
```

### Schema Design Principles

1. **Use `.describe()` on every field** — these descriptions become part of the JSON Schema sent to the LLM, guiding output quality
2. **Keep nesting to max 3 levels** — deeper nesting increases LLM error rates
3. **Use `z.enum()` for constrained values** — LLMs handle enums reliably with constrained decoding
4. **Avoid `z.optional()` at the top layer level** — every layer should always be present; use optional only within layers
5. **Use arrays of objects, not maps** — LLMs generate arrays more reliably than key-value maps

**Confidence:** MEDIUM (schema design is based on LLM structured output best practices from multiple sources, but the specific five-layer structure needs iteration with real prompts)

---

## 3. Retry and Validation Strategy

### Retry Loop Design

Per user decision: auto-retry up to 3 times, silent retry, show attempt count only on total failure.

```typescript
async function generateStructuredModel(input: string) {
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { output } = await generateText({
        model: openai('gpt-4o'),
        output: Output.object({ schema: FiveLayerModelSchema }),
        prompt: buildStructuringPrompt(input),
      });
      return { success: true, model: output, attempts: attempt };
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        return { success: false, error, attempts: attempt };
      }
      // Silent retry — continue loop
    }
  }
}
```

### Validation Layers

1. **Provider-level:** OpenAI Structured Outputs constrains decoding to valid JSON Schema (near 100% reliability)
2. **SDK-level:** AI SDK's `Output.object()` validates against Zod schema, throws `NoObjectGeneratedError` on failure
3. **Application-level:** Custom retry loop catches failures and retries with the same prompt
4. **Semantic-level (future):** Post-validation checks for semantic quality (e.g., "does the goal actually differ from the assumption?")

**Why this is robust:** With OpenAI's constrained decoding + Zod validation, retry should rarely trigger. The retry loop is a safety net for edge cases (network errors, model timeouts, rare schema violations with non-OpenAI providers).

**Confidence:** HIGH (pattern is well-established in production AI applications)

---

## 4. Prompt Engineering

### System Prompt Strategy

The prompt must handle both Chinese and English input. Key principles:

1. **Bilingual system prompt** — write the system prompt in English (LLMs perform better with English instructions) but explicitly state that output language should match input language
2. **Schema-aware prompting** — describe each layer's purpose in the system prompt, not just in Zod `.describe()` annotations
3. **Few-shot examples** — include one Chinese and one English example in the system prompt for consistent output quality

### Prompt Template

```typescript
function buildStructuringPrompt(userInput: string): string {
  return `You are a requirements engineering expert. Analyze the following
natural language requirement and structure it into a five-layer model.

## Five-Layer Model

1. **Goal (目标澄清)**: What is the before/after state? What metrics define success?
2. **Assumption (假设显性化)**: What implicit assumptions exist? Rate confidence (high/medium/low).
3. **Behavior (行为建模)**: Who are the actors? What actions do they take?
4. **Scenario (场景枚举)**: Normal flows, edge cases, and error scenarios.
5. **Verifiability (可验证性)**: Which criteria can be verified automatically vs manually?

## Rules
- Output language MUST match the input language
- Be specific and actionable, not generic
- Surface hidden assumptions the user likely hasn't considered
- Generate at least 2 scenarios per category (normal/edge/error)

## Input Requirement

${userInput}`;
}
```

### Chinese Language Considerations

- GPT-4o handles Chinese well; no special tokenization concerns
- The `.describe()` annotations in the Zod schema should remain in English (they're for the model, not the user)
- Output content will be in Chinese when input is Chinese — this is handled by the prompt instruction
- Test with real Chinese requirements during development to catch encoding or display issues

**Confidence:** MEDIUM (Chinese LLM output quality is generally good with GPT-4o, but specific prompt tuning will be needed)

---

## 5. Data Persistence

### Existing Schema

The Prisma schema already has a `Requirement` model with a `Json?` field for the model:

```prisma
model Requirement {
  id        String   @id @default(cuid())
  title     String
  model     Json?
  status    String   @default("draft")
  createdBy String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Schema Evolution Needed

The existing model needs expansion for Phase 2:

```prisma
model Requirement {
  id          String   @id @default(cuid())
  title       String
  rawInput    String   @db.Text    // Original user input
  model       Json?                // Five-layer structured model (JSONB)
  status      String   @default("draft")
  confidence  Json?                // Per-layer confidence scores
  attempts    Int      @default(1) // Number of AI generation attempts
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

Key additions:
- `rawInput`: Store the original natural language text (needed for re-generation and Phase 3 refinement)
- `confidence`: Per-layer confidence scores from the AI
- `attempts`: Track how many retries were needed

### localStorage Auto-Save

Per user decision: auto-save draft to localStorage every 30 seconds. This protects against:
- Browser crashes during long input sessions
- Network failures before server save completes

Pattern: Store `{ rawInput, lastSaved }` in localStorage keyed by a draft ID. Clear on successful server persist.

### Version Tracking Prep

Per user decision: enable version tracking from the start (prerequisite for Phase 4). Add a `version` field:

```prisma
model Requirement {
  // ... existing fields
  version     Int      @default(1)
}
```

Each update increments version. Phase 4 will add a `RequirementSnapshot` table for immutable history, but the version counter should exist from Phase 2.

**Confidence:** HIGH (straightforward Prisma/PostgreSQL patterns, JSONB is well-suited for semi-structured model data)

---

## 6. UI Architecture

### Tab-Based Layer Display

Per user decision: tab navigation for the five layers, editable inline, clear visual distinction.

Recommended component structure:

```
/src/app/(dashboard)/requirements/
  new/page.tsx              -- Server component: new requirement page
  new/form.tsx              -- Client component: input form + generation
  [id]/page.tsx             -- Server component: view/edit requirement
  [id]/model-tabs.tsx       -- Client component: tab-based layer display
  [id]/layer-[name].tsx     -- Client component: individual layer view/edit
```

### Streaming UX

Use the `useObject` hook from AI SDK for streaming partial results:

```typescript
const { object, submit, isLoading, error } = useObject({
  api: '/api/ai/structure',
  schema: FiveLayerModelSchema,
});
```

As the model generates, `object` contains partial data — tabs can show layers as they complete. The goal layer typically generates first, giving users immediate feedback.

### Component Library

The project already has shadcn/ui and Radix UI. Use:
- `Tabs` from Radix UI / shadcn for layer navigation
- `Textarea` for input (with placeholder examples in Chinese and English)
- `Badge` for confidence scores (high=green, medium=yellow, low=red)
- `Skeleton` for loading states during streaming

### File Upload

Per user decision: file upload as secondary input (.txt, .md). Use Next.js API route for file upload, extract text content, feed to the same structuring pipeline.

**Confidence:** HIGH (standard Next.js + shadcn/ui patterns)

---

## 7. Server Architecture

### API Route vs Server Action vs tRPC

Three options for the AI generation endpoint:

| Approach | Streaming | Type Safety | Fits Existing Pattern |
|----------|-----------|-------------|----------------------|
| Next.js API Route | Yes (native) | Manual | No (project uses tRPC) |
| Server Action | Yes (via useObject) | Via Zod | Partial (used for auth) |
| tRPC mutation | Complex | Full | Yes (existing pattern) |

**Recommendation:** Use a Next.js API Route (`/api/ai/structure`) for the streaming AI endpoint. Reason: the `useObject` hook expects a standard HTTP endpoint, not a tRPC procedure. Use tRPC for CRUD operations on requirements (list, get, update, delete). This matches the existing pattern where auth uses server actions and data queries use tRPC.

### Event Bus Integration

Add new events to the existing event bus:

```typescript
// New events for Phase 2
'requirement.structuring.started': { requirementId: string; userId: string }
'requirement.structuring.completed': { requirementId: string; attempts: number }
'requirement.structuring.failed': { requirementId: string; attempts: number; error: string }
'requirement.updated': { requirementId: string; updatedBy: string; field: string }
```

**Confidence:** HIGH (follows established Phase 1 patterns)

---

## 8. Environment Configuration

### API Keys

The AI SDK requires an API key. For OpenAI:

```env
OPENAI_API_KEY=sk-...
```

The AI SDK reads `OPENAI_API_KEY` automatically when using `@ai-sdk/openai`. No additional configuration needed.

### Cost Considerations

GPT-4o pricing (as of early 2026):
- Input: ~$2.50 / 1M tokens
- Output: ~$10.00 / 1M tokens

A typical requirement structuring call: ~500 input tokens + ~1500 output tokens = ~$0.016 per call. With 3 retries max, worst case ~$0.05 per requirement. For a 5-15 person team generating maybe 20 requirements/day, cost is negligible (~$1/day).

**Confidence:** LOW (pricing may have changed; verify at implementation time)

---

## 9. Pitfalls Specific to This Phase

### Pitfall 1: Zod 4 + AI SDK 6 Schema Incompatibility
**Risk:** HIGH
**What:** The `zodSchema()` helper may not work with Zod 4 out of the box
**Prevention:** Test immediately after install. Fallback: use `jsonSchema()` with `z.toJSONSchema()`

### Pitfall 2: Over-Complex Schema Causing LLM Failures
**Risk:** MEDIUM
**What:** Deeply nested schemas with many optional fields cause LLMs to produce partial/invalid output
**Prevention:** Keep schema flat at top level, max 3 levels of nesting, avoid optional fields at layer level

### Pitfall 3: Chinese Output Quality Degradation
**Risk:** LOW-MEDIUM
**What:** LLM may produce lower quality structured output in Chinese vs English
**Prevention:** System prompt in English, explicit "match input language" instruction, test with real Chinese requirements

### Pitfall 4: Streaming Partial Object Display Issues
**Risk:** MEDIUM
**What:** `useObject` returns partial objects during streaming — UI must handle undefined fields gracefully
**Prevention:** Use optional chaining throughout tab components, show skeleton loaders for incomplete layers

### Pitfall 5: localStorage Draft Conflicts
**Risk:** LOW
**What:** Multiple tabs editing different requirements could overwrite each other's drafts
**Prevention:** Key localStorage entries by draft ID, not a global key

---

## 10. Plan Mapping

### Plan 02-01: Five-Layer Model Schema and Storage
- Define `FiveLayerModelSchema` Zod schema in `src/lib/schemas/requirement.ts`
- Evolve Prisma `Requirement` model (add `rawInput`, `confidence`, `attempts`, `version`)
- Run migration
- Add new event types to event bus
- Create tRPC router for requirement CRUD

### Plan 02-02: LLM Integration with Zod Validation and Retry Loop
- Install `ai` and `@ai-sdk/openai`
- Verify Zod 4 compatibility with AI SDK 6
- Create structuring prompt template
- Implement `generateStructuredModel()` with retry loop
- Create API route `/api/ai/structure` for streaming
- Wire event bus emissions

### Plan 02-03: Structuring UI (Input and Model Display)
- Create requirement input page with textarea + file upload
- Implement `useObject` hook integration for streaming
- Build tab-based five-layer model display
- Add inline editing per layer
- Implement localStorage auto-save (30s interval)
- Add confidence score badges

---

## Sources

- [AI SDK 6 Release Blog](https://vercel.com/blog/ai-sdk-6) — AI SDK 6 features, Output API, deprecations
- [AI SDK Generating Structured Data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) — generateText + Output.object() API
- [AI SDK Output Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/output) — Output.object(), Output.array(), Output.choice()
- [AI SDK zodSchema Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/zod-schema) — zodSchema() helper, recursive schemas
- [AI SDK useObject Hook](https://ai-sdk.dev/docs/ai-sdk-ui/object-generation) — Client-side streaming structured objects
- [Zod 4 JSON Schema](https://zod.dev/json-schema) — Native z.toJSONSchema() conversion
- [Zod 4 Release Notes](https://zod.dev/v4) — Breaking changes, new features
- [zod-to-json-schema Deprecation](https://yarnpkg.com/en/package/zod-to-json-schema) — Deprecated in favor of Zod 4 native support
- [AI SDK + Zod 4 Issue #7189](https://github.com/vercel/ai/issues/7189) — Compatibility tracking
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs) — Constrained decoding, 100% schema adherence
- [LLM Structured Output Best Practices](https://getathenic.com/blog/structured-output-patterns-ai-agents) — Schema design patterns
- [Shipping LLM Features with Structured Outputs](https://devinvinson.com/2025/08/shipping-llm-features-with-structured-outputs/) — Production patterns
