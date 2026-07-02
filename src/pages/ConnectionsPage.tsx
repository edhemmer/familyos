import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { discoverPlaidAccounts, type PlaidAccountDiscoveryResult } from "../services/plaidAccountDiscoveryService";
import { createPlaidLinkToken, exchangePlaidPublicToken, type PlaidExchangeResult } from "../services/plaidLinkService";
import { syncPlaidTransactions, type PlaidTransactionSyncResult } from "../services/plaidTransactionSyncService";

export function ConnectionsPage({ householdId, onBack }: { householdId: string; onBack: () => void }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exchangeResult, setExchangeResult] = useState<PlaidExchangeResult | null>(null);
  const [discoveryResult, setDiscoveryResult] = useState<PlaidAccountDiscoveryResult | null>(null);
  const [syncResult, setSyncResult] = useState<PlaidTransactionSyncResult | null>(null);
  const [providerConnectionId, setProviderConnectionId] = useState<string | null>(null);
  const [openWhenReady, setOpenWhenReady] = useState(false);

  const onSuccess = useCallback(async (publicToken: string) => {
    setLoading(true);
    setError(null);
    setDiscoveryResult(null);
    setSyncResult(null);
    try {
      const connectionId = providerConnectionId ?? crypto.randomUUID();
      setProviderConnectionId(connectionId);
      const result = await exchangePlaidPublicToken(householdId, connectionId, publicToken);
      setExchangeResult(result);
    } catch (exchangeError) {
      setError(exchangeError instanceof Error ? exchangeError.message : "Unable to exchange Plaid public token.");
    } finally {
      setLoading(false);
    }
  }, [householdId, providerConnectionId]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  useEffect(() => {
    if (openWhenReady && ready) {
      open();
      setOpenWhenReady(false);
    }
  }, [open, openWhenReady, ready]);

  async function handleConnect() {
    setLoading(true);
    setError(null);
    setExchangeResult(null);
    setDiscoveryResult(null);
    setSyncResult(null);
    try {
      setProviderConnectionId(crypto.randomUUID());
      const result = await createPlaidLinkToken(householdId);
      setLinkToken(result.linkToken);
      setOpenWhenReady(true);
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : "Unable to create Plaid Link token.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDiscoverAccounts() {
    const connectionId = exchangeResult?.providerConnectionId ?? providerConnectionId;
    if (!connectionId) {
      setError("A vaulted Plaid connection is required before account discovery.");
      return;
    }

    setDiscoveryLoading(true);
    setError(null);
    setDiscoveryResult(null);
    setSyncResult(null);
    try {
      const result = await discoverPlaidAccounts(householdId, connectionId);
      setDiscoveryResult(result);
    } catch (discoveryError) {
      setError(discoveryError instanceof Error ? discoveryError.message : "Unable to discover Plaid accounts.");
    } finally {
      setDiscoveryLoading(false);
    }
  }

  async function handleSyncTransactions() {
    const connectionId = discoveryResult?.providerConnectionId ?? exchangeResult?.providerConnectionId ?? providerConnectionId;
    if (!connectionId) {
      setError("A discovered Plaid connection is required before transaction sync.");
      return;
    }

    setSyncLoading(true);
    setError(null);
    setSyncResult(null);
    try {
      const result = await syncPlaidTransactions(householdId, connectionId);
      setSyncResult(result);
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Unable to sync Plaid transactions.");
    } finally {
      setSyncLoading(false);
    }
  }

  const canDiscoverAccounts = exchangeResult?.status === "connected" && exchangeResult.accessTokenStored;
  const canSyncTransactions = discoveryResult?.status === "completed";

  return (
    <main className="connections-page">
      <section className="connections-panel" aria-labelledby="connections-title">
        <div className="section-head">
          <div>
            <span className="screen-label">Sandbox foundation</span>
            <h1 id="connections-title">Connections</h1>
          </div>
          <button className="ghost-button" type="button" onClick={onBack}>Back</button>
        </div>

        <div className="connection-card">
          <div>
            <strong>Plaid sandbox</strong>
            <p>Connects through trusted server-side functions, vaults the access token, discovers account metadata, and can sync transactions. Dashboard reporting is not active.</p>
          </div>
          <button type="button" onClick={handleConnect} disabled={loading || (linkToken !== null && !ready)}>
            {loading ? "Working..." : "Connect bank account"}
          </button>
        </div>

        {error ? <p className="auth-error">{error}</p> : null}

        {exchangeResult ? (
          <div className="connection-result">
            <strong>{statusTitle(exchangeResult.status)}</strong>
            <p>{statusMessage(exchangeResult.status)}</p>
            <span>Provider: {exchangeResult.provider}</span>
            {canDiscoverAccounts ? (
              <button type="button" onClick={handleDiscoverAccounts} disabled={discoveryLoading}>
                {discoveryLoading ? "Discovering..." : "Discover accounts"}
              </button>
            ) : null}
          </div>
        ) : null}

        {discoveryResult ? (
          <div className="connection-result">
            <strong>{discoveryTitle(discoveryResult.status)}</strong>
            <p>{discoveryResult.message}</p>
            <div className="connection-summary-grid">
              <span>Institutions: {discoveryResult.institutionsFound}</span>
              <span>Accounts: {discoveryResult.accountsFound}</span>
              <span>Balances: {discoveryResult.balancesUpdated}</span>
              <span>Data quality: {discoveryResult.dataQualityEventsCreated}</span>
            </div>
            {canSyncTransactions ? (
              <button type="button" onClick={handleSyncTransactions} disabled={syncLoading}>
                {syncLoading ? "Syncing..." : "Sync transactions"}
              </button>
            ) : null}
          </div>
        ) : null}

        {syncResult ? (
          <div className="connection-result">
            <strong>{syncTitle(syncResult.status)}</strong>
            <p>{syncResult.message}</p>
            <div className="connection-summary-grid">
              <span>Added: {syncResult.addedCount}</span>
              <span>Modified: {syncResult.modifiedCount}</span>
              <span>Removed: {syncResult.removedCount}</span>
              <span>Warnings: {syncResult.warningsCount}</span>
            </div>
          </div>
        ) : null}

        <p className="auth-warning">Sandbox connection foundation only. Do not use real financial accounts. Transaction sync writes server-side records, but dashboard/reporting, analytics, budgeting, categorization AI, and AI advisor features are not enabled.</p>
      </section>
    </main>
  );
}

function statusTitle(status: PlaidExchangeResult["status"]) {
  if (status === "connected") return "Sandbox connection vaulted";
  if (status === "vaulting_required") return "Token vault key required";
  if (status === "vaulting_failed") return "Token vaulting failed";
  return "Unauthorized";
}

function statusMessage(status: PlaidExchangeResult["status"]) {
  if (status === "connected") return "The Plaid access token was encrypted server-side and was not returned to the browser. Transaction sync is still not active.";
  if (status === "vaulting_required") return "The public-token exchange can succeed, but persistent storage is blocked until TOKEN_ENCRYPTION_KEY is configured. No token is stored.";
  if (status === "vaulting_failed") return "The public-token exchange can succeed, but encrypted storage failed. No token details are exposed.";
  return "Your current household role cannot manage Plaid connections.";
}

function discoveryTitle(status: PlaidAccountDiscoveryResult["status"]) {
  if (status === "completed") return "Account discovery complete";
  if (status === "blocked") return "Account discovery blocked";
  if (status === "unauthorized") return "Account discovery unauthorized";
  return "Account discovery failed";
}

function syncTitle(status: PlaidTransactionSyncResult["status"]) {
  if (status === "completed") return "Transaction sync complete";
  if (status === "blocked") return "Transaction sync blocked";
  if (status === "unauthorized") return "Transaction sync unauthorized";
  return "Transaction sync failed";
}
