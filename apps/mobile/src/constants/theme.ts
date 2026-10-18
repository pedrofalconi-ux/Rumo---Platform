/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0B1E3A',
    background: '#F8FAFC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E8F2FF',
    textSecondary: '#68728A',
    primary: '#2E8BFF',
    primarySoft: '#F1F7FF',
    accent: '#00B8D9',
    accentSoft: '#E6F9FC',
    success: '#12805C',
    border: '#DCE4F2',
  },
  dark: {
    text: '#F7F6F1',
    background: '#102B38',
    backgroundElement: '#183B4E',
    backgroundSelected: '#315568',
    textSecondary: '#AFC1C5',
    primary: '#F7F6F1',
    primarySoft: '#294C5E',
    accent: '#34D6EE',
    accentSoft: '#164A55',
    success: '#70C6A8',
    border: '#315568',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 10,
  medium: 14,
  large: 20,
  pill: 999,
} as const;

export const Brand = {
  navy: '#2E8BFF',
  navyDeep: '#0B1E3A',
  coral: '#00B8D9',
  sand: '#F8FAFC',
  mineral: '#00D4FF',
  white: '#FFFFFF',
} as const;

/**
 * Agency-selectable app themes (see Configurações > Marca no aplicativo).
 * An agency's chosen theme id travels on `trip.agency.themeId` from the traveler
 * trips API. `headlineFont` names a font family loaded via expo-font in the root
 * layout (see _layout.tsx) — undefined means "keep the system default", which is
 * what Rumo's own identity uses.
 */
export type AppTheme = {
  navy: string;
  navyDeep: string;
  coral: string;
  glow: string;
  headlineFont?: string;
};

export const THEMES: Record<string, AppTheme> = {
  rumo: { navy: '#2E8BFF', navyDeep: '#0B1E3A', coral: '#00B8D9', glow: '#86E8F5' },
  'quiet-luxury': {
    navy: '#93542F',
    navyDeep: '#6E3D21',
    coral: '#93542F',
    glow: '#E4C9A8',
    headlineFont: 'PlayfairDisplay_700Bold',
  },
  'fall-guys': {
    navy: '#3A1F5D',
    navyDeep: '#2A1544',
    coral: '#FF3E7F',
    glow: '#FFD23F',
    headlineFont: 'Baloo2_700Bold',
  },
};

export function resolveAppTheme(themeId?: string | null): AppTheme {
  return THEMES[themeId || 'rumo'] || THEMES.rumo;
}

export const BottomTabInset = Platform.select({ ios: 54, android: 76, web: 92 }) ?? 76;
export const MaxContentWidth = 560;
