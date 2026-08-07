-- Contas fixas da empresa + pagamentos de equipe (templates recorrentes)

CREATE TABLE IF NOT EXISTS public.company_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  due_day integer NOT NULL CHECK (due_day >= 1 AND due_day <= 28),
  kind text NOT NULL DEFAULT 'company'
    CHECK (kind IN ('company', 'employee')),
  category text NOT NULL DEFAULT 'subscription',
  notes text,
  active boolean NOT NULL DEFAULT true,
  employee_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_bills_workspace_idx
  ON public.company_bills (workspace_id, kind, active);

ALTER TABLE public.company_bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_bills_select ON public.company_bills;
DROP POLICY IF EXISTS company_bills_write ON public.company_bills;

CREATE POLICY company_bills_select ON public.company_bills
  FOR SELECT TO authenticated
  USING (
    has_workspace_role(
      workspace_id,
      ARRAY['OWNER'::membership_role, 'ADMIN'::membership_role, 'MANAGER'::membership_role]
    )
  );

CREATE POLICY company_bills_write ON public.company_bills
  FOR ALL TO authenticated
  USING (
    has_workspace_role(
      workspace_id,
      ARRAY['OWNER'::membership_role, 'ADMIN'::membership_role]
    )
  )
  WITH CHECK (
    has_workspace_role(
      workspace_id,
      ARRAY['OWNER'::membership_role, 'ADMIN'::membership_role]
    )
  );

-- Seed padrão (só se o workspace ainda não tiver contas da empresa)
INSERT INTO public.company_bills (workspace_id, name, amount, due_day, kind, category, notes)
SELECT
  w.id,
  s.name,
  s.amount,
  s.due_day,
  'company',
  s.category,
  s.notes
FROM public.workspaces w
CROSS JOIN (
  VALUES
    ('Aluguel', 0::numeric, 10, 'rent', 'Sede / escritório'),
    ('CapCut', 0::numeric, 15, 'subscription', 'Assinatura CapCut'),
    ('Canva', 0::numeric, 15, 'subscription', 'Assinatura Canva'),
    ('Google Drive', 0::numeric, 20, 'subscription', 'Armazenamento Google'),
    ('Claude Code', 0::numeric, 5, 'subscription', 'Assinatura Claude'),
    ('Cursor', 0::numeric, 5, 'subscription', 'Assinatura Cursor')
) AS s(name, amount, due_day, category, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.company_bills b
  WHERE b.workspace_id = w.id AND b.kind = 'company'
);
