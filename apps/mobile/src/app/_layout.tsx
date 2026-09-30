import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import { Baloo2_700Bold } from '@expo-google-fonts/baloo-2';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthScreen } from '@/components/auth-screen';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { SharedAgencyThemeProvider } from '@/hooks/use-shared-agency-theme';
import { ThemedView } from '@/components/themed-view';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Brand, Colors } from '@/constants/theme';

export default function TabLayout() {
  const palette = Colors.light;
  const [agencyFontsLoaded] = useFonts({ Baloo2_700Bold, PlayfairDisplay_700Bold });
  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: palette.accent,
      background: palette.background,
      card: palette.backgroundElement,
      text: palette.text,
      border: palette.border,
      notification: palette.accent,
    },
  };
  return (
    <ThemeProvider value={navigationTheme}>
      <AuthProvider>
        <SharedAgencyThemeProvider>
          <AnimatedSplashOverlay />
          <RootContent fontsReady={agencyFontsLoaded} />
        </SharedAgencyThemeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootContent({ fontsReady }: { fontsReady: boolean }) {
  const { user, loading } = useAuth();

  if (loading || !fontsReady) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Brand.coral} />
      </ThemedView>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
