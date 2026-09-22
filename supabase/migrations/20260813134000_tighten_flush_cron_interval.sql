-- O delay de resposta do agente caiu de 90s pra 45s (ver
-- BOT_REPLY_DELAY_MS em agent-whatsapp/index.ts) — aperta o intervalo do
-- cron de 30s pra 15s também, senão metade do delay vira "espera pelo
-- próximo tick do cron" em vez de espera de verdade.
select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'flush-pending-bot-replies'),
  schedule := '15 seconds'
);
