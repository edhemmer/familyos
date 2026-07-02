import {
  getFinancialAccountBalances,
  getFinancialAccounts,
  getFinancialCategories,
  getFinancialDataQualityEvents,
  getFinancialInstitutions,
  getRecentFinancialTransactions,
} from "../repositories/financialRepository";
import type { FinancialTenantId } from "../domain/financial";

export type FinancialOverview = {
  householdId: FinancialTenantId;
  institutionCount: number;
  accountCount: number;
  balanceCount: number;
  categoryCount: number;
  openDataQualityEventCount: number;
  totalCurrentBalance: number;
  currency: string | null;
  dataStatus: "empty" | "ready" | "needs_review";
};

export type AccountsSummary = {
  householdId: FinancialTenantId;
  accountCount: number;
  activeAccountCount: number;
  staleAccountCount: number;
  totalCurrentBalance: number;
};

export type RecentActivitySummary = {
  householdId: FinancialTenantId;
  transactionCount: number;
  pendingCount: number;
  needsReviewCount: number;
  inflowTotal: number;
  outflowTotal: number;
};

export type DataQualitySummary = {
  householdId: FinancialTenantId;
  openCount: number;
  highOrCriticalCount: number;
  latestTitle: string | null;
};

export async function getFinancialOverview(householdId: FinancialTenantId): Promise<FinancialOverview> {
  const [institutions, accounts, balances, categories, qualityEvents] = await Promise.all([
    getFinancialInstitutions(householdId),
    getFinancialAccounts(householdId),
    getFinancialAccountBalances(householdId),
    getFinancialCategories(householdId),
    getFinancialDataQualityEvents(householdId),
  ]);

  const openEvents = qualityEvents.filter((event) => event.status === "open");
  const totalCurrentBalance = balances.reduce((total, balance) => total + balance.currentBalance, 0);
  const currency = balances[0]?.currency ?? null;

  return {
    householdId,
    institutionCount: institutions.length,
    accountCount: accounts.length,
    balanceCount: balances.length,
    categoryCount: categories.length,
    openDataQualityEventCount: openEvents.length,
    totalCurrentBalance,
    currency,
    dataStatus: accounts.length === 0 ? "empty" : openEvents.length > 0 ? "needs_review" : "ready",
  };
}

export async function getAccountsSummary(householdId: FinancialTenantId): Promise<AccountsSummary> {
  const [accounts, balances] = await Promise.all([getFinancialAccounts(householdId), getFinancialAccountBalances(householdId)]);

  return {
    householdId,
    accountCount: accounts.length,
    activeAccountCount: accounts.filter((account) => account.status === "active").length,
    staleAccountCount: accounts.filter((account) => account.syncStatus === "stale" || account.syncStatus === "error").length,
    totalCurrentBalance: balances.reduce((total, balance) => total + balance.currentBalance, 0),
  };
}

export async function getRecentActivitySummary(householdId: FinancialTenantId): Promise<RecentActivitySummary> {
  const transactions = await getRecentFinancialTransactions(householdId, 25);

  return {
    householdId,
    transactionCount: transactions.length,
    pendingCount: transactions.filter((transaction) => transaction.pending).length,
    needsReviewCount: transactions.filter((transaction) => transaction.reviewStatus === "needs_review" || transaction.reviewStatus === "unreviewed").length,
    inflowTotal: transactions.filter((transaction) => transaction.direction === "inflow").reduce((total, transaction) => total + transaction.amount, 0),
    outflowTotal: transactions.filter((transaction) => transaction.direction === "outflow").reduce((total, transaction) => total + Math.abs(transaction.amount), 0),
  };
}

export async function getDataQualitySummary(householdId: FinancialTenantId): Promise<DataQualitySummary> {
  const events = await getFinancialDataQualityEvents(householdId);
  const openEvents = events.filter((event) => event.status === "open");

  return {
    householdId,
    openCount: openEvents.length,
    highOrCriticalCount: openEvents.filter((event) => event.severity === "high" || event.severity === "critical").length,
    latestTitle: openEvents[0]?.title ?? null,
  };
}
