# Phase 4: Model Versioning - Research

**Researched:** 2026-03-01
**Domain:** Data versioning, immutable snapshots, structured JSON diffing
**Confidence:** HIGH

## Summary

Phase 4 adds immutable version snapshots and structured diff views to the requirement model system. The existing codebase already has a `version` integer field on the `Requirement` model that increments on each `updateModel` call, and a `DiffSummary` component in `layer-editor.tsx` that does field-level JSON.stringify comparison. What's missing is a separate snapshot table to store historical versions (currently updates are in-place, overwriting the previous model), and a proper structured diff engine that understands the five-layer model semantics.

The recommended approach is the **snapshot pattern**: a new `RequirementVersion` table stores immutable copies of the full model JSON at each version number, linked to the parent `Requirement`. This is simpler and more robust than event sourcing for this use case — we need full snapshots for display and comparison, not event replay. For diffing, the project should use a custom layer-aware diff function built on top of a lightweight generic diff library (microdiff, <1kb, zero deps, full TypeScript support) rather than hand-rolling recursive comparison or using a heavy library like jsondiffpatch.

The key architectural insight: the diff must be **structured at the five-layer model level** (goal/assumption/behavior/scenario/verifiability), not at the raw JSON text level. This means diffing each layer independently and presenting changes grouped by layer, with semantic labels (added scenario, removed assumption, changed goal summary) rather than generic "field X changed from A to B".

**Primary recommendation:** Add a `RequirementVersion` Prisma model with immutable snapshots, intercept all model mutation paths to create snapshots automatically, and build a layer-aware diff engine using microdiff as the low-level comparator.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MOD-01 | 需求模型支持版本化，每次变更生成不可变快照 | Snapshot pattern with `RequirementVersion` table; intercept `updateModel` tRPC mutation and converse route to create snapshots on every model change |
| MOD-02 | 支持结构化 diff 视图（目标/场景/状态变更级别，非文本行级别） | Layer-aware diff engine using microdiff; UI components for version history browsing and side-by-side structured diff display |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | ^7.4.2 | ORM, migrations, schema | Already in project; handles JSONB natively |
| PostgreSQL | 16 | Database with JSONB support | Already in project; JSONB enables efficient JSON storage and querying |
| tRPC | ^11.0.0 | Type-safe API layer | Already in project; version history endpoints follow existing pattern |
| Zod | ^4.3.6 | Schema validation | Already in project; validate snapshot data shape |
| Next.js | 16.1.6 | App router, server components | Already in project; version history pages follow existing route patterns |

### New Dependencies
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| microdiff | ^1.5.0 | Low-level object diffing | Computing raw diffs between two model snapshots |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| microdiff | jsondiffpatch | jsondiffpatch has visual HTML formatters and patch/unpatch, but is 15x larger and overkill — we need structured layer-level diffs, not generic JSON patches |
| microdiff | deep-object-diff | deep-object-diff has `detailedDiff` (added/deleted/updated), but microdiff is 3x faster, has native TS types, and returns a cleaner flat array format |
| microdiff | Hand-rolled diff | The existing `DiffSummary` in layer-editor.tsx uses JSON.stringify comparison — works for shallow fields but breaks on nested arrays (scenarios, assumptions). microdiff handles this correctly |
| Snapshot table | Event sourcing | Event sourcing stores deltas, not full states — requires replay to reconstruct any version. Snapshots are simpler: store full model JSON, compare any two directly. For <100 versions per requirement, storage cost is negligible |

**Installation:**
```bash
npm install microdiff
```

## Architecture Patterns

### Existing Codebase: Mutation Points to Intercept

The current codebase has three paths that mutate the requirement model:

1. **tRPC `requirement.updateModel`** (`src/server/trpc/routers/requirement.ts` line 54-77) — called by inline editing in `ModelTabs` and by `RequirementDetailClient.handleApplyPatch`
2. **AI structuring completion** (`src/app/(dashboard)/requirements/[id]/model-tabs.tsx` line 137) — calls `persistModel` after streaming finishes
3. **Assumption acceptance** (`src/app/(dashboard)/requirements/[id]/requirement-detail-client.tsx` line 110) — calls `requirement.updateModel` after user accepts an assumption

All three paths ultimately call the same tRPC `requirement.updateModel` mutation. This is the single interception point for snapshot creation.

### Pattern 1: Snapshot-on-Write (Recommended)

**What:** Before updating the `Requirement.model` field, read the current model and save it as an immutable `RequirementVersion` row. Then update the requirement with the new model and increment the version counter.

**When to use:** Every model mutation.

**Why this order:** Save the *previous* state as a snapshot before overwriting. The current (latest) state always lives on the `Requirement` row itself. This avoids double-writing the latest version.

```typescript
// In requirement.ts updateModel mutation
const current = await prisma.requirement.findUnique({
  where: { id: input.id },
  select: { model: true, version: true, confidence: true },
})

// Save current state as immutable snapshot (if model exists)
if (current?.model) {
  await prisma.requirementVersion.create({
    data: {
      requirementId: input.id,
      version: current.version,
      model: current.model,
      confidence: current.confidence ?? undefined,
      createdBy: ctx.session.userId,
    },
  })
}

// Then update to new model
const requirement = await prisma.requirement.update({
  where: { id: input.id },
  data: {
    model: input.model,
    confidence: input.confidence ?? undefined,
    version: { increment: 1 },
  },
})
```

### Pattern 2: Prisma Schema for RequirementVersion

**What:** Immutable snapshot table linked to Requirement.

```prisma
model RequirementVersion {
  id            String      @id @default(cuid())
  requirementId String
  version       Int
  model         Json
  confidence    Json?
  changeSource  String      @default("manual") // "manual" | "ai-structure" | "ai-converse" | "assumption"
  createdBy     String
  createdAt     DateTime    @default(now())

  requirement   Requirement @relation(fields: [requirementId], references: [id], onDelete: Cascade)

  @@unique([requirementId, version])
  @@index([requirementId, createdAt])
}
```

Key design decisions:
- `@@unique([requirementId, version])` — enforces one snapshot per version number per requirement
- `changeSource` — tracks what triggered the change (useful for version history UI labels)
- `model Json` (not `Json?`) — snapshots always have a model; null models are never snapshotted
- `onDelete: Cascade` — if a requirement is deleted, its version history goes with it
- No `updatedAt` — snapshots are immutable, never updated

### Pattern 3: Layer-Aware Structured Diff

**What:** Diff two FiveLayerModel snapshots at the semantic layer level, not raw JSON level.

**Architecture:** A `computeStructuredDiff` function that:
1. Iterates over the 5 layer keys
2. For each layer, uses microdiff to compute raw changes
3. Translates raw changes into semantic diff entries with human-readable labels

```typescript
import diff from 'microdiff'
import type { FiveLayerModel } from '@/lib/schemas/requirement'

type DiffType = 'CREATE' | 'CHANGE' | 'REMOVE'

interface LayerDiffEntry {
  path: string[]
  type: DiffType
  oldValue?: unknown
  newValue?: unknown
  label: string  // Human-readable: "添加了场景", "修改了目标概述"
}

interface StructuredDiff {
  goal: LayerDiffEntry[]
  assumption: LayerDiffEntry[]
  behavior: LayerDiffEntry[]
  scenario: LayerDiffEntry[]
  verifiability: LayerDiffEntry[]
  summary: { added: number; changed: number; removed: number }
}

const LAYER_KEYS = ['goal', 'assumption', 'behavior', 'scenario', 'verifiability'] as const

function computeStructuredDiff(
  oldModel: FiveLayerModel,
  newModel: FiveLayerModel
): StructuredDiff {
  const result: StructuredDiff = {
    goal: [], assumption: [], behavior: [],
    scenario: [], verifiability: [],
    summary: { added: 0, changed: 0, removed: 0 },
  }

  for (const layer of LAYER_KEYS) {
    const changes = diff(oldModel[layer], newModel[layer])
    result[layer] = changes.map(c => ({
      path: c.path.map(String),
      type: c.type,
      oldValue: c.oldValue,
      newValue: c.value,
      label: buildChangeLabel(layer, c),
    }))
    // Tally summary
    for (const c of changes) {
      if (c.type === 'CREATE') result.summary.added++
      else if (c.type === 'CHANGE') result.summary.changed++
      else if (c.type === 'REMOVE') result.summary.removed++
    }
  }

  return result
}
```

### Pattern 4: Version History Timeline UI

**What:** A sidebar or panel showing version history for a requirement, with version number, timestamp, change source, and diff summary badge.

**Recommended component structure:**
```
src/app/(dashboard)/requirements/[id]/
  version-history.tsx      # Version list with timeline UI
  version-diff-view.tsx    # Side-by-side structured diff display
  page.tsx                 # Updated to include version history toggle
```

### Anti-Patterns to Avoid
- **Storing diffs instead of snapshots:** Tempting for storage efficiency, but makes it impossible to display any arbitrary version without replaying all diffs from the beginning. Store full snapshots.
- **Diffing at the JSON text level:** `JSON.stringify` comparison loses semantic meaning. "Field at path `scenario.normal[1].steps[2]`" is meaningless to users. Diff at the layer level with human-readable labels.
- **Mutable version rows:** Never update a `RequirementVersion` row after creation. If the schema needs to change, add new columns with defaults — don't backfill.
- **Snapshotting null models:** The initial requirement creation has `model: null`. Don't create a version snapshot for null-to-first-model transitions — version 1 is the first AI-generated model.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deep object comparison | Recursive equality check | microdiff | Handles arrays, nested objects, Date/RegExp, cyclic refs; <1kb |
| Version number generation | Custom counter logic | Prisma `version: { increment: 1 }` | Already in codebase, atomic, race-condition safe |
| Unique constraint on (requirementId, version) | Application-level check | Prisma `@@unique([requirementId, version])` | Database-level enforcement, no race conditions |
| JSON deep clone for snapshots | `JSON.parse(JSON.stringify())` | Prisma JSONB storage | Prisma handles serialization/deserialization of Json fields natively |

**Key insight:** The versioning domain is deceptively simple on the surface but has subtle correctness requirements (atomicity, immutability enforcement, array diffing). Use database constraints and a proven diff library rather than hand-rolling.

## Common Pitfalls

### Pitfall 1: Race Condition on Snapshot Creation
**What goes wrong:** Two concurrent model updates read the same current version, both try to create a snapshot with the same version number, one fails with a unique constraint violation.
**Why it happens:** The read-then-write pattern in `updateModel` is not atomic.
**How to avoid:** Use Prisma's `$transaction` to wrap the snapshot creation and model update in a single database transaction. The `@@unique([requirementId, version])` constraint acts as a safety net.
**Warning signs:** Intermittent "Unique constraint failed" errors in production logs.

### Pitfall 2: Client-Side Model Updates Bypassing Snapshot
**What goes wrong:** The client calls `requirement.updateModel` via direct fetch (as in `ModelTabs.persistModel` and `RequirementDetailClient.handleApplyPatch`) — if the snapshot logic only lives in one code path, other paths skip it.
**Why it happens:** Multiple UI components independently call the same tRPC endpoint.
**How to avoid:** Put snapshot logic inside the tRPC `updateModel` mutation itself — it's the single server-side entry point. All client paths converge there.
**Warning signs:** Version history has gaps (e.g., jumps from v2 to v5).

### Pitfall 3: Array Diffing Without Object Identity
**What goes wrong:** microdiff compares arrays by position, not by content identity. If a user reorders assumptions, the diff shows every item as "changed" rather than "moved".
**Why it happens:** JSON arrays have no inherent identity — `items[0]` and `items[1]` are matched by index.
**How to avoid:** For the diff UI, detect reorders by comparing item content hashes. If an item appears in both old and new arrays but at different indices, label it as "moved" rather than "removed + added". This is a UI-level concern, not a storage concern.
**Warning signs:** Reordering scenarios shows massive diffs with all items marked as changed.

### Pitfall 4: Large JSONB Snapshots Slowing Down Queries
**What goes wrong:** Loading version history with full model JSON for 50+ versions is slow and memory-heavy.
**Why it happens:** Each snapshot stores the complete five-layer model (~5-15KB of JSON).
**How to avoid:** Version history list queries should SELECT only metadata (version, createdAt, changeSource, createdBy) — not the full model JSON. Load full model JSON only when the user selects two versions to compare.
**Warning signs:** Version history page takes >1s to load for requirements with many versions.

### Pitfall 5: First Model Generation Not Creating a Snapshot
**What goes wrong:** The initial AI structuring creates the first model (version 1), but since there's no previous model to snapshot, the version history starts empty. When the user makes their first edit, only version 1 gets snapshotted — the user can never see the "original AI output" as a distinct version.
**Why it happens:** The snapshot-on-write pattern saves the *previous* state before overwriting.
**How to avoid:** When the first model is created (transition from null to a model), create a version 1 snapshot immediately. This ensures the original AI output is always preserved in history.
**Warning signs:** Version history shows "v1" but it's actually the state after the first edit, not the original AI output.

## Code Examples

### Example 1: Transactional Snapshot + Update

```typescript
// src/server/trpc/routers/requirement.ts — updated updateModel mutation
updateModel: protectedProcedure
  .input(z.object({
    id: z.string(),
    model: FiveLayerModelSchema,
    confidence: z.record(z.string(), z.number()).optional(),
    changeSource: z.enum(['manual', 'ai-structure', 'ai-converse', 'assumption']).default('manual'),
  }))
  .mutation(async ({ input, ctx }) => {
    return prisma.$transaction(async (tx) => {
      const current = await tx.requirement.findUniqueOrThrow({
        where: { id: input.id },
        select: { model: true, version: true, confidence: true },
      })

      // Snapshot previous state (skip if no model yet)
      if (current.model) {
        await tx.requirementVersion.create({
          data: {
            requirementId: input.id,
            version: current.version,
            model: current.model,
            confidence: current.confidence ?? undefined,
            changeSource: input.changeSource,
            createdBy: ctx.session.userId,
          },
        })
      }

      // Update to new model
      const requirement = await tx.requirement.update({
        where: { id: input.id },
        data: {
          model: input.model,
          confidence: input.confidence ?? undefined,
          version: { increment: 1 },
        },
      })

      eventBus.emit('requirement.version.created', {
        requirementId: requirement.id,
        version: requirement.version,
        previousVersion: current.version,
        createdBy: ctx.session.userId,
      })

      return requirement
    })
  }),
```

### Example 2: Version History tRPC Endpoints

```typescript
// src/server/trpc/routers/version.ts
export const versionRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ requirementId: z.string() }))
    .query(async ({ input }) => {
      return prisma.requirementVersion.findMany({
        where: { requirementId: input.requirementId },
        select: {
          id: true, version: true, changeSource: true,
          createdBy: true, createdAt: true,
        },
        orderBy: { version: 'desc' },
      })
    }),

  getTwo: protectedProcedure
    .input(z.object({
      requirementId: z.string(),
      versionA: z.number(),
      versionB: z.number(),
    }))
    .query(async ({ input }) => {
      const [a, b] = await Promise.all([
        prisma.requirementVersion.findUnique({
          where: {
            requirementId_version: {
              requirementId: input.requirementId,
              version: input.versionA,
            },
          },
        }),
        prisma.requirementVersion.findUnique({
          where: {
            requirementId_version: {
              requirementId: input.requirementId,
              version: input.versionB,
            },
          },
        }),
      ])
      return { versionA: a, versionB: b }
    }),
})
```

### Example 3: microdiff Usage for Layer Diffing

```typescript
import diff from 'microdiff'

// microdiff returns an array of Difference objects:
// { type: 'CREATE' | 'CHANGE' | 'REMOVE', path: (string|number)[], value?: any, oldValue?: any }

const oldGoal = {
  summary: 'User can log in',
  before: 'No authentication',
  after: 'Users authenticated',
  metrics: ['Login success rate > 99%'],
}

const newGoal = {
  summary: 'User can log in securely',
  before: 'No authentication',
  after: 'Users authenticated with MFA',
  metrics: ['Login success rate > 99%', 'MFA adoption > 80%'],
}

const changes = diff(oldGoal, newGoal)
// [
//   { type: 'CHANGE', path: ['summary'], value: 'User can log in securely', oldValue: 'User can log in' },
//   { type: 'CHANGE', path: ['after'], value: 'Users authenticated with MFA', oldValue: 'Users authenticated' },
//   { type: 'CREATE', path: ['metrics', 1], value: 'MFA adoption > 80%' },
// ]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Event sourcing for all versioning | Snapshot pattern for document-level versioning | Ongoing consensus | Simpler implementation, direct version comparison without replay |
| Text-level diff (line-by-line) | Semantic/structural diff | 2023+ | Users see meaningful changes, not raw JSON mutations |
| `JSON.stringify` equality | Deep object diff libraries (microdiff) | 2021+ | Correct handling of nested arrays, objects, special types |
| Mutable history tables | Immutable append-only snapshots | Standard practice | Audit trail integrity, no accidental history corruption |

**Deprecated/outdated:**
- `deep-diff` package: Last updated 2019, no native TypeScript types, superseded by microdiff
- `json-diff` package: Designed for CLI output, not programmatic use

## Open Questions

1. **Backfill existing requirements?**
   - What we know: Requirements created in Phase 2/3 have `version` counters but no snapshot history
   - What's unclear: Should we create retroactive v1 snapshots for existing requirements during migration?
   - Recommendation: Yes — run a one-time migration script that creates a v1 snapshot from the current model for all existing requirements. This ensures version history works for pre-Phase-4 data.

2. **Version history retention policy?**
   - What we know: For a 5-15 person team, version counts per requirement will likely stay under 100
   - What's unclear: Should there be a max version limit or cleanup policy?
   - Recommendation: No limit for v1. At ~10KB per snapshot, 100 versions = 1MB per requirement — negligible. Revisit if usage patterns change.

3. **Diff computation: server-side or client-side?**
   - What we know: microdiff is <1kb and runs fast in both environments
   - What's unclear: Should diff be computed on the server (tRPC endpoint returns diff) or client (fetch two snapshots, diff in browser)?
   - Recommendation: Client-side. Fetch the two model snapshots via tRPC, compute diff in the browser. This keeps the server stateless and avoids serializing the custom diff format. microdiff is tiny enough for client bundles.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis — Prisma schema, tRPC routers, UI components, event types
- [Snapshot Design Pattern](https://www.jamestharpe.com/snapshot-pattern/) — Immutable insert-only database versioning pattern
- [microdiff GitHub](https://github.com/AsyncBanana/microdiff) — v1.5.0, <1kb, zero deps, native TypeScript, handles nested objects/arrays

### Secondary (MEDIUM confidence)
- [npm-compare: deep-diff vs json-diff vs jsondiffpatch](https://npm-compare.com/deep-diff,json-diff,jsondiffpatch) — Library comparison and download trends
- [PostgreSQL Event Sourcing patterns](https://medium.com/@tobyhede/event-sourcing-with-postgresql-28c5e8f211a2) — Event sourcing vs snapshot tradeoffs
- [Data versioning approaches](https://stackoverflow.com/questions/4185235/ways-to-implement-data-versioning-in-postresql) — History table, event log, and snapshot approaches compared

### Tertiary (LOW confidence)
- None — all findings verified against codebase or official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all core libraries already in project; microdiff is well-established with native TS
- Architecture: HIGH - snapshot pattern is well-understood; single mutation interception point identified in codebase
- Pitfalls: HIGH - derived from direct codebase analysis of mutation paths and data flow

**Research date:** 2026-03-01
**Valid until:** 2026-03-31 (stable domain, no fast-moving dependencies)
