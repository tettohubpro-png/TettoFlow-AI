-- Hermes: agente operacional via WhatsApp (function-calling)
--
-- Duas peças novas, ambas aditivas — não alteram dado existente:
--
-- 1. users.whatsapp_phone — identifica qual membro da equipe está mandando
--    comando pelo WhatsApp. Distinto de client_contacts.phone, que
--    identifica clientes/leads no fluxo de atendimento (agent-whatsapp
--    hoje). NULL = esse usuário não aciona o Hermes.
--
-- 2. agent_actions_log — auditoria de toda ação que o Hermes executa:
--    quem pediu, qual ferramenta, com que argumentos, se foi confirmada,
--    e o resultado.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS whatsapp_phone text;

CREATE UNIQUE INDEX IF NOT EXISTS users_whatsapp_phone_key
  ON public.users (whatsapp_phone)
  WHERE whatsapp_phone IS NOT NULL;

COMMENT ON COLUMN public.users.whatsapp_phone IS
  'Número de WhatsApp (só dígitos, com DDI) autorizado a comandar o Hermes. NULL = não usa Hermes.';

CREATE TABLE IF NOT EXISTS public.agent_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_phone text NOT NULL,
  tool_name text NOT NULL,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending_confirmation'
    CHECK (status IN ('pending_confirmation', 'confirmed', 'rejected', 'executed', 'failed')),
  result jsonb,
  error text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_actions_log_workspace
  ON public.agent_actions_log (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_actions_log_actor
  ON public.agent_actions_log (actor_user_id);

COMMENT ON TABLE public.agent_actions_log IS
  'Auditoria do Hermes: cada linha é uma ferramenta que o agente tentou executar via comando de WhatsApp.';
COMMENT ON COLUMN public.agent_actions_log.status IS
  'pending_confirmation → aguardando "sim/não" no WhatsApp | confirmed → aprovado, ainda não rodou | executed | rejected | failed';

ALTER TABLE public.agent_actions_log ENABLE ROW LEVEL SECURITY;

-- Mesmo padrão de leitura/escrita usado em conversations/conversation_messages
-- (20260806190000_conversations_inbox.sql): leitura pra qualquer membro do
-- workspace, escrita restrita aos papéis operacionais. A Edge Function usa
-- service role e ignora RLS; isso é para quando a UI ler o log depois.
CREATE POLICY agent_actions_log_select ON public.agent_actions_log
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY agent_actions_log_write ON public.agent_actions_log
  FOR ALL USING (
    has_workspace_role(workspace_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'MEMBER']::membership_role[])
  );
