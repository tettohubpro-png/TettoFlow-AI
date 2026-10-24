-- Campos de presença digital pro card de "Análise TettoHub" que aparece ao
-- clicar num cliente/prospect: Instagram (existe? ativo?), site, anúncios.
-- Pedido do dono em 2026-08-29, junto da varredura de prospecção.
alter table public.clients
  add column if not exists has_instagram boolean,
  add column if not exists instagram_handle text,
  add column if not exists instagram_active boolean,
  add column if not exists has_website boolean,
  add column if not exists website_url text,
  add column if not exists runs_ads boolean,
  add column if not exists digital_checked_at timestamptz;
