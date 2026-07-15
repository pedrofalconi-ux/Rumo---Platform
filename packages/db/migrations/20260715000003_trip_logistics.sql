ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS transportation jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS accommodations jsonb NOT NULL DEFAULT '[]'::jsonb;
