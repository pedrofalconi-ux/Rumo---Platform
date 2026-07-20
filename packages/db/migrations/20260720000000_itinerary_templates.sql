-- Smart itinerary templates: tenant-scoped blueprints, version history and RAG.
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.itinerary_templates (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 160),
  destination text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  suggested_duration_days integer NOT NULL DEFAULT 1 CHECK (suggested_duration_days BETWEEN 1 AND 120),
  budget_range text NOT NULL DEFAULT 'moderate' CHECK (budget_range IN ('budget', 'moderate', 'luxury')),
  pace text NOT NULL DEFAULT 'moderate' CHECK (pace IN ('slow', 'moderate', 'fast')),
  traveler_profile text NOT NULL DEFAULT 'leisure',
  language text NOT NULL DEFAULT 'pt-BR',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  tags text[] NOT NULL DEFAULT '{}',
  settings jsonb NOT NULL DEFAULT '{"allowAiAdaptation":true,"visibility":"agency"}'::jsonb,
  parent_template_id uuid REFERENCES public.itinerary_templates(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (parent_template_id IS NULL OR parent_template_id <> id)
);

CREATE TABLE IF NOT EXISTS public.template_days (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  template_id uuid NOT NULL REFERENCES public.itinerary_templates(id) ON DELETE CASCADE,
  day_number integer NOT NULL CHECK (day_number BETWEEN 1 AND 120),
  title text NOT NULL DEFAULT '',
  rain_alternatives text NOT NULL DEFAULT '',
  meals_recommendation jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, day_number)
);

CREATE TABLE IF NOT EXISTS public.template_blocks (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  template_id uuid NOT NULL REFERENCES public.itinerary_templates(id) ON DELETE CASCADE,
  day_number integer NOT NULL CHECK (day_number BETWEEN 1 AND 120),
  item_order integer NOT NULL DEFAULT 0 CHECK (item_order >= 0),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'activity',
  poi_id uuid REFERENCES public.destination_pois(id) ON DELETE SET NULL,
  period text NOT NULL DEFAULT 'morning' CHECK (period IN ('morning', 'afternoon', 'night', 'any')),
  duration_minutes integer CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 5 AND 1440),
  is_required boolean NOT NULL DEFAULT false,
  estimated_cost numeric(12,2) CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
  agency_notes text NOT NULL DEFAULT '',
  ai_instructions text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.template_rules (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  template_id uuid NOT NULL REFERENCES public.itinerary_templates(id) ON DELETE CASCADE,
  rule_type text NOT NULL CHECK (rule_type IN ('dont_combine', 'max_distance', 'restricted_age', 'required', 'custom')),
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.template_documents (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  template_id uuid NOT NULL REFERENCES public.itinerary_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_url text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  embedding_status text NOT NULL DEFAULT 'pending' CHECK (embedding_status IN ('pending', 'processing', 'ready', 'failed')),
  chunk_count integer NOT NULL DEFAULT 0 CHECK (chunk_count >= 0),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.template_document_chunks (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  document_id uuid NOT NULL REFERENCES public.template_documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL CHECK (chunk_index >= 0),
  content text NOT NULL CHECK (char_length(content) > 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  embedding extensions.vector(1536),
  token_count integer NOT NULL DEFAULT 0 CHECK (token_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);

CREATE TABLE IF NOT EXISTS public.template_versions (
  id uuid PRIMARY KEY DEFAULT public.gen_ulid(),
  template_id uuid NOT NULL REFERENCES public.itinerary_templates(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  version_label text NOT NULL,
  changes_summary text NOT NULL DEFAULT '',
  snapshot_data jsonb NOT NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, version_number)
);

CREATE INDEX IF NOT EXISTS itinerary_templates_agency_active_idx
  ON public.itinerary_templates (agency_id, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS itinerary_templates_filters_idx
  ON public.itinerary_templates (agency_id, destination, traveler_profile, budget_range, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS itinerary_templates_tags_gin_idx ON public.itinerary_templates USING gin (tags);
CREATE INDEX IF NOT EXISTS itinerary_templates_parent_idx ON public.itinerary_templates (parent_template_id) WHERE parent_template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS template_days_template_idx ON public.template_days (template_id, day_number);
CREATE INDEX IF NOT EXISTS template_blocks_template_day_idx ON public.template_blocks (template_id, day_number, item_order);
CREATE INDEX IF NOT EXISTS template_blocks_poi_idx ON public.template_blocks (poi_id) WHERE poi_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS template_rules_template_idx ON public.template_rules (template_id);
CREATE INDEX IF NOT EXISTS template_documents_template_idx ON public.template_documents (template_id);
CREATE INDEX IF NOT EXISTS template_document_chunks_document_idx ON public.template_document_chunks (document_id, chunk_index);
CREATE INDEX IF NOT EXISTS template_document_chunks_embedding_hnsw_idx
  ON public.template_document_chunks USING hnsw (embedding extensions.vector_cosine_ops) WHERE embedding IS NOT NULL;
CREATE INDEX IF NOT EXISTS template_versions_template_idx ON public.template_versions (template_id, version_number DESC);

DROP TRIGGER IF EXISTS itinerary_templates_updated_at ON public.itinerary_templates;
CREATE TRIGGER itinerary_templates_updated_at BEFORE UPDATE ON public.itinerary_templates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS template_days_updated_at ON public.template_days;
CREATE TRIGGER template_days_updated_at BEFORE UPDATE ON public.template_days
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS template_blocks_updated_at ON public.template_blocks;
CREATE TRIGGER template_blocks_updated_at BEFORE UPDATE ON public.template_blocks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS template_rules_updated_at ON public.template_rules;
CREATE TRIGGER template_rules_updated_at BEFORE UPDATE ON public.template_rules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS template_documents_updated_at ON public.template_documents;
CREATE TRIGGER template_documents_updated_at BEFORE UPDATE ON public.template_documents
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.itinerary_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_agency_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT agency_id FROM public.users WHERE id = (SELECT auth.uid()) AND deleted_at IS NULL LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_user_agency_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_agency_id() TO authenticated, service_role;

DROP POLICY IF EXISTS templates_agency_select ON public.itinerary_templates;
DROP POLICY IF EXISTS templates_agency_insert ON public.itinerary_templates;
DROP POLICY IF EXISTS templates_agency_update ON public.itinerary_templates;
DROP POLICY IF EXISTS templates_agency_delete ON public.itinerary_templates;
DROP POLICY IF EXISTS template_days_agency_all ON public.template_days;
DROP POLICY IF EXISTS template_blocks_agency_all ON public.template_blocks;
DROP POLICY IF EXISTS template_rules_agency_all ON public.template_rules;
DROP POLICY IF EXISTS template_documents_agency_all ON public.template_documents;
DROP POLICY IF EXISTS template_chunks_agency_all ON public.template_document_chunks;
DROP POLICY IF EXISTS template_versions_agency_all ON public.template_versions;

CREATE POLICY templates_agency_select ON public.itinerary_templates FOR SELECT TO authenticated
USING (agency_id = (SELECT public.current_user_agency_id()) AND deleted_at IS NULL);
CREATE POLICY templates_agency_insert ON public.itinerary_templates FOR INSERT TO authenticated
WITH CHECK (agency_id = (SELECT public.current_user_agency_id()) AND created_by = (SELECT auth.uid()));
CREATE POLICY templates_agency_update ON public.itinerary_templates FOR UPDATE TO authenticated
USING (agency_id = (SELECT public.current_user_agency_id()))
WITH CHECK (agency_id = (SELECT public.current_user_agency_id()));
CREATE POLICY templates_agency_delete ON public.itinerary_templates FOR DELETE TO authenticated
USING (agency_id = (SELECT public.current_user_agency_id()));

CREATE POLICY template_days_agency_all ON public.template_days FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.itinerary_templates t WHERE t.id = template_id AND t.agency_id = (SELECT public.current_user_agency_id()) AND t.deleted_at IS NULL))
WITH CHECK (EXISTS (SELECT 1 FROM public.itinerary_templates t WHERE t.id = template_id AND t.agency_id = (SELECT public.current_user_agency_id()) AND t.deleted_at IS NULL));
CREATE POLICY template_blocks_agency_all ON public.template_blocks FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.itinerary_templates t WHERE t.id = template_id AND t.agency_id = (SELECT public.current_user_agency_id()) AND t.deleted_at IS NULL))
WITH CHECK (EXISTS (SELECT 1 FROM public.itinerary_templates t WHERE t.id = template_id AND t.agency_id = (SELECT public.current_user_agency_id()) AND t.deleted_at IS NULL));
CREATE POLICY template_rules_agency_all ON public.template_rules FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.itinerary_templates t WHERE t.id = template_id AND t.agency_id = (SELECT public.current_user_agency_id()) AND t.deleted_at IS NULL))
WITH CHECK (EXISTS (SELECT 1 FROM public.itinerary_templates t WHERE t.id = template_id AND t.agency_id = (SELECT public.current_user_agency_id()) AND t.deleted_at IS NULL));
CREATE POLICY template_documents_agency_all ON public.template_documents FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.itinerary_templates t WHERE t.id = template_id AND t.agency_id = (SELECT public.current_user_agency_id()) AND t.deleted_at IS NULL))
WITH CHECK (EXISTS (SELECT 1 FROM public.itinerary_templates t WHERE t.id = template_id AND t.agency_id = (SELECT public.current_user_agency_id()) AND t.deleted_at IS NULL));
CREATE POLICY template_chunks_agency_all ON public.template_document_chunks FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.template_documents d JOIN public.itinerary_templates t ON t.id = d.template_id WHERE d.id = document_id AND t.agency_id = (SELECT public.current_user_agency_id()) AND t.deleted_at IS NULL))
WITH CHECK (EXISTS (SELECT 1 FROM public.template_documents d JOIN public.itinerary_templates t ON t.id = d.template_id WHERE d.id = document_id AND t.agency_id = (SELECT public.current_user_agency_id()) AND t.deleted_at IS NULL));
CREATE POLICY template_versions_agency_all ON public.template_versions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.itinerary_templates t WHERE t.id = template_id AND t.agency_id = (SELECT public.current_user_agency_id()) AND t.deleted_at IS NULL))
WITH CHECK (EXISTS (SELECT 1 FROM public.itinerary_templates t WHERE t.id = template_id AND t.agency_id = (SELECT public.current_user_agency_id()) AND t.deleted_at IS NULL));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.itinerary_templates, public.template_days, public.template_blocks,
  public.template_rules, public.template_documents, public.template_document_chunks, public.template_versions TO authenticated;
GRANT ALL ON public.itinerary_templates, public.template_days, public.template_blocks, public.template_rules,
  public.template_documents, public.template_document_chunks, public.template_versions TO service_role;
REVOKE ALL ON public.itinerary_templates, public.template_days, public.template_blocks, public.template_rules,
  public.template_documents, public.template_document_chunks, public.template_versions FROM anon;

CREATE OR REPLACE FUNCTION public.match_template_document_chunks(
  p_template_id uuid,
  p_agency_id uuid,
  p_query_embedding extensions.vector(1536),
  p_match_count integer DEFAULT 6
)
RETURNS TABLE (content text, similarity double precision, document_name text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT c.content,
    1 - (c.embedding OPERATOR(extensions.<=>) p_query_embedding) AS similarity,
    d.name AS document_name
  FROM public.template_document_chunks c
  JOIN public.template_documents d ON d.id = c.document_id
  JOIN public.itinerary_templates t ON t.id = d.template_id
  WHERE t.id = p_template_id
    AND t.agency_id = p_agency_id
    AND t.deleted_at IS NULL
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding OPERATOR(extensions.<=>) p_query_embedding
  LIMIT LEAST(GREATEST(p_match_count, 1), 12)
$$;
REVOKE ALL ON FUNCTION public.match_template_document_chunks(uuid, uuid, extensions.vector, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_template_document_chunks(uuid, uuid, extensions.vector, integer) TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('template-documents', 'template-documents', false, 15728640, ARRAY[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain'
]) ON CONFLICT (id) DO NOTHING;
