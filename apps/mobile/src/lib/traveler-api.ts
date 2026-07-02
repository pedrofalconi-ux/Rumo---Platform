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

  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  if (sessionId) {
    headers.set("x-rumo-session", sessionId);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error || "Falha na comunicacao com a plataforma.");
  }

  return data as T;
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
    body: JSON.stringify(payload),
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
  const token = tokenOrLink.trim().split("/").filter(Boolean).pop() || tokenOrLink.trim();
  return request<InvitePreview>(`/api/mobile/invites/${token}`);
}

