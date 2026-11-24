-- Fix get_platform_dashboard_data to return all organizations (no org_type filter)
-- and correctly associate the owner's true account_id via organizations.owner_id
CREATE OR REPLACE FUNCTION public.get_platform_dashboard_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE id = current_user_id OR user_id = current_user_id
    ) THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
  END IF;

  SELECT json_build_object(
    'users_count', (SELECT count(*) FROM public.profiles),
    'orgs_count', (SELECT count(*) FROM public.organizations),
    'admins', (SELECT coalesce(json_agg(row_to_json(pa)), '[]'::json) FROM public.platform_admins pa),
    'users', (
      SELECT coalesce(json_agg(
        json_build_object(
          'user_id', p.user_id,
          'id', p.user_id,
          'account_id', COALESCE(p.account_id, ''),
          'first_name', p.first_name,
          'last_name', p.last_name,
          'email', COALESCE(u.email, ''),
          'phone', COALESCE(p.phone, u.raw_user_meta_data->>'phone', u.raw_user_meta_data->>'mobile', u.phone, ''),
          'org_id', p.org_id,
          'org_name', o.name,
          'role', COALESCE((SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = p.user_id LIMIT 1), 'owner'),
          'created_at', COALESCE(u.created_at, p.created_at),
          'last_sign_in', u.last_sign_in_at
        )
      ), '[]'::json)
      FROM public.profiles p
      LEFT JOIN auth.users u ON u.id = p.user_id
      LEFT JOIN public.organizations o ON o.id = p.org_id
    ),
    'organizations', (
      SELECT coalesce(json_agg(
        json_build_object(
          'id', o.id,
          'name', o.name,
          'owner_id', o.owner_id,
          'org_type', COALESCE(o.org_type, 'business'),
          'email', o.email,
          'phone', COALESCE(o.phone, (
            SELECT COALESCE(p2.phone, u2.raw_user_meta_data->>'phone', u2.raw_user_meta_data->>'mobile', u2.phone)
            FROM auth.users u2
            LEFT JOIN public.profiles p2 ON p2.user_id = u2.id
            WHERE u2.id = o.owner_id
               OR (o.owner_id IS NULL AND p2.org_id = o.id)
            ORDER BY (CASE WHEN u2.id = o.owner_id THEN 0 ELSE 1 END), p2.created_at ASC
            LIMIT 1
          )),
          'currency_code', COALESCE(o.currency_code, 'INR'),
          'gst_enabled', COALESCE(o.gst_enabled, false),
          'gst_number', o.gst_number,
          'created_at', o.created_at,
          'member_count', (SELECT count(*) FROM public.profiles pp WHERE pp.org_id = o.id),
          'invoice_count', (SELECT count(*) FROM public.invoices i WHERE i.org_id = o.id),
          'owner', (
            SELECT json_build_object(
              'id', COALESCE(p2.user_id, u2.id, o.owner_id),
              'user_id', COALESCE(p2.user_id, u2.id, o.owner_id),
              'email', COALESCE(u2.email, o.email, ''),
              'phone', COALESCE(p2.phone, u2.raw_user_meta_data->>'phone', u2.raw_user_meta_data->>'mobile', u2.phone, o.phone, ''),
              'name', TRIM(COALESCE(p2.first_name, '') || ' ' || COALESCE(p2.last_name, '')),
              'account_id', COALESCE(p2.account_id, '')
            )
            FROM auth.users u2
            LEFT JOIN public.profiles p2 ON p2.user_id = u2.id
            WHERE u2.id = o.owner_id
               OR (o.owner_id IS NULL AND p2.org_id = o.id)
            ORDER BY (CASE WHEN u2.id = o.owner_id THEN 0 ELSE 1 END), p2.created_at ASC
            LIMIT 1
          ),
          'owner_account_id', (
            SELECT COALESCE(p2.account_id, '')
            FROM auth.users u2
            LEFT JOIN public.profiles p2 ON p2.user_id = u2.id
            WHERE u2.id = o.owner_id
               OR (o.owner_id IS NULL AND p2.org_id = o.id)
            ORDER BY (CASE WHEN u2.id = o.owner_id THEN 0 ELSE 1 END), p2.created_at ASC
            LIMIT 1
          ),
          'invoice_preferences', COALESCE(o.invoice_preferences, '{}'::jsonb),
          'subscription', json_build_object(
              'plan_name', COALESCE((SELECT pl.name FROM public.subscriptions sub JOIN public.plans pl ON pl.id = sub.plan_id WHERE sub.org_id = o.id ORDER BY pl.price_monthly DESC LIMIT 1), 'free'),
              'plan_display_name', COALESCE((SELECT pl.display_name FROM public.subscriptions sub JOIN public.plans pl ON pl.id = sub.plan_id WHERE sub.org_id = o.id ORDER BY pl.price_monthly DESC LIMIT 1), 'Free'),
              'enabled_features', COALESCE((SELECT json_agg(DISTINCT elem) FROM public.subscriptions sub JOIN public.plans pl ON pl.id = sub.plan_id, jsonb_array_elements(COALESCE(pl.feature_keys, '[]'::jsonb)) as elem WHERE sub.org_id = o.id), '[]'::json),
              'employee_limit', COALESCE((SELECT MAX(pl.employee_limit) FROM public.subscriptions sub JOIN public.plans pl ON pl.id = sub.plan_id WHERE sub.org_id = o.id), 0),
              'employee_count', COALESCE((SELECT sub.employee_count FROM public.subscriptions sub WHERE sub.org_id = o.id ORDER BY sub.created_at DESC LIMIT 1), 0),
              'platform_employee_count', COALESCE((SELECT sub.platform_employee_count FROM public.subscriptions sub WHERE sub.org_id = o.id ORDER BY sub.created_at DESC LIMIT 1), 0),
              'manual_override_features', COALESCE((SELECT sub.manual_override_features FROM public.subscriptions sub WHERE sub.org_id = o.id ORDER BY sub.created_at DESC LIMIT 1), '{}'::jsonb)
          ),
          'subscription_plan_names', (
             SELECT COALESCE(json_agg(pl.name), '[]'::json)
             FROM public.subscriptions sub
             JOIN public.plans pl ON pl.id = sub.plan_id
             WHERE sub.org_id = o.id
          )
        )
      ), '[]'::json)
      FROM (SELECT * FROM public.organizations ORDER BY created_at DESC) o
    )
  ) INTO result;

  RETURN result;
END;
$$;
