import type { FinancialAccountSubtype, FinancialAccountType } from "../../domain/financial";

type PlaidAccountLike = {
  account_id: string;
  name: string;
  official_name?: string | null;
  type: string;
  subtype?: string | null;
  mask?: string | null;
  balances: {
    available?: number | null;
    current?: number | null;
    limit?: number | null;
    iso_currency_code?: string | null;
    unofficial_currency_code?: string | null;
  };
};

export type MappedPlaidAccount = {
  providerAccountId: string;
  name: string;
  officialName: string | null;
  accountType: FinancialAccountType;
  accountSubtype: FinancialAccountSubtype;
  mask: string | null;
  currency: string | null;
  availableBalance: number | null;
  currentBalance: number | null;
  limitAmount: number | null;
};

export function mapPlaidAccount(account: PlaidAccountLike): MappedPlaidAccount {
  return {
    providerAccountId: account.account_id,
    name: account.name,
    officialName: account.official_name ?? null,
    accountType: mapPlaidAccountType(account.type),
    accountSubtype: mapPlaidAccountSubtype(account.subtype),
    mask: account.mask ?? null,
    currency: account.balances.iso_currency_code ?? account.balances.unofficial_currency_code ?? null,
    availableBalance: account.balances.available ?? null,
    currentBalance: account.balances.current ?? null,
    limitAmount: account.balances.limit ?? null,
  };
}

function mapPlaidAccountType(type: string): FinancialAccountType {
  if (type === "depository" || type === "credit" || type === "loan" || type === "investment") return type;
  return "other";
}

function mapPlaidAccountSubtype(subtype: string | null | undefined): FinancialAccountSubtype {
  if (!subtype) return "other";

  const mapped: Record<string, FinancialAccountSubtype> = {
    checking: "checking",
    savings: "savings",
    money_market: "money_market",
    credit_card: "credit_card",
    mortgage: "mortgage",
    auto: "auto_loan",
    student: "student_loan",
    brokerage: "brokerage",
    "401k": "retirement",
    ira: "retirement",
    roth: "retirement",
  };

  return mapped[subtype] ?? "other";
}
