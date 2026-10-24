-- Baseline: espelha objetos que já existem em produção mas nunca tinham
-- sido registrados em nenhuma migration local (drift descoberto em
-- 2026-08-27, ver PROJECT_LESSONS.md LES-0021).
--
-- Escopo desta migration: só os objetos autocontidos ligados ao pipeline
-- de status de operações — os dois enums e a trigger de transição. A
-- tabela `operations` em si (colunas, FKs pra workspaces/clients/users/
-- templates, índices, RLS policies) e o schema workspace-centric maior
-- (`workspaces`, `users`, `memberships`, `membership_role`,
-- `has_workspace_role()`) continuam sem nenhuma migration local — capturar
-- isso é a Pendência #6 de PROJECT_CONTEXT.md, não coberta aqui.
--
-- Idempotente: seguro rodar em produção, onde estes objetos já existem
-- (CREATE TYPE guardado por exceção de duplicata; função e trigger via
-- CREATE OR REPLACE / DROP+CREATE). Presume que a tabela `public.operations`
-- já existe — não recria o schema do zero.

do $$
begin
  create type public.operation_status as enum (
    'NEW', 'IN_PROGRESS', 'APPROVAL', 'REVISION', 'DONE'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.operation_priority as enum (
    'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  );
exception
  when duplicate_object then null;
end $$;

-- Trigger de transição: só permite mover o status uma etapa por vez (pra
-- frente ou pra trás) na ordem NEW → IN_PROGRESS → APPROVAL → REVISION →
-- DONE; DONE é terminal (não pode mais ser alterado).
--
-- Achado nesta sessão: o Kanban do frontend (ProjectsPage, drag-and-drop
-- entre colunas) NÃO respeita essa regra — arrastar um card 2+ colunas de
-- distância aciona esta trigger, que rejeita a transição, e o erro não é
-- mostrado ao usuário (`moveToStatus` em ProjectsPage.tsx descarta o
-- `{ error }` de `updateStatus`). O card fica preso na coluna original sem
-- feedback nenhum. Ver PROJECT_LESSONS.md LES-0021 e CHANGELOG_AI.md desta
-- data.
create or replace function public.enforce_operation_status_step()
returns trigger
language plpgsql
as $function$
declare
  statuses public.operation_status[] := array[
    'NEW', 'IN_PROGRESS', 'APPROVAL', 'REVISION', 'DONE'
  ]::public.operation_status[];
  old_i int;
  new_i int;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status = 'DONE'::public.operation_status then
    raise exception 'Status Concluída é final. Não é possível alterar.';
  end if;

  old_i := array_position(statuses, old.status);
  new_i := array_position(statuses, new.status);

  if old_i is null or new_i is null then
    raise exception 'Status de operação inválido.';
  end if;

  if abs(new_i - old_i) <> 1 then
    raise exception 'Transição de status inválida: só uma etapa para frente ou para trás.';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_operations_status_step on public.operations;
create trigger trg_operations_status_step
  before update of status on public.operations
  for each row
  execute function public.enforce_operation_status_step();
