import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Brand, MaxContentWidth, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { searchTravelers, TravelerSearchResult } from "@/lib/traveler-api";

export default function SearchScreen() {
  const router = useRouter();
  const { sessionId } = useAuth();
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TravelerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = async (value: string) => {
    setQuery(value);
    if (!sessionId || value.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      setResults(await searchTravelers(sessionId, value.trim()));
      setSearched(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backButtonText}>←</ThemedText>
          </Pressable>
          <ThemedText style={styles.topBarTitle}>Buscar viajantes</ThemedText>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.searchBoxWrap}>
          <TextInput
            value={query}
            onChangeText={runSearch}
            placeholder="Buscar por nome ou @handle"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            style={[styles.searchInput, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
          />
        </View>

        <ScrollView contentContainerStyle={styles.results} showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator color={Brand.coral} style={{ marginTop: Spacing.four }} />
          ) : searched && results.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              Nenhum viajante encontrado com viagens públicas para esse termo.
            </ThemedText>
          ) : (
            results.map((result) => (
              <Pressable
                key={result.handle}
                onPress={() => router.push({ pathname: "/public-profile", params: { handle: result.handle } })}
                style={[styles.row, { borderBottomColor: theme.backgroundSelected }]}
              >
                <View style={styles.rowAvatar}>
                  <ThemedText style={styles.rowAvatarText}>
                    {result.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                  </ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.rowName}>{result.fullName}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">@{result.handle}</ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {result.publicTripCount} {result.publicTripCount === 1 ? "viagem pública" : "viagens públicas"}
                </ThemedText>
              </Pressable>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1, width: "100%", maxWidth: MaxContentWidth, alignSelf: "center" },
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
  searchBoxWrap: { paddingHorizontal: Spacing.four, marginBottom: Spacing.two },
  searchInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  results: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.five },
  emptyText: { textAlign: "center", marginTop: Spacing.five, lineHeight: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  rowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.navyDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  rowAvatarText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  rowName: { fontSize: 14, fontWeight: "800" },
});
