-- Base global e curada de pontos de interesse usada pelo motor de IA.
-- O acesso acontece somente no servidor com service_role. Nenhuma policy de
-- cliente e criada de proposito: RLS bloqueia anon/authenticated por padrao.

CREATE TABLE IF NOT EXISTS public.destination_pois (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_city text NOT NULL,
  destination_country text,
  name text NOT NULL,
  provider text NOT NULL DEFAULT 'manual' CHECK (provider IN ('manual', 'openstreetmap', 'official_site')),
  provider_record_id text,
  type text NOT NULL CHECK (type IN ('restaurant', 'cafe', 'bar', 'attraction', 'viewpoint', 'park', 'market')),
  sub_type text,
  description text,
  neighborhood text,
  address text,
  latitude double precision CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  longitude double precision CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  price_range text CHECK (price_range IS NULL OR price_range IN ('$', '$$', '$$$', '$$$$')),
  tags text[] NOT NULL DEFAULT '{}',
  source text NOT NULL,
  source_ref text NOT NULL,
  manual_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  partner boolean NOT NULL DEFAULT false,
  featured_rank integer CHECK (featured_rank IS NULL OR featured_rank >= 0),
  curated boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  last_verified_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (destination_city, destination_country, name),
  UNIQUE (provider, provider_record_id)
);

CREATE INDEX IF NOT EXISTS destination_pois_city_active_idx
  ON public.destination_pois (lower(destination_city), active, curated);

CREATE INDEX IF NOT EXISTS destination_pois_type_idx
  ON public.destination_pois (type)
  WHERE active AND curated;

CREATE INDEX IF NOT EXISTS destination_pois_tags_gin_idx
  ON public.destination_pois USING gin (tags);

CREATE INDEX IF NOT EXISTS destination_pois_featured_idx
  ON public.destination_pois (partner DESC, featured_rank ASC NULLS LAST)
  WHERE active AND curated;

ALTER TABLE public.destination_pois ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.destination_pois FROM anon, authenticated;
GRANT ALL ON TABLE public.destination_pois TO service_role;

COMMENT ON TABLE public.destination_pois IS
  'POIs globais validados para grounding do gerador de roteiros. Acesso server-side somente.';
COMMENT ON COLUMN public.destination_pois.last_verified_at IS
  'Data em que existencia e dados operacionais do POI foram revisados na fonte.';
COMMENT ON COLUMN public.destination_pois.provider_record_id IS
  'Identificador estavel no provedor, por exemplo node/123, way/456 ou relation/789 no OpenStreetMap.';
COMMENT ON COLUMN public.destination_pois.manual_overrides IS
  'Dados editoriais proprios que prevalecem sobre o provedor: name, description, neighborhood, address, tags e priceRange.';
