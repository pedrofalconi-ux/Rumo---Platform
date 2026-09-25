export interface AgencyBranding {
  id?: string;
  name: string;
  logoUrl?: string;
  plan?: string;
}

export interface TripDocument {
  id: string;
  name: string;
  url: string;
  uploadedAt?: string;
  size?: number;
}

export interface MobileItineraryItem {
  id: string;
  day: number;
  type: string;
  title: string;
  subTitle?: string;
  details?: string;
  image?: string;
  customSymbol?: string;
  meta?: Record<string, unknown>;
}

export interface MobileItinerary {
  id: string;
  name: string;
  title: string;
  destinations?: string[];
  destination: string;
  origin: string;
  startDate: string;
  endDate: string;
  travelers: number;
  status: string;
  coverImage?: string;
  itinerary: MobileItineraryItem[];
  content: MobileItineraryItem[];
  documents: TripDocument[];
  agency: AgencyBranding | null;
}

export interface InvitePreview {
  invite: {
    id: string;
    travelerName: string;
    email?: string;
    phone?: string;
    expiresAt: string;
  };
  agency: AgencyBranding;
  trip: {
    id: string;
    title: string;
    destination: string;
    origin: string;
    startDate: string;
    endDate: string;
    travelers: number;
    status: string;
    content: MobileItineraryItem[];
    documents: TripDocument[];
    agencyId: string;
  };
}

export interface AuthUser {
  id: string;
  role: "platform_admin" | "agency_admin" | "agent" | "traveler";
  fullName: string;
  email: string;
  phone?: string;
  agencyId?: string;
}

export interface AuthSessionPayload {
  user: AuthUser;
  session: {
    id: string;
    expiresAt?: string | null;
  };
}

const API_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");

function normalizeInviteToken(value: string) {
  const input = value.trim();
  if (!input) return "";

  try {
    const url = new URL(input);
    const queryToken = url.searchParams.get("invite") || url.searchParams.get("token");
    if (queryToken) return decodeURIComponent(queryToken).trim();
    return decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "").trim();
  } catch {
    const withoutFragment = input.split("#")[0];
    const query = withoutFragment.includes("?") ? withoutFragment.split("?").pop() || "" : "";
    if (query) {
      const params = new URLSearchParams(query);
      const queryToken = params.get("invite") || params.get("token");
      if (queryToken) return decodeURIComponent(queryToken).trim();
    }
    return decodeURIComponent(withoutFragment.split("/").filter(Boolean).pop() || input).trim();
  }
}

function requireApiUrl() {
  if (!API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL nao configurada.");
  }
  return API_URL;
}

async function request<T>(
  path: string,
  init?: RequestInit,
  sessionId?: string | null
): Promise<T> {
  const baseUrl = requireApiUrl();
  const headers = new Headers(init?.headers);

  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (!headers.has("Content-Type") && init?.body && !isFormData) {
    headers.set("Content-Type", "application/json");
  }
  if (sessionId) {
    headers.set("x-rumo-session", sessionId);
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new Error(
      "Não foi possível conectar ao servidor. Verifique se a API está publicada e tente novamente."
    );
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(data?.error || "Falha na comunicacao com a plataforma.", data?.code);
  }

  return data as T;
}

export class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

function normalizeTrip(raw: any): MobileItinerary {
  const itinerary = Array.isArray(raw.itinerary)
    ? raw.itinerary
    : Array.isArray(raw.content?.items)
      ? raw.content.items
      : Array.isArray(raw.content)
        ? raw.content
        : [];

  const destination = raw.destination || raw.destinations?.join(", ") || "";

  return {
    id: raw.id,
    name: raw.name || raw.title || "Viagem",
    title: raw.title || raw.name || "Viagem",
    destinations: raw.destinations || (destination ? destination.split(", ").filter(Boolean) : []),
    destination,
    origin: raw.origin || "",
    startDate: raw.startDate || raw.start_date || "",
    endDate: raw.endDate || raw.end_date || "",
    travelers:
      typeof raw.travelers === "number"
        ? raw.travelers
        : Array.isArray(raw.travelers)
          ? raw.travelers.length
          : 1,
    status: raw.status || "draft",
    coverImage: raw.coverImage,
    itinerary,
    content: itinerary,
    documents: Array.isArray(raw.documents) ? raw.documents : [],
    agency: raw.agency || null,
  };
}

export async function loginTraveler(email: string, password: string) {
  return request<AuthSessionPayload>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerTraveler(payload: {
  fullName: string;
  email: string;
  emailConfirm: string;
  phone?: string;
  password: string;
  inviteToken: string;
}) {
  return request<AuthSessionPayload>("/api/traveler/register", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      inviteToken: normalizeInviteToken(payload.inviteToken),
    }),
  });
}

export async function getCurrentTraveler(sessionId: string) {
  return request<{ user: AuthUser }>("/api/auth/me", undefined, sessionId);
}

export async function logoutTraveler(sessionId: string) {
  return request<{ success: boolean }>("/api/auth/logout", { method: "POST" }, sessionId);
}

export async function getTravelerTrips(sessionId: string) {
  const trips = await request<any[]>("/api/traveler/trips", undefined, sessionId);
  return trips.map(normalizeTrip);
}

export async function getTravelerTrip(sessionId: string, id: string) {
  const trip = await request<any>(`/api/traveler/trips/${id}`, undefined, sessionId);
  return normalizeTrip(trip);
}

export async function importTravelerTrip(sessionId: string, linkOrToken: string) {
  const result = await request<{ trip: any }>(
    "/api/traveler/import",
    {
      method: "POST",
      body: JSON.stringify({ linkOrToken }),
    },
    sessionId
  );
  return normalizeTrip(result.trip);
}

export async function getInvitePreview(tokenOrLink: string) {
  const token = normalizeInviteToken(tokenOrLink);
  return request<InvitePreview>(`/api/mobile/invites/${token}`);
}

// ─── Diary ─────────────────────────────────────────────────────────────────

export interface DiaryEntry {
  id: string;
  tripId: string;
  day: number;
  title: string;
  body: string;
  photoUrl: string | null;
  createdAt: string;
}

export async function getDiaryEntries(sessionId: string, tripId: string) {
  return request<DiaryEntry[]>(`/api/traveler/diary?tripId=${encodeURIComponent(tripId)}`, undefined, sessionId);
}

export async function addDiaryEntry(
  sessionId: string,
  data: { tripId: string; day: number; title: string; body: string; photoUri?: string | null }
) {
  const form = new FormData();
  form.append("tripId", data.tripId);
  form.append("day", String(data.day));
  form.append("title", data.title);
  form.append("body", data.body);
  if (data.photoUri) {
    const filename = data.photoUri.split("/").pop() || "foto.jpg";
    const extMatch = /\.(\w+)$/.exec(filename);
    const ext = (extMatch?.[1] || "jpg").toLowerCase();
    const type = ext === "png" ? "image/png" : ext === "heic" ? "image/heic" : ext === "webp" ? "image/webp" : "image/jpeg";
    form.append("photo", { uri: data.photoUri, name: filename, type } as unknown as Blob);
  }
  return request<DiaryEntry>("/api/traveler/diary", { method: "POST", body: form }, sessionId);
}

export async function deleteDiaryEntry(sessionId: string, entryId: string) {
  return request<{ success: boolean }>(`/api/traveler/diary/${entryId}`, { method: "DELETE" }, sessionId);
}

// ─── Expenses ──────────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  tripId: string;
  description: string;
  amount: number;
  currency: string;
  category: "alimentação" | "transporte" | "hospedagem" | "compras" | "entretenimento" | "outro";
  date: string;
  createdAt: string;
}

export async function getExpenses(sessionId: string, tripId: string) {
  return request<Expense[]>(`/api/traveler/expenses?tripId=${encodeURIComponent(tripId)}`, undefined, sessionId);
}

export async function addExpense(
  sessionId: string,
  data: { tripId: string; description: string; amount: number; currency: string; category: string; date: string }
) {
  return request<Expense>(
    "/api/traveler/expenses",
    { method: "POST", body: JSON.stringify(data) },
    sessionId
  );
}

export async function deleteExpense(sessionId: string, expenseId: string) {
  return request<{ success: boolean }>(`/api/traveler/expenses/${expenseId}`, { method: "DELETE" }, sessionId);
}

// ─── Chat ──────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  tripId: string;
  agencyId: string;
  senderId: string | null;
  senderName: string;
  senderRole: "traveler" | "agent";
  text: string;
  read: boolean;
  sentAt: string;
}

export async function getChatMessages(sessionId: string, tripId: string) {
  return request<ChatMessage[]>(`/api/traveler/chat?tripId=${encodeURIComponent(tripId)}`, undefined, sessionId);
}

export async function sendChatMessage(sessionId: string, tripId: string, text: string) {
  return request<ChatMessage>(
    "/api/traveler/chat",
    { method: "POST", body: JSON.stringify({ tripId, text }) },
    sessionId
  );
}

// ─── Profile, privacy, and search ───────────────────────────────────────────

export interface ProfileTrip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  coverImage?: string;
  isPublic: boolean;
}

export interface OwnProfile {
  fullName: string;
  handle: string;
  stats: { completedTrips: number; destinations: number };
  trips: ProfileTrip[];
}

export interface PublicProfile {
  fullName: string;
  handle: string;
  stats: { publicTrips: number; destinations: number };
  trips: Omit<ProfileTrip, "isPublic">[];
}

export interface TravelerSearchResult {
  fullName: string;
  handle: string;
  publicTripCount: number;
}

export async function getOwnProfile(sessionId: string) {
  return request<OwnProfile>("/api/traveler/profile", undefined, sessionId);
}

export async function setTripVisibility(sessionId: string, tripId: string, isPublic: boolean) {
  return request<{ success: boolean }>(
    "/api/traveler/profile/visibility",
    { method: "PATCH", body: JSON.stringify({ tripId, isPublic }) },
    sessionId
  );
}

export async function searchTravelers(sessionId: string, query: string) {
  return request<TravelerSearchResult[]>(
    `/api/traveler/search?q=${encodeURIComponent(query)}`,
    undefined,
    sessionId
  );
}

export async function getPublicProfile(sessionId: string, handle: string) {
  return request<PublicProfile>(`/api/traveler/public-profile/${encodeURIComponent(handle)}`, undefined, sessionId);
}
