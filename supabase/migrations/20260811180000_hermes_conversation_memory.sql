-- Memória conversacional do Hermes.
--
-- agent_actions_log (20260811120000) já audita toda AÇÃO que o Hermes
-- executa (ferramenta, input, resultado). Isso é auditoria, não memória de
-- conversa — o loop de tool-calling (runHermesAgentLoop) começa o array de
-- `messages` do zero a cada mensagem recebida, sem contexto do que foi dito
-- antes. Esta tabela guarda o histórico "humano" da conversa (pergunta e
-- resposta final, sem os passos intermediários de tool-use) por operador,
-- pra ser recarregado como contexto nas próximas chamadas ao Claude.

CREATE TABLE IF NOT EXISTS public.hermes_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hermes_messages_actor_created
  ON public.hermes_messages (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hermes_messages_workspace
  ON public.hermes_messages (workspace_id, created_at DESC);

COMMENT ON TABLE public.hermes_messages IS
  'Histórico de turnos (usuário/Hermes) por operador, usado como contexto de curto prazo nas chamadas ao Claude. Ações em si ficam auditadas em agent_actions_log.';

ALTER TABLE public.hermes_messages ENABLE ROW LEVEL SECURITY;

-- Mesmo padrão de leitura/escrita usado em agent_actions_log
-- (20260811120000_hermes_agent_actions.sql).
CREATE POLICY hermes_messages_select ON public.hermes_messages
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY hermes_messages_write ON public.hermes_messages
  FOR ALL USING (
    has_workspace_role(workspace_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'MEMBER']::membership_role[])
  );
