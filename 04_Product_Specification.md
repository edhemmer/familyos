# Family Office OS - Product Specification

## Product Promise

Family Office OS gives a household one secure place to understand, review, and act on its financial life.

The product should answer daily:

- What changed?
- What needs attention?
- Where did each number come from?
- What is my household's current financial position?
- What should be prepared for review or professional advice?

## Initial Product Surface

The initial product surface is the Daily Command Center.

It should show:

- net worth
- daily change
- liquidity and runway
- accounts and balances
- source and sync status
- confidence levels
- attention items
- obligations due
- cash-flow forecast
- goals
- AI advisor summary with citations
- quick capture for manual/imported records

## Core User Workflows

### Daily Review

The user opens the app and sees what changed since the last review. The app highlights balance changes, upcoming obligations, stale records, low-confidence sources, and items requiring confirmation.

### Source Inspection

The user can inspect any important value and see supporting source records, timestamps, confidence, source type, and derivation path.

### Manual Capture

The user can add manual records when no integration exists. Manual records must be clearly labeled and must not masquerade as synced institution data.

### Document Import

The user can upload statements, policies, tax records, estate documents, or supporting files. Imported values must preserve the source file relationship and review status.

### Attention Review

The app surfaces issues requiring user review. Marking an item reviewed should create an audit trail when backed by server storage.

### AI Advisor Review

AI may summarize and recommend next actions, but must cite supporting records and clearly separate facts, calculations, assumptions, estimates, recommendations, and uncertainty.

## UX Principles

- Mobile-first; the phone experience should be a first-class daily workflow.
- Desktop should support denser review and analysis.
- The interface should feel calm, premium, secure, professional, and understated.
- Avoid flashy consumer-finance visuals.
- Avoid numbers without source context.
- Avoid charts without clear purpose and provenance.

## Required States

Every core workflow should support:

- loading state
- empty state
- error state
- stale data state
- review required state
- success/confirmation state
- offline or unavailable integration state where applicable

## Data Display Requirements

Important financial values should display or make accessible:

- amount
- source type
- source system
- timestamp
- confidence
- review status
- calculation method, if calculated
- supporting records, if applicable

## Early Product Constraints

The current app includes local seed data and local interaction state. This is acceptable only for early UI exploration. It must not be represented as real connected financial data.

Before real financial data is introduced, the product must have authenticated server storage, Row Level Security, secure data access, and audit logging.

## Success Criteria For Foundation Phase

- Project specifications exist in version control.
- Architecture decisions are documented.
- The current UI is clearly framed as early local shell work.
- Future implementation can proceed against stable security and product laws.
- The next technical step is explicit and limited.