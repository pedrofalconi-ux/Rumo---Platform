import React, { useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, Pressable, Share, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Brand, MaxContentWidth, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { DiaryEntry, getDiaryEntries, getTravelerTrips, MobileItinerary } from "@/lib/traveler-api";

const CARD_WIDTH = Math.min(340, Dimensions.get("window").width - Spacing.four * 2);

function daysBetween(start: string, end: string) {
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

function isCompleted(trip: MobileItinerary) {
  if (!trip.endDate) return false;
  const end = new Date(trip.endDate);
  if (Number.isNaN(end.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end < today;
}

export default function RetrospectiveScreen() {
  const router = useRouter();
  const { sessionId, user } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<MobileItinerary[]>([]);
  const [bestMoment, setBestMoment] = useState<{ entry: DiaryEntry; tripTitle: string } | null>(null);

  useEffect(() => {
    const task = setTimeout(() => {
      if (!sessionId) {
        setLoading(false);
        return;
      }
      void (async () => {
        try {
          const allTrips = await getTravelerTrips(sessionId);
          const completed = allTrips.filter(isCompleted);
          setTrips(completed);

          const entryLists = await Promise.all(
            completed.map((trip) =>
              getDiaryEntries(sessionId, trip.id)
                .then((entries) => entries.map((entry) => ({ entry, tripTitle: trip.title })))
                .catch(() => [])
            )
          );
          const allEntries = entryLists.flat();
          const withPhoto = allEntries.filter((e) => e.entry.photoUrl);
          const pool = withPhoto.length > 0 ? withPhoto : allEntries;
          const best = pool.sort((a, b) => b.entry.body.length - a.entry.body.length)[0] || null;
          setBestMoment(best);
        } finally {
          setLoading(false);
        }
      })();
    }, 0);
    return () => clearTimeout(task);
  }, [sessionId]);

  const totalDays = trips.reduce((sum, t) => sum + daysBetween(t.startDate, t.endDate), 0);
  const destinations = [...new Set(trips.map((t) => t.destination).filter(Boolean))];
  const agencies = [...new Set(trips.map((t) => t.agency?.name).filter(Boolean))] as string[];

  const handleShare = async () => {
    const name = user?.fullName?.split(" ")[0] || "Viajante";
    const message = `${name} já viajou ${trips.length} ${trips.length === 1 ? "vez" : "vezes"} com a Rumo: ${totalDays} dias, ${destinations.length} ${destinations.length === 1 ? "destino" : "destinos"} — ${destinations.join(", ")}.`;
    try {
      await Share.share({ message });
    } catch {
      // User cancelled or share unavailable — nothing to do.
    }
  };

  if (loading) {
    return (
      <ThemedView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={Brand.coral} />
      </ThemedView>
    );
  }

  if (trips.length === 0) {
    return (
      <ThemedView style={[styles.center, { backgroundColor: theme.background }]}>
        <ThemedText style={styles.emptyTitle}>Sua retrospectiva ainda está em branco</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.emptyText}>
          Assim que você concluir sua primeira viagem, ela aparece aqui.
        </ThemedText>
        <Pressable onPress={() => router.back()} style={styles.backButtonAlt}>
          <ThemedText style={styles.backButtonAltText}>← Voltar</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const coverPhoto = trips.find((t) => t.coverImage)?.coverImage;

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backButtonText}>←</ThemedText>
          </Pressable>
          <ThemedText style={styles.topBarTitle}>Retrospectiva</ThemedText>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.cardStage}>
          {/* Card 1: opener */}
          <View style={[styles.card, { width: CARD_WIDTH }]}>
            {coverPhoto ? (
              <Image source={{ uri: coverPhoto }} style={styles.cardBg} contentFit="cover" />
            ) : (
              <View style={[styles.cardBg, styles.cardBgFallback]} />
            )}
            <View style={styles.cardScrim} />
            <View style={styles.cardContent}>
              <ThemedText style={styles.cardEyebrow}>SUA JORNADA COM A RUMO</ThemedText>
              <ThemedText style={styles.openHeadline}>
                {trips.length} {trips.length === 1 ? "viagem" : "viagens"}.{"\n"}
                {totalDays} dias.{"\n"}
                {destinations.length} {destinations.length === 1 ? "destino" : "destinos"}.
              </ThemedText>
            </View>
          </View>

          {/* Card 2: destinations */}
          <View style={[styles.card, styles.cardLight, { width: CARD_WIDTH }]}>
            <ThemedText style={styles.cardEyebrowDark}>SEUS DESTINOS</ThemedText>
            <View style={styles.destList}>
              {trips.map((trip) => (
                <View key={trip.id} style={styles.destItem}>
                  <View style={styles.destDot} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.destCity}>{trip.destination || trip.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {trip.startDate} a {trip.endDate} · {trip.agency?.name || "Agência"}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
            {agencies.length > 1 ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.destFooter}>
                {agencies.length} agências diferentes — {agencies.join(", ")}
              </ThemedText>
            ) : null}
          </View>

          {/* Card 3: best moment */}
          {bestMoment ? (
            <View style={[styles.card, { width: CARD_WIDTH }]}>
              {bestMoment.entry.photoUrl ? (
                <Image source={{ uri: bestMoment.entry.photoUrl }} style={styles.cardBg} contentFit="cover" />
              ) : (
                <View style={[styles.cardBg, styles.cardBgFallback]} />
              )}
              <View style={styles.cardScrim} />
              <View style={styles.cardContent}>
                <ThemedText style={styles.cardEyebrow}>SEU MELHOR MOMENTO</ThemedText>
                <ThemedText style={styles.quoteText}>“{bestMoment.entry.body}”</ThemedText>
                <ThemedText style={styles.quoteAttr}>{bestMoment.tripTitle}</ThemedText>
              </View>
            </View>
          ) : null}

          {/* Card 4: shareable summary */}
          <View style={[styles.card, { width: CARD_WIDTH }]}>
            {coverPhoto ? (
              <Image source={{ uri: coverPhoto }} style={styles.cardBg} contentFit="cover" />
            ) : (
              <View style={[styles.cardBg, styles.cardBgFallback]} />
            )}
            <View style={styles.cardScrim} />
            <View style={styles.cardContent}>
              <ThemedText style={styles.cardEyebrow}>RETROSPECTIVA</ThemedText>
              <ThemedText style={styles.shareName}>{user?.fullName || "Viajante"}</ThemedText>
              <View style={styles.shareStatsRow}>
                <View style={styles.shareStat}>
                  <ThemedText style={styles.shareStatNum}>{trips.length}</ThemedText>
                  <ThemedText style={styles.shareStatLabel}>viagens</ThemedText>
                </View>
                <View style={styles.shareStat}>
                  <ThemedText style={styles.shareStatNum}>{totalDays}</ThemedText>
                  <ThemedText style={styles.shareStatLabel}>dias</ThemedText>
                </View>
                <View style={styles.shareStat}>
                  <ThemedText style={styles.shareStatNum}>{destinations.length}</ThemedText>
                  <ThemedText style={styles.shareStatLabel}>destinos</ThemedText>
                </View>
              </View>
              <ThemedText style={styles.shareWordmark}>Rumo</ThemedText>
            </View>
          </View>
        </View>

        <Pressable onPress={handleShare} style={styles.shareButton}>
          <ThemedText style={styles.shareButtonText}>Compartilhar</ThemedText>
        </Pressable>
        <ThemedText type="small" themeColor="textSecondary" style={styles.shareCaption}>
          Compartilha fora do Rumo (Instagram, WhatsApp) — nada é publicado dentro do app.
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1, width: "100%", maxWidth: MaxContentWidth, alignSelf: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.two, padding: Spacing.four },
  emptyTitle: { fontSize: 17, fontWeight: "800", textAlign: "center" },
  emptyText: { textAlign: "center" },
  backButtonAlt: { marginTop: Spacing.two },
  backButtonAltText: { color: Brand.navy, fontWeight: "800" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EDF1F5",
  },
  backButtonText: { color: Brand.navy, fontSize: 16, fontWeight: "900" },
  topBarTitle: { fontSize: 15, fontWeight: "800", color: Brand.navyDeep },
  cardStage: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.two, paddingHorizontal: Spacing.four },
  card: {
    height: 420,
    borderRadius: 26,
    overflow: "hidden",
    position: "relative",
    backgroundColor: Brand.navyDeep,
  },
  cardLight: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5EAF0", padding: Spacing.four },
  cardBg: { position: "absolute", width: "100%", height: "100%" },
  cardBgFallback: { backgroundColor: Brand.navyDeep },
  cardScrim: { position: "absolute", left: 0, right: 0, bottom: 0, top: "30%", backgroundColor: "rgba(6,20,50,0.72)" },
  cardContent: { flex: 1, padding: Spacing.four, justifyContent: "flex-end" },
  cardEyebrow: { color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginBottom: 10 },
  cardEyebrowDark: { color: Brand.coral, fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginBottom: 16 },
  openHeadline: { color: "#fff", fontSize: 32, fontWeight: "900", lineHeight: 38, letterSpacing: -0.6 },
  destList: { gap: Spacing.three },
  destItem: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  destDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Brand.coral, marginTop: 6 },
  destCity: { fontSize: 16, fontWeight: "800", color: Brand.navyDeep, marginBottom: 2 },
  destFooter: { marginTop: Spacing.three, paddingTop: Spacing.three, borderTopWidth: 1, borderTopColor: "#E5EAF0" },
  quoteText: { color: "#fff", fontSize: 19, fontWeight: "700", lineHeight: 26, fontStyle: "italic", marginBottom: 10 },
  quoteAttr: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "700" },
  shareName: { color: "#fff", fontSize: 20, fontWeight: "900", marginBottom: 16 },
  shareStatsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  shareStat: { alignItems: "flex-start" },
  shareStatNum: { color: "#fff", fontSize: 26, fontWeight: "900" },
  shareStatLabel: { color: "rgba(255,255,255,0.7)", fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 4 },
  shareWordmark: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "900", alignSelf: "flex-end" },
  shareButton: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Brand.coral,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: Spacing.three,
  },
  shareButtonText: { color: Brand.coral, fontWeight: "800", fontSize: 13 },
  shareCaption: { textAlign: "center", marginTop: Spacing.two, marginHorizontal: Spacing.five, paddingBottom: Spacing.three },
});
