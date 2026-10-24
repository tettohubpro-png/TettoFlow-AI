-- Base de conhecimento da agência: políticas, preços, procedimentos, scripts,
-- FAQ — texto livre que o Hermes (assistente interno) e o agente que
-- responde clientes no WhatsApp podem buscar antes de responder, em vez de
-- inventar ou dizer "não sei". "audience" controla quem pode ver cada
-- entrada: 'hermes' fica só interno, 'clients' só pro bot de clientes,
-- 'both' pros dois.
create table public.knowledge_base (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  content text not null,
  category text not null default 'GENERAL'
    check (category in ('POLICY', 'PRICING', 'PROCEDURE', 'FAQ', 'SERVICE', 'BRAND', 'GENERAL')),
  tags text[] not null default '{}',
  audience text not null default 'both' check (audience in ('hermes', 'clients', 'both')),
  importance smallint not null default 5,
  active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fts tsvector
);

create index knowledge_base_workspace_idx on public.knowledge_base (workspace_id, active);
create index knowledge_base_fts_idx on public.knowledge_base using gin (fts);

-- to_tsvector não é IMMUTABLE (não pode ir direto numa generated column) —
-- mantém o fts atualizado via trigger em vez disso.
create or replace function public.knowledge_base_update_fts() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.fts := to_tsvector('portuguese',
    coalesce(new.title, '') || ' ' || coalesce(new.content, '') || ' ' || coalesce(array_to_string(new.tags, ' '), '')
  );
  return new;
end;
$$;

create trigger knowledge_base_fts_trigger
  before insert or update on public.knowledge_base
  for each row execute function public.knowledge_base_update_fts();

alter table public.knowledge_base enable row level security;

-- Mesmo padrão do client_ai_memory: qualquer membro do workspace lê, só
-- MANAGER pra cima escreve/edita/apaga.
create policy knowledge_base_all
  on public.knowledge_base for all
  using (has_workspace_role(workspace_id, array['OWNER','ADMIN','MANAGER','MEMBER']::membership_role[]))
  with check (has_workspace_role(workspace_id, array['OWNER','ADMIN','MANAGER']::membership_role[]));
