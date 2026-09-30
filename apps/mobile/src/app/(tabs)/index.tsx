import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, Brand, MaxContentWidth, resolveAppTheme, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useBroadcastAgencyTheme } from "@/hooks/use-shared-agency-theme";
import {
  getInvitePreview,
  getTravelerTrips,
  importTravelerTrip,
  MobileItinerary,
} from "@/lib/traveler-api";

function TripCard({
  item,
  theme,
  onPress,
}: {
  item: MobileItinerary;
  theme: ReturnType<typeof useTheme>;
  onPress: () => void;
}) {
  const [coverFailed, setCoverFailed] = useState(false);
  const isPublished =
    item.status === "Confirmado" ||
    item.status === "Publicado" ||
    item.status === "confirmed" ||
    item.status === "active";
  const showCover = Boolean(item.coverImage) && !coverFailed;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { shadowOpacity: pressed ? 0.08 : 0.12 }]}>
      <View style={[styles.cardInner, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
        <View style={styles.coverWrap}>
          {showCover ? (
            <Image
              source={{ uri: item.coverImage }}
              style={styles.coverImage}
              contentFit="cover"
              transition={300}
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <View style={styles.coverFallback}>
              <ThemedText style={styles.coverFallbackIcon}>🧭</ThemedText>
            </View>
          )}
          <View style={styles.coverScrimSoft} />
          <View style={styles.coverScrimStrong} />

          {item.agency?.logoUrl ? (
            <Image source={{ uri: item.agency.logoUrl }} style={styles.agencyBadgeLogo} contentFit="cover" />
          ) : (
            <View style={styles.agencyBadge}>
              <ThemedText style={styles.agencyBadgeText}>
                {(item.agency?.name || "AG").slice(0, 2).toUpperCase()}
              </ThemedText>
            </View>
          )}

          <View style={[styles.statusBadge, { backgroundColor: isPublished ? "#E1F5EE" : "#FBEAF0" }]}>
            <ThemedText style={[styles.statusBadgeText, { color: isPublished ? "#0F6E56" : "#703800" }]}>
              {item.status.toUpperCase()}
            </ThemedText>
          </View>

          <View style={styles.coverTextBlock}>
            <ThemedText style={styles.coverTitle} numberOfLines={1}>{item.title}</ThemedText>
            <ThemedText style={styles.coverSubtitle} numberOfLines={1}>
              {item.agency?.name || "Agência"} · {item.destination || "Destino a confirmar"}
            </ThemedText>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <ThemedText style={styles.metaIcon}>📅</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.startDate} a {item.endDate}
              </ThemedText>
            </View>
            <View style={styles.metaItem}>
              <ThemedText style={styles.metaIcon}>🗺️</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.itinerary.length} blocos na trilha
              </ThemedText>
            </View>
          </View>
          <View style={styles.cardFooterCta}>
            <ThemedText style={styles.buttonText}>Explorar</ThemedText>
            <ThemedText style={styles.buttonArrow}>→</ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function MemoryCard({
  item,
  theme,
  onPress,
}: {
  item: MobileItinerary;
  theme: ReturnType<typeof useTheme>;
  onPress: () => void;
}) {
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = Boolean(item.coverImage) && !coverFailed;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.memoryCard,
        { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      {showCover ? (
        <Image
          source={{ uri: item.coverImage }}
          style={styles.memoryPhoto}
          contentFit="cover"
          onError={() => setCoverFailed(true)}
        />
      ) : (
        <View style={[styles.memoryPhoto, styles.memoryPhotoFallback]}>
          <ThemedText style={styles.memoryPhotoFallbackIcon}>🧭</ThemedText>
        </View>
      )}
      <View style={styles.memoryBody}>
        <ThemedText style={styles.memoryTitle} numberOfLines={1}>{item.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.memoryMeta} numberOfLines={1}>
          {item.destination || "Destino"} · {item.startDate} a {item.endDate}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {item.agency?.name || "Agência"}
        </ThemedText>
      </View>
      <ThemedText style={styles.memoryChevron}>›</ThemedText>
    </Pressable>
  );
}

function isTripUpcoming(item: MobileItinerary) {
  if (!item.endDate) return true;
  const end = new Date(item.endDate);
  if (Number.isNaN(end.getTime())) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end >= today;
}

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

  const fetchTrips = React.useCallback(async () => {
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
  }, [sessionId]);

  useEffect(() => {
    const task = setTimeout(() => void fetchTrips(), 0);
    return () => clearTimeout(task);
  }, [fetchTrips]);

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

  // The primary agency's chosen theme drives the welcome block's accent — same
  // "trips[0]'s agency" precedent already used for the header logo/name above.
  const agencyTheme = useMemo(() => resolveAppTheme(trips[0]?.agency?.themeId), [trips]);
  useBroadcastAgencyTheme(agencyTheme);

  const { upcoming, past } = useMemo(() => {
    const nextUpcoming: MobileItinerary[] = [];
    const nextPast: MobileItinerary[] = [];
    for (const trip of trips) {
      (isTripUpcoming(trip) ? nextUpcoming : nextPast).push(trip);
    }
    return { upcoming: nextUpcoming, past: nextPast };
  }, [trips]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <ThemedView style={[styles.headerContainer, { borderColor: theme.backgroundSelected }]}>
          <ThemedView style={styles.agencyInfo}>
            {trips[0]?.agency?.logoUrl ? (
              <Image source={{ uri: trips[0].agency.logoUrl }} style={styles.brandLogo} contentFit="contain" />
            ) : (
              <View style={styles.brandMark}><ThemedText style={styles.brandLetter}>R</ThemedText></View>
            )}
            <View>
              <ThemedText style={styles.brandName} numberOfLines={1}>{trips[0]?.agency?.name || "Rumo"}</ThemedText>
              <ThemedText style={styles.headerEyebrow}>{trips[0]?.agency ? "SUA AGÊNCIA" : "ESPAÇO DO VIAJANTE"}</ThemedText>
            </View>
          </ThemedView>
          <Pressable onPress={() => setImportOpen(true)} style={[styles.headerAction, { backgroundColor: agencyTheme.coral }]}>
            <ThemedText style={styles.headerActionText}>＋ Viagem</ThemedText>
          </Pressable>
          <Pressable onPress={() => router.push("/profile")} style={[styles.headerAction, styles.logoutAction]}>
            <ThemedText style={styles.logoutActionText}>👤</ThemedText>
          </Pressable>
          <Pressable onPress={signOut} style={[styles.headerAction, styles.logoutAction]}>
            <ThemedText style={styles.logoutActionText}>↗</ThemedText>
          </Pressable>
        </ThemedView>

        <View style={[styles.welcomeBlock, { backgroundColor: agencyTheme.navyDeep }]}>
          <View style={[styles.welcomeGlow, { backgroundColor: agencyTheme.glow }]} />
          <ThemedText style={[styles.welcomeLabel, { color: agencyTheme.glow }]}>
            OLÁ, {(user?.fullName?.split(" ")[0] || "VIAJANTE").toUpperCase()}
          </ThemedText>
          <ThemedText style={styles.welcomeTitle}>Sua jornada, sempre à mão.</ThemedText>
          <ThemedText style={styles.welcomeText}>Roteiro, documentos e suporte da sua agência em um só lugar.</ThemedText>
        </View>

        {loading ? (
          <ThemedView style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Brand.coral} />
            <ThemedText style={styles.loadingText}>Carregando suas viagens...</ThemedText>
          </ThemedView>
        ) : trips.length === 0 ? (
          <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {error ? (
              <ThemedView style={styles.errorBanner}>
                <ThemedText style={styles.errorBannerText}>{error}</ThemedText>
              </ThemedView>
            ) : null}
            <ThemedView style={styles.emptyContainer}>
              <View style={styles.emptyIcon}><ThemedText style={styles.emptyIconText}>⌁</ThemedText></View>
              <ThemedText style={styles.emptyTitle}>Adicione sua primeira viagem</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                Cole o convite que seu consultor enviou. A identidade da agência e todo o roteiro serão carregados automaticamente.
              </ThemedText>
              <Pressable onPress={() => setImportOpen(true)} style={styles.emptyButton}>
                <ThemedText style={styles.emptyButtonText}>Usar convite da agência</ThemedText>
              </Pressable>
              <View style={styles.emptySteps}>
                <ThemedText style={styles.emptyStep}>1  Cole o link</ThemedText>
                <View style={styles.stepDivider} />
                <ThemedText style={styles.emptyStep}>2  Confira a viagem</ThemedText>
                <View style={styles.stepDivider} />
                <ThemedText style={styles.emptyStep}>3  Viaje tranquilo</ThemedText>
              </View>
            </ThemedView>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {error ? (
              <ThemedView style={styles.errorBanner}>
                <ThemedText style={styles.errorBannerText}>{error}</ThemedText>
              </ThemedView>
            ) : null}

            <View style={styles.sectionHeading}>
              <ThemedText style={styles.sectionTitle} type="title">Próximas</ThemedText>
              <ThemedText style={styles.tripCount}>{upcoming.length} {upcoming.length === 1 ? "roteiro" : "roteiros"}</ThemedText>
            </View>
            {upcoming.length === 0 ? (
              <ThemedView style={styles.noUpcomingCard}>
                <ThemedText themeColor="textSecondary" style={styles.noUpcomingText}>
                  Nenhuma viagem agendada no momento.
                </ThemedText>
              </ThemedView>
            ) : (
              <View style={{ gap: Spacing.three }}>
                {upcoming.map((trip) => (
                  <TripCard
                    key={trip.id}
                    item={trip}
                    theme={theme}
                    onPress={() => router.push({ pathname: "/explore", params: { tripId: trip.id } })}
                  />
                ))}
              </View>
            )}

            {past.length > 0 ? (
              <>
                <View style={[styles.sectionHeading, { marginTop: Spacing.five }]}>
                  <ThemedText style={styles.sectionTitle} type="title">Memórias</ThemedText>
                  <ThemedText style={styles.tripCount}>{past.length} {past.length === 1 ? "viagem" : "viagens"}</ThemedText>
                </View>
                <View style={{ gap: Spacing.two }}>
                  {past.map((trip) => (
                    <MemoryCard
                      key={trip.id}
                      item={trip}
                      theme={theme}
                      onPress={() => router.push({ pathname: "/trip-memory", params: { tripId: trip.id } })}
                    />
                  ))}
                </View>
                <Pressable onPress={() => router.push("/retrospective")} style={styles.retrospectiveLink}>
                  <ThemedText style={styles.retrospectiveLinkText}>Ver sua retrospectiva →</ThemedText>
                </Pressable>
              </>
            ) : null}
          </ScrollView>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0,
    gap: Spacing.two,
  },
  agencyInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandMark: { width: 38, height: 38, borderRadius: 13, backgroundColor: Brand.navyDeep, alignItems: "center", justifyContent: "center" },
  brandLogo: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#fff" },
  brandLetter: { color: "#fff", fontSize: 17, fontWeight: "900" },
  brandName: { color: Brand.navyDeep, fontSize: 15, lineHeight: 17, fontWeight: "900" },
  headerEyebrow: { fontSize: 8, lineHeight: 11, fontWeight: "800", letterSpacing: 1.2, color: "#7A8595" },
  headerAction: {
    backgroundColor: Brand.coral,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  headerActionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  logoutAction: {
    backgroundColor: "#EDF1F5",
    width: 36,
    paddingHorizontal: 0,
    alignItems: "center",
  },
  logoutActionText: {
    color: Brand.navy,
    fontSize: 12,
    fontWeight: "700",
  },
  welcomeBlock: { marginHorizontal: 20, marginTop: 10, padding: 20, borderRadius: 22, backgroundColor: Brand.navyDeep, overflow: "hidden", position: "relative" },
  welcomeGlow: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "#8FB1FF", opacity: 0.22, top: -60, right: -50 },
  welcomeLabel: { color: "#8FB1FF", fontSize: 9, lineHeight: 12, fontWeight: "900", letterSpacing: 1.4 },
  welcomeTitle: { marginTop: 8, color: "#fff", fontSize: 26, lineHeight: 31, fontWeight: "900", letterSpacing: -0.8 },
  welcomeText: { marginTop: 7, color: "#C8D5EB", fontSize: 13, lineHeight: 19, maxWidth: 370 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.four, marginTop: Spacing.four, marginBottom: Spacing.two },
  sectionTitle: { fontSize: 24, lineHeight: 30, fontWeight: "900", color: Brand.navy, letterSpacing: -0.6 },
  tripCount: { fontSize: 10, fontWeight: "800", color: "#667176", letterSpacing: .7, textTransform: "uppercase" },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  card: {
    borderRadius: 22,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  cardInner: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },
  coverWrap: {
    height: 180,
    position: "relative",
    backgroundColor: "#E9EDF4",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: Brand.navyDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  coverFallbackIcon: {
    fontSize: 40,
    opacity: 0.35,
  },
  coverScrimSoft: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(6,20,50,0.12)",
  },
  coverScrimStrong: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "58%",
    backgroundColor: "rgba(6,20,50,0.68)",
  },
  agencyBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  agencyBadgeLogo: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#fff",
  },
  agencyBadgeText: {
    color: Brand.navyDeep,
    fontSize: 12,
    fontWeight: "800",
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  coverTextBlock: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 14,
  },
  coverTitle: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.4,
    marginBottom: 3,
  },
  coverSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "600",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 17,
    paddingVertical: 14,
  },
  metaRow: {
    flexDirection: "row",
    gap: Spacing.three,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  metaIcon: {
    fontSize: 13,
  },
  cardFooterCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  buttonText: {
    color: Brand.navy,
    fontWeight: "800",
    fontSize: 13,
  },
  buttonArrow: { color: Brand.coral, fontSize: 18, fontWeight: "800" },
  noUpcomingCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E1E7EE",
    backgroundColor: "#FFFFFF",
    padding: Spacing.four,
    alignItems: "center",
  },
  noUpcomingText: { fontSize: 13, textAlign: "center" },
  memoryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  memoryPhoto: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#E9EDF4",
  },
  memoryPhotoFallback: {
    backgroundColor: Brand.navyDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  memoryPhotoFallbackIcon: { fontSize: 20, opacity: 0.5 },
  memoryBody: { flex: 1, gap: 2 },
  memoryTitle: { fontSize: 14, fontWeight: "800" },
  memoryMeta: { marginBottom: 1 },
  memoryChevron: { fontSize: 22, color: Brand.navy, fontWeight: "800" },
  retrospectiveLink: { alignSelf: "center", marginTop: Spacing.three },
  retrospectiveLinkText: { color: Brand.coral, fontWeight: "800", fontSize: 13 },
  emptyContainer: {
    marginTop: 8,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E1E7EE",
    backgroundColor: "#FFFFFF",
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  emptyIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: "#EEF3FF", alignItems: "center", justifyContent: "center", marginBottom: 2 },
  emptyIconText: { fontSize: 28, color: Brand.navyDeep, fontWeight: "900" },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  emptyText: {
    textAlign: "center",
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 6,
    backgroundColor: Brand.coral,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
  },
  emptyButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  emptySteps: { width: "100%", marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  emptyStep: { color: "#748094", fontSize: 9, lineHeight: 12, fontWeight: "700" },
  stepDivider: { width: 14, height: 1, marginHorizontal: 6, backgroundColor: "#D8DFE8" },
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
