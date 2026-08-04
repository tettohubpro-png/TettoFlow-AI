DROP POLICY IF EXISTS client_assignments_all ON public.client_assignments;
DROP POLICY IF EXISTS client_alerts_all ON public.client_alerts;
DROP POLICY IF EXISTS work_sessions_all ON public.work_sessions;
DROP POLICY IF EXISTS project_activity_all ON public.project_activity;

CREATE POLICY client_assignments_all ON public.client_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY client_alerts_all ON public.client_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY work_sessions_all ON public.work_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY project_activity_all ON public.project_activity FOR ALL TO authenticated USING (true) WITH CHECK (true);
