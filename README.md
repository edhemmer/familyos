# Family Office OS

Family Office OS is a private household financial operating system intended to become a secure command center for long-term household financial stewardship.

## Current Status

Milestone 1: Security Foundation is implemented and committed.

Milestone 2: Financial Platform Foundation is implemented locally in this working tree.

Milestone 3: Secure Integration Boundary is implemented locally in this working tree.

The app now includes:

- Supabase browser client
- email/password auth screen
- protected app shell
- profile foundation
- household tenant/ownership foundation
- household membership roles and statuses
- initial Row Level Security policies
- financial domain types
- financial repository boundary
- financial service boundary
- prototype financial service boundary for demo seed data
- financial platform persistence migration with household-scoped RLS
- financial audit log and data quality event foundation tables
- server-only integration boundary template
- integration domain types
- provider connection placeholder table with no token storage
- integration audit log table
- documentation for the security model

The app still does not support real financial data ingestion or real connected accounts.

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

- Plaid Link or token exchange
- transaction sync
- OpenAI advisor calls
- financial provider integrations
- document vault
- server-side financial business logic runtime
- provider token storage
- real financial ingestion
- dashboards or analytics backed by production financial data

## Supabase Setup

Create a local `.env` file from `.env.example`:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Use the Supabase project URL and anon public key. Do not put service-role keys in browser environment variables.

Server-only integration variables are also documented in `.env.example`. Do not prefix server-only variables with `VITE_`, and do not use them in browser code.

## Required Migrations

Apply these migrations in order after reviewing them:

```text
supabase/migrations/0001_security_foundation.sql
supabase/migrations/0002_identity_ownership_foundation.sql
supabase/migrations/0003_financial_platform_foundation.sql
supabase/migrations/0004_secure_integration_boundary.sql
```

The first migration creates profiles and profile RLS. The second migration creates `households`, `household_memberships`, ownership helper functions, onboarding RPC, and household RLS. The third migration creates financial foundation tables, financial RLS, audit log storage, and data quality event storage. The fourth migration creates provider connection placeholders, integration audit logging, and integration RLS without storing real provider tokens.

No migration connects Plaid, OpenAI, provider tokens, real financial ingestion, dashboards, analytics, or AI advisor data.

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

## Financial Architecture Boundary

React components must not query Supabase directly for financial data.

Financial access should flow through:

```text
domain types -> repositories -> services -> UI adapters/components
```

Current financial foundation files:

- `src/domain/financial.ts`
- `src/repositories/financialRepository.ts`
- `src/services/financialService.ts`
- `src/services/prototypeFinancialService.ts`

The existing prototype UI shell uses `prototypeFinancialService` so seed data remains clearly separated from production financial persistence.

## Secure Integration Boundary

Milestone 3 adds server-only template files under `src/server` for future authenticated integration functions. These files validate server-only environment variables, define an authenticated function template, check tenant authorization, and provide safe placeholders that block Plaid token exchange, transaction sync, and OpenAI advisor calls.

Current integration boundary files:

- `src/domain/integration.ts`
- `src/server/env.ts`
- `src/server/authenticatedFunction.ts`
- `src/server/tenantAuthorization.ts`
- `src/server/integrations/providerConnectionBoundary.ts`

## Security Model

`household` is the canonical tenant boundary, based on the Project Corpus and related constitutional documents. Future financial and integration tables reference `household_id` and may also need `user_id` for authorship, confirmation, review, and audit accountability.

RLS is required for every future user or household data table. Service-role keys must never be used in browser code.

## Data Warning

Current visible financial numbers are prototype-only seed data.

- Seed data lives in `src/data.ts`.
- Some UI exploration state uses browser `localStorage`.
- Seed data and localStorage are for UI exploration only.
- localStorage must not be used for real financial records.
- Real financial ingestion requires approved provider/import flows, server-side business boundaries, provenance, audit-writing services, and validation in a future milestone.

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
- `docs/security/financial_platform_rls.md`
- `docs/security/secure_integration_boundary.md`

## Next Milestone Recommendation

Recommended next milestone: Server Runtime Decision and Auth Verification. Choose the server runtime, implement real Supabase Auth token verification server-side, and add tests for tenant authorization before Plaid, OpenAI, or transaction sync.

## Repository

GitHub remote: https://github.com/edhemmer/familyos
