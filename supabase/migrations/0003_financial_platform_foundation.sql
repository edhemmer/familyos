-- Family Office OS financial platform foundation.
-- This migration creates financial domain persistence and RLS boundaries only.
-- It intentionally does not add Plaid, OpenAI, provider tokens, ingestion jobs, dashboards, or real financial data.

create or replace function public.can_manage_financial_records(target_household_id uuid)
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

comment on function public.can_manage_financial_records(uuid) is 'Returns true when the current authenticated user has a role allowed to insert or update financial foundation records for the household.';
revoke execute on function public.can_manage_financial_records(uuid) from public;
grant execute on function public.can_manage_financial_records(uuid) to authenticated;

create table if not exists public.financial_institutions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  provider text not null default 'manual',
  provider_institution_id text,
  name text not null,
  connection_status text not null default 'not_connected',
  sync_status text not null default 'not_synced',
  last_synced_at timestamptz,
  source_system text not null default 'manual',
  source_record_id text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_institutions_name_not_blank check (length(trim(name)) > 0),
  constraint financial_institutions_connection_status_supported check (connection_status in ('not_connected', 'connected', 'needs_attention', 'disconnected')),
  constraint financial_institutions_sync_status_supported check (sync_status in ('not_synced', 'syncing', 'synced', 'stale', 'error')),
  constraint financial_institutions_provider_record_unique unique (household_id, provider, provider_institution_id)
);

create table if not exists public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  institution_id uuid references public.financial_institutions(id) on delete set null,
  provider_account_id text,
  name text not null,
  official_name text,
  account_type text not null,
  account_subtype text not null default 'other',
  mask text,
  currency text not null default 'USD',
  status text not null default 'active',
  sync_status text not null default 'not_synced',
  last_synced_at timestamptz,
  source_system text not null default 'manual',
  source_record_id text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_accounts_name_not_blank check (length(trim(name)) > 0),
  constraint financial_accounts_type_supported check (account_type in ('depository', 'credit', 'loan', 'investment', 'real_estate', 'insurance', 'other')),
  constraint financial_accounts_subtype_supported check (account_subtype in ('checking', 'savings', 'money_market', 'credit_card', 'mortgage', 'auto_loan', 'student_loan', 'brokerage', 'retirement', 'property', 'policy', 'other')),
  constraint financial_accounts_status_supported check (status in ('active', 'inactive', 'closed')),
  constraint financial_accounts_sync_status_supported check (sync_status in ('not_synced', 'syncing', 'synced', 'stale', 'error')),
  constraint financial_accounts_provider_record_unique unique (household_id, source_system, provider_account_id)
);

create table if not exists public.financial_account_balances (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  account_id uuid not null references public.financial_accounts(id) on delete cascade,
  available_balance numeric(18, 2),
  current_balance numeric(18, 2) not null,
  limit_amount numeric(18, 2),
  currency text not null default 'USD',
  balance_as_of timestamptz not null,
  sync_status text not null default 'not_synced',
  last_synced_at timestamptz,
  source_system text not null default 'manual',
  source_record_id text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_account_balances_sync_status_supported check (sync_status in ('not_synced', 'syncing', 'synced', 'stale', 'error')),
  constraint financial_account_balances_source_unique unique (household_id, account_id, source_system, source_record_id)
);

create table if not exists public.financial_categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade,
  name text not null,
  parent_category_id uuid references public.financial_categories(id) on delete set null,
  category_group text,
  is_system boolean not null default false,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_categories_name_not_blank check (length(trim(name)) > 0),
  constraint financial_categories_system_scope check ((is_system = true and household_id is null) or (is_system = false and household_id is not null))
);

create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  account_id uuid not null references public.financial_accounts(id) on delete cascade,
  institution_id uuid references public.financial_institutions(id) on delete set null,
  provider_transaction_id text,
  transaction_date date not null,
  posted_date date,
  description text not null,
  merchant_name text,
  amount numeric(18, 2) not null,
  currency text not null default 'USD',
  direction text not null,
  category_id uuid references public.financial_categories(id) on delete set null,
  category_name text,
  pending boolean not null default false,
  transfer boolean not null default false,
  review_status text not null default 'unreviewed',
  notes text,
  source text not null default 'manual',
  sync_status text not null default 'not_synced',
  last_synced_at timestamptz,
  source_system text not null default 'manual',
  source_record_id text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_transactions_description_not_blank check (length(trim(description)) > 0),
  constraint financial_transactions_direction_supported check (direction in ('inflow', 'outflow', 'transfer')),
  constraint financial_transactions_review_status_supported check (review_status in ('unreviewed', 'reviewed', 'needs_review', 'excluded')),
  constraint financial_transactions_source_supported check (source in ('manual', 'provider', 'imported', 'system')),
  constraint financial_transactions_sync_status_supported check (sync_status in ('not_synced', 'syncing', 'synced', 'stale', 'error')),
  constraint financial_transactions_provider_record_unique unique (household_id, source_system, provider_transaction_id)
);

create table if not exists public.financial_audit_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  before_snapshot jsonb,
  after_snapshot jsonb,
  source_system text not null default 'application',
  source_record_id text,
  created_at timestamptz not null default now(),
  constraint financial_audit_log_action_not_blank check (length(trim(action)) > 0),
  constraint financial_audit_log_entity_type_not_blank check (length(trim(entity_type)) > 0)
);

create table if not exists public.financial_data_quality_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  related_entity_type text,
  related_entity_id uuid,
  event_type text not null,
  severity text not null,
  title text not null,
  description text,
  status text not null default 'open',
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  source_system text not null default 'system',
  source_record_id text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_data_quality_events_title_not_blank check (length(trim(title)) > 0),
  constraint financial_data_quality_events_type_supported check (event_type in ('stale_data', 'missing_source', 'duplicate_record', 'reconciliation_needed', 'low_confidence', 'sync_failure', 'manual_review')),
  constraint financial_data_quality_events_severity_supported check (severity in ('low', 'medium', 'high', 'critical')),
  constraint financial_data_quality_events_status_supported check (status in ('open', 'resolved', 'ignored')),
  constraint financial_data_quality_events_resolution_consistent check ((status = 'resolved' and resolved_at is not null) or (status <> 'resolved'))
);

comment on table public.financial_institutions is 'Financial institution records scoped to a household. No provider tokens are stored here.';
comment on table public.financial_accounts is 'Financial account metadata scoped to a household. Balances and transactions are stored separately.';
comment on table public.financial_account_balances is 'Balance snapshots for household financial accounts with source and sync metadata.';
comment on table public.financial_transactions is 'Transaction records scoped to a household with review, source, and provenance metadata.';
comment on table public.financial_categories is 'System and household-scoped financial categories.';
comment on table public.financial_audit_log is 'Append-only financial audit log for material financial-domain events.';
comment on table public.financial_data_quality_events is 'Household-scoped data quality events for stale, missing, duplicate, low-confidence, or failed sync records.';
alter table public.financial_institutions
  add constraint financial_institutions_id_household_unique unique (id, household_id);

alter table public.financial_accounts
  add constraint financial_accounts_id_household_unique unique (id, household_id),
  add constraint financial_accounts_institution_household_fk foreign key (institution_id, household_id) references public.financial_institutions(id, household_id);

alter table public.financial_account_balances
  add constraint financial_account_balances_account_household_fk foreign key (account_id, household_id) references public.financial_accounts(id, household_id) on delete cascade;

alter table public.financial_transactions
  add constraint financial_transactions_account_household_fk foreign key (account_id, household_id) references public.financial_accounts(id, household_id) on delete cascade,
  add constraint financial_transactions_institution_household_fk foreign key (institution_id, household_id) references public.financial_institutions(id, household_id);

create index if not exists financial_institutions_household_id_idx on public.financial_institutions (household_id);
create index if not exists financial_accounts_household_id_idx on public.financial_accounts (household_id);
create index if not exists financial_accounts_institution_id_idx on public.financial_accounts (institution_id);
create index if not exists financial_account_balances_household_id_idx on public.financial_account_balances (household_id);
create index if not exists financial_account_balances_account_id_as_of_idx on public.financial_account_balances (account_id, balance_as_of desc);
create index if not exists financial_categories_household_id_idx on public.financial_categories (household_id);
create index if not exists financial_categories_parent_category_id_idx on public.financial_categories (parent_category_id);
create index if not exists financial_transactions_household_id_date_idx on public.financial_transactions (household_id, transaction_date desc);
create index if not exists financial_transactions_account_id_date_idx on public.financial_transactions (account_id, transaction_date desc);
create index if not exists financial_transactions_category_id_idx on public.financial_transactions (category_id);
create index if not exists financial_audit_log_household_id_created_at_idx on public.financial_audit_log (household_id, created_at desc);
create index if not exists financial_audit_log_entity_idx on public.financial_audit_log (entity_type, entity_id);
create index if not exists financial_data_quality_events_household_id_status_idx on public.financial_data_quality_events (household_id, status, detected_at desc);
create index if not exists financial_data_quality_events_related_entity_idx on public.financial_data_quality_events (related_entity_type, related_entity_id);

drop trigger if exists set_financial_institutions_updated_at on public.financial_institutions;
create trigger set_financial_institutions_updated_at before update on public.financial_institutions for each row execute function public.set_updated_at();
drop trigger if exists set_financial_accounts_updated_at on public.financial_accounts;
create trigger set_financial_accounts_updated_at before update on public.financial_accounts for each row execute function public.set_updated_at();
drop trigger if exists set_financial_account_balances_updated_at on public.financial_account_balances;
create trigger set_financial_account_balances_updated_at before update on public.financial_account_balances for each row execute function public.set_updated_at();
drop trigger if exists set_financial_categories_updated_at on public.financial_categories;
create trigger set_financial_categories_updated_at before update on public.financial_categories for each row execute function public.set_updated_at();
drop trigger if exists set_financial_transactions_updated_at on public.financial_transactions;
create trigger set_financial_transactions_updated_at before update on public.financial_transactions for each row execute function public.set_updated_at();
drop trigger if exists set_financial_data_quality_events_updated_at on public.financial_data_quality_events;
create trigger set_financial_data_quality_events_updated_at before update on public.financial_data_quality_events for each row execute function public.set_updated_at();

alter table public.financial_institutions enable row level security;
alter table public.financial_accounts enable row level security;
alter table public.financial_account_balances enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.financial_categories enable row level security;
alter table public.financial_audit_log enable row level security;
alter table public.financial_data_quality_events enable row level security;

create policy "Members can read financial institutions" on public.financial_institutions for select to authenticated using ((select public.is_household_member(household_id)));
create policy "Managers can insert financial institutions" on public.financial_institutions for insert to authenticated with check ((select public.can_manage_financial_records(household_id)));
create policy "Managers can update financial institutions" on public.financial_institutions for update to authenticated using ((select public.can_manage_financial_records(household_id))) with check ((select public.can_manage_financial_records(household_id)));

create policy "Members can read financial accounts" on public.financial_accounts for select to authenticated using ((select public.is_household_member(household_id)));
create policy "Managers can insert financial accounts" on public.financial_accounts for insert to authenticated with check ((select public.can_manage_financial_records(household_id)));
create policy "Managers can update financial accounts" on public.financial_accounts for update to authenticated using ((select public.can_manage_financial_records(household_id))) with check ((select public.can_manage_financial_records(household_id)));

create policy "Members can read financial account balances" on public.financial_account_balances for select to authenticated using ((select public.is_household_member(household_id)));
create policy "Managers can insert financial account balances" on public.financial_account_balances for insert to authenticated with check ((select public.can_manage_financial_records(household_id)));
create policy "Managers can update financial account balances" on public.financial_account_balances for update to authenticated using ((select public.can_manage_financial_records(household_id))) with check ((select public.can_manage_financial_records(household_id)));

create policy "Members can read financial transactions" on public.financial_transactions for select to authenticated using ((select public.is_household_member(household_id)));
create policy "Managers can insert financial transactions" on public.financial_transactions for insert to authenticated with check ((select public.can_manage_financial_records(household_id)));
create policy "Managers can update financial transactions" on public.financial_transactions for update to authenticated using ((select public.can_manage_financial_records(household_id))) with check ((select public.can_manage_financial_records(household_id)));

create policy "Members can read financial categories" on public.financial_categories for select to authenticated using (household_id is null or (select public.is_household_member(household_id)));
create policy "Managers can insert household financial categories" on public.financial_categories for insert to authenticated with check (household_id is not null and (select public.can_manage_financial_records(household_id)));
create policy "Managers can update household financial categories" on public.financial_categories for update to authenticated using (household_id is not null and (select public.can_manage_financial_records(household_id))) with check (household_id is not null and (select public.can_manage_financial_records(household_id)));

create policy "Members can read financial audit log" on public.financial_audit_log for select to authenticated using ((select public.is_household_member(household_id)));
create policy "Members can insert financial audit log" on public.financial_audit_log for insert to authenticated with check (actor_user_id = (select auth.uid()) and (select public.is_household_member(household_id)));

create policy "Members can read financial data quality events" on public.financial_data_quality_events for select to authenticated using ((select public.is_household_member(household_id)));
create policy "Managers can insert financial data quality events" on public.financial_data_quality_events for insert to authenticated with check ((select public.can_manage_financial_records(household_id)));
create policy "Managers can update financial data quality events" on public.financial_data_quality_events for update to authenticated using ((select public.can_manage_financial_records(household_id))) with check ((select public.can_manage_financial_records(household_id)));


