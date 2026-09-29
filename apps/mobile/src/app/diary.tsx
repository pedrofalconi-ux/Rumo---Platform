import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Pressable,
  View,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppTheme, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDiary, useTripAgencyTheme, DiaryEntry } from '@/hooks/use-traveler-store';

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
  agencyTheme,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: { title: string; body: string; day: number; photoUri?: string | null }) => Promise<void>;
  theme: ReturnType<typeof useTheme>;
  agencyTheme: AppTheme;
}) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [day, setDay] = useState('1');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Autorize o acesso às fotos para anexar uma imagem.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !text.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha o título e o texto.');
      return;
    }
    const dayNum = parseInt(day, 10);
    if (isNaN(dayNum) || dayNum < 1) {
      Alert.alert('Dia inválido', 'Informe um número de dia válido.');
      return;
    }
    setSaving(true);
    try {
      await onAdd({ title: title.trim(), body: text.trim(), day: dayNum, photoUri });
      setTitle('');
      setText('');
      setDay('1');
      setPhotoUri(null);
      onClose();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível salvar a entrada.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <ThemedView
          style={[styles.modalSheet, { backgroundColor: theme.background }]}
        >
          <ThemedText style={[styles.modalTitle, { color: agencyTheme.navyDeep }]}>Nova Entrada no Diário</ThemedText>

          <ThemedText style={[styles.label, { color: agencyTheme.navyDeep }]}>Dia da viagem</ThemedText>
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

          <ThemedText style={[styles.label, { color: agencyTheme.navyDeep }]}>Título</ThemedText>
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

          <ThemedText style={[styles.label, { color: agencyTheme.navyDeep }]}>O que aconteceu?</ThemedText>
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

          <ThemedText style={[styles.label, { color: agencyTheme.navyDeep }]}>Foto</ThemedText>
          {photoUri ? (
            <View style={styles.photoAttached}>
              <Image source={{ uri: photoUri }} style={styles.photoAttachedImage} contentFit="cover" />
              <Pressable onPress={() => setPhotoUri(null)} style={styles.photoRemove} hitSlop={8}>
                <ThemedText style={styles.photoRemoveText}>✕</ThemedText>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={pickPhoto}
              style={[styles.photoEmpty, { borderColor: theme.backgroundSelected }]}
            >
              <ThemedText style={[styles.photoEmptyText, { color: agencyTheme.coral }]}>+ Adicionar foto</ThemedText>
            </Pressable>
          )}

          <View style={styles.modalActions}>
            <Pressable
              onPress={onClose}
              disabled={saving}
              style={[styles.cancelBtn, { borderColor: theme.backgroundSelected, opacity: saving ? 0.6 : 1 }]}
            >
              <ThemedText>Cancelar</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={saving}
              style={[styles.addBtn, { backgroundColor: agencyTheme.coral, opacity: saving ? 0.7 : 1 }]}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.addBtnText}>Salvar</ThemedText>}
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
  agencyTheme,
}: {
  entry: DiaryEntry;
  onDelete: () => void;
  theme: ReturnType<typeof useTheme>;
  agencyTheme: AppTheme;
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
        <View style={[styles.dayBadge, { backgroundColor: agencyTheme.navyDeep }]}>
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

      {entry.photoUrl ? (
        <Image source={{ uri: entry.photoUrl }} style={styles.cardPhoto} contentFit="cover" />
      ) : null}

      {/* Body (collapsible) */}
      <ThemedText
        style={styles.cardBody}
        themeColor="textSecondary"
        numberOfLines={expanded ? undefined : 3}
      >
        {entry.body}
      </ThemedText>

      {entry.body.length > 120 && (
        <Pressable onPress={() => setExpanded((v) => !v)}>
          <ThemedText style={[styles.expandText, { color: agencyTheme.navyDeep }]}>
            {expanded ? 'Ver menos ↑' : 'Continuar lendo ↓'}
          </ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

export default function DiaryScreen() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const activeTripId = tripId ?? 'unselected';
  const theme = useTheme();
  const agencyTheme = useTripAgencyTheme(activeTripId);
  const { entries, loading, error, addEntry, deleteEntry } = useDiary(activeTripId);
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
            <ThemedText style={[styles.headerEyebrow, { color: agencyTheme.coral }]}>SEU DIÁRIO</ThemedText>
            <ThemedText style={[styles.headerTitle, { color: agencyTheme.navyDeep }]}>Diário</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {entries.length} {entries.length === 1 ? 'entrada' : 'entradas'}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => setModalVisible(true)}
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: agencyTheme.coral, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <ThemedText style={styles.addButtonText}>+ Escrever</ThemedText>
          </Pressable>
        </ThemedView>

        {error ? (
          <View style={styles.errorBanner}>
            <ThemedText style={styles.errorBannerText}>{error}</ThemedText>
          </View>
        ) : null}

        {/* List */}
        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={agencyTheme.coral} />
          </View>
        ) : sorted.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIconTile, { backgroundColor: theme.accentSoft }]}>
              <ThemedText style={styles.emptyEmoji}>📖</ThemedText>
            </View>
            <ThemedText style={[styles.emptyTitle, { color: agencyTheme.navyDeep }]}>Seu diário está vazio.</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptySubtitle}>
              Registre suas memórias, experiências e sentimentos desta viagem.
            </ThemedText>
            <Pressable
              onPress={() => setModalVisible(true)}
              style={[styles.emptyAddBtn, { backgroundColor: agencyTheme.coral }]}
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
                agencyTheme={agencyTheme}
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
        agencyTheme={agencyTheme}
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
  headerEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginBottom: 4 },
  headerTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.6 },
  addButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: 14,
  },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  card: {
    borderRadius: 18,
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
  cardPhoto: { width: '100%', height: 160, borderRadius: 12, backgroundColor: '#E9EDF2' },
  cardBody: { fontSize: 13, lineHeight: 20 },
  expandText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: -4,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  emptyIconTile: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyEmoji: { fontSize: 26 },
  emptyTitle: { fontSize: 17, fontWeight: '800' },
  emptySubtitle: { textAlign: 'center', lineHeight: 20 },
  emptyAddBtn: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 14,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: Spacing.two },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.two,
    fontSize: 14,
    marginBottom: Spacing.two,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.two,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: Spacing.three,
  },
  photoEmpty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  photoEmptyText: { fontWeight: '700', fontSize: 13 },
  photoAttached: { width: 88, height: 88, marginBottom: Spacing.three },
  photoAttachedImage: { width: '100%', height: '100%', borderRadius: 12, backgroundColor: '#E9EDF2' },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DDD1B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: { fontSize: 10, fontWeight: '800' },
  errorBanner: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.two,
    padding: Spacing.three,
    borderRadius: 12,
    backgroundColor: '#FFF0ED',
  },
  errorBannerText: { color: '#9D321F', fontSize: 12, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: Spacing.two },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.two,
    alignItems: 'center',
  },
  addBtn: {
    flex: 1,
    borderRadius: 14,
    padding: Spacing.two,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700' },
});
