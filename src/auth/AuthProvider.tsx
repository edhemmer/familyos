import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthError, Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function errorMessage(error: AuthError | Error | null) {
  return error?.message ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      setSession(data.session);
      setError(errorMessage(sessionError));
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setError(null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    loading,
    error,
    signInWithEmail: async (email, password) => {
      setLoading(true);
      setError(null);
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      setError(errorMessage(signInError));
      setLoading(false);
      if (signInError) throw signInError;
    },
    signUpWithEmail: async (email, password) => {
      setLoading(true);
      setError(null);
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      setError(errorMessage(signUpError));
      setLoading(false);
      if (signUpError) throw signUpError;
    },
    signOut: async () => {
      setLoading(true);
      setError(null);
      const { error: signOutError } = await supabase.auth.signOut();
      setError(errorMessage(signOutError));
      setLoading(false);
      if (signOutError) throw signOutError;
    },
  }), [loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
