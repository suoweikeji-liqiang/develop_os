# Phase 3: Conversational Refinement - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can refine AI-generated five-layer models through dialogue. The AI proactively surfaces hidden assumptions with confidence scores. Users can accept, reject, or modify each surfaced assumption. This phase adds conversation capability to the existing single-shot structuring flow — it does NOT add versioning, workflow status, or collaboration features.

</domain>

<decisions>
## Implementation Decisions

### Chat Interaction Layout
- Side-by-side panel: chat on the right, model tabs on the left
- AI auto-detects which layer(s) a user's message applies to — no explicit targeting needed
- Chat bubble style (user on right, AI on left)
- Chat panel auto-opens after AI finishes generating the initial model, collapsible afterward

### Assumption Surfacing UX
- New assumptions appear directly on the model's Assumption tab as highlighted cards (amber/yellow glow)
- Each card has Accept / Reject / Edit action buttons
- Accept allows inline editing of the assumption text before confirming
- Reject opens a small text field for the user to explain why or provide a corrected version
- After action, the card blends into the existing assumption list (highlight removed)
- Chat sends a brief notification ("I found 2 new assumptions") pointing to the Assumption tab
- AI surfaces assumptions on significant changes only — not after every message

### Model Update Flow
- AI proposes changes as an inline color diff on the model tabs (green for added, red for removed)
- User must confirm before changes are applied to the model
- When a message affects multiple layers, changes are grouped but user can accept/reject per layer independently
- One-step undo button appears after applying changes, reverting to the state before the last apply

### Conversation Persistence
- Single ongoing thread per requirement (no separate sessions)
- Conversations are saved to the database and resumable across page loads
- On return, show recent messages (last ~20) with a "Load more" button to scroll back
- No limit on conversation length
- Chat panel re-opens with history when user returns to a requirement that has conversation messages

### Claude's Discretion
- Conversation message storage approach (structured table vs JSON array — pick what fits Prisma schema best)
- Loading skeleton design for chat panel
- Exact spacing, typography, and animation details
- How to determine "significant change" threshold for assumption surfacing
- Error state handling for failed AI responses in chat

</decisions>

<specifics>
## Specific Ideas

- Chat bubbles should feel lightweight — not heavy like a full messaging app
- The inline color diff should be familiar to developers (git-style green/red)
- Assumption highlight cards should be visually distinct but not jarring — amber glow, not a modal or alert

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ModelTabs` component (`src/app/(dashboard)/requirements/[id]/model-tabs.tsx`): Tab-based five-layer display with streaming support — chat panel integrates alongside this
- `LayerEditor` component (`src/app/(dashboard)/requirements/[id]/layer-editor.tsx`): Per-layer inline editing with sub-editors for all 5 layers — diff overlay can extend this
- `confidenceBadge()` function in model-tabs.tsx: Already renders high/medium/low badges — reuse for assumption surfacing
- `parsePartialJson` (`src/lib/parse-partial-json.ts`): Streaming JSON parser — reuse for streaming chat AI responses
- shadcn/ui components: tabs, badge, skeleton, textarea, input, label, button — all available
- `eventBus` (`src/server/events/bus.ts`): Lifecycle events for structuring — extend with conversation events

### Established Patterns
- AI SDK 6 with `streamText` / `Output.object()` for structured generation — conversation endpoint follows same pattern
- tRPC routers for CRUD operations — conversation CRUD follows this pattern
- Bilingual UI: Chinese labels in components, English system prompts for AI
- `buildStructuringPrompt` in `src/server/ai/prompt.ts` — needs extension for multi-turn conversation context

### Integration Points
- Requirement detail page (`src/app/(dashboard)/requirements/[id]/page.tsx`): Chat panel mounts here alongside ModelTabs
- `/api/ai/structure` route: Conversation endpoint follows similar pattern but with message history
- `FiveLayerModelSchema` Zod schema: AI responses must conform to this for model updates
- `requirement.updateModel` tRPC mutation: Reuse for applying confirmed changes

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-conversational-refinement*
*Context gathered: 2026-02-28*
