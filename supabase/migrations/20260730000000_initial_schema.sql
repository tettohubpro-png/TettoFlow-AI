-- TettoFlow AI OS — Schema inicial Fase 0
-- ADR-001: multi-tenant lógico com client_id + RLS

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Enums
CREATE TYPE user_role AS ENUM ('owner', 'team', 'client');
CREATE TYPE client_segment AS ENUM ('legal', 'health_aesthetics', 'electoral', 'general');
CREATE TYPE client_status AS ENUM ('active', 'paused', 'churned', 'prospect');
CREATE TYPE project_status AS ENUM (
  'briefing', 'production', 'approval', 'correction', 'delivery', 'completed'
);
CREATE TYPE sensitivity_level AS ENUM ('public', 'normal', 'confidential', 'restricted');
CREATE TYPE ai_channel AS ENUM ('whatsapp', 'internal', 'instagram', 'messenger');

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  role user_role NOT NULL DEFAULT 'team',
  client_id UUID, -- preenchido apenas para role=client
  function_tags TEXT[] NOT NULL DEFAULT '{}',
  max_sensitivity sensitivity_level NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clients (CRM)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  segment client_segment NOT NULL DEFAULT 'general',
  plan TEXT,
  monthly_fee NUMERIC(12, 2) DEFAULT 0,
  status client_status NOT NULL DEFAULT 'prospect',
  whatsapp_instance TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles
  ADD CONSTRAINT profiles_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- Team membership per client
CREATE TABLE user_client_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  function_tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role_label TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE client_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE client_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Projects pipeline
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status project_status NOT NULL DEFAULT 'briefing',
  due_date DATE,
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE project_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_status project_status,
  to_status project_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WhatsApp / conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  channel ai_channel NOT NULL DEFAULT 'whatsapp',
  external_id TEXT,
  contact_phone TEXT,
  contact_name TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  handoff_required BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  is_ai BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI / RAG (ADR-002)
CREATE TABLE ai_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id UUID,
  content TEXT NOT NULL,
  embedding vector(1536),
  role_required TEXT[] NOT NULL DEFAULT ARRAY['owner', 'team'],
  sensitivity_level sensitivity_level NOT NULL DEFAULT 'normal',
  function_tags TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_rag_query_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_role TEXT,
  query_text_hash TEXT NOT NULL,
  retrieved_chunk_ids UUID[] NOT NULL DEFAULT '{}',
  filtered_out_count INT NOT NULL DEFAULT 0,
  client_scope UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_interaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  channel ai_channel NOT NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id),
  segment client_segment,
  intent_class TEXT,
  handoff BOOLEAN NOT NULL DEFAULT false,
  handoff_reason TEXT,
  model_used TEXT,
  tokens_in INT,
  tokens_out INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  client_id UUID REFERENCES clients(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_contacts_client ON contacts(client_id);
CREATE INDEX idx_memberships_user ON user_client_memberships(user_id);
CREATE INDEX idx_memberships_client ON user_client_memberships(client_id);
CREATE INDEX idx_conversations_client ON conversations(client_id);
CREATE INDEX idx_ai_embeddings_client ON ai_embeddings(client_id);
CREATE INDEX idx_ai_embeddings_sensitivity ON ai_embeddings(sensitivity_level);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'team')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS helpers
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION my_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION allowed_client_ids()
RETURNS SETOF UUID AS $$
  SELECT c.id FROM clients c WHERE is_owner()
  UNION
  SELECT m.client_id FROM user_client_memberships m WHERE m.user_id = auth.uid()
  UNION
  SELECT p.client_id FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'client' AND p.client_id IS NOT NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION can_access_client(target_client_id UUID)
RETURNS BOOLEAN AS $$
  SELECT target_client_id IN (SELECT allowed_client_ids());
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_client_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_rag_query_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY profiles_select ON profiles FOR SELECT USING (
  id = auth.uid() OR is_owner()
);
CREATE POLICY profiles_update_self ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY profiles_owner_all ON profiles FOR ALL USING (is_owner());

-- Clients policies
CREATE POLICY clients_select ON clients FOR SELECT USING (can_access_client(id));
CREATE POLICY clients_insert ON clients FOR INSERT WITH CHECK (is_owner() OR my_role() = 'team');
CREATE POLICY clients_update ON clients FOR UPDATE USING (can_access_client(id));
CREATE POLICY clients_delete ON clients FOR DELETE USING (is_owner());

-- Memberships
CREATE POLICY memberships_select ON user_client_memberships FOR SELECT USING (
  user_id = auth.uid() OR is_owner()
);
CREATE POLICY memberships_owner ON user_client_memberships FOR ALL USING (is_owner());

-- Contacts, files, history
CREATE POLICY contacts_all ON contacts FOR ALL USING (can_access_client(client_id));
CREATE POLICY client_files_all ON client_files FOR ALL USING (can_access_client(client_id));
CREATE POLICY client_history_all ON client_history FOR ALL USING (can_access_client(client_id));

-- Projects
CREATE POLICY projects_all ON projects FOR ALL USING (can_access_client(client_id));

CREATE POLICY project_log_select ON project_status_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND can_access_client(p.client_id))
);
CREATE POLICY project_log_insert ON project_status_log FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND can_access_client(p.client_id))
);

-- Conversations
CREATE POLICY conversations_all ON conversations FOR ALL USING (can_access_client(client_id));
CREATE POLICY messages_all ON conversation_messages FOR ALL USING (can_access_client(client_id));

-- AI tables — owner + team with client access; embeddings read filtered in app layer too
CREATE POLICY ai_embeddings_select ON ai_embeddings FOR SELECT USING (
  is_owner() OR (client_id IS NOT NULL AND can_access_client(client_id))
);
CREATE POLICY ai_embeddings_owner ON ai_embeddings FOR ALL USING (is_owner());

CREATE POLICY ai_logs_select ON ai_interaction_logs FOR SELECT USING (
  is_owner() OR (client_id IS NOT NULL AND can_access_client(client_id))
);
CREATE POLICY ai_logs_insert ON ai_interaction_logs FOR INSERT WITH CHECK (true);

CREATE POLICY rag_logs_owner ON ai_rag_query_logs FOR SELECT USING (is_owner() OR user_id = auth.uid());
CREATE POLICY rag_logs_insert ON ai_rag_query_logs FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY audit_owner ON audit_log FOR SELECT USING (is_owner());
CREATE POLICY audit_insert ON audit_log FOR INSERT WITH CHECK (user_id = auth.uid());
