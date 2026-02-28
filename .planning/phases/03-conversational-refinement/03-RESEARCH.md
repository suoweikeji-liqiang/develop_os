# Phase 3: Conversational Refinement - Research

**Researched:** 2026-02-28
**Domain:** AI SDK multi-turn conversation, chat UI, structured model diffing, assumption surfacing
**Confidence:** HIGH (core stack verified), MEDIUM (diff rendering pattern)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Chat Interaction Layout**
- Side-by-side panel: chat on the right, model tabs on the left
- AI auto-detects which layer(s) a user's message applies to — no explicit targeting needed
- Chat bubble style (user on right, AI on left)
- Chat panel auto-opens after AI finishes generating the initial model, collapsible afterward

**Assumption Surfacing UX**
- New assumptions appear directly on the model's Assumption tab as highlighted cards (amber/yellow glow)
- Each card has Accept / Reject / Edit action buttons
- Accept allows inline editing of the assumption text before confirming
- Reject opens a small text field for the user to explain why or provide a corrected version
- After action, the card blends into the existing assumption list (highlight removed)
- Chat sends a brief notification ("I found 2 new assumptions") pointing to the Assumption tab
- AI surfaces assumptions on significant changes only — not after every message

**Model Update Flow**
- AI proposes changes as an inline color diff on the model tabs (green for added, red for removed)
- User must confirm before changes are applied to the model
- When a message affects multiple layers, changes are grouped but user can accept/reject per layer independently
- One-step undo button appears after applying changes, reverting to the state before the last apply

**Conversation Persistence**
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-02 | 用户可通过对话方式修正和精炼 AI 生成的结构化模型 | useChat hook with initialMessages + streamText messages array; tRPC conversation CRUD; diff overlay on LayerEditor |
| AI-03 | AI 自动识别需求中的隐含假设并标注置信度 | Structured AI response with `newAssumptions` array + confidence scores; assumption card UI on Assumption tab |
</phase_requirements>

---

## Summary

Phase 3 adds a conversational refinement loop on top of the existing single-shot structuring flow. The core technical challenge is threefold: (1) building a persistent multi-turn chat that feeds conversation history back to the AI, (2) having the AI return structured model diffs rather than free text, and (3) rendering those diffs inline on the existing `ModelTabs`/`LayerEditor` components with a confirm/reject gate before applying.

The Vercel AI SDK 6 `useChat` hook is the right tool for the chat UI layer. It handles streaming, message state, and provides `initialMessages` for restoring history from the database. The API route receives the full `messages` array and passes it to `streamText` via `convertToModelMessages`. The AI response must be structured — not free text — so the conversation endpoint uses `Output.object()` (same pattern as Phase 2) to return a typed response containing both a chat reply and optional model patches.

Conversation persistence uses a dedicated `ConversationMessage` Prisma model (structured rows, not a JSON blob) linked to `Requirement`. This fits the Prisma schema cleanly, enables efficient pagination for "Load more", and avoids unbounded JSON column growth. The diff rendering is hand-rolled using simple field-level comparison between the current model and the AI-proposed model — no external diff library needed given the structured JSON shape.

**Primary recommendation:** Use `useChat` for the chat panel, `Output.object()` for structured AI responses that include model patches, a `ConversationMessage` table for persistence, and field-level diff computed client-side before the user confirms.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` (Vercel AI SDK) | ^6.0.105 (already installed) | `useChat` hook, `streamText`, `Output.object`, `convertToModelMessages` | Official SDK, already in use for Phase 2 streaming |
| `@ai-sdk/openai` | ^3.0.37 (already installed) | OpenAI model provider | Already in use |
| `@trpc/server` / `@trpc/react-query` | ^11.0.0 (already installed) | Conversation CRUD (save/load messages) | Established pattern in project |
| `@prisma/client` | ^7.4.2 (already installed) | ConversationMessage persistence | Established ORM |
| `zod` | ^4.3.6 (already installed) | Schema for structured AI response (chat reply + model patches) | Already used for FiveLayerModelSchema |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | ^0.575.0 (already installed) | Icons: send button, collapse toggle, undo, check/x for diff actions | Already in project |
| shadcn/ui components | already installed | `Textarea`, `Button`, `Badge`, `Skeleton`, `ScrollArea` | Chat panel UI primitives |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `useChat` hook | Custom fetch loop (like Phase 2 streaming) | useChat handles message state, streaming, and error lifecycle — no reason to hand-roll |
| Structured rows for messages | JSON array column on Requirement | Rows enable pagination; JSON blob requires loading all messages to paginate |
| Field-level diff (hand-rolled) | `diff` npm library | Structured JSON diff is simpler than text diff; no library needed |

**Installation:** No new packages needed — all dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (dashboard)/requirements/[id]/
│   │   ├── page.tsx                    # extend: pass conversation history
│   │   ├── model-tabs.tsx              # extend: accept pendingModel + diff mode
│   │   ├── layer-editor.tsx            # extend: diff overlay rendering
│   │   ├── chat-panel.tsx              # NEW: useChat-based chat UI
│   │   └── assumption-card.tsx         # NEW: highlighted assumption card
│   └── api/
│       └── ai/
│           └── converse/
│               └── route.ts            # NEW: conversation AI endpoint
├── server/
│   ├── ai/
│   │   └── conversation-prompt.ts      # NEW: multi-turn prompt builder
│   └── trpc/
│       └── routers/
│           └── conversation.ts         # NEW: tRPC router for message CRUD
└── lib/
    └── schemas/
        └── conversation.ts             # NEW: ConversationResponseSchema (Zod)
```

### Pattern 1: Multi-Turn Conversation with useChat

**What:** `useChat` manages the message array client-side. On mount, it's seeded with `initialMessages` loaded from the database. Each user message is sent to `/api/ai/converse` with the full history. The API route passes history to `streamText` via `convertToModelMessages`.

**When to use:** Any time the AI needs conversation context to respond correctly.

```typescript
// src/app/(dashboard)/requirements/[id]/chat-panel.tsx
// Source: https://ai-sdk.dev/docs/ai-sdk-ui/chatbot
'use client'
import { useChat } from 'ai/react'
import { DefaultChatTransport } from 'ai'

interface Props {
  requirementId: string
  initialMessages: UIMessage[]
}

export function ChatPanel({ requirementId, initialMessages }: Props) {
  const { messages, sendMessage, status, error } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/ai/converse',
      body: { requirementId },
    }),
    onFinish: async ({ message }) => {
      // Save new message pair to DB via tRPC
    },
  })
  // ...
}
```

### Pattern 2: Structured AI Response (Chat Reply + Model Patches)

**What:** The conversation endpoint returns a typed object — not free text — containing a `reply` string (shown in chat bubble) and optional `patches` (per-layer model updates). This is the same `Output.object()` pattern used in Phase 2.

**When to use:** Any AI endpoint that must return both a human-readable message AND structured data.

```typescript
// src/lib/schemas/conversation.ts
import { z } from 'zod'
import { FiveLayerModelSchema } from './requirement'

// Partial patches — only layers that changed
const ModelPatchSchema = z.object({
  goal: FiveLayerModelSchema.shape.goal.optional(),
  assumption: FiveLayerModelSchema.shape.assumption.optional(),
  behavior: FiveLayerModelSchema.shape.behavior.optional(),
  scenario: FiveLayerModelSchema.shape.scenario.optional(),
  verifiability: FiveLayerModelSchema.shape.verifiability.optional(),
})

export const ConversationResponseSchema = z.object({
  reply: z.string().describe('Conversational response shown in chat bubble'),
  patches: ModelPatchSchema.optional().describe('Model layer updates proposed by AI'),
  newAssumptions: z.array(z.object({
    content: z.string(),
    confidence: z.enum(['high', 'medium', 'low']),
    rationale: z.string(),
  })).optional().describe('New implicit assumptions surfaced by AI'),
  affectedLayers: z.array(z.enum(['goal', 'assumption', 'behavior', 'scenario', 'verifiability']))
    .optional().describe('Which layers are affected by this response'),
})

export type ConversationResponse = z.infer<typeof ConversationResponseSchema>
```

```typescript
// src/app/api/ai/converse/route.ts
import { streamText, Output, convertToModelMessages } from 'ai'
import { openai } from '@ai-sdk/openai'
import { ConversationResponseSchema } from '@/lib/schemas/conversation'
import { buildConversationPrompt } from '@/server/ai/conversation-prompt'
import { verifySession } from '@/lib/dal'

export async function POST(req: Request) {
  await verifySession()
  const { messages, requirementId, currentModel } = await req.json()

  const result = streamText({
    model: openai('gpt-4o'),
    output: Output.object({ schema: ConversationResponseSchema }),
    system: buildConversationPrompt(currentModel),
    messages: convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
```

### Pattern 3: Conversation Persistence (Prisma structured rows)

**What:** A `ConversationMessage` table with `requirementId`, `role`, `content` (JSON for structured parts), and `createdAt`. Paginate with cursor-based `take`/`skip` for "Load more".

**When to use:** Any time messages need to be loaded in pages and the conversation is unbounded.

```prisma
// prisma/schema.prisma addition
model ConversationMessage {
  id            String   @id @default(cuid())
  requirementId String
  role          String   // "user" | "assistant"
  content       Json     // UIMessage parts array
  createdAt     DateTime @default(now())

  requirement   Requirement @relation(fields: [requirementId], references: [id], onDelete: Cascade)

  @@index([requirementId, createdAt])
}
```

```typescript
// tRPC router: load last 20, paginate older
getMessages: protectedProcedure
  .input(z.object({ requirementId: z.string(), cursor: z.string().optional() }))
  .query(async ({ input }) => {
    const messages = await prisma.conversationMessage.findMany({
      where: { requirementId: input.requirementId },
      orderBy: { createdAt: 'desc' },
      take: 21,
      cursor: input.cursor ? { id: input.cursor } : undefined,
    })
    const hasMore = messages.length === 21
    return { messages: messages.slice(0, 20).reverse(), hasMore, nextCursor: hasMore ? messages[20].id : null }
  }),
```

### Pattern 4: Field-Level Diff Rendering

**What:** When AI returns `patches`, compute a diff client-side by comparing each field of the current model layer against the proposed patch. Render changed fields with green (added/changed) and red (removed) backgrounds. No external library needed.

**When to use:** Showing proposed model changes before user confirms.

```typescript
// Diff computation — no library needed for structured JSON
function computeLayerDiff(current: unknown, proposed: unknown): DiffResult {
  if (typeof current === 'string' && typeof proposed === 'string') {
    if (current === proposed) return { type: 'unchanged', value: current }
    return { type: 'changed', old: current, new: proposed }
  }
  if (Array.isArray(current) && Array.isArray(proposed)) {
    // Item-level comparison by index or content hash
    return { type: 'array-diff', items: computeArrayDiff(current, proposed) }
  }
  return { type: 'changed', old: current, new: proposed }
}
```

### Pattern 5: Assumption Surfacing Cards

**What:** When `newAssumptions` is present in the AI response, inject them into the assumption tab as highlighted cards with amber glow. Cards have Accept/Reject/Edit buttons. After action, the card transitions to a normal assumption item.

**When to use:** After any AI response that includes `newAssumptions`.

```typescript
// Assumption card state
type AssumptionCardState = 'pending' | 'accepted' | 'rejected' | 'editing'

interface PendingAssumption {
  id: string  // client-generated
  content: string
  confidence: 'high' | 'medium' | 'low'
  rationale: string
  state: AssumptionCardState
  rejectReason?: string
}
```

### Anti-Patterns to Avoid

- **Streaming free text for model updates:** The AI must return structured JSON (`Output.object`), not a text description of changes. Free text cannot be reliably parsed into model patches.
- **Storing messages as a JSON blob on Requirement:** Unbounded growth, no pagination, full load required every time.
- **Applying model changes immediately without diff gate:** User must confirm before `requirement.updateModel` is called — this is a locked decision.
- **Surfacing assumptions after every message:** Only surface on "significant changes" — the threshold is Claude's discretion (see Open Questions).
- **Using a separate session per conversation:** Single thread per requirement — locked decision.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chat message state + streaming | Custom fetch loop with useState | `useChat` from `ai/react` | Handles streaming, error states, message array, abort — already proven in ecosystem |
| Message history to AI format | Manual array mapping | `convertToModelMessages` from `ai` | Handles role mapping, content parts, tool messages correctly |
| Streaming structured output | Custom JSON accumulator | `Output.object({ schema })` + `streamText` | Same pattern as Phase 2, already verified working |
| Text diff rendering | Character-level diff algorithm | Field-level JSON comparison (hand-rolled is fine here) | Structured JSON diff is trivial; text diff libraries are overkill |

**Key insight:** The AI SDK already handles the hard parts of streaming + message history. The custom work is the structured response schema and the diff/confirm UI layer.

---

## Common Pitfalls

### Pitfall 1: useChat vs Custom Fetch for Structured Output
**What goes wrong:** `useChat` is designed for text streaming. Using it with `Output.object` requires `toUIMessageStreamResponse()` on the backend, not `toTextStreamResponse()`. Using the wrong response method causes empty messages or parse errors.
**Why it happens:** Phase 2 used `toTextStreamResponse()` with `parsePartialJson` client-side. The conversation endpoint needs `toUIMessageStreamResponse()` because `useChat` expects the UI message stream protocol.
**How to avoid:** Use `result.toUIMessageStreamResponse()` in the conversation route. The `reply` field in the structured response becomes the visible chat message.
**Warning signs:** Empty assistant messages in the chat UI despite successful API calls.

### Pitfall 2: convertToModelMessages Required
**What goes wrong:** Passing `useChat` messages directly to `streamText` without conversion causes type errors or malformed requests.
**Why it happens:** `useChat` uses `UIMessage` format (with `parts` array); `streamText` expects `CoreMessage` format.
**How to avoid:** Always call `convertToModelMessages(messages)` before passing to `streamText`.
**Warning signs:** TypeScript errors on the `messages` parameter, or AI ignoring conversation history.

### Pitfall 3: Prisma 7 Relation on Requirement
**What goes wrong:** Adding `ConversationMessage[]` relation to `Requirement` model without updating the `Requirement` model definition causes migration failures.
**Why it happens:** Prisma 7 requires explicit relation fields on both sides.
**How to avoid:** Add `conversations ConversationMessage[]` to the `Requirement` model when adding the new table.
**Warning signs:** `prisma migrate dev` fails with relation validation errors.

### Pitfall 4: Diff State Desync
**What goes wrong:** User sends a second message while a pending diff is unconfirmed. The AI generates a new patch on top of the old (unconfirmed) model, causing the diff to be based on stale state.
**Why it happens:** The `currentModel` sent to the AI endpoint reflects the confirmed model, not the pending proposed model.
**How to avoid:** Disable the chat input while a diff is pending confirmation. Show a clear "Please confirm or reject the proposed changes first" message.
**Warning signs:** Model patches that don't make sense relative to what the user sees.

### Pitfall 5: Assumption Surfacing on Every Message
**What goes wrong:** AI surfaces new assumptions after every single message, flooding the Assumption tab and annoying users.
**Why it happens:** Without a threshold, the AI will always find something to surface.
**How to avoid:** Instruct the AI in the system prompt to only surface assumptions when the conversation reveals a genuinely new implicit constraint or when the user's correction implies an assumption the model didn't have. The `newAssumptions` field should be omitted (not empty array) when no new assumptions are warranted.
**Warning signs:** `newAssumptions` populated on every response.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### Conversation API Route (full pattern)
```typescript
// src/app/api/ai/converse/route.ts
// Source: ai-sdk.dev/docs/ai-sdk-ui/chatbot + existing Phase 2 pattern
import { streamText, Output, convertToModelMessages } from 'ai'
import { openai } from '@ai-sdk/openai'
import { ConversationResponseSchema } from '@/lib/schemas/conversation'
import { buildConversationPrompt } from '@/server/ai/conversation-prompt'
import { verifySession } from '@/lib/dal'

export async function POST(req: Request) {
  await verifySession()
  const { messages, requirementId, currentModel } = await req.json()

  const result = streamText({
    model: openai('gpt-4o'),
    output: Output.object({ schema: ConversationResponseSchema }),
    system: buildConversationPrompt(currentModel),
    messages: convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
```

### useChat with initialMessages (restore from DB)
```typescript
// Source: ai-sdk.dev/docs/ai-sdk-ui/storing-messages
const { messages, sendMessage, status } = useChat({
  messages: initialMessages,  // loaded from DB server-side
  transport: new DefaultChatTransport({
    api: '/api/ai/converse',
    body: { requirementId, currentModel },
  }),
  onFinish: async ({ message }) => {
    // persist via tRPC mutation
    await saveMessage.mutateAsync({ requirementId, message })
  },
})
```

### Conversation System Prompt Extension
```typescript
// src/server/ai/conversation-prompt.ts
// Extends buildStructuringPrompt pattern from prompt.ts
export function buildConversationPrompt(currentModel: FiveLayerModel): string {
  return `You are a requirements engineering expert helping refine a structured five-layer model.

## Current Model
${JSON.stringify(currentModel, null, 2)}

## Your Task
Respond to the user's refinement request. You MUST:
1. Provide a brief conversational reply in the "reply" field
2. If the user's message requires model changes, populate "patches" with ONLY the affected layers
3. Surface new implicit assumptions in "newAssumptions" ONLY when the conversation reveals genuinely new constraints
4. List affected layers in "affectedLayers"

## Rules
- Output language MUST match the user's input language
- Only include layers in "patches" that actually need to change
- Do NOT surface assumptions after every message — only on significant revelations
- Patches must conform to the existing schema structure exactly`
}
```

### Diff Rendering in LayerEditor
```typescript
// Extend LayerEditor to accept a pendingData prop
interface Props {
  // ... existing props
  pendingData?: Record<string, unknown>  // proposed by AI, not yet confirmed
  onConfirmDiff?: () => void
  onRejectDiff?: () => void
}

// Field-level diff: highlight changed values
function DiffField({ current, proposed }: { current: string; proposed: string }) {
  if (current === proposed) return <span>{current}</span>
  return (
    <span>
      <span className="bg-red-100 line-through text-red-700">{current}</span>
      {' '}
      <span className="bg-green-100 text-green-700">{proposed}</span>
    </span>
  )
}
```

### Assumption Card (pending state)
```typescript
// src/app/(dashboard)/requirements/[id]/assumption-card.tsx
interface AssumptionCardProps {
  assumption: PendingAssumption
  onAccept: (edited?: string) => void
  onReject: (reason: string) => void
}

// Amber glow via Tailwind: ring-2 ring-amber-400 bg-amber-50
// After action: transition to normal assumption item (remove ring/bg)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual fetch + useState for chat | `useChat` hook | AI SDK v3+ | Eliminates boilerplate for streaming chat |
| `toTextStreamResponse()` for all streaming | `toUIMessageStreamResponse()` for chat, `toTextStreamResponse()` for object streaming | AI SDK 5/6 | Must use correct method per use case |
| `jsonSchema()` bridge for Zod | Native Zod 4 support in `Output.object` | AI SDK 6 + Zod 4 | Already verified in Phase 2 — no bridge needed |
| `useObject` hook for structured streaming | `Output.object` inside `streamText` | AI SDK 6 | Phase 2 already uses this pattern |

**Deprecated/outdated:**
- `useObject` hook: Phase 2 replaced with `parsePartialJson` + custom fetch. For Phase 3, `useChat` + `Output.object` inside `streamText` is the correct pattern — the AI returns structured data as part of a chat response.
- `createAI` / RSC AI state: Old pattern, not used in this project.

---

## Open Questions

1. **"Significant change" threshold for assumption surfacing**
   - What we know: User wants assumptions surfaced only on significant changes, not every message
   - What's unclear: How to define "significant" — by number of layers changed? By semantic novelty? By explicit AI judgment?
   - Recommendation: Instruct the AI in the system prompt to use its own judgment ("only surface when the conversation reveals a genuinely new implicit constraint"). This is Claude's discretion per CONTEXT.md. The AI omits `newAssumptions` when not warranted.

2. **useChat message format compatibility with Output.object**
   - What we know: `useChat` expects `toUIMessageStreamResponse()`. `Output.object` inside `streamText` streams a structured object. The `reply` field becomes the visible text.
   - What's unclear: Whether `useChat` renders the full structured object or just the `reply` field in the message bubble.
   - Recommendation: The `reply` field should be the only text content in the response. The `patches` and `newAssumptions` are extracted from the message metadata/parts on `onFinish`. Verify this behavior during 03-01 implementation.

3. **Undo state management**
   - What we know: One-step undo after applying changes, reverting to pre-apply state.
   - What's unclear: Where undo state lives — in `ModelTabs` component state or in the database.
   - Recommendation: Component state only (a `previousModel` ref set before each apply). No DB write needed for undo — it's ephemeral per session.

---

## Sources

### Primary (HIGH confidence)
- Vercel AI SDK 6 docs (ai-sdk.dev) — `useChat`, `initialMessages`, `onFinish`, `convertToModelMessages`, `toUIMessageStreamResponse`
- Existing codebase (`src/server/ai/structuring.ts`, `src/app/api/ai/structure/route.ts`) — `Output.object`, `streamText`, `FiveLayerModelSchema` patterns
- Existing codebase (`src/app/(dashboard)/requirements/[id]/model-tabs.tsx`) — streaming, `parsePartialJson`, `persistModel` patterns
- Prisma 7 docs — `ConversationMessage` table design, cursor-based pagination

### Secondary (MEDIUM confidence)
- ai-sdk.dev/docs/ai-sdk-ui/storing-messages — `onFinish` persistence pattern, `initialMessages` restore
- aihero.dev/vercel-ai-sdk-messages-array — `CoreMessage` format, multi-turn history

### Tertiary (LOW confidence)
- WebSearch results on React diff rendering — no authoritative source found; field-level JSON diff is hand-rolled (LOW risk given structured data shape)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and verified in Phase 2
- Architecture: HIGH — `useChat` + `Output.object` + `convertToModelMessages` verified from official docs
- Pitfalls: MEDIUM — `toUIMessageStreamResponse` vs `toTextStreamResponse` distinction verified; diff state desync is reasoned from architecture
- Diff rendering: MEDIUM — field-level JSON diff is straightforward but exact rendering approach is discretionary

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (AI SDK 6 is stable; 30-day window)
