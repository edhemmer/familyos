import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/useAuth";

export function AuthPage() {
  const { loading, error, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    try {
      if (mode === "sign-in") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
    } catch (authError) {
      setLocalError(authError instanceof Error ? authError.message : "Authentication failed.");
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand">FO</div>
        <span className="screen-label">Security Foundation</span>
        <h1 id="auth-title">{mode === "sign-in" ? "Sign in" : "Create private access"}</h1>
        <p className="auth-copy">Family Office OS is entering its first protected foundation. Real financial data is still not connected or supported.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Password<input type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} /></label>
          {(localError || error) ? <p className="auth-error">{localError || error}</p> : null}
          <button className="auth-submit" type="submit" disabled={loading}>{loading ? "Working..." : mode === "sign-in" ? "Sign in" : "Create access"}</button>
        </form>

        <button className="auth-toggle" type="button" onClick={() => setMode((current) => current === "sign-in" ? "sign-up" : "sign-in")}>
          {mode === "sign-in" ? "Need access? Create an account" : "Already have access? Sign in"}
        </button>
        <p className="auth-warning">Private prototype access only. Do not enter real banking, investment, tax, legal, or identity records.</p>
      </section>
    </main>
  );
}
