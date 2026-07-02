# Secure Integration Boundary

## Purpose

Milestone 3 creates the boundary pattern for future external integrations without implementing any provider integration.

This milestone does not implement:

- Plaid Link
- Plaid token exchange
- transaction sync
- OpenAI advisor calls
- provider API calls
- provider token storage

## Server-Side Boundary Pattern

Server-only integration code lives under `src/server`. It is not imported by React components.

Current server boundary files:

- `src/server/env.ts`
- `src/server/authenticatedFunction.ts`
- `src/server/tenantAuthorization.ts`
- `src/server/integrations/providerConnectionBoundary.ts`

The intended future flow is:

```text
authenticated request -> server env validation -> token verification -> tenant authorization -> provider boundary/service -> audit log
```

## Server-Only Environment Validation

`src/server/env.ts` validates server-only variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`

These variables must never be prefixed with `VITE_` and must never be used in browser code.

## Authenticated Function Template

`src/server/authenticatedFunction.ts` defines a template for authenticated server functions. It parses bearer tokens and intentionally stops at a placeholder verification function until a real server runtime is chosen.

## Tenant Authorization Helper

`src/server/tenantAuthorization.ts` defines active household membership checks and integration manager roles. Current integration manager roles are:

- `owner`
- `spouse_partner`
- `advisor`
- `accountant`

Viewers may read integration metadata through RLS but may not manage provider connections.

## Integration Domain Types

`src/domain/integration.ts` defines provider, connection status, sync status, token storage status, audit action, and audit severity types. These types are independent of React and provider SDKs.

## Persistence Tables

Milestone 3 creates:

- `integration_provider_connections`
- `integration_audit_log`

`integration_provider_connections` stores provider connection placeholders only. It has no access token, public token, refresh token, item token, client secret, or provider secret columns.

`integration_audit_log` records integration boundary events, including blocked token exchange, blocked provider calls, and future lifecycle actions.

## RLS Strategy

RLS is enabled on both integration tables.

Policies allow:

- active household members to read provider connection placeholders
- integration managers to insert/update provider connection placeholders
- active household members to read integration audit log entries
- active household members to insert integration audit log entries with `actor_user_id = auth.uid()`

Anonymous access is not allowed. Cross-household access is blocked by `household_id` and membership helper policies.

## Safe Placeholder Functions

`src/server/integrations/providerConnectionBoundary.ts` includes safe placeholders for:

- creating provider connection placeholder metadata
- blocking provider token exchange
- blocking transaction sync
- blocking OpenAI advisor calls

These functions do not call Plaid, OpenAI, or any external service.

## Future Requirements Before Provider Work

Before Plaid or OpenAI work begins, the project needs:

- chosen server runtime
- real Supabase Auth token verification in server code
- token vault/storage decision
- provider webhook strategy
- audit-writing service functions
- rate limiting and replay protection
- integration tests for tenant isolation and RLS

## Real Data Warning

Real financial ingestion is not approved by this milestone. Do not connect provider accounts, exchange tokens, sync transactions, or send financial data to AI services yet.
