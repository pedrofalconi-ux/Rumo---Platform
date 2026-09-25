/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#14213D',
    background: '#F5F7FB',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E1E8F5',
    textSecondary: '#68728A',
    primary: '#073BCE',
    primarySoft: '#EAF0FF',
    accent: '#FF6542',
    accentSoft: '#FFF0EC',
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
    accent: '#FF7A47',
    accentSoft: '#553526',
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
  navy: '#073BCE',
  navyDeep: '#061D59',
  coral: '#FF6542',
  sand: '#F5F7FB',
  mineral: '#6F98F5',
  white: '#FFFFFF',
} as const;

/**
 * Agency-selectable app themes (see apps/web's Settings > Branding & White-label).
 * An agency's chosen theme id travels on `trip.agency.themeId` from the traveler
 * trips API. This registry is color-only for now — swapping in a different
 * display typeface per theme would need real font files bundled via expo-font,
 * which is a separate, larger piece of work.
 */
export type AppTheme = {
  navy: string;
  navyDeep: string;
  coral: string;
  glow: string;
};

export const THEMES: Record<string, AppTheme> = {
  rumo: { navy: '#073BCE', navyDeep: '#061D59', coral: '#FF6542', glow: '#8FB1FF' },
  'quiet-luxury': { navy: '#93542F', navyDeep: '#6E3D21', coral: '#93542F', glow: '#E4C9A8' },
  'fall-guys': { navy: '#3A1F5D', navyDeep: '#2A1544', coral: '#FF3E7F', glow: '#FFD23F' },
};

export function resolveAppTheme(themeId?: string | null): AppTheme {
  return THEMES[themeId || 'rumo'] || THEMES.rumo;
}

export const BottomTabInset = Platform.select({ ios: 54, android: 76, web: 92 }) ?? 76;
export const MaxContentWidth = 560;
