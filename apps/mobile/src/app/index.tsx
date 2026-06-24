import React from 'react';
import { StyleSheet, FlatList, Pressable, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTravelerData, MobileItinerary } from '@/hooks/use-supabase';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { trips, loading } = useTravelerData();

  if (loading) {
    return (
      <ThemedView style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#004782" />
        <ThemedText style={styles.loadingText}>Carregando suas viagens...</ThemedText>
      </ThemedView>
    );
  }

  const renderTripCard = ({ item }: { item: MobileItinerary }) => {
    const isConfirmed = item.status === 'Confirmado' || item.status === 'Publicado';

    return (
      <Pressable
        onPress={() => {
          router.push({
            pathname: '/trip/[id]',
            params: { id: item.id }
          });
        }}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: pressed ? '#004782' : theme.backgroundSelected,
            opacity: pressed ? 0.9 : 1
          }
        ]}>
        <ThemedView style={styles.cardHeader}>
          <Image
            source={{ uri: item.agency.logoUrl }}
            style={styles.tripAgencyLogo}
            contentFit="cover"
            transition={300}
          />
          <ThemedText style={styles.cardTitle} type="subtitle">
            {item.title}
          </ThemedText>
          <ThemedView
            style={[
              styles.badge,
              { backgroundColor: isConfirmed ? '#E1F5EE' : '#FBEAF0' }
            ]}>
            <ThemedText
              style={[
                styles.badgeText,
                { color: isConfirmed ? '#0F6E56' : '#703800' }
              ]}>
              {item.status.toUpperCase()}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedText style={styles.destinationText} themeColor="textSecondary">
          {item.agency.name} | Destino: {item.destination}
        </ThemedText>

        <ThemedView style={styles.cardFooter}>
          <ThemedView style={styles.metaItem}>
            <ThemedText style={styles.metaIcon}>📅</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.startDate} a {item.endDate}
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.metaItem}>
            <ThemedText style={styles.metaIcon}>👤</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.travelers} {item.travelers > 1 ? 'viajantes' : 'viajante'}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.buttonPlaceholder}>
          <ThemedText style={styles.buttonText}>Ver Trilha da Viagem →</ThemedText>
        </ThemedView>
      </Pressable>
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* White-Label Agency Header */}
        <ThemedView style={[styles.headerContainer, { borderColor: theme.backgroundSelected }]}>
          
          <ThemedView style={styles.agencyInfo}>
            <ThemedText style={styles.agencyName} type="subtitle">
              Minhas viagens
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Agência de Viagens
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedText style={styles.sectionTitle} type="title">
          Meus Roteiros
        </ThemedText>

        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={renderTripCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <ThemedView style={styles.emptyContainer}>
              <ThemedText themeColor="textSecondary">Nenhuma viagem disponível.</ThemedText>
            </ThemedView>
          }
        />
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
  },
  loadingText: {
    marginTop: Spacing.two,
    fontSize: 14,
    fontWeight: '500',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    gap: Spacing.three,
  },
  agencyLogo: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  tripAgencyLogo: {
    width: 34,
    height: 34,
    borderRadius: 7,
    backgroundColor: '#eee',
    marginRight: Spacing.two,
  },
  agencyInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  agencyName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#004782',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: Spacing.two,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  destinationText: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: Spacing.two,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: Spacing.two,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  metaIcon: {
    fontSize: 12,
  },
  buttonPlaceholder: {
    backgroundColor: '#004782',
    borderRadius: 8,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
  },
});
