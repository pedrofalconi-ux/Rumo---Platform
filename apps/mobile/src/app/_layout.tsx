import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthScreen } from '@/components/auth-screen';
import AppTabs from '@/components/app-tabs';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { ThemedView } from '@/components/themed-view';
import { ActivityIndicator, StyleSheet } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
        <ActivityIndicator size="large" color="#004782" />
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
