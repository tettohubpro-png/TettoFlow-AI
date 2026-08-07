-- Permite ver colegas do mesmo workspace (Equipe / responsáveis / ponto)

DROP POLICY IF EXISTS users_select_workspace_peers ON public.users;

CREATE POLICY users_select_workspace_peers ON public.users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.memberships me
      JOIN public.memberships peer
        ON peer.workspace_id = me.workspace_id
      WHERE me.user_id = auth.uid()
        AND peer.user_id = users.id
    )
  );
