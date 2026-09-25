import { db } from '@rumo/db';

/**
 * Confirms a traveler has access to a trip and resolves which agency owns it.
 * Shared by every traveler-facing diary/expenses/chat route so authorization
 * stays consistent with how apps/api/traveler/trips already scopes access.
 */
export function getTravelerTripAccess(userId: string, tripId: string) {
  const accessRows = db.travelerTrips.findAccessManyForUser(userId) as Array<{
    tripId: string;
    agencyId: string;
  }>;
  const access = accessRows.find((row) => row.tripId === tripId);
  return access ? { agencyId: access.agencyId } : null;
}
