import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { AppTheme, THEMES } from '@/constants/theme';

type SharedAgencyTheme = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
};

const SharedAgencyThemeContext = createContext<SharedAgencyTheme>({
  theme: THEMES.rumo,
  setTheme: () => {},
});

/**
 * Lets trip-scoped screens (Home, Explore, Chat, Diary, Expenses, Trip Memory)
 * broadcast the active trip's agency theme up to the tab bar, which has no
 * route params of its own to resolve one. Account-level screens (Profile,
 * Search, Retrospective, Documents) reset it back to the Rumo default, since
 * they represent the traveler's own identity across agencies, not any one
 * agency's white-label.
 */
export function SharedAgencyThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>(THEMES.rumo);
  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <SharedAgencyThemeContext.Provider value={value}>{children}</SharedAgencyThemeContext.Provider>;
}

export function useSharedAgencyTheme() {
  return useContext(SharedAgencyThemeContext);
}

/** Call from any screen that resolves an agency theme, so the tab bar can pick it up too. */
export function useBroadcastAgencyTheme(theme: AppTheme) {
  const { setTheme } = useSharedAgencyTheme();
  useEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);
}

