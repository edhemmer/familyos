# Plaid Link Security Proof

## Scope

Milestone 4 proves the Plaid sandbox Link flow boundary only. It does not enable transaction sync, real financial ingestion, dashboards, analytics, OpenAI, or AI advisor features.

## Plaid Link Flow

The intended flow is:

```text
authenticated user -> protected Connections page -> server create-link-token function -> Plaid Link -> public_token -> server exchange function -> vaulting_required
```

The browser receives only the Link token and safe status metadata. It never receives Plaid secrets or the Plaid `access_token`.

## Server-Side Token Exchange

`src/server/functions/plaidCreateLinkToken.ts` creates a Plaid sandbox Link token after authenticated user and active household membership checks.

`src/server/functions/plaidExchangePublicToken.ts` exchanges the Plaid `public_token` server-side after authenticated user and tenant authorization checks. The returned `access_token` is deliberately not persisted and is never returned to the browser.

## Environment Variables

Server-only Plaid variables:

- `PLAID_CLIENT_ID`
- `PLAID_SECRET`
- `PLAID_ENV=sandbox`

These must never be prefixed with `VITE_`, committed with real values, or used in browser code.

## Why Secrets Stay Server-Side

Plaid credentials and public-token exchange require a trusted server runtime. Browser code can request a Link token and submit a public token to a secure server function, but browser code must never import the Plaid server SDK, hold Plaid secrets, store provider tokens, or receive access tokens.

## Vaulting Required

Secure token vaulting/encryption does not exist yet. Therefore Milestone 4 uses this behavior:

- exchange `public_token` server-side
- receive `access_token` server-side
- do not return `access_token`
- do not store `access_token`
- return `vaulting_required`
- write an audit event documenting that storage was blocked

Secure token vaulting is required before transaction sync.

## Provider Connection Metadata

Milestone 4 reuses the Milestone 3 `integration_provider_connections` table. It stores safe metadata such as provider, environment, item/institution identifiers, connection status, sync status, and token storage status.

It does not store access tokens, public tokens, refresh tokens, client secrets, or provider secrets.

## RLS Summary

Integration records are scoped by `household_id`.

- active household members can read safe provider connection metadata
- integration manager roles can create/update provider connection metadata
- active household members can read and insert audit records for their household
- anonymous and cross-household access are blocked

## Audit Events

The server templates write audit events for Link token creation and public-token exchange proof. The exchange audit records that the exchange succeeded but persistent token storage was blocked pending secure vaulting.

## Not Implemented Yet

Milestone 4 does not implement:

- Plaid Link production configuration
- token vaulting or encryption
- transaction sync
- account/balance ingestion
- webhook handling
- real financial data import
- OpenAI or AI advisor features

## Next Security Milestone

Milestone 5 should implement secure token vaulting/encryption and server runtime auth verification before any transaction sync is built.
