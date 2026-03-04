---
phase: 10-conflict-detection-agent-architecture
plan: "01"
subsystem: conflicts
tags: [ai, conflicts, prisma, trpc, ui]
requires:
  - phase: 09-05
    provides: "requirement citations and AI route wiring"
provides:
  - "Persisted requirement conflict model"
  - "Conflict scan service with fingerprint-based upsert"
  - "Conflict review panel with rescan/dismiss/resolve actions"
affects: [10-02, v2-agents]
requirements-completed: [AI-04]
completed: 2026-03-04
commit: d31edf6
---

# Phase 10 Plan 01: Conflict Detection Engine Summary

Conflict detection is now a first-class workflow rather than an ad-hoc prompt. The system stores conflict rows, rescans deterministically, auto-resolves stale findings, and exposes a review panel on the exploration detail page.

## Accomplishments

- Added `RequirementConflict` schema, migration, and conflict-specific enums.
- Added typed conflict result schemas for AI-generated detections.
- Implemented `scanRequirementConflicts()` to gather candidate requirements, run detection, fingerprint results, and upsert or resolve rows.
- Added `conflict` tRPC routes for list, scan, and status updates.
- Added the conflict panel to the exploration detail UI with manual rescan and review actions.

## Key Decisions

- Persist conflicts by fingerprint instead of keeping them purely ephemeral.
- Keep the candidate set bounded to recent modeled requirements to control latency.
- Treat scans as idempotent: existing dismissed conflicts remain dismissed unless the user explicitly reopens them.

## Outcome

`AI-04` is satisfied end-to-end: conflicts can be detected, reviewed, dismissed, resolved, and rescanned from the product UI.
