import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/app-store";
import {
  useFeatureStore,
  ADMIN_FEATURE_GROUPS,
  DEFAULT_FEATURE_GROUPS,
} from "@/store/feature-store";
import { useAuth } from "@/lib/auth";
import { LockedFeature } from "@/components/subscription/LockedFeature";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlanSelectorModal } from "@/components/shared/PlanSelectorModal";
import { SubscriptionBadge } from "@/components/shared/SubscriptionBadge";
import { useSubscription } from "@/hooks/use-subscription";
import { SEO } from "@/components/shared/SEO";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Shield, Check, X, ArrowLeft, Plus, Trash2, Building2,
  FileText, Package, ShoppingCart, Calculator,
  UserCog, Users, Send, BarChart3, Loader2, AlertCircle, ChevronDown,
  AlertTriangle, Crown, CheckCircle2, XCircle, Mail, Edit2
} from "lucide-react";
import { toast } from "sonner";

const ICON_MAP: Record<string, any> = {
  FileText, Package, ShoppingCart, Calculator,
  UserCog, Users, Send, BarChart3,
};

export default function AdminPanelPage() {
  const navigate = useNavigate();
  const userRole = useAppStore((s) => s.userRole);

  const { subscriptionPlan, subscriptionStatus, trialDaysLeft, isOnTrial } = useSubscription();
  const org = useAppStore((s) => s.organization);

  const { session } = useAuth();
  const {
    isAdmin,
    isSuperAdmin,
    adminEmails,
    addAdmin,
    removeAdmin,
    enabledGroups,
    toggleGroup,
    teamMembers,
    addTeamMember,
    removeTeamMember,
    platformFeatures,
  } = useFeatureStore();

  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newBusinessName, setNewBusinessName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("Staff");
  const [newUserPermissions, setNewUserPermissions] = useState<string[]>([]);
  // Invite member modal state: 'idle' | 'loading' | 'success' | 'error'
  const [inviteModalState, setInviteModalState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [inviteModalData, setInviteModalData] = useState<{
    email: string;
    role: string;
    businessName: string;
    errorMessage?: string;
  }>({ email: '', role: '', businessName: '' });
  
  // Edit member state
  const [editingMember, setEditingMember] = useState<any>(null);
  const [editingRole, setEditingRole] = useState<string>("Staff");
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [isUpdatingMember, setIsUpdatingMember] = useState(false);

  // Actions loading states
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);

  const [fetchedTeamMembers, setFetchedTeamMembers] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [selectedTeamOrgId, setSelectedTeamOrgId] = useState<string>("");
  const [selectedOrgFeatures, setSelectedOrgFeatures] = useState<string[]>([]);
  const [selectedOrgPlan, setSelectedOrgPlan] = useState<string | null>(null);
  const [businessEmployees, setBusinessEmployees] = useState<Array<{ id: string; name: string; email: string | null; designation: string | null }>>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("custom");
  const [isCreatingBusiness, setIsCreatingBusiness] = useState(false);
  const [newOrgIdToUpgrade, setNewOrgIdToUpgrade] = useState<string | null>(null);
  const addMyOrganization = useAppStore((s) => s.addMyOrganization);
  const myOrganizations = useAppStore((s) => s.myOrganizations);
  const currentOrg = useAppStore((s) => s.organization);

  const currentUserEmail = session?.user?.email;
  const isSuper = isSuperAdmin(currentUserEmail);

  // Subscription state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [allOrgsWithPlans, setAllOrgsWithPlans] = useState<Array<{
    id: string; 
    name: string; 
    plans: Array<{plan: string; planDisplay: string; status: string; isPaid: boolean; planColor: string}>; 
    isActive: boolean
  }>>([]);

  // Logic for global team members limit across ALL businesses
  const totalGlobalUsers = fetchedTeamMembers.length;
  const currentOrgId = currentOrg?.id || "default";

  const currentPlan = useFeatureStore(s => s.subscriptionPlan);
  // Platform employee limit: from DB (for extra 99rs slots) + base per plan
  const platformLimitBase = useFeatureStore(s => s.platformEmployeeLimit);
  const platformExtra = useFeatureStore(s => s.platformEmployeeCount) || 0;

  // Derive max users allowed:
  // - Free: 0 users (cannot invite users on Free plan)
  // - Accounting / CRM / Promotion / HR: 3 base users
  // - Business Suite: 5 base users
  // - Any plan + 99rs add-on: base + purchased extra slots
  const getMaxUsers = (plan: string | null, extraSlots: number, dbLimit: number | null): number => {
    const p = (plan || 'free').toLowerCase();
    let base = p === 'free' ? 0 : (p.includes('suite') ? 5 : 3);
    // If DB / Platform Admin has set an explicit platform user limit, respect it
    if (dbLimit && dbLimit > 0) return Math.max(base, dbLimit);
    if (extraSlots > 0) return base + extraSlots;
    return base;
  };

  const targetTeamOrgId = selectedTeamOrgId || currentOrgId;
  const isCurrentOrg = !selectedTeamOrgId || selectedTeamOrgId === currentOrgId;
  const currentPlanNameLower = String(subscriptionPlan || currentPlan || currentOrg?.subscription_plan || '').toLowerCase();

  const selectedOrgObj = allOrgsWithPlans.find(o => o.id === targetTeamOrgId);

  let activePlanForSelectedOrg = 'free';

  if (isCurrentOrg && currentPlanNameLower) {
    activePlanForSelectedOrg = currentPlanNameLower;
  } else if (selectedOrgPlan) {
    activePlanForSelectedOrg = selectedOrgPlan.toLowerCase();
  } else if (selectedOrgObj?.plans?.length) {
    const hasSuite = selectedOrgObj.plans.find(p => p.plan.toLowerCase().includes('suite'));
    activePlanForSelectedOrg = hasSuite ? 'suite' : selectedOrgObj.plans[0].plan.toLowerCase();
  } else {
    activePlanForSelectedOrg = currentPlanNameLower || 'free';
  }

  // Any indicator of suite gives Suite access (5 employees)
  if (
    activePlanForSelectedOrg.includes('suite') ||
    (isCurrentOrg && currentPlanNameLower.includes('suite')) ||
    selectedOrgObj?.plans?.some(p => p.plan.toLowerCase().includes('suite'))
  ) {
    activePlanForSelectedOrg = 'suite';
  }

  const maxUsersAllowed = getMaxUsers(activePlanForSelectedOrg, platformExtra, platformLimitBase);
  const remainingInvites = Math.max(0, maxUsersAllowed - totalGlobalUsers);
  const globalLimitReached = totalGlobalUsers >= maxUsersAllowed;

  const loadTeamMembers = async () => {
    const targetOrgId = selectedTeamOrgId || currentOrgId;
    if (targetOrgId === "default" || !targetOrgId) return;
    setIsLoadingMembers(true);
    try {
      const { data, error } = await supabase.rpc("get_org_members_with_status", { target_org_id: targetOrgId });
      if (data) setFetchedTeamMembers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  useEffect(() => {
    const fetchOrgFeatures = async () => {
      const targetOrgId = selectedTeamOrgId || currentOrgId;
      if (!targetOrgId || targetOrgId === "default") return;
      
      try {
        const [{ data: subData }, { data: orgData }] = await Promise.all([
          supabase.rpc('get_my_org_subscription', { p_org_id: targetOrgId }),
          supabase.from('organizations').select('subscription_plan').eq('id', targetOrgId).maybeSingle()
        ]);
        if (subData) {
          if (subData.enabled_features) setSelectedOrgFeatures(subData.enabled_features);
          if (subData.plan_name) setSelectedOrgPlan(subData.plan_name);
        }
        if (orgData?.subscription_plan) {
          setSelectedOrgPlan(orgData.subscription_plan);
        }
        try {
          const { data: subQuota } = await supabase
            .from('subscriptions')
            .select('platform_employee_count, manual_override_features')
            .eq('org_id', targetOrgId)
            .eq('status', 'active');
          const maxCustomPlat = Math.max(0, ...(subQuota || []).map((s: any) => Number(s.platform_employee_count || s.manual_override_features?.platform_user_limit) || 0));
          if (maxCustomPlat > 0) {
            useFeatureStore.setState({ platformEmployeeLimit: maxCustomPlat, platformEmployeeCount: maxCustomPlat });
          }
        } catch {}
      } catch (err) {
        console.error("Failed to fetch features for org:", err);
        setSelectedOrgFeatures([]);
      }
    };
    fetchOrgFeatures();
  }, [selectedTeamOrgId, currentOrgId]);

  useEffect(() => {
    if (currentOrgId && currentOrgId !== "default" && !selectedTeamOrgId) {
      setSelectedTeamOrgId(currentOrgId);
    }
  }, [currentOrgId, selectedTeamOrgId]);

  const loadBusinessEmployees = async (targetOrgId: string) => {
    if (!targetOrgId || targetOrgId === "default") return;
    try {
      const { data, error } = await (supabase as any)
        .from("employees")
        .select("id, name, email, designation")
        .eq("org_id", targetOrgId)
        .order("name");

      if (!error && data) {
        setBusinessEmployees(data);
      } else {
        setBusinessEmployees([]);
      }
    } catch (err) {
      console.error("Error loading employees for org:", err);
      setBusinessEmployees([]);
    }
  };

  useEffect(() => { 
    loadTeamMembers(); 
    const targetOrgId = selectedTeamOrgId || currentOrgId;
    if (targetOrgId) {
      loadBusinessEmployees(targetOrgId);
      setSelectedEmployeeId("custom");
    }
  }, [selectedTeamOrgId, currentOrgId]);



  const handleAddAdmin = () => {
    if (newAdminEmail && newAdminEmail.includes("@")) {
      addAdmin(newAdminEmail);
      setNewAdminEmail("");
    }
  };

  const handleAddTeamMember = async () => {
    if (inviteModalState === 'loading') return;
    const targetOrgId = selectedTeamOrgId || currentOrgId;
    if (!newUserEmail || !newUserEmail.includes("@") || !targetOrgId) return;

    const targetOrg = allOrgsWithPlans.find(o => o.id === targetOrgId);
    const targetBusinessName = targetOrg?.name || currentOrg?.name || "this business";
    const emailToInvite = newUserEmail.trim();
    const roleToInvite = newUserRole;
    const permsToInvite = [...newUserPermissions];

    // CA/CS is an external advisor and can be invited across multiple businesses without employee slot restrictions
    const isCaRole = newUserRole === "CA/CS" || newUserRole.toLowerCase().includes("ca");

    if (!isCaRole) {
      const currentCount = fetchedTeamMembers.length;
      if (maxUsersAllowed > 0 && currentCount >= maxUsersAllowed) {
        setInviteModalData({
          email: emailToInvite,
          role: roleToInvite,
          businessName: targetBusinessName,
          errorMessage: `Plan limit reached (${maxUsersAllowed} users). Please purchase additional user slots or upgrade your plan to proceed.`
        });
        setInviteModalState('error');
        return;
      }
    }

    // Immediately open modal in loading state and lock interaction
    setInviteModalData({
      email: emailToInvite,
      role: roleToInvite,
      businessName: targetBusinessName,
    });
    setInviteModalState('loading');

    try {
      const { data, error } = await supabase.functions.invoke("invite-team-member", {
        body: {
          email: emailToInvite,
          role: isCaRole ? "ca_cs" : roleToInvite.toLowerCase().replace(/\s+/g, '_'),
          org_id: targetOrgId,
          permissions: permsToInvite
        }
      });

      if (error) {
        let errorMsg = error.message;
        try {
          if (error.context && typeof error.context.json === "function") {
            const body = await error.context.json();
            if (body?.error) errorMsg = body.error;
          }
        } catch (_) {}
        throw new Error(errorMsg);
      }
      
      // Reload team members in the background
      loadTeamMembers();
      
      // Reset form fields
      setNewUserEmail("");
      setNewUserRole("Staff");
      setNewUserPermissions([]);
      setSelectedEmployeeId("custom");

      // Show success modal directly on screen
      setInviteModalState('success');
    } catch (err: any) {
      console.error("Failed to invite team member:", err.message);
      setInviteModalData(prev => ({
        ...prev,
        errorMessage: err.message || "Failed to invite user. Please verify the email and try again."
      }));
      setInviteModalState('error');
    }
  };

  const togglePermission = (groupKey: string) => {
    setNewUserPermissions((prev) => 
      prev.includes(groupKey) 
        ? prev.filter((k) => k !== groupKey) 
        : [...prev, groupKey]
    );
  };

  const toggleEditPermission = (groupKey: string) => {
    setEditingPermissions((prev) => 
      prev.includes(groupKey) 
        ? prev.filter((k) => k !== groupKey) 
        : [...prev, groupKey]
    );
  };

  const handleRemoveMember = async (member: any) => {
    if (member.role === 'owner') {
      toast.error("Cannot Remove Owner: The business owner cannot be removed from their own organization.");
      return;
    }

    if (!confirm(`Are you sure you want to remove ${member.email} from this business? They will lose platform access immediately.`)) {
      return;
    }

    setRemovingMemberId(member.member_id);
    try {
      // 1. Call secure RPC function
      const { data: rpcData, error: rpcErr } = await supabase.rpc('remove_organization_member', {
        p_member_id: member.member_id
      });

      if (rpcErr) {
        // Fallback to direct delete using non-recursive RLS policy
        const { error: directErr } = await supabase
          .from('organization_members')
          .delete()
          .eq('id', member.member_id);
        if (directErr) throw directErr;
      }

      toast.success(`${member.email} has been removed from this business.`);
      await loadTeamMembers();
    } catch (err: any) {
      console.error("Failed to remove member:", err);
      toast.error("Failed to remove user: " + (err.message || "Unknown error"));
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleResendInvite = async (member: any) => {
    const targetOrgId = selectedTeamOrgId || currentOrgId;
    if (!targetOrgId || !member.email) return;

    setResendingEmailId(member.member_id);
    try {
      const isCaRole = member.role === "ca_cs" || member.role === "CA/CS" || member.role?.toLowerCase().includes("ca");
      const normalizedRole = isCaRole ? "ca_cs" : member.role?.toLowerCase().replace(/\s+/g, '_');

      const { data, error } = await supabase.functions.invoke("invite-team-member", {
        body: {
          email: member.email,
          role: normalizedRole,
          org_id: targetOrgId,
          permissions: member.permissions || []
        }
      });

      if (error) {
        let errorMsg = error.message;
        try {
          if (error.context && typeof error.context.json === "function") {
            const body = await error.context.json();
            if (body?.error) errorMsg = body.error;
          }
        } catch (_) {}
        throw new Error(errorMsg);
      }

      toast.success(`Fresh invitation email sent successfully to ${member.email}!`);
      await loadTeamMembers();
    } catch (err: any) {
      console.error("Failed to resend invite:", err);
      toast.error("Failed to resend email: " + (err.message || "Please try again"));
    } finally {
      setResendingEmailId(null);
    }
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;
    setIsUpdatingMember(true);
    try {
      const isCaRole = editingRole === "CA/CS" || editingRole === "ca_cs" || editingRole?.toLowerCase().includes("ca");
      const normalizedRole = isCaRole ? "ca_cs" : editingRole.toLowerCase().replace(/\s+/g, '_');

      // 1. Try secure RPC function first
      const { data: rpcData, error: rpcErr } = await supabase.rpc('update_organization_member_access', {
        p_member_id: editingMember.member_id,
        p_role: normalizedRole,
        p_permissions: editingPermissions
      });

      if (rpcErr) {
        // Fallback to direct update
        const { error: directErr } = await supabase
          .from('organization_members')
          .update({
            role: normalizedRole as any,
            permissions: editingPermissions
          })
          .eq('id', editingMember.member_id);

        if (directErr) throw directErr;
      }

      toast.success(`Access and permissions updated for ${editingMember.email}!`);
      await loadTeamMembers();
      setEditingMember(null);
    } catch (err: any) {
      toast.error("Failed to update access: " + err.message);
    } finally {
      setIsUpdatingMember(false);
    }
  };

  const handleCreateBusiness = async () => {
    if (!newBusinessName.trim()) return;
    
    setIsCreatingBusiness(true);
    try {
      const userId = session?.user?.id;
      // 1. Create organization in Supabase explicitly with free plan and owner_id
      const { data, error } = await supabase
        .from("organizations")
        .insert([{ 
          name: newBusinessName.trim(),
          subscription_plan: 'free',
          owner_id: userId
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      // Update our local tracking
      if (data && userId) {
        setNewBusinessName("");
        
        // 2. Ensure the user is in organization_members for this new business as Owner with all permissions
        const allFeatures = [...DEFAULT_FEATURE_GROUPS, ...ADMIN_FEATURE_GROUPS].map(g => g.key);
        const { error: memberError } = await (supabase as any)
          .from("organization_members")
          .upsert({
            org_id: data.id,
            user_id: userId,
            role: "owner",
            permissions: allFeatures
          }, { onConflict: "org_id,user_id" });

        if (memberError) {
          console.error("Failed to add owner to organization_members:", memberError);
        }

        // 3. Switch the user's active business in profiles
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ org_id: data.id })
          .eq("user_id", userId);
          
        if (!profileError) {
          addMyOrganization({ id: data.id, name: data.name });
          setNewOrgIdToUpgrade(data.id);
          toast.success(`Business "${data.name}" created successfully!`);
          await loadAllOrgsWithPlans();
          // Open the plan selector modal for payment if they want to upgrade
          setShowPlanModal(true);
        }
      }
    } catch (err: any) {
      console.error("Failed to create business:", err.message);
      toast.error("Failed to create business: " + (err.message || "Unknown error"));
    } finally {
      setIsCreatingBusiness(false);
    }
  };

  // --- Delete Organization State ---
  const [orgToDelete, setOrgToDelete] = useState<{id: string; name: string; plan: string} | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingOrg, setIsDeletingOrg] = useState(false);

  const loadAllOrgsWithPlans = async () => {
    if (!session?.user?.id) return;
    const { data, error } = await supabase.rpc("get_my_orgs_with_plans");
    if (data) {
      const orgMap = new Map();
      (data as any[]).forEach(row => {
        if (!orgMap.has(row.org_id)) {
          orgMap.set(row.org_id, {
            id: row.org_id,
            name: row.org_name,
            plans: [],
            isActive: row.org_id === currentOrg?.id
          });
        }
        const orgEntry = orgMap.get(row.org_id);
        const planKey = row.plan_name || "free";
        const planDisplay = row.plan_display || (planKey === "free" ? "Free Plan" : planKey === "trial" ? "Trial" : planKey);
        const isPaid = planKey !== "free" && planKey !== "trial";
        const planColor = isPaid
          ? "bg-amber-50 text-amber-800 border-amber-200"
          : planKey === "trial"
          ? "bg-blue-50 text-blue-800 border-blue-200"
          : "bg-slate-100 text-slate-700 border-slate-200";

        if (!orgEntry.plans.some((p: any) => p.plan === planKey)) {
           orgEntry.plans.push({
             plan: planKey,
             planDisplay: planDisplay,
             status: row.sub_status || "free",
             isPaid,
             planColor
           });
        }
      });
      
      const list = Array.from(orgMap.values());
      list.forEach(org => {
         // If org has suite, suite takes precedence over all other plans
         if (org.plans.some((p: any) => p.plan.toLowerCase().includes("suite"))) {
            org.plans = org.plans.filter((p: any) => p.plan.toLowerCase().includes("suite"));
         } else if (org.plans.length > 1) {
            org.plans = org.plans.filter((p: any) => p.plan !== "free");
         }
         if (org.plans.length === 0) {
            org.plans.push({ plan: "free", planDisplay: "Free Plan", status: "free", isPaid: false, planColor: "bg-slate-100 text-slate-700 border-slate-200" });
         }
      });
      
      setAllOrgsWithPlans(list);
    }
  };

  useEffect(() => { loadAllOrgsWithPlans(); }, [currentOrg?.id, session?.user?.id]);

  const handleDeleteOrg = async () => {
    if (!orgToDelete || deleteConfirmText !== orgToDelete.name) return;
    setIsDeletingOrg(true);
    try {
      // Delete the organization — CASCADE will delete all related data
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", orgToDelete.id);

      if (error) throw error;

      setOrgToDelete(null);
      setDeleteConfirmText("");

      // If deleted the active org, reload the page to pick a new one
      if (orgToDelete.id === currentOrg?.id) {
        window.location.href = "/dashboard";
      } else {
        // Just reload org list
        loadAllOrgsWithPlans();
        window.location.reload();
      }
    } catch (err: any) {
      console.error("Failed to delete organization:", err.message);
      alert("Failed to delete: " + err.message);
    } finally {
      setIsDeletingOrg(false);
    }
  };


  // Admin panel
  // Filter features based on the organization's active subscription plans
  const availableAdminFeatures = ADMIN_FEATURE_GROUPS.filter((g) => 
    selectedOrgFeatures.includes(g.key)
  );
  const totalAdminFeatures = availableAdminFeatures.length;
  const enabledCount = availableAdminFeatures.filter((g) =>
    enabledGroups.includes(g.key)
  ).length;

  if (userRole === "staff") {
    return <Navigate to="/dashboard" replace />;
  }

  const currentPlanStr = subscriptionPlan || org?.subscription_plan || 'free';
  const isFreePlan = currentPlanStr.toLowerCase() === 'free';

  if (isFreePlan) {
    return (
      <div className="space-y-8 max-w-6xl mx-auto pb-12">
        <SEO title="Admin Panel Locked" />
        <LockedFeature 
          title="Admin Panel Locked"
          description="The Admin Panel is available exclusively on our Premium plans. Upgrade to manage team members, advanced settings, and API integrations."
          onUpgradeClick={() => setShowPlanModal(true)}
        />
        <PlanSelectorModal 
          open={showPlanModal} 
          onOpenChange={setShowPlanModal} 
          orgId={currentOrg?.id}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <SEO title="Admin Panel" />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Panel</h1>
            <p className="text-sm text-slate-500">Manage business subscription, team members, organizations, and modular features.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Dashboard
          </Button>
        </div>
      </div>

      <div className="space-y-10">
        {/* Subscription & Billing Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-600" />
              Subscription & Billing
            </h2>
          </div>
          <Card className="bg-white border-slate-200/80 shadow-2xs">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-medium text-slate-600">Current Plan:</span>
                    {subscriptionPlan ? <SubscriptionBadge /> : <span className="text-sm font-semibold text-slate-900">Free Plan</span>}
                  </div>
                  <p className="text-sm text-slate-500">
                    {isOnTrial 
                      ? `Your free trial ends in ${trialDaysLeft} days.` 
                      : "Manage your business subscription and billing details."}
                  </p>
                </div>
                <Button 
                  onClick={() => setShowPlanModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-2xs"
                >
                  {subscriptionStatus === "active" ? "Manage Subscription" : "Upgrade Plan"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Organization Users (Team) Section - Visible to all Admins */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              Organization Users (Team)
            </h2>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                globalLimitReached 
                  ? "bg-red-50 text-red-700 border-red-200" 
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}>
                Total Users Used: {totalGlobalUsers} / {maxUsersAllowed} ({remainingInvites} Invites Remaining)
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowPlanModal(true)}
                className="h-7 text-xs font-semibold border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 shadow-2xs"
              >
                + Buy User Slots (₹99/mo)
              </Button>
            </div>
          </div>
          <Card className="bg-white border-slate-200/80 shadow-2xs">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1 space-y-5 lg:border-r lg:border-slate-200 lg:pr-8">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 mb-1">Invite Employee</h3>
                    <p className="text-xs text-slate-500">
                      Add a new user to {allOrgsWithPlans.find(o => o.id === (selectedTeamOrgId || currentOrgId))?.name || "this business"}.
                      {maxUsersAllowed > 0 && ` (You can invite ${remainingInvites} more employee${remainingInvites === 1 ? '' : 's'})`}
                    </p>
                  </div>
                  
                  {globalLimitReached && (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-amber-900 text-sm font-semibold">Limit Exceeded</h4>
                          <p className="text-xs text-amber-800 mt-0.5">
                            Limit exceed! Purchase extra employee to proceed. (Plan limit: {maxUsersAllowed} users)
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setShowPlanModal(true)}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 shadow-xs"
                      >
                        Buy Extra Slots (₹99/user)
                      </Button>
                    </div>
                  )}

                  <div className="space-y-4">
                    {allOrgsWithPlans.length > 1 && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Select Business</label>
                        <select
                          value={selectedTeamOrgId || currentOrgId}
                          onChange={(e) => setSelectedTeamOrgId(e.target.value)}
                          className="w-full bg-white border border-slate-300 text-slate-900 h-10 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                        >
                            {allOrgsWithPlans.map(org => (
                              <option key={org.id} value={org.id}>{org.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                          <span>Select Employee</span>
                          {businessEmployees.length > 0 && (
                            <span className="text-[11px] text-emerald-600 font-medium">
                              {businessEmployees.length} employee{businessEmployees.length === 1 ? '' : 's'} in HR
                            </span>
                          )}
                        </label>
                        <select
                          value={selectedEmployeeId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedEmployeeId(val);
                            if (val === "custom") {
                              setNewUserEmail("");
                            } else {
                              const emp = businessEmployees.find(item => item.id === val);
                              if (emp?.email) {
                                setNewUserEmail(emp.email);
                              } else {
                                setNewUserEmail("");
                              }
                            }
                          }}
                          className="w-full bg-white border border-slate-300 text-slate-900 h-10 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium"
                        >
                          <option value="custom">-- Custom Email ID (Enter Manually) --</option>
                          {businessEmployees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} {emp.email ? `(${emp.email})` : '(No email set)'} {emp.designation ? `• ${emp.designation}` : ''}
                            </option>
                          ))}
                        </select>
                        {selectedEmployeeId !== "custom" && !businessEmployees.find(e => e.id === selectedEmployeeId)?.email && (
                          <p className="text-[11px] text-amber-600 font-medium">
                            ⚠️ This employee does not have an email saved in HR. Please type an email below.
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Email Address</label>
                        <Input
                          placeholder="employee@company.com"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 h-10 focus:border-emerald-500 focus:ring-emerald-500/20"
                        />
                        {selectedEmployeeId !== "custom" && (
                          <p className="text-[11px] text-slate-500">
                            Auto-filled from selected HR employee.
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">User Role</label>
                        <select
                          value={newUserRole}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewUserRole(val);
                            if (val === "CA/CS") {
                              // By default, grant CA/CS access to financial, reporting, and management modules
                              const caGroups = ["sales", "catalog", "purchases", "accounting", "reports", "gst"];
                              setNewUserPermissions(prev => Array.from(new Set([...prev, ...caGroups])));
                            }
                          }}
                          className="w-full bg-white border border-slate-300 text-slate-900 h-10 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium"
                        >
                          <option value="Staff">Staff</option>
                          <option value="Manager">Manager</option>
                          <option value="Accountant">Accountant</option>
                          <option value="Sales Executive">Sales Executive</option>
                          <option value="CA/CS">CA/CS (Chartered Accountant / Company Secretary)</option>
                        </select>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Feature Permissions</label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <label className="flex items-center gap-2.5 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-colors">
                            <input
                              type="checkbox"
                              checked={newUserPermissions.includes("settings_access")}
                              onChange={() => togglePermission("settings_access")}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="truncate font-medium">Settings Access</span>
                          </label>
                          <label className="flex items-center gap-2.5 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-colors">
                            <input
                              type="checkbox"
                              checked={newUserPermissions.includes("whatsapp_access")}
                              onChange={() => togglePermission("whatsapp_access")}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="truncate font-medium">WhatsApp Access</span>
                          </label>
                          {[...DEFAULT_FEATURE_GROUPS, ...ADMIN_FEATURE_GROUPS.filter(g => selectedOrgFeatures.includes(g.key))].map(group => (
                            <label key={group.key} className="flex items-center gap-2.5 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-colors">
                              <input
                                type="checkbox"
                                checked={newUserPermissions.includes(group.key)}
                                onChange={() => togglePermission(group.key)}
                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="truncate font-medium">{group.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <Button
                        onClick={handleAddTeamMember}
                        disabled={!newUserEmail || !newUserEmail.includes("@") || inviteModalState === 'loading'}
                        className={`w-full h-10 text-white font-medium shadow-2xs transition-colors mt-2 ${
                          inviteModalState === 'loading'
                            ? "bg-emerald-500/70 cursor-not-allowed"
                            : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        {inviteModalState === 'loading' ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Inviting User...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-1.5" />
                            Add User
                          </>
                        )}
                      </Button>
                    </div>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-slate-900 mb-4">
                    Current Team Members in {allOrgsWithPlans.find(o => o.id === (selectedTeamOrgId || currentOrgId))?.name || "this business"}
                  </h3>
                  {isLoadingMembers ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                  ) : fetchedTeamMembers.length === 0 ? (
                    <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
                      <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 font-medium">No users have been added yet.</p>
                      <p className="text-xs text-slate-400 mt-1">Use the form on the left to invite your first employee.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {fetchedTeamMembers.map((member) => (
                        <div key={member.member_id} className="flex flex-col p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 gap-3 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                <UserCog className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="text-sm text-slate-900 font-semibold leading-none">{member.email}</h4>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-full">
                                    {member.role === 'ca_cs' || member.role === 'ca/cs' ? 'CA/CS' : member.role}
                                  </span>
                                  <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                    {member.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {/* Resend invite button for pending users */}
                              {member.status?.toLowerCase().includes('pending') && (
                                <button
                                  type="button"
                                  onClick={() => handleResendInvite(member)}
                                  disabled={resendingEmailId === member.member_id}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50 mr-1"
                                  title="Resend invitation email to this employee"
                                >
                                  {resendingEmailId === member.member_id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-600" />
                                  ) : (
                                    <Mail className="h-3.5 w-3.5 text-orange-600" />
                                  )}
                                  <span>Resend Invite</span>
                                </button>
                              )}

                              {/* Edit access button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMember(member);
                                  let mappedRole = "Staff";
                                  const r = (member.role || "").toLowerCase();
                                  if (r === "ca_cs" || r === "ca/cs" || r.includes("ca")) mappedRole = "CA/CS";
                                  else if (r.includes("manager")) mappedRole = "Manager";
                                  else if (r.includes("accountant")) mappedRole = "Accountant";
                                  else if (r.includes("sales")) mappedRole = "Sales Executive";
                                  else if (r === "admin") mappedRole = "Admin";
                                  else if (r === "owner") mappedRole = "Owner";
                                  setEditingRole(mappedRole);
                                  setEditingPermissions(member.permissions || []);
                                }}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit role & permissions"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>

                              {/* Remove user button */}
                              {member.role !== 'owner' ? (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMember(member)}
                                  disabled={removingMemberId === member.member_id}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                  title="Remove user from business"
                                >
                                  {removingMemberId === member.member_id ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </button>
                              ) : (
                                <span className="p-2 text-amber-500/70 cursor-not-allowed" title="Business Owner cannot be removed">
                                  <Crown className="h-4 w-4" />
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {member.permissions && member.permissions.length > 0 && (
                            <div className="pt-2.5 border-t border-slate-200">
                              <p className="text-[10px] text-slate-500 mb-1.5 font-bold uppercase tracking-wider">ACCESS GRANTED:</p>
                              <div className="flex flex-wrap gap-1">
                                {member.permissions.map(p => {
                                  const group = [...DEFAULT_FEATURE_GROUPS, ...ADMIN_FEATURE_GROUPS].find(g => g.key === p);
                                  return (
                                    <span key={p} className="text-[10px] px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200 font-medium shadow-2xs">
                                      {group?.label || p}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Business Management Section */}
        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-600" />
            Manage Businesses
          </h2>
          <Card className="bg-white border-slate-200/80 shadow-2xs">
            <CardContent className="p-6 space-y-6">
              {/* Create New Business */}
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 mb-1">Create New Business</h3>
                    <p className="text-xs text-slate-500">Create a new company or business account. Purchasing a new plan is mandatory.</p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Business Name (e.g. ABC Pvt Ltd)"
                      value={newBusinessName}
                      onChange={(e) => setNewBusinessName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateBusiness()}
                      disabled={isCreatingBusiness}
                      className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 h-10 focus:border-indigo-500 focus:ring-indigo-500/20"
                    />
                    <Button
                      onClick={handleCreateBusiness}
                      disabled={!newBusinessName.trim() || isCreatingBusiness}
                      className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-2xs transition-colors shrink-0"
                    >
                      {isCreatingBusiness ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
                      Continue to Payment
                    </Button>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100">
                    <h4 className="text-indigo-900 font-semibold text-sm mb-2 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-indigo-600" /> Multi-Business Feature
                    </h4>
                    <p className="text-xs text-indigo-800 leading-relaxed">
                      Manage multiple businesses with a single login. A separate plan is required for each new business.
                    </p>
                  </div>
                </div>
              </div>

              {/* All Businesses List */}
              {allOrgsWithPlans.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-500" />
                    All Your Businesses
                    <span className="text-xs text-slate-500 font-normal">({allOrgsWithPlans.length} total)</span>
                  </h3>
                  <div className="space-y-2.5">
                    {allOrgsWithPlans.map((org) => {
                      return (
                        <div
                          key={org.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all ${
                            org.isActive
                              ? "bg-indigo-50/60 border-indigo-200/80 shadow-2xs"
                              : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                              org.isActive 
                                ? "bg-indigo-600 text-white shadow-2xs" 
                                : "bg-slate-200 text-slate-700"
                            }`}>
                              {org.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-900">{org.name}</span>
                                {org.isActive && (
                                  <span className="text-[10px] bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">Active</span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                {org.plans.map((p, idx) => (
                                  <div key={idx} className="flex items-center gap-1">
                                    {p.isPaid && <Crown className="h-3 w-3 text-amber-500" />}
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${p.planColor}`}>
                                      {p.planDisplay}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => setOrgToDelete({ id: org.id, name: org.name, plan: org.plans[0]?.plan || 'free' })}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all group mt-3 sm:mt-0 self-end sm:self-center shrink-0"
                            title="Delete this business"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Feature Management Section */}
        <section>
          {/* Stats bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl bg-white border border-slate-200/80 shadow-2xs p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Default Features</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">{DEFAULT_FEATURE_GROUPS.reduce((a, g) => a + g.items.length, 0)}</p>
              <p className="text-xs text-slate-500 mt-1">Always active — Invoice & Inventory</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200/80 shadow-2xs p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Enabled Modules</p>
              <p className="text-3xl font-bold text-indigo-600 mt-1">{enabledCount} <span className="text-lg text-slate-400 font-normal">/ {totalAdminFeatures}</span></p>
              <p className="text-xs text-slate-500 mt-1">Modules enabled for {currentOrg?.name || "this business"}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200/80 shadow-2xs p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Features</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {DEFAULT_FEATURE_GROUPS.reduce((a, g) => a + g.items.length, 0) + availableAdminFeatures.filter((g) => enabledGroups.includes(g.key)).reduce((a, g) => a + g.items.length, 0)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Features visible to the user</p>
            </div>
          </div>

          {/* Admin-controlled features */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-600" />
                Admin Controlled Features — Toggle ON/OFF ({currentOrg?.name || "Current Business"})
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {availableAdminFeatures.map((group) => {
                const isEnabled = enabledGroups.includes(group.key);
                const Icon = ICON_MAP[group.icon] || Package;
                return (
                  <div
                    key={group.key}
                    className={`rounded-xl border p-5 relative overflow-hidden transition-all duration-300 ${
                      isEnabled
                        ? "bg-white border-indigo-200 shadow-sm ring-1 ring-indigo-500/10"
                        : "bg-slate-50/70 border-slate-200/80 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-start gap-3.5 relative">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${
                          isEnabled ? "bg-indigo-50 text-indigo-600" : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className={`font-semibold text-sm transition-colors duration-300 ${isEnabled ? "text-slate-900" : "text-slate-600"}`}>
                            {group.label}
                          </h3>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={() => toggleGroup(group.key, currentOrgId)}
                            className="data-[state=checked]:bg-indigo-600"
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{group.description}</p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {group.items.map((item) => (
                            <span
                              key={item.key}
                              className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-all duration-300 ${
                                isEnabled
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                  : "bg-white text-slate-500 border-slate-200"
                              }`}
                            >
                              {item.title}
                            </span>
                          ))}
                        </div>
                        <p className="text-[11px] mt-2.5 font-medium">
                          <span className="text-slate-500">{group.items.length} features</span>
                          <span className="mx-1.5 text-slate-300">•</span>
                          <span className={isEnabled ? "text-emerald-600" : "text-slate-400"}>
                            {isEnabled ? "✅ Visible to user" : "❌ Hidden from user"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
      
      <PlanSelectorModal 
        open={showPlanModal} 
        onClose={() => {
          setShowPlanModal(false);
          if (newOrgIdToUpgrade) {
            window.location.reload();
          }
        }} 
        currentPlanName={subscriptionPlan || "free"}
        forceOrgId={newOrgIdToUpgrade}
      />

      {/* ====== DELETE ORGANIZATION MODAL (Vercel-style Light Mode) ====== */}
      {orgToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-red-200 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-red-50/50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Delete Organization</h2>
                  <p className="text-sm text-slate-600 mt-1">This action <span className="text-red-600 font-semibold">cannot be undone</span>. Please read carefully.</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Plan Warning */}
              {orgToDelete.plan !== "free" && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <Crown className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">You have a paid plan on this business</p>
                    <p className="text-xs text-amber-800 mt-1">Deleting this organization will immediately cancel your <span className="font-bold uppercase">{orgToDelete.plan}</span> subscription. No refund will be issued for unused time.</p>
                  </div>
                </div>
              )}

              {/* Data Loss Warning */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900">You will lose access to ALL your data</p>
                  <p className="text-xs text-red-800 mt-1">All invoices, clients, inventory, employees, reports, and every other record in <span className="font-bold text-slate-900">{orgToDelete.name}</span> will be permanently deleted from our database immediately.</p>
                </div>
              </div>

              {/* Confirm by typing name */}
              <div className="space-y-2.5 pt-2">
                <p className="text-sm text-slate-700">
                  To confirm, type the organization name below:
                </p>
                <p className="text-sm font-mono font-bold text-slate-900 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 select-all">
                  {orgToDelete.name}
                </p>
                <Input
                  placeholder={`Type "${orgToDelete.name}" to confirm`}
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:ring-red-500/20 h-10"
                  autoFocus
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setOrgToDelete(null); setDeleteConfirmText(""); }}
                className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                disabled={isDeletingOrg}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteOrg}
                disabled={deleteConfirmText !== orgToDelete.name || isDeletingOrg}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isDeletingOrg ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting...</>
                ) : (
                  <><Trash2 className="h-4 w-4 mr-2" />Delete Organization</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Invite Member Status Modal (Loading / Success / Error) */}
      <Dialog 
        open={inviteModalState !== 'idle'} 
        onOpenChange={(open) => {
          if (!open && inviteModalState !== 'loading') {
            setInviteModalState('idle');
          }
        }}
      >
        <DialogContent 
          className="sm:max-w-md bg-white border border-slate-200 text-slate-900 shadow-2xl p-0 overflow-hidden rounded-2xl"
          onPointerDownOutside={(e) => {
            if (inviteModalState === 'loading') e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (inviteModalState === 'loading') e.preventDefault();
          }}
        >
          {inviteModalState === 'loading' && (
            <div className="p-8 text-center space-y-4">
              <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin" />
                <Mail className="h-7 w-7 text-emerald-600 animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-900">Inviting User...</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Please wait while we set up access and dispatch the invitation email to:
                </p>
                <div className="inline-block px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-800 mt-1">
                  {inviteModalData.email}
                </div>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full font-medium border border-amber-200">
                  ⏳ Please do not close or refresh this tab
                </span>
              </div>
            </div>
          )}

          {inviteModalState === 'success' && (
            <div className="p-6 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="h-9 w-9 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900">User Invited Successfully!</h3>
                <p className="text-xs text-slate-500">
                  The invitation and access credentials have been dispatched.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Recipient Email:</span>
                  <span className="font-semibold text-slate-900">{inviteModalData.email}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Assigned Role:</span>
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{inviteModalData.role}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">Workspace / Business:</span>
                  <span className="font-semibold text-slate-800">{inviteModalData.businessName}</span>
                </div>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-left flex items-start gap-2.5">
                <Mail className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[12px] text-emerald-900 leading-relaxed">
                  An email with a secure link to set up their password and log in to the platform has been sent to <strong>{inviteModalData.email}</strong>.
                </p>
              </div>

              <Button
                onClick={() => setInviteModalState('idle')}
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md transition-all"
              >
                Done
              </Button>
            </div>
          )}

          {inviteModalState === 'error' && (
            <div className="p-6 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-inner">
                <XCircle className="h-9 w-9 text-red-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900">Invitation Failed</h3>
                <p className="text-xs text-slate-500">
                  We were unable to complete the user invitation.
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-left text-xs text-red-800 leading-relaxed font-medium">
                {inviteModalData.errorMessage || "An unexpected error occurred. Please check the email and try again."}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setInviteModalState('idle')}
                  className="flex-1 h-10 rounded-xl border-slate-300 font-medium text-slate-700"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setInviteModalState('idle');
                    handleAddTeamMember();
                  }}
                  className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Member Modal */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-2xl p-6 rounded-2xl">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Edit Member Access</h3>
              <p className="text-xs text-slate-500">Update role & permissions for <span className="font-semibold text-slate-800">{editingMember?.email}</span></p>
            </div>

            {/* Role Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">User Role</label>
              <select
                value={editingRole}
                onChange={(e) => setEditingRole(e.target.value)}
                disabled={editingMember?.role === 'owner'}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="Staff">Staff</option>
                <option value="Manager">Manager</option>
                <option value="Accountant">Accountant</option>
                <option value="Sales Executive">Sales Executive</option>
                <option value="Admin">Admin</option>
                <option value="CA/CS">CA/CS (Chartered Accountant / Advisor)</option>
              </select>
              {editingMember?.role === 'owner' && (
                <p className="text-[11px] text-amber-600 font-medium">Business Owner role cannot be changed.</p>
              )}
            </div>
            
            {/* Permissions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Feature Permissions</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allKeys = ["settings_access", "whatsapp_access", ...DEFAULT_FEATURE_GROUPS.map(g => g.key), ...ADMIN_FEATURE_GROUPS.map(g => g.key)];
                      setEditingPermissions(Array.from(new Set(allKeys)));
                    }}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300 text-xs">|</span>
                  <button
                    type="button"
                    onClick={() => setEditingPermissions([])}
                    className="text-[10px] text-slate-500 hover:text-slate-700 font-medium"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto pr-2 grid gap-2 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
                <label className="flex items-center gap-2.5 text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={editingPermissions.includes("settings_access")}
                    onChange={() => toggleEditPermission("settings_access")}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="truncate font-medium">Settings Access</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={editingPermissions.includes("whatsapp_access")}
                    onChange={() => toggleEditPermission("whatsapp_access")}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="truncate font-medium">WhatsApp Access</span>
                </label>
                {[...DEFAULT_FEATURE_GROUPS, ...ADMIN_FEATURE_GROUPS]
                  .filter((g, idx, arr) => arr.findIndex(t => t.key === g.key) === idx)
                  .map(group => (
                    <label key={group.key} className="flex items-center gap-2.5 text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={editingPermissions.includes(group.key)}
                        onChange={() => toggleEditPermission(group.key)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="truncate font-medium">{group.label}</span>
                    </label>
                  ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setEditingMember(null)}
                disabled={isUpdatingMember}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateMember}
                disabled={isUpdatingMember}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isUpdatingMember ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


