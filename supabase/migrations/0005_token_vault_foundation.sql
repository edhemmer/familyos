-- Family Office OS token vault foundation.
-- Stores encrypted provider tokens only. Plaintext provider tokens must never be stored.
-- Normal authenticated users cannot select token vault rows directly; trusted server-side functions use service-role behavior.

create table if not exists public.provider_token_vault (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  provider_connection_id uuid not null references public.integration_provider_connections(id) on delete cascade,
  provider text not null,
  token_ciphertext text not null,
  token_iv text not null,
  token_algorithm text not null,
  key_version text not null default 'v1',
  status text not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  constraint provider_token_vault_provider_supported check (provider in ('plaid')),
  constraint provider_token_vault_status_supported check (status in ('active', 'revoked', 'rotation_required')),
  constraint provider_token_vault_algorithm_supported check (token_algorithm in ('AES-GCM')),
  constraint provider_token_vault_key_version_not_blank check (length(trim(key_version)) > 0),
  constraint provider_token_vault_ciphertext_not_blank check (length(trim(token_ciphertext)) > 0),
  constraint provider_token_vault_iv_not_blank check (length(trim(token_iv)) > 0),
  constraint provider_token_vault_connection_household_fk foreign key (provider_connection_id, household_id) references public.integration_provider_connections(id, household_id) on delete cascade
);

comment on table public.provider_token_vault is 'Encrypted provider token vault. Token ciphertext is not exposed to normal browser queries. Trusted server-side functions use service-role behavior.';
comment on column public.provider_token_vault.token_ciphertext is 'AES-GCM encrypted token ciphertext. Never return this to browser clients.';
comment on column public.provider_token_vault.token_iv is 'AES-GCM per-token IV/nonce encoded for server-side decryption.';
comment on column public.provider_token_vault.key_version is 'Token encryption key version. Milestone 5 supports v1 only; future rotation requires explicit migration and re-encryption workflow.';

create unique index if not exists provider_token_vault_one_active_per_connection_idx
  on public.provider_token_vault (provider_connection_id)
  where status = 'active';

create index if not exists provider_token_vault_household_connection_idx on public.provider_token_vault (household_id, provider_connection_id);
create index if not exists provider_token_vault_status_idx on public.provider_token_vault (status, updated_at desc);

drop trigger if exists set_provider_token_vault_updated_at on public.provider_token_vault;
create trigger set_provider_token_vault_updated_at
  before update on public.provider_token_vault
  for each row
  execute function public.set_updated_at();

alter table public.provider_token_vault enable row level security;

create policy "Managers can insert encrypted provider tokens"
  on public.provider_token_vault
  for insert
  to authenticated
  with check ((select public.can_manage_integrations(household_id)));

create policy "Managers can revoke encrypted provider tokens"
  on public.provider_token_vault
  for update
  to authenticated
  using ((select public.can_manage_integrations(household_id)))
  with check (
    (select public.can_manage_integrations(household_id))
    and status in ('revoked', 'rotation_required')
  );

-- Intentionally no SELECT policy for authenticated users.
-- Token vault reads must happen only in trusted server-side functions using service-role behavior.
-- Intentionally no DELETE policy; revoke instead.
