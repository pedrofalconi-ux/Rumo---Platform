import React from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { getTravelerTrip, MobileItinerary } from "@/lib/traveler-api";

const SYMBOL_EMOJIS: Record<string, string> = {
  coffee: "☕",
  restaurant: "🍽️",
  local_bar: "🍸",
  flight: "✈️",
  hotel: "🏨",
  museum: "🏛️",
  explore: "🚶",
  directions_car: "🚗",
  directions_transit: "🚆",
  directions_boat: "🚢",
  beach_access: "🏖️",
  forest: "🌳",
  shopping_bag: "🛍️",
  local_activity: "🎟️",
  sell: "🏷️",
  description: "📄",
  attach_file: "📎",
  calendar_today: "📅",
  assignment: "📕",
  content_cut: "✂️",
  route: "🗺️",
  grid_on: "📊",
};

const TYPE_LABELS: Record<string, string> = {
  day_summary: "Resumo do Dia",
  trip_desc: "Descrição",
  documents: "Documentos",
  attachments: "Anexos",
  flight: "Voo",
  activity: "Atividade",
  hotel: "Acomodação",
  places: "Lugar",
  suggested_places: "Sugestão",
  transport: "Transporte",
  text: "Nota",
  cruise: "Cruzeiro",
  services: "Serviço",
  page_break: "Quebra de Página",
  price: "Preço",
};

export default function TripDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { sessionId } = useAuth();
  const [trip, setTrip] = React.useState<MobileItinerary | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchTrip() {
      if (!sessionId || !id) {
        setLoading(false);
        return;
      }

      try {
        setTrip(await getTravelerTrip(sessionId, id));
      } catch {
        setTrip(null);
      } finally {
        setLoading(false);
      }
    }

    fetchTrip();
  }, [id, sessionId]);

  if (loading) {
    return (
      <ThemedView style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#F26B3A" />
        <ThemedText style={styles.loadingText}>Carregando detalhes do roteiro...</ThemedText>
      </ThemedView>
    );
  }

  if (!trip) {
    return (
      <ThemedView style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ThemedText type="subtitle">Viagem não encontrada</ThemedText>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backButtonText}>← Voltar</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const getDays = () => {
    const daysSet = new Set<number>();
    daysSet.add(1);
    trip.content.forEach((item) => daysSet.add(item.day));
    return Array.from(daysSet).sort((a, b) => a - b);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <ThemedView style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <ThemedText style={styles.backLinkText}>← Voltar</ThemedText>
          </Pressable>
          {trip.agency?.logoUrl ? (
            <Image source={{ uri: trip.agency.logoUrl }} style={styles.headerAgencyLogo} contentFit="cover" />
          ) : (
            <View style={styles.headerAgencyFallback}>
              <ThemedText style={styles.headerAgencyFallbackText}>
                {(trip.agency?.name || "AG").slice(0, 2).toUpperCase()}
              </ThemedText>
            </View>
          )}
          <ThemedText style={styles.headerTitle} type="subtitle" numberOfLines={1}>
            {trip.title}
          </ThemedText>
        </ThemedView>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ThemedView style={[styles.tripMetaCard, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.metaTitle}>{trip.destination}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Agência responsável: {trip.agency?.name || "Agência"}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              📅 {trip.startDate} a {trip.endDate} | 👤 {trip.travelers} viajantes
            </ThemedText>
          </ThemedView>

          {trip.documents.length > 0 && (
            <ThemedView style={[styles.documentsCard, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={styles.documentsTitle}>Documentos de viagem</ThemedText>
              {trip.documents.map((doc) => (
                <Pressable
                  key={doc.id}
                  onPress={() => doc.url && Linking.openURL(doc.url)}
                  style={({ pressed }) => [
                    styles.documentRow,
                    {
                      borderColor: theme.backgroundSelected,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <ThemedText style={styles.documentIcon}>📄</ThemedText>
                  <View style={styles.documentInfo}>
                    <ThemedText numberOfLines={1} style={styles.documentName}>
                      {doc.name}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Toque para abrir
                    </ThemedText>
                  </View>
                </Pressable>
              ))}
            </ThemedView>
          )}

          <View style={styles.timelineContainer}>
            <View style={styles.dashedLine} />

            {getDays().map((dayNum) => {
              const dayItems = trip.content.filter((item) => item.day === dayNum);

              return (
                <View key={dayNum} style={styles.dayNode}>
                  <View style={styles.dayMarker}>
                    <ThemedText style={styles.dayMarkerText}>{dayNum}</ThemedText>
                  </View>

                  <ThemedText style={styles.dayTitle} type="subtitle">
                    Dia {dayNum}
                  </ThemedText>

                  <View style={styles.dayItemsContainer}>
                    {dayItems.map((item) => {
                      const symbol = item.customSymbol || item.type;
                      const emoji = SYMBOL_EMOJIS[symbol] || "📍";
                      const typeLabel = TYPE_LABELS[item.type] || "Item";

                      return (
                        <View key={item.id} style={styles.itemWrapper}>
                          <View style={[styles.itemBadge, { borderColor: "#183B4E" }]}>
                            <ThemedText style={styles.itemBadgeEmoji}>{emoji}</ThemedText>
                          </View>

                          <ThemedView
                            style={[
                              styles.card,
                              {
                                backgroundColor: theme.backgroundElement,
                                borderColor: theme.backgroundSelected,
                              },
                            ]}
                          >
                            {item.image && (
                              <Image source={{ uri: item.image }} style={styles.cardImage} contentFit="cover" />
                            )}

                            <View style={styles.cardContent}>
                              <ThemedView style={styles.cardTypeRow}>
                                <ThemedText style={styles.emojiText}>{emoji}</ThemedText>
                                <ThemedText style={styles.cardTypeText}>{typeLabel}</ThemedText>
                              </ThemedView>

                              <ThemedText style={styles.cardTitle}>{item.title}</ThemedText>

                              {item.subTitle && (
                                <ThemedText style={styles.cardSubTitle} themeColor="textSecondary">
                                  {item.subTitle}
                                </ThemedText>
                              )}

                              {item.details && (
                                <ThemedText style={styles.cardDetails} themeColor="textSecondary">
                                  {item.details}
                                </ThemedText>
                              )}

                              {item.type === "flight" && item.meta && (
                                <View style={styles.metadataBlock}>
                                  <ThemedText type="small" style={styles.metaRow}>
                                    🛫 Partida: {String(item.meta.origin || "")} ({String(item.meta.departureTime || "")})
                                  </ThemedText>
                                  <ThemedText type="small" style={styles.metaRow}>
                                    🛬 Chegada: {String(item.meta.destination || "")} ({String(item.meta.arrivalTime || "")})
                                  </ThemedText>
                                  {Boolean(item.meta.duration) && (
                                    <ThemedText type="small" style={styles.metaRow}>
                                      ⏱ Duração: {String(item.meta.duration)}
                                    </ThemedText>
                                  )}
                                </View>
                              )}

                              {item.type === "hotel" && item.meta && (
                                <View style={styles.metadataBlock}>
                                  {Boolean(item.meta.address) && (
                                    <ThemedText type="small" style={styles.metaRow}>
                                      📍 Endereço: {String(item.meta.address)}
                                    </ThemedText>
                                  )}
                                  {Boolean(item.meta.checkin) && (
                                    <ThemedText type="small" style={styles.metaRow}>
                                      🔑 Check-in: {String(item.meta.checkin)}
                                    </ThemedText>
                                  )}
                                </View>
                              )}
                            </View>
                          </ThemedView>
                        </View>
                      );
                    })}

                    {dayItems.length === 0 && (
                      <View style={styles.emptyDayWrapper}>
                        <View style={styles.bulletPoint} />
                        <ThemedText style={styles.emptyDayText} themeColor="textSecondary">
                          Nenhuma atividade para este dia.
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
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
    padding: Spacing.four,
  },
  loadingText: {
    marginTop: Spacing.two,
    fontSize: 14,
    fontWeight: "500",
  },
  backButton: {
    marginTop: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    backgroundColor: "#183B4E",
    borderRadius: 8,
  },
  backButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  backLink: {
    paddingVertical: Spacing.half,
  },
  backLinkText: {
    color: "#183B4E",
    fontWeight: "700",
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  headerAgencyLogo: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: "#eee",
  },
  headerAgencyFallback: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: "#D9E6F2",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAgencyFallbackText: {
    color: "#183B4E",
    fontWeight: "800",
    fontSize: 10,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  tripMetaCard: {
    padding: Spacing.three,
    borderRadius: 12,
    marginBottom: Spacing.four,
  },
  metaTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#183B4E",
    marginBottom: Spacing.half,
  },
  documentsCard: {
    padding: Spacing.three,
    borderRadius: 12,
    marginBottom: Spacing.four,
    gap: Spacing.two,
  },
  documentsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#183B4E",
  },
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.two,
  },
  documentIcon: {
    fontSize: 20,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 13,
    fontWeight: "700",
  },
  timelineContainer: {
    position: "relative",
    paddingLeft: Spacing.four,
  },
  dashedLine: {
    position: "absolute",
    left: 24,
    top: 16,
    bottom: 16,
    width: 2,
    borderLeftWidth: 2,
    borderColor: "#c2c6d2",
    borderStyle: "dashed",
  },
  dayNode: {
    marginBottom: Spacing.four,
    position: "relative",
  },
  dayMarker: {
    position: "absolute",
    left: 8,
    top: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F26B3A",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  dayMarkerText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 56,
    height: 32,
    lineHeight: 32,
  },
  dayItemsContainer: {
    marginTop: Spacing.three,
    gap: Spacing.three,
  },
  itemWrapper: {
    position: "relative",
  },
  itemBadge: {
    position: "absolute",
    left: 8,
    top: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemBadgeEmoji: {
    fontSize: 14,
  },
  card: {
    marginLeft: 56,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#eee",
  },
  cardContent: {
    padding: Spacing.three,
  },
  cardTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    marginBottom: Spacing.half,
  },
  emojiText: {
    fontSize: 12,
  },
  cardTypeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    color: "#183B4E",
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: Spacing.half,
  },
  cardSubTitle: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: Spacing.one,
  },
  cardDetails: {
    fontSize: 12,
    lineHeight: 16,
  },
  metadataBlock: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    gap: Spacing.half,
  },
  metaRow: {
    fontSize: 11,
    fontWeight: "500",
  },
  emptyDayWrapper: {
    position: "relative",
    height: 32,
    justifyContent: "center",
  },
  bulletPoint: {
    position: "absolute",
    left: 20,
    top: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#cbd5e1",
    zIndex: 10,
  },
  emptyDayText: {
    marginLeft: 56,
    fontSize: 12,
    fontStyle: "italic",
  },
});
