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
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useExpenses, Expense } from '@/hooks/use-traveler-store';

const CATEGORIES: { value: Expense['category']; label: string; emoji: string }[] = [
  { value: 'alimentação', label: 'Alimentação', emoji: '🍽️' },
  { value: 'transporte', label: 'Transporte', emoji: '🚕' },
  { value: 'hospedagem', label: 'Hospedagem', emoji: '🏨' },
  { value: 'compras', label: 'Compras', emoji: '🛍️' },
  { value: 'entretenimento', label: 'Entretenimento', emoji: '🎟️' },
  { value: 'outro', label: 'Outro', emoji: '💰' },
];

function AddExpenseModal({
  visible,
  onClose,
  onAdd,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: Omit<Expense, 'id' | 'tripId' | 'createdAt'>) => Promise<void>;
  theme: ReturnType<typeof useTheme>;
}) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Expense['category']>('alimentação');
  const [currency, setCurrency] = useState('EUR');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim() || !amount.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha descrição e valor.');
      return;
    }
    const parsed = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Valor inválido', 'Insira um valor numérico positivo.');
      return;
    }
    setSaving(true);
    try {
      await onAdd({
        description: description.trim(),
        amount: parsed,
        currency,
        category,
        date: new Date().toISOString().split('T')[0],
      });
      setDescription('');
      setAmount('');
      setCategory('alimentação');
      onClose();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível salvar a despesa.');
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
          <ThemedText style={styles.modalTitle}>Nova Despesa</ThemedText>

          {/* Category picker */}
          <ThemedText style={styles.label}>Categoria</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.value}
                onPress={() => setCategory(cat.value)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor:
                      category === cat.value ? Brand.navyDeep : theme.backgroundElement,
                    borderColor:
                      category === cat.value ? Brand.navyDeep : theme.backgroundSelected,
                  },
                ]}
              >
                <ThemedText style={styles.categoryEmoji}>{cat.emoji}</ThemedText>
                <ThemedText
                  style={[
                    styles.categoryLabel,
                    { color: category === cat.value ? '#fff' : undefined },
                  ]}
                >
                  {cat.label}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          {/* Description */}
          <ThemedText style={styles.label}>Descrição</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundElement,
                color: theme.text,
                borderColor: theme.backgroundSelected,
              },
            ]}
            placeholder="Ex: Almoço no restaurante"
            placeholderTextColor={theme.textSecondary}
            value={description}
            onChangeText={setDescription}
          />

          {/* Amount + currency row */}
          <ThemedText style={styles.label}>Valor</ThemedText>
          <View style={styles.amountRow}>
            {['EUR', 'USD', 'BRL', 'GBP'].map((cur) => (
              <Pressable
                key={cur}
                onPress={() => setCurrency(cur)}
                style={[
                  styles.currencyChip,
                  {
                    backgroundColor:
                      currency === cur ? Brand.navyDeep : theme.backgroundElement,
                    borderColor:
                      currency === cur ? Brand.navyDeep : theme.backgroundSelected,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.currencyText,
                    { color: currency === cur ? '#fff' : undefined },
                  ]}
                >
                  {cur}
                </ThemedText>
              </Pressable>
            ))}
            <TextInput
              style={[
                styles.amountInput,
                {
                  backgroundColor: theme.backgroundElement,
                  color: theme.text,
                  borderColor: theme.backgroundSelected,
                },
              ]}
              placeholder="0,00"
              placeholderTextColor={theme.textSecondary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Actions */}
          <View style={styles.modalActions}>
            <Pressable
              onPress={onClose}
              style={[styles.cancelBtn, { borderColor: theme.backgroundSelected }]}
            >
              <ThemedText>Cancelar</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={saving}
              style={[styles.addBtn, { opacity: saving ? 0.7 : 1 }]}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.addBtnText}>Adicionar</ThemedText>}
            </Pressable>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

function ExpenseItem({
  expense,
  onDelete,
  theme,
}: {
  expense: Expense;
  onDelete: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const confirmDelete = () => {
    Alert.alert('Excluir despesa?', expense.description, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <ThemedView
      style={[
        styles.expenseCard,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
      ]}
    >
      <View style={styles.expenseLeft}>
        <ThemedText style={styles.expenseEmoji}>
          {CATEGORIES.find((c) => c.value === expense.category)?.emoji ?? '💰'}
        </ThemedText>
        <View style={styles.expenseInfo}>
          <ThemedText style={styles.expenseDesc} numberOfLines={1}>
            {expense.description}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {expense.category} · {expense.date}
          </ThemedText>
        </View>
      </View>
      <View style={styles.expenseRight}>
        <ThemedText style={styles.expenseAmount}>
          {expense.currency} {expense.amount.toFixed(2)}
        </ThemedText>
        <Pressable onPress={confirmDelete} hitSlop={8}>
          <ThemedText style={styles.deleteIcon} themeColor="textSecondary">✕</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

export default function ExpensesScreen() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const activeTripId = tripId ?? 'unselected';
  const theme = useTheme();
  const { expenses, loading, error, addExpense, deleteExpense, total } = useExpenses(activeTripId);
  const [modalVisible, setModalVisible] = useState(false);

  // Group by category
  const byCategory: Record<string, Expense[]> = {};
  expenses.forEach((e) => {
    if (!byCategory[e.category]) byCategory[e.category] = [];
    byCategory[e.category].push(e);
  });

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <ThemedView
          style={[styles.header, { borderBottomColor: theme.backgroundSelected }]}
        >
          <View>
            <ThemedText style={styles.headerEyebrow}>SUAS DESPESAS</ThemedText>
            <ThemedText style={styles.headerTitle}>Despesas</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {expenses.length} {expenses.length === 1 ? 'item' : 'itens'}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => setModalVisible(true)}
            style={({ pressed }) => [
              styles.addButton,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <ThemedText style={styles.addButtonText}>+ Adicionar</ThemedText>
          </Pressable>
        </ThemedView>

        {/* Total card */}
        <View style={styles.totalCard}>
          <ThemedText style={styles.totalLabel} themeColor="textSecondary">
            Total gasto
          </ThemedText>
          <ThemedText style={styles.totalAmount}>
            EUR {total.toFixed(2)}
          </ThemedText>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <ThemedText style={styles.errorBannerText}>{error}</ThemedText>
          </View>
        ) : null}

        {/* List */}
        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={Brand.coral} />
          </View>
        ) : expenses.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIconTile, { backgroundColor: theme.accentSoft }]}>
              <ThemedText style={styles.emptyEmoji}>💸</ThemedText>
            </View>
            <ThemedText style={styles.emptyText}>Nenhuma despesa registrada.</ThemedText>
            <Pressable
              onPress={() => setModalVisible(true)}
              style={styles.emptyAddBtn}
            >
              <ThemedText style={styles.emptyAddText}>Adicionar primeira despesa</ThemedText>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {Object.entries(byCategory).map(([cat, items]) => {
              const catInfo = CATEGORIES.find((c) => c.value === cat);
              const catTotal = items.reduce((sum, e) => sum + e.amount, 0);
              return (
                <View key={cat} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <ThemedText style={styles.sectionTitle}>
                      {catInfo?.emoji} {catInfo?.label ?? cat}
                    </ThemedText>
                    <ThemedText style={styles.sectionTotal} themeColor="textSecondary">
                      EUR {catTotal.toFixed(2)}
                    </ThemedText>
                  </View>
                  {items.map((exp) => (
                    <ExpenseItem
                      key={exp.id}
                      expense={exp}
                      onDelete={() => deleteExpense(exp.id)}
                      theme={theme}
                    />
                  ))}
                </View>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>

      <AddExpenseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={addExpense}
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
  headerEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4, color: Brand.coral, marginBottom: 4 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: Brand.navyDeep, letterSpacing: -0.6 },
  addButton: {
    backgroundColor: Brand.coral,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: 14,
  },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  totalCard: {
    backgroundColor: Brand.navyDeep,
    marginHorizontal: Spacing.four,
    marginVertical: Spacing.three,
    borderRadius: 18,
    padding: Spacing.three,
  },
  totalLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  totalAmount: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 2 },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  section: { gap: Spacing.two },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: Brand.navyDeep },
  sectionTotal: { fontSize: 12, fontWeight: '600' },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.two + 4,
  },
  expenseLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flex: 1 },
  expenseEmoji: { fontSize: 22 },
  expenseInfo: { flex: 1 },
  expenseDesc: { fontSize: 13, fontWeight: '600' },
  expenseRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  expenseAmount: { fontSize: 13, fontWeight: '800', color: Brand.navyDeep },
  deleteIcon: { fontSize: 14 },
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
  emptyText: { fontSize: 17, fontWeight: '800', color: Brand.navyDeep },
  emptyAddBtn: {
    backgroundColor: Brand.coral,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 14,
    marginTop: Spacing.two,
  },
  emptyAddText: { color: '#fff', fontWeight: '700' },
  errorBanner: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.two,
    padding: Spacing.three,
    borderRadius: 12,
    backgroundColor: '#FFF0ED',
  },
  errorBannerText: { color: '#9D321F', fontSize: 12, fontWeight: '700' },
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
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: Spacing.two, color: Brand.navyDeep },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: Brand.navyDeep },
  categoryRow: { flexDirection: 'row', marginBottom: Spacing.two },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: Spacing.one,
  },
  categoryEmoji: { fontSize: 14 },
  categoryLabel: { fontSize: 12, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.two,
    fontSize: 14,
    marginBottom: Spacing.two,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginBottom: Spacing.three },
  currencyChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 10,
    borderWidth: 1,
  },
  currencyText: { fontSize: 12, fontWeight: '700' },
  amountInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.two,
    fontSize: 14,
  },
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
    backgroundColor: Brand.coral,
    borderRadius: 14,
    padding: Spacing.two,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700' },
});
