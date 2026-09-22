-- Reset pedido pelo dono em 2026-08-17: apaga TODAS as tarefas e TODAS as
-- operações (111 no momento, todas as fases), mantendo só o cadastro de
-- clientes intacto. Backup das operações (título, cliente, status,
-- comentários, arquivos) foi salvo fora do banco antes desta migration.
-- 'files' ligados a operação são só desvinculados (operation_id = null),
-- não apagados — não faz parte do pedido apagar arquivos enviados.
update public.files set operation_id = null where operation_id is not null;
delete from public.tasks;
delete from public.operations;
