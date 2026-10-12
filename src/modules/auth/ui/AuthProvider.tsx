"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRepositories } from "@/config/useRepositories";
import type { AuthUser } from "../domain/types";

type AuthState = {
  user: AuthUser | null;
  /** True until the first session lookup finishes. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth } = useRepositories();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    auth
      .getCurrentUser()
      .then((current) => {
        if (active) setUser(current);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    const off = auth.onChange((next) => {
      if (active) setUser(next);
    });
    return () => {
      active = false;
      off();
    };
  }, [auth]);

  const signIn = useCallback((email: string, password: string) => auth.signInWithPassword(email, password), [auth]);
  const signOut = useCallback(() => auth.signOut(), [auth]);
  const value = useMemo(() => ({ user, loading, signIn, signOut }), [user, loading, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}
