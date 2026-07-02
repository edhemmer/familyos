-- Family Office OS Plaid account discovery foundation.
-- Enables audit taxonomy and indexes needed for server-side account metadata discovery.
-- This migration does not implement transaction sync, transaction history ingestion, analytics, or AI.

alter table public.integration_audit_log
  drop constraint if exists integration_audit_log_action_supported;

alter table public.integration_audit_log
  add constraint integration_audit_log_action_supported check (
    action in (
      'connection_placeholder_created',
      'connection_placeholder_updated',
      'authorization_checked',
      'provider_call_blocked',
      'token_exchange_blocked',
      'token_vaulted',
      'token_vaulting_failed',
      'account_discovery_started',
      'account_discovery_completed',
      'account_discovery_failed',
      'sync_blocked'
    )
  );

create index if not exists financial_institutions_provider_lookup_idx
  on public.financial_institutions (household_id, provider, provider_institution_id);

create index if not exists financial_accounts_provider_lookup_idx
  on public.financial_accounts (household_id, source_system, provider_account_id);

create index if not exists financial_account_balances_provider_latest_idx
  on public.financial_account_balances (household_id, source_system, source_record_id, balance_as_of desc);

comment on constraint integration_audit_log_action_supported on public.integration_audit_log is
  'Includes Plaid account discovery lifecycle events. Transaction sync remains intentionally excluded.';
