-- ═══════════════════════════════════════════════════════════════════════════════
-- RUMO PLATFORM — Migration + Seed
-- Cole todo este SQL no Supabase SQL Editor e clique em "Run"
-- Dashboard: https://supabase.com/dashboard/project/xypnpnsswufjyucouneg/sql/new
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── ULID Generator ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION gen_ulid() RETURNS uuid AS $$
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

-- ─── Tabelas ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agencies (
  id          UUID PRIMARY KEY DEFAULT gen_ulid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  logo_url    TEXT,
  plan        TEXT NOT NULL DEFAULT 'starter',
  credits     INTEGER NOT NULL DEFAULT 60,
  settings    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY,
  agency_id   UUID REFERENCES agencies(id),
  role        TEXT NOT NULL DEFAULT 'agent',
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  avatar_url  TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS clients (
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

CREATE TABLE IF NOT EXISTS itineraries (
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
  status       TEXT DEFAULT 'draft',
  ai_prompt    JSONB,
  ai_response  JSONB,
  content      JSONB NOT NULL DEFAULT '{"items":[]}',
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_ulid(),
  agency_id           UUID REFERENCES agencies(id),
  itinerary_id        UUID REFERENCES itineraries(id),
  client_id           UUID REFERENCES clients(id),
  total_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency            TEXT DEFAULT 'BRL',
  status              TEXT DEFAULT 'pending',
  confirmed_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_flights (
  id             UUID PRIMARY KEY DEFAULT gen_ulid(),
  booking_id     UUID REFERENCES bookings(id),
  supplier       TEXT NOT NULL DEFAULT 'manual',
  supplier_ref   TEXT NOT NULL DEFAULT '',
  origin         TEXT NOT NULL,
  destination    TEXT NOT NULL,
  departure_at   TIMESTAMPTZ NOT NULL,
  arrival_at     TIMESTAMPTZ NOT NULL,
  airline        TEXT,
  flight_number  TEXT,
  class          TEXT,
  amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  status         TEXT DEFAULT 'confirmed',
  raw_response   JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_hotels (
  id             UUID PRIMARY KEY DEFAULT gen_ulid(),
  booking_id     UUID REFERENCES bookings(id),
  supplier       TEXT NOT NULL DEFAULT 'manual',
  supplier_ref   TEXT NOT NULL DEFAULT '',
  hotel_name     TEXT NOT NULL,
  destination    TEXT NOT NULL,
  checkin_date   DATE NOT NULL,
  checkout_date  DATE NOT NULL,
  room_type      TEXT,
  board_type     TEXT,
  guests         INTEGER NOT NULL DEFAULT 1,
  amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  status         TEXT DEFAULT 'confirmed',
  raw_response   JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id               UUID PRIMARY KEY DEFAULT gen_ulid(),
  booking_id       UUID REFERENCES bookings(id),
  agency_id        UUID REFERENCES agencies(id),
  amount           NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency         TEXT DEFAULT 'BRL',
  method           TEXT NOT NULL DEFAULT 'pix',
  provider         TEXT NOT NULL DEFAULT 'manual',
  provider_ref     TEXT,
  status           TEXT DEFAULT 'pending',
  installments     INTEGER DEFAULT 1,
  paid_at          TIMESTAMPTZ,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE agencies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE itineraries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_hotels  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments        ENABLE ROW LEVEL SECURITY;

-- Policies: agency isolation
CREATE POLICY IF NOT EXISTS "agencies_admin_all" ON agencies
  FOR ALL USING (id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS "users_same_agency" ON users
  FOR ALL USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS "clients_agency_isolation" ON clients
  FOR ALL USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS "itineraries_agency_isolation" ON itineraries
  FOR ALL USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS "bookings_agency_isolation" ON bookings
  FOR ALL USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS "payments_agency_isolation" ON payments
  FOR ALL USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

-- Policy: service_role bypasses RLS (Supabase default, no action needed)

-- ─── Seed: Agência demo ───────────────────────────────────────────────────────

INSERT INTO agencies (name, slug, logo_url, plan, credits)
VALUES (
  'Horizon Enterprise',
  'horizon-enterprise',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuByVbq23E6OnSqiaWYWht_8Baa9X5GgtucaFmgzZY6ToYLGjTPsAmpieIfEh3-ppopeJYwKzu4fAeAxnUYL07EklM_Ww_OSFKCZVESBQliejmPsC0WN9f3emDyFvsMT9HNSS9zi9pizmHOAoG7OM_vsmzl2X9nSUCNbBOaa_ECdF-O-B6cBjvH4RbcC52EPyW1rPFKQmzvk8phVG9TL_VmGtPtPQwLjanyPbZwBzCk3a2R6pHxc1dPMBikHxV1L0q9kDmCw_PFSTIW5',
  'pro',
  500
)
ON CONFLICT (slug) DO UPDATE SET
  plan = EXCLUDED.plan,
  credits = EXCLUDED.credits,
  logo_url = EXCLUDED.logo_url;

-- ─── Seed: Itinerário Roma ────────────────────────────────────────────────────

INSERT INTO itineraries (
  agency_id,
  title,
  destination,
  origin,
  start_date,
  end_date,
  travelers,
  status,
  content
)
SELECT
  id,
  'Viagem Roma Premium',
  'Roma',
  'São Paulo (GRU)',
  '2024-07-24',
  '2024-07-31',
  2,
  'confirmed',
  '{
    "items": [
      {
        "id": "item-1",
        "day": 1,
        "type": "flight",
        "title": "Voo ITA Airways",
        "subTitle": "AZ 673",
        "details": "Voo direto de São Paulo (GRU) para Roma (FCO)",
        "customSymbol": "flight",
        "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuByVbq23E6OnSqiaWYWht_8Baa9X5GgtucaFmgzZY6ToYLGjTPsAmpieIfEh3-ppopeJYwKzu4fAeAxnUYL07EklM_Ww_OSFKCZVESBQliejmPsC0WN9f3emDyFvsMT9HNSS9zi9pizmHOAoG7OM_vsmzl2X9nSUCNbBOaa_ECdF-O-B6cBjvH4RbcC52EPyW1rPFKQmzvk8phVG9TL_VmGtPtPQwLjanyPbZwBzCk3a2R6pHxc1dPMBikHxV1L0q9kDmCw_PFSTIW5",
        "meta": {
          "airline": "ITA Airways",
          "flightNumber": "AZ 673",
          "origin": "São Paulo (GRU)",
          "destination": "Roma (FCO)",
          "departureTime": "14:25",
          "arrivalTime": "06:45 (+1 dia)",
          "duration": "11h 20m"
        }
      },
      {
        "id": "item-2",
        "day": 1,
        "type": "hotel",
        "title": "Hotel Artemide Roma",
        "subTitle": "Acomodação",
        "details": "Hotel 4 estrelas no centro histórico de Roma.",
        "customSymbol": "hotel",
        "meta": {
          "address": "Via Nazionale, 22",
          "rooms": "1 Quarto Superior",
          "checkin": "15:00"
        }
      },
      {
        "id": "item-3",
        "day": 2,
        "type": "activity",
        "title": "Tour Coliseu + Foro Romano",
        "subTitle": "Visita guiada privativa",
        "details": "Acesso prioritário com guia especializado em história antiga.",
        "customSymbol": "museum",
        "meta": {
          "type": "Tour",
          "duration": "3 horas",
          "meetingPoint": "Arco de Constantino"
        }
      },
      {
        "id": "item-4",
        "day": 3,
        "type": "activity",
        "title": "Vaticano — Museus e Sistina",
        "subTitle": "Tour exclusivo ao amanhecer",
        "details": "Entrada exclusiva antes da abertura ao público.",
        "customSymbol": "museum",
        "meta": {
          "type": "Tour",
          "duration": "4 horas",
          "guide": "Incluído"
        }
      }
    ],
    "summary": "7 dias de imersão cultural em Roma com roteiro completo.",
    "highlights": ["Coliseu", "Vaticano", "Pantheon", "Fontana di Trevi", "Trastevere"]
  }'::jsonb
FROM agencies
WHERE slug = 'horizon-enterprise'
ON CONFLICT DO NOTHING;

-- ─── Seed: Itinerário Milão ────────────────────────────────────────────────────

INSERT INTO itineraries (
  agency_id,
  title,
  destination,
  origin,
  start_date,
  end_date,
  travelers,
  status,
  content
)
SELECT
  id,
  'Grand Tour de l''Italie',
  'Milão',
  'São Paulo (GRU)',
  '2025-04-01',
  '2025-04-19',
  1,
  'confirmed',
  '{
    "items": [
      {
        "id": "item-5",
        "day": 1,
        "type": "hotel",
        "title": "NH Collection Touring",
        "subTitle": "Acomodação em Milão",
        "details": "Hotel 4 estrelas premium localizado no centro de Milão.",
        "customSymbol": "hotel",
        "meta": {
          "address": "Via Iginio Ugo Tarchetti, 2",
          "rooms": "1 Quarto Duplo",
          "checkin": "15:00"
        }
      },
      {
        "id": "item-6",
        "day": 2,
        "type": "activity",
        "title": "Duomo di Milano",
        "subTitle": "Visita + terraço",
        "details": "Subida ao terraço para vista panorâmica da cidade.",
        "customSymbol": "museum",
        "meta": {
          "type": "Visita",
          "duration": "2 horas"
        }
      }
    ],
    "summary": "19 dias percorrendo Milão, Veneza e Florença.",
    "highlights": ["Duomo", "Canal Grande", "Uffizi", "Ponte Vecchio"]
  }'::jsonb
FROM agencies
WHERE slug = 'horizon-enterprise'
ON CONFLICT DO NOTHING;

-- ─── Verificar resultado ──────────────────────────────────────────────────────
SELECT 
  'agencies' AS tabela, COUNT(*) AS registros FROM agencies
UNION ALL
SELECT 'itineraries', COUNT(*) FROM itineraries
UNION ALL
SELECT 'users', COUNT(*) FROM users;
