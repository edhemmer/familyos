# Plaid Link Security Proof

## Scope

Milestone 4 proved the Plaid sandbox Link flow boundary. Milestone 5 adds encrypted server-side token vaulting foundation. Transaction sync, real financial ingestion, dashboards, analytics, OpenAI, and AI advisor features remain out of scope.

## Plaid Link Flow

The intended flow is:

```text
authenticated user -> protected Connections page -> server create-link-token function -> Plaid Link -> public_token -> server exchange function -> encrypted token vault or safe failure status
```

The browser receives only the Link token and safe status metadata. It never receives Plaid secrets, the Plaid `access_token`, decrypted tokens, token ciphertext, or encryption keys.

## Server-Side Token Exchange

`src/server/functions/plaidCreateLinkToken.ts` creates a Plaid sandbox Link token after authenticated user and active household membership checks.

`src/server/functions/plaidExchangePublicToken.ts` exchanges the Plaid `public_token` server-side after authenticated user and tenant authorization checks.

If `TOKEN_ENCRYPTION_KEY` is configured strongly enough, the access token is encrypted with AES-GCM and stored through the server-side token vault store. If the key is missing or weak, the access token is discarded and the browser receives `vaulting_required`.

## Environment Variables

Server-only Plaid and vault variables:

- `PLAID_CLIENT_ID`
- `PLAID_SECRET`
- `PLAID_ENV=sandbox`
- `TOKEN_ENCRYPTION_KEY`

These must never be prefixed with `VITE_`, committed with real values, or used in browser code.

## Safe Statuses

- `connected`: encrypted token storage completed successfully.
- `vaulting_required`: token exchange can succeed, but `TOKEN_ENCRYPTION_KEY` is missing or too weak, so no token was stored.
- `vaulting_failed`: encryption or vault storage failed; no token is exposed.
- `unauthorized`: authenticated user lacks permission to manage the household integration.

## Provider Connection Metadata

Milestone 4 reuses the Milestone 3 `integration_provider_connections` table. It stores safe metadata such as provider, environment, item/institution identifiers, connection status, sync status, and token storage status.

It does not store access tokens, public tokens, refresh tokens, client secrets, or provider secrets.

## Token Vault

Milestone 5 adds `provider_token_vault`. Normal browser-accessible queries cannot select token rows. Trusted server-side functions are responsible for encrypted token writes and future decrypt-only-for-sync reads.

## RLS Summary

Integration records are scoped by `household_id`.

- active household members can read safe provider connection metadata
- integration manager roles can create/update provider connection metadata
- token vault rows have no normal authenticated SELECT policy
- anonymous and cross-household access are blocked

## Not Implemented Yet

Milestone 5 does not implement:

- transaction sync
- account/balance ingestion
- webhook handling
- real financial data import
- OpenAI or AI advisor features
- production key rotation

## Next Security Milestone

Milestone 6 should implement server runtime verification, service-role isolation, token vault repository wiring, and tests before transaction sync is built.
