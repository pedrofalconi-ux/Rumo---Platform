import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, resolveAppTheme, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useDiary } from "@/hooks/use-traveler-store";
import { useBroadcastAgencyTheme } from "@/hooks/use-shared-agency-theme";
import { getTravelerTrip, MobileItinerary } from "@/lib/traveler-api";

function daysBetween(start: string, end: string) {
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

function formatEntryDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function TripMemoryScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { sessionId } = useAuth();
  const theme = useTheme();
  const [trip, setTrip] = useState<MobileItinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const activeTripId = tripId || "unselected";
  const { entries, loading: diaryLoading } = useDiary(activeTripId);
  const agencyTheme = useMemo(() => resolveAppTheme(trip?.agency?.themeId), [trip]);
  useBroadcastAgencyTheme(agencyTheme);

  useEffect(() => {
    const task = setTimeout(() => {
      if (!sessionId || !tripId) {
        setLoading(false);
        return;
      }
      void getTravelerTrip(sessionId, tripId)
        .then(setTrip)
        .catch(() => setTrip(null))
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(task);
  }, [sessionId, tripId]);

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const days = trip ? daysBetween(trip.startDate, trip.endDate) : null;

  if (loading) {
    return (
      <ThemedView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={agencyTheme.coral} />
      </ThemedView>
    );
  }

  if (!trip) {
    return (
      <ThemedView style={[styles.center, { backgroundColor: theme.background }]}>
        <ThemedText style={styles.emptyTitle}>Viagem não encontrada</ThemedText>
        <Pressable onPress={() => router.back()} style={styles.backButtonAlt}>
          <ThemedText style={[styles.backButtonAltText, { color: agencyTheme.navy }]}>← Voltar</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            {trip.coverImage ? (
              <Image source={{ uri: trip.coverImage }} style={styles.heroImage} contentFit="cover" />
            ) : (
              <View style={[styles.heroImage, styles.heroFallback, { backgroundColor: agencyTheme.navyDeep }]}>
                <ThemedText style={styles.heroFallbackIcon}>🧭</ThemedText>
              </View>
            )}
            <View style={styles.heroScrim} />
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ThemedText style={[styles.backButtonText, { color: agencyTheme.navyDeep }]}>←</ThemedText>
            </Pressable>
            <View style={styles.heroText}>
              <ThemedText style={styles.heroEyebrow}>MEMÓRIA · {(trip.agency?.name || "AGÊNCIA").toUpperCase()}</ThemedText>
              <ThemedText style={[styles.heroTitle, { fontFamily: agencyTheme.headlineFont }]}>{trip.title}</ThemedText>
              <ThemedText style={styles.heroMeta}>
                {trip.startDate} a {trip.endDate} · {trip.destination || "Destino"}
              </ThemedText>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <ThemedText style={[styles.statNum, { color: agencyTheme.navyDeep, fontFamily: agencyTheme.headlineFont }]}>{days ?? "—"}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.statLabel}>Dias</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <ThemedText style={[styles.statNum, { color: agencyTheme.navyDeep, fontFamily: agencyTheme.headlineFont }]}>{trip.itinerary.length}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.statLabel}>Blocos</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <ThemedText style={[styles.statNum, { color: agencyTheme.navyDeep, fontFamily: agencyTheme.headlineFont }]} numberOfLines={1}>{trip.destination || "—"}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.statLabel}>Destino</ThemedText>
            </View>
          </View>

          <ThemedText style={[styles.sectionLabel, { color: agencyTheme.coral, fontFamily: agencyTheme.headlineFont }]}>DIÁRIO DA VIAGEM</ThemedText>

          {diaryLoading ? (
            <ActivityIndicator color={agencyTheme.coral} style={{ marginTop: Spacing.four }} />
          ) : sortedEntries.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.emptyDiaryCard}>
              <ThemedText themeColor="textSecondary" style={styles.emptyDiaryText}>
                Você ainda não escreveu nada sobre esta viagem.
              </ThemedText>
            </ThemedView>
          ) : (
            <View style={styles.timeline}>
              {sortedEntries.map((entry, index) => (
                <View key={entry.id} style={styles.entryRow}>
                  <View style={styles.entryRail}>
                    <View style={[styles.entryDot, { backgroundColor: agencyTheme.coral }]} />
                    {index < sortedEntries.length - 1 ? <View style={styles.entryLine} /> : null}
                  </View>
                  <View style={styles.entryBody}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.entryDate}>
                      DIA {entry.day} · {formatEntryDate(entry.createdAt)}
                    </ThemedText>
                    <ThemedText style={styles.entryTitle}>{entry.title}</ThemedText>
                    {entry.photoUrl ? (
                      <Image source={{ uri: entry.photoUrl }} style={styles.entryPhoto} contentFit="cover" />
                    ) : null}
                    <ThemedText themeColor="textSecondary" style={styles.entryText}>{entry.body}</ThemedText>
                  </View>
                </View>
              ))}
            </View>
          )}

          <Pressable
            onPress={() => router.push({ pathname: "/diary", params: { tripId: activeTripId } })}
            style={styles.addPhotosRow}
          >
            <ThemedText style={[styles.addPhotosIcon, { color: agencyTheme.coral }]}>+</ThemedText>
            <ThemedText style={[styles.addPhotosText, { color: agencyTheme.navy }]}>Adicionar mais fotos a esta memória</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1, width: "100%", maxWidth: MaxContentWidth, alignSelf: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.three, padding: Spacing.four },
  emptyTitle: { fontSize: 16, fontWeight: "800" },
  backButtonAlt: { marginTop: Spacing.two },
  backButtonAltText: { fontWeight: "800" },
  content: { paddingBottom: BottomTabInset + Spacing.five },
  hero: { height: 280, position: "relative" },
  heroImage: { width: "100%", height: "100%" },
  heroFallback: { alignItems: "center", justifyContent: "center" },
  heroFallbackIcon: { fontSize: 44, opacity: 0.4 },
  heroScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "62%",
    backgroundColor: "rgba(6,20,50,0.7)",
  },
  backButton: {
    position: "absolute",
    top: Spacing.three,
    left: Spacing.three,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: { fontSize: 16, fontWeight: "900" },
  heroText: { position: "absolute", left: Spacing.four, right: Spacing.four, bottom: Spacing.three },
  heroEyebrow: { color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginBottom: 6 },
  heroTitle: { color: "#fff", fontSize: 24, fontWeight: "900", lineHeight: 29, marginBottom: 4 },
  heroMeta: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600" },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: Spacing.four,
    marginTop: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: "#E5EAF0",
  },
  stat: { flex: 1, alignItems: "center", gap: 4 },
  statNum: { fontSize: 18, fontWeight: "900" },
  statLabel: { textTransform: "uppercase", letterSpacing: 0.6, fontSize: 9, fontWeight: "800" },
  statDivider: { width: 1, height: 28, backgroundColor: "#E5EAF0" },
  sectionLabel: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  emptyDiaryCard: { marginHorizontal: Spacing.four, padding: Spacing.four, borderRadius: 16, alignItems: "center" },
  emptyDiaryText: { textAlign: "center" },
  timeline: { paddingHorizontal: Spacing.four },
  entryRow: { flexDirection: "row", gap: Spacing.two },
  entryRail: { width: 12, alignItems: "center" },
  entryDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  entryLine: { flex: 1, width: 1, backgroundColor: "#DCE4F2", marginTop: 4 },
  entryBody: { flex: 1, paddingBottom: Spacing.four },
  entryDate: { textTransform: "uppercase", fontWeight: "800", letterSpacing: 0.5, fontSize: 10, marginBottom: 3 },
  entryTitle: { fontSize: 15, fontWeight: "800", marginBottom: 6 },
  entryPhoto: { width: "100%", height: 150, borderRadius: 12, backgroundColor: "#E9EDF2", marginBottom: 6 },
  entryText: { fontSize: 13, lineHeight: 19 },
  addPhotosRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: Spacing.four,
    marginTop: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: "#E5EAF0",
  },
  addPhotosIcon: { fontSize: 16, fontWeight: "900" },
  addPhotosText: { fontWeight: "700", fontSize: 13 },
});
