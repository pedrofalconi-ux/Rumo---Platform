import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  Pressable,
  View,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDocuments, TripDocument } from '@/hooks/use-traveler-store';

const TYPE_LABELS: Record<TripDocument['type'], string> = {
  passagem: 'Passagem',
  hotel: 'Hospedagem',
  voucher: 'Voucher',
  seguro: 'Seguro',
  outro: 'Documento',
};

const TYPE_COLORS: Record<TripDocument['type'], { bg: string; text: string }> = {
  passagem: { bg: '#EEF4FF', text: '#2D5BE3' },
  hotel: { bg: '#FFF8EE', text: '#B85D00' },
  voucher: { bg: '#EEFBF4', text: '#0F6E56' },
  seguro: { bg: '#F5F0FF', text: '#6D28D9' },
  outro: { bg: '#F4F4F5', text: '#52525B' },
};

function DocumentCard({
  doc,
  theme,
}: {
  doc: TripDocument;
  theme: ReturnType<typeof useTheme>;
}) {
  const typeColor = TYPE_COLORS[doc.type];
  const typeLabel = TYPE_LABELS[doc.type];

  const handleOpen = () => {
    if (doc.fileUrl) {
      Linking.openURL(doc.fileUrl).catch(() =>
        Alert.alert('Erro', 'Não foi possível abrir o documento.')
      );
    } else {
      Alert.alert('Documento', 'Arquivo disponível apenas no modo online.');
    }
  };

  return (
    <ThemedView
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
      ]}
    >
      <View style={styles.cardRow}>
        {/* Emoji Icon */}
        <View style={[styles.emojiBox, { backgroundColor: typeColor.bg }]}>
          <ThemedText style={styles.emojiText}>{doc.emoji}</ThemedText>
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <View style={[styles.typeBadge, { backgroundColor: typeColor.bg }]}>
              <ThemedText style={[styles.typeBadgeText, { color: typeColor.text }]}>
                {typeLabel}
              </ThemedText>
            </View>
          </View>
          <ThemedText style={styles.cardTitle} numberOfLines={2}>
            {doc.name}
          </ThemedText>
          {doc.description && (
            <ThemedText style={styles.cardDesc} themeColor="textSecondary" numberOfLines={2}>
              {doc.description}
            </ThemedText>
          )}
        </View>
      </View>

      <Pressable
        onPress={handleOpen}
        style={({ pressed }) => [
          styles.openButton,
          { backgroundColor: pressed ? '#003a6a' : '#004782', opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <ThemedText style={styles.openButtonText}>
          {Platform.OS === 'web' ? '🔗 Ver documento' : '📄 Abrir'}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

export default function DocumentsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const activeTripId = tripId ?? 'HOR-9921';
  const theme = useTheme();
  const { documents } = useDocuments(activeTripId);

  const byType = documents.reduce<Record<string, TripDocument[]>>((acc, doc) => {
    if (!acc[doc.type]) acc[doc.type] = [];
    acc[doc.type].push(doc);
    return acc;
  }, {});

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <ThemedView
          style={[styles.header, { borderBottomColor: theme.backgroundSelected }]}
        >
          <ThemedText style={styles.headerTitle}>Documentos</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {documents.length} {documents.length === 1 ? 'arquivo' : 'arquivos'}
          </ThemedText>
        </ThemedView>

        {documents.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText style={styles.emptyEmoji}>📂</ThemedText>
            <ThemedText style={styles.emptyText} themeColor="textSecondary">
              Nenhum documento disponível ainda.
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Seu consultor irá adicionar os vouchers aqui.
            </ThemedText>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {Object.entries(byType).map(([type, docs]) => (
              <View key={type} style={styles.section}>
                <ThemedText style={styles.sectionTitle}>
                  {TYPE_LABELS[type as TripDocument['type']]}s
                </ThemedText>
                {docs.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} theme={theme} />
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  section: { gap: Spacing.two },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#004782',
    marginBottom: Spacing.one,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  emojiBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emojiText: { fontSize: 22 },
  cardContent: { flex: 1, gap: Spacing.one },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  typeBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  cardTitle: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  cardDesc: { fontSize: 12, lineHeight: 16 },
  openButton: {
    borderRadius: 8,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  openButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: '600' },
});
