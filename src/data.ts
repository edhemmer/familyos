// Family Office OS prototype data only.
// This is not real user financial data.
// Future real financial data must come from a production security foundation with authenticated, authorization-protected durable storage.

export type SourceType = "Synced" | "Manual" | "Imported" | "Calculated";

export type Account = {
  id: string;
  name: string;
  institution: string;
  domain: "Cash" | "Investments" | "Real Estate" | "Liability" | "Insurance";
  balance: number;
  dayChange: number;
  source: SourceType;
  confidence: number;
  lastSync: string;
};

export type AttentionItem = {
  id: string;
  title: string;
  detail: string;
  severity: "High" | "Medium" | "Low";
  source: string;
};

export const seedAccounts: Account[] = [
  { id: "operating", name: "Household Operating", institution: "Chase", domain: "Cash", balance: 42890, dayChange: -1840, source: "Synced", confidence: 99, lastSync: "6 min ago" },
  { id: "reserve", name: "Emergency Reserve", institution: "Navy Federal", domain: "Cash", balance: 68500, dayChange: 0, source: "Synced", confidence: 99, lastSync: "11 min ago" },
  { id: "tax", name: "Tax Reserve", institution: "Treasury sweep", domain: "Cash", balance: 31200, dayChange: 0, source: "Manual", confidence: 84, lastSync: "Updated today" },
  { id: "brokerage", name: "Taxable Brokerage", institution: "Fidelity", domain: "Investments", balance: 286440, dayChange: 2140, source: "Synced", confidence: 98, lastSync: "9 min ago" },
  { id: "retirement", name: "Retirement Core", institution: "Fidelity", domain: "Investments", balance: 391800, dayChange: 3180, source: "Synced", confidence: 98, lastSync: "9 min ago" },
  { id: "home", name: "Primary Residence", institution: "Imported valuation", domain: "Real Estate", balance: 535000, dayChange: 0, source: "Imported", confidence: 73, lastSync: "Yesterday" },
  { id: "mortgage", name: "Mortgage", institution: "Servicer", domain: "Liability", balance: -318250, dayChange: 0, source: "Imported", confidence: 91, lastSync: "Yesterday" },
  { id: "auto", name: "Auto Loan", institution: "Credit union", domain: "Liability", balance: -18400, dayChange: 0, source: "Manual", confidence: 79, lastSync: "3 days ago" },
];

export const seedAttention: AttentionItem[] = [
  { id: "cash", title: "Operating cash below comfort band", detail: "Mortgage and card payoff land inside the same seven-day window.", severity: "High", source: "Cash Flow / Obligations" },
  { id: "loan", title: "Manual auto loan balance is stale", detail: "Confirm balance before calculating debt payoff pace.", severity: "Medium", source: "Liabilities" },
  { id: "home", title: "Real estate estimate needs reconciliation", detail: "Imported valuation should be checked against statement and comps.", severity: "Low", source: "Real Estate" },
];

export const obligations = [
  { name: "Mortgage payment", amount: 2630, due: "4 days", status: "Autopay" },
  { name: "Credit card payoff", amount: 1840, due: "2 days", status: "Review required" },
  { name: "Umbrella premium", amount: 620, due: "9 days", status: "Scheduled" },
];

export const cashForecast = [142.6, 138.1, 146.3, 143.9, 151.2];

export const goals = [
  { name: "6-month liquidity reserve", current: 68500, target: 90000, date: "Dec 2026" },
  { name: "Quarterly tax reserve", current: 31200, target: 42000, date: "Sep 2026" },
  { name: "Auto loan payoff", current: 6200, target: 18400, date: "Mar 2027" },
];
