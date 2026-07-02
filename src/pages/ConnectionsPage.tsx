import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { createPlaidLinkToken, exchangePlaidPublicToken, type PlaidExchangeResult } from "../services/plaidLinkService";

export function ConnectionsPage({ householdId, onBack }: { householdId: string; onBack: () => void }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exchangeResult, setExchangeResult] = useState<PlaidExchangeResult | null>(null);
  const [openWhenReady, setOpenWhenReady] = useState(false);

  const onSuccess = useCallback(async (publicToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await exchangePlaidPublicToken(householdId, publicToken);
      setExchangeResult(result);
    } catch (exchangeError) {
      setError(exchangeError instanceof Error ? exchangeError.message : "Unable to exchange Plaid public token.");
    } finally {
      setLoading(false);
    }
  }, [householdId]);

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
    try {
      const result = await createPlaidLinkToken(householdId);
      setLinkToken(result.linkToken);
      setOpenWhenReady(true);
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : "Unable to create Plaid Link token.");
    } finally {
      setLoading(false);
    }
  }

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
            <p>Proves Link token creation and public-token exchange through trusted server-side functions. Transaction sync is not active.</p>
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
          </div>
        ) : null}

        <p className="auth-warning">Sandbox connection foundation only. Do not use real financial accounts. No transactions, balances, analytics, or AI advisor features are enabled.</p>
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
