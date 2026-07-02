-- Family Office OS cyber security hardening.
-- This migration tightens fail-closed database posture without adding providers,
-- sync jobs, AI features, or additional financial product behavior.

create or replace function public.jsonb_contains_forbidden_secret_key(candidate jsonb)
returns boolean
language plpgsql
immutable
strict
set search_path = public
as $$
declare
  entry record;
begin
  if candidate is null then
    return false;
  end if;

  if jsonb_typeof(candidate) = 'object' then
    for entry in select key, value from jsonb_each(candidate)
    loop
      if entry.key ~* '(^|_)(access|public|refresh)?_?token$|secret|credential|password|api_?key' then
        return true;
      end if;

      if public.jsonb_contains_forbidden_secret_key(entry.value) then
        return true;
      end if;
    end loop;
  elsif jsonb_typeof(candidate) = 'array' then
    for entry in select value from jsonb_array_elements(candidate)
    loop
      if public.jsonb_contains_forbidden_secret_key(entry.value) then
        return true;
      end if;
    end loop;
  end if;

  return false;
end;
$$;

comment on function public.jsonb_contains_forbidden_secret_key(jsonb) is
  'Returns true when JSON metadata contains token-, secret-, credential-, password-, or API-key-shaped keys at any depth.';

revoke execute on function public.jsonb_contains_forbidden_secret_key(jsonb) from public;

alter table public.integration_provider_connections
  add constraint integration_provider_connections_metadata_no_secret_keys_deep
  check (not public.jsonb_contains_forbidden_secret_key(metadata));

alter table public.integration_audit_log
  add constraint integration_audit_log_metadata_no_secret_keys_deep
  check (not public.jsonb_contains_forbidden_secret_key(metadata));

-- Keep provider token rows invisible to browser-authenticated clients and non-deletable through RLS.
revoke select, delete on public.provider_token_vault from anon, authenticated;
revoke update (token_ciphertext, token_iv, token_algorithm, key_version) on public.provider_token_vault from anon, authenticated;

-- Audit logs are append-only for authenticated users. Updates and deletes remain server-only administrative operations.
revoke update, delete on public.financial_audit_log from anon, authenticated;
revoke update, delete on public.integration_audit_log from anon, authenticated;

-- Financial and integration domain records should be RLS-governed even for table-owner paths.
alter table public.profiles force row level security;
alter table public.households force row level security;
alter table public.household_memberships force row level security;
alter table public.financial_institutions force row level security;
alter table public.financial_accounts force row level security;
alter table public.financial_account_balances force row level security;
alter table public.financial_categories force row level security;
alter table public.financial_transactions force row level security;
alter table public.financial_audit_log force row level security;
alter table public.financial_data_quality_events force row level security;
alter table public.integration_provider_connections force row level security;
alter table public.integration_audit_log force row level security;
alter table public.provider_token_vault force row level security;
