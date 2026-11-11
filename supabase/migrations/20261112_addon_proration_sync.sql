-- Migration: Add-on Proration Sync, Platform User Column, and Unified activate_org_plans RPC
-- Ensures:
-- 1. public.subscriptions has platform_employee_count column queried/updated by client code.
-- 2. activate_org_plans preserves existing current_period_start, current_period_end, and billing_cycle
--    when purchasing add-ons mid-cycle (p_is_addon_only = true), syncing add-on expiry to main plan.
-- 3. platform_user_limit, crm_team_limit, and employee_limit are persisted safely inside
--    manual_override_features JSONB object as well as integer columns.
-- 4. get_my_org_subscription returns real billing_cycle and quota limits.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS platform_employee_count integer NOT NULL DEFAULT 0;

DROP FUNCTION IF EXISTS public.activate_org_plans(uuid, text[], text, text, text, integer);
DROP FUNCTION IF EXISTS public.activate_org_plans(uuid, text[], text, text, text, integer, text);
DROP FUNCTION IF EXISTS public.activate_org_plans(uuid, text[], text, text, text, integer, text, boolean, integer, integer, integer);

CREATE OR REPLACE FUNCTION public.activate_org_plans(
  p_org_id uuid,
  p_plan_names text[],
  p_billing_cycle text DEFAULT 'yearly'::text,
  p_razorpay_order_id text DEFAULT NULL::text,
  p_razorpay_payment_id text DEFAULT NULL::text,
  p_employee_count integer DEFAULT 3,
  p_coupon_code text DEFAULT NULL::text,
  p_is_addon_only boolean DEFAULT false,
  p_extra_employees integer DEFAULT 0,
  p_extra_platform_users integer DEFAULT 0,
  p_extra_crm_members integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_plan_id UUID;
  v_plan_name TEXT;
  v_period_start TIMESTAMPTZ := NOW();
  v_period_end TIMESTAMPTZ;
  v_activated_count INT := 0;
  v_mapped_name TEXT;
  v_is_superadmin BOOLEAN;
  v_is_all_free BOOLEAN := TRUE;
  v_is_coupon_free BOOLEAN := FALSE;
  v_coupon_id UUID := NULL;

  v_existing_start TIMESTAMPTZ;
  v_existing_end TIMESTAMPTZ;
  v_existing_cycle TEXT;
  v_existing_emp_count INT := 0;
  v_existing_plat_count INT := 0;
  v_existing_plat_limit INT := 0;
  v_existing_crm_limit INT := 0;
  v_has_suite BOOLEAN := FALSE;
  v_has_hr BOOLEAN := FALSE;

  v_base_plat INT := 3;
  v_base_emp INT := 3;
  v_base_crm INT := 2;
  v_final_emp_limit INT := 3;
  v_final_plat_limit INT := 3;
  v_final_crm_limit INT := 2;
  v_features JSONB := '[]'::jsonb;
  v_updated_rows INT := 0;
BEGIN
  -- Caller verification
  v_is_superadmin := (auth.role() IS NULL) OR
                     (auth.role() = 'service_role') OR
                     (COALESCE(auth.jwt() ->> 'email', '') = 'awesh.etpl@gmail.com');

  -- 100% coupon activation check
  IF COALESCE(p_razorpay_order_id, '') LIKE 'COUPON_FREE%' OR
     COALESCE(p_razorpay_payment_id, '') LIKE 'COUPON_FREE%' THEN
    v_is_coupon_free := TRUE;
  END IF;

  -- Check if all requested plans are free
  FOREACH v_plan_name IN ARRAY p_plan_names
  LOOP
    IF v_plan_name NOT IN ('free', 'plan_1') THEN
      v_is_all_free := FALSE;
    END IF;
  END LOOP;

  -- Require payment for non-free plans unless superadmin or 100% coupon
  IF NOT v_is_all_free AND NOT v_is_superadmin AND NOT v_is_coupon_free THEN
    IF p_razorpay_payment_id IS NULL OR btrim(p_razorpay_payment_id) = '' OR
       p_razorpay_order_id IS NULL OR btrim(p_razorpay_order_id) = '' THEN
      RAISE EXCEPTION 'Payment verification required for paid plans';
    END IF;
  END IF;

  -- Redeem coupon if provided
  IF p_coupon_code IS NOT NULL AND btrim(p_coupon_code) <> '' THEN
    SELECT id INTO v_coupon_id
    FROM public.coupons
    WHERE UPPER(code) = UPPER(btrim(p_coupon_code))
    LIMIT 1;

    IF v_coupon_id IS NOT NULL THEN
      PERFORM public.redeem_coupon(
        p_code => p_coupon_code,
        p_org_id => p_org_id,
        p_subscription_id => NULL,
        p_discount_applied => 0,
        p_order_id => COALESCE(p_razorpay_order_id, 'SUB_' || p_org_id || '_' || EXTRACT(EPOCH FROM NOW())::TEXT)
      );
    END IF;
  END IF;

  -- Inspect existing active paid subscription state (for mid-cycle add-ons & quota preservation)
  SELECT
    MAX(s.current_period_start),
    MAX(s.current_period_end),
    CASE WHEN bool_or(s.billing_cycle = 'yearly') THEN 'yearly' ELSE 'monthly' END,
    COALESCE(MAX(s.employee_count), 0),
    COALESCE(MAX(s.platform_employee_count), 0),
    COALESCE(MAX(CASE
      WHEN jsonb_typeof(s.manual_override_features) = 'object' AND (s.manual_override_features ? 'platform_user_limit')
      THEN NULLIF(s.manual_override_features->>'platform_user_limit', '')::int
      ELSE NULL
    END), 0),
    COALESCE(MAX(CASE
      WHEN jsonb_typeof(s.manual_override_features) = 'object' AND (s.manual_override_features ? 'crm_team_limit')
      THEN NULLIF(s.manual_override_features->>'crm_team_limit', '')::int
      ELSE NULL
    END), 0),
    COALESCE(bool_or(p.name IN ('suite', 'plan_3')), false),
    COALESCE(bool_or(p.name IN ('suite', 'plan_3', 'hr', 'plan_4')), false)
  INTO
    v_existing_start,
    v_existing_end,
    v_existing_cycle,
    v_existing_emp_count,
    v_existing_plat_count,
    v_existing_plat_limit,
    v_existing_crm_limit,
    v_has_suite,
    v_has_hr
  FROM public.subscriptions s
  JOIN public.plans p ON p.id = s.plan_id
  WHERE s.org_id = p_org_id
    AND s.status IN ('active', 'courtesy', 'trial')
    AND p.name NOT IN ('free', 'plan_1')
    AND (s.current_period_end IS NULL OR s.current_period_end > NOW());

  -- ============================================================================
  -- CASE A: Mid-cycle Add-on Only Purchase (Preserve main plan expiry date!)
  -- ============================================================================
  IF COALESCE(p_is_addon_only, FALSE) AND v_existing_end IS NOT NULL THEN
    v_period_start := COALESCE(v_existing_start, NOW());
    v_period_end := v_existing_end;
    v_base_plat := CASE WHEN v_has_suite THEN 5 ELSE 3 END;
    v_base_emp := CASE WHEN v_has_hr THEN 10 ELSE 3 END;
    v_base_crm := 2;

    IF v_has_hr THEN
      v_final_emp_limit := GREATEST(
        GREATEST(COALESCE(v_existing_emp_count, 0), v_base_emp) + GREATEST(0, COALESCE(p_extra_employees, 0)),
        COALESCE(p_employee_count, v_base_emp)
      );
    ELSE
      v_final_emp_limit := GREATEST(COALESCE(v_existing_emp_count, 0), v_base_emp);
    END IF;

    v_final_plat_limit := GREATEST(COALESCE(v_existing_plat_limit, 0), COALESCE(v_existing_plat_count, 0), v_base_plat)
      + GREATEST(0, COALESCE(p_extra_platform_users, 0));
    v_final_crm_limit := GREATEST(COALESCE(v_existing_crm_limit, 0), v_base_crm)
      + GREATEST(0, COALESCE(p_extra_crm_members, 0));

    -- Update active paid rows WITHOUT modifying current_period_start, current_period_end, or billing_cycle
    UPDATE public.subscriptions s
    SET
      employee_count = v_final_emp_limit,
      platform_employee_count = v_final_plat_limit,
      manual_override_features = (
        CASE
          WHEN jsonb_typeof(s.manual_override_features) = 'object' THEN s.manual_override_features
          ELSE '{}'::jsonb
        END
      ) || jsonb_build_object(
        'employee_limit', v_final_emp_limit,
        'platform_user_limit', v_final_plat_limit,
        'crm_team_limit', v_final_crm_limit
      ),
      razorpay_order_id = COALESCE(p_razorpay_order_id, s.razorpay_order_id),
      razorpay_payment_id = COALESCE(p_razorpay_payment_id, s.razorpay_payment_id),
      coupon_id = COALESCE(v_coupon_id, s.coupon_id),
      updated_at = NOW()
    FROM public.plans p
    WHERE s.org_id = p_org_id
      AND s.plan_id = p.id
      AND s.status IN ('active', 'courtesy', 'trial')
      AND p.name NOT IN ('free', 'plan_1')
      AND (s.current_period_end IS NULL OR s.current_period_end > NOW());

    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

    SELECT COALESCE(jsonb_agg(DISTINCT elem), '[]'::jsonb) INTO v_features
    FROM (
      SELECT jsonb_array_elements_text(p.feature_keys) AS elem
      FROM public.subscriptions s
      JOIN public.plans p ON p.id = s.plan_id
      WHERE s.org_id = p_org_id
        AND s.status IN ('active', 'courtesy', 'trial')
        AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
    ) f;

    RETURN jsonb_build_object(
      'success', true,
      'org_id', p_org_id,
      'activated_count', v_updated_rows,
      'plans', p_plan_names,
      'billing_cycle', v_existing_cycle,
      'current_period_end', v_period_end,
      'employee_count', v_final_emp_limit,
      'platform_user_limit', v_final_plat_limit,
      'crm_team_limit', v_final_crm_limit,
      'features', COALESCE(v_features, '[]'::jsonb),
      'is_addon_only', true
    );
  END IF;

  -- ============================================================================
  -- CASE B: Free Plan Activation
  -- ============================================================================
  IF ('free' = ANY(p_plan_names) OR 'plan_1' = ANY(p_plan_names)) AND array_length(p_plan_names, 1) = 1 THEN
    DELETE FROM public.subscriptions WHERE org_id = p_org_id;

    SELECT id INTO v_plan_id FROM public.plans WHERE name IN ('free', 'plan_1') AND is_active = true LIMIT 1;
    IF v_plan_id IS NOT NULL THEN
      INSERT INTO public.subscriptions (
        org_id, plan_id, billing_cycle, status,
        current_period_start, current_period_end,
        employee_count, platform_employee_count,
        manual_override_features, trial_ends_at
      ) VALUES (
        p_org_id, v_plan_id, 'monthly', 'active',
        v_period_start, NULL,
        3, 3,
        jsonb_build_object('employee_limit', 3, 'platform_user_limit', 3, 'crm_team_limit', 2),
        NULL
      );
    END IF;

    UPDATE public.organizations
    SET subscription_plan = 'free',
        enabled_features = '["sales", "catalog", "outreach"]'::jsonb
    WHERE id = p_org_id;

    RETURN jsonb_build_object(
      'success', true,
      'org_id', p_org_id,
      'plans', ARRAY['free'],
      'features', '["sales", "catalog", "outreach"]'::jsonb,
      'current_period_end', NULL
    );
  END IF;

  -- ============================================================================
  -- CASE C: New Paid Plan / Upgrade (with optional add-ons)
  -- ============================================================================
  IF p_billing_cycle = 'yearly' THEN
    v_period_end := v_period_start + INTERVAL '1 year';
  ELSE
    v_period_end := v_period_start + INTERVAL '1 month';
  END IF;

  IF 'suite' = ANY(p_plan_names) THEN
    p_plan_names := ARRAY['suite'];
  END IF;

  v_base_plat := CASE WHEN 'suite' = ANY(p_plan_names) THEN 5 ELSE 3 END;
  v_base_emp := CASE WHEN ('suite' = ANY(p_plan_names) OR 'hr' = ANY(p_plan_names)) THEN 10 ELSE 3 END;
  v_base_crm := 2;

  v_final_emp_limit := GREATEST(v_base_emp, COALESCE(p_employee_count, v_base_emp));
  IF v_existing_end IS NOT NULL THEN
    v_final_emp_limit := GREATEST(v_final_emp_limit, COALESCE(v_existing_emp_count, v_base_emp) + GREATEST(0, COALESCE(p_extra_employees, 0)));
  END IF;

  v_final_plat_limit := GREATEST(COALESCE(v_existing_plat_limit, 0), COALESCE(v_existing_plat_count, 0), v_base_plat)
    + GREATEST(0, COALESCE(p_extra_platform_users, 0));
  v_final_crm_limit := GREATEST(COALESCE(v_existing_crm_limit, 0), v_base_crm)
    + GREATEST(0, COALESCE(p_extra_crm_members, 0));

  -- Remove free plan placeholder rows when activating paid plans
  DELETE FROM public.subscriptions s
  USING public.plans p
  WHERE s.org_id = p_org_id AND s.plan_id = p.id AND p.name IN ('free', 'plan_1');

  FOREACH v_plan_name IN ARRAY p_plan_names
  LOOP
    v_mapped_name := CASE
      WHEN v_plan_name = 'plan_1' THEN 'free'
      WHEN v_plan_name = 'plan_2' THEN 'accounting'
      WHEN v_plan_name = 'plan_3' THEN 'suite'
      WHEN v_plan_name = 'plan_4' THEN 'hr'
      WHEN v_plan_name = 'plan_5' THEN 'crm'
      WHEN v_plan_name = 'plan_6' THEN 'promotion'
      ELSE v_plan_name
    END;

    SELECT id INTO v_plan_id FROM public.plans WHERE name = v_mapped_name AND is_active = true LIMIT 1;

    IF v_plan_id IS NOT NULL THEN
      INSERT INTO public.subscriptions (
        org_id, plan_id, billing_cycle, status,
        current_period_start, current_period_end,
        razorpay_order_id, razorpay_payment_id,
        employee_count, platform_employee_count,
        manual_override_features,
        coupon_id, trial_ends_at
      ) VALUES (
        p_org_id, v_plan_id, COALESCE(p_billing_cycle, 'yearly'), 'active',
        v_period_start, v_period_end,
        p_razorpay_order_id, p_razorpay_payment_id,
        v_final_emp_limit, v_final_plat_limit,
        jsonb_build_object(
          'employee_limit', v_final_emp_limit,
          'platform_user_limit', v_final_plat_limit,
          'crm_team_limit', v_final_crm_limit
        ),
        v_coupon_id, NULL
      )
      ON CONFLICT (org_id, plan_id) DO UPDATE SET
        billing_cycle = EXCLUDED.billing_cycle,
        status = 'active',
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        razorpay_order_id = EXCLUDED.razorpay_order_id,
        razorpay_payment_id = EXCLUDED.razorpay_payment_id,
        employee_count = GREATEST(public.subscriptions.employee_count, EXCLUDED.employee_count),
        platform_employee_count = GREATEST(COALESCE(public.subscriptions.platform_employee_count, 0), EXCLUDED.platform_employee_count),
        manual_override_features = (
          CASE
            WHEN jsonb_typeof(public.subscriptions.manual_override_features) = 'object' THEN public.subscriptions.manual_override_features
            ELSE '{}'::jsonb
          END
        ) || jsonb_build_object(
          'employee_limit', GREATEST(public.subscriptions.employee_count, EXCLUDED.employee_count),
          'platform_user_limit', v_final_plat_limit,
          'crm_team_limit', v_final_crm_limit
        ),
        coupon_id = COALESCE(EXCLUDED.coupon_id, public.subscriptions.coupon_id),
        trial_ends_at = NULL,
        updated_at = NOW();

      v_activated_count := v_activated_count + 1;
    END IF;
  END LOOP;

  -- Compute merged feature set for organization across all active plans
  IF 'suite' = ANY(p_plan_names) THEN
    v_features := '["accounting", "catalog", "crm", "marketing", "outreach", "people", "purchases", "reports", "sales"]'::jsonb;
  ELSE
    SELECT COALESCE(jsonb_agg(DISTINCT elem), '["sales", "catalog", "outreach"]'::jsonb) INTO v_features
    FROM (
      SELECT jsonb_array_elements_text(p.feature_keys) AS elem
      FROM public.subscriptions s
      JOIN public.plans p ON p.id = s.plan_id
      WHERE s.org_id = p_org_id
        AND s.status IN ('active', 'courtesy', 'trial')
        AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
    ) f;
  END IF;

  UPDATE public.organizations
  SET subscription_plan = CASE WHEN 'suite' = ANY(p_plan_names) THEN 'suite' ELSE p_plan_names[1] END,
      enabled_features = COALESCE(v_features, '["sales", "catalog", "outreach"]'::jsonb)
  WHERE id = p_org_id;

  RETURN jsonb_build_object(
    'success', true,
    'org_id', p_org_id,
    'activated_count', v_activated_count,
    'plans', p_plan_names,
    'billing_cycle', COALESCE(p_billing_cycle, 'yearly'),
    'current_period_end', v_period_end,
    'employee_count', v_final_emp_limit,
    'platform_user_limit', v_final_plat_limit,
    'crm_team_limit', v_final_crm_limit,
    'features', COALESCE(v_features, '[]'::jsonb),
    'is_addon_only', false
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_org_subscription(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_active_count integer;
  v_features jsonb;
  v_employee_limit integer;
  v_employee_count integer;
  v_platform_user_limit integer;
  v_crm_team_limit integer;
  v_invoice_limit integer;
  v_client_limit integer;
  v_item_limit integer;
  v_current_period_end timestamp with time zone;
  v_billing_cycle text;
  v_plan_names text;
  v_plan_display_names text;
BEGIN
  -- Ensure expired trials/subscriptions are marked expired
  UPDATE public.subscriptions
  SET status = 'expired', updated_at = NOW()
  WHERE org_id = p_org_id AND status = 'trial' AND trial_ends_at < NOW();

  UPDATE public.subscriptions
  SET status = 'expired', updated_at = NOW()
  WHERE org_id = p_org_id AND status = 'active' AND current_period_end IS NOT NULL AND current_period_end < NOW();

  -- Count active subscriptions
  SELECT COUNT(*) INTO v_active_count
  FROM public.subscriptions s
  WHERE s.org_id = p_org_id
    AND s.status IN ('active', 'trial', 'courtesy')
    AND (s.current_period_end IS NULL OR s.current_period_end > NOW());

  -- If NO active subscriptions, return strict Free plan defaults
  IF v_active_count = 0 THEN
    RETURN jsonb_build_object(
      'plan_name',           'free',
      'plan_display_name',   'Business Starter',
      'plan_type',           'tiered',
      'status',              'active',
      'billing_cycle',       'monthly',
      'trial_ends_at',       NULL,
      'trial_plan_name',     NULL,
      'enabled_features',    '["sales", "catalog", "outreach"]'::jsonb,
      'employee_limit',      3,
      'employee_count',      0,
      'platform_user_limit', 3,
      'crm_team_limit',      2,
      'invoice_limit',       100,
      'client_limit',        100,
      'item_limit',          100,
      'current_period_end',  NULL
    );
  END IF;

  -- Aggregate active plans data
  SELECT
    string_agg(p.name, ' + '),
    string_agg(p.display_name, ' + '),
    CASE WHEN bool_or(s.billing_cycle = 'yearly') THEN 'yearly' ELSE 'monthly' END,
    GREATEST(
      COALESCE(MAX(p.employee_limit), 3),
      COALESCE(MAX(s.employee_count), 0),
      COALESCE(MAX(CASE
        WHEN jsonb_typeof(s.manual_override_features) = 'object' AND (s.manual_override_features ? 'employee_limit')
        THEN NULLIF(s.manual_override_features->>'employee_limit', '')::int
        ELSE NULL
      END), 0)
    ),
    COALESCE(MAX(s.employee_count), 0),
    GREATEST(
      CASE WHEN bool_or(p.name = 'suite') THEN 5 ELSE 3 END,
      COALESCE(MAX(s.platform_employee_count), 0),
      COALESCE(MAX(CASE
        WHEN jsonb_typeof(s.manual_override_features) = 'object' AND (s.manual_override_features ? 'platform_user_limit')
        THEN NULLIF(s.manual_override_features->>'platform_user_limit', '')::int
        ELSE NULL
      END), 0)
    ),
    GREATEST(
      2,
      COALESCE(MAX(CASE
        WHEN jsonb_typeof(s.manual_override_features) = 'object' AND (s.manual_override_features ? 'crm_team_limit')
        THEN NULLIF(s.manual_override_features->>'crm_team_limit', '')::int
        ELSE NULL
      END), 0)
    ),
    MAX(p.invoice_limit),
    MAX(p.client_limit),
    MAX(p.item_limit),
    MAX(s.current_period_end)
  INTO
    v_plan_names,
    v_plan_display_names,
    v_billing_cycle,
    v_employee_limit,
    v_employee_count,
    v_platform_user_limit,
    v_crm_team_limit,
    v_invoice_limit,
    v_client_limit,
    v_item_limit,
    v_current_period_end
  FROM public.subscriptions s
  JOIN public.plans p ON p.id = s.plan_id
  WHERE s.org_id = p_org_id
    AND s.status IN ('active', 'trial', 'courtesy')
    AND (s.current_period_end IS NULL OR s.current_period_end > NOW());

  -- Aggregate features safely handling JSONB arrays
  SELECT COALESCE(jsonb_agg(DISTINCT elem), '[]'::jsonb) INTO v_features
  FROM (
    SELECT jsonb_array_elements_text(p.feature_keys) AS elem
    FROM public.subscriptions s
    JOIN public.plans p ON p.id = s.plan_id
    WHERE s.org_id = p_org_id
      AND s.status IN ('active', 'trial', 'courtesy')
      AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
  ) subq;

  RETURN jsonb_build_object(
    'plan_name',           COALESCE(v_plan_names, 'free'),
    'plan_display_name',   COALESCE(v_plan_display_names, 'Business Starter'),
    'plan_type',           'tiered',
    'status',              'active',
    'billing_cycle',       COALESCE(v_billing_cycle, 'monthly'),
    'trial_ends_at',       NULL,
    'trial_plan_name',     NULL,
    'enabled_features',    v_features,
    'employee_limit',      COALESCE(v_employee_limit, 3),
    'employee_count',      COALESCE(v_employee_count, 0),
    'platform_user_limit', COALESCE(v_platform_user_limit, 3),
    'crm_team_limit',      COALESCE(v_crm_team_limit, 2),
    'invoice_limit',       COALESCE(v_invoice_limit, 100),
    'client_limit',        COALESCE(v_client_limit, 100),
    'item_limit',          COALESCE(v_item_limit, 100),
    'current_period_end',  v_current_period_end
  );
END;
$function$;

