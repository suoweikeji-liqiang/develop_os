# Domain Pitfalls

**Domain:** AI-driven requirements clarification and multi-role consensus platform
**Project:** DevOS
**Researched:** 2026-02-28
**Confidence:** MEDIUM (based on domain expertise in LLM applications, requirements engineering, and collaborative platforms; web search unavailable for verification)

---

## Critical Pitfalls

Mistakes that cause rewrites, team abandonment, or fundamental architecture failures.

---

### Pitfall 1: Over-Structuring Too Early — The "Perfect Model" Trap

**What goes wrong:** The system forces requirements into a rigid five-layer structure (Goal/Assumption/Behavior/Scenario/Verifiability) from the very first interaction. Users with genuinely fuzzy, half-formed ideas get stuck because the AI demands precision they don't yet have. The structured output looks impressive but is filled with hallucinated specifics that the user rubber-stamps because they don't know what to challenge.

**Why it happens:** Engineers building the system conflate "structured output" with "useful output." The five-layer model is the end state, not the starting state. Forcing all layers simultaneously overwhelms users and incentivizes the AI to fabricate details to fill empty slots.

**Consequences:**
- Users lose trust when AI-generated structure contains confident-sounding but wrong assumptions
- Team members downstream (dev, test) treat AI-generated structure as validated when it was never truly confirmed
- The "structured" output creates a false sense of completeness — the most dangerous state for requirements

**Warning signs:**
- Users accept AI drafts without modification more than 70% of the time (indicates rubber-stamping, not agreement)
- Structured models contain specific numbers, edge cases, or business rules that were never in the original input
- Team members report "the AI already figured it out" as reason for skipping review

**Prevention:**
- Implement progressive structuring: start with Goal Clarification only, unlock deeper layers as confidence increases
- Track "AI-generated vs human-confirmed" provenance on every field in the model
- Display confidence indicators per field — make uncertainty visible, not hidden
- Never auto-fill all five layers from a single input; require explicit user progression

**Detection:** Add analytics tracking edit rates per field. If edit rate is below 20% on AI-generated content, the system is likely producing plausible-but-unverified output.

**Phase relevance:** Must be addressed in Phase 1 (core structuring engine). Getting this wrong poisons all downstream features.

---

### Pitfall 2: Consensus Theater — Mistaking Visibility for Agreement

**What goes wrong:** The platform shows all roles the same structured model and assumes that "everyone can see it" equals "everyone agrees." In reality, a developer reads the behavior model differently than a tester reads it. The product manager sees intent; the developer sees implementation constraints; the tester sees coverage gaps. Showing the same artifact to all roles without role-specific interpretation creates an illusion of consensus.

**Why it happens:** Building a shared view is easy. Building role-specific lenses on the same data is hard. Teams default to "single source of truth" thinking without realizing that truth looks different from each role's perspective.

**Consequences:**
- The exact problem DevOS aims to solve (misalignment discovered at implementation time) persists, just with a fancier document format
- Teams feel betrayed: "We all reviewed it and agreed, but it still came out wrong"
- Loss of trust in the platform's core value proposition

**Warning signs:**
- All roles approve requirements in under 5 minutes (indicates skimming, not reviewing)
- Post-implementation bugs trace back to requirements that were "approved by all roles"
- Developers ask clarifying questions during implementation that should have surfaced during review

**Prevention:**
- Build role-specific review views: show developers the state transitions and edge cases; show testers the scenario coverage and verification criteria; show product the goal alignment and success metrics
- Require role-specific sign-off with role-specific checklists (not just a generic "approve" button)
- AI should generate role-specific questions: "As a developer, have you considered how X state transition handles Y?" / "As a tester, is scenario Z sufficient for boundary coverage?"

**Detection:** Track which roles actually modify or comment on requirements vs. just clicking approve. Silent approval from technical roles is a red flag.

**Phase relevance:** Phase 2 (multi-role collaboration). The collaboration model must be designed around role-specific perspectives, not bolted on after.

---

### Pitfall 3: The Knowledge Base Black Hole

**What goes wrong:** The knowledge base (uploaded docs, code repos, historical decisions) grows without curation. AI context windows fill with irrelevant historical data. The system retrieves outdated decisions as context for new requirements, causing the AI to generate models based on deprecated assumptions. Worse, users don't know which historical context the AI used, so they can't challenge it.

**Why it happens:** "The system gets smarter over time" is an appealing narrative. But RAG (retrieval-augmented generation) quality degrades as the corpus grows without active curation. Relevance scoring is imperfect. Old decisions that were correct in their original context become misleading in new contexts.

**Consequences:**
- AI generates requirements models that reference deprecated business rules or old architecture constraints
- Users can't trace why the AI made certain suggestions, eroding trust
- The knowledge base becomes a liability rather than an asset after 6-12 months
- Performance degrades as retrieval corpus grows

**Warning signs:**
- AI suggestions reference projects or decisions from 6+ months ago without user prompting
- Users report "the AI keeps suggesting things we stopped doing"
- Knowledge base size grows monotonically with no deletions or archival

**Prevention:**
- Implement explicit context attribution: every AI suggestion must cite which knowledge base entries influenced it
- Build knowledge base hygiene tools: expiration dates on documents, periodic review prompts, archival workflows
- Allow users to pin/exclude specific knowledge base entries per requirement session
- Separate "active context" from "historical archive" — only active context feeds the AI by default

**Detection:** Monitor retrieval hit rates and user feedback on AI suggestions. If users frequently override AI suggestions that cite historical context, the knowledge base needs curation.

**Phase relevance:** Phase 3 (knowledge base). Must be designed with curation-first architecture, not just ingestion.

---

### Pitfall 4: Designing the Agent Plugin Interface Too Early or Too Late

**What goes wrong:** Two failure modes:
- **Too early:** Designing a generic agent plugin API before having a single working agent (the clarification agent) leads to over-abstracted interfaces that don't fit real agent needs. The API becomes a constraint rather than an enabler.
- **Too late:** Building the clarification agent as a monolith, then trying to extract a plugin interface retroactively. The agent's internals are tightly coupled to the core platform, making extraction painful.

**Why it happens:** Plugin architecture is a classic "second-system effect" problem. The team either over-engineers for hypothetical future agents or ignores extensibility until it's too late.

**Consequences:**
- Too early: months spent on plugin infrastructure that gets rewritten when real agents (implementation, testing, code review) have different needs than anticipated
- Too late: the clarification agent becomes a special case that doesn't follow the plugin pattern, creating two code paths forever

**Warning signs:**
- Too early: plugin API design discussions before the clarification agent works end-to-end
- Too late: clarification agent directly accesses database tables, bypasses event bus, or has hardcoded UI components

**Prevention:**
- Build the clarification agent first as a well-structured internal module with clear boundaries (input contract, output contract, event emissions)
- After the clarification agent works, extract the pattern into a plugin interface — let the real agent inform the abstraction
- Design for "one concrete agent + one hypothetical agent" — not for N arbitrary agents
- Use event-driven architecture from day one (this is already in the project constraints) so agents communicate through events, not direct coupling

**Detection:** If the team is writing plugin documentation before having a working agent, they're too early. If the clarification agent imports from more than 3 core modules directly, they're coupling too tightly.

**Phase relevance:** Spans Phase 1 (agent boundaries) through Phase 4 (plugin extraction). The key decision is when to extract, not whether to extract.

---

### Pitfall 5: LLM Output Treated as Deterministic

**What goes wrong:** The system treats LLM-generated structured output as reliable and parseable, building rigid downstream logic on it. But LLMs are non-deterministic: the same input produces different structures, sometimes with missing fields, sometimes with hallucinated fields, sometimes with subtly different semantics. The system breaks or silently produces wrong results when the LLM output deviates from expected format.

**Why it happens:** During development, the team tests with a small set of inputs and the LLM consistently produces well-formatted output. They build parsers and downstream logic assuming this consistency. In production, the long tail of real inputs triggers edge cases in LLM output.

**Consequences:**
- Silent data corruption: malformed LLM output gets partially parsed, creating incomplete requirement models that look complete
- Cascading failures: downstream features (diff, versioning, collaboration) break on unexpected model shapes
- Intermittent bugs that are impossible to reproduce because the same input produces different output

**Warning signs:**
- JSON/structured output parsing has no validation layer, just direct deserialization
- No retry or fallback logic for malformed LLM responses
- Tests use mocked LLM responses instead of real LLM calls for integration tests
- Team says "it works every time I test it"

**Prevention:**
- Define a strict schema (JSON Schema or equivalent) for every LLM output type and validate every response against it
- Implement a validation-retry loop: if output fails schema validation, retry with error feedback to the LLM (up to N times)
- Store raw LLM output alongside parsed output for debugging
- Build a "LLM output anomaly" monitoring system that flags responses deviating from expected patterns
- Use structured output features (function calling / tool use / JSON mode) where available in the LLM API

**Detection:** Log schema validation failure rates. If they exceed 5% in production, the prompts or schema need revision.

**Phase relevance:** Phase 1 (core engine). This is foundational infrastructure that must be right from the start.

---

## Moderate Pitfalls

---

### Pitfall 6: Conversational Modification UX That Frustrates Rather Than Guides

**What goes wrong:** The "conversational refinement" feature (AI generates draft, user refines through dialogue) becomes a frustrating loop. Users say "change X" and the AI changes X but also silently modifies Y and Z. Or users can't figure out how to express what they want changed. The conversation becomes longer than just writing the requirement from scratch.

**Prevention:**
- Show explicit diffs after every conversational modification — highlight exactly what changed
- Support both conversational and direct-edit modes; never force users into conversation when they know exactly what to change
- Implement "change isolation": when a user requests a change, lock unchanged sections and only modify the targeted area
- Limit conversation depth; after 5 rounds of refinement on the same section, suggest direct editing

**Warning signs:** Average conversation length exceeds 8 turns per requirement section. Users abandon conversations and switch to manual editing.

**Phase relevance:** Phase 1 (conversational refinement). UX testing with real users is essential before committing to the interaction model.

---

### Pitfall 7: Version Diff That's Technically Correct but Humanly Useless

**What goes wrong:** The requirement model versioning system produces diffs that show every field change but fail to communicate the semantic impact. A diff showing "state S3 transition condition changed from A to B" is technically accurate but doesn't tell the developer "this means the payment flow now requires email verification before proceeding."

**Prevention:**
- Build two diff layers: structural diff (what fields changed) and semantic diff (what the change means in business terms, AI-generated)
- Show impact analysis alongside diffs: which scenarios are affected, which roles should re-review
- Allow users to annotate version changes with intent ("why this changed") not just content ("what changed")

**Warning signs:** Team members ignore version notifications. Diffs are viewed but don't trigger re-reviews.

**Phase relevance:** Phase 3 (versioning). Design the diff format with role-specific impact summaries from the start.

---

### Pitfall 8: External Requirement Submission Becomes a Dumping Ground

**What goes wrong:** The external submission portal (for non-R&D departments) accepts any free-text input without guidance. External submitters dump vague requests ("make the report better"), creating a backlog of un-processable inputs. The AI structuring engine wastes tokens on inputs that lack sufficient context to structure meaningfully.

**Prevention:**
- Design the external submission form with guided fields (not just free text): what problem are you experiencing, who is affected, what does success look like
- Implement a "structurability score" — AI pre-screens submissions and requests more information before accepting genuinely unstructurable inputs
- Set clear expectations: external submitters see estimated processing time and required information checklist
- Create a triage step between external submission and AI structuring

**Warning signs:** More than 40% of external submissions require manual follow-up for basic clarification. AI structuring produces low-confidence models from external inputs.

**Phase relevance:** Phase 2 (external portal). The submission form design is as important as the AI processing behind it.

---

### Pitfall 9: Ignoring the "AI Said So" Authority Problem

**What goes wrong:** Team members defer to AI-generated structure because it feels authoritative. Junior team members especially are reluctant to challenge AI output. The platform inadvertently creates a power dynamic where "the AI's version" carries more weight than human expertise, suppressing the very disagreements that surface misalignment.

**Prevention:**
- Frame AI output explicitly as "draft for discussion" in all UI copy — never as "the requirements"
- Implement anonymous disagreement mechanisms so junior members can challenge without social cost
- Require at least one modification or explicit "I reviewed and confirm" action per role (not just passive approval)
- Show AI confidence levels prominently; low-confidence sections should visually demand attention

**Warning signs:** Modification rates decrease over time as team "trusts the AI." Disagreements between roles decrease (this is bad — it means disagreements are being suppressed, not resolved).

**Phase relevance:** Phase 2 (collaboration). This is a UX and process design issue, not a technical one.

---

### Pitfall 10: Prompt Engineering as Architecture

**What goes wrong:** The core structuring logic lives entirely in complex prompt chains with no abstraction layer. Changing LLM providers, updating prompt strategies, or debugging structuring failures requires modifying deeply nested prompt templates. The system becomes a "prompt spaghetti" that only the original author understands.

**Prevention:**
- Separate the structuring logic into three layers: (1) domain logic (what to structure), (2) prompt templates (how to ask the LLM), (3) LLM interface (which LLM to call)
- Version control prompts independently from application code
- Build prompt testing infrastructure: golden input/output pairs that validate prompt changes don't regress quality
- Document the reasoning behind each prompt design decision, not just the prompt text

**Warning signs:** Prompt files exceed 500 lines. Changing one prompt breaks unrelated features. No one besides the original author can modify prompts confidently.

**Phase relevance:** Phase 1 (core engine). The prompt architecture must be modular from day one.

---

## Minor Pitfalls

---

### Pitfall 11: Neglecting Offline/Degraded LLM Scenarios

**What goes wrong:** The platform assumes 100% LLM API availability. When the LLM service is slow, rate-limited, or down, the entire platform becomes unusable — users can't even view or manually edit existing requirements.

**Prevention:**
- Ensure all CRUD operations on requirement models work without LLM availability
- AI features degrade gracefully: show "AI suggestions unavailable" rather than blocking the workflow
- Cache recent AI responses for common operations

**Phase relevance:** Phase 1 (core architecture). Separation of AI features from core data operations.

---

### Pitfall 12: Underestimating Chinese Language NLP Complexity

**What goes wrong:** Given the team context (Chinese-speaking, internal tool), requirements will be submitted in Chinese. LLMs handle Chinese well for general tasks but may struggle with domain-specific Chinese technical jargon, mixed Chinese-English input (common in tech teams), and generating structured models that mix Chinese descriptions with English technical terms.

**Prevention:**
- Test the structuring engine extensively with real Chinese requirement inputs, including mixed-language inputs
- Allow users to specify language preferences per field (e.g., business description in Chinese, technical identifiers in English)
- Build prompt templates that explicitly handle bilingual output formatting

**Phase relevance:** Phase 1 (core engine). Language handling must be validated early with real team inputs.

---

### Pitfall 13: Event-Driven Architecture Overhead for Small Team

**What goes wrong:** The project specifies event-driven architecture for extensibility, but for a 5-15 person team tool, a full event bus with async processing adds debugging complexity and latency that outweighs the extensibility benefits in v1.

**Prevention:**
- Start with synchronous event dispatch (in-process observer pattern) rather than async message queues
- Only introduce async event processing when a concrete agent needs it (likely v2+)
- Keep the event contract (event types, payloads) well-defined even if dispatch is synchronous — this preserves the extensibility benefit without the operational overhead

**Phase relevance:** Phase 1 (architecture). Choose the simplest event mechanism that preserves the contract.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Requirements structuring engine | Over-structuring (Pitfall 1), LLM non-determinism (Pitfall 5), Prompt spaghetti (Pitfall 10) | Progressive structuring, schema validation, modular prompt architecture |
| Conversational refinement | Frustrating UX loops (Pitfall 6) | Diff-on-every-turn, direct edit escape hatch, conversation depth limits |
| Multi-role collaboration | Consensus theater (Pitfall 2), AI authority bias (Pitfall 9) | Role-specific views, role-specific checklists, anonymous disagreement |
| External submission portal | Dumping ground (Pitfall 8) | Guided forms, structurability scoring, triage step |
| Knowledge base | Black hole (Pitfall 3), Chinese language (Pitfall 12) | Curation-first design, context attribution, bilingual testing |
| Versioning and diff | Useless diffs (Pitfall 7) | Semantic diff layer, impact analysis, role-specific summaries |
| Agent plugin architecture | Too early/too late (Pitfall 4), Event overhead (Pitfall 13) | Extract from working agent, synchronous events first |
| LLM integration layer | Non-determinism (Pitfall 5), Offline scenarios (Pitfall 11) | Schema validation, graceful degradation, raw output logging |

---

## Sources

- Domain expertise in LLM application architecture, requirements engineering processes, and collaborative platform design
- Common failure patterns observed in AI-augmented workflow tools (RAG degradation, prompt architecture, consensus mechanisms)
- Note: Web search was unavailable during research. Confidence is MEDIUM. Findings should be validated against real-world case studies and post-mortems from similar platforms when possible.
