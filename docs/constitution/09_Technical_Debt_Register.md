# Technical Debt Register

## Issue: No production security foundation

- Severity: Critical
- Affected area/files: entire app; `src/App.tsx`, `src/data.ts`, project architecture
- Why it matters: The app has no authentication, authorization, backend data boundary, RLS, or audit logging. It cannot safely handle real financial data.
- Recommended resolution: Decide and implement the production security foundation before real data or integrations are introduced.
- When to address it: Before any real financial feature work.

## Issue: Financial calculations live in client UI code

- Severity: High
- Affected area/files: `src/App.tsx`
- Why it matters: Net worth, liquidity, confidence, and derived values are calculated in the browser from seed data. Production financial calculations must be reproducible, testable, and traceable through domain services.
- Recommended resolution: Move financial calculations into typed domain services and eventually server-side execution once the secure backend exists.
- When to address it: During financial data core implementation, before real balances or transactions are stored.

## Issue: Prototype state uses localStorage

- Severity: High
- Affected area/files: `src/App.tsx`
- Why it matters: localStorage is not appropriate for sensitive financial records, review status, source data, or durable audit history.
- Recommended resolution: Keep localStorage strictly prototype-only. Replace with authenticated durable storage after the production foundation decision.
- When to address it: Before any sensitive or user-entered financial data is allowed.

## Issue: Seed data can be mistaken for real data model

- Severity: Medium
- Affected area/files: `src/data.ts`
- Why it matters: Seed accounts, obligations, goals, and attention items are useful for UI exploration but do not represent a normalized production domain model.
- Recommended resolution: Clearly label seed data as prototype-only and create a real domain model separately before backend implementation.
- When to address it: During production data model design.

## Issue: No audit model

- Severity: High
- Affected area/files: entire app
- Why it matters: The project laws require material changes to be auditable. Current local interactions leave no durable audit trail.
- Recommended resolution: Define Audit Event semantics and persistence as part of the production foundation.
- When to address it: Before user mutations are stored in a backend.

## Issue: No provenance-backed source records

- Severity: High
- Affected area/files: `src/data.ts`, `src/App.tsx`
- Why it matters: UI shows source labels and confidence values, but there are no underlying source records, import records, or derivation paths.
- Recommended resolution: Introduce a source-record/provenance model before any real integrations or uploaded statements.
- When to address it: During financial data core design.

## Issue: Static advisor panel implies future AI capability

- Severity: Medium
- Affected area/files: `src/App.tsx`
- Why it matters: The advisor panel is static and not backed by AI boundaries, citations, source records, or confirmation workflows.
- Recommended resolution: Keep advisor UI labeled as prototype-only until a secure AI operating boundary exists.
- When to address it: Before implementing real AI features.

## Issue: No tests or CI

- Severity: Medium
- Affected area/files: project tooling
- Why it matters: A financial system needs guardrails against regression, especially for calculations, security policies, and data transformations.
- Recommended resolution: Add test and CI strategy after the production foundation direction is selected.
- When to address it: Immediately after baseline commit and architecture decision.

## Issue: Constitutional docs exist in two locations

- Severity: Low
- Affected area/files: top-level docs and `docs/constitution/`
- Why it matters: Top-level constitutional files existed before the baseline freeze, while new baseline reports live under `docs/constitution/`. Duplication may confuse future navigation.
- Recommended resolution: Decide whether to keep root constitutional files, mirror them under `docs/constitution/`, or move all constitutional documents into one canonical docs folder.
- When to address it: Before the first documentation reorganization or baseline commit follow-up.