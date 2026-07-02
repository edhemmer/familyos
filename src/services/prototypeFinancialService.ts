import { cashForecast, goals, obligations, seedAccounts, seedAttention, type Account, type SourceType } from "../data";

export type PrototypeSourceType = SourceType;
export type PrototypeAccount = Account;

export function getPrototypeFinancialShellData() {
  return {
    label: "Prototype/demo data only",
    accounts: seedAccounts,
    attentionItems: seedAttention,
    cashForecast,
    goals,
    obligations,
    isPrototype: true,
  } as const;
}
