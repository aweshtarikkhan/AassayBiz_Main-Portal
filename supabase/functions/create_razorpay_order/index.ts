import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const action = body.action || "create";

    // 1. Fetch Razorpay keys from platform_settings or env
    let keyId = Deno.env.get("RAZORPAY_KEY_ID");
    let keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!keyId || !keySecret) {
      const { data: settings } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", ["razorpay_key_id", "razorpay_key_secret"]);

      if (settings) {
        for (const s of settings) {
          if (s.key === "razorpay_key_id") keyId = s.value;
          if (s.key === "razorpay_key_secret") keySecret = s.value;
        }
      }
    }

    // Live Razorpay keys
    if (!keyId) keyId = "rzp_live_TnlfuqkSig5UQO";
    if (!keySecret) keySecret = "LQZdJbUSZBhgdLaki9U9tpoz";

    // ==========================================
    // ACTION: CREATE ORDER
    // ==========================================
    if (action === "create") {
      const { org_id, selected_plan_ids, billing_cycle, coupon_code, hrms_employee_count, total_amount, amount_in_paise } = body;

      if (!org_id) {
        throw new Error("Missing org_id parameter.");
      }

      // If total amount is 0 (e.g. Free plan)
      const inputAmount = Number(amount_in_paise !== undefined ? amount_in_paise : (total_amount || 0));
      if (inputAmount <= 0) {
        return new Response(
          JSON.stringify({
            is_free: true,
            amount: 0,
            currency: "INR"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Determine final amount in paise:
      // 1. If amount_in_paise is explicitly passed, use it directly (e.g., 59900 = ₹599, 599900 = ₹5,999)
      // 2. If total_amount > 25000, it was sent in paise by an un-updated client (e.g., 59900, 599900, 1499900)
      // 3. Otherwise, total_amount is in Rupees (e.g., 599, 5999, 14999), so multiply by 100 to convert to paise
      let finalAmountInPaise: number;
      if (amount_in_paise !== undefined && amount_in_paise !== null && Number(amount_in_paise) > 0) {
        finalAmountInPaise = Math.round(Number(amount_in_paise));
      } else {
        const raw = Number(total_amount);
        finalAmountInPaise = raw > 25000 ? Math.round(raw) : Math.round(raw * 100);
      }

      // Call Razorpay API
      const auth = btoa(`${keyId}:${keySecret}`);
      const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: finalAmountInPaise,
          currency: "INR",
          receipt: `rcpt_${org_id.slice(0, 8)}_${Date.now()}`
        })
      });

      const rzpData = await rzpRes.json();
      if (!rzpRes.ok) {
        throw new Error(rzpData.error?.description || "Failed to create Razorpay order");
      }

      return new Response(
        JSON.stringify({
          order_id: rzpData.id,
          amount: rzpData.amount,
          currency: rzpData.currency,
          razorpay_key_id: keyId
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==========================================
    // ACTION: VERIFY PAYMENT & ACTIVATE
    // ==========================================
    if (action === "verify") {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        org_id,
        plan_names,
        billing_cycle,
        employee_count,
        is_addon_only,
        extra_employees,
        extra_platform_users,
        extra_crm_members,
        customer_email,
        customer_name,
        total_amount,
        coupon_code,
        discount_amount
      } = body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new Error("Missing payment verification parameters.");
      }

      // Verify HMAC SHA-256 signature
      const text = `${razorpay_order_id}|${razorpay_payment_id}`;
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(keySecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(text));
      const generatedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (generatedSignature !== razorpay_signature) {
        return new Response(
          JSON.stringify({ error: "Payment verification failed: Invalid signature" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Payment verified! Now activate the organization plan in Supabase DB
      const targetPlans = Array.isArray(plan_names) && plan_names.length > 0 ? plan_names : ["suite"];

      // Server-side safety guard: employee_count must respect plan tier limits
      const isAddonOnly = Boolean(is_addon_only);
      const extraEmp = Math.max(0, Number(extra_employees || 0));
      const extraPlat = Math.max(0, Number(extra_platform_users || 0));
      const extraCrm = Math.max(0, Number(extra_crm_members || 0));

      let finalEmpCount = Number(employee_count || 0);
      const isSuiteOrHr = targetPlans.includes("suite") || targetPlans.includes("hr");
      const targetBase = isSuiteOrHr ? 10 : 3;

      if (!isSuiteOrHr && !isAddonOnly) {
        // Business Accounting, Free, CRM, Promotion: strictly capped at 3 employees unless HR/Suite active
        finalEmpCount = 3;
      } else {
        if (finalEmpCount <= 0) {
          finalEmpCount = targetBase;
        }

        try {
          const { data: existingSub } = await supabase
            .from("subscriptions")
            .select("employee_count")
            .eq("org_id", org_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          // Ensure capacity never regresses below previous purchased count
          if (existingSub?.employee_count && existingSub.employee_count > finalEmpCount) {
            finalEmpCount = existingSub.employee_count;
          }
        } catch (e) {
          console.warn("Could not check existing subscription count:", e);
        }
      }

      const { data: actData, error: actError } = await supabase.rpc("activate_org_plans", {
        p_org_id: org_id,
        p_plan_names: targetPlans,
        p_billing_cycle: billing_cycle || "yearly",
        p_razorpay_order_id: razorpay_order_id,
        p_razorpay_payment_id: razorpay_payment_id,
        p_employee_count: finalEmpCount,
        p_coupon_code: coupon_code ? String(coupon_code).trim().toUpperCase() : null,
        p_is_addon_only: isAddonOnly,
        p_extra_employees: extraEmp,
        p_extra_platform_users: extraPlat,
        p_extra_crm_members: extraCrm
      });

      if (actError) {
        console.error("activate_org_plans error:", actError);
        throw new Error("Payment verified, but plan activation failed: " + actError.message);
      }

      if (coupon_code && String(coupon_code).trim()) {
        try {
          await supabase.rpc("redeem_coupon", {
            p_code: String(coupon_code).trim().toUpperCase(),
            p_org_id: org_id,
            p_discount_applied: Number(discount_amount || 0),
            p_order_id: razorpay_order_id
          });
        } catch (couponErr) {
          console.warn("Could not redeem coupon in verify action:", couponErr);
        }
      }

      const invoiceNumber = `AB-SUB-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Date.now().toString().slice(-4)}`;

      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment verified and plans activated successfully!",
          invoice_number: invoiceNumber,
          result: actData
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unsupported action: ${action}`);
  } catch (err: any) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
