import { Outlet, useNavigate, Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { LockedFeature } from "@/components/subscription/LockedFeature";
import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getAppPageTitle } from "@/lib/page-titles";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/app-store";
import { useFeatureStore, ADMIN_FEATURE_GROUPS } from "@/store/feature-store";
import { CommandPalette } from "@/components/shared/CommandPalette";
import { NotificationBell } from "@/components/shared/NotificationBell";

import { TrialBanner } from "@/components/shared/TrialBanner";
import { PlanSelectorModal } from "@/components/shared/PlanSelectorModal";
import { AIChatWidget } from "@/components/public/AIChatWidget";
import { SubscriptionBadge } from "@/components/shared/SubscriptionBadge";
import { useSubscription } from "@/hooks/use-subscription";
import { normalizePlanKey } from "@/lib/subscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Home, Settings, User, HelpCircle, Building2, ArrowUpCircle, AlertCircle, Shield, Trash2, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function OrgSetup({ onComplete, onDeleteAccount }: { onComplete: () => void; onDeleteAccount?: () => void }) {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleCreate = async () => {
    if (!name.trim() || !profile) return;
    setSaving(true);
    const { data: orgData, error } = await supabase.rpc("create_organization_for_current_user", {
      org_name: name.trim(),
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // All newly created organizations strictly start on Free Plan for 6 months (180 days)
    // Paid plans (HR, Suite, CRM, etc.) must be purchased via Razorpay in the plan modal.
    try {
      const orgId = orgData?.id;
      if (orgId) {
        await supabase.rpc("start_org_trial", {
          p_org_id: orgId,
          p_plan_name: "free"
        });
      }
      sessionStorage.removeItem("onboarding_plan");
      sessionStorage.removeItem("onboarding_hr");
      sessionStorage.removeItem("onboarding_plat");
      sessionStorage.removeItem("onboarding_billing");
    } catch (err) {
      console.error("Failed to start trial:", err);
    }

    toast({ title: "Organization created!" });
    onComplete();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-3">
            <Building2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Welcome! Set up your business</CardTitle>
          <CardDescription>Enter your business name to get started</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Business / Organization Name *</Label>
            <Input
              placeholder="e.g. Acme Enterprises, Sharma Traders"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>
          <Button className="w-full" onClick={handleCreate} disabled={!name.trim() || saving}>
            {saving ? "Creating Business..." : "Continue"}
          </Button>
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t pt-4">
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
          {onDeleteAccount && (
            <button
              type="button"
              onClick={onDeleteAccount}
              className="text-xs text-rose-500 hover:text-rose-600 hover:underline font-medium"
            >
              Need to delete account?
            </button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export function AppLayout() {
  const { profile, user, signOut } = useAuth();
  const { toast } = useToast();
  const setOrganization = useAppStore((s) => s.setOrganization);
  const setCurrentUserId = useAppStore((s) => s.setCurrentUserId);
  const userRole = useAppStore((s) => s.userRole);
  const setUserRole = useAppStore((s) => s.setUserRole);
  const setUserPermissions = useAppStore((s) => s.setUserPermissions);
  const org = useAppStore((s) => s.organization);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checking, setChecking] = useState(true);
  const [profileTimedOut, setProfileTimedOut] = useState(false);
  const [hasNoBusiness, setHasNoBusiness] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [isEmployeeBlocked, setIsEmployeeBlocked] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const { subscriptionPlan, isOnTrial } = useSubscription();

  const dynamicPageTitle = getAppPageTitle(location.pathname, org?.name);

  useEffect(() => {
    document.title = dynamicPageTitle;
  }, [dynamicPageTitle]);

  useEffect(() => {
    const handleOpenPlanModal = () => setShowPlanModal(true);
    window.addEventListener('open-plan-modal', handleOpenPlanModal);
    return () => window.removeEventListener('open-plan-modal', handleOpenPlanModal);
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      const targetEmail = (user?.email || profile?.email || "").toLowerCase().trim();
      if (targetEmail === "admin@aassaybiz.com" || targetEmail === "awesh.etpl@gmail.com") {
        setIsPlatformAdmin(true);
        return;
      }

      const uid = user?.id || profile?.user_id;
      if (!uid) return;
      try {
        const { data: isAdmin, error } = await supabase
          .rpc("is_platform_admin", { check_user_id: uid });
        if (isAdmin === true) {
          setIsPlatformAdmin(true);
        } else if (error) {
          const { data: directCheck } = await supabase
            .from("platform_admins")
            .select("id")
            .or(`id.eq.${uid},user_id.eq.${uid},email.eq.${targetEmail}`)
            .maybeSingle();
          if (directCheck) setIsPlatformAdmin(true);
        }
      } catch {
        // silent catch
      }
    };
    checkAdmin();
  }, [user?.id, profile?.user_id]);

  useEffect(() => {
    // Safety fallback: Never keep user stuck on loading spinner for more than 3.5 seconds
    const fallbackTimer = setTimeout(() => {
      setChecking(false);
      setProfileTimedOut(true);
    }, 3500);
    return () => clearTimeout(fallbackTimer);
  }, []);

  const loadOrg = async () => {
    if (!profile) {
      setChecking(true);
      return;
    }
    
    try {
      setCurrentUserId(profile.user_id);
      
      // Query all organizations the user is a member of
      const { data: memberOrgs, error: memberErr } = await supabase
        .from("organization_members")
        .select("org_id, role, permissions, organizations(id, name, logo_url)")
        .eq("user_id", profile.user_id);

      // Query all organizations where the user is the direct owner_id
      const { data: ownedOrgs } = await supabase
        .from("organizations")
        .select("id, name, logo_url")
        .eq("owner_id", profile.user_id);

      const hasMemberOrgs = Boolean(memberOrgs && memberOrgs.length > 0);
      const hasOwnedOrgs = Boolean(ownedOrgs && ownedOrgs.length > 0);

      // If user has NO organizations at all (neither as member nor owner)
      if (!hasMemberOrgs && !hasOwnedOrgs) {
        const isExplicitAppNav = location.pathname.startsWith("/dashboard") || location.pathname.startsWith("/invoices") || location.pathname.startsWith("/settings");
        const targetEmail = (user?.email || profile?.email || "").toLowerCase().trim();

        if (!isExplicitAppNav) {
          if (targetEmail === "admin@aassaybiz.com" || targetEmail === "awesh.etpl@gmail.com") {
            navigate("/platform-admin", { replace: true });
            return;
          }

          const { data: isAdmin } = await supabase
            .rpc("is_platform_admin", { check_user_id: profile.user_id });

          if (isAdmin === true) {
            navigate("/platform-admin", { replace: true });
            return;
          }

          const { data: directAdmin } = await supabase
            .from("platform_admins")
            .select("id")
            .or(`id.eq.${profile.user_id},user_id.eq.${profile.user_id},email.eq.${targetEmail}`)
            .maybeSingle();

          if (directAdmin) {
            navigate("/platform-admin", { replace: true });
            return;
          }
        }

        // Clean up stale profile.org_id in DB if it was still pointing to a revoked business
        if (profile.org_id) {
          await supabase
            .from("profiles")
            .update({ org_id: null })
            .eq("id", profile.id);
        }

        // Check if pure attendance employee (no portal access allowed)
        const { data: empRecord } = await (supabase as any)
          .from("employees")
          .select("id")
          .eq("auth_user_id", profile.user_id)
          .maybeSingle();

        if (empRecord) {
          await supabase.auth.signOut();
          setIsEmployeeBlocked(true);
          setChecking(false);
          return;
        }

        // User has NO business - immediately show organization setup!
        setNeedsSetup(true);
        setHasNoBusiness(false);
        setChecking(false);
        return;
      }

      setHasNoBusiness(false);

      // Combine member organizations and owned organizations
      const memberList = (memberOrgs || [])
        .filter((m) => m.organizations)
        .map((m) => ({ id: (m.organizations as any).id, name: (m.organizations as any).name }));

      const ownedList = (ownedOrgs || []).map((o) => ({ id: o.id, name: o.name }));

      const combinedMap = new Map<string, { id: string; name: string }>();
      [...ownedList, ...memberList].forEach((o) => {
        if (o.id && !combinedMap.has(o.id)) combinedMap.set(o.id, o);
      });
      const orgList = Array.from(combinedMap.values());
      useAppStore.setState({ myOrganizations: orgList });

      // Determine activeOrgId
      let activeOrgId = profile.org_id;
      const isValidOrg = activeOrgId && orgList.some((o) => o.id === activeOrgId);

      if (!isValidOrg && orgList.length > 0) {
        activeOrgId = orgList[0].id;
        await supabase
          .from("profiles")
          .update({ org_id: activeOrgId })
          .eq("id", profile.id);
      }

      const { data: activeOrg, error: orgErr } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", activeOrgId)
        .maybeSingle();

      if (activeOrg) {
        setOrganization(activeOrg as any);
        const activeMember = memberOrgs?.find((m) => m.org_id === activeOrgId);
        const isOrgOwner = (activeOrg as any).owner_id === profile.user_id;
        const resolvedRole = isOrgOwner ? "owner" : (activeMember?.role || "staff");
        setUserRole(resolvedRole);
        setUserPermissions(activeMember?.permissions || (isOrgOwner ? ["settings_access", "whatsapp_access"] : []));

        if ((activeOrg as any).enabled_features && Array.isArray((activeOrg as any).enabled_features)) {
          useFeatureStore.getState().setOrgFeatures(activeOrgId, (activeOrg as any).enabled_features);
        } else {
          useFeatureStore.getState().initOrgFeatures(activeOrgId);
        }

        try {
          const { data: subData } = await supabase.rpc("get_my_org_subscription", {
            p_org_id: activeOrgId
          });
          
          if (subData) {
            let features = Array.isArray(subData.enabled_features) ? [...subData.enabled_features] : [];
            
            if (!features.includes('sales')) features.push('sales');
            if (!features.includes('catalog')) features.push('catalog');
            if (!features.includes('people')) features.push('people');
            if (!features.includes('crm')) features.push('crm');
            if (!features.includes('marketing')) features.push('marketing');
            
            const rawPlanName = subData.plan_name || (activeOrg as any)?.subscription_plan || 'free';
            const parsedPlans = String(rawPlanName)
              .split('+')
              .map((p: string) => normalizePlanKey(p))
              .filter(Boolean);
            const paidPlans = Array.from(new Set(parsedPlans.filter((p: string) => p !== 'free')));
            const resolvedPlanName = parsedPlans.includes('suite')
              ? 'suite'
              : paidPlans.length > 0
              ? paidPlans.join('+')
              : 'free';

            let resolvedEmpLimit = 3;
            let maxPlatformUsers = 0;
            let maxCrmLimit = 2;

            try {
              const { data: activeSubs } = await supabase
                .from("subscriptions")
                .select("employee_count, platform_employee_count, manual_override_features")
                .eq("org_id", activeOrgId)
                .eq("status", "active");

              const maxActiveCount = Math.max(
                0,
                ...(activeSubs || []).map((s: any) => Number(s.employee_count || s.manual_override_features?.employee_limit) || 0)
              );
              if (maxActiveCount > 0) {
                resolvedEmpLimit = maxActiveCount;
              } else if (parsedPlans.includes('suite') || parsedPlans.includes('hr')) {
                resolvedEmpLimit = 10;
              } else {
                const extraOrPurchased = Math.max(subData.employee_limit || 0, subData.employee_count || 0);
                resolvedEmpLimit = extraOrPurchased > 3 ? extraOrPurchased : 3;
              }

              maxPlatformUsers = Math.max(
                0,
                ...(activeSubs || []).map((s: any) => Number(s.platform_employee_count || s.manual_override_features?.platform_user_limit) || 0)
              );

              maxCrmLimit = Math.max(
                2,
                ...(activeSubs || []).map((s: any) => Number(s.manual_override_features?.crm_team_limit) || 0)
              );
            } catch (quotaErr) {
              console.warn("Failed to load subscription quotas:", quotaErr);
              if (parsedPlans.includes('suite') || parsedPlans.includes('hr')) {
                resolvedEmpLimit = 10;
              }
            }

            if (parsedPlans.includes('suite')) {
              features = ADMIN_FEATURE_GROUPS.map(g => g.key);
            } else if (resolvedPlanName === 'free') {
              features = features.filter(f => f !== 'reports' && f !== 'outreach');
            }
            useFeatureStore.getState().setPlatformFeatures(features);
            useFeatureStore.getState().setOrgFeatures(activeOrgId, features);
            useFeatureStore.getState().setSubscriptionMeta({
              plan_name: resolvedPlanName,
              status: subData.status,
              trial_ends_at: subData.trial_ends_at,
              employee_limit: resolvedEmpLimit,
              employee_count: subData.employee_count,
              platform_employee_limit: maxPlatformUsers > 0 ? maxPlatformUsers : subData.platform_employee_limit,
              platform_employee_count: maxPlatformUsers > 0 ? maxPlatformUsers : (subData.platform_employee_count || 0),
              crm_portal_limit: maxCrmLimit,
              invoice_limit: subData.invoice_limit,
              client_limit: subData.client_limit,
              item_limit: subData.item_limit,
              current_period_end: subData.current_period_end,
            });
          }
        } catch (err) {
          console.error("Failed to load subscription features via RPC:", err);
        }

        setNeedsSetup(false);
        setChecking(false);
        return;
      }

      setNeedsSetup(true);
    } catch (err) {
      console.error("[loadOrg] Uncaught error:", err);
    } finally {
      setChecking(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeletingAccount(true);
      const { data, error } = await supabase.rpc("delete_my_user_account");
      if (error) {
        throw error;
      }
      toast({
        title: "Account Deleted",
        description: "Your account has been deleted from the database. You can now register again.",
      });
      try {
        await signOut();
      } catch (e) {
        // User already wiped from database
      }
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/register";
    } catch (err: any) {
      console.error("Account deletion failed:", err);
      toast({
        title: "Deletion Failed",
        description: err.message || "Failed to delete account. Please try again.",
        variant: "destructive",
      });
      setDeletingAccount(false);
    }
  };

  useEffect(() => {
    if (window.location.hash.includes("type=invite") || window.location.hash.includes("type=recovery")) {
      navigate("/reset-password" + window.location.hash, { replace: true });
      return;
    }
    loadOrg();
  }, [profile, profile?.org_id]);

  if ((checking || !profile || (!org && !needsSetup && !hasNoBusiness && !isEmployeeBlocked)) && !profileTimedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground font-medium">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (profileTimedOut && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm text-center p-6 space-y-4">
          <p className="text-sm font-medium text-muted-foreground">Unable to load profile session.</p>
          <div className="flex gap-2 justify-center">
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>Retry</Button>
            <Button size="sm" variant="destructive" onClick={async () => { await signOut(); navigate("/login"); }}>Sign In</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (hasNoBusiness) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-8">
        <Card className="w-full max-w-md border-slate-200 dark:border-slate-800 shadow-xl bg-card">
          <CardHeader className="text-center pb-3">
            <div className="mx-auto w-14 h-14 bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mb-3 text-2xl font-bold shadow-xs">
              <Building2 className="h-7 w-7" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">
              You don't have any business
            </CardTitle>
            <CardDescription className="text-sm mt-2 text-muted-foreground leading-relaxed">
              Your account is not linked to any active business, or your platform access has been removed by the administrator.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300">
              <p className="font-semibold mb-1">Notice:</p>
              Please delete this account to completely clear your record from the database. Once deleted, you or your employer can register or invite you fresh using this email address (<span className="font-medium underline">{user?.email || profile?.email}</span>).
            </div>

            <Button
              variant="destructive"
              className="w-full font-semibold shadow-xs flex items-center justify-center gap-2"
              onClick={() => setShowDeleteAccountModal(true)}
              disabled={deletingAccount}
            >
              <Trash2 className="h-4 w-4" />
              {deletingAccount ? "Deleting Account..." : "Delete Account"}
            </Button>

            <Button
              variant="outline"
              className="w-full font-medium"
              onClick={async () => {
                await signOut();
                navigate("/login", { replace: true });
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>

            <div className="text-center pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setHasNoBusiness(false);
                  setNeedsSetup(true);
                }}
                className="text-xs text-primary hover:underline font-medium"
              >
                Are you a business owner? Set up a new business
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Delete Account Confirmation Dialog */}
        <AlertDialog open={showDeleteAccountModal} onOpenChange={setShowDeleteAccountModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Permanently Delete Account?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <span>
                  This action is permanent and cannot be undone. All your profile and authentication records will be wiped from the system.
                </span>
                <span className="block font-medium text-foreground">
                  After deletion, you will be able to sign up again with this email address.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingAccount}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
              >
                {deletingAccount ? "Deleting..." : "Yes, Delete My Account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  if (isEmployeeBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md border-destructive/30 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-2 text-2xl font-bold">
              🚫
            </div>
            <CardTitle className="text-xl text-destructive font-bold">Access Denied</CardTitle>
            <CardDescription className="text-sm mt-2 text-foreground font-medium">
              Employee / Staff accounts cannot log into this Portal. Please use the Attendance Portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-center">
            <a
              href="https://attendance.aassaybiz.com/"
              target="_blank"
              rel="noreferrer"
              className="block w-full"
            >
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-5">
                Click here to login
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (needsSetup) {
    return (
      <>
        <OrgSetup
          onComplete={() => window.location.reload()}
          onDeleteAccount={() => setShowDeleteAccountModal(true)}
        />
        <AlertDialog open={showDeleteAccountModal} onOpenChange={setShowDeleteAccountModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Permanently Delete Account?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <span>
                  This action is permanent and cannot be undone. All your profile and authentication records will be wiped from the system.
                </span>
                <span className="block font-medium text-foreground">
                  After deletion, you will be able to sign up again with this email address.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingAccount}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
              >
                {deletingAccount ? "Deleting..." : "Yes, Delete My Account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  const effectivePlan = subscriptionPlan || (org as any)?.subscription_plan || 'free';
  const isFreePlan = effectivePlan.toLowerCase() === 'free';
  const isMarketingPlan = effectivePlan.toLowerCase().includes('promotion') || effectivePlan.toLowerCase().includes('suite') || effectivePlan.toLowerCase().includes('marketing') || effectivePlan.toLowerCase().includes('plan_6');
  
  const REPORTS_ROUTES = [
    "/reports",
    "/sales-reports",
    "/purchase-accounting-reports",
    "/inventory-reports",
    "/accounting-reports",
    "/business-report",
    "/profit-loss",
    "/gst-returns",
    "/tds",
    "/inventory-valuation",
    "/aging-details",
    "/statements",
    "/hr-reports"
  ];
  
  const MARKETING_ROUTES = [
    "/campaigns",
    "/marketing/templates",
    "/journeys",
    "/message-logs",
    "/promotion-reports"
  ];

  const OUTREACH_ROUTES = [
    "/emails",
    "/chats",
    "/crm/integrations",
    "/crm-integrations",
    "/integrations"
  ];
  
  let isRouteRestricted = false;
  let restrictedTitle = "Feature Locked";
  let restrictedDesc = "This feature is not available on the Free plan. Please upgrade to a premium plan to access it.";

  if (isFreePlan && REPORTS_ROUTES.includes(location.pathname)) {
    isRouteRestricted = true;
  }
  if (!isMarketingPlan && MARKETING_ROUTES.includes(location.pathname)) {
    isRouteRestricted = true;
  }
  if (isFreePlan && OUTREACH_ROUTES.some(p => location.pathname === p || location.pathname.startsWith(p + "/"))) {
    isRouteRestricted = true;
    restrictedTitle = "Business Integration Locked";
    restrictedDesc = "Business Integration (Official WhatsApp, Email & Lead APIs) is not available on the Free plan. Please upgrade to Business Suite or an add-on plan to access it.";
  }

  const mainContent = isRouteRestricted ? (
    <LockedFeature 
      title={restrictedTitle}
      description={restrictedDesc}
      onUpgradeClick={() => setShowPlanModal(true)}
    />
  ) : (
    <Outlet />
  );

  return (
    <SidebarProvider>
      <Helmet>
        <title>{dynamicPageTitle}</title>
      </Helmet>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-20 flex items-center gap-6 px-8 bg-slate-50/50 dark:bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger />
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <CommandPalette />
              <NotificationBell />
              

              {isPlatformAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/platform-admin")}
                  className="hidden sm:flex items-center gap-1.5 text-xs font-semibold border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50/90 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/70 shadow-xs"
                >
                  <Shield className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  Platform Admin
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/settings?tab=support")}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-full h-9 w-9"
                title="Help & Support"
              >
                <HelpCircle className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-1 pr-2 rounded-full transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                    <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {profile?.first_name?.[0] || "D"}
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1.5">
                      <div className="flex items-center justify-between pb-1.5 mb-1 border-b">
                        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Account ID</span>
                        <span className="font-mono font-bold text-xs bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                          #{profile?.account_id || "1" + String(profile?.id || "00000").replace(/\D/g, "").slice(0, 5).padStart(5, "0")}
                        </span>
                      </div>
                      <p className="text-sm font-semibold leading-none">
                        {[profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email || ""}
                      </p>
                      {org && (
                        <p className="text-xs leading-none text-muted-foreground flex items-center gap-1 pt-1 mb-2">
                          <Building2 className="h-3 w-3" />
                          {org.name}
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isPlatformAdmin && (
                    <>
                      <DropdownMenuItem
                        onClick={() => navigate("/platform-admin")}
                        className="cursor-pointer font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/70 my-1 rounded-md"
                      >
                        <Shield className="mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        Platform Admin Panel
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={() => setShowPlanModal(true)}
                    className="cursor-pointer font-semibold text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 focus:bg-amber-500/20 focus:text-amber-700 dark:focus:text-amber-400 my-1 rounded-md"
                  >
                    <ArrowUpCircle className="mr-2 h-4 w-4 text-amber-600 dark:text-amber-500" />
                    Upgrade Plan
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/settings?tab=profile")} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings?tab=support")} className="cursor-pointer">
                    <HelpCircle className="mr-2 h-4 w-4 text-blue-500" />
                    Help & Support
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await signOut();
                      navigate("/login", { replace: true });
                    }}
                    className="cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <TrialBanner onUpgrade={() => setShowPlanModal(true)} />

          {/* Incomplete Profile Alert Banner - Only shown to business owners, never to invited employees */}
          {(() => {
            const isOrgOwner = (org as any)?.owner_id === (user?.id || profile?.user_id) || userRole === "owner";
            const hasAddress = Boolean(profile?.address_line || (org?.address as any)?.street || (org?.address as any)?.address_line);
            const hasPincode = Boolean(profile?.pincode || (org?.address as any)?.postal_code || (org?.address as any)?.pincode);

            if (!isOrgOwner || (hasAddress && hasPincode)) {
              return null;
            }

            return (
              <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 px-6 py-2.5 flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-medium">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Complete Business Profile:</strong> Please add your complete Address & PIN Code in Settings to enable invoice generation.
                  </span>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => navigate("/settings?tab=profile")}
                  className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 font-semibold h-7 text-xs shrink-0"
                >
                  Complete Profile
                </Button>
              </div>
            );
          })()}
          <main className="flex-1 overflow-auto px-6 py-6">
            {mainContent}
          </main>
        </div>
      </div>
      
      <PlanSelectorModal 
        open={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        currentPlanName={subscriptionPlan || undefined}
      />
          {/* Floating AI Assistant Chatbot (Available across all authenticated pages) */}
      <AIChatWidget />
    </SidebarProvider>
  );
}
