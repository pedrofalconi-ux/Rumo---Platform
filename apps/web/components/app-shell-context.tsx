'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export interface ShellSettings {
  agencyName: string;
  logoUrl: string;
}

export interface ShellUser {
  fullName: string;
  role: 'platform_admin' | 'agency_admin' | 'agent' | 'traveler';
  avatarUrl?: string;
}

interface AppShellContextValue {
  user: ShellUser | null;
  settings: ShellSettings | null;
  loading: boolean;
}

export interface InitialShellData {
  user: ShellUser | null;
  settings: ShellSettings | null;
}

const AppShellContext = createContext<AppShellContextValue>({
  user: null,
  settings: null,
  loading: true,
});

export function AppShellProvider({
  children,
  initialData,
}: {
  children: React.ReactNode;
  initialData?: InitialShellData;
}) {
  const hasInitialData = initialData !== undefined;
  const [user, setUser] = useState<ShellUser | null>(initialData?.user ?? null);
  const [settings, setSettings] = useState<ShellSettings | null>(initialData?.settings ?? null);
  const [loading, setLoading] = useState(!hasInitialData);

  useEffect(() => {
    const controller = new AbortController();

    async function loadShellData() {
      try {
        const response = await fetch('/api/app-shell', { signal: controller.signal });
        if (response.ok) {
          const data = await response.json();
          setSettings(data.settings);
          setUser(data.user);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Erro ao carregar o contexto da plataforma:', error);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    if (!hasInitialData) void loadShellData();

    const handleBrandingUpdate = (event: Event) => {
      const detail = (event as CustomEvent<Partial<ShellSettings>>).detail;
      setSettings((current) => ({
        agencyName: detail.agencyName || current?.agencyName || 'Rumo',
        logoUrl: detail.logoUrl ?? current?.logoUrl ?? '',
      }));
    };

    window.addEventListener('rumo:branding-updated', handleBrandingUpdate);
    return () => {
      controller.abort();
      window.removeEventListener('rumo:branding-updated', handleBrandingUpdate);
    };
  }, [hasInitialData]);

  const value = useMemo(() => ({ user, settings, loading }), [user, settings, loading]);

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShell() {
  return useContext(AppShellContext);
}
