---
phase: 03-conversational-refinement
plan: "01"
subsystem: ai
tags: [prisma, zod, conversation, prompt-builder, structured-output]

requires:
  - phase: 02-core-ai-structuring
    provides: FiveLayerModelSchema, requirement model, AI structuring patterns
provides:
  - ConversationMessage Prisma model with migration
  - ConversationResponseSchema Zod schema for AI structured responses
  - buildConversationPrompt system prompt builder
affects: [03-02, 03-03, 03-04]

tech-stack:
  added: []
  patterns: [ModelPatch partial schema from FiveLayerModelSchema.shape, conversation prompt builder]

key-files:
  created:
    - src/lib/schemas/conversation.ts
    - src/server/ai/conversation-prompt.ts
    - prisma/migrations/20260228160451_add_conversation_messages/migration.sql
  modified:
    - prisma/schema.prisma

key-decisions:
  - "ConversationMessage content stored as Json to hold UIMessage parts array"
  - "ModelPatchSchema built from FiveLayerModelSchema.shape with optional layers"
  - "Prompt instructs AI to match output language to user input language"

patterns-established:
  - "Partial model patch pattern: use .shape accessors with .optional() for layer-level patches"
  - "Conversation prompt builder pattern: serialize current model as JSON context in system prompt"

requirements-completed: [AI-02, AI-03]

duration: 2min
completed: 2026-02-28
---

# Phase 3 Plan 1: Conversation Schema and Prompt Builder Summary

**ConversationMessage Prisma model, ConversationResponseSchema with partial layer patches, and bilingual conversation prompt builder**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-28T16:04:30Z
- **Completed:** 2026-02-28T16:06:56Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- ConversationMessage Prisma model with cascade delete and composite index on [requirementId, createdAt]
- ConversationResponseSchema with partial layer patches derived from FiveLayerModelSchema.shape
- Bilingual conversation prompt builder that serializes current model as JSON context

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ConversationMessage Prisma model and migrate** - `ff5ebe5` (feat)
2. **Task 2: Create ConversationResponseSchema** - `e5b4b11` (feat)
3. **Task 3: Create conversation system prompt builder** - `703420f` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added ConversationMessage model and conversations relation on Requirement
- `prisma/migrations/20260228160451_add_conversation_messages/migration.sql` - Migration for new table
- `src/lib/schemas/conversation.ts` - ConversationResponseSchema with reply, patches, newAssumptions, affectedLayers
- `src/server/ai/conversation-prompt.ts` - buildConversationPrompt function

## Decisions Made
- ConversationMessage content stored as Json to hold UIMessage parts array (flexible for future message formats)
- ModelPatchSchema built from FiveLayerModelSchema.shape with .optional() per layer (DRY, stays in sync)
- Prompt instructs AI to match output language to user input language (bilingual support)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ConversationMessage model ready for 03-02 (converse API route) to persist messages
- ConversationResponseSchema ready for 03-02 to use with AI SDK Output.object
- buildConversationPrompt ready for 03-02 to build system prompts per conversation turn

## Self-Check: PASSED

- FOUND: prisma/schema.prisma
- FOUND: src/lib/schemas/conversation.ts
- FOUND: src/server/ai/conversation-prompt.ts
- FOUND: commit ff5ebe5 (Task 1)
- FOUND: commit e5b4b11 (Task 2)
- FOUND: commit 703420f (Task 3)

---
*Phase: 03-conversational-refinement*
*Completed: 2026-02-28*
