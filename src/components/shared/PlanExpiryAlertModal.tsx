import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, RefreshCw, Sparkles, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { useFeatureStore } from "@/store/feature-store";
import { supabase } from "@/integrations/supabase/client";
import { normalizePlanKey, getPlanDisplayName } from "@/lib/subscription";
import { format } from "date-fns";

interface PlanExpiryAlertModalProps {
  onRenew?: () => void;
}

export function PlanExpiryAlertModal({ onRenew }: PlanExpiryAlertModalProps) {
  const { organization } = useAppStore();
  const { currentPeriodEnd } = useFeatureStore();
  const [isOpen, setIsOpen] = useState(false);
  const [diffDays, setDiffDays] = useState<number | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [planDisplayName, setPlanDisplayName] = useState<string>("Business Plan");
  const [billingCycle, setBillingCycle] = useState<string>("monthly");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!organization?.id) return;

    let isMounted = true;

    const checkPlanExpiry = async () => {
      try {
        // 1. Fetch organization subscription details
        const { data: orgData } = await supabase
          .from("organizations")
          .select("name, subscription_plan, subscription_interval, subscription_end_date")
          .eq("id", organization.id)
          .maybeSingle();

        // 2. Fetch latest subscription record (including expired/active)
        const { data: latestSub } = await supabase
          .from("subscriptions")
          .select("current_period_end, billing_cycle, status, plans(name)")
          .eq("org_id", organization.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const rawPlan = (latestSub as any)?.plans?.name || orgData?.subscription_plan || organization.subscription_plan || "free";
        const normalizedPlan = normalizePlanKey(rawPlan);

        // Resolve expiration timestamp
        const expiryDateStr =
          orgData?.subscription_end_date ||
          latestSub?.current_period_end ||
          organization.subscription_end_date ||
          currentPeriodEnd;

        // If it's a completely free plan with no previous expiry date, don't show popup
        if (normalizedPlan === "free" && !expiryDateStr) {
          if (isMounted) setIsOpen(false);
          return;
        }

        if (!expiryDateStr) {
          if (isMounted) setIsOpen(false);
          return;
        }

        const expDate = new Date(expiryDateStr);
        if (isNaN(expDate.getTime())) return;

        const now = Date.now();
        const diffMs = expDate.getTime() - now;
        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        const cycle = latestSub?.billing_cycle || orgData?.subscription_interval || organization.subscription_interval || "monthly";
        const dName = getPlanDisplayName(normalizedPlan);

        if (!isMounted) return;

        setExpiryDate(expDate);
        setDiffDays(daysLeft);
        setPlanDisplayName(dName);
        setBillingCycle(cycle);
        setIsExpired(daysLeft <= 0);

        // RULE:
        // 1. diffDays > 7: Plan is active (>7 days left) -> DO NOT SHOW
        // 2. 1 < diffDays <= 7: Show ONLY ONCE per session on dashboard refresh
        // 3. diffDays <= 1 (including <= 0 for expired): Show on EVERY refresh
        if (daysLeft > 7) {
          setIsOpen(false);
          return;
        }

        if (daysLeft > 1 && daysLeft <= 7) {
          const sessionKey = `plan_exp_notif_seen_${organization.id}_${expDate.toISOString().slice(0, 10)}`;
          if (sessionStorage.getItem(sessionKey)) {
            // Already seen once this session
            setIsOpen(false);
            return;
          }
          // Mark seen for this session
          sessionStorage.setItem(sessionKey, "true");
          setIsOpen(true);
        } else if (daysLeft <= 1) {
          // <= 1 day or expired -> ALWAYS show on refresh
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Error evaluating plan expiry alert:", err);
      }
    };

    checkPlanExpiry();

    return () => {
      isMounted = false;
    };
  }, [organization?.id, organization?.subscription_end_date, organization?.subscription_plan, currentPeriodEnd]);

  const handleRenewClick = () => {
    setIsOpen(false);
    if (onRenew) {
      onRenew();
    } else {
      window.dispatchEvent(new CustomEvent("open-plan-modal"));
    }
  };

  if (!isOpen || !expiryDate || diffDays === null) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md w-[94vw] sm:w-full p-0 overflow-hidden border-2 border-border shadow-2xl rounded-2xl">
        {/* Top Header Banner */}
        <div className={`p-6 text-white ${isExpired ? "bg-gradient-to-br from-rose-600 to-red-800" : "bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700"}`}>
          <div className="flex items-center justify-between mb-3">
            <Badge variant="outline" className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs px-2.5 py-0.5 font-semibold backdrop-blur-sm">
              {isExpired ? "⚠️ Subscription Expired" : `⏳ Expiring in ${diffDays} day${diffDays === 1 ? "" : "s"}`}
            </Badge>
            <span className="text-xs uppercase tracking-wider text-white/80 font-bold">
              {billingCycle} Plan
            </span>
          </div>

          <div className="flex items-start gap-3">
            <div className={`p-3 rounded-xl bg-white/15 backdrop-blur-md shrink-0 ${isExpired ? "ring-2 ring-red-300/40" : "ring-2 ring-amber-300/40"}`}>
              {isExpired ? <ShieldAlert className="h-7 w-7 text-white animate-pulse" /> : <Clock className="h-7 w-7 text-white" />}
            </div>
            <div>
              <DialogTitle className="text-xl font-extrabold text-white leading-tight">
                {isExpired ? "Your Plan Has Expired" : "Renew Your Subscription"}
              </DialogTitle>
              <DialogDescription className="text-white/90 text-sm mt-1 leading-snug">
                {isExpired
                  ? `Your ${planDisplayName} subscription expired on ${format(expiryDate, "dd MMM yyyy")}.`
                  : `Your ${planDisplayName} subscription is due for renewal on ${format(expiryDate, "dd MMM yyyy")}.`}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 bg-background">
          <div className="rounded-xl border border-border bg-muted/40 p-3.5 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground font-medium">Business / Org:</span>
              <span className="font-bold text-foreground truncate max-w-[200px]">{organization?.name || "Your Business"}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground font-medium">Current Plan:</span>
              <span className="font-semibold text-primary">{planDisplayName}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground font-medium">{isExpired ? "Expired On:" : "Expires On:"}</span>
              <span className={`font-bold ${isExpired ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"}`}>
                {format(expiryDate, "dd MMMM yyyy")} {isExpired && `(${Math.abs(diffDays)} days ago)`}
              </span>
            </div>
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Retain full access to Business HR, Attendance &amp; CRM modules</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>All employees, leave records &amp; attendance history safely preserved</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Instant cloud activation upon renewal with GST tax invoice</span>
            </div>
          </div>

          {diffDays <= 1 && (
            <p className="text-[11px] text-muted-foreground/80 italic text-center">
              * Action required: This notification will reappear on every page refresh until renewed.
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 bg-muted/20 border-t border-border flex flex-col sm:flex-row gap-2 sm:gap-0 justify-between items-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground text-xs order-2 sm:order-1"
          >
            {isExpired ? "Dismiss for Now" : "Remind Me Later"}
          </Button>

          <Button
            type="button"
            onClick={handleRenewClick}
            size="default"
            className={`w-full sm:w-auto font-bold text-white shadow-md order-1 sm:order-2 ${
              isExpired
                ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
            }`}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Renew Plan Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
