import { db } from '@rumo/db';
import { findTripById } from './server-trip-store';

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 20);
}

function handleExists(handle: string, excludeUserId?: string) {
  const users = db.users.findMany() as Array<{ id: string; handle?: string }>;
  return users.some((u) => u.handle === handle && u.id !== excludeUserId);
}

/** Every traveler needs a handle to be searchable; generate one on first profile access. */
export function getOrCreateHandle(userId: string): string {
  const user = db.users.findOne(userId) as { id: string; handle?: string; fullName?: string } | null;
  if (!user) throw new Error('Usuario nao encontrado');
  if (user.handle) return user.handle;

  const base = slugify(user.fullName || 'viajante') || 'viajante';
  let candidate = base;
  let suffix = 0;
  while (handleExists(candidate, userId)) {
    suffix += 1;
    candidate = `${base}${suffix}`;
  }
  db.users.update(userId, { handle: candidate });
  return candidate;
}

async function summarizeTrip(tripId: string, agencyId: string) {
  const trip = await findTripById(tripId, agencyId);
  if (!trip) return null;
  return {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    coverImage: trip.coverImage,
    agencyId,
  };
}

export async function getOwnProfile(userId: string) {
  const user = db.users.findOne(userId) as { id: string; fullName: string; email: string } | null;
  if (!user) throw new Error('Usuario nao encontrado');
  const handle = getOrCreateHandle(userId);

  const accessRows = db.travelerTrips.findAccessManyForUser(userId) as Array<{
    tripId: string;
    agencyId: string;
    isPublic?: boolean;
  }>;

  const trips = (
    await Promise.all(
      accessRows.map(async (access) => {
        const summary = await summarizeTrip(access.tripId, access.agencyId);
        if (!summary) return null;
        return { ...summary, isPublic: Boolean(access.isPublic) };
      })
    )
  ).filter(Boolean);

  const today = new Date();
  const completed = trips.filter((t) => t && new Date(t.endDate) < today);
  const destinations = new Set(completed.map((t) => t?.destination).filter(Boolean));

  return {
    fullName: user.fullName,
    handle,
    stats: { completedTrips: completed.length, destinations: destinations.size },
    trips,
  };
}

export async function setTripVisibility(userId: string, tripId: string, isPublic: boolean) {
  db.travelerTrips.setVisibility(userId, tripId, isPublic);
}

export async function searchTravelers(query: string, excludeUserId: string) {
  const normalized = query.trim().toLowerCase().replace(/^@/, '');
  if (normalized.length < 2) return [];

  const users = db.users.findMany() as Array<{ id: string; role: string; fullName: string; handle?: string }>;
  const matches = users.filter(
    (u) =>
      u.role === 'traveler' &&
      u.id !== excludeUserId &&
      (u.handle?.includes(normalized) || u.fullName.toLowerCase().includes(normalized))
  );

  const results = await Promise.all(
    matches.slice(0, 20).map(async (u) => {
      const handle = getOrCreateHandle(u.id);
      const accessRows = db.travelerTrips.findAccessManyForUser(u.id) as Array<{ isPublic?: boolean }>;
      const publicCount = accessRows.filter((a) => a.isPublic).length;
      return publicCount > 0 ? { fullName: u.fullName, handle, publicTripCount: publicCount } : null;
    })
  );

  return results.filter(Boolean);
}

export async function getPublicProfile(handle: string) {
  const normalized = handle.trim().toLowerCase().replace(/^@/, '');
  const users = db.users.findMany() as Array<{ id: string; role: string; fullName: string; handle?: string }>;
  const user = users.find((u) => u.role === 'traveler' && u.handle === normalized);
  if (!user) return null;

  const accessRows = db.travelerTrips.findAccessManyForUser(user.id) as Array<{
    tripId: string;
    agencyId: string;
    isPublic?: boolean;
  }>;
  const publicAccess = accessRows.filter((a) => a.isPublic);

  const trips = (
    await Promise.all(publicAccess.map((access) => summarizeTrip(access.tripId, access.agencyId)))
  ).filter(Boolean);

  const destinations = new Set(trips.map((t) => t?.destination).filter(Boolean));

  return {
    fullName: user.fullName,
    handle: normalized,
    stats: { publicTrips: trips.length, destinations: destinations.size },
    trips,
  };
}
