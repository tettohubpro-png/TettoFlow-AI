-- P1: restringe work_sessions e impede bootstrap OWNER automático

-- ── work_sessions RLS ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS work_sessions_all ON public.work_sessions;
DROP POLICY IF EXISTS work_sessions_select ON public.work_sessions;
DROP POLICY IF EXISTS work_sessions_insert ON public.work_sessions;
DROP POLICY IF EXISTS work_sessions_update ON public.work_sessions;
DROP POLICY IF EXISTS work_sessions_delete ON public.work_sessions;

-- Funcionário: só as próprias sessões.
-- Master (OWNER/ADMIN): todas do workspace (relatórios de ponto).
CREATE POLICY work_sessions_select ON public.work_sessions
  FOR SELECT TO authenticated
  USING (
    is_workspace_member(workspace_id)
    AND (
      user_id = auth.uid()
      OR has_workspace_role(
        workspace_id,
        ARRAY['OWNER'::membership_role, 'ADMIN'::membership_role]
      )
    )
  );

CREATE POLICY work_sessions_insert ON public.work_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    is_workspace_member(workspace_id)
    AND user_id = auth.uid()
  );

CREATE POLICY work_sessions_update ON public.work_sessions
  FOR UPDATE TO authenticated
  USING (
    is_workspace_member(workspace_id)
    AND (
      user_id = auth.uid()
      OR has_workspace_role(
        workspace_id,
        ARRAY['OWNER'::membership_role, 'ADMIN'::membership_role]
      )
    )
  )
  WITH CHECK (
    is_workspace_member(workspace_id)
    AND (
      user_id = auth.uid()
      OR has_workspace_role(
        workspace_id,
        ARRAY['OWNER'::membership_role, 'ADMIN'::membership_role]
      )
    )
  );

CREATE POLICY work_sessions_delete ON public.work_sessions
  FOR DELETE TO authenticated
  USING (
    is_workspace_member(workspace_id)
    AND (
      user_id = auth.uid()
      OR has_workspace_role(
        workspace_id,
        ARRAY['OWNER'::membership_role, 'ADMIN'::membership_role]
      )
    )
  );

-- ── bootstrap_my_workspace ───────────────────────────────────────────────────
-- Só cria o primeiro OWNER se ainda não existir nenhum workspace.
-- Caso contrário: apenas sincroniza public.users e devolve membership existente,
-- ou falha pedindo convite do Master.
CREATE OR REPLACE FUNCTION public.bootstrap_my_workspace(p_name text DEFAULT 'TettoHub'::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_name text;
  v_workspace_id uuid;
  v_workflow_id uuid;
  v_workspace_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT u.email, COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))
    INTO v_email, v_name
  FROM auth.users u
  WHERE u.id = v_user_id;

  INSERT INTO public.users (id, name, email)
  VALUES (v_user_id, v_name, v_email)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = now();

  SELECT m.workspace_id
    INTO v_workspace_id
  FROM public.memberships m
  WHERE m.user_id = v_user_id
  ORDER BY m.created_at ASC
  LIMIT 1;

  IF v_workspace_id IS NOT NULL THEN
    RETURN v_workspace_id;
  END IF;

  SELECT COUNT(*)::integer INTO v_workspace_count FROM public.workspaces;

  IF v_workspace_count > 0 THEN
    RAISE EXCEPTION
      'Conta sem acesso. Peça ao Master para adicionar seu usuário na equipe.';
  END IF;

  -- Instalação inicial: único workspace + OWNER
  INSERT INTO public.workspaces (name)
  VALUES (COALESCE(NULLIF(trim(p_name), ''), 'TettoHub'))
  RETURNING id INTO v_workspace_id;

  INSERT INTO public.memberships (workspace_id, user_id, role)
  VALUES (v_workspace_id, v_user_id, 'OWNER');

  INSERT INTO public.workflows (workspace_id, name, is_default)
  VALUES (v_workspace_id, 'Default Operations', true)
  RETURNING id INTO v_workflow_id;

  INSERT INTO public.workflow_steps (workspace_id, workflow_id, name, position, maps_to_status)
  VALUES
    (v_workspace_id, v_workflow_id, 'Draft', 1, 'DRAFT'),
    (v_workspace_id, v_workflow_id, 'Submitted', 2, 'SUBMITTED'),
    (v_workspace_id, v_workflow_id, 'Analysis', 3, 'ANALYSIS'),
    (v_workspace_id, v_workflow_id, 'Production', 4, 'PRODUCTION'),
    (v_workspace_id, v_workflow_id, 'Review', 5, 'REVIEW'),
    (v_workspace_id, v_workflow_id, 'Client', 6, 'CLIENT'),
    (v_workspace_id, v_workflow_id, 'Approved', 7, 'APPROVED'),
    (v_workspace_id, v_workflow_id, 'Published', 8, 'PUBLISHED'),
    (v_workspace_id, v_workflow_id, 'Done', 9, 'DONE');

  RETURN v_workspace_id;
END;
$function$;
