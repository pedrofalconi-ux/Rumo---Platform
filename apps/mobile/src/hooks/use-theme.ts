/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
export function useTheme() {
  // The traveler experience is intentionally light and co-branded. Following the
  // device dark mode here used to invert only part of the interface on web.
  return Colors.light;
}
