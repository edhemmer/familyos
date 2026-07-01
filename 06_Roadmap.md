# Family Office OS - Roadmap

## Roadmap Principles

Build slowly, correctly, and securely. Each phase should leave the system more trustworthy than it found it.

Do not connect real financial data before the secure platform foundation exists.

## Phase 1 - Secure Platform Foundation

Goals:

- select and document production architecture
- implement authentication
- model households and members
- establish role-based permissions
- configure Supabase/Postgres with RLS
- add environment variable discipline
- add audit logging primitives
- add validation patterns
- add CI checks

Exit criteria:

- user financial data cannot be accessed without authentication
- RLS is enabled and tested for core tables
- audit events exist for material mutations
- no secrets are exposed to the browser

## Phase 2 - Financial Data Core

Goals:

- define institutions, accounts, balances, transactions, assets, liabilities
- implement provenance fields
- implement append-first import records
- implement source hierarchy handling
- implement traceable calculations

Exit criteria:

- net worth is reproducible from records
- displayed values expose source and timestamp
- manual, synced, imported, calculated, inferred, and AI-generated values are distinguishable

## Phase 3 - Family Office Dashboard

Goals:

- daily command center
- attention queue
- source inspection drawer
- review workflows
- mobile-first experience
- desktop financial review layout

Exit criteria:

- user can complete a daily review on phone
- every headline number has source context
- review actions are auditable

## Phase 4 - Cash Flow and Budgeting

Goals:

- categorize inflows and outflows
- separate transfers from income/expense
- forecast cash runway
- detect upcoming shortfalls
- model budgets and recurring obligations

## Phase 5 - Debt Strategy

Goals:

- track balances, APR, minimum payments, utilization, due dates
- compare payoff strategies
- forecast payoff dates
- flag high-risk debt patterns

## Phase 6 - Investment and Retirement View

Goals:

- holdings and allocation
- performance separated from cash flow
- retirement account view
- contribution tracking
- risk and concentration flags

## Phase 7 - Real Estate Module

Goals:

- property records
- mortgage/debt service
- taxes, insurance, reserves
- capital improvements
- operating performance for rental/commercial properties

## Phase 8 - Insurance Module

Goals:

- policies
- coverage amounts
- premiums
- renewal dates
- beneficiaries and insured parties
- gaps and review reminders

## Phase 9 - Tax Center

Goals:

- document collection
- estimated payment tracking
- tax-relevant transaction tagging
- CPA packet preparation

## Phase 10 - Estate Planning Module

Goals:

- estate documents index
- trustees, beneficiaries, key contacts
- review reminders
- secure document references

## Phase 11 - Document Vault

Goals:

- secure file storage
- metadata and classification
- OCR pipeline
- document-to-record linking
- retention and audit trail

## Phase 12 - AI Advisor

Goals:

- explain changes
- summarize documents
- classify records for review
- draft reports
- compare scenarios
- cite supporting records
- require explicit confirmation for mutations

## Phase 13 - Reporting

Goals:

- monthly reports
- net worth history
- cash flow reports
- tax packets
- advisor-ready summaries

## Phase 14 - Alerts and Automation

Goals:

- stale data alerts
- due date alerts
- cash shortfall alerts
- document renewal alerts
- review reminders

## Phase 15 - Mobile Experience Refinement

Goals:

- optimize daily review on phone
- offline-friendly review states where appropriate
- responsive source inspection
- faster capture flows
- accessibility polish

## Immediate Next Step

After this documentation suite, the next technical step should be an ADR deciding whether to continue temporarily with Vite for UI exploration or migrate deliberately to Next.js + Supabase for secure foundation work.