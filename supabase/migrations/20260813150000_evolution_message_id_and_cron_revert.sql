-- 1) Guarda o ID da mensagem do WhatsApp (Evolution) pra cada linha que a
-- gente mesmo manda em conversation_messages. Permite ao webhook distinguir,
-- quando chega um evento fromMe=true, entre "eco da nossa própria resposta"
-- (o messageId bate com um que a gente já registrou) e "alguém da equipe
-- respondeu de verdade digitando direto no WhatsApp" (messageId novo) — ver
-- handlePossibleHumanReply em agent-whatsapp/index.ts.
alter table public.conversation_messages
  add column if not exists evolution_message_id text;

create index if not exists conversation_messages_evolution_id_idx
  on public.conversation_messages (evolution_message_id)
  where evolution_message_id is not null;

-- 2) Reverte o intervalo do cron de flush de 15s pra 30s (tinha sido
-- apertado junto com um teste de delay de 45s que foi descartado — o delay
-- de resposta do agente voltou a ser 90s, ver BOT_REPLY_DELAY_MS).
select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'flush-pending-bot-replies'),
  schedule := '30 seconds'
);
