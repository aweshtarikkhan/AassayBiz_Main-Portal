import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Sparkles, Layers, Users, Receipt, CheckSquare } from "lucide-react";
import { usePlatformPricing, savePlatformPricingKeys } from "@/lib/platform-pricing";

// Alias mapping between modern plan keys and legacy keys
const PLAN_ALIASES: Record<string, string> = {
  accounting: "plan_2",
  suite: "plan_3",
  hr: "plan_4",
  crm: "plan_5",
  promotion: "plan_6",
};

// Helper to ensure prices from DB are in Rupees
const normalizePriceToRupees = (price: number, isYearly: boolean): number => {
  if (!price || price <= 0) return 0;
  if (isYearly) {
    return price >= 50000 ? Math.round(price / 100) : price;
  }
  return price >= 10000 ? Math.round(price / 100) : price;
};

export function PlansManager() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState<string | null>(null);
  const { toast } = useToast();

  // Dynamic Add-on Pricing from platform_settings
  const { pricing: dbPricing, refresh: refreshPricing } = usePlatformPricing();
  const [addonPrices, setAddonPrices] = useState({
    taskMonthly: 99,
    taskYearly: 1188,
    expenseMonthly: 499,
    expenseYearly: 5988,
    hrExtraMonthly: 49,
    hrExtraYearly: 588,
    crmExtraMonthly: 99,
    crmExtraYearly: 1188,
    platformUserMonthly: 99,
  });
  const [savingAddons, setSavingAddons] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    if (dbPricing) {
      setAddonPrices({
        taskMonthly: dbPricing.taskPriceMonthly,
        taskYearly: dbPricing.taskPriceYearly,
        expenseMonthly: dbPricing.expensePriceMonthly,
        expenseYearly: dbPricing.expensePriceYearly,
        hrExtraMonthly: dbPricing.hrExtraEmployeePrice,
        hrExtraYearly: dbPricing.hrExtraEmployeePrice * 12,
        crmExtraMonthly: dbPricing.crmExtraMemberPrice,
        crmExtraYearly: dbPricing.crmExtraMemberPrice * 12,
        platformUserMonthly: dbPricing.platformExtraUserPrice,
      });
    }
  }, [dbPricing]);

  const loadPlans = async () => {
    setLoading(true);
    const { data } = await supabase.from("plans").select("*").order("sort_order");
    if (data) setPlans(data);
    setLoading(false);
  };

  const handleUpdate = async (planName: string, monthly: number, yearly: number) => {
    setSavingPlan(planName);

    const planNamesToUpdate = [planName];
    if (PLAN_ALIASES[planName]) planNamesToUpdate.push(PLAN_ALIASES[planName]);
    const reverseAlias = Object.entries(PLAN_ALIASES).find(([, v]) => v === planName)?.[0];
    if (reverseAlias) planNamesToUpdate.push(reverseAlias);

    try {
      // 1. Direct update to plans table
      const { error: directErr } = await supabase
        .from("plans")
        .update({
          price_monthly: monthly,
          price_yearly: yearly,
          updated_at: new Date().toISOString()
        })
        .in("name", planNamesToUpdate);

      // 2. RPC call for trigger/backend sync
      try {
        await supabase.rpc("update_plan_price", {
          p_plan_name: planName,
          p_price_monthly: monthly,
          p_price_yearly: yearly
        });
      } catch (_) {}

      if (directErr) {
        toast({ title: "Error Updating Plan", description: directErr.message, variant: "destructive" });
      } else {
        toast({ title: "Plan Pricing Saved! 💳", description: `Updated ${planName} pricing.` });
        loadPlans();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingPlan(null);
    }
  };

  const handleSaveAddonPrices = async () => {
    setSavingAddons(true);
    try {
      const updates = {
        task_management_price_monthly: addonPrices.taskMonthly,
        task_management_price_yearly: addonPrices.taskYearly,
        expense_management_price_monthly: addonPrices.expenseMonthly,
        expense_management_price_yearly: addonPrices.expenseYearly,
        hr_extra_employee_price: addonPrices.hrExtraMonthly,
        crm_extra_member_price: addonPrices.crmExtraMonthly,
        platform_extra_user_price: addonPrices.platformUserMonthly,
      };

      const res = await savePlatformPricingKeys(updates);
      if (res.success) {
        toast({
          title: "Add-on Pricing Updated! 🚀",
          description: "Task Management, Expense Management, HR staff, and CRM user rates saved to platform settings.",
        });
        await refreshPricing();
      } else {
        toast({
          title: "Error Saving Pricing",
          description: res.error || "Could not save platform settings",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({ title: "Save Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingAddons(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin h-6 w-6 text-indigo-600" />
      </div>
    );
  }

  // Deduplicate: filter out legacy plan_* entries if modern canonical key exists
  const hasModernKeys = plans.some(p => ["accounting", "suite", "hr", "crm", "promotion"].includes(p.name));
  const displayPlans = hasModernKeys 
    ? plans.filter(p => !p.name.startsWith("plan_"))
    : plans;

  return (
    <div className="space-y-8">
      {/* ── Section 1: Module & Add-on Unit Pricing (Task, Expense, HR, CRM) ── */}
      <Card className="bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/20 border-indigo-100/80 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-white/80 border-b border-indigo-100/60 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Module & Add-on Unit Pricing (Per-Employee / Per-User)
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Configure dynamic rates for Task Management, Expense Management, and capacity expansion. These prices dynamically apply across the Pricing Page, Update Plan dialog, and Checkout.
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={handleSaveAddonPrices}
              disabled={savingAddons}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm shrink-0"
            >
              {savingAddons ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
              Save All Add-on Rates
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Task Management */}
            <div className="p-4 rounded-xl border border-amber-200/80 bg-white shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Task Management</h4>
                  <p className="text-[10px] text-slate-500">Per employee / month</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-600 uppercase">Monthly (₹/emp/mo)</Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">₹</span>
                  <Input
                    type="number"
                    value={addonPrices.taskMonthly}
                    onChange={(e) => {
                      const m = parseInt(e.target.value) || 0;
                      setAddonPrices({ ...addonPrices, taskMonthly: m, taskYearly: m * 12 });
                    }}
                    className="h-8 text-xs font-bold bg-slate-50 border-slate-300"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-600 uppercase">Yearly (₹/emp/yr)</Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">₹</span>
                  <Input
                    type="number"
                    value={addonPrices.taskYearly}
                    onChange={(e) => setAddonPrices({ ...addonPrices, taskYearly: parseInt(e.target.value) || 0 })}
                    className="h-8 text-xs font-bold bg-slate-50 border-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* Expense Management */}
            <div className="p-4 rounded-xl border border-emerald-200/80 bg-white shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Expense Management</h4>
                  <p className="text-[10px] text-slate-500">Per employee / month</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-600 uppercase">Monthly (₹/emp/mo)</Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">₹</span>
                  <Input
                    type="number"
                    value={addonPrices.expenseMonthly}
                    onChange={(e) => {
                      const m = parseInt(e.target.value) || 0;
                      setAddonPrices({ ...addonPrices, expenseMonthly: m, expenseYearly: m * 12 });
                    }}
                    className="h-8 text-xs font-bold bg-slate-50 border-slate-300"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-600 uppercase">Yearly (₹/emp/yr)</Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">₹</span>
                  <Input
                    type="number"
                    value={addonPrices.expenseYearly}
                    onChange={(e) => setAddonPrices({ ...addonPrices, expenseYearly: parseInt(e.target.value) || 0 })}
                    className="h-8 text-xs font-bold bg-slate-50 border-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* Extra HR Attendance Staff */}
            <div className="p-4 rounded-xl border border-blue-200/80 bg-white shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Extra Attendance Staff</h4>
                  <p className="text-[10px] text-slate-500">Per employee / month</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-600 uppercase">Monthly (₹/emp/mo)</Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">₹</span>
                  <Input
                    type="number"
                    value={addonPrices.hrExtraMonthly}
                    onChange={(e) => {
                      const m = parseInt(e.target.value) || 0;
                      setAddonPrices({ ...addonPrices, hrExtraMonthly: m, hrExtraYearly: m * 12 });
                    }}
                    className="h-8 text-xs font-bold bg-slate-50 border-slate-300"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-600 uppercase">Yearly (₹/emp/yr)</Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">₹</span>
                  <Input
                    type="number"
                    value={addonPrices.hrExtraYearly}
                    onChange={(e) => setAddonPrices({ ...addonPrices, hrExtraYearly: parseInt(e.target.value) || 0 })}
                    className="h-8 text-xs font-bold bg-slate-50 border-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* Extra CRM Sales Executive */}
            <div className="p-4 rounded-xl border border-purple-200/80 bg-white shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Extra CRM Sales User</h4>
                  <p className="text-[10px] text-slate-500">Per user / month</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-600 uppercase">Monthly (₹/user/mo)</Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">₹</span>
                  <Input
                    type="number"
                    value={addonPrices.crmExtraMonthly}
                    onChange={(e) => {
                      const m = parseInt(e.target.value) || 0;
                      setAddonPrices({ ...addonPrices, crmExtraMonthly: m, crmExtraYearly: m * 12 });
                    }}
                    className="h-8 text-xs font-bold bg-slate-50 border-slate-300"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-600 uppercase">Yearly (₹/user/yr)</Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">₹</span>
                  <Input
                    type="number"
                    value={addonPrices.crmExtraYearly}
                    onChange={(e) => setAddonPrices({ ...addonPrices, crmExtraYearly: parseInt(e.target.value) || 0 })}
                    className="h-8 text-xs font-bold bg-slate-50 border-slate-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: Subscription Plans & Pricing (Base Plans) ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Subscription Plans & Base Pricing</h3>
            <p className="text-xs text-slate-500">Configure base subscription pricing for monthly and annual billing cycles.</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadPlans} className="text-xs">
            Refresh Plans
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayPlans.map(plan => {
            const planTypeName = (plan.plan_type || "tiered").toUpperCase();

            return (
              <Card key={plan.id} className="bg-white border-slate-200 text-slate-800 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold text-slate-900">{plan.display_name || plan.name}</CardTitle>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {planTypeName}
                    </span>
                  </div>
                  <CardDescription className="text-slate-500 text-xs font-mono">Key: {plan.name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Monthly Price (₹)
                    </Label>
                    <div className="flex gap-2">
                      <span className="flex items-center text-slate-500 font-bold text-sm">₹</span>
                      <Input 
                        type="number" 
                        className="bg-slate-50 border-slate-300 text-slate-900 font-bold focus:border-indigo-600 h-10"
                        value={normalizePriceToRupees(plan.price_monthly, false)} 
                        onChange={e => {
                          const newPlans = [...plans];
                          const idx = newPlans.findIndex(p => p.id === plan.id);
                          newPlans[idx].price_monthly = parseInt(e.target.value) || 0;
                          setPlans(newPlans);
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Yearly Price (₹)
                    </Label>
                    <div className="flex gap-2">
                      <span className="flex items-center text-slate-500 font-bold text-sm">₹</span>
                      <Input 
                        type="number" 
                        className="bg-slate-50 border-slate-300 text-slate-900 font-bold focus:border-indigo-600 h-10"
                        value={normalizePriceToRupees(plan.price_yearly, true)} 
                        onChange={e => {
                          const newPlans = [...plans];
                          const idx = newPlans.findIndex(p => p.id === plan.id);
                          newPlans[idx].price_yearly = parseInt(e.target.value) || 0;
                          setPlans(newPlans);
                        }}
                      />
                    </div>
                  </div>

                  <Button 
                    className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20"
                    disabled={savingPlan === plan.name}
                    onClick={() => handleUpdate(plan.name, plan.price_monthly, plan.price_yearly)}
                  >
                    {savingPlan === plan.name ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Save Prices
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
