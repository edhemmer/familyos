# ADR 0001 - Initial Architecture

## Status

Accepted

## Date

2026-07-01

## Context

Family Office OS is a long-lived private financial operating system. The master project prompt prefers Next.js, TypeScript, React, Tailwind CSS, shadcn/ui, Supabase, PostgreSQL, Supabase Auth, Row Level Security, secure server actions or API routes, and audit logging.

The current repository was created as a standalone Vite/React/TypeScript app outside the InLight website project. It contains an early mobile-first command center shell with local seed data and local UI state.

The master prompt states that no feature implementation should proceed until the durable project specification suite exists.

## Decision

Use the current Vite/React app only as an early local UI shell while establishing project memory and product direction.

Do not connect real financial data, sensitive documents, financial integrations, or AI record mutation flows to the current client-only architecture.

Before handling real financial data, create a follow-up ADR for the secure platform architecture. The expected direction is Next.js + Supabase/Postgres + Supabase Auth + Row Level Security unless a better architecture is explicitly justified.

## Rationale

The current app is useful for visualizing the daily review workflow and mobile-first information architecture. However, it does not yet satisfy the security laws required for sensitive financial software:

- no authenticated access
- no server-side business logic
- no Row Level Security
- no audit logging
- local UI state only
- no durable provenance-backed database

Preserving the current app as a UI shell avoids unnecessary churn while preventing it from being mistaken for a production financial data architecture.

## Consequences

- UI exploration may continue with clearly labeled seed/local data.
- Real financial data must not be introduced yet.
- Business logic should be extracted from UI components as soon as server-side architecture exists.
- Future implementation must prioritize secure platform foundation before integrations.
- A later migration to Next.js/Supabase is expected and should be documented before execution.

## Follow-Up Decisions Needed

- ADR 0002: Secure platform stack and migration plan
- ADR 0003: Data model and provenance strategy
- ADR 0004: Authentication, authorization, and RLS policy strategy
- ADR 0005: Audit logging and append-first mutation model
- ADR 0006: AI boundary and confirmation model