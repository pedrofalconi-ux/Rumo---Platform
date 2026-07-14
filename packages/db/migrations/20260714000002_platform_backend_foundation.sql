CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.gen_ulid() RETURNS uuid AS $$
DECLARE
  t bigint;
  r bytea;
  v text;
BEGIN
  t := extract(epoch from clock_timestamp()) * 1000;
  r := gen_random_bytes(10);
  v := lpad(to_hex(t), 12, '0') || encode(r, 'hex');
  RETURN v::uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.write_audit_log() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.audit_logs (
    id,
    agency_id,
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    created_at
  )
  VALUES (
    public.gen_ulid(),
    COALESCE(NEW.agency_id, OLD.agency_id),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.agencies (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  plan text NOT NULL DEFAULT 'starter',
  credits integer NOT NULL DEFAULT 60,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  subscription_status text NOT NULL DEFAULT 'active',
  access_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'agent',
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  avatar_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  cpf text,
  passport text,
  birthdate date,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  app_access_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.itineraries (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  title text NOT NULL,
  client_name text,
  destination text NOT NULL DEFAULT '',
  destinations jsonb NOT NULL DEFAULT '[]'::jsonb,
  destinations_detail jsonb NOT NULL DEFAULT '[]'::jsonb,
  origin text NOT NULL DEFAULT '',
  start_date date NOT NULL,
  end_date date NOT NULL,
  travelers integer NOT NULL DEFAULT 1,
  travelers_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  budget numeric(12,2),
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'draft',
  profile text,
  preferences text,
  cover_image text,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_status text NOT NULL DEFAULT 'NONE',
  ai_generation_id text,
  ai_generated_at timestamptz,
  ai_prompt jsonb,
  ai_response jsonb,
  content jsonb NOT NULL DEFAULT '{"items":[]}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.itinerary_days (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  itinerary_id uuid NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  travel_date date,
  destination text,
  theme text,
  summary text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (itinerary_id, day_number)
);

CREATE TABLE IF NOT EXISTS public.itinerary_activities (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  itinerary_day_id uuid NOT NULL REFERENCES public.itinerary_days(id) ON DELETE CASCADE,
  itinerary_id uuid NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  item_order integer NOT NULL DEFAULT 0,
  block_type text NOT NULL,
  title text NOT NULL,
  subtitle text,
  details text,
  image text,
  custom_symbol text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  itinerary_id uuid NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'pending',
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.booking_flights (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  supplier text NOT NULL DEFAULT 'manual',
  supplier_ref text NOT NULL DEFAULT '',
  origin text NOT NULL,
  destination text NOT NULL,
  departure_at timestamptz NOT NULL,
  arrival_at timestamptz NOT NULL,
  airline text,
  flight_number text,
  class text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'confirmed',
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.booking_hotels (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  supplier text NOT NULL DEFAULT 'manual',
  supplier_ref text NOT NULL DEFAULT '',
  hotel_name text NOT NULL,
  destination text NOT NULL,
  checkin_date date NOT NULL,
  checkout_date date NOT NULL,
  room_type text,
  board_type text,
  guests integer NOT NULL DEFAULT 1,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'confirmed',
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  method text NOT NULL DEFAULT 'pix',
  provider text NOT NULL DEFAULT 'manual',
  provider_ref text,
  status text NOT NULL DEFAULT 'pending',
  installments integer NOT NULL DEFAULT 1,
  paid_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_splits (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  recipient text NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL,
  percentage numeric(5,2),
  status text NOT NULL DEFAULT 'pending',
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.library_folders (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  path text NOT NULL,
  cover_url text,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz,
  UNIQUE (agency_id, path)
);

CREATE TABLE IF NOT EXISTS public.library_photos (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  folder_path text NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES public.itineraries(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  message text NOT NULL,
  target text NOT NULL DEFAULT 'trip_travelers',
  recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  priority text NOT NULL DEFAULT 'normal',
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'queued',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.traveler_invites (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  traveler_name text NOT NULL,
  email text,
  phone text,
  channel text NOT NULL DEFAULT 'email',
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.traveler_trip_access (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  invite_id uuid REFERENCES public.traveler_invites(id) ON DELETE SET NULL,
  traveler_name text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, trip_id)
);

CREATE TABLE IF NOT EXISTS public.ai_generations (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES public.itineraries(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  provider text,
  model text,
  input jsonb,
  output jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_agency_id ON public.users (agency_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_agency_id ON public.clients (agency_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_itineraries_agency_id ON public.itineraries (agency_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_itineraries_agent_id ON public.itineraries (agent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_agency_id ON public.bookings (agency_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payment_splits_agency_id ON public.payment_splits (agency_id);
CREATE INDEX IF NOT EXISTS idx_library_folders_agency_path ON public.library_folders (agency_id, path) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_photos_agency_folder ON public.library_photos (agency_id, folder_path) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_trip_id ON public.notifications (trip_id);
CREATE INDEX IF NOT EXISTS idx_traveler_invites_trip_id ON public.traveler_invites (trip_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_trip_id ON public.ai_generations (trip_id);

DROP TRIGGER IF EXISTS trg_agencies_updated_at ON public.agencies;
CREATE TRIGGER trg_agencies_updated_at BEFORE UPDATE ON public.agencies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_clients_updated_at ON public.clients;
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_itineraries_updated_at ON public.itineraries;
CREATE TRIGGER trg_itineraries_updated_at BEFORE UPDATE ON public.itineraries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_itinerary_days_updated_at ON public.itinerary_days;
CREATE TRIGGER trg_itinerary_days_updated_at BEFORE UPDATE ON public.itinerary_days
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_itinerary_activities_updated_at ON public.itinerary_activities;
CREATE TRIGGER trg_itinerary_activities_updated_at BEFORE UPDATE ON public.itinerary_activities
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON public.bookings;
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_booking_flights_updated_at ON public.booking_flights;
CREATE TRIGGER trg_booking_flights_updated_at BEFORE UPDATE ON public.booking_flights
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_booking_hotels_updated_at ON public.booking_hotels;
CREATE TRIGGER trg_booking_hotels_updated_at BEFORE UPDATE ON public.booking_hotels
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_payment_splits_updated_at ON public.payment_splits;
CREATE TRIGGER trg_payment_splits_updated_at BEFORE UPDATE ON public.payment_splits
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_library_folders_updated_at ON public.library_folders;
CREATE TRIGGER trg_library_folders_updated_at BEFORE UPDATE ON public.library_folders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_library_photos_updated_at ON public.library_photos;
CREATE TRIGGER trg_library_photos_updated_at BEFORE UPDATE ON public.library_photos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_notifications_updated_at ON public.notifications;
CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_traveler_invites_updated_at ON public.traveler_invites;
CREATE TRIGGER trg_traveler_invites_updated_at BEFORE UPDATE ON public.traveler_invites
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_agencies_audit ON public.agencies;
CREATE TRIGGER trg_agencies_audit AFTER INSERT OR UPDATE OR DELETE ON public.agencies
FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

DROP TRIGGER IF EXISTS trg_bookings_audit ON public.bookings;
CREATE TRIGGER trg_bookings_audit AFTER INSERT OR UPDATE OR DELETE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

DROP TRIGGER IF EXISTS trg_payments_audit ON public.payments;
CREATE TRIGGER trg_payments_audit AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traveler_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traveler_trip_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agencies_same_tenant ON public.agencies;
CREATE POLICY agencies_same_tenant ON public.agencies
  FOR ALL TO authenticated
  USING (id = (SELECT agency_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS users_same_tenant ON public.users;
CREATE POLICY users_same_tenant ON public.users
  FOR ALL TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS clients_same_tenant ON public.clients;
CREATE POLICY clients_same_tenant ON public.clients
  FOR ALL TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS itineraries_same_tenant ON public.itineraries;
CREATE POLICY itineraries_same_tenant ON public.itineraries
  FOR ALL TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS itinerary_days_same_tenant ON public.itinerary_days;
CREATE POLICY itinerary_days_same_tenant ON public.itinerary_days
  FOR ALL TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS itinerary_activities_same_tenant ON public.itinerary_activities;
CREATE POLICY itinerary_activities_same_tenant ON public.itinerary_activities
  FOR ALL TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS bookings_same_tenant ON public.bookings;
CREATE POLICY bookings_same_tenant ON public.bookings
  FOR ALL TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS booking_flights_same_tenant ON public.booking_flights;
CREATE POLICY booking_flights_same_tenant ON public.booking_flights
  FOR ALL TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS booking_hotels_same_tenant ON public.booking_hotels;
CREATE POLICY booking_hotels_same_tenant ON public.booking_hotels
  FOR ALL TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS payments_same_tenant ON public.payments;
CREATE POLICY payments_same_tenant ON public.payments
  FOR ALL TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS payment_splits_same_tenant ON public.payment_splits;
CREATE POLICY payment_splits_same_tenant ON public.payment_splits
  FOR ALL TO authenticated
  USING (
    agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.payments p
      WHERE p.id = payment_splits.payment_id
        AND p.agency_id = payment_splits.agency_id
    )
  )
  WITH CHECK (
    agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.payments p
      WHERE p.id = payment_splits.payment_id
        AND p.agency_id = payment_splits.agency_id
    )
  );

DROP POLICY IF EXISTS library_folders_same_tenant ON public.library_folders;
CREATE POLICY library_folders_same_tenant ON public.library_folders
  FOR ALL TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS library_photos_same_tenant ON public.library_photos;
CREATE POLICY library_photos_same_tenant ON public.library_photos
  FOR ALL TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS notifications_same_tenant ON public.notifications;
CREATE POLICY notifications_same_tenant ON public.notifications
  FOR ALL TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS traveler_invites_same_tenant ON public.traveler_invites;
CREATE POLICY traveler_invites_same_tenant ON public.traveler_invites
  FOR ALL TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS traveler_trip_access_same_tenant ON public.traveler_trip_access;
CREATE POLICY traveler_trip_access_same_tenant ON public.traveler_trip_access
  FOR ALL TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS ai_generations_same_tenant ON public.ai_generations;
CREATE POLICY ai_generations_same_tenant ON public.ai_generations
  FOR ALL TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS audit_logs_same_tenant ON public.audit_logs;
CREATE POLICY audit_logs_same_tenant ON public.audit_logs
  FOR SELECT TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
