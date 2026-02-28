# Feature Landscape

**Domain:** AI-driven requirements clarification platform for R&D teams
**Researched:** 2026-02-28
**Overall Confidence:** MEDIUM (based on training data knowledge of requirements management domain; no live web verification available during this research session)

## Domain Context

The requirements management space splits into three tiers:
1. **Enterprise RM tools** (IBM DOORS, Jama Connect, Visure) — heavy, compliance-focused, trace-everything, steep learning curve
2. **Modern project tools** (Linear, Jira, Notion) — lightweight, developer-friendly, but requirements are just text blobs with no structure
3. **AI wrappers** (various GPT-based tools) — generate requirements text, but don't structure, model, or drive consensus

DevOS targets a gap none of these fill: turning fuzzy natural-language requirements into structured, versioned behavior models through AI + team collaboration. The closest analogs are BDD tools (Cucumber/Gherkin) but those require manual specification writing and assume requirements are already clear.

---

## Table Stakes

Features users expect. Missing = product feels incomplete or unusable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Natural language requirement input** | Users must be able to paste/type fuzzy requirements in plain language (Chinese + English). Any friction here kills adoption. | Low | Simple rich-text input with paste support. Must handle messy real-world input (WeChat messages, meeting notes, email threads). |
| **AI-driven structuring** | Core value prop. If AI can't auto-generate a structured model from fuzzy input, the product has no reason to exist vs. a shared doc. | High | The five-layer model (Goal/Assumption/Behavior/Scenario/Verifiability) is the heart. Must produce useful first drafts, not perfect ones. |
| **Conversational refinement** | AI draft will never be perfect on first pass. Users need to correct, clarify, and refine through dialogue — not by editing raw model fields. | High | Chat-style interface where AI asks clarifying questions and updates the model. This is the "clarification" in "requirements clarification." |
| **Multi-role visibility** | Product/Dev/Test/UI must all see the same requirement model. If each role sees different views with no shared truth, alignment fails. | Medium | Role-aware views (dev sees behavior states, test sees scenarios, PM sees goals) but all derived from one model. |
| **Requirement model versioning** | Teams iterate. Without version history, you can't track what changed, why, or who agreed. This is table stakes for any structured data tool. | Medium | Git-like semantics: snapshots, diffs, history. Not full branching in v1 — linear version history is sufficient. |
| **Model diff view** | If you version but can't see what changed, versioning is useless. Visual diff of structured models (not just text diff) is essential. | Medium | Structured diff: show added/removed/changed goals, scenarios, state transitions. Not line-by-line text diff. |
| **Basic collaboration** | Multiple team members must be able to view and comment on the same requirement. Real-time co-editing is NOT table stakes (see Anti-Features), but async collaboration is. | Medium | Comments, @mentions, review status per role. Async-first. |
| **Requirement status tracking** | Teams need to know: is this requirement still draft? Under review? Consensus reached? In implementation? | Low | Simple state machine: Draft -> In Review -> Consensus -> Implementation -> Done. |
| **Search and navigation** | As requirements accumulate, finding specific ones must be fast. | Low | Full-text search across requirements, filter by status/tag/role/date. |
| **External requirement submission** | Other departments need a simple way to submit raw requirements without learning the full system. | Low | Simple form: title, description, priority, submitter. No login required or minimal auth. Submitters see status updates. |
| **Notification system** | When a requirement changes, reviewers are assigned, or consensus is needed, people must be notified. | Low | In-app notifications + email/webhook. Don't over-engineer — simple event-based notifications. |
| **User authentication and roles** | Multi-role system requires knowing who is who. | Low | Basic auth with role assignment (PM, Dev, Test, UI, External). SSO is nice-to-have, not table stakes for internal tool. |

## Differentiators

Features that set DevOS apart. Not expected (no competitor does them well), but highly valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Five-layer structured model** | No existing tool auto-generates Goal/Assumption/Behavior/Scenario/Verifiability layers from natural language. This IS the product. | High | The specific five-layer decomposition is novel. Closest analog is BDD (Given/When/Then) but that's only the scenario layer. DevOS goes deeper with assumption surfacing and verifiability assessment. |
| **Assumption surfacing** | Hidden assumptions cause most requirement misunderstandings. Explicitly surfacing "what are we assuming?" with confidence levels is a unique capability. | High | AI identifies implicit assumptions in requirements text, assigns confidence scores, and flags low-confidence assumptions for team discussion. This alone could justify the product. |
| **Conflict detection** | AI identifies contradictions between requirements, between assumptions, or between stated goals and proposed behaviors. | High | Cross-requirement analysis. "Requirement A says users can delete accounts, but Requirement B assumes user data is always available." |
| **Visual behavior modeling (state diagrams)** | Rendering behavior as interactive state diagrams makes complex logic tangible for non-technical stakeholders. | Medium | Auto-generated from behavior layer. Interactive: click states to see transitions, scenarios that traverse them. Not a general diagramming tool — specifically for requirement behavior. |
| **Consensus workflow** | Structured process where each role explicitly signs off on the requirement model. Not just "everyone saw it" but "PM confirmed goals, Dev confirmed behavior, Test confirmed scenarios." | Medium | Role-specific review checklists. Tracks who approved what. Blocks status transition until all required roles sign off. This is the "alignment before implementation" mechanism. |
| **AI-driven scenario generation** | Auto-generate normal/abnormal/edge-case scenarios from behavior model. Testers get scenario coverage they'd normally have to imagine manually. | High | This bridges the gap between "what should happen" and "what could go wrong." Generates scenarios like: "What if user submits empty form?" "What if network drops mid-save?" |
| **Knowledge base context** | Upload background docs, connect code repos — AI uses this context to generate more accurate models. System gets smarter with more context. | Medium | RAG-style: chunk documents, embed, retrieve relevant context when structuring new requirements. Code repo integration means AI understands existing system constraints. |
| **Historical learning** | Past clarification sessions, decisions, and patterns accumulate. AI learns team's domain vocabulary, common assumptions, recurring patterns. | High | Long-term memory across requirements. "Last time you built a similar feature, these assumptions were missed." Requires careful data architecture. |
| **Requirement model as API** | The structured model is machine-readable, enabling downstream tools (test generators, code scaffolders, doc generators) to consume it. | Medium | JSON/API representation of the five-layer model. This is the foundation for the v2+ agent architecture. Not user-facing but architecturally critical. |
| **Clarification session replay** | Replay the conversation that led to the current model state. New team members can understand not just WHAT was decided but WHY. | Low | Store full conversation history linked to model versions. Timeline view showing how the model evolved through dialogue. |

## Anti-Features

Features to explicitly NOT build. These are tempting but wrong for DevOS v1.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Real-time collaborative editing** | Massive engineering complexity (CRDT/OT). Requirements clarification is inherently async — you think, then respond. Real-time editing creates pressure to react immediately, which undermines thoughtful clarification. | Async collaboration: comments, reviews, turn-based conversation with AI. Show "last updated" timestamps. |
| **General-purpose diagramming** | Miro/FigJam/draw.io already exist. Building a general diagramming tool dilutes focus and adds enormous scope. | Auto-generated diagrams from behavior models only. Read-only or minimally interactive. Users don't draw — AI generates, users refine through conversation. |
| **Gantt charts / project scheduling** | This is a requirements tool, not a project management tool. Adding scheduling creates scope creep toward Jira/Linear territory. | Integrate with existing PM tools via export/webhook. Requirements have status, not timelines. |
| **Code generation from requirements** | Explicitly out of scope for v1 per PROJECT.md. Premature — if requirements are wrong, generated code is wrong faster. | Design the model API so future agents CAN generate code. But v1 focuses on getting requirements right. |
| **Test case generation** | Same as above — v2+ via agent plugins. | Ensure scenario layer is structured enough that test generation is mechanically possible later. |
| **Approval chain / bureaucratic workflow** | Enterprise RM tools (DOORS, Jama) are hated for their heavy approval processes. DevOS targets small agile teams who need alignment, not bureaucracy. | Lightweight consensus: each role confirms, but no sequential approval chains, no "rejected back to step 1" loops. |
| **Requirements traceability matrix** | Enterprise compliance feature. Overkill for 5-15 person teams. Adds complexity without value for the target user. | Simple linking: requirement -> related requirements. No formal trace matrix UI. |
| **Natural language to formal specification (Z notation, TLA+, etc.)** | Formal methods are powerful but alien to product managers and designers. Forcing formalism kills adoption. | The five-layer model IS the formalism — but expressed in human-readable terms, not mathematical notation. Behavior models use state diagrams, not temporal logic. |
| **Mobile app** | Per PROJECT.md, web-first. Requirements clarification is a desktop activity — you need screen space for models, diffs, conversations. | Responsive web for status checking on mobile, but don't optimize the core experience for small screens. |
| **Third-party knowledge base integration (Feishu/Confluence)** | Per PROJECT.md, v1 uses document upload and code repo connection. Third-party integrations add auth complexity, API maintenance burden, and vendor dependency. | File upload (PDF, Markdown, Word) + Git repo URL. Simple, reliable, no vendor lock-in. |

## Feature Dependencies

```
User Auth ─────────────────────────────────────────────────────┐
  │                                                             │
  v                                                             v
NL Requirement Input ──> AI Structuring ──> Five-Layer Model ──> Model Versioning
                              │                    │                    │
                              v                    v                    v
                    Conversational Refinement   Visual Behavior      Model Diff
                              │                 Diagrams
                              v
                    Assumption Surfacing
                    Conflict Detection
                    Scenario Generation
                              │
                              v
                    Multi-Role Visibility ──> Consensus Workflow ──> Status Tracking
                              │
                              v
                    Knowledge Base Context ──> Historical Learning
                              │
                              v
                    Requirement Model API (enables future agents)

External Submission ──> (feeds into NL Requirement Input)
Notification System ──> (triggered by Status Tracking, Consensus Workflow, Comments)
Search & Navigation ──> (independent, but requires accumulated requirements)
Clarification Replay ──> (requires Conversational Refinement history)
```

Key dependency chains:
1. **Core chain:** NL Input -> AI Structuring -> Five-Layer Model -> Versioning -> Diff
2. **Collaboration chain:** Multi-Role Visibility -> Consensus Workflow -> Status Tracking
3. **Intelligence chain:** Knowledge Base -> Historical Learning -> Better AI Structuring (feedback loop)
4. **Extensibility chain:** Model API -> Future Agent Plugins

## MVP Recommendation

### Phase 1: Core Structuring (must ship first)
1. User authentication and roles
2. Natural language requirement input
3. AI-driven structuring (five-layer model)
4. Conversational refinement
5. Basic requirement status tracking
6. Search and navigation

**Rationale:** This is the minimum to validate the core hypothesis — can AI usefully structure fuzzy requirements? Everything else is meaningless if this doesn't work.

### Phase 2: Collaboration & Consensus
1. Multi-role visibility (role-specific views)
2. Model versioning and diff
3. Consensus workflow
4. Notification system
5. External requirement submission

**Rationale:** Once structuring works, the next question is: does structured collaboration actually reduce misalignment? This phase tests the team alignment hypothesis.

### Phase 3: Intelligence & Differentiation
1. Assumption surfacing with confidence scores
2. Conflict detection across requirements
3. AI-driven scenario generation
4. Visual behavior modeling (state diagrams)
5. Knowledge base context (document upload + code repo)
6. Clarification session replay

**Rationale:** These features deepen the AI's value and create defensible differentiation. They require the core model and collaboration to be stable first.

### Defer to v2+
- Historical learning (requires significant data accumulation)
- Requirement model API (build when first downstream consumer exists)
- Code generation, test generation, code review agents (per PROJECT.md)

## Competitive Landscape Reference

| Competitor | What They Do Well | What They Miss (DevOS Opportunity) |
|------------|-------------------|------------------------------------|
| IBM DOORS / Jama Connect | Traceability, compliance, enterprise workflows | Heavy, no AI, terrible UX, overkill for small teams |
| Linear / Jira | Developer workflow, issue tracking, speed | Requirements are unstructured text blobs, no modeling |
| Notion AI | Flexible docs, AI writing assistance | No structured requirement models, no consensus workflow |
| Cucumber/BDD tools | Structured scenarios (Given/When/Then) | Manual writing, only covers scenario layer, no AI |
| ChatGPT/Claude direct | Can analyze requirements in conversation | No persistence, no versioning, no multi-role workflow, no structured model |

DevOS's unique position: the only tool that combines AI-driven structuring, five-layer behavior modeling, and multi-role consensus workflow for small R&D teams.

## Sources

- Domain knowledge from requirements engineering discipline (IEEE 830, BABOK)
- Competitive analysis based on known products: IBM DOORS, Jama Connect, Visure Solutions, Modern Requirements, Linear, Jira, Notion, Cucumber
- BDD/behavior modeling patterns from Specification by Example (Gojko Adzic), Impact Mapping
- AI requirements engineering research trends (pre-2025 training data)
- **Confidence note:** No live web verification was possible during this session. All findings are MEDIUM confidence based on training data. Recommend validating competitor feature sets and pricing against current websites before finalizing roadmap.
