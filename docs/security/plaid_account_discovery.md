# Plaid Account Discovery

## Purpose

Milestone 6 adds server-side Plaid account discovery and institution mapping. It uses a vaulted Plaid access token to fetch safe account metadata and latest balance values, then maps them into the existing financial platform tables.

This milestone does not implement dashboards, analytics, OpenAI, or an AI advisor. Milestone 7 adds the server-side transaction sync foundation after account discovery.

## Flow

1. Authenticated browser user clicks `Discover accounts` for a connected and vaulted Plaid provider connection.
2. Browser calls `/api/plaid-discover-accounts` with only `householdId` and `providerConnectionId`.
3. Trusted server-side code verifies the authenticated user and integration-management permission for the household.
4. Server loads the active encrypted Plaid token from `provider_token_vault`.
5. Server decrypts the token using the token vault helper.
6. Server calls Plaid `accounts/get`.
7. Server reads item/institution metadata and maps safe institution/account/balance fields.
8. Server writes audit and data quality records.
9. Browser receives only a safe summary: status, counts, request ID, and message.

## Server-Side Token Use

Plaid access tokens may only be decrypted inside trusted server-side code. The browser must never receive:

- Plaid `access_token`
- decrypted token
- token ciphertext
- token encryption key
- Supabase service-role key

The discovery response intentionally excludes raw Plaid payloads and token material.

## Mapping

`financial_institutions`:

- `provider = plaid`
- `provider_institution_id`
- institution name when available
- connected/synced status
- Plaid provenance through `source_system` and `source_record_id`

`financial_accounts`:

- Plaid account ID as `provider_account_id`
- mapped account type/subtype
- name, official name, mask, currency
- active/synced status
- Plaid provenance through `source_system` and `source_record_id`

`financial_account_balances`:

- latest available/current/limit amounts
- currency
- balance timestamp from discovery time
- Plaid provenance using `{providerAccountId}:latest`

## Audit Behavior

Integration audit events:

- `account_discovery_started`
- `account_discovery_completed`
- `account_discovery_failed`

Financial audit entries:

- `institution_discovered` / `institution_updated`
- `account_discovered` / `account_updated`
- `balance_discovered` / `balance_updated`

Audit metadata must remain safe. No tokens, ciphertext, credentials, passwords, or API keys may be stored in audit metadata.

## Data Quality Behavior

Data quality events are created when:

- provider connection is not connected/vaulted
- Plaid account data is missing expected fields
- account currency is missing
- institution mapping is incomplete
- Plaid account discovery fails

## RLS Considerations

`household` remains the canonical tenant boundary. All mapped records are written with `household_id`. Future server adapters must use service-role isolation only inside trusted runtime code; browser queries remain governed by RLS.

## Not Implemented

- transaction sync
- transaction history ingestion
- recurring sync jobs
- Plaid webhooks
- analytics or dashboards fed by discovered accounts
- OpenAI advisor features

## Next Milestone

Milestone 7 adds transaction sync foundation. Dashboards, reporting, analytics, and AI advisor features remain later milestones.
