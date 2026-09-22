-- Remove o registro "Tettolino" de public.users/memberships (papel MANAGER,
-- job_role 'gerente', criado em 2026-08-14). Confirmado antes de apagar:
-- (1) não existe auth.users correspondente — nunca teve login real, o
--     papel MANAGER nunca foi de fato exercido via RLS (auth.uid() nunca
--     bateria);
-- (2) zero referências em operations/tasks/approvals/comments/
--     client_ai_memory/client_alerts/file_versions/files/history_entries/
--     notifications — nenhuma tabela de negócio aponta pra esse usuário.
-- Resíduo de teste (provavelmente da rodada de controle de acesso do mesmo
-- dia), não um membro de equipe de verdade. Pedido do dono em 2026-08-29
-- ("deixei somente o necessário").
delete from public.memberships where user_id = '19f00284-8e99-4ecf-9ad1-80d174e43ede';
delete from public.users where id = '19f00284-8e99-4ecf-9ad1-80d174e43ede';
