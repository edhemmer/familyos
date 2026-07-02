# Cyber Security Hardening

## Purpose

This document records the current cyber hardening rules for Family Office OS after the security, financial, integration, Plaid sandbox, token vault, and cyber hardening foundations.

The project still is not approved for live financial data until a deployed server runtime, verified auth, secret rotation, and integration tests are complete.

## Browser Boundary

Browser code may use only:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Browser code must never receive or reference:

- Supabase service-role key
- Supabase JWT secret
- Plaid secret
- Plaid access token
- token ciphertext
- token encryption key
- OpenAI or other AI provider keys

`src/lib/supabase.ts` fails fast if a `VITE_SUPABASE_SERVICE_ROLE_KEY` value is present.

## Server-Only Runtime Guards

Server-only modules call `assertNoBrowserRuntime()` before reading server secrets or executing integration code.

Server environment validation requires:

- HTTPS Supabase server URL
- non-empty service-role key
- non-empty Supabase JWT secret
- minimum 32-byte secret material for key-like values

The token vault requires Web Crypto support and `TOKEN_ENCRYPTION_KEY` with at least 32 bytes of strong random secret material.

## Database Hardening

Migration `0006_cyber_security_hardening.sql` adds:

- recursive JSON metadata scanning for token-, secret-, credential-, password-, and API-key-shaped keys
- database constraints preventing unsafe nested metadata in integration provider connections and audit logs
- forced RLS on household, financial, integration, profile, and token vault tables
- revoked browser-authenticated read/delete access to `provider_token_vault`
- revoked update/delete access to financial and integration audit logs for normal browser-authenticated clients

## Metadata Rule

Integration metadata is for safe operational context only. It must not contain tokens, secrets, credentials, passwords, API keys, or ciphertext. This applies at every JSON depth, not only top-level keys.

Safe examples:

- provider request ID
- provider item ID
- institution display name
- status code
- non-sensitive timing data

Unsafe examples:

- `access_token`
- `public_token`
- `refreshToken`
- `credentials.secret`
- `apiKey`

## Tenant Boundary

`household` remains the canonical tenant boundary. Any future table containing user, financial, provider, document, AI, or operational data must include either:

- direct `household_id` ownership, or
- an equivalent ownership path enforced by RLS and tested before use.

## Required Next Security Work

Before live financial data:

- rotate any secrets that were pasted into chat or logs
- implement deployed server runtime auth verification
- wire a real token vault repository using service-role isolation
- add RLS regression tests for cross-household denial
- add audit-writing integration tests
- add secret rotation runbooks
- add production logging rules that redact sensitive fields by default
