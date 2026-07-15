import React from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { getTravelerTrips, TripDocument } from "@/lib/traveler-api";

const TYPE_COLORS = {
  pdf: { bg: "#FFF1F2", text: "#BE123C", icon: "picture_as_pdf" },
  image: { bg: "#EEF4FF", text: "#2D5BE3", icon: "image" },
  generic: { bg: "#F4F4F5", text: "#52525B", icon: "description" },
};

type TripDocumentWithTrip = TripDocument & {
  tripId: string;
  tripName: string;
};

function getDocumentVisual(documentName: string) {
  const lowerName = documentName.toLowerCase();
  if (lowerName.endsWith(".pdf")) return TYPE_COLORS.pdf;
  if (
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".webp")
  ) {
    return TYPE_COLORS.image;
  }
  return TYPE_COLORS.generic;
}

function formatDocumentDate(value?: string) {
  if (!value) return "Adicionado recentemente";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Adicionado recentemente";
  return date.toLocaleDateString("pt-BR");
}

function DocumentCard({
  document,
  theme,
}: {
  document: TripDocumentWithTrip;
  theme: ReturnType<typeof useTheme>;
}) {
  const visual = getDocumentVisual(document.name);

  const handleOpen = async () => {
    if (!document.url) {
      Alert.alert("Documento", "Este arquivo ainda não possui um link disponível.");
      return;
    }

    try {
      await Linking.openURL(document.url);
    } catch {
      Alert.alert("Erro", "Não foi possível abrir o documento.");
    }
  };

  return (
    <ThemedView
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
      ]}
    >
      <View style={styles.cardRow}>
        <View style={[styles.iconBox, { backgroundColor: visual.bg }]}>
          <ThemedText style={[styles.iconText, { color: visual.text }]}>
            {visual.icon === "picture_as_pdf" ? "PDF" : visual.icon === "image" ? "IMG" : "DOC"}
          </ThemedText>
        </View>

        <View style={styles.cardContent}>
          <ThemedText style={styles.tripBadge}>{document.tripName}</ThemedText>
          <ThemedText style={styles.cardTitle} numberOfLines={2}>
            {document.name}
          </ThemedText>
          <ThemedText style={styles.cardMeta} themeColor="textSecondary">
            {(document.size ? `${Math.max(1, Math.round(document.size / 1024))} KB` : "Arquivo")} •{" "}
            {formatDocumentDate(document.uploadedAt)}
          </ThemedText>
        </View>
      </View>

      <Pressable
        onPress={handleOpen}
        style={({ pressed }) => [
          styles.openButton,
          { backgroundColor: pressed ? "#003a6a" : "#004782", opacity: pressed ? 0.92 : 1 },
        ]}
      >
        <ThemedText style={styles.openButtonText}>
          {Platform.OS === "web" ? "Ver documento" : "Abrir documento"}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

export default function DocumentsScreen() {
  const theme = useTheme();
  const { sessionId } = useAuth();
  const [documents, setDocuments] = React.useState<TripDocumentWithTrip[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadDocuments() {
      if (!sessionId) {
        setDocuments([]);
        setLoading(false);
        return;
      }

      try {
        const trips = await getTravelerTrips(sessionId);
        const nextDocuments = trips.flatMap((trip) =>
          (trip.documents || []).map((document) => ({
            ...document,
            tripId: trip.id,
            tripName: trip.title || trip.name || "Viagem",
          }))
        );

        setDocuments(nextDocuments);
      } catch {
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    }

    loadDocuments();
  }, [sessionId]);

  const groupedDocuments = documents.reduce<Record<string, TripDocumentWithTrip[]>>((acc, document) => {
    if (!acc[document.tripId]) {
      acc[document.tripId] = [];
    }
    acc[document.tripId].push(document);
    return acc;
  }, {});

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <ThemedView style={[styles.header, { borderBottomColor: theme.backgroundSelected }]}>
          <ThemedText style={styles.headerTitle}>Documentos</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {documents.length} {documents.length === 1 ? "arquivo" : "arquivos"}
          </ThemedText>
        </ThemedView>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#004782" />
            <ThemedText style={styles.loadingText} themeColor="textSecondary">
              Carregando documentos das suas viagens...
            </ThemedText>
          </View>
        ) : documents.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText style={styles.emptyEmoji}>📂</ThemedText>
            <ThemedText style={styles.emptyText} themeColor="textSecondary">
              Nenhum documento disponível ainda.
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Quando sua agência anexar arquivos à viagem, eles aparecerão aqui.
            </ThemedText>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {Object.entries(groupedDocuments).map(([tripId, tripDocuments]) => (
              <View key={tripId} style={styles.section}>
                <ThemedText style={styles.sectionTitle}>{tripDocuments[0]?.tripName || "Viagem"}</ThemedText>
                {tripDocuments.map((document) => (
                  <DocumentCard key={document.id} document={document} theme={theme} />
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    width: "100%",
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  section: { gap: Spacing.two },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#004782",
    marginBottom: Spacing.one,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardRow: {
    flexDirection: "row",
    gap: Spacing.three,
    alignItems: "flex-start",
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconText: {
    fontSize: 12,
    fontWeight: "800",
  },
  cardContent: { flex: 1, gap: Spacing.one },
  tripBadge: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#004782",
    letterSpacing: 0.6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  cardMeta: {
    fontSize: 12,
    lineHeight: 16,
  },
  openButton: {
    borderRadius: 8,
    paddingVertical: Spacing.two,
    alignItems: "center",
  },
  openButtonText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600" },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  loadingText: {
    fontSize: 14,
    textAlign: "center",
  },
});
