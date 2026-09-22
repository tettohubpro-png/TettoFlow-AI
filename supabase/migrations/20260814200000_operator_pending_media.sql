-- Quando um operador manda foto(s) pro Tettolino SEM legenda (comum: WhatsApp manda
-- várias fotos selecionadas juntas como mensagens separadas, cada uma sem legenda, e
-- a legenda/instrução vem depois como texto puro) — guarda aqui até a instrução chegar.
create table public.operator_pending_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  message_id text not null,
  instance text,
  received_at timestamptz not null default now()
);

create index operator_pending_media_user_idx on public.operator_pending_media (user_id, received_at);

alter table public.operator_pending_media enable row level security;

-- Só a service_role (edge function) mexe aqui — estado interno do agente.
create policy operator_pending_media_service_only
  on public.operator_pending_media for all
  using (false)
  with check (false);
