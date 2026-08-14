-- Controle de acesso: status de autorização + provedor de login usado

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS access_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS auth_provider text;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_access_status_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_access_status_check
  CHECK (access_status IN ('pending', 'active', 'blocked'));

COMMENT ON COLUMN public.users.access_status IS
  'pending = fez login mas ainda não foi autorizado pelo Master; active = tem acesso liberado; blocked = acesso negado explicitamente.';
COMMENT ON COLUMN public.users.auth_provider IS
  'Provedores de login vinculados no Auth (ex: email, google), separados por vírgula.';

-- Quem já tem vínculo de equipe/cliente é considerado ativo
UPDATE public.users u
SET access_status = 'active'
WHERE access_status = 'pending'
  AND EXISTS (SELECT 1 FROM public.memberships m WHERE m.user_id = u.id);

-- Sincroniza auth_provider sempre que uma identidade (email/google/...) é vinculada
CREATE OR REPLACE FUNCTION public.sync_user_auth_provider()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_providers text;
BEGIN
  SELECT string_agg(DISTINCT provider, ',' ORDER BY provider)
    INTO v_providers
  FROM auth.identities
  WHERE user_id = NEW.user_id;

  UPDATE public.users
    SET auth_provider = v_providers
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_identity_upsert ON auth.identities;
CREATE TRIGGER on_auth_identity_upsert
  AFTER INSERT OR UPDATE ON auth.identities
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_auth_provider();

-- bootstrap_my_workspace: não derruba mais o INSERT em public.users quando o
-- usuário está pendente/sem convite — apenas retorna NULL (sem exceção), para
-- que ele fique visível e revisável no painel de Controle de Acesso.
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
  v_provider text;
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

  SELECT string_agg(DISTINCT provider, ',' ORDER BY provider)
    INTO v_provider
  FROM auth.identities
  WHERE user_id = v_user_id;

  INSERT INTO public.users (id, name, email, auth_provider)
  VALUES (v_user_id, v_name, v_email, v_provider)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        auth_provider = COALESCE(EXCLUDED.auth_provider, public.users.auth_provider),
        updated_at = now();

  SELECT m.workspace_id
    INTO v_workspace_id
  FROM public.memberships m
  WHERE m.user_id = v_user_id
  ORDER BY m.created_at ASC
  LIMIT 1;

  IF v_workspace_id IS NOT NULL THEN
    UPDATE public.users SET access_status = 'active' WHERE id = v_user_id AND access_status <> 'active';
    RETURN v_workspace_id;
  END IF;

  SELECT COUNT(*)::integer INTO v_workspace_count FROM public.workspaces;

  IF v_workspace_count > 0 THEN
    -- Conta autenticada mas sem membership: fica pendente (ou bloqueada),
    -- visível no painel do Master. Sem exceção, sem RETURN de workspace.
    RETURN NULL;
  END IF;

  -- Instalação inicial: único workspace + OWNER
  INSERT INTO public.workspaces (name)
  VALUES (COALESCE(NULLIF(trim(p_name), ''), 'TettoHub'))
  RETURNING id INTO v_workspace_id;

  INSERT INTO public.memberships (workspace_id, user_id, role)
  VALUES (v_workspace_id, v_user_id, 'OWNER');

  UPDATE public.users SET access_status = 'active' WHERE id = v_user_id;

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
