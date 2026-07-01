import { useState, type FormEvent } from "react";
import { createHousehold } from "../lib/households";
import type { Household } from "../domain/identity";

export function HouseholdSetupPage({ onCreated }: { onCreated: (household: Household) => void }) {
  const [name, setName] = useState("Household");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const household = await createHousehold(name);
      onCreated(household);
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : "Unable to create household.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card setup-card" aria-labelledby="setup-title">
        <div className="auth-brand">FO</div>
        <span className="screen-label">Ownership Foundation</span>
        <h1 id="setup-title">Set up your household</h1>
        <p className="auth-copy">Create the private tenant boundary for this Family Office OS workspace. Financial tables and real financial data are intentionally not enabled yet.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>Household name<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
          {error ? <p className="auth-error">{error}</p> : null}
          <button className="auth-submit" type="submit" disabled={loading}>{loading ? "Creating..." : "Create household"}</button>
        </form>

        <p className="auth-warning">This step creates identity and ownership records only. Do not add real accounts, balances, transactions, or documents.</p>
      </section>
    </main>
  );
}
