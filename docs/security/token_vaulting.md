# Token Vaulting Foundation

## Purpose

Milestone 5 creates the server-side foundation required before Plaid access tokens may be stored persistently. It does not implement transaction sync or real financial ingestion.

## Encryption Approach

Provider tokens are encrypted server-side with AES-GCM using `TOKEN_ENCRYPTION_KEY`. The token vault utility generates a unique 96-bit IV for every encryption and stores:

- ciphertext
- IV/nonce
- algorithm
- key version

Current algorithm: `AES-GCM`.
Current key version: `v1`.

## Server-Only Key Handling

`TOKEN_ENCRYPTION_KEY` is server-only. It must never be prefixed with `VITE_`, committed with a real value, sent to the browser, logged, or used in React code.

The key must be at least 32 bytes of strong random secret material. If the key is missing or too weak, persistent token storage fails closed and the Plaid exchange returns `vaulting_required`.

## Browser Access Rules

The browser must never receive:

- Plaid `access_token`
- decrypted token
- token ciphertext
- encryption key
- Supabase service-role key

Frontend code receives only safe statuses such as `connected`, `vaulting_required`, `vaulting_failed`, or `unauthorized`.

## RLS and Table Access Model

`provider_token_vault` stores encrypted token records scoped to `household_id` and `provider_connection_id`.

RLS is enabled. Normal authenticated users have no SELECT policy for token rows, so browser queries cannot read ciphertext. Trusted server-side functions may access token rows using service-role behavior.

Managers may insert encrypted token rows and revoke/mark rotation-required through controlled server paths. There is no delete policy.

## Key Rotation Limitation

Milestone 5 supports only key version `v1`. Future key rotation requires multi-key decrypt support, re-encryption jobs, explicit audit events, operational runbooks, and careful migration sequencing.

## Audit Expectations

Token exchange and token vaulting must write integration audit events. Audit events must record safe metadata only, never plaintext tokens or ciphertext.

Migration `0006_cyber_security_hardening.sql` adds recursive database checks so integration metadata cannot contain token-, secret-, credential-, password-, or API-key-shaped keys at any JSON depth.

## Remaining Before Production Live Use

Before production live use, the project still needs:

- real deployed server runtime
- real Supabase Auth token verification
- service-role isolation
- token vault repository implementation
- integration tests for RLS and tenant isolation
- key rotation strategy
- operational secret management
- transaction sync implementation after vaulting is verified

## Transaction Sync Warning

Transaction sync is not implemented in Milestone 5. Encrypted token storage is only the foundation that makes future sync possible.
