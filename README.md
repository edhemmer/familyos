# Family Office OS

Family Office OS is a private household financial operating system intended to become a secure command center for long-term household financial stewardship.

## Current Status

Milestone 1: Security Foundation is implemented and committed.
Milestone 2: Financial Platform Foundation is implemented and committed.
Milestone 3: Secure Integration Boundary is implemented and committed.
Milestone 4: Plaid Link + Sandbox Token Exchange Proof is implemented and committed.
Milestone 5: Secure Token Vaulting Foundation is implemented and committed.
Cyber Security Hardening checkpoint is implemented and committed.
Milestone 6: Plaid Account Discovery + Institution Mapping is implemented and committed.
Milestone 7: Plaid Transaction Sync + Reconciliation Foundation is implemented locally in this working tree.

The app still does not support dashboards, reporting, analytics, OpenAI, or AI advisor features over synced transactions.

## Environment Setup

Create a local `.env` file from `.env.example`.

Browser variables:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Server-only variables:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox
TOKEN_ENCRYPTION_KEY=
```

Do not prefix server-only variables with `VITE_`. Do not commit real keys or secrets.

For development, generate a strong local token key with a secure password manager or an OS cryptographic random generator. The value must be at least 32 bytes of strong random secret material.

## Required Migrations

Apply these migrations in order after reviewing them:

```text
supabase/migrations/0001_security_foundation.sql
supabase/migrations/0002_identity_ownership_foundation.sql
supabase/migrations/0003_financial_platform_foundation.sql
supabase/migrations/0004_secure_integration_boundary.sql
supabase/migrations/0005_token_vault_foundation.sql
supabase/migrations/0006_cyber_security_hardening.sql
supabase/migrations/0007_plaid_account_discovery_foundation.sql
supabase/migrations/0008_plaid_transaction_sync_foundation.sql
```

## Token Vaulting Status

Plaid public-token exchange can now store access tokens only through server-side AES-GCM encryption and `provider_token_vault`. The browser never receives access tokens, decrypted tokens, ciphertext, encryption keys, service-role keys, or Plaid secrets.

If `TOKEN_ENCRYPTION_KEY` is missing or too weak, the exchange returns `vaulting_required` and stores no token.

## Plaid Sandbox Proof

The protected Connections page can request a Plaid Link token from a secure server endpoint, submit the returned `public_token` to a secure exchange endpoint, trigger server-side account discovery after the token is vaulted, and trigger server-side transaction sync after discovery.

Expected server endpoints/functions:

- `/api/plaid-create-link-token`
- `/api/plaid-exchange-public-token`
- `/api/plaid-discover-accounts`
- `/api/plaid-sync-transactions`

Current server templates live in:

- `src/server/plaid/plaidClient.ts`
- `src/server/plaid/plaidAccountMapping.ts`
- `src/server/plaid/plaidTransactionMapping.ts`
- `src/server/functions/plaidCreateLinkToken.ts`
- `src/server/functions/plaidExchangePublicToken.ts`
- `src/server/functions/plaidDiscoverAccounts.ts`
- `src/server/functions/plaidSyncTransactions.ts`
- `src/server/tokenVault/tokenVault.ts`
- `src/server/tokenVault/plaidTokenVault.ts`

## Plaid Account Discovery

Sandbox account discovery requires:

- Supabase Auth session
- household setup
- connected Plaid Link flow
- vaulted token storage
- server runtime wired to the secure function templates

Discovery maps Plaid institution/account metadata and latest balances into the financial foundation tables. The browser receives only safe counts and status. OpenAI is not active.

## Plaid Transaction Sync

Sandbox transaction sync requires:

- Supabase Auth session
- household setup
- connected Plaid Link flow
- vaulted token storage
- successful account discovery
- server runtime wired to the secure function templates

Transaction sync maps Plaid transaction source fields into `financial_transactions`, stores one Plaid cursor per provider connection, preserves provenance, prevents duplicate provider transactions, and soft-archives removed transactions. Dashboard/reporting are not wired to synced transactions yet. OpenAI is not active.

## Local Development

```bash
pnpm install
pnpm run dev
pnpm run build
```

## Security Model

`household` is the canonical tenant boundary. Financial and integration tables reference `household_id`. RLS is required for every user or household data table. Service-role keys, Plaid secrets, encryption keys, and provider tokens must never be used in browser code.

Integration metadata must never contain provider tokens, secrets, credentials, passwords, API keys, or token ciphertext. Migration `0006_cyber_security_hardening.sql` enforces recursive database checks for unsafe metadata keys and forces RLS on the core app tables.

Any secret pasted into chat, logs, screenshots, or support tools should be treated as compromised and rotated before production use.

## Data Warning

Current visible dashboard numbers are prototype-only seed data. Transaction sync foundation is server-side only and dashboard/reporting are not active. OpenAI is not active. Real financial ingestion requires deployed server runtime, verified auth, token vault repository wiring, provenance, audit-writing services, and validation before production use.

## Security Docs

- `docs/security/rls_foundation.md`
- `docs/security/identity_ownership_rls.md`
- `docs/security/financial_platform_rls.md`
- `docs/security/secure_integration_boundary.md`
- `docs/security/plaid_link_security.md`
- `docs/security/token_vaulting.md`
- `docs/security/cyber_hardening.md`
- `docs/security/plaid_account_discovery.md`
- `docs/security/plaid_transaction_sync.md`

## Next Milestone Recommendation

Recommended Milestone 8: Server Runtime Wiring + Sync Verification. Wire the secure function templates into the deployed server runtime, verify Supabase Auth tokens server-side, add service-role isolation, and add tenant-isolation tests before dashboards/reporting use synced transaction data.

## Repository

GitHub remote: https://github.com/edhemmer/familyos
