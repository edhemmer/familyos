# Financial Platform RLS Foundation

## Financial Ownership Model

Milestone 2 uses the existing Milestone 1 tenant boundary: `household`. Every household financial table references `public.households(id)` through `household_id`.

The canonical ownership model is:

- Supabase Auth user identity
- household tenant boundary
- household membership and role authorization
- financial records scoped to `household_id`

## Table Overview

Milestone 2 creates:

- `financial_institutions`
- `financial_accounts`
- `financial_account_balances`
- `financial_transactions`
- `financial_categories`
- `financial_audit_log`
- `financial_data_quality_events`

These tables are foundation tables only. They do not connect Plaid, OpenAI, provider tokens, dashboards, analytics, or real financial ingestion.

## Repository and Service Architecture

React components must not query Supabase directly for financial data.

Financial data access must flow through:

```text
domain types -> repositories -> services -> UI adapters/components
```

Current files:

- `src/domain/financial.ts` defines UI-independent and Supabase-independent financial types.
- `src/repositories/financialRepository.ts` isolates Supabase queries and maps database rows into domain types.
- `src/services/financialService.ts` provides UI-safe summaries and hides persistence details.
- `src/services/prototypeFinancialService.ts` preserves the existing prototype shell while clearly labeling seed output as mock data.

## RLS Strategy

RLS is enabled on every financial table. Policies use the existing Milestone 1 membership helper plus a new financial mutation helper:

- `public.is_household_member(household_id)`
- `public.can_manage_financial_records(household_id)`

Active household members can read records for their household. Users with these active roles can insert/update foundation financial records for now:

- `owner`
- `spouse_partner`
- `advisor`
- `accountant`

`viewer` can read but cannot mutate. Anonymous users have no access. No cross-household access is allowed by policy.

No delete policies are created for financial records in this milestone.

## Audit Strategy

`financial_audit_log` is append-only from application code. Authenticated household members may insert audit entries for their own household with `actor_user_id = auth.uid()`. No update or delete policy is created.

Future milestones should add explicit audit-writing service functions around every material financial mutation.

## Data Provenance Strategy

Foundation tables include source metadata such as:

- `source_system`
- `source_record_id`
- `sync_status`
- `last_synced_at`
- provider record ids where applicable

These fields support future provider ingestion, imports, manual records, reconciliation, and traceability without treating any current prototype data as production data.

## Data Quality Strategy

`financial_data_quality_events` records stale data, missing source records, duplicates, reconciliation needs, low confidence, sync failures, and manual review items. These events are household-scoped and RLS-protected.

## Why Plaid Is Not Implemented Yet

Plaid requires token handling, item lifecycle management, webhook handling, provider normalization, reconciliation, and secure server-side execution. Milestone 2 only creates the financial persistence and service foundation those future integrations will use.

## Why OpenAI Is Not Implemented Yet

OpenAI features require strict separation between source records, derived summaries, recommendations, citations, and auditability. Milestone 2 does not send financial data to any AI service.

## Real Financial Data Warning

Real financial ingestion is not approved yet. Do not enter or import real account, transaction, balance, investment, tax, legal, estate, insurance, identity, or document data.
