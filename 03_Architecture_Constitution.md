# Family Office OS - Architecture Constitution

## Architecture Intent

Family Office OS must evolve as financial software: secure, typed, auditable, modular, and explainable. Architecture decisions should favor durable domain boundaries over short-term UI convenience.

## Preferred Long-Term Stack

The preferred long-term stack is:

- Next.js
- TypeScript
- React
- Tailwind CSS
- shadcn/ui
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Row Level Security
- Server Actions or secure API routes
- Background jobs where needed
- Edge Functions where beneficial

The current codebase is Vite/React. Do not migrate frameworks without an explicit Architecture Decision Record.

## Required Architectural Properties

### Security First

All sensitive user data must require authentication, authorization, and least-privilege access. No secrets may be exposed to browser code. Service-role keys must never be shipped to clients.

### Server-Owned Business Logic

Financial calculations, reconciliation, import normalization, AI insight generation, mutation validation, and audit logging belong in server-side services. UI components should present state and initiate explicit user actions, not become the source of business truth.

### Append-First Data Model

Financial history should be append-first and soft-delete-first. Original imported records must be preserved. Derived records and corrections should reference their source records.

### Traceability

Every displayed financial number should be backed by a derivation path from source records to calculations to rendered value.

### Domain Modularity

Each domain should own its models, services, business rules, UI, and tests. Cross-domain access should happen through explicit service contracts, not ad hoc imports.

## Domain Boundary Guidance

Initial durable domains:

- identity-security
- household
- members-roles
- institutions
- accounts
- transactions
- assets-liabilities
- cash-flow
- investments
- real-estate
- insurance
- taxes
- estate
- documents
- goals
- reports
- alerts
- ai-intelligence
- integrations
- administration

## Data Access Rules

- Client components must not directly perform sensitive financial mutations.
- Data access must be centralized through typed server functions, service modules, or API routes.
- All user financial tables must use Row Level Security before production use.
- Every material mutation must write an audit event.
- Imported source data must remain immutable or versioned.
- Manual user corrections must create new records or correction events, not silently overwrite source data.

## Validation Rules

Use explicit validation at trust boundaries:

- route/action inputs
- file uploads
- import payloads
- AI tool arguments
- financial mutation requests
- environment configuration

Prefer schemas that can be shared between runtime validation and TypeScript inference.

## UI Architecture Rules

- Mobile-first layouts are required.
- Desktop views should increase information density without hiding provenance.
- UI must provide loading, empty, error, and review states.
- Important values need source and confidence context.
- Avoid large unstructured components.
- Avoid UI-only calculations for financial truth.

## Security Review Checklist

Before merging features that touch sensitive data, verify:

- Authentication is required.
- Authorization is least privilege.
- RLS policies exist and are tested.
- Secrets are server-only.
- Inputs are validated.
- Mutations are auditable.
- Destructive actions are soft-delete or reversible where appropriate.
- AI output is advisory and separated from source records.
- Financial values expose provenance.

## Current Architecture Note

The current Vite app is acceptable for non-sensitive local UI exploration only. It must not be connected to real financial accounts, documents, or personal records until authenticated server-side storage, RLS, audit logging, and secure data access are implemented.