import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { useSharedAgencyTheme } from '@/hooks/use-shared-agency-theme';

const tabs = [
  { name: 'home', href: '/' as const, label: 'Início', icon: '⌂' },
  { name: 'explore', href: '/explore' as const, label: 'Explorar', icon: '⌖' },
  { name: 'documents', href: '/documents' as const, label: 'Documentos', icon: '▤' },
  { name: 'chat', href: '/chat' as const, label: 'Suporte', icon: '◉' },
];

export default function AppTabs() {
  const { theme } = useSharedAgencyTheme();

  return (
    <View style={styles.viewport}>
      <Tabs style={styles.tabsRoot}>
        <TabSlot style={styles.content} />
        <TabList style={styles.tabBar}>
          {tabs.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href as never} asChild>
              <TabButton icon={tab.icon} accentColor={theme.coral}>{tab.label}</TabButton>
            </TabTrigger>
          ))}
        </TabList>
      </Tabs>
    </View>
  );
}

function TabButton({
  children,
  isFocused,
  icon,
  accentColor,
  ...props
}: TabTriggerSlotProps & { icon: string; accentColor: string }) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [styles.tabButton, isFocused && styles.tabButtonActive, pressed && styles.pressed]}
    >
      <ThemedText style={[styles.tabIcon, isFocused && { color: accentColor }]}>{icon}</ThemedText>
      <ThemedText style={[styles.tabLabel, isFocused && { color: accentColor }]}>{children}</ThemedText>
      {isFocused ? <View style={[styles.activeLine, { backgroundColor: accentColor }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: 0,
    backgroundColor: '#E9EEF2',
    alignItems: 'center',
    overflow: 'hidden',
  },
  tabsRoot: { flex: 1, width: '100%', minHeight: 0 },
  content: {
    flex: 1,
    height: '100%',
    minHeight: 0,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    backgroundColor: '#F7F8FA',
    overflow: 'hidden',
    boxShadow: '0 0 48px rgba(6, 29, 89, 0.10)',
  },
  tabBar: {
    position: 'absolute',
    alignSelf: 'center',
    width: '94%',
    maxWidth: 536,
    bottom: 12,
    height: 70,
    padding: 6,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E7EE',
    boxShadow: '0 10px 30px rgba(6, 29, 89, 0.14)',
    flexDirection: 'row',
  },
  tabButton: { flex: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabButtonActive: { backgroundColor: '#EEF3FF' },
  tabIcon: { color: '#778297', fontSize: 19, lineHeight: 21, fontWeight: '800' },
  tabLabel: { color: '#778297', fontSize: 10, lineHeight: 14, fontWeight: '700' },
  activeLine: { position: 'absolute', bottom: 3, width: 18, height: 3, borderRadius: 3 },
  pressed: { opacity: 0.72 },
});
