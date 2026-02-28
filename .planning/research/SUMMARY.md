# Project Research Summary

**Project:** DevOS — AI-Driven Requirements Clarification Platform
**Domain:** AI-augmented requirements engineering with multi-role consensus workflow
**Researched:** 2026-02-28
**Confidence:** MEDIUM

## Executive Summary

DevOS occupies an unoccupied gap between heavyweight enterprise RM tools (IBM DOORS, Jama) and lightweight project trackers (Linear, Jira). The core product is an AI engine that transforms fuzzy natural-language input into a five-layer structured model (Goal/Assumption/Behavior/Scenario/Verifiability), refined through conversational dialogue and validated through role-specific consensus workflows. No existing tool combines AI-driven structuring, behavior modeling, and multi-role sign-off for small R&D teams — this is the defensible position.

The recommended approach is a modular monolith built on Next.js 15 + TypeScript + PostgreSQL, with an internal event bus enabling future agent extensibility without microservice overhead. The Vercel AI SDK handles LLM integration with provider abstraction; Yjs + Hocuspocus handles real-time presence; pgvector keeps the knowledge base in a single database. For a 5-15 person internal tool, this stack avoids operational complexity while preserving all extensibility paths. The agent plugin architecture should be extracted from a working clarification agent — not designed upfront.

The primary risks are architectural and behavioral, not technical. Over-structuring too early (forcing all five layers from a single input) produces plausible-but-wrong AI output that teams rubber-stamp. Consensus theater (showing everyone the same view and calling it agreement) recreates the exact misalignment problem DevOS aims to solve. Both must be addressed in Phase 1 design — they cannot be retrofitted. LLM non-determinism requires Zod schema validation with retry loops from day one; treating LLM output as deterministic causes silent data corruption that cascades through versioning and collaboration.

## Key Findings

### Recommended Stack

The stack is optimized for a small team building an AI-first internal tool. Next.js App Router provides server-side AI streaming without WebSocket boilerplate. tRPC gives end-to-end type safety without code generation. PostgreSQL with JSONB handles the semi-structured five-layer model without rigid migrations, and pgvector keeps semantic search in the same database. BullMQ + Redis handles async AI tasks with retry and rate limiting built in.

**Core technologies:**
- Next.js 15 (App Router): full-stack framework — Server Components enable AI streaming; single deployable unit reduces ops overhead
- TypeScript 5: type safety — shared types between client/server enforce the same contract DevOS aims to give teams
- Vercel AI SDK 4: LLM integration — provider-agnostic, `generateObject()` maps directly to five-layer model generation
- Zod 3: schema validation — define requirement model schemas once, use for both AI output validation and API input validation
- PostgreSQL 16 + pgvector: primary database + vector search — JSONB for flexible model storage, pgvector for knowledge base semantic search
- Prisma 6: ORM — type-safe queries, migrations, JSON field support
- Yjs + Hocuspocus: real-time presence — CRDT for conflict-free editing, production-ready sync server
- tRPC 11: API layer — end-to-end type safety, zero code generation
- EventEmitter3: in-process event bus — lightweight, typed, replaceable with message queue in v2+
- BullMQ + Redis: async job queue — AI task processing with retries and rate limiting
- ReactFlow 12: state diagram visualization — renders behavior model as interactive state diagrams
- Tiptap 2: rich text editor — native Yjs integration for collaborative editing

**Version note:** All versions are from training data. Run `npm view <pkg> version` before development to confirm current releases.

### Expected Features

**Must have (table stakes):**
- Natural language requirement input — messy real-world input (WeChat messages, meeting notes) must work
- AI-driven structuring into five-layer model — the core value prop; without this, no reason to exist vs. a shared doc
- Conversational refinement — dialogue-based correction is the "clarification" in the product name
- Multi-role visibility — PM/Dev/Test/UI share one model with role-appropriate views
- Requirement model versioning — linear version history with snapshots; branching is v2+
- Model diff view — structured diff (added/removed goals, scenarios, state transitions), not line-by-line text diff
- Basic collaboration — async comments, @mentions, review status per role
- Requirement status tracking — Draft -> In Review -> Consensus -> Implementation -> Done
- External requirement submission — simple form for non-R&D departments, no full system login required
- Search and navigation — full-text search, filter by status/tag/role
- Notification system — in-app + email/webhook, event-driven
- User authentication and roles — PM, Dev, Test, UI, External; SSO is v2+

**Should have (differentiators):**
- Assumption surfacing with confidence scores — AI identifies implicit assumptions; this alone could justify the product
- Conflict detection — AI flags contradictions between requirements or between assumptions and behaviors
- Visual behavior modeling — auto-generated state diagrams from behavior layer; not a general diagramming tool
- Consensus workflow — role-specific review checklists, explicit sign-off per role, blocks status transition until complete
- AI-driven scenario generation — auto-generate normal/abnormal/edge-case scenarios from behavior model
- Knowledge base context — document upload + code repo indexing via RAG
- Clarification session replay — full conversation history linked to model versions; new team members see the "why"

**Defer to v2+:**
- Historical learning (requires significant data accumulation before it's useful)
- Requirement model API (build when first downstream consumer exists)
- Code generation, test generation, code review agents (per project scope)
- SSO / third-party integrations (Feishu, Confluence)

### Architecture Approach

The architecture is an event-driven modular monolith. Modules (Requirement Engine, Collaboration, Knowledge Base, Agent Orchestrator, External Intake) communicate exclusively through a typed internal event bus — no direct cross-module function calls. All AI interactions route through Agent Orchestrator -> Agent Plugin -> LLM; no direct LLM calls from UI or API handlers. Every requirement model change creates an immutable versioned snapshot — never mutate in place.

**Major components:**
1. Requirement Engine — core domain: CRUD, versioning, diff computation, five-layer model management
2. Agent Orchestrator + Plugin Layer — plugin registry, task dispatch, result routing; Clarifier Agent is the v1 core plugin
3. Collaboration Module — multi-role presence, review workflows, consensus tracking; subscribes to requirement events
4. Knowledge Base Module — document upload, embedding generation, RAG retrieval; feeds context to agents
5. External Intake — thin public form layer over the existing requirement engine
6. Event Bus — decouples all modules; domain events follow `domain.entity.action` naming

### Critical Pitfalls

1. **Over-structuring too early** — forcing all five layers from a single input produces hallucinated specifics users rubber-stamp. Prevention: progressive structuring (unlock deeper layers as confidence grows), track AI-generated vs human-confirmed provenance per field.

2. **Consensus theater** — showing all roles the same view and treating visibility as agreement recreates the misalignment problem. Prevention: role-specific review views with role-specific checklists; silent approval from technical roles is a red flag.

3. **LLM output treated as deterministic** — same input produces different structures; rigid downstream parsing causes silent data corruption. Prevention: Zod schema validation on every LLM response, validation-retry loop, store raw LLM output alongside parsed output.

4. **Knowledge base black hole** — RAG quality degrades as corpus grows without curation; AI starts citing deprecated decisions. Prevention: curation-first design with expiration dates, context attribution on every AI suggestion, separate active context from historical archive.

5. **Agent plugin interface timing** — designing the plugin API before having a working agent produces over-abstracted interfaces. Prevention: build clarifier as a well-bounded internal module first, extract the plugin interface after it works end-to-end.

## Implications for Roadmap

The dependency chain is clear: data models -> requirement engine -> agent system -> knowledge base -> collaboration -> external intake. This maps to four phases for v1.

### Phase 1: Foundation + Core Structuring Engine
**Rationale:** Validates the central hypothesis — can AI usefully structure fuzzy requirements? If not, nothing else matters. Everything else depends on the data models and event bus built here.
**Delivers:** Working AI structuring into five-layer model, conversational refinement, basic versioning, user auth, requirement status tracking, search
**Addresses:** NL input, AI structuring, conversational refinement, auth, status tracking, search
**Avoids:** Over-structuring (progressive layer unlocking from day one), LLM non-determinism (Zod validation + retry), prompt spaghetti (three-layer prompt architecture: domain logic / prompt templates / LLM interface), event overhead (synchronous EventEmitter3, not async queue)

### Phase 2: Collaboration + Consensus
**Rationale:** Once structuring works, test whether structured collaboration reduces misalignment. Adds the multi-role workflow that is DevOS's second core differentiator.
**Delivers:** Role-specific views, model versioning with diff UI, consensus workflow, external submission portal, notifications
**Addresses:** Multi-role visibility, versioning, diff view, consensus workflow, external submission, notifications
**Avoids:** Consensus theater (role-specific checklists, not generic approve button), external dumping ground (guided submission form with structurability scoring)

### Phase 3: Intelligence + Differentiation
**Rationale:** With core structuring and collaboration stable, deepen the AI's value. These features require a stable model structure and accumulated requirements to work well.
**Delivers:** Assumption surfacing with confidence scores, conflict detection, AI scenario generation, visual state diagrams, knowledge base (document upload + code repo), clarification replay
**Addresses:** Assumption surfacing, conflict detection, scenario generation, behavior visualization, knowledge base context, session replay
**Avoids:** Knowledge base black hole (curation-first design, context attribution, active vs archive separation)

### Phase 4: Agent Plugin Extraction + v2 Foundation
**Rationale:** After three phases, the clarifier agent's real interface needs are known. Extract the plugin pattern from the working agent, not from speculation. Unlocks the extensibility path for future agents.
**Delivers:** Formalized agent plugin interface, scenario generator agent as second plugin, requirement model API for downstream consumers
**Addresses:** Extensibility chain (model API -> future agents)
**Avoids:** Plugin interface too early/too late pitfall

### Phase Ordering Rationale

- Foundation before everything: PostgreSQL schema, event bus, and auth are dependencies for all other modules
- Requirement Engine before Agents: agents need a model to operate on and a versioning system to write to
- Basic agents before Knowledge Base: the clarifier works without RAG; RAG enhances quality but is not required for the core loop
- Collaboration after core engine: you need stable requirements to collaborate on
- External intake is a thin layer over the existing engine — no new infrastructure required
- Plugin extraction in Phase 4: the real agent interface emerges from Phase 1-3 implementation, not from upfront design

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (AI structuring engine):** Prompt architecture for five-layer model generation needs empirical testing with real Chinese-language inputs. Progressive structuring UX (which layers to unlock when) needs user research.
- **Phase 3 (conflict detection):** Cross-requirement contradiction detection is a hard NLP problem. Research specific approaches (embedding similarity, LLM-based comparison, rule-based) before committing to an implementation strategy.
- **Phase 3 (knowledge base RAG):** Chunking strategy for mixed Chinese-English technical documents and code repositories needs validation. LangChain text splitters are LOW confidence — evaluate alternatives.

Phases with standard patterns (skip research-phase):
- **Phase 1 (auth + data models):** Standard Next.js auth patterns, Prisma schema design — well-documented
- **Phase 2 (versioning + diff):** JSON snapshot + json-diff pattern is well-established
- **Phase 2 (WebSocket + presence):** Yjs + Hocuspocus has extensive documentation and production examples
- **Phase 4 (plugin interface):** Extract from working code — refactoring, not research

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Core technology choices are HIGH confidence; specific version numbers need live verification before development starts |
| Features | MEDIUM | Core feature set is well-reasoned from domain knowledge; competitor feature sets need validation against current product pages |
| Architecture | MEDIUM | Patterns are well-established; the specific five-layer model architecture is novel with no direct precedent to validate against |
| Pitfalls | MEDIUM | Based on domain expertise in LLM applications and collaborative platforms; web search unavailable for verification against real post-mortems |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Chinese language NLP validation:** Test the structuring engine with real Chinese-language inputs (including mixed Chinese-English) before committing to prompt architecture. Must happen in Phase 1.
- **Progressive structuring UX:** When to unlock deeper model layers needs user testing, not just engineering judgment. Plan a lightweight UX validation step in Phase 1.
- **LLM provider selection:** Validate cost/quality tradeoffs with real requirement inputs before Phase 1 ships.
- **Conflict detection feasibility:** Approach for cross-requirement contradiction detection is unresolved. Needs a spike before Phase 3 planning.
- **Version numbers:** All package versions need live verification (`npm view <pkg> version`) before development starts.

## Sources

### Primary (HIGH confidence)
- TypeScript, PostgreSQL, Zod — established technologies with stable APIs
- Yjs CRDT library — production-proven in Notion, JupyterLab; extensive documentation
- shadcn/ui + Radix UI — accessibility-first, well-documented component primitives

### Secondary (MEDIUM confidence)
- Next.js 15 App Router — stable since v13.4; streaming AI patterns well-documented
- Vercel AI SDK — actively developed; `generateObject()` and `streamText()` match DevOS needs
- tRPC v11 — released 2024, stable
- Event-driven architecture patterns — Martin Fowler's Event Sourcing, CQRS; established principles
- Plugin architecture patterns — VS Code extension model, Backstage plugin system
- RAG architecture — LangChain, LlamaIndex documentation
- Requirements engineering domain — IEEE 830, BABOK, Specification by Example (Gojko Adzic)

### Tertiary (LOW confidence)
- LangChain text splitters for document chunking — evaluate alternatives before committing
- Specific competitor feature sets (IBM DOORS, Jama, Linear) — based on training data; validate against current product pages
- Historical learning architecture — no direct precedent; needs design spike in v2+ planning

---
*Research completed: 2026-02-28*
*Ready for roadmap: yes*
