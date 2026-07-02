import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth/useAuth";
import type { Household } from "./domain/identity";
import { getCurrentHousehold } from "./lib/households";
import { AuthPage } from "./pages/AuthPage";
import { HouseholdSetupPage } from "./pages/HouseholdSetupPage";
import { ConnectionsPage } from "./pages/ConnectionsPage";
import { getPrototypeFinancialShellData, type PrototypeAccount, type PrototypeSourceType } from "./services/prototypeFinancialService";

type ManualEntry = {
  id: string;
  label: string;
  amount: number;
  source: PrototypeSourceType;
  createdAt: string;
};

type ViewMode = "today" | "cash" | "invest" | "documents" | "advisor";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const compactMoney = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });

function readEntries(): ManualEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem("familyos.entries");
    return stored ? (JSON.parse(stored) as ManualEntry[]) : [];
  } catch {
    return [];
  }
}

function readReviewed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem("familyos.reviewed");
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    today: "M4 13h5V4H4v9Zm0 7h5v-5H4v5Zm7 0h9v-9h-9v9Zm0-11h9V4h-9v5Z",
    cash: "M3 6h18v12H3V6Zm3 3a3 3 0 0 1-3 3m18 0a3 3 0 0 1-3-3M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z",
    invest: "M4 17 9 12l4 4 7-9m0 0h-5m5 0v5",
    docs: "M7 3h7l5 5v13H7V3Zm7 0v6h5M10 13h6M10 17h6",
    advisor: "M12 3a6 6 0 0 0-6 6v3a6 6 0 1 0 12 0V9a6 6 0 0 0-6-6Zm-3 9h.01M15 12h.01M9 16h6M4 11H2m20 0h-2",
    lock: "M7 10V7a5 5 0 0 1 10 0v3m-12 0h14v11H5V10Zm7 5v3",
    check: "M4 12.5 9 17l11-11",
    alert: "M12 3 2.5 20h19L12 3Zm0 6v5m0 3h.01",
    plus: "M12 5v14M5 12h14",
    sync: "M20 7v5h-5M4 17v-5h5M18 9a7 7 0 0 0-12-2M6 15a7 7 0 0 0 12 2",
  };

  return (
    <svg aria-hidden="true" className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}

function SourceBadge({ source }: { source: PrototypeSourceType }) {
  return <span className={`source source-${source.toLowerCase()}`}>{source}</span>;
}

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone?: "good" | "warn" }) {
  return (
    <article className="metric">
      <div className="metric-top">
        <span>{label}</span>
        {tone ? <strong className={tone}>{tone === "good" ? "up" : "review"}</strong> : null}
      </div>
      <strong className="metric-value">{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function MiniLine({ values }: { values: number[] }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 80 - ((value - min) / (max - min || 1)) * 58;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="mini-line" viewBox="0 0 100 86" preserveAspectRatio="none">
      <polyline points={points} />
    </svg>
  );
}

function AccountRow({ account }: { account: PrototypeAccount }) {
  return (
    <div className="account-row">
      <div>
        <strong>{account.name}</strong>
        <span>{account.institution} | {account.lastSync}</span>
      </div>
      <div className="account-money">
        <strong>{money.format(account.balance)}</strong>
        <span className={account.dayChange >= 0 ? "good" : "warn"}>{money.format(account.dayChange)}</span>
      </div>
      <SourceBadge source={account.source} />
      <span className="confidence">{account.confidence}%</span>
    </div>
  );
}

export default function App() {
  const { loading: authLoading, user } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [householdLoading, setHouseholdLoading] = useState(false);
  const [householdError, setHouseholdError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setHousehold(null);
      setHouseholdError(null);
      setHouseholdLoading(false);
      return;
    }

    let cancelled = false;
    setHouseholdLoading(true);
    setHouseholdError(null);

    getCurrentHousehold()
      .then((currentHousehold) => {
        if (!cancelled) setHousehold(currentHousehold);
      })
      .catch((error) => {
        if (!cancelled) setHouseholdError(error instanceof Error ? error.message : "Unable to load household.");
      })
      .finally(() => {
        if (!cancelled) setHouseholdLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (authLoading) {
    return <main className="loading-screen">Loading Family Office OS...</main>;
  }

  if (!user) {
    return <AuthPage />;
  }

  if (householdLoading) {
    return <main className="loading-screen">Loading household...</main>;
  }

  if (householdError) {
    return <main className="loading-screen error-screen">{householdError}</main>;
  }

  if (!household) {
    return <HouseholdSetupPage onCreated={setHousehold} />;
  }

  return <PrototypeShell householdId={household.id} />;
}

function PrototypeShell({ householdId }: { householdId: string }) {
  const [mode, setMode] = useState<ViewMode>("today");
  const [entries, setEntries] = useState<ManualEntry[]>(readEntries);
  const [reviewed, setReviewed] = useState<string[]>(readReviewed);
  const [entryLabel, setEntryLabel] = useState("Manual balance adjustment");
  const [entryAmount, setEntryAmount] = useState("250");
  const [lastSync, setLastSync] = useState(new Date());
  const [showConnections, setShowConnections] = useState(false);
  const financialShellData = getPrototypeFinancialShellData();

  if (showConnections) {
    return <ConnectionsPage householdId={householdId} onBack={() => setShowConnections(false)} />;
  }

  useEffect(() => window.localStorage.setItem("familyos.entries", JSON.stringify(entries)), [entries]);
  useEffect(() => window.localStorage.setItem("familyos.reviewed", JSON.stringify(reviewed)), [reviewed]);

  const manualTotal = entries.reduce((total, entry) => total + entry.amount, 0);
  const netWorth = financialShellData.accounts.reduce((total, account) => total + account.balance, 0) + manualTotal;
  const dayChange = financialShellData.accounts.reduce((total, account) => total + account.dayChange, 0) + manualTotal;
  const liquidity = financialShellData.accounts.filter((account) => account.domain === "Cash").reduce((total, account) => total + account.balance, 0);
  const liabilities = Math.abs(financialShellData.accounts.filter((account) => account.domain === "Liability").reduce((total, account) => total + account.balance, 0));
  const confidence = Math.round(financialShellData.accounts.reduce((total, account) => total + account.confidence, 0) / financialShellData.accounts.length);
  const openAttention = financialShellData.attentionItems.filter((item) => !reviewed.includes(item.id));

  const domainTotals = useMemo(() => {
    const totals = new Map<string, number>();
    financialShellData.accounts.forEach((account) => totals.set(account.domain, Math.abs((totals.get(account.domain) ?? 0) + account.balance)));
    return Array.from(totals, ([domain, value]) => ({ domain, value }));
  }, []);

  function addEntry(source: PrototypeSourceType) {
    const amount = Number(entryAmount);
    if (!entryLabel.trim() || !Number.isFinite(amount)) return;
    setEntries((current) => [
      { id: crypto.randomUUID(), label: entryLabel.trim(), amount, source, createdAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) },
      ...current,
    ]);
    setEntryLabel(source === "Imported" ? "Imported document value" : "Manual balance adjustment");
    setEntryAmount(source === "Imported" ? "1200" : "250");
  }

  const nav = [
    ["today", "Today"],
    ["cash", "Cash"],
    ["invest", "Invest"],
    ["documents", "Docs"],
    ["advisor", "Advisor"],
  ] as const;

  return (
    <div className="app-shell">
      <aside className="rail">
        <div className="brand">
          <div className="brand-mark">FO</div>
          <div>
            <strong>Family Office OS</strong>
            <span>Private command center</span>
          </div>
        </div>
        <nav className="rail-nav" aria-label="Primary">
          {nav.map(([id, label]) => (
            <button key={id} className={mode === id ? "active" : ""} onClick={() => setMode(id)}>
              <Icon name={id === "invest" ? "invest" : id === "documents" ? "docs" : id} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <button className="rail-secondary" type="button" onClick={() => setShowConnections(true)}>Connections</button>
        <div className="security-note">
          <Icon name="lock" />
          <span>Local secure mode. Advisor cannot modify records.</span>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <span className="screen-label">Today</span>
            <h1>What changed in your financial life</h1>
          </div>
          <button className="sync" onClick={() => setLastSync(new Date())}>
            <Icon name="sync" />
            <span>{lastSync.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
          </button>
        </header>

        <section className="mobile-hero">
          <span>Net Worth</span>
          <strong>{money.format(netWorth)}</strong>
          <small className={dayChange >= 0 ? "good" : "warn"}>{money.format(dayChange)} today</small>
        </section>

        <section className="metrics-grid">
          <Metric label="Net Worth" value={money.format(netWorth)} detail={`${money.format(liabilities)} liabilities included`} tone={dayChange >= 0 ? "good" : "warn"} />
          <Metric label="Liquidity" value={money.format(liquidity)} detail="52 days estimated runway" tone="good" />
          <Metric label="Review" value={String(openAttention.length)} detail="Open attention items" tone={openAttention.length ? "warn" : "good"} />
          <Metric label="Confidence" value={`${confidence}%`} detail="Weighted source quality" />
        </section>

        <div className="content-grid">
          <section className="panel accounts-panel">
            <div className="section-head">
              <div><Icon name="cash" /><h2>Accounts</h2></div>
              <span>Traceable to source</span>
            </div>
            <div className="accounts-list">
              {financialShellData.accounts.map((account) => <AccountRow key={account.id} account={account} />)}
            </div>
          </section>

          <section className="panel capture-panel">
            <div className="section-head"><div><Icon name="plus" /><h2>Quick Capture</h2></div></div>
            <label>Description<input value={entryLabel} onChange={(event) => setEntryLabel(event.target.value)} /></label>
            <label>Amount<input inputMode="decimal" value={entryAmount} onChange={(event) => setEntryAmount(event.target.value)} /></label>
            <div className="button-pair">
              <button onClick={() => addEntry("Manual")}>Add manual</button>
              <button onClick={() => addEntry("Imported")}>Import doc</button>
            </div>
            <div className="entry-list">
              {entries.slice(0, 4).map((entry) => (
                <div key={entry.id} className="entry-row">
                  <div><strong>{entry.label}</strong><span>{entry.createdAt}</span></div>
                  <div><strong>{money.format(entry.amount)}</strong><SourceBadge source={entry.source} /></div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel cash-panel">
            <div className="section-head"><div><Icon name="cash" /><h2>Cash Flow</h2></div><span>30 days</span></div>
            <MiniLine values={financialShellData.cashForecast} />
            <div className="forecast-row">
              {financialShellData.cashForecast.map((value, index) => <span key={index}>{compactMoney.format(value * 1000)}</span>)}
            </div>
          </section>

          <section className="panel attention-panel">
            <div className="section-head"><div><Icon name="alert" /><h2>Attention</h2></div><span>{openAttention.length} open</span></div>
            <div className="attention-list">
              {openAttention.map((item) => (
                <article key={item.id} className={`attention ${item.severity.toLowerCase()}`}>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                  <span>{item.source}</span>
                  <button onClick={() => setReviewed((current) => [...current, item.id])}><Icon name="check" /> Mark reviewed</button>
                </article>
              ))}
              {!openAttention.length ? <p className="clear-state">All review items are clear for today.</p> : null}
            </div>
          </section>

          <section className="panel allocation-panel">
            <div className="section-head"><div><Icon name="invest" /><h2>Balance Sheet Mix</h2></div></div>
            {domainTotals.map((item) => (
              <div key={item.domain} className="bar-row">
                <span>{item.domain}</span>
                <div><i style={{ width: `${Math.min(100, (item.value / 700000) * 100)}%` }} /></div>
                <strong>{compactMoney.format(item.value)}</strong>
              </div>
            ))}
          </section>

          <section className="panel advisor-panel">
            <div className="section-head"><div><Icon name="advisor" /><h2>Advisor</h2></div><span>Explainable</span></div>
            <strong>Suggested next move</strong>
            <p>Keep the credit card payoff scheduled, but transfer {money.format(4500)} from reserve after payroll posts if operating cash stays below the comfort band.</p>
            <div className="citations">
              <span>Traceable to source: Cash Flow</span>
              <span>Traceable to source: Obligations</span>
              <span>Traceable to source: Household Operating</span>
            </div>
          </section>

          <section className="panel financialShellData.goals-panel">
            <div className="section-head"><div><Icon name="today" /><h2>Goals</h2></div></div>
            {financialShellData.goals.map((goal) => {
              const pct = Math.round((goal.current / goal.target) * 100);
              return (
                <div key={goal.name} className="goal-row">
                  <div><strong>{goal.name}</strong><span>{goal.date}</span></div>
                  <div className="progress"><i style={{ width: `${pct}%` }} /></div>
                  <span>{pct}%</span>
                </div>
              );
            })}
          </section>

          <section className="panel financialShellData.obligations-panel">
            <div className="section-head"><div><Icon name="docs" /><h2>Obligations</h2></div></div>
            {financialShellData.obligations.map((item) => (
              <div key={item.name} className="obligation-row">
                <div><strong>{item.name}</strong><span>Due in {item.due}</span></div>
                <div><strong>{money.format(item.amount)}</strong><span className={item.status === "Review required" ? "warn" : "good"}>{item.status}</span></div>
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}






