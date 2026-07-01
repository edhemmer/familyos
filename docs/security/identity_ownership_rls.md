# Identity and Ownership RLS Foundation

## Ownership Model

Milestone 1 uses `household` as the canonical tenant boundary. This follows the Project Charter, Project Corpus, Architecture Constitution, Product Specification, and readiness docs, which describe Family Office OS as a private household financial operating system.

The database tables are:

- `public.profiles`
- `public.households`
- `public.household_memberships`

Financial account, transaction, balance, investment, document, and AI advisor tables are intentionally not created in this milestone.

## Auth Model

Supabase Auth provides the user identity. The browser app uses only the Supabase anon key through `@supabase/supabase-js`. Service-role keys, provider secrets, webhook secrets, and admin credentials must never appear in browser code.

Unauthenticated users see the auth screen. Authenticated users without a household see household setup. Authenticated users with an active household membership see the existing prototype shell.

## Profiles

`public.profiles` stores a non-financial profile row for each Supabase Auth user. A trigger creates the profile when a new auth user is created. Profile RLS limits users to their own profile.

## Membership Model

`public.household_memberships` connects users to households. Supported roles are:

- `owner`
- `spouse_partner`
- `advisor`
- `accountant`
- `attorney`
- `trustee`
- `viewer`

Supported statuses are:

- `active`
- `invited`
- `suspended`

Only `active` memberships grant household access.

## RLS Strategy

RLS is enabled on `profiles`, `households`, and `household_memberships`.

Policies allow:

- users to select, insert, and update only their own profile
- active members to select their households
- active members to select memberships in their households
- authenticated users to create households where `created_by = auth.uid()`
- authenticated users to create their own owner membership during onboarding
- household owners to update household details
- household owners to create, update, and delete memberships

## Helper Function Strategy

The migration defines helper functions:

- `public.is_household_member(household_id uuid)`
- `public.is_household_owner(household_id uuid)`
- `public.create_household_with_owner(household_name text)`

The membership helpers return booleans only. They are used by RLS policies to avoid recursive membership policy checks and do not return cross-tenant records.

`create_household_with_owner` creates the household and owner membership together during onboarding. It checks `auth.uid()` and does not create any financial records.

## Future Financial Tables

Future financial records should reference `household_id` as the tenant boundary. Some tables may also need `user_id` when ownership, authorship, confirmation, review, or audit accountability matters.

No future financial table may be added without RLS, least-privilege authorization, provenance fields, and an audit strategy.

## Current Warning

Milestone 1 does not make Family Office OS ready for real financial data. It only creates the first authentication, profile, tenant, membership, and RLS foundation.

Do not enter real banking, investment, tax, estate, legal, insurance, identity, account, transaction, balance, or document data yet.
