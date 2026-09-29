import * as SecureStore from "expo-secure-store";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, resolveAppTheme, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { getTravelerTrip, getTravelerTrips, MobileItinerary } from "@/lib/traveler-api";

const SYMBOLS: Record<string, string> = {
  coffee: "☕", restaurant: "🍽️", local_bar: "🍸", flight: "✈️", hotel: "🏨",
  museum: "🏛️", explore: "🚶", directions_car: "🚗", directions_transit: "🚆",
  directions_boat: "🚢", beach_access: "🏖️", forest: "🌳", shopping_bag: "🛍️",
  local_activity: "🎟️", transport: "🚐", activity: "📍", places: "📍",
};

const TYPE_LABELS: Record<string, string> = {
  day_summary: "Resumo do dia", trip_desc: "Descrição", documents: "Documentos",
  attachments: "Anexos", flight: "Voo", activity: "Atividade", hotel: "Acomodação",
  places: "Lugar", suggested_places: "Sugestão", transport: "Transporte", text: "Nota",
  cruise: "Cruzeiro", services: "Serviço", price: "Preço",
};

function progressKey(userId: string, tripId: string) {
  return `rumo.trip-progress.${userId}.${tripId}`;
}

function scrollKey(userId: string, tripId: string) {
  return `rumo.trip-scroll.${userId}.${tripId}`;
}

async function readStoredValue(key: string) {
  return Platform.OS === "web"
    ? (typeof window === "undefined" ? null : window.localStorage.getItem(key))
    : SecureStore.getItemAsync(key);
}

async function writeStoredValue(key: string, value: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function readProgress(key: string) {
  const value = await readStoredValue(key);
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function writeProgress(key: string, itemIds: string[]) {
  await writeStoredValue(key, JSON.stringify(itemIds));
}

function ItineraryImage({ uri }: { uri?: string }) {
  const [failed, setFailed] = useState(false);

  if (!uri?.trim() || failed) return null;

  return (
    <Image
      source={{ uri }}
      style={styles.itemImage}
      contentFit="cover"
      transition={200}
      onError={() => setFailed(true)}
    />
  );
}

export default function ExploreScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const { sessionId, user } = useAuth();
  const theme = useTheme();
  const [trip, setTrip] = useState<MobileItinerary | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const resumeOffsetRef = useRef(0);
  const restoredTripRef = useRef<string | null>(null);
  const saveScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTrip = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const selectedTrip = tripId
        ? await getTravelerTrip(sessionId, tripId)
        : (await getTravelerTrips(sessionId))[0] || null;
      setTrip(selectedTrip);
      if (selectedTrip && user) {
        const [savedProgress, savedOffset] = await Promise.all([
          readProgress(progressKey(user.id, selectedTrip.id)),
          readStoredValue(scrollKey(user.id, selectedTrip.id)),
        ]);
        setCompletedIds(savedProgress);
        resumeOffsetRef.current = Math.max(0, Number(savedOffset) || 0);
        restoredTripRef.current = null;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar o roteiro.");
      setTrip(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId, tripId, user]);

  useEffect(() => {
    const task = setTimeout(() => void loadTrip(), 0);
    return () => clearTimeout(task);
  }, [loadTrip]);

  useEffect(() => () => {
    if (saveScrollTimerRef.current) clearTimeout(saveScrollTimerRef.current);
  }, []);

  const agencyTheme = useMemo(() => resolveAppTheme(trip?.agency?.themeId), [trip]);

  const days = useMemo(() => {
    if (!trip) return [];
    const grouped = new Map<number, MobileItinerary["itinerary"]>();
    trip.itinerary.forEach((item) => {
      const day = Number.isFinite(item.day) && item.day > 0 ? item.day : 1;
      grouped.set(day, [...(grouped.get(day) || []), item]);
    });
    return [...grouped.entries()].sort(([a], [b]) => a - b);
  }, [trip]);

  const completedCount = trip?.itinerary.filter((item) => completedIds.includes(item.id)).length || 0;
  const totalItems = trip?.itinerary.length || 0;
  const percentage = totalItems ? Math.round((completedCount / totalItems) * 100) : 0;

  const toggleItem = async (itemId: string) => {
    if (!trip || !user) return;
    const next = completedIds.includes(itemId) ? completedIds.filter((id) => id !== itemId) : [...completedIds, itemId];
    setCompletedIds(next);
    try {
      await writeProgress(progressKey(user.id, trip.id), next);
    } catch {
      setCompletedIds(completedIds);
      setError("Não foi possível salvar essa marcação.");
    }
  };

  const restoreScrollPosition = () => {
    if (!trip || restoredTripRef.current === trip.id) return;
    restoredTripRef.current = trip.id;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: resumeOffsetRef.current, animated: false });
    });
  };

  const rememberScrollPosition = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!trip || !user || restoredTripRef.current !== trip.id) return;
    const offset = Math.max(0, event.nativeEvent.contentOffset.y);
    resumeOffsetRef.current = offset;
    if (saveScrollTimerRef.current) clearTimeout(saveScrollTimerRef.current);
    saveScrollTimerRef.current = setTimeout(() => {
      void writeStoredValue(scrollKey(user.id, trip.id), String(Math.round(offset)));
    }, 250);
  };

  if (loading) {
    return <ThemedView style={[styles.center, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={agencyTheme.coral} />
      <ThemedText themeColor="textSecondary">Carregando toda a trilha...</ThemedText>
    </ThemedView>;
  }

  if (!trip) {
    return <ThemedView style={[styles.center, { backgroundColor: theme.background }]}>
      <ThemedText style={[styles.emptyTitle, { color: agencyTheme.navy }]}>Nenhum roteiro disponível</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.centerText}>{error || "Adicione uma viagem para visualizar sua trilha."}</ThemedText>
      <Pressable onPress={() => router.push("/")} style={[styles.primaryButton, { backgroundColor: agencyTheme.navy }]}><ThemedText style={styles.primaryButtonText}>Ver minhas viagens</ThemedText></Pressable>
    </ThemedView>;
  }

  return <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={100}
        onScroll={rememberScrollPosition}
        onContentSizeChange={restoreScrollPosition}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.push("/")} style={styles.backButton}><ThemedText style={[styles.backText, { color: agencyTheme.navy }]}>← Viagens</ThemedText></Pressable>
          <ThemedText style={[styles.eyebrow, { color: agencyTheme.coral }]}>TRILHA DA VIAGEM</ThemedText>
        </View>
        <ThemedText style={[styles.title, { color: agencyTheme.navy }]}>{trip.title}</ThemedText>
        <ThemedText themeColor="textSecondary">{trip.destination || "Destino a confirmar"} · {trip.startDate} a {trip.endDate}</ThemedText>

        <ThemedView type="backgroundElement" style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View><ThemedText style={[styles.progressTitle, { color: agencyTheme.navy }]}>Seu progresso</ThemedText><ThemedText type="small" themeColor="textSecondary">{completedCount} de {totalItems} itens concluídos</ThemedText></View>
            <ThemedText style={[styles.percentage, { color: agencyTheme.coral }]}>{percentage}%</ThemedText>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${percentage}%` }]} /></View>
        </ThemedView>

        {error ? <View style={styles.errorBanner}><ThemedText style={styles.errorText}>{error}</ThemedText></View> : null}
        {days.length === 0 ? <ThemedView type="backgroundElement" style={styles.emptyCard}><ThemedText style={[styles.emptyTitle, { color: agencyTheme.navy }]}>A trilha ainda está vazia</ThemedText><ThemedText themeColor="textSecondary">Sua agência ainda não adicionou atividades a este roteiro.</ThemedText></ThemedView> : days.map(([day, items]) =>
          <View key={day} style={styles.daySection}>
            <View style={styles.dayHeading}><View style={[styles.dayBadge, { backgroundColor: agencyTheme.coral }]}><ThemedText style={styles.dayBadgeText}>{day}</ThemedText></View><ThemedText style={[styles.dayTitle, { color: agencyTheme.navy }]}>Dia {day}</ThemedText></View>
            <View style={styles.timelineLine} />
            {items.map((item) => {
              const done = completedIds.includes(item.id);
              const emoji = SYMBOLS[item.customSymbol || item.type] || "📍";
              return <Pressable key={item.id} onPress={() => void toggleItem(item.id)} style={({ pressed }) => [styles.itemCard, { backgroundColor: theme.backgroundElement, borderColor: done ? "#65B889" : theme.backgroundSelected, opacity: pressed ? 0.82 : 1 }]}>
                <View style={[styles.checkbox, done && styles.checkboxDone]}><ThemedText style={styles.checkmark}>{done ? "✓" : ""}</ThemedText></View>
                <View style={styles.itemBody}>
                  <ItineraryImage key={item.image || "no-image"} uri={item.image} />
                  <View style={styles.typeRow}><ThemedText>{emoji}</ThemedText><ThemedText style={[styles.typeLabel, { color: agencyTheme.coral }]}>{TYPE_LABELS[item.type] || "Etapa"}</ThemedText></View>
                  <ThemedText style={[styles.itemTitle, done && styles.doneText]}>{item.title}</ThemedText>
                  {item.subTitle ? <ThemedText type="small" themeColor="textSecondary" style={done ? styles.doneText : undefined}>{item.subTitle}</ThemedText> : null}
                  {item.details ? <ThemedText type="small" themeColor="textSecondary" style={[styles.details, done && styles.doneText]}>{item.details}</ThemedText> : null}
                  <ThemedText style={[styles.markHint, { color: agencyTheme.navy }, done && styles.markHintDone]}>{done ? "Concluído · toque para desfazer" : "Toque para marcar como concluído"}</ThemedText>
                </View>
              </Pressable>;
            })}
          </View>)}
      </ScrollView>
    </SafeAreaView>
  </ThemedView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, safe: { flex: 1, width: "100%", maxWidth: MaxContentWidth, alignSelf: "center" }, content: { padding: Spacing.four, paddingBottom: BottomTabInset + 110 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.three, padding: Spacing.four }, centerText: { textAlign: "center" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.two }, backButton: { paddingVertical: 8, paddingRight: 12 }, backText: { fontWeight: "800", fontSize: 12 },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.4 }, title: { fontSize: 28, lineHeight: 34, fontWeight: "900" },
  progressCard: { marginTop: Spacing.four, padding: Spacing.three, borderRadius: 18, borderWidth: 1, borderColor: "#DCE4F3" }, progressHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progressTitle: { fontWeight: "900", marginBottom: 2 }, percentage: { fontSize: 22, fontWeight: "900" }, progressTrack: { height: 9, borderRadius: 9, backgroundColor: "#E5EAF0", overflow: "hidden", marginTop: Spacing.three }, progressFill: { height: "100%", borderRadius: 9, backgroundColor: "#65B889" },
  errorBanner: { marginTop: Spacing.three, padding: Spacing.three, borderRadius: 12, backgroundColor: "#FFF0ED" }, errorText: { color: "#9D321F", fontSize: 12, fontWeight: "700" },
  daySection: { position: "relative", marginTop: Spacing.five, gap: Spacing.three }, dayHeading: { flexDirection: "row", alignItems: "center", gap: Spacing.two, zIndex: 2 }, dayBadge: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" }, dayBadgeText: { color: "#FFF", fontWeight: "900" }, dayTitle: { fontSize: 19, fontWeight: "900" }, timelineLine: { position: "absolute", left: 16, top: 34, bottom: -20, width: 2, backgroundColor: "#D9E0E8" },
  itemCard: { marginLeft: 17, flexDirection: "row", gap: Spacing.three, padding: Spacing.three, borderWidth: 1, borderRadius: 18 }, checkbox: { width: 25, height: 25, borderRadius: 13, borderWidth: 2, borderColor: "#AAB4C2", backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" }, checkboxDone: { borderColor: "#2E8B61", backgroundColor: "#2E8B61" }, checkmark: { color: "#FFF", fontWeight: "900" },
  itemBody: { flex: 1 }, itemImage: { width: "100%", height: 130, borderRadius: 12, marginBottom: Spacing.two, backgroundColor: "#E9EDF2" }, typeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }, typeLabel: { fontSize: 9, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.7 }, itemTitle: { fontSize: 15, lineHeight: 20, fontWeight: "800" }, details: { marginTop: 6, lineHeight: 18 }, doneText: { textDecorationLine: "line-through", opacity: 0.58 }, markHint: { fontSize: 10, fontWeight: "800", marginTop: Spacing.two }, markHintDone: { color: "#2E8B61" },
  emptyCard: { marginTop: Spacing.four, padding: Spacing.four, borderRadius: 18, alignItems: "center" }, emptyTitle: { fontSize: 18, fontWeight: "900", textAlign: "center" }, primaryButton: { borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12 }, primaryButtonText: { color: "#FFF", fontWeight: "800" },
});
