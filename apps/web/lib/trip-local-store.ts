const LOCAL_TRIPS_KEY = 'rumo:trips';

export const canUseLocalTripFallback = () =>
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ALLOW_LOCAL_TRIP_FALLBACK === 'true';

export const isProductionPersistenceError = (message: string) => {
  const normalized = String(message || '').toLowerCase();
  return (
    normalized.includes('read-only file system') ||
    normalized.includes('erofs') ||
    normalized.includes('erro ao criar viagem') ||
    normalized.includes('erro ao salvar alteracoes da viagem') ||
    normalized.includes('erro ao deletar viagem')
  );
};

export const readLocalTrips = <T>(): T[] => {
  if (!canUseLocalTripFallback()) return [];
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_TRIPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

export const writeLocalTrips = <T>(trips: T[]) => {
  if (!canUseLocalTripFallback()) return;
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(LOCAL_TRIPS_KEY, JSON.stringify(trips));
  } catch {
    // Ignore local storage write failures.
  }
};

export const upsertLocalTrip = <T extends { id: string }>(trip: T) => {
  if (!canUseLocalTripFallback()) return trip;
  const trips = readLocalTrips<T>();
  const nextTrips = [...trips.filter((item) => item.id !== trip.id), trip];
  writeLocalTrips(nextTrips);
  return trip;
};

export const removeLocalTrip = (tripId: string) => {
  if (!canUseLocalTripFallback()) return;
  const trips = readLocalTrips<{ id: string }>();
  writeLocalTrips(trips.filter((trip) => trip.id !== tripId));
};

export const findLocalTrip = <T extends { id: string }>(tripId: string) =>
  canUseLocalTripFallback() ? readLocalTrips<T>().find((trip) => trip.id === tripId) || null : null;

export const mergeTripsById = <T extends { id: string }>(serverTrips: T[], localTrips: T[]) => {
  if (!canUseLocalTripFallback()) return serverTrips;
  const merged = new Map<string, T>();
  serverTrips.forEach((trip) => merged.set(trip.id, trip));
  localTrips.forEach((trip) => merged.set(trip.id, trip));
  return Array.from(merged.values());
};
