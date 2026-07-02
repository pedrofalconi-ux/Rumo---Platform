import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  AuthUser,
  getCurrentTraveler,
  loginTraveler,
  logoutTraveler,
  registerTraveler,
} from "@/lib/traveler-api";

const SESSION_KEY = "rumo.traveler.session";

interface AuthContextValue {
  user: AuthUser | null;
  sessionId: string | null;
  loading: boolean;
  authBusy: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: {
    fullName: string;
    email: string;
    emailConfirm: string;
    phone?: string;
    password: string;
    inviteToken: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function persistSession(sessionId: string | null) {
  if (sessionId) {
    await SecureStore.setItemAsync(SESSION_KEY, sessionId);
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function bootstrap() {
      try {
        const storedSessionId = await SecureStore.getItemAsync(SESSION_KEY);
        if (!storedSessionId) return;

        const result = await getCurrentTraveler(storedSessionId);
        setSessionId(storedSessionId);
        setUser(result.user);
      } catch {
        await persistSession(null);
        setSessionId(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      sessionId,
      loading,
      authBusy,
      error,
      async signIn(email, password) {
        setAuthBusy(true);
        setError(null);
        try {
          const result = await loginTraveler(email, password);
          await persistSession(result.session.id);
          setSessionId(result.session.id);
          setUser(result.user);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Nao foi possivel entrar.");
          throw err;
        } finally {
          setAuthBusy(false);
        }
      },
      async signUp(payload) {
        setAuthBusy(true);
        setError(null);
        try {
          const result = await registerTraveler(payload);
          await persistSession(result.session.id);
          setSessionId(result.session.id);
          setUser(result.user);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Nao foi possivel criar sua conta.");
          throw err;
        } finally {
          setAuthBusy(false);
        }
      },
      async signOut() {
        setAuthBusy(true);
        try {
          if (sessionId) {
            await logoutTraveler(sessionId);
          }
        } catch {
          // Best-effort logout.
        } finally {
          await persistSession(null);
          setSessionId(null);
          setUser(null);
          setError(null);
          setAuthBusy(false);
        }
      },
      clearError() {
        setError(null);
      },
    }),
    [authBusy, error, loading, sessionId, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth precisa estar dentro de AuthProvider.");
  }
  return context;
}

