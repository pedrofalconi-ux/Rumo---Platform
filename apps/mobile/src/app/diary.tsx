import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  Pressable,
  View,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDiary, DiaryEntry } from '@/hooks/use-traveler-store';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function AddEntryModal({
  visible,
  onClose,
  onAdd,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: Omit<DiaryEntry, 'id' | 'tripId' | 'createdAt'>) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [day, setDay] = useState('1');

  const handleSubmit = () => {
    if (!title.trim() || !text.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha o título e o texto.');
      return;
    }
    const dayNum = parseInt(day, 10);
    if (isNaN(dayNum) || dayNum < 1) {
      Alert.alert('Dia inválido', 'Informe um número de dia válido.');
      return;
    }
    onAdd({ title: title.trim(), text: text.trim(), day: dayNum });
    setTitle('');
    setText('');
    setDay('1');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <ThemedView
          style={[styles.modalSheet, { backgroundColor: theme.background }]}
        >
          <ThemedText style={styles.modalTitle}>Nova Entrada no Diário</ThemedText>

          <ThemedText style={styles.label}>Dia da viagem</ThemedText>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected },
            ]}
            placeholder="Ex: 1"
            placeholderTextColor={theme.textSecondary}
            value={day}
            onChangeText={setDay}
            keyboardType="number-pad"
          />

          <ThemedText style={styles.label}>Título</ThemedText>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected },
            ]}
            placeholder="Ex: Chegando em Roma! 🇮🇹"
            placeholderTextColor={theme.textSecondary}
            value={title}
            onChangeText={setTitle}
          />

          <ThemedText style={styles.label}>O que aconteceu?</ThemedText>
          <TextInput
            style={[
              styles.textArea,
              { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected },
            ]}
            placeholder="Escreva sobre seu dia, experiências, sentimentos..."
            placeholderTextColor={theme.textSecondary}
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={5}
          />

          <View style={styles.modalActions}>
            <Pressable
              onPress={onClose}
              style={[styles.cancelBtn, { borderColor: theme.backgroundSelected }]}
            >
              <ThemedText>Cancelar</ThemedText>
            </Pressable>
            <Pressable onPress={handleSubmit} style={styles.addBtn}>
              <ThemedText style={styles.addBtnText}>Salvar</ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

function DiaryCard({
  entry,
  onDelete,
  theme,
}: {
  entry: DiaryEntry;
  onDelete: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const [expanded, setExpanded] = useState(false);

  const confirmDelete = () => {
    Alert.alert('Excluir entrada?', entry.title, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: onDelete },
    ]);
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
      {/* Day badge */}
      <View style={styles.cardHeader}>
        <View style={styles.dayBadge}>
          <ThemedText style={styles.dayBadgeText}>DIA {entry.day}</ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.cardDate}>
          {formatDateTime(entry.createdAt)}
        </ThemedText>
        <Pressable onPress={confirmDelete} hitSlop={8}>
          <ThemedText style={styles.deleteIcon} themeColor="textSecondary">✕</ThemedText>
        </Pressable>
      </View>

      {/* Title */}
      <ThemedText style={styles.cardTitle}>{entry.title}</ThemedText>

      {/* Body (collapsible) */}
      <ThemedText
        style={styles.cardBody}
        themeColor="textSecondary"
        numberOfLines={expanded ? undefined : 3}
      >
        {entry.text}
      </ThemedText>

      {entry.text.length > 120 && (
        <Pressable onPress={() => setExpanded((v) => !v)}>
          <ThemedText style={styles.expandText}>
            {expanded ? 'Ver menos ↑' : 'Continuar lendo ↓'}
          </ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

export default function DiaryScreen() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const activeTripId = tripId ?? 'HOR-9921';
  const theme = useTheme();
  const { entries, addEntry, deleteEntry } = useDiary(activeTripId);
  const [modalVisible, setModalVisible] = useState(false);

  const sorted = [...entries].sort((a, b) => a.day - b.day);

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <ThemedView
          style={[styles.header, { borderBottomColor: theme.backgroundSelected }]}
        >
          <View>
            <ThemedText style={styles.headerTitle}>Diário</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {entries.length} {entries.length === 1 ? 'entrada' : 'entradas'}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => setModalVisible(true)}
            style={({ pressed }) => [
              styles.addButton,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <ThemedText style={styles.addButtonText}>+ Escrever</ThemedText>
          </Pressable>
        </ThemedView>

        {/* List */}
        {sorted.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText style={styles.emptyEmoji}>📖</ThemedText>
            <ThemedText style={styles.emptyTitle} themeColor="textSecondary">
              Seu diário está vazio.
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptySubtitle}>
              Registre suas memórias, experiências e sentimentos desta viagem.
            </ThemedText>
            <Pressable
              onPress={() => setModalVisible(true)}
              style={styles.emptyAddBtn}
            >
              <ThemedText style={styles.emptyAddText}>Começar a escrever</ThemedText>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {sorted.map((entry) => (
              <DiaryCard
                key={entry.id}
                entry={entry}
                onDelete={() => deleteEntry(entry.id)}
                theme={theme}
              />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>

      <AddEntryModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={addEntry}
        theme={theme}
      />
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
  headerTitle: { fontSize: 22, fontWeight: '700' },
  addButton: {
    backgroundColor: '#004782',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 8,
  },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dayBadge: {
    backgroundColor: '#004782',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dayBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardDate: { flex: 1 },
  deleteIcon: { fontSize: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardBody: { fontSize: 13, lineHeight: 20 },
  expandText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#004782',
    marginTop: -4,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptySubtitle: { textAlign: 'center', lineHeight: 20 },
  emptyAddBtn: {
    backgroundColor: '#004782',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    marginTop: Spacing.two,
  },
  emptyAddText: { color: '#fff', fontWeight: '700' },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: Spacing.two },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#004782',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.two,
    fontSize: 14,
    marginBottom: Spacing.two,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.two,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: Spacing.three,
  },
  modalActions: { flexDirection: 'row', gap: Spacing.two },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.two,
    alignItems: 'center',
  },
  addBtn: {
    flex: 1,
    backgroundColor: '#004782',
    borderRadius: 8,
    padding: Spacing.two,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700' },
});
