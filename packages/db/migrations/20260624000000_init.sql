-- PL/pgSQL function to generate ULIDs stored as UUID type
-- This creates a sortable 128-bit identifier compatible with PostgreSQL's UUID type
CREATE OR REPLACE FUNCTION gen_ulid() RETURNS uuid AS $$
DECLARE
  -- timestamp
  t bigint;
  -- random bytes
  r bytea;
  -- output hex string
  v text;
BEGIN
  -- get current time in milliseconds since epoch
  t := extract(epoch from clock_timestamp()) * 1000;
  -- generate 10 random bytes
  r := gen_random_bytes(10);
  -- format as UUID representation (12 hex digits for timestamp, 20 for random bytes)
  v := lpad(to_hex(t), 12, '0') || encode(r, 'hex');
  RETURN v::uuid;
END;
$$ LANGUAGE plpgsql;

-- 1. Agencies Table (Tenant Root)
CREATE TABLE agencies (
  id          UUID PRIMARY KEY DEFAULT gen_ulid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  logo_url    TEXT,
  plan        TEXT NOT NULL DEFAULT 'starter', -- starter | pro | business | enterprise
  credits     INTEGER NOT NULL DEFAULT 60,
  settings    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

-- 2. Users Table (Consultants, Admins, and Travelers)
-- References auth.users from Supabase Auth
CREATE TABLE users (
  id          UUID PRIMARY KEY, -- References auth.users(id)
  agency_id   UUID REFERENCES agencies(id),
  role        TEXT NOT NULL, -- agency_admin | agent | traveler
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  avatar_url  TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

-- 3. Clients Table (The person booking the trip)
CREATE TABLE clients (
  id          UUID PRIMARY KEY DEFAULT gen_ulid(),
  agency_id   UUID REFERENCES agencies(id),
  agent_id    UUID REFERENCES users(id),
  full_name   TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  cpf         TEXT,
  passport    TEXT,
  birthdate   DATE,
  preferences JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

-- 4. Itineraries Table (Trips created by agents)
CREATE TABLE itineraries (
  id           UUID PRIMARY KEY DEFAULT gen_ulid(),
  agency_id    UUID REFERENCES agencies(id),
  agent_id     UUID REFERENCES users(id),
  client_id    UUID REFERENCES clients(id),
  title        TEXT NOT NULL,
  destination  TEXT NOT NULL,
  origin       TEXT NOT NULL,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  travelers    INTEGER NOT NULL DEFAULT 1,
  budget       NUMERIC(12,2),
  currency     TEXT DEFAULT 'BRL',
  status       TEXT DEFAULT 'draft', -- draft | quoted | confirmed | active | completed | cancelled
  ai_prompt    JSONB,                -- Prompt params sent to AI
  ai_response  JSONB,                -- Raw response from AI
  content      JSONB NOT NULL,       -- Structured day-by-day JSON
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

-- 5. Bookings Table (The payment package wrapper)
CREATE TABLE bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_ulid(),
  agency_id           UUID REFERENCES agencies(id),
  itinerary_id        UUID REFERENCES itineraries(id),
  client_id           UUID REFERENCES clients(id),
  total_amount        NUMERIC(12,2) NOT NULL,
  currency            TEXT DEFAULT 'BRL',
  status              TEXT DEFAULT 'pending', -- pending | confirmed | cancelled | refunded
  confirmed_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Flight Bookings
CREATE TABLE booking_flights (
  id             UUID PRIMARY KEY DEFAULT gen_ulid(),
  booking_id     UUID REFERENCES bookings(id),
  supplier       TEXT NOT NULL, -- tbo | amadeus | duffel
  supplier_ref   TEXT NOT NULL, -- PNR/Ref
  origin         TEXT NOT NULL,
  destination    TEXT NOT NULL,
  departure_at   TIMESTAMPTZ NOT NULL,
  arrival_at     TIMESTAMPTZ NOT NULL,
  airline        TEXT,
  flight_number  TEXT,
  class          TEXT,
  amount         NUMERIC(12,2) NOT NULL,
  status         TEXT DEFAULT 'confirmed', -- confirmed | cancelled | changed
  raw_response   JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Hotel Bookings
CREATE TABLE booking_hotels (
  id             UUID PRIMARY KEY DEFAULT gen_ulid(),
  booking_id     UUID REFERENCES bookings(id),
  supplier       TEXT NOT NULL, -- tbo | hotelbeds
  supplier_ref   TEXT NOT NULL,
  hotel_name     TEXT NOT NULL,
  destination    TEXT NOT NULL,
  checkin_date   DATE NOT NULL,
  checkout_date  DATE NOT NULL,
  room_type      TEXT,
  board_type     TEXT, -- breakfast | half | full | ai
  guests         INTEGER NOT NULL DEFAULT 1,
  amount         NUMERIC(12,2) NOT NULL,
  status         TEXT DEFAULT 'confirmed', -- confirmed | cancelled
  raw_response   JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Payments
CREATE TABLE payments (
  id               UUID PRIMARY KEY DEFAULT gen_ulid(),
  booking_id       UUID REFERENCES bookings(id),
  agency_id        UUID REFERENCES agencies(id),
  amount           NUMERIC(12,2) NOT NULL,
  currency         TEXT DEFAULT 'BRL',
  method           TEXT NOT NULL, -- credit_card | pix | boleto
  provider         TEXT NOT NULL, -- stripe | pagarme
  provider_ref     TEXT,
  status           TEXT DEFAULT 'pending', -- pending | paid | failed | refunded
  installments     INTEGER DEFAULT 1,
  paid_at          TIMESTAMPTZ,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Commission splits
CREATE TABLE payment_splits (
  id          UUID PRIMARY KEY DEFAULT gen_ulid(),
  payment_id  UUID REFERENCES payments(id),
  recipient   TEXT NOT NULL, -- agency | agent | platform
  user_id     UUID REFERENCES users(id),
  amount      UUID REFERENCES users(id),
  amount_val  NUMERIC(12,2) NOT NULL,
  percentage  NUMERIC(5,2),
  status      TEXT DEFAULT 'pending',
  settled_at  TIMESTAMPTZ
);

-- Row Level Security (RLS) Configuration

-- Enable RLS on all tables
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_splits ENABLE ROW LEVEL SECURITY;

-- 1. Agencies Policies
CREATE POLICY "agencies_admin_all" ON agencies
  FOR ALL USING (
    id = (SELECT agency_id FROM users WHERE id = auth.uid())
  );

-- 2. Users Policies
CREATE POLICY "users_same_agency" ON users
  FOR ALL USING (
    agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
  );

-- 3. Clients Policies
CREATE POLICY "clients_agency_isolation" ON clients
  FOR ALL USING (
    agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
  );

-- 4. Itineraries Policies
CREATE POLICY "itineraries_agency_isolation" ON itineraries
  FOR ALL USING (
    agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "itineraries_agent_own" ON itineraries
  FOR ALL USING (
    agent_id = auth.uid() OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'agency_admin'
  );

-- 5. Bookings Policies
CREATE POLICY "bookings_agency_isolation" ON bookings
  FOR ALL USING (
    agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
  );

-- 6. Booking Flights Policies
CREATE POLICY "booking_flights_agency_isolation" ON booking_flights
  FOR ALL USING (
    booking_id IN (
      SELECT id FROM bookings WHERE agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
    )
  );

-- 7. Booking Hotels Policies
CREATE POLICY "booking_hotels_agency_isolation" ON booking_hotels
  FOR ALL USING (
    booking_id IN (
      SELECT id FROM bookings WHERE agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
    )
  );

-- 8. Payments Policies
CREATE POLICY "payments_agency_isolation" ON payments
  FOR ALL USING (
    agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
  );

-- 9. Payment Splits Policies
CREATE POLICY "payment_splits_agency_isolation" ON payment_splits
  FOR ALL USING (
    payment_id IN (
      SELECT id FROM payments WHERE agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
    )
  );
