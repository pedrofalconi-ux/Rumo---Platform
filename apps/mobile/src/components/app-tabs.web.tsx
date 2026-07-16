import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';

const tabs = [
  { name: 'home', href: '/' as const, label: 'Viagens', icon: '⌂' },
  { name: 'documents', href: '/documents' as const, label: 'Documentos', icon: '▤' },
  { name: 'chat', href: '/chat' as const, label: 'Mensagens', icon: '◌' },
  { name: 'expenses', href: '/expenses' as const, label: 'Despesas', icon: '◈' },
  { name: 'diary', href: '/diary' as const, label: 'Diário', icon: '✦' },
];

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          {tabs.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton icon={tab.icon}>{tab.label}</TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, icon, ...props }: TabTriggerSlotProps & { icon: string }) {
  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <ThemedText style={[styles.tabIcon, isFocused && styles.tabActive]}>{icon}</ThemedText>
      <ThemedText type="small" style={[styles.tabLabel, isFocused && styles.tabActive]}>
        {children}
      </ThemedText>
      {isFocused ? <View style={styles.activeDot} /> : null}
    </Pressable>
  );
}

function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        <View style={styles.brandMark}>
          <ThemedText style={styles.brandLetter}>R</ThemedText>
        </View>
        <View style={styles.brandCopy}>
          <ThemedText style={styles.brandText}>Rumo</ThemedText>
          <ThemedText style={styles.brandCaption}>APP DO VIAJANTE</ThemedText>
        </View>
        <View style={styles.tabsRow}>{props.children}</View>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: { position: 'absolute', width: '100%', padding: Spacing.three, alignItems: 'center' },
  innerContainer: {
    width: '100%', maxWidth: MaxContentWidth, minHeight: 68, paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 18, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DDE2DE',
    boxShadow: '0 12px 32px rgba(24,59,78,.12)',
  },
  brandMark: { width: 38, height: 38, borderRadius: 12, backgroundColor: Brand.navy, alignItems: 'center', justifyContent: 'center' },
  brandLetter: { color: Brand.white, fontWeight: '900', fontSize: 17 },
  brandCopy: { marginLeft: 10, marginRight: 'auto' },
  brandText: { fontWeight: '800', color: Brand.navy, lineHeight: 18 },
  brandCaption: { fontSize: 8, letterSpacing: 1.2, color: '#667176', fontWeight: '700' },
  tabsRow: { flexDirection: 'row', gap: 3 },
  tabButton: { minWidth: 72, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, alignItems: 'center' },
  tabIcon: { fontSize: 15, lineHeight: 17, color: '#788388' },
  tabLabel: { fontSize: 10, lineHeight: 14, color: '#667176' },
  tabActive: { color: Brand.navy, fontWeight: '800' },
  activeDot: { position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: 2, backgroundColor: Brand.coral },
  pressed: { opacity: 0.7 },
});
