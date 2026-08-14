-- ADR-002 Compliance Logging Tables
-- Camada 4: Auditoria de todas operações críticas

-- Tabela de logs gerais (login, logout, acesso, aprovações, etc)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('login', 'logout', 'access_denied', 'data_access', 'ai_query', 'approval', 'export', 'delete')),
  resource_type TEXT CHECK (resource_type IN ('client', 'operation', 'conversation', 'contract', 'ai_embedding')),
  resource_id UUID,
  client_id UUID REFERENCES clients(id),
  status TEXT NOT NULL CHECK (status IN ('success', 'denied', 'error')),
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_at_utc TIMESTAMPTZ GENERATED ALWAYS AS (created_at AT TIME ZONE 'UTC') STORED
);

-- RLS: team só vê seu workspace; owner vê global
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_owner_all" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  );

CREATE POLICY "audit_logs_user_own" ON audit_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_client_id ON audit_logs(client_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Tabela de queries RAG (ADR-002 Camada 2)
CREATE TABLE IF NOT EXISTS ai_rag_query_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_role TEXT NOT NULL,
  query_text_hash TEXT NOT NULL, -- SHA-256, não texto plano
  retrieved_chunk_ids UUID[] NOT NULL,
  filtered_out_count INT DEFAULT 0,
  client_scope UUID[] NOT NULL, -- clientes que o usuário podia consultar
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_rag_query_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_rag_query_logs_owner_all" ON ai_rag_query_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  );

CREATE POLICY "ai_rag_query_logs_user_own" ON ai_rag_query_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE INDEX idx_ai_rag_query_logs_user_id ON ai_rag_query_logs(user_id);
CREATE INDEX idx_ai_rag_query_logs_created_at ON ai_rag_query_logs(created_at DESC);

-- Tabela de interações IA (WhatsApp, interno, futuro Instagram)
-- Já existe migration anterior, mas aqui garantimos estrutura completa
CREATE TABLE IF NOT EXISTS ai_interaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'internal', 'instagram', 'messenger', 'email', 'telegram')),
  conversation_id UUID,
  user_id UUID REFERENCES auth.users(id), -- NULL se lead externo
  segment TEXT, -- legal, health_aesthetics, electoral, general
  intent_class TEXT,
  handoff BOOLEAN DEFAULT false,
  handoff_reason TEXT,
  model_used TEXT DEFAULT 'claude-3-5-sonnet',
  tokens_in INT,
  tokens_out INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_interaction_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_interaction_logs_owner_all" ON ai_interaction_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  );

CREATE POLICY "ai_interaction_logs_team_client" ON ai_interaction_logs
  FOR SELECT USING (
    client_id IN (
      SELECT DISTINCT client_id FROM memberships_teams
      WHERE user_id = auth.uid()
        AND client_id IS NOT NULL
    )
    OR user_id = auth.uid()
  );

CREATE INDEX idx_ai_interaction_logs_client_id ON ai_interaction_logs(client_id);
CREATE INDEX idx_ai_interaction_logs_channel ON ai_interaction_logs(channel);
CREATE INDEX idx_ai_interaction_logs_handoff ON ai_interaction_logs(handoff) WHERE handoff = true;
CREATE INDEX idx_ai_interaction_logs_created_at ON ai_interaction_logs(created_at DESC);

-- Função helper para hash SHA-256 (para queries RAG)
CREATE OR REPLACE FUNCTION sha256(text) RETURNS text AS $$
  SELECT encode(digest($1, 'sha256'), 'hex')
$$ LANGUAGE SQL IMMUTABLE;
