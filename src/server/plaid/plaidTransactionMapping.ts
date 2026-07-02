import type { FinancialTransactionDirection } from "../../domain/financial";

type PlaidTransactionLike = {
  transaction_id: string;
  account_id: string;
  date: string;
  authorized_date?: string | null;
  name: string;
  merchant_name?: string | null;
  amount: number;
  iso_currency_code?: string | null;
  unofficial_currency_code?: string | null;
  pending: boolean;
  personal_finance_category?: {
    primary?: string | null;
    detailed?: string | null;
  } | null;
};

export type MappedPlaidTransaction = {
  providerTransactionId: string;
  providerAccountId: string;
  transactionDate: string;
  postedDate: string | null;
  authorizedDate: string | null;
  description: string;
  merchantName: string | null;
  amount: number;
  currency: string | null;
  direction: FinancialTransactionDirection;
  pending: boolean;
  transfer: boolean;
  categoryPrimary: string | null;
  categoryDetailed: string | null;
};

export function mapPlaidTransaction(transaction: PlaidTransactionLike): MappedPlaidTransaction {
  const categoryPrimary = transaction.personal_finance_category?.primary ?? null;
  const categoryDetailed = transaction.personal_finance_category?.detailed ?? null;
  const transfer = isClearlyTransfer(categoryPrimary, categoryDetailed);

  return {
    providerTransactionId: transaction.transaction_id,
    providerAccountId: transaction.account_id,
    transactionDate: transaction.date,
    postedDate: transaction.pending ? null : transaction.date,
    authorizedDate: transaction.authorized_date ?? null,
    description: transaction.name,
    merchantName: transaction.merchant_name ?? null,
    amount: transaction.amount,
    currency: transaction.iso_currency_code ?? transaction.unofficial_currency_code ?? null,
    direction: deriveDirection(transaction.amount, transfer),
    pending: transaction.pending,
    transfer,
    categoryPrimary,
    categoryDetailed,
  };
}

function deriveDirection(amount: number, transfer: boolean): FinancialTransactionDirection {
  if (transfer) return "transfer";

  // Plaid represents many depository outflows as positive amounts and inflows as negative.
  // Preserve the original amount separately; direction is a source-derived review hint only.
  return amount < 0 ? "inflow" : "outflow";
}

function isClearlyTransfer(primary: string | null, detailed: string | null) {
  return [primary, detailed].some((value) => value?.toUpperCase().includes("TRANSFER"));
}
