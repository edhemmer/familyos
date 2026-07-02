-- Family Office OS Plaid transaction sync foundation.
-- Adds cursor state, safe transaction source fields, duplicate/idempotency support,
-- and audit taxonomy for server-side Plaid transactions/sync.
-- This migration does not add dashboards, analytics, budgeting, OpenAI, or advice.

alter table public.financial_transactions
  add column if not exists provider_account_id text,
  add column if not exists authorized_date date,
  add column if not exists category_primary text,
  add column if not exists category_detailed text,
  add column if not exists removed_at timestamptz;

alter table public.financial_transactions
  drop constraint if exists financial_transactions_sync_status_supported;

alter table public.financial_transactions
  add constraint financial_transactions_sync_status_supported check (sync_status in ('not_synced', 'syncing', 'synced', 'stale', 'error', 'removed'));

comment on column public.financial_transactions.provider_account_id is 'Provider account identifier copied from Plaid for provenance and account mapping diagnostics.';
comment on column public.financial_transactions.authorized_date is 'Plaid authorized date when available. Posted date remains separately tracked.';
comment on column public.financial_transactions.category_primary is 'Provider-supplied primary category. Source-owned and not treated as user-confirmed categorization.';
comment on column public.financial_transactions.category_detailed is 'Provider-supplied detailed category. Source-owned and not treated as user-confirmed categorization.';
comment on column public.financial_transactions.removed_at is 'Timestamp when a provider reports the transaction as removed. Rows are archived instead of hard-deleted.';

create unique index if not exists financial_transactions_plaid_provider_transaction_unique_idx
  on public.financial_transactions (household_id, source_system, provider_transaction_id)
  where source_system = 'plaid' and provider_transaction_id is not null;

create index if not exists financial_transactions_provider_account_date_idx
  on public.financial_transactions (household_id, source_system, provider_account_id, transaction_date desc)
  where source_system = 'plaid';

create table if not exists public.plaid_transaction_sync_state (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  provider_connection_id uuid not null references public.integration_provider_connections(id) on delete cascade,
  cursor text,
  status text not null default 'idle',
  last_started_at timestamptz,
  last_completed_at timestamptz,
  last_failed_at timestamptz,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plaid_transaction_sync_state_connection_unique unique (provider_connection_id),
  constraint plaid_transaction_sync_state_status_supported check (status in ('idle', 'syncing', 'completed', 'failed', 'requires_relink')),
  constraint plaid_transaction_sync_state_connection_household_fk foreign key (provider_connection_id, household_id) references public.integration_provider_connections(id, household_id) on delete cascade
);

comment on table public.plaid_transaction_sync_state is 'Safe Plaid transactions/sync cursor state scoped to a household and provider connection. Contains no provider tokens.';
comment on column public.plaid_transaction_sync_state.cursor is 'Opaque Plaid transactions/sync cursor. Safe server-side sync state, not a provider access token.';
comment on column public.plaid_transaction_sync_state.status is 'Plaid transaction sync status: idle, syncing, completed, failed, requires_relink.';

create index if not exists plaid_transaction_sync_state_household_idx
  on public.plaid_transaction_sync_state (household_id);

drop trigger if exists set_plaid_transaction_sync_state_updated_at on public.plaid_transaction_sync_state;
create trigger set_plaid_transaction_sync_state_updated_at
  before update on public.plaid_transaction_sync_state
  for each row
  execute function public.set_updated_at();

alter table public.plaid_transaction_sync_state enable row level security;
alter table public.plaid_transaction_sync_state force row level security;

drop policy if exists "Members can read Plaid transaction sync state" on public.plaid_transaction_sync_state;
create policy "Members can read Plaid transaction sync state"
  on public.plaid_transaction_sync_state
  for select
  to authenticated
  using ((select public.is_household_member(household_id)));

drop policy if exists "Managers can insert Plaid transaction sync state" on public.plaid_transaction_sync_state;
create policy "Managers can insert Plaid transaction sync state"
  on public.plaid_transaction_sync_state
  for insert
  to authenticated
  with check ((select public.can_manage_financial_records(household_id)));

drop policy if exists "Managers can update Plaid transaction sync state" on public.plaid_transaction_sync_state;
create policy "Managers can update Plaid transaction sync state"
  on public.plaid_transaction_sync_state
  for update
  to authenticated
  using ((select public.can_manage_financial_records(household_id)))
  with check ((select public.can_manage_financial_records(household_id)));

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
      'transaction_sync_started',
      'transaction_sync_completed',
      'transaction_sync_failed',
      'sync_blocked'
    )
  );
