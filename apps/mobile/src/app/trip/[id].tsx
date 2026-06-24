import React from 'react';
import { StyleSheet, ScrollView, Pressable, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTravelerData } from '@/hooks/use-supabase';

const SYMBOL_EMOJIS: Record<string, string> = {
  coffee: '☕',
  restaurant: '🍽️',
  local_bar: '🍸',
  flight: '✈️',
  hotel: '🏨',
  museum: '🏛️',
  explore: '🚶',
  directions_car: '🚗',
  directions_transit: '🚆',
  directions_boat: '🚢',
  beach_access: '🏖️',
  forest: '🌳',
  shopping_bag: '🛍️',
  local_activity: '🎟️',
  sell: '🏷️',
  description: '📄',
  attach_file: '📎',
  calendar_today: '📅',
  assignment: '📕',
  content_cut: '✂️',
  route: '🗺️',
  grid_on: '📊',
};

const TYPE_LABELS: Record<string, string> = {
  day_summary: 'Resumo do Dia',
  trip_desc: 'Descrição',
  documents: 'Documentos',
  attachments: 'Anexos',
  flight: 'Voo',
  activity: 'Atividade',
  hotel: 'Acomodação',
  places: 'Lugar',
  suggested_places: 'Sugestão',
  transport: 'Transporte',
  text: 'Nota',
  cruise: 'Cruzeiro',
  services: 'Serviço',
  page_break: 'Quebra de Página',
  price: 'Preço',
};

export default function TripDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { trips, loading } = useTravelerData();

  const trip = trips.find((t) => t.id === id);

  if (loading) {
    return (
      <ThemedView style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#004782" />
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

  // Get unique sorted days
  const getDays = () => {
    const daysSet = new Set<number>();
    daysSet.add(1);
    trip.content.forEach((item: any) => daysSet.add(item.day));
    return Array.from(daysSet).sort((a, b) => a - b);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Simple Navigation Header */}
        <ThemedView style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <ThemedText style={styles.backLinkText}>← Voltar</ThemedText>
          </Pressable>
          <Image source={{ uri: trip.agency.logoUrl }} style={styles.headerAgencyLogo} contentFit="cover" />
          <ThemedText style={styles.headerTitle} type="subtitle" numberOfLines={1}>
            {trip.title}
          </ThemedText>
        </ThemedView>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Sub Header info */}
          <ThemedView style={[styles.tripMetaCard, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.metaTitle}>{trip.destination}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Agencia responsavel: {trip.agency.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              📅 {trip.startDate} a {trip.endDate} | 👤 {trip.travelers} viajantes
            </ThemedText>
          </ThemedView>

          {/* Visual Trail Path Timeline Container */}
          <View style={styles.timelineContainer}>
            {/* Dashed trail line */}
            <View style={styles.dashedLine} />

            {getDays().map((dayNum) => {
              const dayItems = trip.content.filter((item: any) => item.day === dayNum);

              return (
                <View key={dayNum} style={styles.dayNode}>
                  {/* Day marker circle on the line */}
                  <View style={styles.dayMarker}>
                    <ThemedText style={styles.dayMarkerText}>{dayNum}</ThemedText>
                  </View>

                  <ThemedText style={styles.dayTitle} type="subtitle">
                    Dia {dayNum}
                  </ThemedText>

                  {/* Day Items Cards List */}
                  <View style={styles.dayItemsContainer}>
                    {dayItems.map((item: any) => {
                      const symbol = item.customSymbol || item.type;
                      const emoji = SYMBOL_EMOJIS[symbol] || '📍';
                      const typeLabel = TYPE_LABELS[item.type] || 'Item';

                      return (
                        <View key={item.id} style={styles.itemWrapper}>
                          {/* Item Custom Icon Badge on the line */}
                          <View style={[styles.itemBadge, { borderColor: '#004782' }]}>
                            <ThemedText style={styles.itemBadgeEmoji}>{emoji}</ThemedText>
                          </View>

                          {/* Card Content */}
                          <ThemedView
                            style={[
                              styles.card,
                              {
                                backgroundColor: theme.backgroundElement,
                                borderColor: theme.backgroundSelected
                              }
                            ]}>
                            {/* Card Image */}
                            {item.image && (
                              <Image
                                source={{ uri: item.image }}
                                style={styles.cardImage}
                                contentFit="cover"
                              />
                            )}

                            <View style={styles.cardContent}>
                              {/* Header Type */}
                              <ThemedView style={styles.cardTypeRow}>
                                <ThemedText style={styles.emojiText}>{emoji}</ThemedText>
                                <ThemedText style={styles.cardTypeText}>{typeLabel}</ThemedText>
                              </ThemedView>

                              {/* Title */}
                              <ThemedText style={styles.cardTitle}>{item.title}</ThemedText>

                              {/* Subtitle */}
                              {item.subTitle && (
                                <ThemedText style={styles.cardSubTitle} themeColor="textSecondary">
                                  {item.subTitle}
                                </ThemedText>
                              )}

                              {/* Details */}
                              {item.details && (
                                <ThemedText style={styles.cardDetails} themeColor="textSecondary">
                                  {item.details}
                                </ThemedText>
                              )}

                              {/* Flight specifics */}
                              {item.type === 'flight' && item.meta && (
                                <View style={styles.metadataBlock}>
                                  <ThemedText type="small" style={styles.metaRow}>
                                    🛫 Partida: {item.meta.origin} ({item.meta.departureTime})
                                  </ThemedText>
                                  <ThemedText type="small" style={styles.metaRow}>
                                    🛬 Chegada: {item.meta.destination} ({item.meta.arrivalTime})
                                  </ThemedText>
                                  {item.meta.duration && (
                                    <ThemedText type="small" style={styles.metaRow}>
                                      ⏱ Duração: {item.meta.duration}
                                    </ThemedText>
                                  )}
                                </View>
                              )}

                              {/* Hotel specifics */}
                              {item.type === 'hotel' && item.meta && (
                                <View style={styles.metadataBlock}>
                                  {item.meta.address && (
                                    <ThemedText type="small" style={styles.metaRow}>
                                      📍 Endereço: {item.meta.address}
                                    </ThemedText>
                                  )}
                                  {item.meta.checkin && (
                                    <ThemedText type="small" style={styles.metaRow}>
                                      🔑 Check-in: {item.meta.checkin}
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
                        {/* Fallback dot on the line */}
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
    alignSelf: 'center',
    width: '100%',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  loadingText: {
    marginTop: Spacing.two,
    fontSize: 14,
    fontWeight: '500',
  },
  backButton: {
    marginTop: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    backgroundColor: '#004782',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  backLink: {
    paddingVertical: Spacing.half,
  },
  backLinkText: {
    color: '#004782',
    fontWeight: '700',
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  headerAgencyLogo: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#eee',
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
    fontWeight: '700',
    color: '#004782',
    marginBottom: Spacing.half,
  },
  timelineContainer: {
    position: 'relative',
    paddingLeft: Spacing.four,
  },
  dashedLine: {
    position: 'absolute',
    left: 24, // aligned exactly with marker center
    top: 16,
    bottom: 16,
    width: 2,
    borderLeftWidth: 2,
    borderColor: '#c2c6d2',
    borderStyle: 'dashed',
  },
  dayNode: {
    marginBottom: Spacing.four,
    position: 'relative',
  },
  dayMarker: {
    position: 'absolute',
    left: 8, // aligns center with left: 24 line (8 + 16 = 24)
    top: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#004782',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  dayMarkerText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 56, // aligned to right of line
    height: 32,
    lineHeight: 32,
  },
  dayItemsContainer: {
    marginTop: Spacing.three,
    gap: Spacing.three,
  },
  itemWrapper: {
    position: 'relative',
  },
  itemBadge: {
    position: 'absolute',
    left: 8, // aligns center with line (8 + 16 = 24)
    top: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemBadgeEmoji: {
    fontSize: 14,
  },
  card: {
    marginLeft: 56, // spacing relative to timeline
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#eee',
  },
  cardContent: {
    padding: Spacing.three,
  },
  cardTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.half,
  },
  emojiText: {
    fontSize: 12,
  },
  cardTypeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#004782',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: Spacing.half,
  },
  cardSubTitle: {
    fontSize: 11,
    fontWeight: '500',
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
    borderTopColor: 'rgba(0,0,0,0.05)',
    gap: Spacing.half,
  },
  metaRow: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyDayWrapper: {
    position: 'relative',
    height: 32,
    justifyContent: 'center',
  },
  bulletPoint: {
    position: 'absolute',
    left: 20, // aligns center on 24 line (20 + 4 = 24)
    top: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
    zIndex: 10,
  },
  emptyDayText: {
    marginLeft: 56,
    fontSize: 12,
    fontStyle: 'italic',
  },
});
