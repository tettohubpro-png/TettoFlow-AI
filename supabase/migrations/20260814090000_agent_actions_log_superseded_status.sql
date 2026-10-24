-- Corrige o loop de "Não entendi. Confirma essa ação?" travando a conversa:
-- quando o usuário manda uma mensagem que não é claramente sim/não, a ação
-- pendente antiga é superada (não fica bloqueando pra sempre) e a mensagem
-- nova é processada normalmente pelo Tettolino.
alter table public.agent_actions_log drop constraint if exists agent_actions_log_status_check;
alter table public.agent_actions_log add constraint agent_actions_log_status_check
  check (status in ('pending_confirmation', 'confirmed', 'rejected', 'executed', 'failed', 'superseded'));

comment on column public.agent_actions_log.status is
  'pending_confirmation → aguardando "sim/não" no WhatsApp | confirmed → aprovado, ainda não rodou | executed | rejected → usuário disse não | superseded → usuário mudou de assunto sem confirmar/rejeitar explicitamente | failed';
