-- Busca por texto sem acento (comum em mensagem de WhatsApp digitada rápido,
-- principalmente vindo de cliente) não batia com o conteúdo acentuado
-- corretamente — descoberto testando o search_knowledge do Hermes.
create extension if not exists unaccent with schema extensions;

create or replace function public.knowledge_base_update_fts() returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
begin
  new.fts := to_tsvector('portuguese', extensions.unaccent(
    coalesce(new.title, '') || ' ' || coalesce(new.content, '') || ' ' || coalesce(array_to_string(new.tags, ' '), '')
  ));
  return new;
end;
$$;

-- Recalcula o fts das linhas que já existem (o trigger só roda em insert/update).
update public.knowledge_base set updated_at = updated_at;

-- Função central de busca — usada pelo Hermes (search_knowledge) e pelo
-- agente que responde clientes, os dois via .rpc() em vez de montar a query
-- de texto na mão em cada edge function. audience é filtrado pelo chamador
-- (['hermes','both'] pro Hermes, ['clients','both'] pro bot de clientes).
create or replace function public.search_knowledge_base(
  p_workspace_id uuid,
  p_query text,
  p_audiences text[],
  p_limit int default 5
)
returns table (title text, content text, category text)
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  select title, content, category
  from public.knowledge_base
  where workspace_id = p_workspace_id
    and active
    and audience = any(p_audiences)
    and fts @@ websearch_to_tsquery('portuguese', extensions.unaccent(p_query))
  order by
    ts_rank(fts, websearch_to_tsquery('portuguese', extensions.unaccent(p_query))) desc,
    importance desc
  limit p_limit;
$$;

revoke all on function public.search_knowledge_base(uuid, text, text[], int) from public, anon, authenticated;
grant execute on function public.search_knowledge_base(uuid, text, text[], int) to service_role;
