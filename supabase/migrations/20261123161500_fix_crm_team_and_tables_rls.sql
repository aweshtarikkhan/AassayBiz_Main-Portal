-- Fix CRM team and CRM tables RLS to use user_has_org_access
CREATE OR REPLACE FUNCTION public.user_has_org_access(_org_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.organizations WHERE id = _org_id AND owner_id = _user_id
      UNION ALL
      SELECT 1 FROM public.organization_members WHERE org_id = _org_id AND user_id = _user_id
      UNION ALL
      SELECT 1 FROM public.profiles WHERE user_id = _user_id AND org_id = _org_id
      UNION ALL
      SELECT 1 FROM public.crm_team WHERE org_id = _org_id AND auth_user_id = _user_id
      UNION ALL
      SELECT 1 FROM public.employees WHERE org_id = _org_id AND auth_user_id = _user_id
    )
  END;
$$;

GRANT EXECUTE ON FUNCTION public.user_has_org_access(uuid, uuid) TO authenticated, anon, service_role;

-- 2. Update crm_team policies
ALTER TABLE public.crm_team ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view crm_team in their org" ON public.crm_team;
CREATE POLICY "Users can view crm_team in their org"
    ON public.crm_team FOR SELECT
    TO authenticated
    USING (
      public.user_has_org_access(org_id, auth.uid())
      OR org_id = public.get_user_org_id()
    );

DROP POLICY IF EXISTS "Users can insert crm_team in their org" ON public.crm_team;
CREATE POLICY "Users can insert crm_team in their org"
    ON public.crm_team FOR INSERT
    TO authenticated
    WITH CHECK (
      public.user_has_org_access(org_id, auth.uid())
      OR org_id = public.get_user_org_id()
    );

DROP POLICY IF EXISTS "Users can update crm_team in their org" ON public.crm_team;
CREATE POLICY "Users can update crm_team in their org"
    ON public.crm_team FOR UPDATE
    TO authenticated
    USING (
      public.user_has_org_access(org_id, auth.uid())
      OR org_id = public.get_user_org_id()
    )
    WITH CHECK (
      public.user_has_org_access(org_id, auth.uid())
      OR org_id = public.get_user_org_id()
    );

DROP POLICY IF EXISTS "Users can delete crm_team in their org" ON public.crm_team;
CREATE POLICY "Users can delete crm_team in their org"
    ON public.crm_team FOR DELETE
    TO authenticated
    USING (
      public.user_has_org_access(org_id, auth.uid())
      OR org_id = public.get_user_org_id()
    );

-- 3. Update leads, opportunities, activities, pipeline_stages policies
DROP POLICY IF EXISTS "leads_org_sel" ON public.leads;
DROP POLICY IF EXISTS "leads_org_mod" ON public.leads;
CREATE POLICY "leads_org_sel" ON public.leads FOR SELECT TO authenticated
    USING (public.user_has_org_access(org_id, auth.uid()) OR org_id = public.get_user_org_id());
CREATE POLICY "leads_org_mod" ON public.leads FOR ALL TO authenticated
    USING (public.user_has_org_access(org_id, auth.uid()) OR org_id = public.get_user_org_id())
    WITH CHECK (public.user_has_org_access(org_id, auth.uid()) OR org_id = public.get_user_org_id());

DROP POLICY IF EXISTS "opp_org_sel" ON public.opportunities;
DROP POLICY IF EXISTS "opp_org_mod" ON public.opportunities;
CREATE POLICY "opp_org_sel" ON public.opportunities FOR SELECT TO authenticated
    USING (public.user_has_org_access(org_id, auth.uid()) OR org_id = public.get_user_org_id());
CREATE POLICY "opp_org_mod" ON public.opportunities FOR ALL TO authenticated
    USING (public.user_has_org_access(org_id, auth.uid()) OR org_id = public.get_user_org_id())
    WITH CHECK (public.user_has_org_access(org_id, auth.uid()) OR org_id = public.get_user_org_id());

DROP POLICY IF EXISTS "act_org_sel" ON public.activities;
DROP POLICY IF EXISTS "act_org_mod" ON public.activities;
CREATE POLICY "act_org_sel" ON public.activities FOR SELECT TO authenticated
    USING (public.user_has_org_access(org_id, auth.uid()) OR org_id = public.get_user_org_id());
CREATE POLICY "act_org_mod" ON public.activities FOR ALL TO authenticated
    USING (public.user_has_org_access(org_id, auth.uid()) OR org_id = public.get_user_org_id())
    WITH CHECK (public.user_has_org_access(org_id, auth.uid()) OR org_id = public.get_user_org_id());

DROP POLICY IF EXISTS "ps_org_sel" ON public.pipeline_stages;
DROP POLICY IF EXISTS "ps_org_mod" ON public.pipeline_stages;
CREATE POLICY "ps_org_sel" ON public.pipeline_stages FOR SELECT TO authenticated
    USING (public.user_has_org_access(org_id, auth.uid()) OR org_id = public.get_user_org_id());
CREATE POLICY "ps_org_mod" ON public.pipeline_stages FOR ALL TO authenticated
    USING (public.user_has_org_access(org_id, auth.uid()) OR org_id = public.get_user_org_id())
    WITH CHECK (public.user_has_org_access(org_id, auth.uid()) OR org_id = public.get_user_org_id());
