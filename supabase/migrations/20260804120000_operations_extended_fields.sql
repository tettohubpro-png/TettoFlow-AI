-- Campos estendidos para solicitações/operações (estilo Trello)
ALTER TABLE public.operations
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS start_date timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.operations.description IS 'Descrição detalhada da solicitação/operação';
COMMENT ON COLUMN public.operations.start_date IS 'Data de início planejada';
COMMENT ON COLUMN public.operations.metadata IS 'JSON: labels, checklist, custom_fields';
