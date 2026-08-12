-- Delay de 90s antes do agente responder o cliente automaticamente — dá
-- tempo do social media responder pessoalmente primeiro. Se alguém da
-- equipe já respondeu nesse meio tempo (pelo CRM ou pelo próprio WhatsApp),
-- a resposta engatilhada da IA é cancelada em vez de sair duplicada.
create table public.pending_bot_replies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  phone text not null,
  instance text,
  reply_text text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'skipped', 'superseded', 'failed')),
  send_after timestamptz not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index pending_bot_replies_flush_idx
  on public.pending_bot_replies (status, send_after)
  where status = 'pending';

create index pending_bot_replies_conversation_idx
  on public.pending_bot_replies (conversation_id, status);

alter table public.pending_bot_replies enable row level security;

-- Só a service_role (edge functions) lê/escreve aqui — é estado interno do
-- agente, não precisa aparecer pra ninguém pela UI.
create policy pending_bot_replies_service_only
  on public.pending_bot_replies for all
  using (false)
  with check (false);

-- Agenda a checagem/envio a cada 30s via pg_net chamando a edge function
-- flush-pending-replies. Autenticação com a chave anon (pública, já vai
-- embutida no bundle do frontend) — o pior cenário de uso indevido é
-- alguém disparar o flush um pouco antes da hora, nada sensível.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'flush-pending-bot-replies',
  '30 seconds',
  $$
  select net.http_post(
    url := 'https://lniinjegcvdcrmsrzqkt.supabase.co/functions/v1/flush-pending-replies',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaWluamVnY3ZkY3Jtc3J6cWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NjgwODQsImV4cCI6MjA5OTQ0NDA4NH0.pJNSv8tLRrkxZPhH58U6QyIvKM3jVXuW08ByDiaYlDE',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaWluamVnY3ZkY3Jtc3J6cWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NjgwODQsImV4cCI6MjA5OTQ0NDA4NH0.pJNSv8tLRrkxZPhH58U6QyIvKM3jVXuW08ByDiaYlDE'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 8000
  );
  $$
);
