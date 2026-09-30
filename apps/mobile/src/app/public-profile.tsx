import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Brand, MaxContentWidth, resolveAppTheme, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useBroadcastAgencyTheme } from "@/hooks/use-shared-agency-theme";
import { getPublicProfile, PublicProfile } from "@/lib/traveler-api";

export default function PublicProfileScreen() {
  const router = useRouter();
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { sessionId } = useAuth();
  const theme = useTheme();
  useBroadcastAgencyTheme(resolveAppTheme());
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const task = setTimeout(() => {
      if (!sessionId || !handle) {
        setLoading(false);
        return;
      }
      void getPublicProfile(sessionId, handle)
        .then(setProfile)
        .catch((err) => setError(err instanceof Error ? err.message : "Viajante não encontrado."))
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(task);
  }, [sessionId, handle]);

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backButtonText}>←</ThemedText>
          </Pressable>
          <ThemedText style={styles.topBarTitle}>Perfil</ThemedText>
          <View style={{ width: 36 }} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Brand.coral} />
          </View>
        ) : !profile ? (
          <View style={styles.center}>
            <ThemedText style={styles.emptyTitle}>{error || "Viajante não encontrado."}</ThemedText>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.identity}>
              <View style={styles.avatar}>
                <ThemedText style={styles.avatarText}>
                  {profile.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                </ThemedText>
              </View>
              <ThemedText style={styles.name}>{profile.fullName}</ThemedText>
              <ThemedText style={styles.handle}>@{profile.handle}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.tagline}>
                Perfil aberto apenas para consulta.
              </ThemedText>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <ThemedText style={styles.statNum}>{profile.stats.publicTrips}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.statLabel}>Viagens públicas</ThemedText>
              </View>
              <View style={styles.stat}>
                <ThemedText style={styles.statNum}>{profile.stats.destinations}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.statLabel}>Destinos</ThemedText>
              </View>
            </View>

            <ThemedText style={styles.sectionLabel}>VIAGENS PÚBLICAS</ThemedText>
            {profile.trips.length === 0 ? (
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                Este viajante ainda não compartilhou viagens.
              </ThemedText>
            ) : (
              <View style={styles.grid}>
                {profile.trips.map((trip) => (
                  <View key={trip.id} style={[styles.tripCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
                    {trip.coverImage ? (
                      <Image source={{ uri: trip.coverImage }} style={styles.tripPhoto} contentFit="cover" />
                    ) : (
                      <View style={[styles.tripPhoto, styles.tripPhotoFallback]} />
                    )}
                    <View style={styles.tripBody}>
                      <ThemedText style={styles.tripTitle} numberOfLines={1}>{trip.title}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>{trip.destination}</ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1, width: "100%", maxWidth: MaxContentWidth, alignSelf: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.four },
  emptyTitle: { fontSize: 15, fontWeight: "700", textAlign: "center" },
  emptyText: { textAlign: "center", marginTop: Spacing.two },
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
  tagline: { marginTop: 8, fontStyle: "italic" },
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
  sectionLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2, color: Brand.coral, marginBottom: Spacing.two },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  tripCard: { width: "48%", borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  tripPhoto: { width: "100%", height: 90, backgroundColor: "#E9EDF4" },
  tripPhotoFallback: { backgroundColor: Brand.navyDeep },
  tripBody: { padding: 8 },
  tripTitle: { fontSize: 12, fontWeight: "800" },
});
