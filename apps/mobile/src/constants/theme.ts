/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#172126',
    background: '#F5F3EE',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#DDE2DE',
    textSecondary: '#667176',
    primary: '#183B4E',
    primarySoft: '#E8EFED',
    accent: '#F26B3A',
    accentSoft: '#FFF0E9',
    success: '#0F6E56',
    border: '#DDE2DE',
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
  navy: '#183B4E',
  navyDeep: '#102B38',
  coral: '#F26B3A',
  sand: '#F5F3EE',
  mineral: '#79A9A4',
  white: '#FFFFFF',
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
