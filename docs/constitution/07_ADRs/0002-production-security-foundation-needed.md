# ADR 0002 - Production Security Foundation Needed

## Status

Proposed

## Context

Family Office OS currently exists as a local Vite, React, TypeScript, and plain CSS prototype shell. It has static seed data and limited local UI state stored in browser localStorage. It has no authentication, backend, database, durable authorization model, audit log, or real integrations.

The project is intended to become a private household financial operating system. Before it handles real financial data, it needs a production security foundation.

The next architecture decision must establish how the project will provide:

- authentication
- secure user identity
- server-side data boundary or equivalent secure access pattern
- durable backend storage, such as Supabase or another backend
- Row Level Security or equivalent authorization model
- environment-variable discipline
- auditability for material changes
- a strict prohibition on real financial data in localStorage

## Decision Drivers

- Real financial data must not be stored in localStorage.
- Source financial records must be preserved and auditable.
- User data access must follow least privilege.
- Financial calculations must be reproducible and traceable.
- The project should avoid accumulating production logic in client-only UI code.
- The next step should reduce security risk rather than increase prototype surface area.

## Option A: Keep Vite Prototype Unchanged and Delay Production Foundation

This option preserves the current prototype exactly as a UI exploration shell and avoids adding backend concerns immediately.

Benefits:

- Lowest immediate complexity.
- Preserves current UI exploration speed.
- Avoids premature infrastructure decisions.
- Keeps the baseline easy to understand.

Costs and risks:

- No real financial data can be entered.
- No production financial feature can safely proceed.
- Client-only patterns may continue to accumulate.
- Prototype behavior may drift farther from production architecture.

This option is acceptable only if the team explicitly pauses real financial feature work.

## Option B: Add Supabase Auth and RLS Foundation to the Current Vite App

This option keeps the current Vite app and adds Supabase-backed authentication, durable storage, and Row Level Security.

Benefits:

- Introduces production security concepts without a full framework migration.
- Preserves the current app shell.
- Enables early modeling of households, users, and secure records.
- Provides a path toward real persistence and authorization.

Costs and risks:

- Vite remains primarily client-oriented.
- Server-side business logic boundaries may be weaker or require additional services/functions.
- Sensitive operations must be carefully isolated from browser code.
- The app may later need migration if server-side workflows become central.

This option can work if strict boundaries are enforced and sensitive operations are not implemented as direct client-side logic.

## Option C: Migrate Immediately to Next.js and Supabase Before Adding Auth/Data

This option intentionally moves the project to a production full-stack architecture before adding authentication, data models, or real financial features.

Benefits:

- Aligns with the preferred long-term architecture direction.
- Provides a clearer server-side boundary for sensitive operations.
- Supports secure API routes or server actions for business logic.
- Reduces risk of client-only production logic.
- Creates a stronger foundation for auth, RLS-backed data, audit logging, and AI boundaries.

Costs and risks:

- Highest immediate migration effort.
- Current prototype UI must be ported or temporarily paused.
- More setup work before visible product progress resumes.
- Requires careful migration planning to avoid churn.

This option is the strongest production-foundation path if the project is ready to stop prototype expansion and establish secure architecture first.

## Current Recommendation

Do not add real financial features until a production security foundation decision is made.

If the next work is still product exploration, choose Option A and explicitly keep the app prototype-only.

If the next work involves real auth, durable data, or integrations, choose either Option B or Option C before implementation begins. Option C is likely the cleanest long-term direction, while Option B may be acceptable for a controlled transition if strict server-side boundaries are designed.

## Consequences

Until this ADR is resolved:

- no real financial data should be entered
- no Plaid, Supabase data, document, or AI integration should be connected
- localStorage must remain prototype-only
- UI work must not imply production security readiness
- architecture work should focus on the secure foundation decision

## Decision Required

A production security foundation decision is required before building real financial features.