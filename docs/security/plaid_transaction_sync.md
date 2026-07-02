# Plaid Transaction Sync

## Purpose

Milestone 7 adds the server-side Plaid `transactions/sync` foundation. It maps Plaid transactions into `financial_transactions` with provenance, idempotency, audit logging, duplicate protection, soft removal handling, and review states.

This milestone does not add dashboards, reporting, analytics, budgeting, categorization AI, OpenAI, or an AI advisor.

## Flow

1. Authenticated browser user clicks `Sync transactions` after a Plaid connection is connected, vaulted, and discovered.
2. Browser calls `/api/plaid-sync-transactions` with only `householdId` and `providerConnectionId`.
3. Trusted server-side code verifies the user and household integration/financial management permission.
4. Server loads the active encrypted Plaid token from `provider_token_vault`.
5. Server decrypts the token using the token vault helper.
6. Server loads the existing Plaid transaction cursor from `plaid_transaction_sync_state`.
7. Server calls Plaid `transactions/sync` until `has_more` is false.
8. Server persists added, modified, and removed transaction events.
9. Server updates the cursor only after successful persistence.
10. Browser receives only a safe summary.

## Token Vault Dependency

Plaid access tokens may only be decrypted inside trusted server-side code. The browser must never receive access tokens, decrypted tokens, token ciphertext, encryption keys, service-role keys, or raw sensitive Plaid payloads.

## Cursor Handling

`plaid_transaction_sync_state` stores one cursor per provider connection. The cursor is updated only after a successful sync run. Failed runs mark state as `failed` or `requires_relink` and preserve the prior cursor for retry safety.

## Mapping Rules

Plaid transaction fields map into `financial_transactions`:

- `provider_transaction_id`
- `provider_account_id`
- `transaction_date`
- `posted_date`
- `authorized_date`
- `description`
- `merchant_name`
- `amount`
- `currency`
- `direction`
- `category_primary`
- `category_detailed`
- `pending`
- `transfer`
- `source_system = plaid`
- `source_record_id = provider_transaction_id`

Plaid amount is preserved as source data. Direction is a source-derived review hint: clear transfers are `transfer`; otherwise negative Plaid amounts are treated as inflow and positive amounts as outflow. Transfers are not counted as income or expense by default.

Plaid categories are source-owned. They are not user-confirmed categories and must not overwrite user-reviewed categorization later.

## Duplicate and Idempotency Strategy

Duplicate Plaid transactions are prevented by provider identity:

```text
household_id + source_system + provider_transaction_id
```

Added and modified transactions use idempotent upserts. Modified transactions update source-owned fields and sync metadata, but preserve reviewed/excluded review states.

## Removed Transactions

Removed transactions are soft-archived by setting:

- `sync_status = removed`
- `removed_at`
- `last_synced_at`

Rows are not hard-deleted.

## Audit Behavior

Integration audit events:

- `transaction_sync_started`
- `transaction_sync_completed`
- `transaction_sync_failed`

Financial audit events:

- `transaction_added`
- `transaction_modified`
- `transaction_removed`
- `transaction_sync_cursor_updated`

## Data Quality Behavior

Data quality events are created for:

- missing account mapping
- duplicate/provider transaction conflicts surfaced by persistence
- missing currency
- missing amount/date/account/transaction ID
- skipped transactions
- Plaid sync failures
- relink-required item errors

## RLS Considerations

`household` remains the canonical tenant boundary. Transaction rows and sync state are scoped by `household_id`. RLS is enabled and forced for sync state. Browser access remains limited to authenticated, household-scoped reads governed by existing policies.

## Not Implemented

- dashboards or reporting over synced transactions
- transaction list UI
- categorization AI
- budgeting
- recurring sync jobs
- Plaid webhooks
- OpenAI or AI advisor features
