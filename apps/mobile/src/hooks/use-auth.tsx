import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

import {
  ApiError,
  AuthUser,
  getCurrentTraveler,
  importTravelerTrip,
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
  errorCode: string | null;
  signIn: (email: string, password: string, importInviteToken?: string) => Promise<void>;
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
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return;
    if (sessionId) {
      window.localStorage.setItem(SESSION_KEY, sessionId);
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
    return;
  }

  if (sessionId) {
    await SecureStore.setItemAsync(SESSION_KEY, sessionId);
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

async function readPersistedSession() {
  if (Platform.OS === "web") {
    return typeof window === "undefined" ? null : window.localStorage.getItem(SESSION_KEY);
  }
  return SecureStore.getItemAsync(SESSION_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    async function bootstrap() {
      try {
        const storedSessionId = await readPersistedSession();
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
      errorCode,
      async signIn(email, password, importInviteToken) {
        setAuthBusy(true);
        setError(null);
        setErrorCode(null);
        try {
          const result = await loginTraveler(email, password);
          await persistSession(result.session.id);
          setSessionId(result.session.id);
          setUser(result.user);
          if (importInviteToken) {
            try {
              await importTravelerTrip(result.session.id, importInviteToken);
            } catch {
              // Login already succeeded; surface the import failure without blocking access.
              setError("Voce entrou, mas nao foi possivel importar o convite automaticamente. Tente novamente na tela de importar viagem.");
            }
          }
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
        setErrorCode(null);
        try {
          const result = await registerTraveler(payload);
          await persistSession(result.session.id);
          setSessionId(result.session.id);
          setUser(result.user);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Nao foi possivel criar sua conta.");
          setErrorCode(err instanceof ApiError ? err.code || null : null);
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
          setErrorCode(null);
          setAuthBusy(false);
        }
      },
      clearError() {
        setError(null);
        setErrorCode(null);
      },
    }),
    [authBusy, error, errorCode, loading, sessionId, user]
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
