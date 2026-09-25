-- Real persistence for the traveler mobile app's diary, expenses, and chat.
-- Previously these were in-memory mock data (apps/mobile/src/hooks/use-traveler-store.ts)
-- and never survived an app restart.
--
-- trip_id is stored as plain text, NOT a foreign key to itineraries(id): itineraries is
-- currently a hybrid of real Postgres rows (uuid ids) and legacy JSON-file rows (ids like
-- "HOR-9921"), so a hard FK would break for any trip that hasn't been migrated to Postgres
-- yet. Authorization is enforced in the API layer (apps/web/app/api/traveler/*), which
-- already checks trip access via traveler_trip_access before reading/writing these tables.

CREATE TABLE IF NOT EXISTS public.diary_entries (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trip_id text NOT NULL,
  day integer NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS diary_entries_user_trip_idx
  ON public.diary_entries (user_id, trip_id, day);

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trip_id text NOT NULL,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  category text NOT NULL DEFAULT 'outro',
  expense_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS expenses_user_trip_idx
  ON public.expenses (user_id, trip_id, expense_date);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  trip_id text NOT NULL,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  sender_name text NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('traveler', 'agent')),
  body text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  sent_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_trip_idx
  ON public.chat_messages (trip_id, sent_at);

ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Diary and expenses are private to the traveler who wrote them.
DROP POLICY IF EXISTS diary_entries_owner ON public.diary_entries;
CREATE POLICY diary_entries_owner ON public.diary_entries
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS expenses_owner ON public.expenses;
CREATE POLICY expenses_owner ON public.expenses
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Chat is shared between the traveler on the trip and the agency's own agents.
DROP POLICY IF EXISTS chat_messages_traveler ON public.chat_messages;
CREATE POLICY chat_messages_traveler ON public.chat_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.traveler_trip_access access
      WHERE access.trip_id::text = chat_messages.trip_id
        AND access.agency_id = chat_messages.agency_id
        AND access.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.traveler_trip_access access
      WHERE access.trip_id::text = chat_messages.trip_id
        AND access.agency_id = chat_messages.agency_id
        AND access.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS chat_messages_agency ON public.chat_messages;
CREATE POLICY chat_messages_agency ON public.chat_messages
  FOR ALL TO authenticated
  USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));
