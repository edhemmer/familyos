# Current Project State

## Purpose

This document freezes the current state of Family Office OS before production architecture work begins. It records what exists today, what is only prototype work, and what decisions must happen before real financial data is introduced.

## Repository Status

- Local path: `C:\Users\edhem\OneDrive\Documents\familyos`
- Local Git repository: present
- Current branch: `master`
- Local commits: zero
- GitHub remote: `https://github.com/edhemmer/familyos.git`
- Remote state: reachable, but no refs were returned during baseline inspection; it appears empty or not yet populated
- Working tree: baseline files are untracked and not yet committed

## Current Stack

The current app uses:

- Vite
- React 19
- TypeScript
- plain CSS
- pnpm

The current app does not use:

- Next.js
- Supabase
- Tailwind CSS
- shadcn/ui
- backend API routes
- server actions
- database migrations
- authentication middleware

## Existing Documentation Inventory

Top-level constitutional/specification drafts currently exist:

- `01_Project_Charter.md`
- `02_Project_Corpus.md`
- `03_Architecture_Constitution.md`
- `04_Product_Specification.md`
- `05_AI_Operating_Manual.md`
- `06_Roadmap.md`
- `07_ADRs/0001-initial-architecture.md`
- `README.md`

This baseline also creates additional freeze documentation under `docs/constitution/`.

## Existing UI and Feature Inventory

The current app is a polished local prototype shell for a Family Office OS daily command center. It includes:

- mobile-first layout
- desktop-expanded layout
- navigation labels for Today, Cash, Invest, Docs, and Advisor
- daily command center heading
- net worth metric
- liquidity metric
- review count metric
- confidence metric
- accounts list from seed records
- source badges for Synced, Manual, and Imported records
- quick capture form for manual/imported entries
- cash-flow mini line visualization
- attention queue
- balance-sheet mix visualization
- static advisor panel
- goals list
- obligations list
- local UI interactions for adding entries and marking attention items reviewed

## Current Data Layer

The current data layer is not a production data layer.

Data sources today are:

- static seed data in `src/data.ts`
- browser `localStorage` for local prototype state

There is no durable backend, authenticated storage, server-side data boundary, database schema, row-level authorization, audit log, provider sync, or secure document storage.

## Prototype-Only Elements

The following are prototype-only and must not be treated as production financial functionality:

- seeded account balances
- seeded liabilities
- seeded cash forecast values
- seeded obligations
- seeded goals
- seeded attention items
- static advisor text
- client-side net worth calculation
- client-side liquidity calculation
- client-side confidence calculation
- localStorage quick capture entries
- localStorage reviewed-state tracking
- source badges without real source records

## Missing Production Capabilities

The project does not yet have:

- authentication
- secure user identity
- household membership model
- role-based access control
- backend data access layer
- database
- Supabase or equivalent durable backend
- Row Level Security or equivalent authorization model
- audit logging
- immutable source-record storage
- provenance-backed calculations
- environment-variable discipline beyond `.gitignore`
- real financial integrations
- document vault
- secure file storage
- AI service boundary
- AI confirmation workflow
- tests
- linting configuration
- CI/CD

## Security Limitations

The current app must not receive real financial data.

Known security limitations:

- no authentication
- no authorization
- no server-side data boundary
- no RLS or equivalent authorization layer
- no audit trail
- no encrypted durable storage
- browser localStorage is used for prototype state
- all current calculations happen in client code
- no secrets-management pattern exists yet
- no distinction between trusted source records and UI seed data at runtime

## Architecture Risks

The main architecture risk is continuing client-only feature development until the prototype becomes mistaken for the production system.

Specific risks:

- financial business logic may accumulate in UI components
- localStorage patterns may normalize unsafe data handling
- seed data may be mistaken for real integration architecture
- provenance labels may appear trustworthy without source records
- AI advisor UI may imply capabilities that do not yet exist
- future migration cost may increase if secure boundaries are delayed

## Immediate Next Decision Needed

A production security foundation decision is required before building real financial features.

The next decision should determine whether to:

- keep the Vite prototype unchanged and pause production features,
- add a secure backend/auth foundation to the current Vite app, or
- migrate deliberately to a production full-stack architecture before adding auth and data.