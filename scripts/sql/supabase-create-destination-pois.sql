-- Rumo | RAG de POIs | Supabase Development
-- Execute este arquivo inteiro no SQL Editor do projeto de desenvolvimento.
-- A carga do OpenStreetMap/Overpass e feita por script separado.

BEGIN;

CREATE TABLE IF NOT EXISTS public.destination_pois (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_city text NOT NULL,
  destination_country text,
  name text NOT NULL,
  provider text NOT NULL DEFAULT 'manual'
    CHECK (provider IN ('manual', 'openstreetmap', 'official_site')),
  provider_record_id text,
  type text NOT NULL
    CHECK (type IN ('restaurant', 'cafe', 'bar', 'attraction', 'viewpoint', 'park', 'market')),
  sub_type text,
  description text,
  neighborhood text,
  address text,
  latitude double precision
    CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  longitude double precision
    CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  price_range text
    CHECK (price_range IS NULL OR price_range IN ('$', '$$', '$$$', '$$$$')),
  tags text[] NOT NULL DEFAULT '{}',
  source text NOT NULL,
  source_ref text NOT NULL,
  manual_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  partner boolean NOT NULL DEFAULT false,
  featured_rank integer
    CHECK (featured_rank IS NULL OR featured_rank >= 0),
  curated boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  last_verified_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (destination_city, destination_country, name),
  UNIQUE (provider, provider_record_id)
);

-- Compatibilidade para quem executou uma versao anterior baseada em Google Places.
ALTER TABLE public.destination_pois
  ADD COLUMN IF NOT EXISTS provider_record_id text;
ALTER TABLE public.destination_pois
  DROP CONSTRAINT IF EXISTS destination_pois_provider_check;
ALTER TABLE public.destination_pois
  ADD CONSTRAINT destination_pois_provider_check
  CHECK (provider IN ('manual', 'openstreetmap', 'official_site'));
CREATE UNIQUE INDEX IF NOT EXISTS destination_pois_provider_record_idx
  ON public.destination_pois (provider, provider_record_id)
  WHERE provider_record_id IS NOT NULL;

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

-- A aplicacao consulta esta base exclusivamente no servidor. RLS sem policies
-- e os REVOKEs abaixo impedem acesso via anon/authenticated na Data API.
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

COMMIT;

-- Resultado esperado: rls_enabled=true, anon_select=false,
-- authenticated_select=false e service_role_select=true.
SELECT
  c.relrowsecurity AS rls_enabled,
  has_table_privilege('anon', 'public.destination_pois', 'SELECT') AS anon_select,
  has_table_privilege('authenticated', 'public.destination_pois', 'SELECT') AS authenticated_select,
  has_table_privilege('service_role', 'public.destination_pois', 'SELECT') AS service_role_select
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'destination_pois';

-- Deve listar quatro indices, alem dos indices das duas constraints UNIQUE.
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'destination_pois'
ORDER BY indexname;

-- Deve retornar zero linhas. A tabela nao deve ter policies de cliente.
SELECT policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'destination_pois';
