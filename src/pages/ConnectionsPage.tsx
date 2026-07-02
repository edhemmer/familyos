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
            <strong>{exchangeResult.status === "vaulting_required" ? "Token exchange proved" : "Connected"}</strong>
            <p>The Plaid access token was not returned to the browser and was not stored. Secure token vaulting is required before transaction sync.</p>
            <span>Provider: {exchangeResult.provider}</span>
          </div>
        ) : null}

        <p className="auth-warning">Sandbox connection foundation only. Do not use real financial accounts. No transactions, balances, analytics, or AI advisor features are enabled.</p>
      </section>
    </main>
  );
}

