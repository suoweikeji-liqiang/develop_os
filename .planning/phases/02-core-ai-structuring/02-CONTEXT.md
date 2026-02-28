# Phase 2: Core AI Structuring - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Users input fuzzy natural language requirements (Chinese or English) and receive a structured five-layer model: goal, assumption, behavior, scenario, and verifiability. The AI output is validated against schema and automatically retried if malformed. Generated models are persisted and retrievable.

</domain>

<decisions>
## Implementation Decisions

### Input Method
- Large text area as primary input
- Placeholder with example requirements (Chinese and English)
- File upload as secondary option (.txt, .md)
- Support both Chinese and English input

### Layer Display
- Tab-based navigation for each of the five layers
- Each layer (goal, assumption, behavior, scenario, verifiability) has its own tab
- Editable inline within each tab
- Clear visual distinction between layers

### Validation & Retry
- Auto-retry up to 3 times on malformed output
- Silent retry (user doesn't see retries)
- Show attempt count only if all retries fail
- Display confidence scores for each layer's output

### Data Persistence
- Primary: Database storage via Prisma
- Draft backup: localStorage for auto-save
- Auto-save every 30 seconds
- Version tracking enabled from the start (prerequisites for Phase 4)

</decisions>

<specifics>
## Specific Ideas

- Tabs pattern: clean, familiar, lets users focus on one layer at a time
- "Like a wizard but all layers visible" — users can jump between layers
- Confidence scores: high/medium/low, shown per layer

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-core-ai-structuring*
*Context gathered: 2026-02-28*
