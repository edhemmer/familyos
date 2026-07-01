# Family Office OS

Family Office OS is a private household financial operating system intended to become a secure command center for long-term household financial stewardship.

## Current Status

Milestone 1: Security Foundation is implemented in this repository.

The app now includes:

- Supabase browser client
- email/password auth screen
- protected app shell
- profile foundation
- household tenant/ownership foundation
- household membership roles and statuses
- initial Row Level Security policies
- documentation for the security model

The app still does not support real financial data.

Do not enter real banking, investment, tax, insurance, estate, legal, identity, account, transaction, balance, or household financial information into the app.

## Current Stack

- Vite
- React 19
- TypeScript
- plain CSS
- pnpm
- Supabase Auth
- Supabase Postgres with RLS migrations

The project does not currently have:

- financial database tables
- Plaid or financial provider integrations
- OpenAI or AI service integration
- document vault
- server-side financial business logic
- audit logging for financial mutations

## Supabase Setup

Create a local `.env` file from `.env.example`:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Use the Supabase project URL and anon public key. Do not put service-role keys in browser environment variables.

## Required Migrations

Apply these migrations in order after reviewing them:

```text
supabase/migrations/0001_security_foundation.sql
supabase/migrations/0002_identity_ownership_foundation.sql
```

The first migration creates profiles and profile RLS. The second migration creates `households`, `household_memberships`, ownership helper functions, onboarding RPC, and household RLS.

No migration creates accounts, transactions, balances, investments, documents, AI advisor data, or financial records.

## Local Development

```bash
pnpm install
pnpm run dev
pnpm run build
```

## App Flow

- Unauthenticated users see `AuthPage`.
- Authenticated users with no household see `HouseholdSetupPage`.
- Creating a household creates the current user as active `owner`.
- Authenticated users with active household membership see the existing Family Office OS prototype shell.

## Security Model

`household` is the canonical tenant boundary, based on the Project Corpus and related constitutional documents. Future financial tables should reference `household_id` and may also need `user_id` for authorship, confirmation, review, and audit accountability.

RLS is required for every future user or household data table. Service-role keys must never be used in browser code.

## Data Warning

Current visible financial numbers are prototype-only seed data.

- Seed data lives in `src/data.ts`.
- Some UI exploration state uses browser `localStorage`.
- Seed data and localStorage are for UI exploration only.
- localStorage must not be used for real financial records.
- Real financial data requires financial tables, RLS, provenance, audit logging, and server-side business boundaries in a future milestone.

## Constitutional Documents

The project is governed by constitutional and baseline documents, including:

- `01_Project_Charter.md`
- `02_Project_Corpus.md`
- `03_Architecture_Constitution.md`
- `04_Product_Specification.md`
- `05_AI_Operating_Manual.md`
- `06_Roadmap.md`
- `07_ADRs/0001-initial-architecture.md`
- `docs/constitution/00_Current_Project_State.md`
- `docs/constitution/08_Production_Readiness_Report.md`
- `docs/constitution/09_Technical_Debt_Register.md`
- `docs/constitution/07_ADRs/0002-production-security-foundation-needed.md`
- `docs/security/rls_foundation.md`
- `docs/security/identity_ownership_rls.md`

## Repository

GitHub remote: https://github.com/edhemmer/familyos
