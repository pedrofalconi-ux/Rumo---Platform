import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, Brand, MaxContentWidth, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import {
  getInvitePreview,
  getTravelerTrips,
  importTravelerTrip,
  MobileItinerary,
} from "@/lib/traveler-api";

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { sessionId, user, signOut } = useAuth();
  const [trips, setTrips] = useState<MobileItinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [inviteToken, setInviteToken] = useState("");
  const [inviteHint, setInviteHint] = useState<string | null>(null);

  const fetchTrips = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);

    try {
      setTrips(await getTravelerTrips(sessionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar suas viagens.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [sessionId]);

  const handlePreviewInvite = async (value: string) => {
    setInviteToken(value);
    setInviteHint(null);

    const normalized = value.trim();
    if (normalized.length < 6) return;

    try {
      const preview = await getInvitePreview(normalized);
      setInviteHint(`${preview.agency.name} · ${preview.trip.title}`);
    } catch {
      setInviteHint("Convite nao localizado ainda.");
    }
  };

  const handleImport = async () => {
    if (!sessionId || !inviteToken.trim()) return;

    setImporting(true);
    setError(null);
    try {
      await importTravelerTrip(sessionId, inviteToken.trim());
      setInviteToken("");
      setInviteHint(null);
      setImportOpen(false);
      await fetchTrips();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao importar viagem.");
    } finally {
      setImporting(false);
    }
  };

  const renderTripCard = ({ item }: { item: MobileItinerary }) => {
    const isPublished =
      item.status === "Confirmado" ||
      item.status === "Publicado" ||
      item.status === "confirmed" ||
      item.status === "active";

    return (
      <Pressable
        onPress={() => {
          router.push({
            pathname: "/trip/[id]",
            params: { id: item.id },
          });
        }}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: pressed ? Brand.coral : theme.backgroundSelected,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <ThemedView style={styles.cardHeader}>
          {item.agency?.logoUrl ? (
            <Image
              source={{ uri: item.agency.logoUrl }}
              style={styles.tripAgencyLogo}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View style={styles.tripAgencyFallback}>
              <ThemedText style={styles.tripAgencyFallbackText}>
                {(item.agency?.name || "AG").slice(0, 2).toUpperCase()}
              </ThemedText>
            </View>
          )}
          <ThemedText style={styles.cardTitle} type="subtitle">
            {item.title}
          </ThemedText>
          <ThemedView
            style={[
              styles.badge,
              { backgroundColor: isPublished ? "#E1F5EE" : "#FBEAF0" },
            ]}
          >
            <ThemedText
              style={[
                styles.badgeText,
                { color: isPublished ? "#0F6E56" : "#703800" },
              ]}
            >
              {item.status.toUpperCase()}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedText style={styles.destinationText} themeColor="textSecondary">
          {item.agency?.name || "Agência"} | Destino: {item.destination || "A confirmar"}
        </ThemedText>

        <ThemedView style={styles.cardFooter}>
          <ThemedView style={styles.metaItem}>
            <ThemedText style={styles.metaIcon}>📅</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.startDate} a {item.endDate}
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.metaItem}>
            <ThemedText style={styles.metaIcon}>🗺️</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.itinerary.length} blocos na trilha
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.buttonPlaceholder}>
          <ThemedText style={styles.buttonText}>Explorar roteiro</ThemedText>
          <ThemedText style={styles.buttonArrow}>→</ThemedText>
        </ThemedView>
      </Pressable>
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <ThemedView style={[styles.headerContainer, { borderColor: theme.backgroundSelected }]}>
          <ThemedView style={styles.agencyInfo}>
            <ThemedText style={styles.headerEyebrow}>RUMO DO VIAJANTE</ThemedText>
            <ThemedText style={styles.agencyName} type="subtitle">Olá, {user?.fullName?.split(" ")[0] || "viajante"}.</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Sua próxima história começa aqui.
            </ThemedText>
          </ThemedView>
          <Pressable onPress={() => setImportOpen(true)} style={styles.headerAction}>
            <ThemedText style={styles.headerActionText}>+ Convite</ThemedText>
          </Pressable>
          <Pressable onPress={signOut} style={[styles.headerAction, styles.logoutAction]}>
            <ThemedText style={styles.logoutActionText}>Sair</ThemedText>
          </Pressable>
        </ThemedView>

        <View style={styles.sectionHeading}>
          <ThemedText style={styles.sectionTitle} type="title">Suas viagens</ThemedText>
          <ThemedText style={styles.tripCount}>{trips.length} {trips.length === 1 ? "roteiro" : "roteiros"}</ThemedText>
        </View>

        {loading ? (
          <ThemedView style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Brand.coral} />
            <ThemedText style={styles.loadingText}>Carregando suas viagens...</ThemedText>
          </ThemedView>
        ) : (
          <FlatList
            data={trips}
            keyExtractor={(item) => item.id}
            renderItem={renderTripCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <ThemedView style={styles.emptyContainer}>
                <ThemedText style={styles.emptyTitle}>Nenhuma viagem importada</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                  Use o convite enviado pela agência para liberar sua primeira trilha no app.
                </ThemedText>
                <Pressable onPress={() => setImportOpen(true)} style={styles.emptyButton}>
                  <ThemedText style={styles.emptyButtonText}>Importar convite</ThemedText>
                </Pressable>
              </ThemedView>
            }
            ListHeaderComponent={
              error ? (
                <ThemedView style={styles.errorBanner}>
                  <ThemedText style={styles.errorBannerText}>{error}</ThemedText>
                </ThemedView>
              ) : null
            }
          />
        )}
      </SafeAreaView>

      <Modal visible={importOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.modalSheet, { backgroundColor: theme.background }]}>
            <ThemedText style={styles.modalTitle}>Importar viagem</ThemedText>
            <ThemedText style={styles.modalSubtitle} themeColor="textSecondary">
              Cole o link ou código do convite enviado pela sua agência.
            </ThemedText>

            <TextInput
              value={inviteToken}
              onChangeText={handlePreviewInvite}
              placeholder="https://.../mobile/invite/abc123"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundElement,
                  color: theme.text,
                  borderColor: theme.backgroundSelected,
                },
              ]}
              autoCapitalize="none"
            />

            {inviteHint ? (
              <ThemedView style={styles.inviteHintBox}>
                <ThemedText style={styles.inviteHintText}>{inviteHint}</ThemedText>
              </ThemedView>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable onPress={() => setImportOpen(false)} style={styles.cancelButton}>
                <ThemedText>Cancelar</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleImport}
                disabled={importing || !inviteToken.trim()}
                style={({ pressed }) => [
                  styles.confirmButton,
                  {
                    opacity: importing || !inviteToken.trim() ? 0.7 : pressed ? 0.9 : 1,
                  },
                ]}
              >
                {importing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.confirmButtonText}>Importar</ThemedText>
                )}
              </Pressable>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    width: "100%",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.two,
  },
  loadingText: {
    marginTop: Spacing.two,
    fontSize: 14,
    fontWeight: "500",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    paddingVertical: 20,
    borderBottomWidth: 0,
    gap: Spacing.two,
  },
  agencyInfo: {
    flex: 1,
  },
  agencyName: {
    fontSize: 24,
    fontWeight: "900",
    color: Brand.navy,
    letterSpacing: -0.6,
  },
  headerEyebrow: { fontSize: 9, fontWeight: "800", letterSpacing: 1.6, color: Brand.coral, marginBottom: 3 },
  headerAction: {
    backgroundColor: Brand.coral,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerActionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  logoutAction: {
    backgroundColor: "#E8EFED",
  },
  logoutActionText: {
    color: Brand.navy,
    fontSize: 12,
    fontWeight: "700",
  },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.four, marginTop: Spacing.four, marginBottom: Spacing.two },
  sectionTitle: { fontSize: 24, lineHeight: 30, fontWeight: "900", color: Brand.navy, letterSpacing: -0.6 },
  tripCount: { fontSize: 10, fontWeight: "800", color: "#667176", letterSpacing: .7, textTransform: "uppercase" },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.one,
  },
  tripAgencyLogo: {
    width: 34,
    height: 34,
    borderRadius: 7,
    backgroundColor: "#eee",
    marginRight: Spacing.two,
  },
  tripAgencyFallback: {
    width: 34,
    height: 34,
    borderRadius: 7,
    backgroundColor: "#D9E6F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.two,
  },
  tripAgencyFallbackText: {
    color: "#183B4E",
    fontSize: 12,
    fontWeight: "800",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    marginRight: Spacing.two,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  destinationText: {
    fontSize: 13,
    marginBottom: Spacing.three,
  },
  cardFooter: {
    gap: Spacing.two,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  metaIcon: {
    fontSize: 14,
  },
  buttonPlaceholder: {
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: "#E8EDF2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  buttonText: {
    color: Brand.navy,
    fontWeight: "800",
  },
  buttonArrow: { color: Brand.coral, fontSize: 20, fontWeight: "800" },
  emptyContainer: {
    marginTop: Spacing.six,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D6E0E8",
    padding: Spacing.five,
    alignItems: "center",
    gap: Spacing.two,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  emptyText: {
    textAlign: "center",
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: Spacing.one,
    backgroundColor: Brand.coral,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  errorBanner: {
    backgroundColor: "#FBEAF0",
    borderRadius: 12,
    padding: 12,
    marginBottom: Spacing.three,
  },
  errorBannerText: {
    color: "#8A1C4A",
    fontSize: 13,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
  },
  inviteHintBox: {
    backgroundColor: "#E9F6F2",
    borderRadius: 12,
    padding: 12,
  },
  inviteHintText: {
    color: "#0F6E56",
    fontSize: 13,
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: "#D6E0E8",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  confirmButton: {
    backgroundColor: Brand.coral,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    minWidth: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "800",
  },
});
