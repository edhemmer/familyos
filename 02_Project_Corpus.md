# Family Office OS - Project Corpus

## Governing Knowledge Order

Future work is governed in this order:

1. Master Project Prompt
2. Project Charter
3. Project Corpus
4. Architecture Constitution
5. Product Specification
6. AI Operating Manual
7. Roadmap
8. Architecture Decision Records
9. Phase-specific implementation prompts
10. Codebase reality

If code conflicts with higher-level project law, identify the conflict before changing it.

## System Laws

These rules must not be violated:

1. Source data is preserved.
2. Original imported records are never silently overwritten.
3. AI never modifies financial records without explicit user confirmation.
4. AI-generated content is advisory, not source data.
5. Every financial number must be traceable to source records.
6. Every calculated value must expose its derivation path.
7. Every material mutation must be auditable.
8. Business logic belongs on the server, not scattered through UI components.
9. Client code is primarily presentation and interaction.
10. No secrets are exposed to the browser.
11. Row Level Security is required for all user financial data.
12. User data access must follow least privilege.
13. Financial history should be append-first and soft-delete-first.
14. Data provenance is required for important records.
15. Security wins over convenience.
16. Accuracy wins over visual polish.
17. Explainability wins over automation.
18. Maintainability wins over cleverness.

## Source-of-Truth Hierarchy

When sources disagree, use this authority order unless explicitly overridden by the user:

1. Original institution data from connected financial providers
2. Signed legal documents
3. User-confirmed manual edits
4. Official statements or uploaded documents
5. Imported third-party data
6. OCR-extracted data
7. AI-generated summaries
8. AI inference

AI may help interpret data, but it must not elevate inference above source records.

## Data Classification

### Public

General educational information, public market data, and public company information.

### Private

Household preferences, goals, notes, and non-sensitive planning assumptions.

### Sensitive

Banking data, transactions, balances, debts, investments, tax records, property records, and insurance policies.

### Highly Sensitive

Authentication credentials, API keys, access tokens, estate documents, Social Security numbers, legal documents, tax returns, and identity documents.

Highly sensitive data must receive the strongest protections available.

## Provenance Requirements

Every important record should track:

- source system
- source type
- import method
- sync timestamp
- created timestamp
- updated timestamp
- owner
- confidence level
- review status
- audit history

Every displayed financial value should answer:

- Where did this come from?
- When was it updated?
- What records support it?
- Is it synced, manual, imported, calculated, inferred, stale, or AI-generated?
- Can the user trust it?

## Calculation Principles

Calculated values must be reproducible.

Net worth is assets minus liabilities.

Cash flow is categorized inflows minus categorized outflows over a defined period. Transfers between owned accounts should not distort income, expense, or cash-flow calculations.

Debt strategy should consider balance, APR, minimum payment, utilization, due dates, and user goals.

Investment performance should be separated from household cash flow.

Real estate performance should separate operating income, operating expenses, debt service, capital improvements, reserves, taxes, and insurance.

## Current Code Reality

The current repository is a standalone Vite/React/TypeScript app. It contains early UI and seed data for daily review. This is not yet the final secure full-stack architecture. Any future work involving real financial data must move sensitive operations and financial calculations into server-side domain services with authenticated access and RLS-backed storage.