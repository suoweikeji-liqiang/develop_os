# Architecture Patterns

**Domain:** AI-driven requirements clarification platform (collaborative, event-driven, plugin-based agents)
**Researched:** 2026-02-28
**Confidence:** MEDIUM (based on established architecture patterns; no live source verification available)

## Recommended Architecture

**Style:** Event-driven modular monolith with plugin-based agent extension points.

Start as a modular monolith (not microservices). The team is 5-15 people, the product is internal tooling, and premature decomposition into microservices would add operational overhead without benefit. Use an internal event bus so modules communicate via events — this gives you microservice-like decoupling without the deployment complexity, and makes future extraction trivial.

```
┌─────────────────────────────────────────────────────────────┐
│                      Web Client (SPA)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Req Editor│ │ Collab   │ │ Diff/    │ │ External      │  │
│  │ + Chat UI │ │ Workspace│ │ History  │ │ Submission    │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST + WebSocket
┌────────────────────────┴────────────────────────────────────┐
│                      API Gateway Layer                       │
│  Auth · Rate Limiting · Request Routing                      │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                    Application Core                          │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Requirement      │  │ Collaboration   │  │ Knowledge   │ │
│  │ Engine           │  │ Module          │  │ Base Module │ │
│  │ (structuring,    │  │ (roles, review, │  │ (docs, repo │ │
│  │  versioning,     │  │  comments,      │  │  indexing,  │ │
│  │  diff)           │  │  presence)      │  │  retrieval) │ │
│  └────────┬─────────┘  └────────┬────────┘  └──────┬──────┘ │
│           │                     │                   │        │
│  ┌────────┴─────────────────────┴───────────────────┴──────┐ │
│  │                   Event Bus (Internal)                   │ │
│  │  requirement.created · requirement.updated · model.      │ │
│  │  versioned · review.requested · agent.task.completed     │ │
│  └────────┬─────────────────────────────────────────┬──────┘ │
│           │                                         │        │
│  ┌────────┴─────────┐                    ┌──────────┴──────┐ │
│  │ Agent Orchestrator│                    │ External Intake │ │
│  │ (plugin registry, │                    │ (form submit,   │ │
│  │  task dispatch,   │                    │  status track)  │ │
│  │  result routing)  │                    └─────────────────┘ │
│  └────────┬─────────┘                                        │
│           │                                                  │
│  ┌────────┴──────────────────────────────────────────┐       │
│  │              Agent Plugin Layer                    │       │
│  │  ┌───────────┐ ┌───────────┐ ┌──────────────────┐│       │
│  │  │ Clarifier │ │ Scenario  │ │ Future: Test/    ││       │
│  │  │ Agent     │ │ Generator │ │ Impl/Review Agent││       │
│  │  │ (v1 core) │ │ Agent     │ │ (v2+ plugins)   ││       │
│  │  └───────────┘ └───────────┘ └──────────────────┘│       │
│  └───────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                    Data Layer                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ PostgreSQL│  │ Redis    │  │ Vector   │  │ Object      │ │
│  │ (models,  │  │ (cache,  │  │ Store    │  │ Storage     │ │
│  │  versions,│  │  pubsub, │  │ (KB      │  │ (uploaded   │ │
│  │  events)  │  │  presence)│  │  embeds) │  │  docs)      │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With | Interface |
|-----------|---------------|-------------------|-----------|
| **Web Client** | UI rendering, real-time collaboration display, requirement editing, diff visualization | API Gateway (HTTP/WS) | SPA, WebSocket for real-time |
| **API Gateway** | Auth, rate limiting, routing, WebSocket upgrade | All backend modules | REST + WS endpoints |
| **Requirement Engine** | Core domain: create/update/version requirement models, compute diffs, manage the 5-layer structure | Event Bus, Agent Orchestrator, Data Layer | Internal API + events |
| **Collaboration Module** | Multi-role presence, comments, review workflows, consensus tracking | Event Bus, Requirement Engine | Events + internal API |
| **Knowledge Base Module** | Document upload, code repo indexing, embedding generation, context retrieval for AI | Event Bus, Vector Store, Object Storage | Internal API |
| **Agent Orchestrator** | Plugin registry, agent lifecycle, task dispatch, result routing | Event Bus, Agent Plugins | Plugin interface contract |
| **Agent Plugins** | Individual AI capabilities (clarification, scenario gen, future: test/impl) | Agent Orchestrator, LLM APIs, Knowledge Base | Standardized plugin interface |
| **External Intake** | Simple form for outside departments, status tracking | Event Bus, Requirement Engine | Public REST API |
| **Event Bus** | Decouple modules, enable async processing, audit trail | All modules | Publish/Subscribe |
| **Data Layer** | Persistence, caching, search, file storage | All modules via repositories | Database drivers |

### Data Flow

**Flow 1: New Requirement (External Submission)**
```
External User → Intake Form → API Gateway → External Intake Module
  → Event: requirement.raw.submitted
  → Requirement Engine creates draft
  → Event: requirement.draft.created
  → Notification to product role
```

**Flow 2: AI Structuring (Core Flow)**
```
Product User opens draft → Triggers "Structure This"
  → Requirement Engine → Agent Orchestrator
  → Orchestrator loads context from Knowledge Base (RAG)
  → Dispatches to Clarifier Agent
  → Agent calls LLM with (raw requirement + KB context + 5-layer template)
  → Returns structured model (goals, assumptions, behaviors, scenarios, verifiability)
  → Event: requirement.model.generated
  → Requirement Engine stores as version 1
  → Event: requirement.version.created
  → UI updates via WebSocket
```

**Flow 3: Conversational Refinement**
```
User sends chat message about a requirement field
  → API Gateway → Requirement Engine (conversation context)
  → Agent Orchestrator → Clarifier Agent
  → Agent generates targeted update to specific layer
  → Requirement Engine applies delta, creates new version
  → Event: requirement.version.created (with diff metadata)
  → Collaboration Module notifies relevant roles
  → UI shows diff + updated model via WebSocket
```

**Flow 4: Multi-Role Review**
```
Product marks model "ready for review"
  → Event: review.requested
  → Collaboration Module creates review session
  → Each role (dev, test, UI) can comment, approve, request changes
  → Events: review.comment.added, review.approved, review.changes_requested
  → When all roles approve → Event: requirement.consensus.reached
  → Model locked as baseline version
```

**Flow 5: Version Diff**
```
User requests diff between versions
  → Requirement Engine loads both version snapshots
  → Computes structural diff (per-layer, per-field)
  → Returns diff with change attribution (who, when, why)
  → UI renders side-by-side or inline diff
```

## Patterns to Follow

### Pattern 1: Requirement Model as Immutable Versioned Document

**What:** Every change to a requirement model creates a new immutable version. Never mutate in place. Store the full snapshot plus a delta/changeset.

**When:** Every model update — AI-generated or human-edited.

**Why:** This is the "Git for requirements" philosophy from the project vision. It enables diff, blame, rollback, and audit trail. The requirement model is the central data structure; its integrity is paramount.

```typescript
interface RequirementVersion {
  id: string;
  requirementId: string;
  version: number;
  snapshot: RequirementModel;    // full state at this version
  changeset: ChangeSet;          // delta from previous version
  author: { type: 'user' | 'agent'; id: string };
  timestamp: Date;
  parentVersion: number;
}

interface RequirementModel {
  goals: GoalLayer;
  assumptions: AssumptionLayer;
  behaviors: BehaviorLayer;
  scenarios: ScenarioLayer;
  verifiability: VerifiabilityLayer;
}
```

### Pattern 2: Agent Plugin Contract

**What:** All AI agents implement a standard interface. The orchestrator doesn't know agent internals — it dispatches tasks and collects results.

**When:** Any AI capability (current or future).

```typescript
interface AgentPlugin {
  id: string;
  name: string;
  capabilities: string[];          // e.g., ['clarify', 'generate-scenarios']

  execute(task: AgentTask): Promise<AgentResult>;
  validate(task: AgentTask): boolean;  // can this agent handle this task?
}

interface AgentTask {
  type: string;
  requirementId: string;
  context: {
    currentModel: RequirementModel;
    conversationHistory: Message[];
    knowledgeContext: RetrievedChunk[];
  };
  parameters: Record<string, unknown>;
}

interface AgentResult {
  status: 'success' | 'partial' | 'failed';
  modelUpdate?: Partial<RequirementModel>;
  messages?: Message[];            // conversational responses
  confidence: number;
  reasoning: string;               // explainability
}
```

### Pattern 3: Event-Driven Module Communication

**What:** Modules communicate through domain events on an internal event bus. No direct cross-module function calls.

**When:** All inter-module communication.

**Why:** Decouples modules, enables async processing, creates natural audit trail, makes future extraction to microservices trivial.

```typescript
// Event types follow: domain.entity.action
type DomainEvent =
  | { type: 'requirement.raw.submitted'; payload: RawRequirement }
  | { type: 'requirement.model.generated'; payload: { id: string; version: number } }
  | { type: 'requirement.version.created'; payload: { id: string; version: number; changeset: ChangeSet } }
  | { type: 'review.requested'; payload: { requirementId: string; roles: Role[] } }
  | { type: 'review.consensus.reached'; payload: { requirementId: string; version: number } }
  | { type: 'agent.task.dispatched'; payload: AgentTask }
  | { type: 'agent.task.completed'; payload: AgentResult };
```

### Pattern 4: RAG-Enhanced Agent Context

**What:** Before any AI agent processes a requirement, the Knowledge Base module retrieves relevant context (uploaded docs, code snippets, historical decisions) and injects it into the agent's prompt context.

**When:** Every agent invocation.

```
User Input → Knowledge Base retrieval (vector similarity)
  → Merge: [user input + retrieved context + current model state + conversation history]
  → Agent prompt construction
  → LLM call
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Direct LLM Calls from UI Layer
**What:** Frontend or API handlers calling LLM APIs directly, bypassing the agent orchestrator.
**Why bad:** No centralized prompt management, no context injection, no plugin extensibility, impossible to swap LLM providers, no rate limiting or cost tracking.
**Instead:** All AI interactions go through Agent Orchestrator -> Agent Plugin -> LLM.

### Anti-Pattern 2: Mutable Requirement State
**What:** Updating requirement fields in place without versioning.
**Why bad:** Destroys the diff/history capability that is core to the product vision. Makes it impossible to understand how a requirement evolved.
**Instead:** Every change creates a new version. Use event sourcing or snapshot+changeset pattern.

### Anti-Pattern 3: Synchronous Agent Execution Blocking the UI
**What:** Making the user wait for LLM responses with a spinner and no feedback.
**Why bad:** LLM calls take 5-30 seconds. Blocking UI destroys the collaborative experience.
**Instead:** Agent tasks are async. Use WebSocket to stream partial results. Show "AI is thinking..." with progressive updates. Allow users to continue editing other parts while AI processes.

### Anti-Pattern 4: Monolithic Agent (God Agent)
**What:** One giant agent that handles all AI tasks — clarification, scenario generation, review, etc.
**Why bad:** Impossible to extend, test, or replace individual capabilities. Prompt becomes unmanageable.
**Instead:** Small, focused agents with single responsibilities. Orchestrator composes them.

### Anti-Pattern 5: Tight Coupling Between Collaboration and Requirement Engine
**What:** Embedding review/comment logic directly in the requirement model.
**Why bad:** Collaboration concerns (who approved, comment threads) are separate from requirement structure. Mixing them makes both harder to evolve.
**Instead:** Collaboration Module subscribes to requirement events and manages its own state (reviews, comments, presence).

## Scalability Considerations

| Concern | At 5-15 users (v1) | At 50-100 users | At 500+ users |
|---------|---------------------|------------------|---------------|
| **Real-time collab** | WebSocket via single server, Redis pub/sub | Redis pub/sub across instances | Consider dedicated real-time service (e.g., Liveblocks, or custom CRDT) |
| **LLM throughput** | Sequential agent calls, simple queue | Task queue with concurrency limits | Dedicated worker pool, priority queues, caching common patterns |
| **Version storage** | PostgreSQL JSONB snapshots | Add changeset-only storage, lazy snapshot loading | Event sourcing with snapshot checkpoints |
| **Knowledge Base** | pgvector extension | Dedicated vector DB (Qdrant/Weaviate) | Sharded vector DB, tiered retrieval |
| **Event Bus** | In-process EventEmitter or BullMQ | Redis Streams or BullMQ with workers | Kafka or NATS for guaranteed delivery |

For v1 (5-15 users), keep it simple: PostgreSQL + pgvector + Redis + in-process event bus. Do not over-engineer.

## Suggested Build Order (Dependencies)

The build order is driven by data dependencies — each layer needs the one below it.

```
Phase 1: Foundation
  ├── Data models + PostgreSQL schema (requirement model, versions)
  ├── Event bus infrastructure (in-process, with interface for future swap)
  ├── Auth + basic API gateway
  └── Minimal Web Client shell

Phase 2: Core Requirement Engine
  ├── CRUD for requirement models (depends on: Phase 1 data models)
  ├── Version creation + snapshot storage (depends on: Phase 1 data models)
  ├── Diff computation (depends on: versioning)
  └── Basic UI for viewing/editing requirements

Phase 3: Agent System
  ├── Agent plugin interface + orchestrator (depends on: Phase 1 event bus)
  ├── Clarifier Agent — the core AI (depends on: orchestrator + Phase 2 engine)
  ├── Conversational refinement loop (depends on: clarifier agent)
  └── UI: chat interface + AI-generated model display

Phase 4: Knowledge Base
  ├── Document upload + storage (depends on: Phase 1 foundation)
  ├── Embedding generation + vector storage (depends on: upload)
  ├── RAG retrieval integration with agents (depends on: Phase 3 agents)
  └── Code repository indexing (depends on: embedding pipeline)

Phase 5: Collaboration
  ├── Multi-role presence + WebSocket (depends on: Phase 1 auth)
  ├── Review workflow (depends on: Phase 2 requirement engine)
  ├── Comments + annotations (depends on: Phase 2 + WebSocket)
  └── Consensus tracking (depends on: review workflow)

Phase 6: External Intake + Polish
  ├── External submission form (depends on: Phase 2 engine)
  ├── Status tracking for external users (depends on: event bus)
  ├── Diff visualization UI (depends on: Phase 2 diff computation)
  └── Historical decision accumulation (depends on: event bus + versioning)
```

**Why this order:**
1. Foundation first — everything depends on data models and event bus
2. Requirement Engine before Agents — agents need something to operate on
3. Agents before Knowledge Base — basic AI works without RAG; RAG enhances it
4. Collaboration after core engine — you need requirements to collaborate on
5. External intake last — it's a thin layer over the existing engine

## Key Architecture Decisions

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| Monolith vs Microservices | Modular monolith | 5-15 users, single team, internal tool. Event bus enables future extraction. |
| Event sourcing vs CRUD+snapshots | CRUD with versioned snapshots | Full event sourcing is overkill for v1. Snapshots + changesets give you diff/history without the complexity. |
| Real-time approach | WebSocket + Redis pub/sub | Simple, proven, sufficient for team-size collaboration. Not CRDT (overkill for v1). |
| Vector store | pgvector (PostgreSQL extension) | One less service to operate. Sufficient for v1 scale. Migrate to dedicated vector DB if needed. |
| Agent-LLM coupling | Abstract behind provider interface | LLM landscape changes fast. Agent plugins should not import OpenAI/Anthropic SDKs directly. Use a provider abstraction. |

## Sources

- Architectural patterns based on established event-driven architecture principles (Martin Fowler's Event Sourcing, CQRS patterns)
- Plugin architecture patterns from VS Code extension model, Backstage plugin system
- Real-time collaboration patterns from Figma, Google Docs architecture write-ups
- RAG architecture patterns from LangChain, LlamaIndex documentation
- Agent orchestration patterns from LangGraph, CrewAI, AutoGen frameworks
- Confidence: MEDIUM — patterns are well-established but not verified against live sources for this specific session
