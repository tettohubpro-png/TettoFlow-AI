-- Funil de Prospecção + distinção Cliente/Parceiro + trava de duplicidade
-- em client_ai_memory. Pedido do dono em 2026-08-29.

-- Trava duplicidade de campo de briefing (já duplicou 1x nesta sessão,
-- ver PROJECT_LESSONS.md).
alter table public.client_ai_memory
  add constraint client_ai_memory_client_title_key unique (client_id, title);

-- Distingue cliente pagante de parceiro (permuta/sem contrato monetário).
do $$
begin
  create type public.client_type as enum ('CLIENT', 'PARTNER');
exception
  when duplicate_object then null;
end $$;

alter table public.clients
  add column if not exists client_type public.client_type not null default 'CLIENT';

-- Funil de prospecção: Prospecção → Contatado → Interessado →
-- Proposta Enviada → Convertido, com estado paralelo Perdido (motivo).
-- Reaproveita a própria tabela clients (zero duplicação de cadastro ao
-- converter) — clientes já existentes (reais) entram como 'WON' por
-- padrão, só prospects novos começam em 'PROSPECT'.
do $$
begin
  create type public.client_pipeline_stage as enum (
    'PROSPECT', 'CONTACTED', 'INTERESTED', 'PROPOSAL_SENT', 'WON', 'LOST'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.client_lost_reason as enum (
    'NO_INTEREST', 'HAS_AGENCY', 'NO_BUDGET', 'NO_RESPONSE', 'OTHER'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.clients
  add column if not exists pipeline_stage public.client_pipeline_stage not null default 'WON',
  add column if not exists lost_reason public.client_lost_reason,
  add column if not exists next_follow_up_date date,
  add column if not exists prospected_by uuid references public.users(id) on delete set null,
  add column if not exists prospected_at timestamptz not null default now();

create index if not exists idx_clients_pipeline_stage
  on public.clients (workspace_id, pipeline_stage)
  where pipeline_stage <> 'WON';

-- Marca os parceiros já confirmados pelo dono (permuta ou sem contrato
-- monetário) — clientes pagantes continuam CLIENT (padrão).
update public.clients set client_type = 'PARTNER'
where id in (
  'cc662936-9434-447f-8157-e503c84f1d98', -- Bom Corte
  'b6219bda-5dea-48bf-9665-5895a7026456', -- Arq. Jefferson Teixeira
  'e302a90a-dbc8-4a95-b029-be111be2465c', -- Clínica Dos Óculos
  'ec9a481d-c25e-45dc-8bb3-3f1d6455da03', -- JotaBikeShop
  'b7eeee7c-bc23-46ff-aa33-20994cae92ef', -- Vagner Miranda
  '8f363556-b018-48e1-ba6f-9c933e31f92b'  -- Seu Churras
);
