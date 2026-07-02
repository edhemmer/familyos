-- Family Office OS identity and ownership foundation.
-- Canonical tenant term from the project corpus/charter: household.
-- This migration creates household ownership only. It intentionally does not create financial tables.

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint households_name_not_blank check (length(trim(name)) > 0)
);

create table if not exists public.household_memberships (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint household_memberships_role_supported check (role in ('owner', 'spouse_partner', 'advisor', 'accountant', 'attorney', 'trustee', 'viewer')),
  constraint household_memberships_status_supported check (status in ('active', 'invited', 'suspended')),
  constraint household_memberships_unique_user unique (household_id, user_id)
);

comment on table public.households is 'Tenant boundary for a household using Family Office OS. No financial records are stored here.';
comment on column public.households.created_by is 'Authenticated user that created the household tenant boundary.';
comment on table public.household_memberships is 'Role and status assignments connecting authenticated users to household tenants.';
comment on column public.household_memberships.role is 'Supported roles: owner, spouse_partner, advisor, accountant, attorney, trustee, viewer.';
comment on column public.household_memberships.status is 'Supported statuses: active, invited, suspended.';

create index if not exists households_created_by_idx on public.households (created_by);
create index if not exists household_memberships_household_id_idx on public.household_memberships (household_id);
create index if not exists household_memberships_user_id_idx on public.household_memberships (user_id);
create index if not exists household_memberships_active_lookup_idx on public.household_memberships (household_id, user_id) where status = 'active';

drop trigger if exists set_households_updated_at on public.households;
create trigger set_households_updated_at
  before update on public.households
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_household_memberships_updated_at on public.household_memberships;
create trigger set_household_memberships_updated_at
  before update on public.household_memberships
  for each row
  execute function public.set_updated_at();

create or replace function public.is_household_member(target_household_id uuid)
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
  );
$$;

comment on function public.is_household_member(uuid) is 'Returns true when the current authenticated user has active membership in the target household. Used by RLS policies.';

create or replace function public.is_household_owner(target_household_id uuid)
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
      and hm.role = 'owner'
      and hm.status = 'active'
  );
$$;

comment on function public.is_household_owner(uuid) is 'Returns true when the current authenticated user is an active owner of the target household. Used by RLS policies.';

create or replace function public.create_household_with_owner(household_name text)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household public.households;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if household_name is null or length(trim(household_name)) = 0 then
    raise exception 'Household name is required';
  end if;

  insert into public.households (name, created_by)
  values (trim(household_name), (select auth.uid()))
  returning * into new_household;

  insert into public.household_memberships (household_id, user_id, role, status)
  values (new_household.id, (select auth.uid()), 'owner', 'active');

  return new_household;
end;
$$;

comment on function public.create_household_with_owner(text) is 'Creates a household and the current user owner membership during onboarding. Financial tables are intentionally excluded.';

revoke execute on function public.is_household_member(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated;
revoke execute on function public.is_household_owner(uuid) from public;
grant execute on function public.is_household_owner(uuid) to authenticated;
revoke execute on function public.create_household_with_owner(text) from public;
grant execute on function public.create_household_with_owner(text) to authenticated;

alter table public.households enable row level security;
alter table public.household_memberships enable row level security;

drop policy if exists "Members can select their households" on public.households;
create policy "Members can select their households"
  on public.households
  for select
  to authenticated
  using ((select public.is_household_member(id)));

drop policy if exists "Authenticated users can create households" on public.households;
create policy "Authenticated users can create households"
  on public.households
  for insert
  to authenticated
  with check (created_by = (select auth.uid()));

drop policy if exists "Owners can update household details" on public.households;
create policy "Owners can update household details"
  on public.households
  for update
  to authenticated
  using ((select public.is_household_owner(id)))
  with check ((select public.is_household_owner(id)));

drop policy if exists "Members can select household memberships" on public.household_memberships;
create policy "Members can select household memberships"
  on public.household_memberships
  for select
  to authenticated
  using ((select public.is_household_member(household_id)));

drop policy if exists "Users can create their onboarding owner membership" on public.household_memberships;
create policy "Users can create their onboarding owner membership"
  on public.household_memberships
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'owner'
    and status = 'active'
    and exists (
      select 1
      from public.households h
      where h.id = household_id
        and h.created_by = (select auth.uid())
    )
  );

drop policy if exists "Owners can create household memberships" on public.household_memberships;
create policy "Owners can create household memberships"
  on public.household_memberships
  for insert
  to authenticated
  with check ((select public.is_household_owner(household_id)));

drop policy if exists "Owners can update household memberships" on public.household_memberships;
create policy "Owners can update household memberships"
  on public.household_memberships
  for update
  to authenticated
  using ((select public.is_household_owner(household_id)))
  with check ((select public.is_household_owner(household_id)));

drop policy if exists "Owners can delete household memberships" on public.household_memberships;
create policy "Owners can delete household memberships"
  on public.household_memberships
  for delete
  to authenticated
  using ((select public.is_household_owner(household_id)));

