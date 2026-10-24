-- Permite que conversations/conversation_messages existam sem cliente
-- vinculado, pra espelhar 100% do WhatsApp da agência no Inbox do CRM —
-- inclusive conversas internas (Hermes falando com um operador da equipe,
-- ou send_message pra alguém da equipe/número avulso), que até agora não
-- apareciam em lugar nenhum da UI.

alter table public.conversations alter column client_id drop not null;
alter table public.conversation_messages alter column client_id drop not null;

alter table public.conversations
  add column if not exists kind text not null default 'client';

alter table public.conversations
  drop constraint if exists conversations_kind_check;
alter table public.conversations
  add constraint conversations_kind_check check (kind in ('client', 'internal'));

comment on column public.conversations.kind is
  'client = ligada a um cliente cadastrado. internal = conversa interna da agência (Hermes <-> operador, ou send_message pra equipe/número avulso), sem client_id.';
