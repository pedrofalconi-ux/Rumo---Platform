-- Adiciona os campos de logistica da viagem na tabela public.itineraries
-- Pode ser executado no Supabase SQL Editor
-- Seguro para rodar mais de uma vez por usar IF NOT EXISTS

ALTER TABLE public.itineraries
ADD COLUMN IF NOT EXISTS transportation jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS accommodations jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Verificacao rapida
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'itineraries'
  AND column_name IN ('transportation', 'accommodations')
ORDER BY column_name;
