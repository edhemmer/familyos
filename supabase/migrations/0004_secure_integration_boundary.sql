-- Family Office OS secure integration boundary foundation.
-- This migration creates provider connection and integration audit boundaries only.
-- It intentionally does not implement Plaid Link, token exchange, transaction sync, OpenAI advisor calls, or token storage.

create or replace function public.can_manage_integrations(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_memberships hm
    where hm.household_id = target_household_id
      and hm.user_id = (select auth.uid())
      and hm.status = 'active'
      and hm.role in ('owner', 'spouse_partner', 'advisor', 'accountant')
  );
$$;

comment on function public.can_manage_integrations(uuid) is 'Returns true when the current authenticated user has a role allowed to manage provider integration placeholders for the household.';
revoke execute on function public.can_manage_integrations(uuid) from public;
grant execute on function public.can_manage_integrations(uuid) to authenticated;

create table if not exists public.integration_provider_connections (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  provider text not null,
  provider_environment text not null default 'sandbox',
  display_name text not null,
  external_connection_id text,
  provider_item_id text,
  provider_institution_id text,
  provider_institution_name text,
  connection_status text not null default 'pending',
  sync_status text not null default 'not_started',
  token_storage_status text not null default 'not_stored',
  last_health_check_at timestamptz,
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_provider_connections_provider_supported check (provider in ('plaid', 'manual', 'file_import', 'other')),
  constraint integration_provider_connections_environment_supported check (provider_environment in ('sandbox', 'development', 'production')),
  constraint integration_provider_connections_display_name_not_blank check (length(trim(display_name)) > 0),
  constraint integration_provider_connections_status_supported check (connection_status in ('not_connected', 'pending', 'connected', 'needs_attention', 'disconnected', 'disabled')),
  constraint integration_provider_connections_sync_status_supported check (sync_status in ('not_started', 'ready', 'syncing', 'stale', 'error')),
  constraint integration_provider_connections_token_storage_supported check (token_storage_status in ('not_stored', 'server_vault_required')),
  constraint integration_provider_connections_no_token_metadata check (not (metadata ? 'access_token') and not (metadata ? 'public_token') and not (metadata ? 'refresh_token') and not (metadata ? 'secret')),
  constraint integration_provider_connections_external_unique unique (household_id, provider, external_connection_id)
);

create table if not exists public.integration_audit_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  provider_connection_id uuid references public.integration_provider_connections(id) on delete set null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  provider text,
  action text not null,
  severity text not null default 'info',
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint integration_audit_log_provider_supported check (provider is null or provider in ('plaid', 'manual', 'file_import', 'other')),
  constraint integration_audit_log_action_supported check (action in ('connection_placeholder_created', 'connection_placeholder_updated', 'authorization_checked', 'provider_call_blocked', 'token_exchange_blocked', 'sync_blocked')),
  constraint integration_audit_log_severity_supported check (severity in ('info', 'warning', 'error')),
  constraint integration_audit_log_message_not_blank check (length(trim(message)) > 0),
  constraint integration_audit_log_no_token_metadata check (not (metadata ? 'access_token') and not (metadata ? 'public_token') and not (metadata ? 'refresh_token') and not (metadata ? 'secret'))
);

comment on table public.integration_provider_connections is 'Provider connection placeholders scoped to a household. Real provider tokens are intentionally not stored in this table.';
comment on column public.integration_provider_connections.token_storage_status is 'Documents that Milestone 3 stores no tokens. Future token storage requires a server-side vault decision.';
comment on table public.integration_audit_log is 'Append-only audit log for integration boundary events, blocked provider calls, and future integration lifecycle actions.';

create index if not exists integration_provider_connections_household_id_idx on public.integration_provider_connections (household_id);
create index if not exists integration_provider_connections_status_idx on public.integration_provider_connections (household_id, connection_status, sync_status);
create index if not exists integration_audit_log_household_created_at_idx on public.integration_audit_log (household_id, created_at desc);
create index if not exists integration_audit_log_connection_created_at_idx on public.integration_audit_log (provider_connection_id, created_at desc);

alter table public.integration_provider_connections
  add constraint integration_provider_connections_id_household_unique unique (id, household_id);

alter table public.integration_audit_log
  add constraint integration_audit_log_connection_household_fk foreign key (provider_connection_id, household_id) references public.integration_provider_connections(id, household_id);

drop trigger if exists set_integration_provider_connections_updated_at on public.integration_provider_connections;
create trigger set_integration_provider_connections_updated_at
  before update on public.integration_provider_connections
  for each row
  execute function public.set_updated_at();

alter table public.integration_provider_connections enable row level security;
alter table public.integration_audit_log enable row level security;

create policy "Members can read integration provider connections"
  on public.integration_provider_connections
  for select
  to authenticated
  using ((select public.is_household_member(household_id)));

create policy "Managers can insert integration provider connections"
  on public.integration_provider_connections
  for insert
  to authenticated
  with check ((select public.can_manage_integrations(household_id)));

create policy "Managers can update integration provider connections"
  on public.integration_provider_connections
  for update
  to authenticated
  using ((select public.can_manage_integrations(household_id)))
  with check ((select public.can_manage_integrations(household_id)));

create policy "Members can read integration audit log"
  on public.integration_audit_log
  for select
  to authenticated
  using ((select public.is_household_member(household_id)));

create policy "Members can insert integration audit log"
  on public.integration_audit_log
  for insert
  to authenticated
  with check (actor_user_id = (select auth.uid()) and (select public.is_household_member(household_id)));

