import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Brand, MaxContentWidth, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { getOwnProfile, OwnProfile, setTripVisibility } from "@/lib/traveler-api";

export default function ProfileScreen() {
  const router = useRouter();
  const { sessionId } = useAuth();
  const theme = useTheme();
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setProfile(await getOwnProfile(sessionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar seu perfil.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);

  const toggleVisibility = async (tripId: string, current: boolean) => {
    if (!sessionId) return;
    setTogglingId(tripId);
    try {
      await setTripVisibility(sessionId, tripId, !current);
      setProfile((prev) =>
        prev
          ? { ...prev, trips: prev.trips.map((t) => (t.id === tripId ? { ...t, isPublic: !current } : t)) }
          : prev
      );
    } catch {
      setError("Não foi possível atualizar a visibilidade dessa viagem.");
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <ThemedView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={Brand.coral} />
      </ThemedView>
    );
  }

  if (!profile) {
    return (
      <ThemedView style={[styles.center, { backgroundColor: theme.background }]}>
        <ThemedText style={styles.emptyTitle}>{error || "Não foi possível carregar seu perfil."}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backButtonText}>←</ThemedText>
          </Pressable>
          <ThemedText style={styles.topBarTitle}>Meu perfil</ThemedText>
          <Pressable onPress={() => router.push("/search")} style={styles.searchButton}>
            <ThemedText style={styles.searchButtonText}>🔍</ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.identity}>
            <View style={styles.avatar}>
              <ThemedText style={styles.avatarText}>
                {profile.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
              </ThemedText>
            </View>
            <ThemedText style={styles.name}>{profile.fullName}</ThemedText>
            <ThemedText style={styles.handle}>@{profile.handle}</ThemedText>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <ThemedText style={styles.statNum}>{profile.stats.completedTrips}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.statLabel}>Viagens concluídas</ThemedText>
            </View>
            <View style={styles.stat}>
              <ThemedText style={styles.statNum}>{profile.stats.destinations}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.statLabel}>Destinos</ThemedText>
            </View>
          </View>

          {error ? (
            <ThemedView style={styles.errorBanner}>
              <ThemedText style={styles.errorBannerText}>{error}</ThemedText>
            </ThemedView>
          ) : null}

          <ThemedText style={styles.sectionLabel}>MINHAS VIAGENS</ThemedText>
          <View style={styles.grid}>
            {profile.trips.map((trip) => (
              <View key={trip.id} style={[styles.tripCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
                {trip.coverImage ? (
                  <Image source={{ uri: trip.coverImage }} style={styles.tripPhoto} contentFit="cover" />
                ) : (
                  <View style={[styles.tripPhoto, styles.tripPhotoFallback]} />
                )}
                <Pressable
                  onPress={() => toggleVisibility(trip.id, trip.isPublic)}
                  disabled={togglingId === trip.id}
                  style={styles.visibilityBadge}
                  hitSlop={6}
                >
                  {togglingId === trip.id ? (
                    <ActivityIndicator size="small" color={Brand.navyDeep} />
                  ) : (
                    <ThemedText style={styles.visibilityIcon}>{trip.isPublic ? "🌐" : "🔒"}</ThemedText>
                  )}
                </Pressable>
                <View style={styles.tripBody}>
                  <ThemedText style={styles.tripTitle} numberOfLines={1}>{trip.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>{trip.destination}</ThemedText>
                </View>
              </View>
            ))}
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.caption}>
            Só as viagens marcadas como públicas (🌐) aparecem no seu perfil para outras pessoas. Toque no ícone para alternar.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1, width: "100%", maxWidth: MaxContentWidth, alignSelf: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.four },
  emptyTitle: { fontSize: 15, fontWeight: "700", textAlign: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  backButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#EDF1F5" },
  backButtonText: { color: Brand.navy, fontSize: 16, fontWeight: "900" },
  topBarTitle: { fontSize: 15, fontWeight: "800", color: Brand.navyDeep },
  searchButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#EDF1F5" },
  searchButtonText: { fontSize: 14 },
  content: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.five },
  identity: { alignItems: "center", marginTop: Spacing.two, marginBottom: Spacing.four },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Brand.navyDeep,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.two,
  },
  avatarText: { color: "#fff", fontSize: 24, fontWeight: "900" },
  name: { fontSize: 19, fontWeight: "900", color: Brand.navyDeep },
  handle: { fontSize: 13, color: "#8A93A6", marginTop: 2 },
  statsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5EAF0",
    paddingVertical: Spacing.three,
    marginBottom: Spacing.four,
  },
  stat: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "900", color: Brand.navyDeep },
  statLabel: { marginTop: 2 },
  errorBanner: { backgroundColor: "#FFF0ED", borderRadius: 12, padding: 12, marginBottom: Spacing.three },
  errorBannerText: { color: "#9D321F", fontSize: 12, fontWeight: "700" },
  sectionLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2, color: Brand.coral, marginBottom: Spacing.two },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  tripCard: { width: "48%", borderRadius: 16, borderWidth: 1, overflow: "hidden", position: "relative" },
  tripPhoto: { width: "100%", height: 90, backgroundColor: "#E9EDF4" },
  tripPhotoFallback: { backgroundColor: Brand.navyDeep },
  visibilityBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  visibilityIcon: { fontSize: 13 },
  tripBody: { padding: 8 },
  tripTitle: { fontSize: 12, fontWeight: "800" },
  caption: { marginTop: Spacing.three, lineHeight: 18 },
});
