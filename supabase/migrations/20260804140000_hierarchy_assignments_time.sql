-- Hierarquia, atribuições por cliente, alertas e controle de tempo

ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS job_role text;

COMMENT ON COLUMN public.memberships.job_role IS
  'Especialidade: gerente | gestor | social_media | design | videomaker | photographer | video_editor | traffic';

CREATE TABLE IF NOT EXISTS public.client_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  department text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, department)
);

CREATE INDEX IF NOT EXISTS idx_client_assignments_workspace
  ON public.client_assignments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_user
  ON public.client_assignments(user_id);

CREATE TABLE IF NOT EXISTS public.client_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'gmail')),
  alert_type text NOT NULL CHECK (alert_type IN ('monthly_report', 'schedule', 'themes')),
  subject text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'queued', 'sent', 'failed')),
  created_by uuid REFERENCES public.users(id),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_alerts_workspace
  ON public.client_alerts(workspace_id);

CREATE TABLE IF NOT EXISTS public.work_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  operation_id uuid REFERENCES public.operations(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  department text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_minutes integer,
  summary text,
  deliverables jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_sessions_workspace_user
  ON public.work_sessions(workspace_id, user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.project_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_activity_workspace
  ON public.project_activity(workspace_id, created_at DESC);

ALTER TABLE public.client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_activity ENABLE ROW LEVEL SECURITY;
