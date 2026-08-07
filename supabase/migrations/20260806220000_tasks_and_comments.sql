-- Quadro de Tarefas (mais leve que operations, sem cliente/aprovação) e
-- Sugestões (comentários em operações) — inspirado em funcionalidades vistas
-- num SaaS concorrente, comportamento equivalente construído do zero.

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'backlog'
    CHECK (status IN ('backlog', 'todo', 'in_progress', 'done')),
  priority TEXT NOT NULL DEFAULT 'MEDIUM'
    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  operation_id UUID REFERENCES operations(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date DATE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_workspace_status_idx ON tasks (workspace_id, status);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_select ON tasks
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY tasks_write ON tasks
  FOR ALL USING (
    has_workspace_role(workspace_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'MEMBER']::membership_role[])
  );

CREATE TABLE IF NOT EXISTS operation_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS operation_comments_operation_idx
  ON operation_comments (operation_id, created_at);

ALTER TABLE operation_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY operation_comments_select ON operation_comments
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY operation_comments_write ON operation_comments
  FOR ALL USING (
    has_workspace_role(workspace_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'MEMBER']::membership_role[])
  );
