# RLS Foundation

## Current Auth Model

Family Office OS now has a Supabase browser client configured for email/password authentication through Supabase Auth. The app uses the public anon key only. No service-role key may ever be used in browser code.

Unauthenticated users see the auth screen. Authenticated users without a household see the household setup screen. Authenticated users with an active household membership see the existing prototype shell.

## Profiles Table Purpose

The `public.profiles` table is the initial identity/profile foundation. It stores one profile row per authenticated Supabase user. It is not a household model and does not store financial information.

Current fields:

- `id`: references `auth.users(id)` and cascades on auth user deletion
- `email`: optional profile email; do not treat as public household data
- `display_name`: nullable display name
- `created_at`: creation timestamp
- `updated_at`: update timestamp maintained by trigger

## Household Ownership Purpose

The canonical tenant boundary is `household`, based on the project corpus and charter. The `public.households` and `public.household_memberships` tables establish ownership and role-based access without creating financial tables.

## RLS Policies Added

RLS is enabled on `public.profiles`, `public.households`, and `public.household_memberships`.

Policies allow authenticated users to:

- select, insert, and update only their own profile
- select households where they have active membership
- select memberships for households where they have active membership
- create households where `created_by = auth.uid()`
- create their own active owner membership during onboarding
- update household details when they are an active owner
- manage memberships when they are an active owner

## Why Financial Tables Are Not Created Yet

Financial account, transaction, document, asset, liability, and investment tables are intentionally not created in this foundation step. Those tables require provenance rules, audit logging, source-record preservation, and table-specific authorization decisions.

## Browser Secret Rule

Only the Supabase anon key may be exposed to the browser. Service-role keys, provider secrets, API tokens, webhook secrets, and admin credentials must remain server-side only.

## localStorage Rule

localStorage may not store real financial data, sensitive household data, documents, source records, or credentials. Current localStorage usage is prototype-only and must be removed or constrained before real financial workflows are introduced.
