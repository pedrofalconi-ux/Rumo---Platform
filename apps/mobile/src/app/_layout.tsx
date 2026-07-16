import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthScreen } from '@/components/auth-screen';
import AppTabs from '@/components/app-tabs';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { ThemedView } from '@/components/themed-view';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Brand, Colors } from '@/constants/theme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const navigationTheme = {
    ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
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
        <AnimatedSplashOverlay />
        <RootContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Brand.coral} />
      </ThemedView>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <AppTabs />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
