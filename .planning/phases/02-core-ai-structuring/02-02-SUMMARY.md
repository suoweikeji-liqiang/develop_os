---
phase: 02-core-ai-structuring
plan: 02
subsystem: ai-engine, api
tags: [ai-sdk, openai, structured-output, streaming, retry, zod4]

requires:
  - phase: 02-core-ai-structuring
    plan: 01
    provides: "FiveLayerModelSchema, EventMap with structuring events, eventBus"
provides:
  - "generateStructuredModel function with 3-attempt retry loop"
  - "buildStructuringPrompt bilingual system prompt builder"
  - "POST /api/ai/structure streaming endpoint"
affects: [02-03-structuring-ui]

tech-stack:
  added: ["ai@6.0.105", "@ai-sdk/openai@3.0.37"]
  patterns: ["Output.object() for structured generation", "streamText for streaming responses", "Silent retry loop with event bus lifecycle"]

key-files:
  created:
    - src/server/ai/prompt.ts
    - src/server/ai/structuring.ts
    - src/app/api/ai/structure/route.ts
  modified:
    - .env.example
    - package.json
    - package-lock.json

key-decisions:
  - "Zod 4 works natively with AI SDK 6 Output.object — no jsonSchema bridge needed"
  - "Streaming route is single-attempt best-effort; retry loop is for server-side non-streaming calls"
  - "System prompt in English with match-input-language instruction for bilingual support"

duration: 7min
completed: 2026-02-28
---

# Phase 2 Plan 2: LLM Integration with Zod Validation and Retry Loop Summary

**AI SDK 6 with OpenAI provider, structuring engine with 3-attempt silent retry, and streaming API route authenticated via verifySession**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-28T09:21:10Z
- **Completed:** 2026-02-28T09:28:04Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Installed AI SDK 6.0.105 and @ai-sdk/openai 3.0.37
- Verified Zod 4 native compatibility with AI SDK 6 (no bridge pattern required)
- Built bilingual system prompt that instructs LLM to match output language to input
- Implemented generateStructuredModel with 3-attempt silent retry and event bus lifecycle
- Created POST /api/ai/structure streaming endpoint with session auth and input validation

## Task Commits

1. **Task 1: Install AI SDK and create structuring engine with retry** - `59b8561` (feat)
2. **Task 2: Create streaming API route for AI structuring** - `8fe75d2` (feat)

## Files Created/Modified
- `src/server/ai/prompt.ts` - buildStructuringPrompt with bilingual system prompt
- `src/server/ai/structuring.ts` - generateStructuredModel with retry loop and event emissions
- `src/app/api/ai/structure/route.ts` - POST streaming endpoint with verifySession auth
- `.env.example` - Added OPENAI_API_KEY
- `package.json` - Added ai and @ai-sdk/openai dependencies
- `package-lock.json` - Lock file updated

## Decisions Made
- Zod 4 schemas work natively with AI SDK 6's Output.object() — tested at install time, no jsonSchema() bridge needed
- Streaming route uses single-attempt (no retry) since client can re-submit; retry loop is for server-side generateStructuredModel
- System prompt written in English for better LLM performance, with explicit "match input language" rule for Chinese support

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
- **OPENAI_API_KEY** must be set in `.env` (obtain from https://platform.openai.com/api-keys)

## Next Phase Readiness
- Structuring engine ready for UI integration in 02-03
- Streaming endpoint ready for useObject hook consumption
- buildStructuringPrompt available for both streaming and non-streaming paths

## Self-Check: PASSED

- FOUND: commit 59b8561 (Task 1)
- FOUND: commit 8fe75d2 (Task 2)
- FOUND: src/server/ai/prompt.ts
- FOUND: src/server/ai/structuring.ts
- FOUND: src/app/api/ai/structure/route.ts
- FOUND: .env.example

---
*Phase: 02-core-ai-structuring*
*Completed: 2026-02-28*
