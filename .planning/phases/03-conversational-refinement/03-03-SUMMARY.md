---
phase: 03-conversational-refinement
plan: "03"
subsystem: ui
tags: [ai-sdk, useChat, react, chat-panel, assumption-card, streaming]

# Dependency graph
requires:
  - phase: 03-conversational-refinement
    provides: ConversationMessage schema, conversation tRPC router, /api/ai/converse route
provides:
  - ChatPanel component with useChat and DefaultChatTransport
  - AssumptionCard component with Accept/Reject/Edit state machine
  - Side-by-side layout on requirement detail page
affects: [03-04-diff-confirm, 04-versioning]

# Tech tracking
tech-stack:
  added: ["@ai-sdk/react", "shadcn ScrollArea"]
  patterns: [useChat with DefaultChatTransport, DB-to-UIMessage mapping, side-by-side grid layout]

key-files:
  created:
    - src/app/(dashboard)/requirements/[id]/assumption-card.tsx
    - src/app/(dashboard)/requirements/[id]/chat-panel.tsx
  modified:
    - src/app/(dashboard)/requirements/[id]/page.tsx

key-decisions:
  - "useChat imported from @ai-sdk/react (separate package in AI SDK 6, not ai/react)"
  - "sendMessage({ text }) API in AI SDK 6 instead of { role, content } pattern"
  - "DB ConversationMessage mapped to UIMessage shape server-side (id, role, parts)"

patterns-established:
  - "DB-to-UIMessage mapping: rawMessages.map(msg => ({ id, role, parts: msg.content }))"
  - "Chat transport pattern: DefaultChatTransport with api + body config"

requirements-completed: []

# Metrics
duration: 6min
completed: 2026-02-28
---

# Phase 3 Plan 03: Chat Panel UI and Assumption Surfacing Summary

**ChatPanel with useChat/DefaultChatTransport and AssumptionCard with Accept/Reject/Edit state machine, wired into side-by-side requirement detail layout**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-28T16:12:58Z
- **Completed:** 2026-02-28T16:19:25Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- AssumptionCard component with pending/accepting/rejecting/done state machine and amber glow styling
- ChatPanel component using useChat from @ai-sdk/react with DefaultChatTransport to /api/ai/converse
- Requirement detail page updated to side-by-side grid layout (model tabs left, chat panel right)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AssumptionCard component** - `9b2647d` (feat)
2. **Task 2: Create ChatPanel component** - `29f2f80` (feat)
3. **Task 3: Update requirement detail page for side-by-side layout** - `d3e89f5` (feat)

## Files Created/Modified
- `src/app/(dashboard)/requirements/[id]/assumption-card.tsx` - AssumptionCard with Accept/Reject/Edit state machine
- `src/app/(dashboard)/requirements/[id]/chat-panel.tsx` - ChatPanel with useChat, auto-scroll, message persistence
- `src/app/(dashboard)/requirements/[id]/page.tsx` - Side-by-side grid layout, server-side message loading
- `src/components/ui/scroll-area.tsx` - shadcn ScrollArea component (new)
- `package.json` - Added @ai-sdk/react dependency

## Decisions Made
- useChat is in @ai-sdk/react (separate package in AI SDK 6), not ai/react as plan specified
- sendMessage accepts { text: string } in AI SDK 6, not { role, content } pattern
- DB ConversationMessage records mapped to UIMessage shape server-side with explicit { id, role, parts } mapping

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed @ai-sdk/react package**
- **Found during:** Task 2 (ChatPanel component)
- **Issue:** ai/react subpath does not exist in AI SDK 6; useChat lives in @ai-sdk/react
- **Fix:** npm install @ai-sdk/react, import useChat from @ai-sdk/react
- **Files modified:** package.json, package-lock.json, chat-panel.tsx
- **Verification:** TypeScript compiles, Next.js build passes
- **Committed in:** 29f2f80 (Task 2 commit)

**2. [Rule 3 - Blocking] Installed shadcn ScrollArea component**
- **Found during:** Task 2 (ChatPanel component)
- **Issue:** ScrollArea component referenced in plan but not installed
- **Fix:** npx shadcn add scroll-area
- **Files modified:** src/components/ui/scroll-area.tsx
- **Committed in:** 29f2f80 (Task 2 commit)

**3. [Rule 1 - Bug] Fixed UIMessage type mapping in page.tsx**
- **Found during:** Task 3 (page layout update)
- **Issue:** Prisma ConversationMessage shape doesn't match UIMessage (missing parts field)
- **Fix:** Added explicit mapping: rawMessages.map(msg => ({ id, role, parts: msg.content }))
- **Files modified:** src/app/(dashboard)/requirements/[id]/page.tsx
- **Verification:** TypeScript compiles without errors
- **Committed in:** d3e89f5 (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All fixes necessary for correct compilation. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Chat panel and assumption cards ready for diff/confirm flow (plan 03-04)
- onPatchProposed callback is a no-op placeholder, to be wired in 03-04

## Self-Check: PASSED

All 3 commits verified. All 4 key files verified on disk.

---
*Phase: 03-conversational-refinement*
*Completed: 2026-02-28*
