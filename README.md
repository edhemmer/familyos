# Family Office OS

Family Office OS is a private household financial operating system intended to become a secure command center for long-term household financial stewardship.

## Current Status

Milestone 1: Security Foundation is implemented and committed.
Milestone 2: Financial Platform Foundation is implemented and committed.
Milestone 3: Secure Integration Boundary is implemented and committed.
Milestone 4: Plaid Link + Sandbox Token Exchange Proof is implemented locally in this working tree.

The app now includes:

- Supabase browser client
- email/password auth screen
- protected app shell
- household tenant/ownership foundation
- financial domain, repository, and service boundaries
- server-only integration boundary template
- provider connection placeholder table with no token storage
- integration audit log table
- Plaid server SDK isolated to server-only files
- minimal protected Connections page using Plaid Link
- sandbox public-token exchange proof returning `vaulting_required`

The app still does not support transaction sync, real financial ingestion, OpenAI, or AI advisor features.

Do not enter real banking, investment, tax, insurance, estate, legal, identity, account, transaction, balance, or household financial information into the app.

## Current Stack

- Vite
- React 19
- TypeScript
- plain CSS
- pnpm
- Supabase Auth
- Supabase Postgres with RLS migrations
- Plaid server SDK for server-only proof functions
- react-plaid-link for the protected sandbox UI entry point

## Environment Setup

Create a local `.env` file from `.env.example`:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=

PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox
```

Only `VITE_` variables belong in browser code. Supabase server variables and Plaid variables are server-only and must never be committed with real values.

## Required Migrations

Apply these migrations in order after reviewing them:

```text
supabase/migrations/0001_security_foundation.sql
supabase/migrations/0002_identity_ownership_foundation.sql
supabase/migrations/0003_financial_platform_foundation.sql
supabase/migrations/0004_secure_integration_boundary.sql
```

No migration stores Plaid access tokens or connects transaction sync.

## Plaid Sandbox Proof

The protected Connections page can request a Plaid Link token from a secure server endpoint and submit the returned `public_token` to a secure exchange endpoint.

Expected server endpoints/functions:

- `/api/plaid-create-link-token`
- `/api/plaid-exchange-public-token`

Current server templates live in:

- `src/server/plaid/plaidClient.ts`
- `src/server/functions/plaidCreateLinkToken.ts`
- `src/server/functions/plaidExchangePublicToken.ts`

When public-token exchange succeeds, the access token is discarded and the browser receives `vaulting_required`. Secure token vaulting/encryption is required before transaction sync.

## Local Development

```bash
pnpm install
pnpm run dev
pnpm run build
```

## App Flow

- Unauthenticated users see `AuthPage`.
- Authenticated users with no household see `HouseholdSetupPage`.
- Authenticated users with active household membership see the existing prototype shell.
- The protected shell includes a Connections entry point for Plaid sandbox proof only.

## Security Model

`household` is the canonical tenant boundary. Financial and integration tables reference `household_id`. RLS is required for every user or household data table. Service-role keys and Plaid secrets must never be used in browser code.

## Data Warning

Current visible financial numbers are prototype-only seed data. Transaction sync is not active. OpenAI is not active. Real financial ingestion requires secure token vaulting, approved provider/import flows, server-side business boundaries, provenance, audit-writing services, and validation in a future milestone.

## Security Docs

- `docs/security/rls_foundation.md`
- `docs/security/identity_ownership_rls.md`
- `docs/security/financial_platform_rls.md`
- `docs/security/secure_integration_boundary.md`
- `docs/security/plaid_link_security.md`

## Next Milestone Recommendation

Recommended Milestone 5: Secure Token Vaulting and Server Runtime Verification. Implement real server auth verification, encrypted/vaulted Plaid token storage, RLS-aware metadata writes, and tests before transaction sync.

## Repository

GitHub remote: https://github.com/edhemmer/familyos
