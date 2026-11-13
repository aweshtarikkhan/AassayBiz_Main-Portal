-- Add dob and date_of_birth columns to employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS dob date;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS date_of_birth date;

-- Add RLS policy allowing employees to update their own profile
DROP POLICY IF EXISTS "Employees can update their own profile" ON public.employees;

CREATE POLICY "Employees can update their own profile"
  ON public.employees
  FOR UPDATE
  TO authenticated
  USING (
    auth_user_id = auth.uid() 
    OR (auth_user_id IS NULL AND LOWER(email) = LOWER(auth.jwt() ->> 'email'))
  )
  WITH CHECK (
    auth_user_id = auth.uid() 
    OR user_has_org_access(org_id, auth.uid())
  );

-- Create dedicated SECURITY DEFINER RPC to safely update employee profile details
CREATE OR REPLACE FUNCTION public.update_employee_profile(
  p_employee_id uuid,
  p_phone text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_dob text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_emp public.employees%ROWTYPE;
  v_parsed_dob date := NULL;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_emp
  FROM public.employees
  WHERE id = p_employee_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Employee not found');
  END IF;

  -- Authorization check: caller must be the employee or org admin/owner or matching email
  IF v_emp.auth_user_id IS DISTINCT FROM v_caller 
     AND NOT public.user_has_org_access(v_emp.org_id, v_caller)
     AND NOT EXISTS (
       SELECT 1 FROM auth.users u 
       WHERE u.id = v_caller 
       AND (
         LOWER(u.email) = LOWER(v_emp.email) 
         OR LOWER(REPLACE(u.email, 'attendance_', '')) = LOWER(v_emp.email)
       )
     )
  THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized to update this employee profile');
  END IF;

  -- Auto-heal auth_user_id if missing or mismatched
  IF v_emp.auth_user_id IS NULL OR v_emp.auth_user_id <> v_caller THEN
    UPDATE public.employees
    SET auth_user_id = v_caller
    WHERE id = p_employee_id;
  END IF;

  -- Parse dob safely
  IF p_dob IS NOT NULL AND TRIM(p_dob) <> '' THEN
    BEGIN
      v_parsed_dob := p_dob::date;
    EXCEPTION WHEN OTHERS THEN
      v_parsed_dob := NULL;
    END;
  END IF;

  -- Perform the update
  UPDATE public.employees
  SET
    phone = CASE WHEN p_phone IS NOT NULL THEN p_phone ELSE phone END,
    address = CASE WHEN p_address IS NOT NULL THEN p_address ELSE address END,
    dob = CASE WHEN p_dob IS NOT NULL THEN v_parsed_dob ELSE dob END,
    date_of_birth = CASE WHEN p_dob IS NOT NULL THEN v_parsed_dob ELSE date_of_birth END,
    avatar_url = CASE WHEN p_avatar_url IS NOT NULL THEN p_avatar_url ELSE avatar_url END,
    updated_at = NOW()
  WHERE id = p_employee_id
  RETURNING * INTO v_emp;

  RETURN jsonb_build_object(
    'success', true,
    'employee', row_to_json(v_emp)
  );
END;
$$;

