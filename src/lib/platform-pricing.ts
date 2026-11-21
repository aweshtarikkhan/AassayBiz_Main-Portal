import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformPricingSettings {
  taskPriceMonthly: number; // default 99/employee/mo
  taskPriceYearly: number; // default 1188/employee/yr
  expensePriceMonthly: number; // default 499/employee/mo
  expensePriceYearly: number; // default 5988/employee/yr
  hrExtraEmployeePrice: number; // default 49/employee/mo
  crmExtraMemberPrice: number; // default 99/member/mo
  platformExtraUserPrice: number; // default 99/user/mo
  yearlyDiscountPct: number; // default 20%
  allowFreePlan: boolean; // default true
}

export const DEFAULT_PLATFORM_PRICING: PlatformPricingSettings = {
  taskPriceMonthly: 99,
  taskPriceYearly: 1188,
  expensePriceMonthly: 499,
  expensePriceYearly: 5988,
  hrExtraEmployeePrice: 49,
  crmExtraMemberPrice: 99,
  platformExtraUserPrice: 99,
  yearlyDiscountPct: 20,
  allowFreePlan: true,
};

let cachedPricing: PlatformPricingSettings | null = null;

export async function fetchPlatformPricing(): Promise<PlatformPricingSettings> {
  try {
    const { data, error } = await supabase.from("platform_settings").select("key, value");
    if (error || !data) {
      return cachedPricing || DEFAULT_PLATFORM_PRICING;
    }

    const map: Record<string, string> = {};
    data.forEach((row: any) => {
      if (row.key && row.value) map[row.key] = row.value;
    });

    const parsed: PlatformPricingSettings = {
      taskPriceMonthly: map["task_management_price_monthly"] ? Number(map["task_management_price_monthly"]) : DEFAULT_PLATFORM_PRICING.taskPriceMonthly,
      taskPriceYearly: map["task_management_price_yearly"] ? Number(map["task_management_price_yearly"]) : DEFAULT_PLATFORM_PRICING.taskPriceYearly,
      expensePriceMonthly: map["expense_management_price_monthly"] ? Number(map["expense_management_price_monthly"]) : DEFAULT_PLATFORM_PRICING.expensePriceMonthly,
      expensePriceYearly: map["expense_management_price_yearly"] ? Number(map["expense_management_price_yearly"]) : DEFAULT_PLATFORM_PRICING.expensePriceYearly,
      hrExtraEmployeePrice: map["hr_extra_employee_price"] ? Number(map["hr_extra_employee_price"]) : DEFAULT_PLATFORM_PRICING.hrExtraEmployeePrice,
      crmExtraMemberPrice: map["crm_extra_member_price"] ? Number(map["crm_extra_member_price"]) : DEFAULT_PLATFORM_PRICING.crmExtraMemberPrice,
      platformExtraUserPrice: map["platform_extra_user_price"] ? Number(map["platform_extra_user_price"]) : DEFAULT_PLATFORM_PRICING.platformExtraUserPrice,
      yearlyDiscountPct: map["yearly_discount_pct"] ? Number(map["yearly_discount_pct"]) : DEFAULT_PLATFORM_PRICING.yearlyDiscountPct,
      allowFreePlan: map["allow_free_plan"] ? map["allow_free_plan"] !== "false" : true,
    };

    cachedPricing = parsed;
    return parsed;
  } catch (err) {
    console.warn("Failed to fetch platform pricing from platform_settings:", err);
    return cachedPricing || DEFAULT_PLATFORM_PRICING;
  }
}

export function usePlatformPricing() {
  const [pricing, setPricing] = useState<PlatformPricingSettings>(cachedPricing || DEFAULT_PLATFORM_PRICING);
  const [loading, setLoading] = useState<boolean>(!cachedPricing);

  useEffect(() => {
    let mounted = true;
    fetchPlatformPricing().then((res) => {
      if (mounted) {
        setPricing(res);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { pricing, loading, refresh: fetchPlatformPricing };
}

export async function savePlatformPricingKeys(updates: Record<string, string | number>): Promise<{ success: boolean; error?: string }> {
  try {
    for (const [key, rawVal] of Object.entries(updates)) {
      const valStr = String(rawVal);
      const { error } = await supabase
        .from("platform_settings")
        .upsert({ key, value: valStr, updated_at: new Date().toISOString() }, { onConflict: "key" });

      if (error) {
        try {
          await supabase.rpc("update_platform_setting", { p_key: key, p_value: valStr });
        } catch (rpcErr: any) {
          return { success: false, error: error.message || rpcErr.message };
        }
      }
    }
    // Bust local cache
    cachedPricing = null;
    await fetchPlatformPricing();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to save settings" };
  }
}
