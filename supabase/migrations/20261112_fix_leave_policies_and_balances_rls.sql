-- Fix multi-org & employee RLS access for leave_policies, employee_leave_balances, leave_transactions, leaves, and employees
CREATE OR REPLACE FUNCTION public.user_has_org_access(_org_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations WHERE id = _org_id AND owner_id = _user_id
    UNION ALL
    SELECT 1 FROM public.organization_members WHERE org_id = _org_id AND user_id = _user_id
    UNION ALL
    SELECT 1 FROM public.profiles WHERE user_id = _user_id AND org_id = _org_id
  );
$$;

-- 1. leave_policies
DROP POLICY IF EXISTS "leave_policies_org_mod" ON public.leave_policies;
DROP POLICY IF EXISTS "leave_policies_org_select" ON public.leave_policies;
DROP POLICY IF EXISTS "leave_policies_emp_select" ON public.leave_policies;

CREATE POLICY "leave_policies_org_mod"
  ON public.leave_policies
  FOR ALL
  TO authenticated
  USING (public.user_has_org_access(org_id, auth.uid()))
  WITH CHECK (public.user_has_org_access(org_id, auth.uid()));

CREATE POLICY "leave_policies_org_select"
  ON public.leave_policies
  FOR SELECT
  TO authenticated
  USING (
    public.user_has_org_access(org_id, auth.uid())
    OR org_id IN (SELECT e.org_id FROM public.employees e WHERE e.auth_user_id = auth.uid())
  );

-- 2. employee_leave_balances
DROP POLICY IF EXISTS "elb_org_mod" ON public.employee_leave_balances;
DROP POLICY IF EXISTS "elb_org_select" ON public.employee_leave_balances;

CREATE POLICY "elb_org_mod"
  ON public.employee_leave_balances
  FOR ALL
  TO authenticated
  USING (public.user_has_org_access(org_id, auth.uid()))
  WITH CHECK (public.user_has_org_access(org_id, auth.uid()));

CREATE POLICY "elb_org_select"
  ON public.employee_leave_balances
  FOR SELECT
  TO authenticated
  USING (public.user_has_org_access(org_id, auth.uid()));

-- 3. leave_transactions
DROP POLICY IF EXISTS "lt_org_mod" ON public.leave_transactions;
DROP POLICY IF EXISTS "lt_org_select" ON public.leave_transactions;

CREATE POLICY "lt_org_mod"
  ON public.leave_transactions
  FOR ALL
  TO authenticated
  USING (public.user_has_org_access(org_id, auth.uid()))
  WITH CHECK (public.user_has_org_access(org_id, auth.uid()));

CREATE POLICY "lt_org_select"
  ON public.leave_transactions
  FOR SELECT
  TO authenticated
  USING (
    public.user_has_org_access(org_id, auth.uid())
    OR employee_id IN (SELECT e.id FROM public.employees e WHERE e.auth_user_id = auth.uid())
  );

-- 4. leaves
DROP POLICY IF EXISTS "leaves_org_mod" ON public.leaves;
DROP POLICY IF EXISTS "leaves_org_select" ON public.leaves;

CREATE POLICY "leaves_org_mod"
  ON public.leaves
  FOR ALL
  TO authenticated
  USING (public.user_has_org_access(org_id, auth.uid()))
  WITH CHECK (public.user_has_org_access(org_id, auth.uid()));

CREATE POLICY "leaves_org_select"
  ON public.leaves
  FOR SELECT
  TO authenticated
  USING (public.user_has_org_access(org_id, auth.uid()));

-- 5. employees (ensure multi-org owners/members can manage employees across all their orgs)
DROP POLICY IF EXISTS "Employees: org members read" ON public.employees;
DROP POLICY IF EXISTS "Employees: org members write" ON public.employees;

CREATE POLICY "Employees: org members read"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (public.user_has_org_access(org_id, auth.uid()));

CREATE POLICY "Employees: org members write"
  ON public.employees
  FOR ALL
  TO authenticated
  USING (public.user_has_org_access(org_id, auth.uid()))
  WITH CHECK (public.user_has_org_access(org_id, auth.uid()));

