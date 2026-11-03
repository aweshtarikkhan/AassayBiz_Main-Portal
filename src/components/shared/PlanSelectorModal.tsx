import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Check, Loader2, Minus, Plus, Users, Sparkles, Download, CheckCircle2, AlertCircle, Mail, FileText, Gift, Calculator, Target, Megaphone, Crown, MessageSquare, BarChart3, Bell, ArrowRight, Clock, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFeatureStore } from "@/store/feature-store";
import { useAppStore } from "@/store/app-store";
import { useAuth } from "@/lib/auth";
import {
  SubscriptionInvoiceData,
  downloadSubscriptionInvoicePDF,
} from "@/lib/subscription-invoice-pdf";
import { sendSubscriptionInvoiceEmail } from "@/lib/subscription-email-service";
import { normalizePlanKey } from "@/lib/subscription";

interface Plan {
  id: string;
  name: string;
  display_name: string;
  plan_type: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  employee_limit: number | null;
  employee_price_extra: number | null;
}

interface PlanSelectorModalProps {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  currentPlanName?: string;
  forceOrgId?: string | null;
  orgId?: string | null;
}

// Helper to ensure prices from DB are always in Rupees (handling both rupee-stored and paise-stored values safely)
const normalizePriceToRupees = (price: number, isYearly: boolean): number => {
  if (!price || price <= 0) return 0;
  if (isYearly) {
    return price >= 50000 ? Math.round(price / 100) : price;
  }
  return price >= 10000 ? Math.round(price / 100) : price;
};

export function PlanSelectorModal({ 
  open, 
  onClose, 
  onOpenChange, 
  currentPlanName, 
  forceOrgId, 
  orgId: propOrgId 
}: PlanSelectorModalProps) {
  const handleModalClose = () => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [yearlyDiscountPct, setYearlyDiscountPct] = useState(20);
  const [promoCode, setPromoCode] = useState("");
  const [validCoupon, setValidCoupon] = useState<{ id: string; amount: number; type: string } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [processingPlan, setProcessingPlan] = useState<boolean>(false);
  
  // Selection state for NEW plans to purchase
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  
  // Active subscription details for the current organization
  const [activePlanNames, setActivePlanNames] = useState<string[]>([]);
  const [activeEmployeeLimit, setActiveEmployeeLimit] = useState<number>(5);
  
  // Extra employee counts:
  // When HR is already active: how many additional employees user wants to add
  const [extraEmployeesToAdd, setExtraEmployeesToAdd] = useState<number>(() => {
    const h = sessionStorage.getItem("onboarding_hr");
    return h ? parseInt(h) || 0 : 0;
  });
  const [extraPlatformEmployeesToAdd, setExtraPlatformEmployeesToAdd] = useState<number>(() => {
    const p = sessionStorage.getItem("onboarding_plat");
    return p ? parseInt(p) || 0 : 0;
  });
  const [extraCrmMembersToAdd, setExtraCrmMembersToAdd] = useState<number>(() => {
    const c = sessionStorage.getItem("onboarding_crm");
    return c ? parseInt(c) || 0 : 0;
  });


  const { toast } = useToast();
  const { user } = useAuth();
  const [completedInvoice, setCompletedInvoice] = useState<SubscriptionInvoiceData | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const currentOrg = useAppStore((s) => s.organization);
  const storeOrgId = useFeatureStore((s) => s.currentOrgId);
  const orgId = forceOrgId || propOrgId || currentOrg?.id || (storeOrgId && storeOrgId !== "default" ? storeOrgId : null);

  useEffect(() => {
    if (open) {
      loadData();
      loadRazorpayScript();
    } else {
      setSelectedPlanIds([]);
      setExtraEmployeesToAdd(0);
      setValidCoupon(null);
      setPromoCode("");
    }
  }, [open, orgId]);

  const loadRazorpayScript = () => {
    if (document.getElementById("razorpay-script")) return;
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: plansData }, { data: settingsData }, { data: allowFreeData }, { data: subData }] = await Promise.all([
        supabase.from("plans").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("platform_settings").select("key, value").eq("key", "yearly_discount_pct").maybeSingle(),
        supabase.from("platform_settings").select("key, value").eq("key", "allow_free_plan").maybeSingle(),
        orgId ? supabase.rpc("get_my_org_subscription", { p_org_id: orgId }) : Promise.resolve({ data: null })
      ]);
      
      let finalPlans = (plansData as Plan[]) || [];
      if (allowFreeData && allowFreeData.value === "false") {
        finalPlans = finalPlans.filter(p => p.name !== "free");
      }
      
      // Deduplicate plans (filter out legacy plan_X aliases and deduplicate by normalized key)
      const seen = new Set<string>();
      finalPlans = finalPlans.filter(p => {
        if (p.name.startsWith("plan_")) return false;
        const key = normalizePlanKey(p.name);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setPlans(finalPlans);
      
      if (settingsData?.value) {
        setYearlyDiscountPct(parseInt(settingsData.value));
      }

      // Parse current active plans from database
      let fetchedActivePlans: string[] = [];

      if (subData && subData.plan_name) {
        fetchedActivePlans = subData.plan_name
          .split("+")
          .map((s: string) => normalizePlanKey(s))
          .filter(Boolean);
      }

      if (fetchedActivePlans.length === 0) {
        fetchedActivePlans = ["free"];
      }

      // Determine standard base limit for the active plan (NEVER SUMMED)
      let planBaseLimit = 3;
      if (fetchedActivePlans.includes("suite") || fetchedActivePlans.includes("hr")) {
        planBaseLimit = 25;
      } else {
        planBaseLimit = 3;
      }

      let empLimit = planBaseLimit;

      // Only respect genuine purchased extra employees (employee_count in subscriptions table)
      // Never use subData.employee_limit as it sums multiple plans in old accounts
      const purchasedCount = subData?.employee_count || 0;
      if ((fetchedActivePlans.includes("suite") || fetchedActivePlans.includes("hr")) && purchasedCount > 25) {
        empLimit = purchasedCount;
      }

      // Direct query to subscriptions table to check if there is a purchased employee_count > 25
      if (orgId && (fetchedActivePlans.includes("suite") || fetchedActivePlans.includes("hr"))) {
        const { data: directSub } = await supabase
          .from("subscriptions")
          .select("employee_count")
          .eq("org_id", orgId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (directSub?.employee_count && directSub.employee_count > empLimit) {
          empLimit = directSub.employee_count;
        }
      }

      setActivePlanNames(fetchedActivePlans);
      setActiveEmployeeLimit(empLimit);
      setExtraEmployeesToAdd(0);
      setSelectedPlanIds([]);

    } catch (error) {
      console.error("Failed to load plans:", error);
    }
    setLoading(false);
  };

  // Status checks for plans
  const isSuiteActive = activePlanNames.includes("suite");
  const hasPaidPlanActive = isSuiteActive || activePlanNames.some(p => p !== "free");
  const isFreeActive = true; // Free plan is always active as the base plan for every organization

  const isPlanActive = (planName: string) => {
    const key = normalizePlanKey(planName);
    if (key === "free") return true;
    if (key === "suite") return isSuiteActive;
    if (isSuiteActive) return true; // Suite includes all modular plans
    return activePlanNames.includes(key);
  };

  const isHrActive = isPlanActive("hr") || isPlanActive("suite");

  const getPlanDescription = (planName: string): string => {
    const key = normalizePlanKey(planName);
    switch (key) {
      case "free":
        return "Basic invoicing & business features — 100% Free for 6 Months";
      case "accounting":
        return "Full billing, sales, purchases & inventory management";
      case "hr":
        return "Complete HR solution — attendance, payroll, leaves & shifts";
      case "crm":
        return "Manage leads, deals, sales pipeline and customer relationships";
      case "promotion":
        return "Festival posters, WhatsApp & broadcast marketing campaigns";
      case "suite":
        return "Complete all-in-one business suite with full system access!";
      default:
        return "";
    }
  };

  const getPlanDisplayName = (plan: Plan): string => {
    const key = normalizePlanKey(plan.name);
    switch (key) {
      case "free":
        return "Free Plan";
      case "accounting":
        return "Business Accounting";
      case "hr":
        return "Business HR";
      case "crm":
        return "Business CRM";
      case "promotion":
        return "Business Promotion";
      case "suite":
        return "Business Suite";
      default:
        return plan.display_name || plan.name;
    }
  };

  const getDisplayFeatures = (plan: Plan): string[] => {
    const key = normalizePlanKey(plan.name);
    switch (key) {
      case "free":
        return [
          "100 Invoices Free",
          "3 Employee Attendance",
          "Festive Posts",
          "Up to 50 Leads"
        ];
      case "accounting":
        return [
          "Everything in Free Plan",
          "Unlimited Invoices",
          "Unlimited Quotation & POS",
          "Inventory Management",
          "500 WhatsApp messages",
          "GST Ready Output",
          "Platform access up to 3 employees"
        ];
      case "hr":
        return [
          "Everything in Free Plan",
          "25 Employee Attendance",
          "Attendance & Payroll",
          "Shifts & Leaves",
          "500 WhatsApp messages",
          "Platform access up to 3 employees"
        ];
      case "crm":
        return [
          "Everything in Free Plan",
          "Unlimited Leads",
          "API Integrations",
          "Sales Pipeline",
          "CRM Portal Access for 2 Sales Team Members",
          "Additional Member: ₹999/Month per user",
          "500 WhatsApp messages",
          "Platform access up to 3 employees"
        ];
      case "promotion":
        return [
          "Everything in Free Plan",
          "All Poster Categories",
          "Email & WhatsApp Campaign",
          "500 WhatsApp messages",
          "Platform access up to 3 employees"
        ];
      case "suite":
        return [
          "Everything in Free Plan + Business Accounting + Business HR + Business CRM + Business Promotion",
          "CRM Portal Access for 2 Sales Team Members (Add extra @ ₹999/Mo)",
          "Platform Access up to 5 employees"
        ];
      default:
        return plan.features || [];
    }
  };

  const handleApplyPromo = async () => {
    const trimmed = promoCode.trim().toUpperCase();
    if (!trimmed) {
      setPromoError("Please enter a promo code");
      return;
    }
    setCouponLoading(true);
    setPromoError(null);
    setPromoSuccess(null);
    try {
      const { data, error } = await supabase.rpc("validate_coupon", {
        p_code: trimmed,
        p_billing_cycle: billingCycle,
      });
      if (error) throw error;
      if (data?.valid) {
        setValidCoupon({
          id: data.coupon_id,
          type: data.discount_type,
          amount: data.discount_value
        });
        setPromoSuccess(data.description || "Promo code applied successfully!");
        setPromoError(null);
        toast({ title: "Promo code applied!", description: data.description });
      } else {
        setValidCoupon(null);
        setPromoError(data?.error || "Invalid promo code");
      }
    } catch (err: any) {
      setValidCoupon(null);
      setPromoError(err.message || "Invalid promo code");
    }
    setCouponLoading(false);
  };

  // Cost calculation for extra platform employees (rate: ₹99/user/mo in RUPEES, with 20% off if yearly)
  const getExtraPlatformEmployeeCost = (count: number) => {
    if (count <= 0) return 0;
    const rateRupees = 99;
    if (billingCycle === "yearly") {
      return Math.round((count * rateRupees * 12) * (1 - yearlyDiscountPct / 100));
    }
    return count * rateRupees;
  };

  // Cost calculation for extra CRM members (rate: ₹999/member/mo in RUPEES, with 20% off if yearly)
  const getExtraCrmMemberCost = (count: number) => {
    if (count <= 0) return 0;
    const rateRupees = 999;
    if (billingCycle === "yearly") {
      return Math.round((count * rateRupees * 12) * (1 - yearlyDiscountPct / 100));
    }
    return count * rateRupees;
  };

  // Cost calculation for extra HR employees (rate: ₹29/employee/mo in RUPEES, with 20% off if yearly)
  const getExtraEmployeeCost = (count: number) => {
    if (count <= 0) return 0;
    const rateRupees = 29;
    if (billingCycle === "yearly") {
      return Math.round((count * rateRupees * 12) * (1 - yearlyDiscountPct / 100));
    }
    return count * rateRupees;
  };

  const togglePlan = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    // If Free Plan is clicked, select it directly without error
    if (plan.name === "free") {
      setSelectedPlanIds([planId]);
      return;
    }

    // If plan is already active, inform user
    if (isPlanActive(plan.name)) {
      if (plan.name === "hr") {
        toast({
          title: "HR is Already Active",
          description: "Business HR and Business Suite include 25 employees by default. Use the counter inside the HR card below to add extra employees at ₹29 each.",
        });
      } else {
        toast({
          title: "Plan Already Active",
          description: `${plan.display_name} is already active for your business.`,
        });
      }
      return;
    }

    setSelectedPlanIds(prev => {
      const isSelecting = !prev.includes(planId);
      if (isSelecting) {
        const freePlan = plans.find(p => p.name === "free");
        const newSet = prev.filter(id => id !== freePlan?.id);
        return [...newSet, planId];
      } else {
        return prev.filter(id => id !== planId);
      }
    });
  };

  // Final set of newly selected plans
  const finalSelectedPlanIds = new Set<string>(selectedPlanIds);
  const hasNewlySelectedSuite = Array.from(finalSelectedPlanIds).some(id => plans.find(p => p.id === id)?.name === "suite");

  // Calculate total amount to pay in RUPEES
  let totalAmountRupees = 0;

  // 1. Add cost of newly selected plans (excluding already active ones)
  Array.from(finalSelectedPlanIds).forEach(id => {
    const plan = plans.find(p => p.id === id);
    if (!plan) return;
    if (isPlanActive(plan.name)) return;
    if (hasNewlySelectedSuite && plan.name !== "suite" && plan.name !== "free") return;

    const rawBase = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;
    let base = normalizePriceToRupees(rawBase, billingCycle === "yearly");
    totalAmountRupees += base;
  });

  // 2. Add cost of extra employees only if user explicitly requested additional slots via counter
  if (extraEmployeesToAdd > 0) {
    totalAmountRupees += getExtraEmployeeCost(extraEmployeesToAdd);
  }
  if (extraPlatformEmployeesToAdd > 0) {
    totalAmountRupees += getExtraPlatformEmployeeCost(extraPlatformEmployeesToAdd);
  }
  if (extraCrmMembersToAdd > 0) {
    totalAmountRupees += getExtraCrmMemberCost(extraCrmMembersToAdd);
  }

  const subtotalBeforeDiscountRupees = totalAmountRupees;

  // 3. Apply discount coupon if valid
  if (validCoupon) {
    if (validCoupon.type === "percentage") {
      totalAmountRupees = totalAmountRupees - Math.floor((totalAmountRupees * validCoupon.amount) / 100);
    } else {
      totalAmountRupees = Math.max(0, totalAmountRupees - validCoupon.amount);
    }
  }

  const isOnlyAddingExtraEmployees = 
    isHrActive && 
    extraEmployeesToAdd > 0 && 
    (finalSelectedPlanIds.size === 0 || Array.from(finalSelectedPlanIds).every(id => isPlanActive(plans.find(p => p.id === id)?.name || "")));

  const isFreeSelected = Array.from(finalSelectedPlanIds).some(id => plans.find(p => p.id === id)?.name === "free");
  const hasPaidPlanSelected = Array.from(finalSelectedPlanIds).some(id => {
    const p = plans.find(pl => pl.id === id);
    return p && p.name !== "free";
  });
  const hasAddonSelected = (isHrActive && extraEmployeesToAdd > 0) || extraPlatformEmployeesToAdd > 0 || extraCrmMembersToAdd > 0;

  // Free plan is selectable/continuable if on free plan with no paid items picked, or free plan card clicked
  const canContinueWithFree = (!hasPaidPlanActive && !hasPaidPlanSelected && !hasAddonSelected) || (isFreeSelected && !hasPaidPlanSelected && !hasAddonSelected);

  const hasAnyActionToCheckout = hasPaidPlanSelected || hasAddonSelected || canContinueWithFree;

  const gstAmountRupees = Math.round(totalAmountRupees * 0.18);
  const finalAmountRupees = totalAmountRupees + gstAmountRupees;
  const finalAmountPaise = Math.round(finalAmountRupees * 100);

  const handleCheckout = async () => {
    if (!orgId) {
      toast({ title: "Organization Missing", description: "Please select an active organization before upgrading.", variant: "destructive" });
      return;
    }
    setProcessingPlan(true);

    try {
      // Determine plan names to activate/keep
      let targetPlanNames: string[] = [];

      if (isOnlyAddingExtraEmployees) {
        // Keep currently active plans (filter out 'free' if paid plans exist)
        const paidActive = activePlanNames.filter(p => p !== "free");
        targetPlanNames = paidActive.length > 0 ? paidActive : ["suite"];
      } else {
        targetPlanNames = Array.from(finalSelectedPlanIds)
          .map(id => plans.find(p => p.id === id)?.name)
          .filter(Boolean) as string[];
        
        if (targetPlanNames.includes("free") && targetPlanNames.length === 1) {
          // Explicitly chose free
          targetPlanNames = ["free"];
        } else {
          // Preserve any already active paid plans so they aren't lost
          activePlanNames.forEach(p => {
            if (p !== "free" && !targetPlanNames.includes(p)) {
              targetPlanNames.push(p);
            }
          });
        }
      }

      // If user is adding extra employees or HR/Suite was active, ensure suite or hr remains active
      if (extraEmployeesToAdd > 0 || isHrActive) {
        if (!targetPlanNames.includes("suite") && !targetPlanNames.includes("hr")) {
          targetPlanNames.push(isSuiteActive || activePlanNames.includes("suite") ? "suite" : "hr");
        }
      }

      // If any paid plan is present in targetPlanNames, strip "free"
      if (targetPlanNames.some(p => p !== "free")) {
        targetPlanNames = targetPlanNames.filter(p => p !== "free");
      }

      // Safeguard: if targetPlanNames is somehow still empty, fall back to active plans or free
      if (targetPlanNames.length === 0) {
        targetPlanNames = activePlanNames.length > 0 ? activePlanNames : ["free"];
      }

      // Determine base limit for the TARGET plan being checked out
      const isSuiteOrHrTarget = targetPlanNames.includes("suite") || targetPlanNames.includes("hr");
      const targetBaseLimit = isSuiteOrHrTarget ? 25 : 3;

      let totalEmployeesToSend = targetBaseLimit;

      if (isOnlyAddingExtraEmployees) {
        // Adding extra employees to existing active plan
        let currentLimit = Math.max(activeEmployeeLimit || targetBaseLimit, targetBaseLimit);
        if (orgId) {
          try {
            const { data: latestSub } = await supabase
              .from("subscriptions")
              .select("employee_count")
              .eq("org_id", orgId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (latestSub?.employee_count && latestSub.employee_count > currentLimit) {
              currentLimit = latestSub.employee_count;
            }
          } catch (e) {
            console.warn("Could not re-fetch latest sub:", e);
          }
        }
        totalEmployeesToSend = currentLimit + extraEmployeesToAdd;
      } else {
        // Purchasing / upgrading to a new plan
        if (extraEmployeesToAdd > 0) {
          totalEmployeesToSend = targetBaseLimit + extraEmployeesToAdd;
        } else if (isSuiteOrHrTarget && activeEmployeeLimit > 25) {
          // If already on Suite/HR and had purchased extra capacity, preserve it
          totalEmployeesToSend = activeEmployeeLimit;
        } else {
          totalEmployeesToSend = targetBaseLimit;
        }
      }

      // If total amount is 0 (Free plan selected or 100% coupon)
      if (finalAmountPaise <= 0) {
        // SECURITY CHECK: If there is no valid 100% discount coupon, users can ONLY activate 'free' plan!
        // Never allow paid plans (hr, suite, crm, accounting, promotion) to be activated for zero payment without a verified coupon!
        const isLegit100PercentCoupon = Boolean(
          validCoupon && (
            (validCoupon.type === "percentage" && validCoupon.amount >= 100) ||
            ((validCoupon.type === "fixed" || validCoupon.type === "flat") && subtotalBeforeDiscountRupees > 0 && validCoupon.amount >= subtotalBeforeDiscountRupees)
          )
        );

        let plansToActivate = ["free"];
        if (isLegit100PercentCoupon) {
          plansToActivate = targetPlanNames.filter(p => p !== "free");
          if (plansToActivate.length === 0) plansToActivate = ["free"];
        }

        const appliedCode = isLegit100PercentCoupon && promoCode.trim() ? promoCode.trim().toUpperCase() : null;
        const zeroOrderId = appliedCode ? `COUPON_FREE_${Date.now()}` : "FREE_PLAN";
        const zeroPaymentId = appliedCode ? `COUPON_FREE_${Date.now()}` : "FREE_PLAN";
        const finalEmpCountToSend = plansToActivate.includes("free") && plansToActivate.length === 1 ? 3 : totalEmployeesToSend;

        try {
          const { data: actResult, error: actError } = await supabase.rpc("activate_org_plans", {
            p_org_id: orgId,
            p_plan_names: plansToActivate,
            p_billing_cycle: billingCycle,
            p_employee_count: finalEmpCountToSend,
            p_razorpay_order_id: zeroOrderId,
            p_razorpay_payment_id: zeroPaymentId,
            p_coupon_code: appliedCode
          });
          if (actError) console.warn("activate_org_plans notice:", actError);
          if (actResult?.features && Array.isArray(actResult.features)) {
            useFeatureStore.getState().setOrgFeatures(orgId, actResult.features);
          }
        } catch (rpcErr) {
          console.warn("activate_org_plans notice:", rpcErr);
        }

        // Ensure coupon usage count is incremented in DB
        if (appliedCode) {
          try {
            await supabase.rpc("redeem_coupon", {
              p_code: appliedCode,
              p_org_id: orgId,
              p_discount_applied: validCoupon?.amount || 0,
              p_order_id: zeroOrderId
            });
          } catch (couponErr) {
            console.warn("Coupon redeem error:", couponErr);
          }
        }

        const resolvedPlan = plansToActivate.includes('free') && plansToActivate.length === 1 
          ? 'free' 
          : (plansToActivate.includes('suite') ? 'suite' : plansToActivate[0] || 'free');

        // Also update the organizations table subscription_plan so it doesn't stay 'free'
        await supabase.from('organizations').update({ 
          subscription_plan: resolvedPlan 
        }).eq('id', orgId);

        if (!orgId || orgId === currentOrg?.id) {
          useFeatureStore.getState().setSubscriptionMeta({
            plan_name: resolvedPlan,
            status: 'active',
            trial_ends_at: null,
            employee_limit: totalEmployeesToSend,
            employee_count: totalEmployeesToSend,
            current_period_end: null
          });
        }

        // If standard Free Plan without a coupon, give clean success and close immediately
        if (plansToActivate.length === 1 && plansToActivate[0] === "free" && !appliedCode) {
          toast({
            title: "Business Starter Active! 🎉",
            description: "Your business has been initialized with the Free Plan for 6 months.",
          });
          setProcessingPlan(false);
          handleModalClose();
          return;
        }
        
        // Generate zero-value invoice and send email
        const now = new Date();
        const periodEnd = new Date(now);
        if (billingCycle === "yearly") {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }
        const formatDateStr = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        const invoiceNumber = `AB-SUB-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${Date.now().toString().slice(-4)}`;
        
        let planDisplay = targetPlanNames.map((p) => {
          const found = plans.find((pl) => pl.name === p);
          return found ? found.display_name : p.toUpperCase();
        }).join(" + ");

        if (targetPlanNames.includes("suite")) {
          planDisplay = "Aassay Biz - Flagship Business Suite";
        } else if (isOnlyAddingExtraEmployees) {
          planDisplay = `HRMS Capacity Expansion (+${extraEmployeesToAdd} Staff Slots)`;
        }

        const invoicePayload: SubscriptionInvoiceData = {
          invoiceNumber,
          invoiceDate: formatDateStr(now),
          billingCycle,
          planNames: targetPlanNames.length > 0 ? targetPlanNames : ["free"],
          planDisplayName: targetPlanNames.length === 0 || (targetPlanNames.length === 1 && targetPlanNames[0] === "free") ? "Free Forever Plan" : planDisplay,
          periodStart: formatDateStr(now),
          periodEnd: formatDateStr(periodEnd),
          customerName: user?.user_metadata?.full_name || currentOrg?.name || user?.email || "Valued Customer",
          customerEmail: user?.email || currentOrg?.email || "",
          customerPhone: currentOrg?.phone || undefined,
          organizationName: currentOrg?.name || "My Business",
          customerGstin: currentOrg?.tax_number || undefined,
          billingAddress: currentOrg?.billing_address || undefined,
          totalAmount: 0,
          subtotal: 0, taxAmount: 0,
          discount: 0,
          paymentMethod: "Promo Code / Free Plan",
          razorpayPaymentId: "N/A",
          razorpayOrderId: "N/A",
          employeeCount: totalEmployeesToSend,
        };

        setCompletedInvoice(invoicePayload);
        setShowSuccessModal(true);

        if (invoicePayload.customerEmail) {
          toast({
            title: "Plan Upgraded! 🚀",
            description: `Dispatching your Tax Invoice PDF to ${invoicePayload.customerEmail}...`,
          });
          sendSubscriptionInvoiceEmail(invoicePayload, orgId).then((res) => {
            if (res.success) {
              toast({ title: "Invoice Emailed! ✉️", description: `Tax Invoice delivered to ${invoicePayload.customerEmail}.` });
            }
          });
        }
        return;
      }

      // Ensure Razorpay checkout script is loaded
      if (typeof (window as any).Razorpay === "undefined") {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.id = "razorpay-script";
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Unable to load payment gateway SDK. Please check your internet connection."));
          document.body.appendChild(script);
        });
      }

      // Create Razorpay order via Edge Function
      const amountInRupees = Number(finalAmountRupees.toFixed(2));
      const { data: orderData, error: orderError } = await supabase.functions.invoke("create_razorpay_order", {
        body: {
          action: "create",
          org_id: orgId,
          selected_plan_ids: Array.from(finalSelectedPlanIds).join(','),
          plan_names: targetPlanNames,
          billing_cycle: billingCycle,
          coupon_code: validCoupon ? promoCode : undefined,
          hrms_employee_count: totalEmployeesToSend,
          total_amount: amountInRupees,
          amount_in_paise: finalAmountPaise
        }
      });
      
      if (orderError || !orderData || orderData.error) {
        let errMsg = orderError?.message || orderData?.error || "Failed to initialize payment order";
        throw new Error(errMsg);
      }

      // Open Razorpay Checkout
      const options = {
        key: orderData.razorpay_key_id,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Aassay Biz",
        description: isOnlyAddingExtraEmployees 
          ? `Add ${extraEmployeesToAdd} Extra Employee Slots`
          : `Aassay Biz Software Subscription`,
        order_id: orderData.order_id,
        handler: async function (response: any) {
          try {
            setProcessingPlan(true);
            const appliedCode = validCoupon && promoCode.trim() ? promoCode.trim().toUpperCase() : undefined;
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke("create_razorpay_order", {
              body: {
                action: "verify",
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                org_id: orgId,
                plan_names: targetPlanNames,
                billing_cycle: billingCycle,
                employee_count: totalEmployeesToSend,
                customer_email: user?.email || currentOrg?.email || "",
                customer_name: user?.user_metadata?.full_name || currentOrg?.name || "",
                total_amount: amountInRupees,
                coupon_code: appliedCode,
                discount_amount: validCoupon?.amount || 0
              }
            });

            if (verifyError || verifyData?.error) {
              throw new Error(verifyError?.message || verifyData?.error || "Payment verification failed");
            }

            if (verifyData?.result?.features && Array.isArray(verifyData.result.features)) {
              useFeatureStore.getState().setOrgFeatures(orgId, verifyData.result.features);
            }

            // Guaranteed client-side redemption logging if coupon was used
            if (appliedCode) {
              try {
                await supabase.rpc("redeem_coupon", {
                  p_code: appliedCode,
                  p_org_id: orgId,
                  p_discount_applied: validCoupon?.amount || 0,
                  p_order_id: response.razorpay_order_id
                });
              } catch (couponErr) {
                console.warn("Client-side coupon redeem check:", couponErr);
              }
            }
            
            // Generate official subscription invoice details
            const now = new Date();
            const periodEnd = new Date(now);
            if (billingCycle === "yearly") {
              periodEnd.setFullYear(periodEnd.getFullYear() + 1);
            } else {
              periodEnd.setMonth(periodEnd.getMonth() + 1);
            }

            const formatDateStr = (d: Date) =>
              d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            const invoiceNumber =
              verifyData?.invoice_number ||
              `AB-SUB-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${Date.now().toString().slice(-4)}`;

            let planDisplay = targetPlanNames
              .map((p) => {
                const found = plans.find((pl) => pl.name === p);
                return found ? found.display_name : p.toUpperCase();
              })
              .join(" + ");

            if (targetPlanNames.includes("suite")) {
              planDisplay = "Aassay Biz - Flagship Business Suite";
            } else if (isOnlyAddingExtraEmployees) {
              planDisplay = `HRMS Capacity Expansion (+${extraEmployeesToAdd} Staff Slots)`;
            }

            const invoicePayload: SubscriptionInvoiceData = {
              invoiceNumber,
              invoiceDate: formatDateStr(now),
              billingCycle,
              planNames: targetPlanNames,
              planDisplayName: planDisplay,
              periodStart: formatDateStr(now),
              periodEnd: formatDateStr(periodEnd),
              customerName: user?.user_metadata?.full_name || currentOrg?.name || user?.email || "Valued Customer",
              customerEmail: user?.email || currentOrg?.email || "",
              customerPhone: currentOrg?.phone || undefined,
              organizationName: currentOrg?.name || "My Business",
              customerGstin: currentOrg?.tax_number || undefined,
              billingAddress: currentOrg?.billing_address || undefined,
              totalAmount: Number(finalAmountRupees.toFixed(2)),
              subtotal: Number(totalAmountRupees.toFixed(2)),
              taxAmount: Number(gstAmountRupees.toFixed(2)),
              discount: validCoupon?.amount || 0,
              paymentMethod: "Razorpay Online (UPI/Cards/NetBanking)",
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              employeeCount: totalEmployeesToSend,
            };

            setCompletedInvoice(invoicePayload);
            setShowSuccessModal(true);

            // Update org subscription_plan in DB so it doesn't stay 'free'
            await supabase.from('organizations').update({ 
              subscription_plan: targetPlanNames.includes('suite') ? 'suite' : targetPlanNames[0] || 'suite' 
            }).eq('id', orgId);

            if (!orgId || orgId === currentOrg?.id) {
              // Update in-memory subscription meta so limit is reflected immediately
              useFeatureStore.getState().setSubscriptionMeta({
                plan_name: targetPlanNames[0] || 'suite',
                status: 'active',
                trial_ends_at: null,
                employee_limit: totalEmployeesToSend,
                employee_count: totalEmployeesToSend,
                current_period_end: null
              });
            }

            // Automatically dispatch the invoice email with PDF attachment
            if (invoicePayload.customerEmail) {
              toast({
                title: "Payment Confirmed! 🚀",
                description: `Dispatching your Tax Invoice PDF to ${invoicePayload.customerEmail}...`,
              });

              sendSubscriptionInvoiceEmail(invoicePayload, orgId)
                .then((res) => {
                  if (res.success) {
                    toast({
                      title: "Invoice Emailed! ✉️",
                      description: `Tax Invoice #${invoiceNumber} delivered to ${invoicePayload.customerEmail}.`,
                    });
                  } else {
                    console.warn("Subscription email dispatch returned:", res.error);
                  }
                })
                .catch((e) => {
                  console.error("Subscription email dispatch error:", e);
                });
            }
          } catch (err: any) {
            toast({
              title: "Activation Failed",
              description: err.message || "Payment was received but plan activation failed. Please contact support.",
              variant: "destructive"
            });
          } finally {
            setProcessingPlan(false);
          }
        },
        modal: {
          ondismiss: function () {
            setProcessingPlan(false);
          }
        },
        theme: { color: "#2563eb" }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        setProcessingPlan(false);
        toast({
          title: "Payment Failed",
          description: response.error?.description || "Transaction was declined by bank or cancelled.",
          variant: "destructive"
        });
      });
      rzp.open();

    } catch (err: any) {
      setProcessingPlan(false);
      const message = err.message?.includes("Failed to send a request")
        ? "Unable to reach the payment service. Please check your network connection and try again."
        : (err.message || "Failed to initiate plan upgrade.");
      toast({ title: "Upgrade Request Failed", description: message, variant: "destructive" });
    }
  };

  if (showSuccessModal && completedInvoice) {
    return (
      <Dialog open={open} onOpenChange={(val) => { if (!val) { setShowSuccessModal(false); window.location.reload(); } }}>
        <DialogContent 
          className="max-w-lg p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-3xl z-50 text-slate-900"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-[#160e3d] via-[#211559] to-[#28166f] p-8 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#e77817]/20 rounded-full blur-2xl pointer-events-none" />
            <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-400/40 text-orange-400 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <span className="inline-block bg-[#e77817] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-2">
              Payment Verified • Invoice Issued
            </span>
            <h2 className="text-2xl font-black tracking-tight text-white mb-1">
              Subscription Activated! 🚀
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm">
              Your plan is now active for <strong className="text-white">{completedInvoice.organizationName}</strong>
            </p>
          </div>

          {/* Details & Actions */}
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between text-slate-600">
                <span>Active Plan</span>
                <span className="font-bold text-slate-900">{completedInvoice.planDisplayName}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Tax Invoice No.</span>
                <span className="font-semibold text-slate-900 font-mono">{completedInvoice.invoiceNumber}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Amount Paid</span>
                <span className="font-extrabold text-orange-600 text-base">
                  ₹{Number(completedInvoice.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Valid Period</span>
                <span className="font-medium text-slate-700">{completedInvoice.periodStart} to {completedInvoice.periodEnd}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 flex items-start gap-3">
              <Mail className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div className="text-xs text-orange-950">
                <span className="font-bold block">Tax Invoice PDF Emailed!</span>
                An official GST Tax Invoice PDF has been dispatched to <strong>{completedInvoice.customerEmail}</strong>.
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <Button
                onClick={() => downloadSubscriptionInvoicePDF(completedInvoice)}
                className="w-full py-6 rounded-xl bg-[#e77817] hover:bg-[#ff8a24] text-white font-bold text-sm shadow-lg shadow-[#e77817]/25 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Tax Invoice (PDF)</span>
              </Button>
              <Button
                onClick={() => { setShowSuccessModal(false); window.location.reload(); }}
                variant="outline"
                className="w-full py-6 rounded-xl border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-sm"
              >
                Continue to Dashboard
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleModalClose} modal={false}>
      {open && <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm pointer-events-auto" onClick={handleModalClose} />}
      <DialogContent 
        className="max-w-5xl max-h-[90vh] overflow-y-auto z-50 bg-white text-slate-900 border-slate-200 shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-slate-900">Upgrade Your Plan</DialogTitle>
          <DialogDescription className="text-center text-slate-500">
            Select one or more plans to activate for your business, or manage employee capacity.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-slate-500">Loading active subscription & plans...</p>
          </div>
        ) : (
          <div className="space-y-8 mt-4">
            {/* Billing Cycle Toggle */}
            <div className="flex items-center justify-center gap-4 bg-slate-50 py-3 px-4 rounded-xl border border-slate-200 w-fit mx-auto">
              <span className={`text-sm font-semibold transition-colors ${billingCycle === "monthly" ? "text-primary" : "text-slate-500"}`}>
                Monthly Billing
              </span>
              <Switch 
                checked={billingCycle === "yearly"} 
                onCheckedChange={(c) => setBillingCycle(c ? "yearly" : "monthly")} 
              />
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold transition-colors ${billingCycle === "yearly" ? "text-primary" : "text-slate-500"}`}>
                  Yearly Billing
                </span>
                <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-0 font-bold text-xs">
                  Save {yearlyDiscountPct}%
                </Badge>
              </div>
            </div>

            {/* Plans Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" /> Available Plans
                </h3>
                {hasPaidPlanActive && (
                  <span className="text-xs text-orange-700 bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200 font-medium">
                    Active plans are highlighted below
                  </span>
                )}
              </div>

              {/* 1. TOP BANNER: Free Plan */}
              {(() => {
                const freePlan = plans.find(p => normalizePlanKey(p.name) === "free");
                if (!freePlan) return null;
                const active = isPlanActive(freePlan.name);
                const isSelected = finalSelectedPlanIds.has(freePlan.id);
                return (
                  <div
                    onClick={() => togglePlan(freePlan.id)}
                    className={`mb-6 rounded-2xl border p-5 sm:p-6 transition-all duration-200 cursor-pointer shadow-xs relative ${
                      active
                        ? "border-orange-500 bg-orange-50/20 ring-1 ring-orange-500/30"
                        : isSelected
                        ? "border-[#e77817] ring-2 ring-[#e77817]/20 shadow-md bg-white"
                        : "border-orange-200/90 hover:border-orange-300 bg-white"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      {/* Left: Icon & Description */}
                      <div className="flex items-start gap-4 lg:w-[34%]">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-[#e77817] flex items-center justify-center text-white shrink-0 shadow-md shadow-orange-500/25">
                          <Gift className="w-7 h-7" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Free Plan</h3>
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                              Free for 6 Months
                            </span>
                            {active ? (
                              <span className="text-xs font-bold text-[#e77817] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                                {hasPaidPlanActive ? "Active Base Plan" : "Current Plan"}
                              </span>
                            ) : isSelected ? (
                              <span className="text-xs font-bold text-[#e77817] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">Selected</span>
                            ) : null}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-snug">
                            Basic invoicing & business features — 100% Free for 6 Months
                          </p>
                        </div>
                      </div>

                      {/* Middle: 2 Columns of Features */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 lg:border-l lg:border-slate-200 lg:pl-8 text-xs sm:text-[13px] flex-1">
                        <div className="flex items-center gap-2.5 text-slate-700 font-medium">
                          <div className="w-4 h-4 rounded-full bg-[#28166f] text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span>100 Invoices Free</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-slate-700 font-medium">
                          <div className="w-4 h-4 rounded-full bg-[#28166f] text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span>Festive Posts</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-slate-700 font-medium">
                          <div className="w-4 h-4 rounded-full bg-[#28166f] text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span>3 Employee Attendance</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-slate-700 font-medium">
                          <div className="w-4 h-4 rounded-full bg-[#28166f] text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span>Up to 50 Leads</span>
                        </div>
                      </div>

                      {/* Right: Checkbox */}
                      <div className="flex items-center justify-end lg:border-l lg:border-slate-200 lg:pl-8">
                        <div className={`h-6 w-6 rounded border flex items-center justify-center transition-colors ${
                          active || isSelected ? "bg-[#e77817] border-[#e77817] text-white" : "border-slate-300 bg-white"
                        }`}>
                          {(active || isSelected) && <Check className="h-4 w-4 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 2. MIDDLE 6 CARDS (3x2 GRID) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {/* Card 1: Business Accounting */}
                {(() => {
                  const plan = plans.find(p => normalizePlanKey(p.name) === "accounting");
                  if (!plan) return null;
                  const active = isPlanActive(plan.name);
                  const isIncludedInSuiteActive = isSuiteActive && plan.name !== "suite" && plan.name !== "free";
                  const isIncludedInNewlySelectedSuite = hasNewlySelectedSuite && plan.name !== "suite" && plan.name !== "free";
                  const isSelected = isIncludedInNewlySelectedSuite || finalSelectedPlanIds.has(plan.id);
                  const isYearly = billingCycle === "yearly";

                  return (
                    <div
                      key={plan.id}
                      onClick={() => !isIncludedInNewlySelectedSuite && togglePlan(plan.id)}
                      className={`rounded-2xl border bg-white p-6 shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between relative ${
                        active
                          ? "border-orange-500 bg-orange-50/20 ring-1 ring-orange-500/30"
                          : isIncludedInNewlySelectedSuite
                          ? "opacity-80 border-primary/50 bg-primary/5 cursor-default"
                          : isSelected
                          ? "border-[#e77817] ring-2 ring-[#e77817]/20 shadow-md"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div>
                        {/* Header Badges */}
                        {isIncludedInSuiteActive ? (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-max max-w-[92%]">
                            <Badge className="bg-[#e77817] text-white hover:bg-[#ff8a24] border-0 text-xs font-semibold px-2.5 py-0.5 shadow-sm flex items-center gap-1">
                              <Check className="h-3 w-3" /> Active (Included in Suite)
                            </Badge>
                          </div>
                        ) : active ? (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-max max-w-[92%]">
                            <Badge className="bg-[#e77817] text-white hover:bg-[#ff8a24] border-0 text-xs font-semibold px-2.5 py-0.5 shadow-sm flex items-center gap-1">
                              <Check className="h-3 w-3" /> Active Subscription
                            </Badge>
                          </div>
                        ) : isIncludedInNewlySelectedSuite ? (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-max max-w-[92%]">
                            <Badge className="bg-primary text-primary-foreground border-0 text-xs truncate">
                              Included in Business Suite
                            </Badge>
                          </div>
                        ) : null}

                        {/* Top-left Checkbox */}
                        <div className="flex items-start justify-between mb-4 mt-1">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            active || isSelected ? "bg-[#e77817] border-[#e77817] text-white" : "border-slate-300 bg-white"
                          }`}>
                            {(active || isSelected) && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>

                        {/* Header */}
                        <div className="flex items-start gap-3.5 mb-5">
                          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-[#28166f] shadow-2xs">
                            <Calculator className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-slate-900 leading-snug">Business Accounting</h4>
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                              Full billing, sales, purchases & inventory management
                            </p>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="mb-5">
                          {active ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-2xl font-black text-slate-900">₹{isYearly ? 499 : 599}</span>
                              <span className="text-xs text-slate-500 font-medium">Active for Business</span>
                            </div>
                          ) : isIncludedInNewlySelectedSuite ? (
                            <span className="text-xl font-bold text-orange-600">Included in Suite</span>
                          ) : (
                            <>
                              <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black text-slate-900">{isYearly ? "₹499" : "₹599"}</span>
                                <span className="text-xs text-slate-500 font-semibold">/month</span>
                              </div>
                              {isYearly ? (
                                <div className="mt-1 flex flex-col gap-1">
                                  <span className="text-xs font-semibold text-slate-500">
                                    Billed annually at ₹5,999/year upfront
                                  </span>
                                  <span className="inline-block w-fit text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                                    Save 17% (Pay upfront)
                                  </span>
                                </div>
                              ) : (
                                <div className="mt-1.5 inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                                  Save 17% yearly
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Features */}
                        <div className="space-y-2.5 mb-6 text-xs sm:text-[13px] text-slate-600 font-medium">
                          <div className="flex items-center gap-2.5 font-semibold text-[#28166f]">
                            <Check className="w-4 h-4 text-[#e77817] shrink-0 stroke-[2.5]" />
                            <span>Everything in Free Plan</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                            <span>Unlimited Invoices</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                            <span>Unlimited Quotation & POS</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                            <span>Inventory Management</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                            <span>500 WhatsApp messages</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                            <span>GST Ready Output</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-slate-700 font-semibold pt-1">
                            <Users className="w-4 h-4 text-[#e77817] shrink-0" />
                            <span>Platform access up to 3 employees</span>
                          </div>

                          {/* Additional Platform Access Counter */}
                          <div className="flex items-center justify-between w-full bg-orange-50/50 p-2 rounded-lg border border-orange-100/50 mt-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5">
                              <Users className="w-4 h-4 text-[#e77817] shrink-0" />
                              <span className="text-slate-700 font-semibold text-xs">+ Additional Platform Access (₹99/mo)</span>
                            </div>
                            <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 shadow-xs">
                              <button type="button" onClick={(e) => { e.stopPropagation(); setExtraPlatformEmployeesToAdd(Math.max(0, extraPlatformEmployeesToAdd - 1)); }} className="text-slate-400 hover:text-slate-700"><Minus className="w-3.5 h-3.5" /></button>
                              <span className="font-bold text-xs w-4 text-center text-slate-800">{extraPlatformEmployeesToAdd}</span>
                              <button type="button" onClick={(e) => { e.stopPropagation(); setExtraPlatformEmployeesToAdd(extraPlatformEmployeesToAdd + 1); }} className="text-slate-400 hover:text-slate-700"><Plus className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Card 2: Business HR */}
                {(() => {
                  const plan = plans.find(p => normalizePlanKey(p.name) === "hr");
                  if (!plan) return null;
                  const active = isPlanActive(plan.name);
                  const isIncludedInSuiteActive = isSuiteActive && plan.name !== "suite" && plan.name !== "free";
                  const isIncludedInNewlySelectedSuite = hasNewlySelectedSuite && plan.name !== "suite" && plan.name !== "free";
                  const isSelected = isIncludedInNewlySelectedSuite || finalSelectedPlanIds.has(plan.id);
                  const isYearly = billingCycle === "yearly";

                  return (
                    <div
                      key={plan.id}
                      onClick={() => !isIncludedInNewlySelectedSuite && togglePlan(plan.id)}
                      className={`rounded-2xl border bg-white p-6 shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between relative ${
                        active
                          ? "border-orange-500 bg-orange-50/20 ring-1 ring-orange-500/30"
                          : isIncludedInNewlySelectedSuite
                          ? "opacity-80 border-primary/50 bg-primary/5 cursor-default"
                          : isSelected
                          ? "border-[#e77817] ring-2 ring-[#e77817]/20 shadow-md"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div>
                        {/* Header Badges */}
                        {isIncludedInSuiteActive ? (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-max max-w-[92%]">
                            <Badge className="bg-[#e77817] text-white hover:bg-[#ff8a24] border-0 text-xs font-semibold px-2.5 py-0.5 shadow-sm flex items-center gap-1">
                              <Check className="h-3 w-3" /> Active (Included in Suite)
                            </Badge>
                          </div>
                        ) : active ? (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-max max-w-[92%]">
                            <Badge className="bg-[#e77817] text-white hover:bg-[#ff8a24] border-0 text-xs font-semibold px-2.5 py-0.5 shadow-sm flex items-center gap-1">
                              <Check className="h-3 w-3" /> Active Subscription
                            </Badge>
                          </div>
                        ) : isIncludedInNewlySelectedSuite ? (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-max max-w-[92%]">
                            <Badge className="bg-primary text-primary-foreground border-0 text-xs truncate">
                              Included in Business Suite
                            </Badge>
                          </div>
                        ) : null}

                        {/* Top-left Checkbox */}
                        <div className="flex items-start justify-between mb-4 mt-1">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            active || isSelected ? "bg-[#e77817] border-[#e77817] text-white" : "border-slate-300 bg-white"
                          }`}>
                            {(active || isSelected) && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>

                        {/* Header */}
                        <div className="flex items-start gap-3.5 mb-5">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-[#e77817] shadow-2xs">
                            <Users className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-slate-900 leading-snug">Business HR</h4>
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                              Complete HR solution — attendance, payroll, leaves & shifts
                            </p>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="mb-5">
                          {active ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-2xl font-black text-slate-900">₹{isYearly ? 499 : 599}</span>
                              <span className="text-xs text-slate-500 font-medium">{activeEmployeeLimit || 5} Employees Active</span>
                            </div>
                          ) : isIncludedInNewlySelectedSuite ? (
                            <span className="text-xl font-bold text-orange-600">Included in Suite</span>
                          ) : (
                            <>
                              <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black text-slate-900">{isYearly ? "₹499" : "₹599"}</span>
                                <span className="text-xs text-slate-500 font-semibold">/month</span>
                              </div>
                              {isYearly ? (
                                <div className="mt-1 flex flex-col gap-1">
                                  <span className="text-xs font-semibold text-slate-500">
                                    Billed annually at ₹5,999/year upfront
                                  </span>
                                  <span className="inline-block w-fit text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                                    Save 17% (Pay upfront)
                                  </span>
                                </div>
                              ) : (
                                <div className="mt-1.5 inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                                  Save 17% yearly
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Features */}
                        <div className="space-y-2.5 mb-6 text-xs sm:text-[13px] text-slate-600 font-medium">
                          <div className="flex items-center gap-2.5 font-semibold text-[#28166f]">
                            <Check className="w-4 h-4 text-[#e77817] shrink-0 stroke-[2.5]" />
                            <span>Everything in Free Plan</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                            <span>25 Employee Attendance</span>
                          </div>

                          {/* Extra Employee Counter Box */}
                          <div className="w-full bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/70 mt-1" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span className="text-slate-800 font-bold text-xs">+ Extra Employee (₹29/mo)</span>
                              </div>
                              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 shadow-xs">
                                <button type="button" onClick={(e) => { e.stopPropagation(); setExtraEmployeesToAdd(Math.max(0, extraEmployeesToAdd - 1)); }} className="text-slate-400 hover:text-slate-700"><Minus className="w-3.5 h-3.5" /></button>
                                <span className="font-bold text-xs w-5 text-center text-slate-800">+{extraEmployeesToAdd}</span>
                                <button type="button" onClick={(e) => { e.stopPropagation(); setExtraEmployeesToAdd(extraEmployeesToAdd + 1); }} className="text-slate-400 hover:text-slate-700"><Plus className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 justify-center mt-1">
                              {[5, 10, 20, 50].map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => setExtraEmployeesToAdd(num)}
                                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                                    extraEmployeesToAdd === num
                                      ? "bg-[#e77817] text-white border-[#e77817] font-bold"
                                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                                  }`}
                                >
                                  +{num}
                                </button>
                              ))}
                              {extraEmployeesToAdd > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setExtraEmployeesToAdd(0)}
                                  className="text-[10px] px-1.5 py-0.5 text-slate-500 hover:text-slate-800 underline"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                            {extraEmployeesToAdd > 0 && (
                              <div className="mt-1.5 pt-1.5 border-t border-emerald-200/50 flex items-center justify-between text-[11px] font-semibold text-emerald-900">
                                <span>Addon Cost:</span>
                                <span className="font-bold text-orange-700">
                                  ₹{getExtraEmployeeCost(extraEmployeesToAdd).toLocaleString('en-IN')} / {isYearly ? "yr" : "mo"}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2.5">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                            <span>Attendance & Payroll</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                            <span>Shifts & Leaves</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                            <span>500 WhatsApp messages</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-slate-700 font-semibold pt-1">
                            <Users className="w-4 h-4 text-[#e77817] shrink-0" />
                            <span>Platform access up to 3 employees</span>
                          </div>

                          {/* Additional Platform Access Counter */}
                          <div className="flex items-center justify-between w-full bg-orange-50/50 p-2 rounded-lg border border-orange-100/50 mt-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5">
                              <Users className="w-4 h-4 text-[#e77817] shrink-0" />
                              <span className="text-slate-700 font-semibold text-xs">+ Additional Platform Access (₹99/mo)</span>
                            </div>
                            <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 shadow-xs">
                              <button type="button" onClick={(e) => { e.stopPropagation(); setExtraPlatformEmployeesToAdd(Math.max(0, extraPlatformEmployeesToAdd - 1)); }} className="text-slate-400 hover:text-slate-700"><Minus className="w-3.5 h-3.5" /></button>
                              <span className="font-bold text-xs w-4 text-center text-slate-800">{extraPlatformEmployeesToAdd}</span>
                              <button type="button" onClick={(e) => { e.stopPropagation(); setExtraPlatformEmployeesToAdd(extraPlatformEmployeesToAdd + 1); }} className="text-slate-400 hover:text-slate-700"><Plus className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Card 3: Business CRM */}
                {(() => {
                  const plan = plans.find(p => normalizePlanKey(p.name) === "crm");
                  if (!plan) return null;
                  const active = isPlanActive(plan.name);
                  const isIncludedInSuiteActive = isSuiteActive && plan.name !== "suite" && plan.name !== "free";
                  const isIncludedInNewlySelectedSuite = hasNewlySelectedSuite && plan.name !== "suite" && plan.name !== "free";
                  const isSelected = isIncludedInNewlySelectedSuite || finalSelectedPlanIds.has(plan.id);
                  const isYearly = billingCycle === "yearly";

                  return (
                    <div
                      key={plan.id}
                      onClick={() => !isIncludedInNewlySelectedSuite && togglePlan(plan.id)}
                      className={`rounded-2xl border bg-white p-6 shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between relative ${
                        active
                          ? "border-orange-500 bg-orange-50/20 ring-1 ring-orange-500/30"
                          : isIncludedInNewlySelectedSuite
                          ? "opacity-80 border-primary/50 bg-primary/5 cursor-default"
                          : isSelected
                          ? "border-[#e77817] ring-2 ring-[#e77817]/20 shadow-md"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div>
                        {/* Header Badges */}
                        {isIncludedInSuiteActive ? (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-max max-w-[92%]">
                            <Badge className="bg-[#e77817] text-white hover:bg-[#ff8a24] border-0 text-xs font-semibold px-2.5 py-0.5 shadow-sm flex items-center gap-1">
                              <Check className="h-3 w-3" /> Active (Included in Suite)
                            </Badge>
                          </div>
                        ) : active ? (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-max max-w-[92%]">
                            <Badge className="bg-[#e77817] text-white hover:bg-[#ff8a24] border-0 text-xs font-semibold px-2.5 py-0.5 shadow-sm flex items-center gap-1">
                              <Check className="h-3 w-3" /> Active Subscription
                            </Badge>
                          </div>
                        ) : isIncludedInNewlySelectedSuite ? (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-max max-w-[92%]">
                            <Badge className="bg-primary text-primary-foreground border-0 text-xs truncate">
                              Included in Business Suite
                            </Badge>
                          </div>
                        ) : null}

                        {/* Top-left Checkbox */}
                        <div className="flex items-start justify-between mb-4 mt-1">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            active || isSelected ? "bg-[#e77817] border-[#e77817] text-white" : "border-slate-300 bg-white"
                          }`}>
                            {(active || isSelected) && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>

                        {/* Header */}
                        <div className="flex items-start gap-3.5 mb-5">
                          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 text-rose-500 shadow-2xs">
                            <Target className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-slate-900 leading-snug">Business CRM</h4>
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                              Manage leads, deals, sales pipeline and customer relationships
                            </p>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="mb-5">
                          {active ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-2xl font-black text-slate-900">₹{isYearly ? 499 : 599}</span>
                              <span className="text-xs text-slate-500 font-medium">Active for Business</span>
                            </div>
                          ) : isIncludedInNewlySelectedSuite ? (
                            <span className="text-xl font-bold text-orange-600">Included in Suite</span>
                          ) : (
                            <>
                              <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black text-slate-900">{isYearly ? "₹499" : "₹599"}</span>
                                <span className="text-xs text-slate-500 font-semibold">/month</span>
                              </div>
                              {isYearly ? (
                                <div className="mt-1 flex flex-col gap-1">
                                  <span className="text-xs font-semibold text-slate-500">
                                    Billed annually at ₹5,988/year upfront
                                  </span>
                                  <span className="inline-block w-fit text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                                    Save 17% (Pay upfront)
                                  </span>
                                </div>
                              ) : (
                                <div className="mt-1.5 inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                                  Save 17% yearly
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Features */}
                        <div className="space-y-2.5 mb-6 text-xs sm:text-[13px] text-slate-600 font-medium">
                          <div className="flex items-center gap-2.5 font-semibold text-[#28166f]">
                            <Check className="w-4 h-4 text-[#e77817] shrink-0 stroke-[2.5]" />
                            <span>Everything in Free Plan</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                            <span>Unlimited Leads</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                            <span>API Integrations</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                            <span>Sales Pipeline</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                            <span>500 WhatsApp messages</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-blue-700 font-semibold pt-0.5">
                            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 stroke-[2.5]" />
                            <span>CRM Portal: 2 Sales Team Logins</span>
                          </div>

                          {/* Additional CRM Member Counter */}
                          <div className="flex items-center justify-between w-full bg-blue-50/70 p-2 rounded-lg border border-blue-200/80 mt-1" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5">
                              <Users className="w-4 h-4 text-blue-600 shrink-0" />
                              <span className="text-slate-800 font-semibold text-xs">+ Extra CRM Member (₹999/mo)</span>
                            </div>
                            <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 shadow-xs">
                              <button type="button" onClick={(e) => { e.stopPropagation(); setExtraCrmMembersToAdd(Math.max(0, extraCrmMembersToAdd - 1)); }} className="text-slate-400 hover:text-slate-700"><Minus className="w-3.5 h-3.5" /></button>
                              <span className="font-bold text-xs w-4 text-center text-slate-800">{extraCrmMembersToAdd}</span>
                              <button type="button" onClick={(e) => { e.stopPropagation(); setExtraCrmMembersToAdd(extraCrmMembersToAdd + 1); }} className="text-slate-400 hover:text-slate-700"><Plus className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 text-slate-700 font-semibold pt-1">
                            <Users className="w-4 h-4 text-[#e77817] shrink-0" />
                            <span>Platform access up to 3 employees</span>
                          </div>

                          {/* Additional Platform Access Counter */}
                          <div className="flex items-center justify-between w-full bg-orange-50/50 p-2 rounded-lg border border-orange-100/50 mt-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5">
                              <Users className="w-4 h-4 text-[#e77817] shrink-0" />
                              <span className="text-slate-700 font-semibold text-xs">+ Additional Platform Access (₹99/mo)</span>
                            </div>
                            <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 shadow-xs">
                              <button type="button" onClick={(e) => { e.stopPropagation(); setExtraPlatformEmployeesToAdd(Math.max(0, extraPlatformEmployeesToAdd - 1)); }} className="text-slate-400 hover:text-slate-700"><Minus className="w-3.5 h-3.5" /></button>
                              <span className="font-bold text-xs w-4 text-center text-slate-800">{extraPlatformEmployeesToAdd}</span>
                              <button type="button" onClick={(e) => { e.stopPropagation(); setExtraPlatformEmployeesToAdd(extraPlatformEmployeesToAdd + 1); }} className="text-slate-400 hover:text-slate-700"><Plus className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Card 4: Business Promotion */}
                {(() => {
                  const plan = plans.find(p => normalizePlanKey(p.name) === "promotion");
                  if (!plan) return null;
                  const active = isPlanActive(plan.name);
                  const isIncludedInSuiteActive = isSuiteActive && plan.name !== "suite" && plan.name !== "free";
                  const isIncludedInNewlySelectedSuite = hasNewlySelectedSuite && plan.name !== "suite" && plan.name !== "free";
                  const isSelected = isIncludedInNewlySelectedSuite || finalSelectedPlanIds.has(plan.id);
                  const isYearly = billingCycle === "yearly";

                  return (
                    <div
                      key={plan.id}
                      onClick={() => !isIncludedInNewlySelectedSuite && togglePlan(plan.id)}
                      className={`rounded-2xl border bg-white p-6 shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between relative ${
                        active
                          ? "border-orange-500 bg-orange-50/20 ring-1 ring-orange-500/30"
                          : isIncludedInNewlySelectedSuite
                          ? "opacity-80 border-primary/50 bg-primary/5 cursor-default"
                          : isSelected
                          ? "border-[#e77817] ring-2 ring-[#e77817]/20 shadow-md"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div>
                        {/* Header Badges */}
                        {isIncludedInSuiteActive ? (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-max max-w-[92%]">
                            <Badge className="bg-[#e77817] text-white hover:bg-[#ff8a24] border-0 text-xs font-semibold px-2.5 py-0.5 shadow-sm flex items-center gap-1">
                              <Check className="h-3 w-3" /> Active (Included in Suite)
                            </Badge>
                          </div>
                        ) : active ? (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-max max-w-[92%]">
                            <Badge className="bg-[#e77817] text-white hover:bg-[#ff8a24] border-0 text-xs font-semibold px-2.5 py-0.5 shadow-sm flex items-center gap-1">
                              <Check className="h-3 w-3" /> Active Subscription
                            </Badge>
                          </div>
                        ) : isIncludedInNewlySelectedSuite ? (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-max max-w-[92%]">
                            <Badge className="bg-primary text-primary-foreground border-0 text-xs truncate">
                              Included in Business Suite
                            </Badge>
                          </div>
                        ) : null}

                        {/* Top-left Checkbox */}
                        <div className="flex items-start justify-between mb-4 mt-1">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            active || isSelected ? "bg-[#e77817] border-[#e77817] text-white" : "border-slate-300 bg-white"
                          }`}>
                            {(active || isSelected) && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>

                        {/* Header */}
                        <div className="flex items-start gap-3.5 mb-5">
                          <div className="w-12 h-12 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center shrink-0 text-pink-500 shadow-2xs">
                            <Megaphone className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-slate-900 leading-snug">Business Promotion</h4>
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                              Festival posters, WhatsApp & broadcast marketing campaigns
                            </p>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="mb-5">
                          {active ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-2xl font-black text-slate-900">₹{isYearly ? 499 : 599}</span>
                              <span className="text-xs text-slate-500 font-medium">Active for Business</span>
                            </div>
                          ) : isIncludedInNewlySelectedSuite ? (
                            <span className="text-xl font-bold text-orange-600">Included in Suite</span>
                          ) : (
                            <>
                              <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black text-slate-900">{isYearly ? "₹499" : "₹599"}</span>
                                <span className="text-xs text-slate-500 font-semibold">/month</span>
                              </div>
                              {isYearly ? (
                                <div className="mt-1 flex flex-col gap-1">
                                  <span className="text-xs font-semibold text-slate-500">
                                    Billed annually at ₹5,988/year upfront
                                  </span>
                                  <span className="inline-block w-fit text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                                    Save 17% (Pay upfront)
                                  </span>
                                </div>
                              ) : (
                                <div className="mt-1.5 inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                                  Save 17% yearly
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Features */}
                        <div className="space-y-2.5 mb-6 text-xs sm:text-[13px] text-slate-600 font-medium">
                          <div className="flex items-center gap-2.5 font-semibold text-[#28166f]">
                            <Check className="w-4 h-4 text-[#e77817] shrink-0 stroke-[2.5]" />
                            <span>Everything in Free Plan</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                            <span>All Poster Categories</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                            <span>Email & WhatsApp Campaign</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                            <span>500 WhatsApp messages</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-slate-700 font-semibold pt-1">
                            <Users className="w-4 h-4 text-[#e77817] shrink-0" />
                            <span>Platform access up to 3 employees</span>
                          </div>

                          {/* Additional Platform Access Counter */}
                          <div className="flex items-center justify-between w-full bg-orange-50/50 p-2 rounded-lg border border-orange-100/50 mt-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5">
                              <Users className="w-4 h-4 text-[#e77817] shrink-0" />
                              <span className="text-slate-700 font-semibold text-xs">+ Additional Platform Access (₹99/mo)</span>
                            </div>
                            <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 shadow-xs">
                              <button type="button" onClick={(e) => { e.stopPropagation(); setExtraPlatformEmployeesToAdd(Math.max(0, extraPlatformEmployeesToAdd - 1)); }} className="text-slate-400 hover:text-slate-700"><Minus className="w-3.5 h-3.5" /></button>
                              <span className="font-bold text-xs w-4 text-center text-slate-800">{extraPlatformEmployeesToAdd}</span>
                              <button type="button" onClick={(e) => { e.stopPropagation(); setExtraPlatformEmployeesToAdd(extraPlatformEmployeesToAdd + 1); }} className="text-slate-400 hover:text-slate-700"><Plus className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Card 5: Feedback Management (Coming Soon) */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between relative opacity-85">
                  <div>
                    <div className="flex items-start justify-between mb-4 mt-1">
                      <div className="w-5 h-5 rounded border border-slate-200 bg-slate-50" />
                    </div>
                    <div className="flex items-start gap-3.5 mb-5">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-[#28166f] shadow-2xs">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-slate-900 leading-snug">Feedback Management</h4>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                          Collect, manage and analyze customer feedback easily
                        </p>
                      </div>
                    </div>
                    <div className="py-8 text-center flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                        <Clock className="w-6 h-6" />
                      </div>
                      <span className="font-black text-slate-900 text-base">Coming Soon</span>
                      <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                        Be the first to know when this feature is available!
                      </p>
                    </div>
                  </div>
                  <div className="mt-auto pt-2 flex justify-center">
                    <Button variant="outline" size="sm" disabled className="w-full text-xs text-slate-500">
                      <Bell className="w-3.5 h-3.5 mr-1.5" /> Notify Me
                    </Button>
                  </div>
                </div>

                {/* Card 6: Business Analysis (Coming Soon) */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between relative opacity-85">
                  <div>
                    <div className="flex items-start justify-between mb-4 mt-1">
                      <div className="w-5 h-5 rounded border border-slate-200 bg-slate-50" />
                    </div>
                    <div className="flex items-start gap-3.5 mb-5">
                      <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 text-purple-600 shadow-2xs">
                        <BarChart3 className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-slate-900 leading-snug">Business Analysis</h4>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                          Get actionable insights to grow your business
                        </p>
                      </div>
                    </div>
                    <div className="py-8 text-center flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                        <BarChart3 className="w-6 h-6" />
                      </div>
                      <span className="font-black text-slate-900 text-base">Coming Soon</span>
                      <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                        Be the first to know when this feature is available!
                      </p>
                    </div>
                  </div>
                  <div className="mt-auto pt-2 flex justify-center">
                    <Button variant="outline" size="sm" disabled className="w-full text-xs text-slate-500">
                      <Bell className="w-3.5 h-3.5 mr-1.5" /> Notify Me
                    </Button>
                  </div>
                </div>
              </div>

              {/* 3. BOTTOM BANNER: Business Suite */}
              {(() => {
                const plan = plans.find(p => normalizePlanKey(p.name) === "suite");
                if (!plan) return null;
                const active = isPlanActive(plan.name);
                const isSelected = finalSelectedPlanIds.has(plan.id);
                const isYearly = billingCycle === "yearly";

                return (
                  <div
                    onClick={() => togglePlan(plan.id)}
                    className={`rounded-2xl border bg-white p-5 sm:p-6 transition-all duration-200 cursor-pointer shadow-xs relative ${
                      active
                        ? "border-orange-500 bg-orange-50/20 ring-1 ring-orange-500/30"
                        : isSelected
                        ? "border-[#e77817] ring-2 ring-[#e77817]/20 shadow-md"
                        : "border-slate-200/90 hover:border-slate-300"
                    }`}
                  >
                    {active && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-max max-w-[92%]">
                        <Badge className="bg-[#e77817] text-white hover:bg-[#ff8a24] border-0 text-xs font-semibold px-2.5 py-0.5 shadow-sm flex items-center gap-1">
                          <Check className="h-3 w-3" /> Active Subscription
                        </Badge>
                      </div>
                    )}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      {/* Left: Checkbox + Icon + Details */}
                      <div className="flex items-start gap-4 lg:w-[36%]">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 mt-1 ${
                          active || isSelected ? "bg-[#e77817] border-[#e77817] text-white" : "border-slate-300 bg-white"
                        }`}>
                          {(active || isSelected) && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-[#e77817] flex items-center justify-center text-white shrink-0 shadow-md shadow-orange-500/25">
                          <Crown className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Business Suite</h3>
                            {active ? (
                              <span className="text-[10px] font-bold text-[#e77817] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">Active Plan</span>
                            ) : isSelected ? (
                              <span className="text-[10px] font-bold text-[#e77817] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">Selected</span>
                            ) : null}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                            Complete all-in-one business suite with full system access!
                          </p>
                          <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                            {active ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-2xl font-black text-[#e77817]">₹{isYearly ? "1,699" : "1,999"}/month</span>
                                <span className="text-xs text-slate-500 font-medium">Active for Business ({activeEmployeeLimit || 5} Employees Quota)</span>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-2xl font-black text-[#e77817]">{isYearly ? "₹1,699" : "₹1,999"}</span>
                                  <span className="text-xs text-slate-500 font-semibold">/month</span>
                                </div>
                                {isYearly ? (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-semibold text-slate-500">
                                      (Billed ₹20,388/year upfront)
                                    </span>
                                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                                      Save ₹3,600 (15% OFF)
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                                    Save 15% yearly
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Feature Points */}
                      <div className="flex flex-col justify-center gap-2.5 lg:border-l lg:border-slate-200 lg:pl-8 text-xs sm:text-[13px] flex-1">
                        <div className="flex items-center gap-2.5 font-semibold text-[#28166f]">
                          <div className="w-4 h-4 rounded-full bg-[#e77817] text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span>Everything in Free Plan + Business Accounting + Business HR + Business CRM + Business Promotion</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-blue-800 font-semibold">
                          <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span>CRM Portal: 2 Sales Team Logins (Extra @ ₹999/mo)</span>
                        </div>
                        <div className="flex items-center justify-between max-w-md bg-blue-50/50 p-2 rounded-lg border border-blue-100/50" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="text-slate-700 font-semibold text-xs">+ Additional CRM Sales Team (₹999/mo)</span>
                          </div>
                          <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 shadow-xs">
                            <button type="button" onClick={(e) => { e.stopPropagation(); setExtraCrmMembersToAdd(Math.max(0, extraCrmMembersToAdd - 1)); }} className="text-slate-400 hover:text-slate-700"><Minus className="w-3.5 h-3.5" /></button>
                            <span className="font-bold text-xs w-5 text-center text-slate-800">{extraCrmMembersToAdd}</span>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setExtraCrmMembersToAdd(extraCrmMembersToAdd + 1); }} className="text-slate-400 hover:text-slate-700"><Plus className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 text-slate-700 font-semibold">
                          <div className="w-4 h-4 rounded-full bg-[#28166f] text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span>Platform Access up to 5 employees</span>
                        </div>
                        <div className="flex items-center justify-between max-w-md bg-orange-50/50 p-2 rounded-lg border border-orange-100/50" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#e77817] shrink-0" />
                            <span className="text-slate-700 font-semibold text-xs">+ Additional Platform Access (₹99/mo)</span>
                          </div>
                          <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 shadow-xs">
                            <button type="button" onClick={(e) => { e.stopPropagation(); setExtraPlatformEmployeesToAdd(Math.max(0, extraPlatformEmployeesToAdd - 1)); }} className="text-slate-400 hover:text-slate-700"><Minus className="w-3.5 h-3.5" /></button>
                            <span className="font-bold text-xs w-5 text-center text-slate-800">{extraPlatformEmployeesToAdd}</span>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setExtraPlatformEmployeesToAdd(extraPlatformEmployeesToAdd + 1); }} className="text-slate-400 hover:text-slate-700"><Plus className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      </div>

                      {/* Right: Checkbox */}
                      <div className="flex items-center justify-end lg:border-l lg:border-slate-200 lg:pl-8">
                        <div className={`h-6 w-6 rounded border flex items-center justify-center transition-colors ${
                          active || isSelected ? "bg-[#e77817] border-[#e77817] text-white" : "border-slate-300 bg-white"
                        }`}>
                          {(active || isSelected) && <Check className="h-4 w-4 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            
            {/* Global Add-ons Section */}
            {(hasAnyActionToCheckout || plans.some(p => isPlanActive(p.name) && p.name !== 'free')) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6 mb-2">
                <div className="bg-indigo-50/50 rounded-xl border border-indigo-100 p-5">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                        <Users className="h-4 w-4 text-indigo-600" />
                        Extra Admin / Platform Users
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 max-w-md">
                        Your paid plan includes standard platform access. Need to invite more managers to the Admin Panel? Add them here for ₹99/user/month.
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-2 min-w-[140px]">
                      <div className="flex items-center justify-between bg-white p-1.5 rounded-lg border border-indigo-200 w-full shadow-sm">
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="h-8 w-8 rounded-md hover:bg-indigo-50 hover:text-indigo-700" 
                          disabled={extraPlatformEmployeesToAdd <= 0}
                          onClick={() => setExtraPlatformEmployeesToAdd(Math.max(0, extraPlatformEmployeesToAdd - 1))}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        
                        <div className="text-center px-2 flex-1">
                          <span className="text-sm font-bold text-slate-900">
                            +{extraPlatformEmployeesToAdd}
                          </span>
                        </div>
                        
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="h-8 w-8 rounded-md hover:bg-indigo-50 hover:text-indigo-700" 
                          onClick={() => setExtraPlatformEmployeesToAdd(extraPlatformEmployeesToAdd + 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {extraPlatformEmployeesToAdd > 0 && (
                        <span className="text-xs font-semibold text-indigo-700">
                          +₹{getExtraPlatformEmployeeCost(extraPlatformEmployeesToAdd).toLocaleString('en-IN')} / {billingCycle === 'yearly' ? 'yr' : 'mo'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-5">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        Extra CRM Sales Team Members
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 max-w-md">
                        CRM & Suite include 2 Sales Team logins. Need more executive accounts? Add extra CRM member access for ₹999/user/month.
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-2 min-w-[140px]">
                      <div className="flex items-center justify-between bg-white p-1.5 rounded-lg border border-blue-200 w-full shadow-sm">
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="h-8 w-8 rounded-md hover:bg-blue-50 hover:text-blue-700" 
                          disabled={extraCrmMembersToAdd <= 0}
                          onClick={() => setExtraCrmMembersToAdd(Math.max(0, extraCrmMembersToAdd - 1))}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        
                        <div className="text-center px-2 flex-1">
                          <span className="text-sm font-bold text-slate-900">
                            +{extraCrmMembersToAdd}
                          </span>
                        </div>
                        
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="h-8 w-8 rounded-md hover:bg-blue-50 hover:text-blue-700" 
                          onClick={() => setExtraCrmMembersToAdd(extraCrmMembersToAdd + 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {extraCrmMembersToAdd > 0 && (
                        <span className="text-xs font-semibold text-blue-700">
                          +₹{getExtraCrmMemberCost(extraCrmMembersToAdd).toLocaleString('en-IN')} / {billingCycle === 'yearly' ? 'yr' : 'mo'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}


            {/* Promo Code & Checkout Footer */}
            <div className="border-t border-slate-200 pt-6 mt-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Coupon input */}
                <div className="flex flex-col w-full max-w-sm">
                  <div className="flex w-full gap-2">
                    <Input 
                      placeholder="Enter Promo Code" 
                      value={promoCode} 
                      onChange={(e) => {
                        setPromoCode(e.target.value.toUpperCase());
                        if (promoError) setPromoError(null);
                        if (promoSuccess) setPromoSuccess(null);
                      }}
                      disabled={!!validCoupon}
                      className={`bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 ${
                        promoError ? "border-red-500 focus-visible:ring-red-500" : ""
                      }`}
                    />
                    {validCoupon ? (
                      <Button 
                        variant="outline" 
                        className="border-slate-300 hover:bg-slate-100" 
                        onClick={() => { 
                          setValidCoupon(null); 
                          setPromoCode(""); 
                          setPromoError(null); 
                          setPromoSuccess(null); 
                        }}
                      >
                        Remove
                      </Button>
                    ) : (
                      <Button onClick={handleApplyPromo} disabled={!promoCode || couponLoading}>
                        {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                      </Button>
                    )}
                  </div>

                  {/* Error message right below promo code input */}
                  {promoError && (
                    <p className="text-xs font-semibold text-red-500 mt-1.5 flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{promoError}</span>
                    </p>
                  )}

                  {/* Success message right below promo code input */}
                  {validCoupon && promoSuccess && (
                    <p className="text-xs font-semibold text-emerald-600 mt-1.5 flex items-center gap-1 animate-in fade-in">
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{promoSuccess}</span>
                    </p>
                  )}
                </div>

                {/* Total & Checkout button */}
                <div className="flex items-center gap-6 w-full md:w-auto justify-end">
                  <div className="text-right">
                    <div className="text-xs text-slate-500 font-medium">
                      {isOnlyAddingExtraEmployees ? "Addon Subtotal" : "Subtotal"}
                    </div>
                    <div className="text-sm font-semibold text-slate-900 mb-1">
                      ₹{totalAmountRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {totalAmountRupees > 0 && (
                      <>
                        <div className="text-[10px] text-slate-500 font-medium mt-1">+ GST (18%)</div>
                        <div className="text-xs font-semibold text-slate-700">
                          ₹{gstAmountRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-1.5 pt-1.5 border-t">Total Payable</div>
                        <div className="text-2xl font-bold text-slate-900">
                          ₹{finalAmountRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </>
                    )}
                  </div>
                  
                  <Button 
                    size="lg" 
                    className="w-full md:w-auto min-w-[220px] font-bold"
                    onClick={handleCheckout}
                    disabled={processingPlan || !hasAnyActionToCheckout}
                  >
                    {processingPlan ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
                    ) : !hasAnyActionToCheckout ? (
                      "Select a plan or add employees"
                    ) : isOnlyAddingExtraEmployees ? (
                      `Pay ₹${finalAmountRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} & Add ${extraEmployeesToAdd} Slot${extraEmployeesToAdd > 1 ? 's' : ''}`
                    ) : finalAmountRupees > 0 ? (
                      `Pay ₹${finalAmountRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} & Activate`
                    ) : (
                      "Continue with Free Plan (₹0)"
                    )}
                  </Button>
                </div>
              </div>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
