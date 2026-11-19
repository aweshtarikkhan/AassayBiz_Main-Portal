CREATE OR REPLACE FUNCTION get_platform_dashboard_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM platform_admins WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  SELECT json_build_object(
    'users_count', (SELECT count(*) FROM profiles),
    'orgs_count', (SELECT count(*) FROM organizations WHERE org_type = 'business'),
    'admins', (SELECT coalesce(json_agg(row_to_json(pa)), '[]'::json) FROM platform_admins pa),
    'users', (
      SELECT coalesce(json_agg(
        json_build_object(
          'user_id', p.user_id,
          'first_name', p.first_name,
          'last_name', p.last_name,
          'email', u.email,
          'phone', COALESCE(NULLIF(p.phone, ''), NULLIF(u.phone, ''), NULLIF(u.raw_user_meta_data->>'phone', ''), NULLIF(u.raw_user_meta_data->>'mobile', ''), ''),
          'org_id', p.org_id,
          'org_name', o.name,
          'role', (SELECT ur.role FROM user_roles ur WHERE ur.user_id = p.user_id LIMIT 1),
          'created_at', u.created_at,
          'last_sign_in', u.last_sign_in_at
        )
      ), '[]'::json)
      FROM profiles p
      JOIN auth.users u ON u.id = p.user_id
      LEFT JOIN organizations o ON o.id = p.org_id
    ),
    'organizations', (
      SELECT coalesce(json_agg(
        json_build_object(
          'id', o.id,
          'name', o.name,
          'email', o.email,
          'phone', COALESCE(NULLIF(o.phone, ''), NULLIF(p2.phone, ''), NULLIF(u2.phone, ''), NULLIF(u2.raw_user_meta_data->>'phone', ''), NULLIF(u2.raw_user_meta_data->>'mobile', ''), ''),
          'currency_code', o.currency_code,
          'gst_enabled', o.gst_enabled,
          'gst_number', o.gst_number,
          'created_at', o.created_at,
          'member_count', (SELECT count(*) FROM profiles pp WHERE pp.org_id = o.id),
          'invoice_count', (SELECT count(*) FROM invoices i WHERE i.org_id = o.id),
          'owner', (
            SELECT json_build_object(
              'email', u2.email,
              'name', COALESCE(p2.first_name, '') || ' ' || COALESCE(p2.last_name, ''),
              'phone', COALESCE(NULLIF(p2.phone, ''), NULLIF(u2.phone, ''), NULLIF(u2.raw_user_meta_data->>'phone', ''), NULLIF(u2.raw_user_meta_data->>'mobile', ''), '')
            )
            FROM profiles p2
            JOIN auth.users u2 ON u2.id = p2.user_id
            JOIN user_roles ur2 ON ur2.user_id = p2.user_id AND ur2.role = 'owner'
            WHERE p2.org_id = o.id
            LIMIT 1
          ),
          'subscription', json_build_object(
              'plan_name', (SELECT COALESCE((SELECT pl.name FROM subscriptions sub JOIN plans pl ON pl.id = sub.plan_id WHERE sub.org_id = o.id ORDER BY pl.price_monthly DESC LIMIT 1), 'free')),
              'plan_display_name', (SELECT COALESCE((SELECT pl.display_name FROM subscriptions sub JOIN plans pl ON pl.id = sub.plan_id WHERE sub.org_id = o.id ORDER BY pl.price_monthly DESC LIMIT 1), 'Free')),
              'enabled_features', (SELECT COALESCE((SELECT json_agg(DISTINCT elem) FROM subscriptions sub JOIN plans pl ON pl.id = sub.plan_id, jsonb_array_elements(COALESCE(pl.feature_keys, '[]'::jsonb)) as elem WHERE sub.org_id = o.id), '[]'::json)),
              'employee_limit', (SELECT COALESCE((SELECT MAX(pl.employee_limit) FROM subscriptions sub JOIN plans pl ON pl.id = sub.plan_id WHERE sub.org_id = o.id), 0))
          ),
          'subscription_plan_names', (
             SELECT COALESCE(json_agg(pl.name), '[]'::json)
             FROM subscriptions sub
             JOIN plans pl ON pl.id = sub.plan_id
             WHERE sub.org_id = o.id
          )
        )
      ), '[]'::json)
      FROM organizations o
      WHERE o.org_type = 'business'
    )
  ) INTO result;
  
  RETURN result;
END;
$$;
