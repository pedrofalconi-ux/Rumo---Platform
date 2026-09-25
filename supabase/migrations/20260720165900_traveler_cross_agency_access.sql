-- A traveler owns one global account and can access trips from multiple agencies.
-- CRM clients remain agency-scoped and are intentionally not merged across tenants.
ALTER TABLE public.users ALTER COLUMN agency_id DROP NOT NULL;

ALTER TABLE public.traveler_invites
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS accepted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS traveler_trip_access_user_trip_unique_idx
  ON public.traveler_trip_access (user_id, trip_id);
CREATE INDEX IF NOT EXISTS traveler_trip_access_user_idx
  ON public.traveler_trip_access (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS traveler_invites_client_idx
  ON public.traveler_invites (agency_id, client_id, created_at DESC)
  WHERE client_id IS NOT NULL;

DROP POLICY IF EXISTS users_traveler_self_select ON public.users;
CREATE POLICY users_traveler_self_select ON public.users
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) AND role = 'traveler');

DROP POLICY IF EXISTS traveler_access_self_select ON public.traveler_trip_access;
CREATE POLICY traveler_access_self_select ON public.traveler_trip_access
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS traveler_itineraries_select ON public.itineraries;
CREATE POLICY traveler_itineraries_select ON public.itineraries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.traveler_trip_access access
      WHERE access.trip_id = itineraries.id
        AND access.agency_id = itineraries.agency_id
        AND access.user_id = (SELECT auth.uid())
    )
  );
