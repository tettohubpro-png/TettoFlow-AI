-- Hierarquia de acesso: must_change_password + políticas de equipe

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.must_change_password IS
  'Quando true, o usuário deve trocar a senha antes de usar o app.';

-- Garante que apenas Master (OWNER/ADMIN) gerencie memberships de terceiros
DROP POLICY IF EXISTS memberships_insert_master ON public.memberships;
DROP POLICY IF EXISTS memberships_update_master ON public.memberships;
DROP POLICY IF EXISTS memberships_delete_master ON public.memberships;

CREATE POLICY memberships_insert_master ON public.memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    has_workspace_role(workspace_id, ARRAY['OWNER'::membership_role, 'ADMIN'::membership_role])
  );

CREATE POLICY memberships_update_master ON public.memberships
  FOR UPDATE TO authenticated
  USING (
    has_workspace_role(workspace_id, ARRAY['OWNER'::membership_role, 'ADMIN'::membership_role])
  )
  WITH CHECK (
    has_workspace_role(workspace_id, ARRAY['OWNER'::membership_role, 'ADMIN'::membership_role])
  );

CREATE POLICY memberships_delete_master ON public.memberships
  FOR DELETE TO authenticated
  USING (
    has_workspace_role(workspace_id, ARRAY['OWNER'::membership_role, 'ADMIN'::membership_role])
    AND user_id <> auth.uid()
  );
