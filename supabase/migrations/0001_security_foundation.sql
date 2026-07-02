-- Family Office OS security foundation migration.
-- This migration creates only the identity/profile foundation.
-- It intentionally does not create financial account, transaction, asset, liability, or document tables.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'User-owned profile records for the Family Office OS identity foundation. Financial data is intentionally excluded from this table.';
comment on column public.profiles.email is 'Optional profile email copied from auth metadata when appropriate. Do not treat this as public household data.';
comment on column public.profiles.display_name is 'Optional user display name for the private prototype and future household membership UI.';

create index if not exists profiles_id_idx on public.profiles (id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'display_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user_profile() is 'Creates the non-financial profile row for a new Supabase Auth user.';

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row
  execute function public.handle_new_user_profile();

alter table public.profiles enable row level security;

drop policy if exists "Users can select their own profile" on public.profiles;
create policy "Users can select their own profile"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
