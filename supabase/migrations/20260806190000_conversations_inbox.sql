-- Inbox de mensagens (WhatsApp) — thread real por cliente/telefone.
--
-- `conversations`/`conversation_messages` já existiam desenhadas em
-- 20260730000000_initial_schema.sql mas nunca foram aplicadas no banco real
-- (confirmado via information_schema antes desta migration — só client_ai_memory
-- existe hoje). Esta migration recria as duas com workspace_id em ambas, pra
-- ficar consistente com o padrão de RLS usado no resto do schema atual
-- (client_ai_memory, operations, client_contacts todos filtram por workspace_id
-- direto, não via join em client_id).

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  contact_phone TEXT,
  contact_name TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  handoff_required BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Uma conversa por cliente+canal+telefone (o agent-whatsapp faz find-or-create
-- nessa combinação a cada mensagem).
CREATE UNIQUE INDEX IF NOT EXISTS conversations_client_channel_phone_key
  ON conversations (client_id, channel, contact_phone);

CREATE INDEX IF NOT EXISTS conversations_workspace_last_message_idx
  ON conversations (workspace_id, last_message_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  is_ai BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversation_messages_conversation_created_idx
  ON conversation_messages (conversation_id, created_at);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- Mesmo padrão de client_ai_memory_all / operations_select já em produção:
-- leitura pra qualquer membro do workspace, escrita pra OWNER/ADMIN/MANAGER/MEMBER.
CREATE POLICY conversations_select ON conversations
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY conversations_write ON conversations
  FOR ALL USING (
    has_workspace_role(workspace_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'MEMBER']::membership_role[])
  );

CREATE POLICY conversation_messages_select ON conversation_messages
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY conversation_messages_write ON conversation_messages
  FOR ALL USING (
    has_workspace_role(workspace_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'MEMBER']::membership_role[])
  );
