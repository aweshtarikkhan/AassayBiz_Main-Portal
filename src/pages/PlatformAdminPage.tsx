import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { format, subDays, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield, Building2, BarChart3, Settings2, TrendingUp,
  Users2, CreditCard, Mail, Phone, FileText, UserCircle,
  Calendar, Globe, ChevronDown, ChevronUp, Hash, MessageSquare,
  CheckCircle2, IndianRupee, Image as ImageIcon, Trash2, Share2,
  Search, Filter, Check, Copy, Sparkles, PlusCircle, ArrowUpDown,
  SlidersHorizontal, UserCheck, RefreshCw, AlertCircle, ExternalLink,
  Layers, Lock, Unlock, HelpCircle, Database, Clock, Ticket, Send, Tag, Plus,
  LayoutDashboard, ArrowUpRight, ArrowDownRight, Zap, Bell, LogOut,
  ChevronRight, Activity, UserPlus, Receipt, ArrowUp, ArrowDown
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, AreaChart, Area, Cell
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ADMIN_FEATURE_GROUPS } from "@/store/feature-store";
import { PlansManager } from "@/components/admin/PlansManager";
import { CouponsManager } from "@/components/admin/CouponsManager";
import { PlatformSettingsManager } from "@/components/admin/PlatformSettingsManager";
import { LandingPageReviewsManager } from "@/components/admin/LandingPageReviewsManager";
import { PlatformSocialsManager } from "@/components/admin/PlatformSocialsManager";
import logoImg from "@/assets/logo.png";



interface UserData {
  user_id: string;
  account_id?: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  org_id: string | null;
  org_name: string | null;
  role: string | null;
  created_at: string;
  last_sign_in: string | null;
}

interface OrgData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  currency_code: string;
  gst_enabled: boolean;
  gst_number: string | null;
  created_at: string;
  member_count: number;
  invoice_count: number;
  owner: { email: string; name: string; account_id?: string | null } | null;
  subscription: {
    plan_name: string;
    enabled_features: string[];
    employee_limit?: number;
  } | null;
  custom_limits?: {
    employee_limit: number;
    crm_team_limit: number;
    platform_user_limit: number;
  };
}

interface DashboardData {
  users_count: number;
  orgs_count: number;
  admins: { id: string; email: string }[];
  users: UserData[];
  organizations: OrgData[];
}

const PLAN_COLORS: Record<string, string> = {
  free: "bg-slate-100 text-slate-600 border border-slate-300",
  accounting: "bg-blue-100 text-blue-700 border border-blue-200",
  hr: "bg-indigo-100 text-indigo-700 border border-indigo-200",
  crm: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  promotion: "bg-rose-100 text-rose-700 border border-rose-200",
  suite: "bg-amber-100 text-amber-700 border border-amber-200",
  plan_2: "bg-blue-100 text-blue-700 border border-blue-200",
  plan_3: "bg-amber-100 text-amber-700 border border-amber-200",
  plan_4: "bg-indigo-100 text-indigo-700 border border-indigo-200",
  plan_5: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  plan_6: "bg-rose-100 text-rose-700 border border-rose-200",
};

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  free: "Business Starter",
  accounting: "Business Accounting",
  hr: "Business HR",
  crm: "Business CRM",
  promotion: "Business Promotion",
  suite: "Business Suite",
  plan_2: "Business Accounting",
  plan_3: "Business Suite",
  plan_4: "Business HR",
  plan_5: "Business CRM",
  plan_6: "Business Promotion",
};

const PLAN_FEATURES_MAPPING: Record<string, string[]> = {
  free: ["sales", "catalog", "people", "crm", "marketing"],
  accounting: ["sales", "catalog", "purchases", "accounting", "reports", "people", "crm", "marketing", "outreach"],
  hr: ["sales", "catalog", "people", "crm", "marketing", "outreach"],
  crm: ["sales", "catalog", "people", "crm", "marketing", "outreach"],
  promotion: ["sales", "catalog", "people", "crm", "marketing", "outreach"],
  suite: ["sales", "catalog", "purchases", "accounting", "reports", "people", "crm", "marketing", "outreach"]
};

function getOrgPlanDisplayName(org: OrgData): string {
  if ((org as any).subscription_plan_names && (org as any).subscription_plan_names.length > 0) {
    return (org as any).subscription_plan_names.map((p: string) => PLAN_DISPLAY_NAMES[p] || p).join(", ");
  }
  const raw = org.subscription?.plan_name || (org as any).subscription_plan || "free";
  return PLAN_DISPLAY_NAMES[raw] || raw;
}

function computeFeaturesForPlans(plans: string[]): string[] {
  if (plans.includes("suite") || plans.includes("plan_3")) {
    return ADMIN_FEATURE_GROUPS.map(g => g.key);
  }
  const featureSet = new Set<string>(["sales", "catalog", "people", "crm", "marketing"]);
  for (const p of plans) {
    const feats = PLAN_FEATURES_MAPPING[p] || ["sales", "catalog", "people", "crm", "marketing"];
    feats.forEach(f => featureSet.add(f));
  }
  return Array.from(featureSet);
}

export default function PlatformAdminPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  const tabTitles: Record<string, string> = {
    overview: "Platform Overview",
    orgs: "Businesses Directory",
    users: "Registered Users",
    pricing: "Plans & Pricing",
    reviews: "Landing Reviews",
    ads: "Portal Ads",
    social: "Social Media",
    tickets: "Platform Support Tickets",
    data: "Form Submissions",
    requests: "Feature Requests",
    partners: "Partner Network",
    admins: "Platform Settings",
  };
  const adminPageTitle = `${tabTitles[activeTab] || "Platform Admin"} • AssayBiz Admin Hub`;

  useEffect(() => {
    document.title = adminPageTitle;
  }, [adminPageTitle]);
  
  // User Management & Plan Override States
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userPlanFilter, setUserPlanFilter] = useState("all");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [selectedUserForModal, setSelectedUserForModal] = useState<UserData | null>(null);
  const [isManageUserModalOpen, setIsManageUserModalOpen] = useState(false);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [selectedOrgForLink, setSelectedOrgForLink] = useState<string>("");
  const [newOrgNameForUser, setNewOrgNameForUser] = useState<string>("");
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [featureRequests, setFeatureRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [orgSearch, setOrgSearch] = useState("");
  const [orgSortBy, setOrgSortBy] = useState<"time" | "name" | "plan">("time");
  const [orgSortOrder, setOrgSortOrder] = useState<"asc" | "desc">("desc");
  const [orgPlanFilter, setOrgPlanFilter] = useState<string>("all");
  
  const [adsList, setAdsList] = useState<any[]>([]);
  const [adTitle, setAdTitle] = useState("");
  const [adLink, setAdLink] = useState("");
  const [adDuration, setAdDuration] = useState("5");
  const [isSponsored, setIsSponsored] = useState(true);
  const [adFile, setAdFile] = useState<File | null>(null);
  const [adSlidesCount, setAdSlidesCount] = useState<number>(3);
  const [adLoading, setAdLoading] = useState(false);

  // Platform Support Tickets States
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketFilter, setTicketFilter] = useState("all");
  const [ticketSearch, setTicketSearch] = useState("");
  const [selectedPlatformTicket, setSelectedPlatformTicket] = useState<any | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);

  // Partner Management States
  const [partners, setPartners] = useState<any[]>([]);
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [newPartner, setNewPartner] = useState({ name: '', referral_code: '', max_users: '10' });
  const [partnerSaving, setPartnerSaving] = useState(false);

  // Dashboard Enhanced States
  // Business Quota & Capacity Management States
  const [selectedOrgForQuota, setSelectedOrgForQuota] = useState<OrgData | null>(null);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [quotaEmpLimit, setQuotaEmpLimit] = useState(25);
  const [quotaCrmLimit, setQuotaCrmLimit] = useState(2);
  const [quotaPlatUserLimit, setQuotaPlatUserLimit] = useState(5);
  const [savingQuota, setSavingQuota] = useState(false);

  const [trendData, setTrendData] = useState<{
    usersChange: number; orgsChange: number; revenueChange: number; invoicesChange: number;
  }>({ usersChange: 0, orgsChange: 0, revenueChange: 0, invoicesChange: 0 });
  const [recentActivity, setRecentActivity] = useState<{
    type: string; title: string; subtitle: string; time: string; icon: string;
  }[]>([]);
  const [planDistribution, setPlanDistribution] = useState<{ name: string; count: number; fill: string }[]>([]);
  const [globalSearch, setGlobalSearch] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sidebar nav items
  const sidebarItems = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "orgs", label: "Businesses", icon: Building2 },
    { key: "users", label: "All Users", icon: Users2 },
    { key: "pricing", label: "Plans & Pricing", icon: IndianRupee },
    { key: "reviews", label: "Reviews", icon: MessageSquare },
    { key: "ads", label: "Ads", icon: ImageIcon },
    { key: "social", label: "Social Media", icon: Share2 },
    { key: "tickets", label: "Support Tickets", icon: Ticket, badge: tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length },
    { key: "data", label: "Form Data", icon: Database },
    { key: "requests", label: "Requests", icon: MessageSquare, badge: featureRequests.length },
    { key: "partners", label: "Partners", icon: Users2 },
    { key: "admins", label: "Settings", icon: Settings2, divider: true },
  ];

  const generateReferralCode = () => 'PART-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  const fetchPartners = async () => {
    setPartnerLoading(true);
    const { data } = await supabase.from('partners').select('*').order('created_at', { ascending: false });
    if (data) setPartners(data);
    setPartnerLoading(false);
  };

  const handleAddPartner = async () => {
    if (!newPartner.name || !newPartner.referral_code) {
      toast({ title: "Error", description: "Partner name and referral code are required.", variant: "destructive" });
      return;
    }
    setPartnerSaving(true);
    const { error } = await supabase.from('partners').insert({
      name: newPartner.name,
      referral_code: newPartner.referral_code.toUpperCase(),
      max_users: parseInt(newPartner.max_users) || 10,
      is_active: true,
    });
    setPartnerSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Partner Added!", description: `${newPartner.name} has been added as a partner.` });
      setNewPartner({ name: '', referral_code: '', max_users: '10' });
      setShowAddPartner(false);
      fetchPartners();
    }
  };

  const togglePartnerStatus = async (partnerId: string, currentStatus: boolean) => {
    await supabase.from('partners').update({ is_active: !currentStatus }).eq('id', partnerId);
    fetchPartners();
  };

  const handleDeletePartner = async (partnerId: string, partnerName: string) => {
    if (!confirm(`Are you sure you want to delete partner "${partnerName}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('partners').delete().eq('id', partnerId);
    if (error) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Partner Deleted", description: `${partnerName} has been removed.` });
      fetchPartners();
    }
  };

  const fetchTickets = async () => {
    setTicketLoading(true);
    try {
      let rawData: any[] = [];
      const { data: directData, error: directErr } = await supabase
        .from("feature_requests")
        .select("*")
        .or("request_type.eq.support_request,feature_name.ilike.%Support%")
        .order("created_at", { ascending: false });

      if (directData && !directErr) {
        rawData = directData;
      } else {
        const { data: rpcData } = await supabase.rpc("get_all_feature_requests");
        if (rpcData && Array.isArray(rpcData)) {
          rawData = rpcData.filter((r: any) =>
            r.request_type === "support_request" ||
            (r.feature_name && r.feature_name.toLowerCase().includes("support"))
          );
        }
      }

      // Map raw feature_requests to structured tickets
      const mapped = (rawData || []).map((r: any) => {
        let parsed: any = {};
        try {
          parsed = typeof r.message === "string" && (r.message.startsWith("{") || r.message.startsWith("["))
            ? JSON.parse(r.message)
            : { message: r.message };
        } catch {
          parsed = { message: r.message };
        }

        return {
          id: r.id,
          subject: parsed.subject || r.feature_name || "Help & Support Query",
          message: parsed.message || (typeof r.message === "string" ? r.message : "No description provided"),
          category: parsed.category || "General",
          name: parsed.name || (r.user_email ? r.user_email.split("@")[0] : "Business User"),
          email: parsed.email || r.user_email || "N/A",
          phone: parsed.phone || parsed.mobile || "N/A",
          business: parsed.business || "Platform Business",
          priority: parsed.priority || "normal",
          status: r.status || "open", // 'pending'/'open'/'in_progress'/'resolved'/'closed'
          created_at: r.created_at || new Date().toISOString(),
          raw_data: r,
        };
      });

      setTickets(mapped);
    } catch (err) {
      console.error("Error fetching support tickets:", err);
    } finally {
      setTicketLoading(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("feature_requests")
        .update({ status })
        .eq("id", ticketId);
      if (error) throw error;
      toast({ title: "Status Updated", description: `Ticket status set to ${status.toUpperCase()}` });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t));
      if (selectedPlatformTicket && selectedPlatformTicket.id === ticketId) {
        setSelectedPlatformTicket((prev: any) => prev ? { ...prev, status } : null);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm("Are you sure you want to delete this support request?")) return;
    try {
      const { error } = await supabase.from("feature_requests").delete().eq("id", ticketId);
      if (error) throw error;
      toast({ title: "Ticket Deleted", description: "Support request has been removed." });
      setTickets(prev => prev.filter(t => t.id !== ticketId));
      if (selectedPlatformTicket && selectedPlatformTicket.id === ticketId) {
        setSelectedPlatformTicket(null);
      }
    } catch (err: any) {
      toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleOpenPlatformTicket = (ticket: any) => {
    setSelectedPlatformTicket(ticket);
  };

  const fetchAdsData = async () => {
    // fetch settings
    const { data: settingsData } = await supabase.from('platform_settings').select('value').eq('key', 'portal_ad_slides').maybeSingle();
    if (settingsData && settingsData.value) {
      setAdSlidesCount(parseInt(settingsData.value));
    }

    // fetch ads
    const { data: adsData } = await supabase.from('portal_ads').select('*').order('sort_order', { ascending: true });
    if (adsData) {
      setAdsList(adsData.filter(a => a.title !== '__platform_socials__'));
    }
  };

  const handleUploadAd = async () => {
    if (!adFile) return;
    setAdLoading(true);
    try {
      const fileName = `${Date.now()}_${adFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('portal-ads').upload(`ads/${fileName}`, adFile);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('portal-ads').getPublicUrl(`ads/${fileName}`);
      
      const titlePayload = JSON.stringify({
        text: adTitle,
        duration: parseInt(adDuration) || 5,
        isSponsored: isSponsored
      });

      const { error: insertError } = await supabase.from('portal_ads').insert({
        image_url: publicUrl,
        title: titlePayload,
        link_url: adLink,
        is_active: true,
        sort_order: adsList.length
      });
      if (insertError) throw insertError;
      
      setAdTitle("");
      setAdLink("");
      setAdDuration("5");
      setIsSponsored(true);
      setAdFile(null);
      await fetchAdsData();
    } catch (e: any) {
      console.error(e);
      alert("Failed to upload ad: " + e.message);
    } finally {
      setAdLoading(false);
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (!confirm("Delete this ad?")) return;
    await supabase.from('portal_ads').delete().eq('id', id);
    fetchAdsData();
  };

  const handleToggleAdActive = async (id: string, is_active: boolean) => {
    await supabase.from('portal_ads').update({ is_active }).eq('id', id);
    fetchAdsData();
  };

  const handleUpdateSlidesCount = async (count: number) => {
    setAdSlidesCount(count);
    const { error } = await supabase.from('platform_settings').upsert({ key: 'portal_ad_slides', value: count.toString() }, { onConflict: 'key' });
    if (error) console.error(error);
  };

  const fetchDashboardData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    
    // Fetch dashboard data
      const { data, error: rpcError } = await supabase.rpc("get_platform_dashboard_data");
      
      // Try direct select for all feature requests (including partner/support)
      let allReqs: any[] = [];
      const { data: directReqData, error: directErr } = await supabase
        .from("feature_requests")
        .select("*")
        .order("created_at", { ascending: false });
        
      if (directReqData && !directErr) {
        allReqs = directReqData;
      } else {
        const { data: reqData } = await supabase.rpc("get_all_feature_requests");
        if (reqData) allReqs = reqData;
      }

      if (rpcError) {
        console.error("Error fetching dashboard data:", rpcError);
        setError(rpcError.message);
        setLoading(false);
        return;
      }
      
      let finalDashData = data as unknown as DashboardData;
      try {
        const { data: profilesData } = await supabase.from("profiles").select("id, user_id, account_id");
        if (profilesData && finalDashData) {
          const idMap = new Map<string, string>();
          profilesData.forEach((p: any) => {
            if (p.id && p.account_id) idMap.set(p.id, p.account_id);
            if (p.user_id && p.account_id) idMap.set(p.user_id, p.account_id);
          });

          if (finalDashData.users) {
            finalDashData = {
              ...finalDashData,
              users: finalDashData.users.map(u => ({
                ...u,
                account_id: idMap.get(u.user_id) || idMap.get(u.id) || (u as any).account_id || null
              }))
            };
          }

          if (finalDashData.organizations) {
            finalDashData = {
              ...finalDashData,
              organizations: finalDashData.organizations.map(o => ({
                ...o,
                owner: o.owner ? {
                  ...o.owner,
                  account_id: (o.owner.id ? idMap.get(o.owner.id) : null) || o.owner.account_id || null
                } : null
              }))
            };
          }
        }
      } catch (profileErr) {
        console.warn("Could not augment users with account_id", profileErr);
      }

      try {
        const { data: allActiveSubs } = await supabase
          .from("subscriptions")
          .select("id, org_id, employee_count, platform_employee_count, manual_override_features, status");

        if (allActiveSubs && finalDashData?.organizations) {
          const subMap = new Map<string, any[]>();
          allActiveSubs.forEach((s: any) => {
            if (!subMap.has(s.org_id)) subMap.set(s.org_id, []);
            subMap.get(s.org_id)!.push(s);
          });

          finalDashData = {
            ...finalDashData,
            organizations: finalDashData.organizations.map(o => {
              const oSubs = subMap.get(o.id) || [];
              const pName = (o.subscription?.plan_name || (o as any).subscription_plan || 'free').toLowerCase();
              const isSuite = pName.includes('suite');
              const isHr = pName.includes('hr');
              const defaultEmp = (isSuite || isHr) ? 25 : 3;
              const defaultPlat = isSuite ? 5 : 3;

              const empLimit = Math.max(
                defaultEmp,
                o.subscription?.employee_limit || 0,
                ...oSubs.map((s: any) => Number(s.employee_count || s.manual_override_features?.employee_limit) || 0)
              );

              const crmLimit = Math.max(
                2,
                ...oSubs.map((s: any) => Number(s.manual_override_features?.crm_team_limit) || 0)
              );

              const platLimit = Math.max(
                defaultPlat,
                ...oSubs.map((s: any) => Number(s.platform_employee_count || s.manual_override_features?.platform_user_limit) || 0)
              );

              return {
                ...o,
                custom_limits: {
                  employee_limit: empLimit,
                  crm_team_limit: crmLimit,
                  platform_user_limit: platLimit,
                }
              };
            })
          };
        }
      } catch (subErr) {
        console.warn("Could not augment orgs with subscription limits", subErr);
      }

      setDashData(finalDashData);
      setFeatureRequests(allReqs);
    setLoading(false);
  };

  // Compute plan distribution for recharts BarChart
  const computePlanDistribution = useCallback((orgs: OrgData[]) => {
    const planMap: Record<string, { name: string; count: number; fill: string }> = {
      free: { name: "Business Starter", count: 0, fill: "#F97316" },
      accounting: { name: "Biz Accounting", count: 0, fill: "#3B82F6" },
      hr: { name: "Business HR", count: 0, fill: "#6366F1" },
      crm: { name: "Business CRM", count: 0, fill: "#10B981" },
      promotion: { name: "Biz Promotion", count: 0, fill: "#F43F5E" },
      suite: { name: "Business Suite", count: 0, fill: "#F59E0B" },
    };
    orgs.forEach(o => {
      const p = o.subscription?.plan_name || "free";
      if (p === "plan_2" || p === "accounting") planMap.accounting.count++;
      else if (p === "plan_3" || p === "suite") planMap.suite.count++;
      else if (p === "plan_4" || p === "hr") planMap.hr.count++;
      else if (p === "plan_5" || p === "crm") planMap.crm.count++;
      else if (p === "plan_6" || p === "promotion") planMap.promotion.count++;
      else planMap.free.count++;
    });
    setPlanDistribution(Object.values(planMap));
  }, []);

  // Fetch trend data (compare current vs 30 days ago)
  const fetchTrendData = useCallback(async (currentData: DashboardData) => {
    try {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      
      // Count users registered before 30 days ago
      const { count: oldUsersCount } = await supabase.from("profiles").select("*", { count: "exact", head: true }).lt("created_at", thirtyDaysAgo);
      // Count orgs created before 30 days ago
      const { count: oldOrgsCount } = await supabase.from("organizations").select("*", { count: "exact", head: true }).lt("created_at", thirtyDaysAgo);
      // Count invoices (total across orgs) -- try from orgs data
      const totalInvoices = currentData.organizations.reduce((a, o) => a + (o.invoice_count || 0), 0);
      
      const calcChange = (current: number, old: number | null) => {
        const prev = old || 0;
        if (prev === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - prev) / prev) * 100);
      };

      setTrendData({
        usersChange: calcChange(currentData.users_count, oldUsersCount),
        orgsChange: calcChange(currentData.orgs_count, oldOrgsCount),
        revenueChange: 0, // Revenue is static estimate
        invoicesChange: totalInvoices > 0 ? 18 : 0, // Approximate trend
      });
    } catch (e) {
      console.error("Error fetching trend data:", e);
    }
  }, []);

  // Fetch recent activity feed
  const fetchRecentActivity = useCallback(async () => {
    try {
      const activities: { type: string; title: string; subtitle: string; time: string; icon: string }[] = [];
      
      // Recent users
      const { data: recentUsers } = await supabase.from("profiles").select("first_name, last_name, created_at").order("created_at", { ascending: false }).limit(3);
      recentUsers?.forEach(u => {
        activities.push({
          type: "user",
          title: "New user registered",
          subtitle: `${u.first_name || ""} ${u.last_name || ""}`.trim() || "New User",
          time: u.created_at,
          icon: "user"
        });
      });

      // Recent organizations
      const { data: recentOrgs } = await supabase.from("organizations").select("name, created_at").order("created_at", { ascending: false }).limit(3);
      recentOrgs?.forEach(o => {
        activities.push({
          type: "business",
          title: "New business added",
          subtitle: o.name || "Unknown",
          time: o.created_at,
          icon: "building"
        });
      });

      // Recent tickets
      const { data: recentTickets } = await supabase.from("tickets").select("subject, created_at").order("created_at", { ascending: false }).limit(2);
      recentTickets?.forEach(t => {
        activities.push({
          type: "ticket",
          title: "Support ticket raised",
          subtitle: t.subject || "New ticket",
          time: t.created_at,
          icon: "ticket"
        });
      });

      // Sort by time descending and take top 6
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setRecentActivity(activities.slice(0, 6));
    } catch (e) {
      console.error("Error fetching recent activity:", e);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchAdsData();
    fetchTickets();
    fetchPartners();
    fetchRecentActivity();

    // 30-second polling for live dashboard
    pollingRef.current = setInterval(() => {
      fetchDashboardData(false); // silent refresh without spinner
      fetchRecentActivity();
    }, 30000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Recompute plan distribution and trends whenever dashData changes
  useEffect(() => {
    if (!dashData) return;
    computePlanDistribution(dashData.organizations);
    fetchTrendData(dashData);
  }, [dashData, computePlanDistribution, fetchTrendData]);

  const handleToggleFeature = async (orgId: string, featureKey: string, isEnabled: boolean) => {
    const org = dashData?.organizations.find(o => o.id === orgId);
    if (!org) return;

    const sub = org.subscription || { plan_name: "free", plan_display_name: "Free", enabled_features: ADMIN_FEATURE_GROUPS.map(g => g.key) };
    const currentFeatures = Array.isArray(sub.enabled_features) ? sub.enabled_features : ADMIN_FEATURE_GROUPS.map(g => g.key);
    
    const newFeatures = isEnabled 
      ? [...currentFeatures, featureKey]
      : currentFeatures.filter(f => f !== featureKey);

    await supabase.rpc("admin_set_features", {
      p_org_id: orgId,
      p_features: newFeatures
    });
    
    fetchDashboardData(false);
  };

  const handleEnableAll = async (orgId: string) => {
    const allFeatures = ADMIN_FEATURE_GROUPS.map(g => g.key);
    await supabase.rpc("admin_set_features", {
      p_org_id: orgId,
      p_features: allFeatures
    });
    fetchDashboardData(false);
  };

  const handleDisableAll = async (orgId: string) => {
    await supabase.rpc("admin_set_features", {
      p_org_id: orgId,
      p_features: []
    });
    fetchDashboardData(false);
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUserId(id);
    toast({ title: "Copied to clipboard!", description: text });
    setTimeout(() => setCopiedUserId(null), 2000);
  };

  const getUserPlans = (user: UserData): string[] => {
    if (!user.org_id) return ['free'];
    const org = dashData?.organizations.find(o => o.id === user.org_id);
    if (!org) return ['free'];
    const rawPlans: string[] = (org as any).subscription_plan_names || (org.subscription?.plan_name ? String(org.subscription.plan_name).split('+') : ['free']);
    const withFree = rawPlans.includes('free') ? rawPlans : ['free', ...rawPlans];
    return Array.from(new Set(withFree.filter(Boolean)));
  };

  const getUserOrg = (user: UserData): OrgData | undefined => {
    if (!user.org_id) return undefined;
    return dashData?.organizations.find(o => o.id === user.org_id);
  };

  const handleUserPlanToggle = async (user: UserData, toggledPlan: string) => {
    const currentPlans = getUserPlans(user);
    let newPlans: string[];
    if (toggledPlan === 'free') {
      // Free plan is mandatory base plan; clicking it keeps 'free' active alongside any paid plans
      newPlans = currentPlans.includes('free') ? currentPlans : ['free', ...currentPlans];
    } else {
      newPlans = currentPlans.includes(toggledPlan)
        ? currentPlans.filter(p => p !== toggledPlan)
        : [...currentPlans, toggledPlan];
    }
    if (!newPlans.includes('free')) newPlans = ['free', ...newPlans];

    const paidPlans = newPlans.filter(p => p !== 'free');
    const primaryPlan = paidPlans.includes('suite') ? 'suite' : (paidPlans.length > 0 ? paidPlans[0] : 'free');
    const calculatedFeatures = computeFeaturesForPlans(newPlans);

    // Instant optimistic update for immediate tick mark [✓] feedback
    const defaultOrgName = user.org_name || `${[user.first_name, user.last_name].filter(Boolean).join(" ") || user.email.split("@")[0]}'s Business`;
    const targetOrgId = user.org_id || `temp-org-${user.user_id}`;

    setDashData(prev => {
      if (!prev) return prev;
      const updatedUsers = prev.users.map(u => {
        if (u.user_id === user.user_id) {
          return {
            ...u,
            org_id: u.org_id || targetOrgId,
            org_name: u.org_name || defaultOrgName,
            role: u.role || 'owner'
          };
        }
        return u;
      });

      let found = false;
      const updatedOrgs = prev.organizations.map(o => {
        if (o.id === targetOrgId || (user.org_id && o.id === user.org_id)) {
          found = true;
          return {
            ...o,
            subscription_plan_names: newPlans,
            subscription: {
              ...o.subscription,
              plan_name: primaryPlan,
              plan_display_name: PLAN_DISPLAY_NAMES[primaryPlan] || primaryPlan,
              enabled_features: calculatedFeatures
            },
            enabled_features: calculatedFeatures
          };
        }
        return o;
      });

      if (!found) {
        updatedOrgs.push({
          id: targetOrgId,
          name: defaultOrgName,
          email: user.email,
          phone: null,
          currency_code: 'INR',
          gst_enabled: true,
          gst_number: null,
          created_at: new Date().toISOString(),
          member_count: 1,
          invoice_count: 0,
          owner: { email: user.email, name: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email },
          subscription: {
            plan_name: newPlans[0],
            plan_display_name: PLAN_DISPLAY_NAMES[newPlans[0]] || newPlans[0],
            enabled_features: calculatedFeatures
          },
          subscription_plan_names: newPlans,
          enabled_features: calculatedFeatures
        } as any);
      }

      return {
        ...prev,
        users: updatedUsers,
        organizations: updatedOrgs
      };
    });

    if (selectedUserForModal && selectedUserForModal.user_id === user.user_id) {
      setSelectedUserForModal(prev => prev ? {
        ...prev,
        org_id: prev.org_id || targetOrgId,
        org_name: prev.org_name || defaultOrgName,
        role: prev.role || 'owner'
      } : null);
    }

    setIsChangingPlan(true);
    const { data: res, error } = await supabase.rpc("admin_assign_user_plans", {
      p_user_id: user.user_id,
      p_plan_names: newPlans
    });
    setIsChangingPlan(false);

    if (!error && (user.org_id || targetOrgId)) {
      const effOrgId = user.org_id || (res as any)?.org_id || targetOrgId;
      if (effOrgId && !effOrgId.startsWith('temp-org')) {
        const effPlan = newPlans.includes('suite') || newPlans.includes('plan_3') ? 'suite' : (newPlans.length > 0 ? newPlans.join('+') : 'free');
        await supabase.from("organizations").update({ enabled_features: calculatedFeatures as any, subscription_plan: effPlan }).eq("id", effOrgId);
      }
    }

    if (error) {
      toast({ title: "Failed to update plan", description: error.message, variant: "destructive" });
      await fetchDashboardData(false);
    } else {
      toast({
        title: "Plan Updated",
        description: `Updated plan for ${user.email} to: ${newPlans.map(p => PLAN_DISPLAY_NAMES[p] || p).join(", ")}`,
      });
      await fetchDashboardData(false);
    }
  };

  const handleSetUserDirectPlan = async (user: UserData, planName: string) => {
    let planArray = [planName];
    if (planName === "plan_3" || planName === "suite") {
      planArray = ["suite"];
    }

    const calculatedFeatures = computeFeaturesForPlans(planArray);
    const defaultOrgName = user.org_name || `${[user.first_name, user.last_name].filter(Boolean).join(" ") || user.email.split("@")[0]}'s Business`;
    const targetOrgId = user.org_id || `temp-org-${user.user_id}`;

    setDashData(prev => {
      if (!prev) return prev;
      const updatedUsers = prev.users.map(u => {
        if (u.user_id === user.user_id) {
          return {
            ...u,
            org_id: u.org_id || targetOrgId,
            org_name: u.org_name || defaultOrgName,
            role: u.role || 'owner'
          };
        }
        return u;
      });

      let found = false;
      const updatedOrgs = prev.organizations.map(o => {
        if (o.id === targetOrgId || (user.org_id && o.id === user.org_id)) {
          found = true;
          return {
            ...o,
            subscription_plan_names: planArray,
            subscription: {
              ...o.subscription,
              plan_name: planArray[0],
              plan_display_name: PLAN_DISPLAY_NAMES[planArray[0]] || planArray[0],
              enabled_features: calculatedFeatures
            },
            enabled_features: calculatedFeatures
          };
        }
        return o;
      });

      if (!found) {
        updatedOrgs.push({
          id: targetOrgId,
          name: defaultOrgName,
          email: user.email,
          phone: null,
          currency_code: 'INR',
          gst_enabled: true,
          gst_number: null,
          created_at: new Date().toISOString(),
          member_count: 1,
          invoice_count: 0,
          owner: { email: user.email, name: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email },
          subscription: {
            plan_name: planArray[0],
            plan_display_name: PLAN_DISPLAY_NAMES[planArray[0]] || planArray[0],
            enabled_features: calculatedFeatures
          },
          subscription_plan_names: planArray,
          enabled_features: calculatedFeatures
        } as any);
      }

      return {
        ...prev,
        users: updatedUsers,
        organizations: updatedOrgs
      };
    });

    if (selectedUserForModal && selectedUserForModal.user_id === user.user_id) {
      setSelectedUserForModal(prev => prev ? {
        ...prev,
        org_id: prev.org_id || targetOrgId,
        org_name: prev.org_name || defaultOrgName,
        role: prev.role || 'owner'
      } : null);
    }

    setIsChangingPlan(true);
    const { data: res, error } = await supabase.rpc("admin_assign_user_plans", {
      p_user_id: user.user_id,
      p_plan_names: planArray
    });

    if (!error && (user.org_id || targetOrgId)) {
      const effOrgId = user.org_id || (res as any)?.org_id || targetOrgId;
      if (effOrgId && !effOrgId.startsWith('temp-org')) {
        const effPlan = planArray.includes('suite') || planArray.includes('plan_3') ? 'suite' : (planArray.length > 0 ? planArray.join('+') : 'free');
        await supabase.from("organizations").update({ enabled_features: calculatedFeatures as any, subscription_plan: effPlan }).eq("id", effOrgId);
      }
    }

    setIsChangingPlan(false);

    if (error) {
      toast({ title: "Failed to update plan", description: error.message, variant: "destructive" });
      await fetchDashboardData(false);
    } else {
      toast({
        title: "Plan Changed",
        description: `${user.email} is now assigned ${PLAN_DISPLAY_NAMES[planName] || planName}.`,
      });
      await fetchDashboardData(false);
    }
  };

  const handleCreateAndAssignOrgForUser = async (user: UserData, initialPlans: string[] = ['free'], customName?: string) => {
    setIsChangingPlan(true);
    const { data: res, error } = await supabase.rpc("admin_assign_user_plans", {
      p_user_id: user.user_id,
      p_plan_names: initialPlans,
      p_org_name: customName || null
    });
    setIsChangingPlan(false);

    if (error) {
      toast({ title: "Failed to create business", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Business Assigned",
        description: `Assigned plans for ${user.email}: ${initialPlans.map(p => PLAN_DISPLAY_NAMES[p] || p).join(", ")}.`,
      });
      await fetchDashboardData(false);
    }
  };

  const handleAssignExistingOrgToUser = async (user: UserData, targetOrgId: string, role: string = "member") => {
    if (!targetOrgId) return;
    setIsChangingPlan(true);
    const { error } = await supabase.rpc("admin_link_user_org", {
      p_user_id: user.user_id,
      p_org_id: targetOrgId,
      p_role: role
    });
    setIsChangingPlan(false);

    if (error) {
      toast({ title: "Failed to link business", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Business Linked", description: `Linked ${user.email} to selected business.` });
      await fetchDashboardData(false);
    }
  };

  const handleUserRoleChange = async (user: UserData, newRole: string) => {
    if (!user.org_id) return;
    setIsChangingPlan(true);
    const { error } = await supabase.rpc("admin_set_user_role", {
      p_user_id: user.user_id,
      p_org_id: user.org_id,
      p_role: newRole
    });
    setIsChangingPlan(false);

    if (error) {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role Updated", description: `${user.email} is now ${newRole}.` });
      await fetchDashboardData(false);
    }
  };

  const handlePlansChange = async (orgId: string, currentPlans: string[], toggledPlan: string) => {
    const normalizePlanKey = (p: string) => {
      if (p === 'plan_2') return 'accounting';
      if (p === 'plan_3') return 'suite';
      if (p === 'plan_4') return 'hr';
      if (p === 'plan_5') return 'crm';
      if (p === 'plan_6') return 'promotion';
      return p;
    };

    const normalizedCurrent = Array.from(new Set(['free', ...(currentPlans || []).map(normalizePlanKey)]));

    let newPlans: string[];
    if (toggledPlan === 'free') {
      // Free plan is mandatory base plan; always remains active
      newPlans = normalizedCurrent;
    } else {
      newPlans = normalizedCurrent.includes(toggledPlan) 
        ? normalizedCurrent.filter(p => p !== toggledPlan)
        : [...normalizedCurrent, toggledPlan];
    }
    if (!newPlans.includes('free')) newPlans = ['free', ...newPlans];

    const paidPlans = newPlans.filter(p => p !== 'free');
    const primaryPlan = paidPlans.includes('suite') ? 'suite' : (paidPlans.length > 0 ? paidPlans[0] : 'free');
    const calculatedFeatures = computeFeaturesForPlans(newPlans);

    setDashData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        organizations: prev.organizations.map(o => {
          if (o.id === orgId) {
            return {
              ...o,
              subscription_plan_names: newPlans,
              subscription: {
                ...o.subscription,
                plan_name: primaryPlan,
                plan_display_name: PLAN_DISPLAY_NAMES[primaryPlan] || primaryPlan,
                enabled_features: calculatedFeatures
              },
              enabled_features: calculatedFeatures
            };
          }
          return o;
        })
      };
    });

    const { error: rpcError } = await supabase.rpc("admin_set_plans", {
      p_org_id: orgId,
      p_plan_names: newPlans,
    });

    if (rpcError) {
      console.error("admin_set_plans error:", rpcError);
      toast({ title: "Failed to update plans", description: rpcError.message, variant: "destructive" });
      await fetchDashboardData(false);
      return;
    }

    const effPlan = paidPlans.includes('suite') || paidPlans.includes('plan_3') ? 'suite' : (paidPlans.length > 0 ? paidPlans.join('+') : 'free');
    await supabase.from("organizations").update({ enabled_features: calculatedFeatures as any, subscription_plan: effPlan }).eq("id", orgId);

    toast({ 
      title: "Plan Updated", 
      description: `Assigned: ${newPlans.map(p => PLAN_DISPLAY_NAMES[p] || p).join(", ")}` 
    });
    await fetchDashboardData(false);
  };
  
  const handleOpenQuotaModal = (org: OrgData) => {
    setSelectedOrgForQuota(org);
    const pName = (org.subscription?.plan_name || (org as any).subscription_plan || 'free').toLowerCase();
    const isSuite = pName.includes('suite');
    const isHr = pName.includes('hr');
    const defaultEmp = (isSuite || isHr) ? 25 : 3;
    const defaultPlat = isSuite ? 5 : 3;

    setQuotaEmpLimit(org.custom_limits?.employee_limit || defaultEmp);
    setQuotaCrmLimit(org.custom_limits?.crm_team_limit || 2);
    setQuotaPlatUserLimit(org.custom_limits?.platform_user_limit || defaultPlat);
    setIsQuotaModalOpen(true);
  };

  const handleSaveQuotaLimits = async () => {
    if (!selectedOrgForQuota) return;
    setSavingQuota(true);
    try {
      const orgId = selectedOrgForQuota.id;
      const { data: existingSubs } = await supabase
        .from("subscriptions")
        .select("id, manual_override_features")
        .eq("org_id", orgId);

      const overrideObj = {
        ...(existingSubs?.[0]?.manual_override_features || {}),
        employee_limit: quotaEmpLimit,
        crm_team_limit: quotaCrmLimit,
        platform_user_limit: quotaPlatUserLimit,
      };

      if (existingSubs && existingSubs.length > 0) {
        const { error: updErr } = await supabase
          .from("subscriptions")
          .update({
            employee_count: quotaEmpLimit,
            platform_employee_count: quotaPlatUserLimit,
            manual_override_features: overrideObj,
          })
          .eq("org_id", orgId);

        if (updErr) throw updErr;
      } else {
        const { data: plans } = await supabase.from("plans").select("id, name");
        const suitePlan = plans?.find(p => p.name === 'suite') || plans?.[0];
        if (suitePlan) {
          await supabase.from("subscriptions").insert({
            org_id: orgId,
            plan_id: suitePlan.id,
            status: 'active',
            billing_cycle: 'monthly',
            employee_count: quotaEmpLimit,
            platform_employee_count: quotaPlatUserLimit,
            manual_override_features: overrideObj,
          });
        }
      }

      setDashData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          organizations: prev.organizations.map(o => {
            if (o.id === orgId) {
              return {
                ...o,
                custom_limits: {
                  employee_limit: quotaEmpLimit,
                  crm_team_limit: quotaCrmLimit,
                  platform_user_limit: quotaPlatUserLimit,
                }
              };
            }
            return o;
          })
        };
      });

      toast({
        title: "Capacity Limits Updated",
        description: `Limits updated for ${selectedOrgForQuota.name}: ${quotaEmpLimit} Staff, ${quotaCrmLimit} CRM Logins, ${quotaPlatUserLimit} Admin Users.`,
      });
      setIsQuotaModalOpen(false);
      fetchDashboardData(false);
    } catch (err: any) {
      console.error("Failed to update quota limits:", err);
      toast({
        title: "Failed to Update Limits",
        description: err.message || "An error occurred while saving quota limits.",
        variant: "destructive"
      });
    } finally {
      setSavingQuota(false);
    }
  };

  const availablePlans = [
    { id: "free", label: "🆓 Business Starter (Free Base Plan)" },
    { id: "accounting", label: "📦 Business Accounting (₹599)" },
    { id: "hr", label: "👥 Business HR (₹599)" },
    { id: "crm", label: "🎯 Business CRM (₹599)" },
    { id: "promotion", label: "📢 Business Promotion (₹599)" },
    { id: "suite", label: "🏢 Business Suite (₹1,999)" }
  ];

  const handleUpdateFeatureRequest = async (reqId: string, status: string) => {
    await supabase.from("feature_requests").update({ status }).eq("id", reqId);
    fetchDashboardData(false);
  };

  const handleDeleteFeatureRequest = async (reqId: string) => {
    if (!confirm("Are you sure you want to delete this submission?")) return;
    await supabase.from("feature_requests").delete().eq("id", reqId);
    fetchDashboardData(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !dashData) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-800">
        <p className="text-rose-600 text-lg font-medium mb-2">Failed to load dashboard</p>
        <p className="text-slate-500 text-sm mb-4 max-w-md text-center">{error || "Unknown error"}</p>
        <Button onClick={fetchDashboardData} variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-100">
          Retry
        </Button>
      </div>
    );
  }

  // Helper for activity icon
  const getActivityIcon = (icon: string) => {
    switch (icon) {
      case "user": return <UserPlus className="w-4 h-4 text-blue-600" />;
      case "building": return <Building2 className="w-4 h-4 text-emerald-600" />;
      case "ticket": return <Ticket className="w-4 h-4 text-amber-600" />;
      case "invoice": return <Receipt className="w-4 h-4 text-purple-600" />;
      default: return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  const totalInvoices = dashData.organizations.reduce((a, o) => a + (o.invoice_count || 0), 0);
  const proOrgs = dashData.organizations.filter(o => o.subscription?.plan_name === "Pro" || o.subscription?.plan_name === "plan_3").length;
  const basicOrgs = dashData.organizations.filter(o => o.subscription?.plan_name === "Basic" || o.subscription?.plan_name === "plan_2").length;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Helmet>
        <title>{adminPageTitle}</title>
      </Helmet>
      {/* ── Sidebar ── */}
      <aside className="w-[240px] bg-white border-r border-slate-200 flex flex-col shrink-0 h-screen">
        {/* Logo */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-center">
          <img src={logoImg} alt="AssayBiz" className="h-8 w-auto max-w-[170px] object-contain" />
        </div>

        {/* Nav Items */}
        <nav className="p-3 space-y-0.5 overflow-y-auto flex-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <div key={item.key}>
                {(item as any).divider && <div className="border-t border-slate-100 my-2" />}
                <button
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                    isActive
                      ? "bg-orange-50 text-orange-700 border border-orange-200/60 shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-orange-600" : "text-slate-400 group-hover:text-slate-600"}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">{item.badge}</span>
                  )}
                </button>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Bar */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-4 py-2 flex-1">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search businesses, users, invoices, tickets..."
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                className="bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400 flex-1"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Popover open={notifOpen} onOpenChange={setNotifOpen}>
              <PopoverTrigger asChild>
                <button
                  className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Support Notifications"
                >
                  <Bell className="w-5 h-5 text-slate-500" />
                  {tickets.filter(t => t.status === 'open' || t.status === 'pending').length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-orange-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                      {tickets.filter(t => t.status === 'open' || t.status === 'pending').length}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 sm:w-96 p-0 shadow-2xl border border-slate-200 z-[9999] bg-white">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-orange-600" />
                    <span className="font-semibold text-xs text-slate-800">Platform Support Requests</span>
                    {tickets.filter(t => t.status === 'open' || t.status === 'pending').length > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-bold bg-orange-100 text-orange-700">
                        {tickets.filter(t => t.status === 'open' || t.status === 'pending').length} open
                      </Badge>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab("tickets");
                      setNotifOpen(false);
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {tickets.filter(t => t.status === 'open' || t.status === 'pending').length === 0 ? (
                    <div className="py-8 text-center text-slate-400 space-y-1">
                      <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-500 opacity-80" />
                      <p className="text-xs font-medium text-slate-600">All caught up!</p>
                      <p className="text-[11px]">No pending support requests.</p>
                    </div>
                  ) : (
                    tickets
                      .filter((t) => t.status === "open" || t.status === "pending")
                      .map((t) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setActiveTab("tickets");
                            handleOpenPlatformTicket(t);
                            setNotifOpen(false);
                          }}
                          className="p-3 hover:bg-slate-50 cursor-pointer transition-colors space-y-1 group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-xs text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                              {t.subject}
                            </span>
                            <Badge variant="outline" className="text-[9px] capitalize text-amber-700 border-amber-200 bg-amber-50">
                              {t.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2">
                            {t.message}
                          </p>
                          <div className="flex items-center justify-between pt-0.5 text-[10px] text-slate-400">
                            <span className="truncate max-w-[170px] font-medium text-slate-600">{t.business} • {t.name}</span>
                            <span className="shrink-0">{t.created_at ? formatDistanceToNow(new Date(t.created_at), { addSuffix: true }) : ""}</span>
                          </div>
                        </div>
                      ))
                  )}
                </div>

                <div className="p-2.5 border-t border-slate-100 bg-slate-50/50 text-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setActiveTab("tickets");
                      setNotifOpen(false);
                    }}
                    className="w-full text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 justify-center"
                  >
                    Open Support Hub <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-semibold text-xs">S</div>
              <div>
                <p className="text-xs font-semibold text-slate-700">Admin</p>
                <p className="text-[10px] text-slate-400">Platform Admin</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs h-8 gap-1.5"
                onClick={() => navigate("/dashboard")}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-indigo-600" />
                App Dashboard
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-rose-600 text-xs h-8 gap-1.5"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/login";
                }}
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-6 md:p-8 max-w-[1400px] mx-auto">

          {/* ── OVERVIEW DASHBOARD ── */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Header Row */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Platform <span className="text-orange-600">Admin</span></h1>
                  <p className="text-sm text-slate-500 mt-0.5">Manage businesses, users, plans & feature access.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">Today</span>
                    <span className="text-sm font-bold text-slate-800">{format(new Date(), "dd MMM yyyy, EEE")}</span>
                  </div>
                  <Button onClick={() => setActiveTab("data")} className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200 gap-2">
                    <BarChart3 className="w-4 h-4" /> View Report
                  </Button>
                </div>
              </div>

              {/* KPI Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Users */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/60 p-5 group hover:shadow-lg hover:shadow-blue-100 transition-all duration-300">
                  <div className="flex items-start justify-between">
                    <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Users2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trendData.usersChange >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {trendData.usersChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(trendData.usersChange)}%
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-medium text-blue-600/80">Total Users</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{dashData.users_count}</p>
                    <p className="text-xs text-slate-500 mt-1">Registered accounts</p>
                  </div>
                </div>

                {/* Total Businesses */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/60 p-5 group hover:shadow-lg hover:shadow-emerald-100 transition-all duration-300">
                  <div className="flex items-start justify-between">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trendData.orgsChange >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {trendData.orgsChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(trendData.orgsChange)}%
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-medium text-emerald-600/80">Total Businesses</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{dashData.orgs_count}</p>
                    <p className="text-xs text-slate-500 mt-1">Active organizations</p>
                  </div>
                </div>

                {/* Est. Revenue */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200/60 p-5 group hover:shadow-lg hover:shadow-purple-100 transition-all duration-300">
                  <div className="flex items-start justify-between">
                    <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <IndianRupee className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-slate-50 text-slate-500">
                      ~ {trendData.revenueChange}%
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-medium text-purple-600/80">Est. Revenue</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{`\u20B9${proOrgs * 2999 + basicOrgs * 999}`}</p>
                    <p className="text-xs text-slate-500 mt-1">{proOrgs} Pro + {basicOrgs} Basic</p>
                  </div>
                </div>

                {/* Total Invoices */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/60 p-5 group hover:shadow-lg hover:shadow-amber-100 transition-all duration-300">
                  <div className="flex items-start justify-between">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trendData.invoicesChange >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {trendData.invoicesChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(trendData.invoicesChange)}%
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-medium text-amber-600/80">Total Invoices</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{totalInvoices}</p>
                    <p className="text-xs text-slate-500 mt-1">Across all businesses</p>
                  </div>
                </div>
              </div>

              {/* Plan Distribution + Quick Actions Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Plan Distribution Chart */}
                <div className="lg:col-span-2">
                  <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
                        <CreditCard className="w-5 h-5 text-orange-500" /> Plan Distribution
                      </CardTitle>
                      <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700 text-xs gap-1" onClick={() => setActiveTab("pricing")}>
                        View Details <ChevronRight className="w-3 h-3" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={planDistribution} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                          <RechartsTooltip
                            contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: 12 }}
                            cursor={{ fill: 'rgba(249,115,22,0.06)' }}
                          />
                          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={50}>
                            {planDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions */}
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
                      <Zap className="w-5 h-5 text-orange-500" /> Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setActiveTab("orgs")}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-orange-50 border border-orange-200/50 hover:bg-orange-100 transition-colors group"
                    >
                      <PlusCircle className="w-5 h-5 text-orange-600" />
                      <span className="text-xs font-semibold text-orange-700">Add Business</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("users")}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 border border-blue-200/50 hover:bg-blue-100 transition-colors group"
                    >
                      <UserPlus className="w-5 h-5 text-blue-600" />
                      <span className="text-xs font-semibold text-blue-700">Add User</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("pricing")}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-50 border border-emerald-200/50 hover:bg-emerald-100 transition-colors group"
                    >
                      <CreditCard className="w-5 h-5 text-emerald-600" />
                      <span className="text-xs font-semibold text-emerald-700">Create Plan</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("tickets")}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-50 border border-purple-200/50 hover:bg-purple-100 transition-colors group"
                    >
                      <Ticket className="w-5 h-5 text-purple-600" />
                      <span className="text-xs font-semibold text-purple-700">View Tickets</span>
                    </button>
                  </CardContent>
                </Card>
              </div>

              {/* Platform Features + Recent Activity Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Platform Features */}
                <div className="lg:col-span-2">
                  <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
                        <Layers className="w-5 h-5 text-orange-500" /> Platform Features
                      </CardTitle>
                      <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700 text-xs gap-1" onClick={() => setActiveTab("orgs")}>
                        Manage All <ChevronRight className="w-3 h-3" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {[
                          { key: "orgs", label: "Businesses", desc: "Manage all registered businesses", icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
                          { key: "users", label: "Users", desc: "View and manage platform users", icon: Users2, color: "text-emerald-600", bg: "bg-emerald-50" },
                          { key: "pricing", label: "Plans & Pricing", desc: "Configure plans and subscription", icon: IndianRupee, color: "text-orange-600", bg: "bg-orange-50" },
                          { key: "reviews", label: "Reviews", desc: "Monitor user reviews & feedback", icon: MessageSquare, color: "text-amber-600", bg: "bg-amber-50" },
                          { key: "tickets", label: "Support Tickets", desc: "Track and resolve support tickets", icon: Ticket, color: "text-purple-600", bg: "bg-purple-50" },
                          { key: "data", label: "Form Data", desc: "View submitted form data", icon: Database, color: "text-rose-600", bg: "bg-rose-50" },
                        ].map((feat) => (
                          <button
                            key={feat.key}
                            onClick={() => setActiveTab(feat.key)}
                            className="flex flex-col items-center text-center p-4 rounded-xl border border-slate-200/60 hover:border-orange-200 hover:bg-orange-50/30 transition-all group cursor-pointer"
                          >
                            <div className={`w-10 h-10 rounded-xl ${feat.bg} flex items-center justify-center mb-2`}>
                              <feat.icon className={`w-5 h-5 ${feat.color}`} />
                            </div>
                            <p className="text-xs font-semibold text-slate-700 group-hover:text-orange-700">{feat.label}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{feat.desc}</p>
                            <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-orange-500 mt-1.5 transition-colors" />
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
                      <Activity className="w-5 h-5 text-orange-500" /> Recent Activity
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700 text-xs gap-1" onClick={() => setActiveTab("data")}>
                      View All <ChevronRight className="w-3 h-3" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentActivity.length > 0 ? recentActivity.map((act, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="mt-0.5 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            {getActivityIcon(act.icon)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700">{act.title}</p>
                            <p className="text-[11px] text-slate-500 truncate">{act.subtitle}</p>
                          </div>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                            {(() => { try { return formatDistanceToNow(new Date(act.time), { addSuffix: true }); } catch { return ""; } })()}
                          </span>
                        </div>
                      )) : (
                        <p className="text-xs text-slate-400 text-center py-4">No recent activity</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

        {/* ── Businesses Tab ── */}
        {activeTab === "orgs" && (<div className="space-y-6">
          {/* Controls Bar: Search, Plan Filter, Sort By, Asc/Desc Order */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Search bar */}
              <div className="flex-1 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search by business name, email ID, or Account ID (#1XXXXX)..."
                  value={orgSearch}
                  onChange={e => setOrgSearch(e.target.value)}
                  className="flex-1 outline-none text-sm text-slate-800 placeholder:text-slate-400 bg-transparent"
                />
                {orgSearch && (
                  <button onClick={() => setOrgSearch("")} className="text-slate-400 hover:text-slate-600 text-xs font-semibold">✕ Clear</button>
                )}
              </div>

              {/* Plan Filter */}
              <div className="w-full sm:w-[220px]">
                <Select value={orgPlanFilter} onValueChange={setOrgPlanFilter}>
                  <SelectTrigger className="w-full h-11 bg-slate-50 border-slate-200 font-medium text-slate-700 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 truncate">
                      <Filter className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="truncate">Plan: {
                        orgPlanFilter === "all" ? "All Plans" :
                        orgPlanFilter === "free" ? "Business Starter (Free)" :
                        orgPlanFilter === "accounting" ? "Business Accounting" :
                        orgPlanFilter === "hr" ? "Business HR" :
                        orgPlanFilter === "crm" ? "Business CRM" :
                        orgPlanFilter === "promotion" ? "Business Promotion" :
                        orgPlanFilter === "suite" ? "Business Suite" : orgPlanFilter
                      }</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    <SelectItem value="all">All Subscription Plans</SelectItem>
                    <SelectItem value="free">Business Starter (Free)</SelectItem>
                    <SelectItem value="accounting">Business Accounting</SelectItem>
                    <SelectItem value="hr">Business HR</SelectItem>
                    <SelectItem value="crm">Business CRM</SelectItem>
                    <SelectItem value="promotion">Business Promotion</SelectItem>
                    <SelectItem value="suite">Business Suite</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By Select */}
              <div className="w-full sm:w-[240px]">
                <Select value={orgSortBy} onValueChange={(v: "time" | "name" | "plan") => setOrgSortBy(v)}>
                  <SelectTrigger className="w-full h-11 bg-slate-50 border-slate-200 font-medium text-slate-700 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 truncate">
                      <SlidersHorizontal className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="truncate">Sort: {
                        orgSortBy === "time" ? "Account Creation Date" :
                        orgSortBy === "name" ? "Business Name (A-Z)" :
                        "Subscription Plan"
                      }</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    <SelectItem value="time">Account Creation Date / Time</SelectItem>
                    <SelectItem value="name">Business Name (Alphabetical)</SelectItem>
                    <SelectItem value="plan">Subscription Plan (Plan Wise)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Ascending / Descending Toggle Button */}
              <Button
                variant="outline"
                onClick={() => setOrgSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                className="h-11 px-4 bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-2 shrink-0 font-medium text-xs sm:text-sm"
                title={orgSortOrder === "asc" ? "Ascending Order" : "Descending Order"}
              >
                {orgSortOrder === "asc" ? (
                  <>
                    <ArrowUp className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>
                      {orgSortBy === "time" ? "Oldest First (Asc)" : orgSortBy === "name" ? "A → Z (Asc)" : "Ascending (A → Z)"}
                    </span>
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>
                      {orgSortBy === "time" ? "Newest First (Desc)" : orgSortBy === "name" ? "Z → A (Desc)" : "Descending (Z → A)"}
                    </span>
                  </>
                )}
              </Button>
            </div>

            {/* Filter tags & results count */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-slate-600">Active Sort:</span>
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-semibold text-[11px] flex items-center gap-1">
                  {orgSortBy === "time" && <Clock className="w-3 h-3 text-indigo-600" />}
                  {orgSortBy === "name" && <Building2 className="w-3 h-3 text-indigo-600" />}
                  {orgSortBy === "plan" && <Tag className="w-3 h-3 text-indigo-600" />}
                  <span>
                    {orgSortBy === "time" ? "Creation Time" : orgSortBy === "name" ? "Name" : "Plan"} ({orgSortOrder === "asc" ? "Ascending" : "Descending"})
                  </span>
                </Badge>

                {orgPlanFilter !== "all" && (
                  <Badge variant="secondary" className="bg-purple-50 text-purple-700 border border-purple-200/60 font-semibold text-[11px] flex items-center gap-1">
                    <Filter className="w-3 h-3 text-purple-600" />
                    <span>Plan: {orgPlanFilter}</span>
                    <button onClick={() => setOrgPlanFilter("all")} className="ml-1 hover:text-purple-900 font-bold">×</button>
                  </Badge>
                )}

                {(orgSearch || orgPlanFilter !== "all" || orgSortBy !== "time" || orgSortOrder !== "desc") && (
                  <button
                    onClick={() => {
                      setOrgSearch("");
                      setOrgPlanFilter("all");
                      setOrgSortBy("time");
                      setOrgSortOrder("desc");
                    }}
                    className="text-indigo-600 hover:text-indigo-800 hover:underline font-semibold text-xs ml-1"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              <div className="font-medium text-slate-600">
                Total Businesses: <strong className="text-slate-900 font-bold">{dashData.organizations.length}</strong>
              </div>
            </div>
          </div>

          {dashData.organizations.length === 0 ? (
            <Card className="bg-white border-slate-200 text-slate-800 p-8 text-center">
              <p className="text-slate-500">No organizations registered yet.</p>
            </Card>
          ) : (
            (() => {
              const q = orgSearch.trim().toLowerCase();
              const cleanQ = q.replace(/^#/, "");

              // 1. Filter by Search Query
              let filtered = q
                ? dashData.organizations.filter(o =>
                    o.name?.toLowerCase().includes(q) ||
                    o.owner?.email?.toLowerCase().includes(q) ||
                    o.email?.toLowerCase().includes(q) ||
                    String(o.owner?.account_id || "").toLowerCase().includes(cleanQ) ||
                    String((o as any).owner_account_id || "").toLowerCase().includes(cleanQ) ||
                    `#${o.owner?.account_id || (o as any).owner_account_id || ""}`.toLowerCase().includes(q) ||
                    o.id?.toLowerCase().includes(q) ||
                    (dashData.users || []).some(u => u.org_id === o.id && (
                      String(u.account_id || "").toLowerCase().includes(cleanQ) ||
                      u.email?.toLowerCase().includes(q) ||
                      `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase().includes(q)
                    ))
                  )
                : [...dashData.organizations];

              // 2. Filter by Subscription Plan
              if (orgPlanFilter !== "all") {
                filtered = filtered.filter(o => {
                  const rawPlans = (o as any).subscription_plan_names || [o.subscription?.plan_name || (o as any).subscription_plan || "free"];
                  const normalized = rawPlans.map((p: string) => {
                    const l = p.toLowerCase();
                    if (l === 'plan_2') return 'accounting';
                    if (l === 'plan_3') return 'suite';
                    if (l === 'plan_4') return 'hr';
                    if (l === 'plan_5') return 'crm';
                    if (l === 'plan_6') return 'promotion';
                    return l;
                  });
                  return normalized.includes(orgPlanFilter.toLowerCase());
                });
              }

              // 3. Sort by Time, Name, or Plan in Ascending / Descending order
              const sorted = [...filtered].sort((a, b) => {
                if (orgSortBy === "time") {
                  const tA = new Date(a.created_at || 0).getTime();
                  const tB = new Date(b.created_at || 0).getTime();
                  return orgSortOrder === "asc" ? tA - tB : tB - tA;
                }
                if (orgSortBy === "name") {
                  const nA = a.name || "";
                  const nB = b.name || "";
                  const res = nA.localeCompare(nB, undefined, { sensitivity: "base" });
                  return orgSortOrder === "asc" ? res : -res;
                }
                if (orgSortBy === "plan") {
                  const pA = getOrgPlanDisplayName(a);
                  const pB = getOrgPlanDisplayName(b);
                  const res = pA.localeCompare(pB, undefined, { sensitivity: "base" });
                  return orgSortOrder === "asc" ? res : -res;
                }
                return 0;
              });

              if (sorted.length === 0) {
                return (
                  <Card className="bg-white border-slate-200 text-slate-800 p-8 text-center">
                    <p className="text-slate-500">No businesses match the selected filters or search query.</p>
                  </Card>
                );
              }

              return sorted.map(org => {

              const sub = org.subscription || { plan_name: "free", plan_display_name: "Free", enabled_features: ADMIN_FEATURE_GROUPS.map(g => g.key) };
              const currentFeatures = Array.isArray(sub.enabled_features) ? sub.enabled_features : ADMIN_FEATURE_GROUPS.map(g => g.key);
              const isExpanded = expandedOrg === org.id;

              return (
                <Card key={org.id} className="bg-white border-slate-200 text-slate-800 overflow-hidden">
                  {/* Business Header */}
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-slate-800 font-bold text-lg shrink-0">
                          {org.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-xl text-slate-800">{org.name}</CardTitle>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs text-slate-500">
                            {org.owner && (
                              <span className="flex items-center gap-1.5">
                                <UserCircle className="w-3 h-3" /> {org.owner.name?.trim() || org.owner.email}
                                {(org.owner?.account_id || (org as any).owner_account_id) && (
                                  <Badge variant="outline" className="font-mono text-[10px] font-bold bg-indigo-50 text-indigo-700 border-indigo-200 px-1.5 py-0">
                                    #{org.owner?.account_id || (org as any).owner_account_id}
                                  </Badge>
                                )}
                              </span>
                            )}
                            {org.owner?.email && (
                              <span className="flex items-center gap-1 text-indigo-600 font-medium">
                                <Mail className="w-3 h-3" /> {org.owner.email}
                              </span>
                            )}
                            {org.email && org.email !== org.owner?.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {org.email}
                              </span>
                            )}
                            {org.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {org.phone}
                              </span>
                            )}
                            
                            {/* Prominent Account Creation Date & Time */}
                            <div className="flex items-center gap-1.5 font-semibold text-xs text-indigo-950 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-md shadow-2xs">
                              <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span>Account Created: <strong className="font-bold text-slate-900">{new Date(org.created_at).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}</strong> at {new Date(org.created_at).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                              <span className="text-[10px] text-indigo-600 font-normal">({formatDistanceToNow(new Date(org.created_at), { addSuffix: true })})</span>
                            </div>

                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" /> {org.currency_code}
                            </span>
                            {org.gst_number && (
                              <span className="flex items-center gap-1">
                                <Hash className="w-3 h-3" /> GST: {org.gst_number}
                              </span>
                            )}
                          </div>
                          {/* Stats row with Quota Badges */}
                          <div className="flex flex-wrap gap-2.5 mt-3">
                            <div className="px-3 py-1 rounded bg-slate-100 border border-slate-200/50 text-center">
                              <p className="text-lg font-bold text-indigo-600">{org.member_count}</p>
                              <p className="text-[10px] text-slate-500">Users</p>
                            </div>
                            <div className="px-3 py-1 rounded bg-slate-100 border border-slate-200/50 text-center">
                              <p className="text-lg font-bold text-emerald-600">{org.invoice_count}</p>
                              <p className="text-[10px] text-slate-500">Invoices</p>
                            </div>
                            <div className="px-3 py-1 rounded bg-slate-100 border border-slate-200/50 text-center">
                              <p className="text-lg font-bold text-purple-600">
                                {currentFeatures.length}/{ADMIN_FEATURE_GROUPS.length}
                              </p>
                              <p className="text-[10px] text-slate-500">Features</p>
                            </div>

                            {/* Active Custom Capacity Quota Badges */}
                            <div className="px-3 py-1 rounded bg-indigo-50/80 border border-indigo-200/70 text-center">
                              <p className="text-lg font-bold text-indigo-700">{org.custom_limits?.employee_limit || 25}</p>
                              <p className="text-[10px] text-indigo-600 font-medium">HR Staff Limit</p>
                            </div>
                            <div className="px-3 py-1 rounded bg-emerald-50/80 border border-emerald-200/70 text-center">
                              <p className="text-lg font-bold text-emerald-700">{org.custom_limits?.crm_team_limit || 2}</p>
                              <p className="text-[10px] text-emerald-600 font-medium">CRM Logins</p>
                            </div>
                            <div className="px-3 py-1 rounded bg-amber-50/80 border border-amber-200/70 text-center">
                              <p className="text-lg font-bold text-amber-700">{org.custom_limits?.platform_user_limit || 5}</p>
                              <p className="text-[10px] text-amber-600 font-medium">Admin Users</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Plan selector & Quota Management */}
                      <div className="flex flex-col items-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenQuotaModal(org)}
                          className="w-[180px] justify-center bg-indigo-50/90 border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-semibold shadow-2xs h-9 text-xs flex items-center gap-1.5"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                          Adjust Limits & Quota
                        </Button>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[180px] justify-between bg-white border-slate-300 text-slate-700 hover:bg-slate-50">
                              <span className="truncate">{(org as any).subscription_plan_names && (org as any).subscription_plan_names.length > 0
                                ? (org as any).subscription_plan_names.map((p: string) => PLAN_DISPLAY_NAMES[p] || p).join(", ")
                                : sub.plan_display_name || PLAN_DISPLAY_NAMES[sub.plan_name] || "Free"}</span>
                              <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[200px] p-3 bg-slate-100 border-slate-200 shadow-xl rounded-xl z-[9999]" align="end">
                            <div className="space-y-3">
                              {availablePlans.map(plan => {
                                const rawPlans = (org as any).subscription_plan_names || (sub.plan_name ? [sub.plan_name] : ['free']);
                                const currentPlans = rawPlans.map((p: string) => {
                                  if (p === 'plan_2') return 'accounting';
                                  if (p === 'plan_3') return 'suite';
                                  if (p === 'plan_4') return 'hr';
                                  if (p === 'plan_5') return 'crm';
                                  if (p === 'plan_6') return 'promotion';
                                  return p;
                                });
                                const isChecked = currentPlans.includes(plan.id);
                                return (
                                  <div key={plan.id} className="flex items-center space-x-2">
                                    <Checkbox 
                                      id={`plan-${org.id}-${plan.id}`} 
                                      checked={isChecked}
                                      onCheckedChange={() => handlePlansChange(org.id, currentPlans, plan.id)}
                                      className="border-slate-500 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                                    />
                                    <label 
                                      htmlFor={`plan-${org.id}-${plan.id}`}
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700 cursor-pointer"
                                    >
                                      {plan.label}
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                          {((org as any).subscription_plan_names || [sub.plan_name]).map((p: string) => (
                             <Badge key={p} className={PLAN_COLORS[p] || PLAN_COLORS.free}>
                               {PLAN_DISPLAY_NAMES[p] || p}
                             </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Feature Toggles — collapsible */}
                  <div className="border-t border-slate-200">
                    <button
                      onClick={() => setExpandedOrg(isExpanded ? null : org.id)}
                      className="w-full flex items-center justify-between px-6 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100/50 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4" />
                        Feature Access Control ({currentFeatures.length} of {ADMIN_FEATURE_GROUPS.length} enabled)
                        {sub.employee_limit && (
                          <span className="ml-4 text-xs bg-emerald-500/20 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            Employee Limit: {sub.employee_limit}
                          </span>
                        )}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {isExpanded && (
                      <div className="px-6 pb-6">
                        {/* Quick actions */}
                        <div className="flex gap-2 mb-4">
                          <Button size="sm" variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-100"
                            onClick={() => handleEnableAll(org.id)}>
                            Enable All
                          </Button>
                          <Button size="sm" variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-100"
                            onClick={() => handleDisableAll(org.id)}>
                            Disable All
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {ADMIN_FEATURE_GROUPS.map(group => {
                            const isEnabled = currentFeatures.includes(group.key);
                            return (
                              <div
                                key={group.key}
                                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                  isEnabled
                                    ? "bg-indigo-50 border-indigo-200"
                                    : "bg-slate-100/30 border-slate-200/30 opacity-60"
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-700">{group.label}</p>
                                  <p className="text-[10px] text-slate-500 truncate">{group.description}</p>
                                </div>
                                <Switch
                                  checked={isEnabled}
                                  onCheckedChange={(checked) => handleToggleFeature(org.id, group.key, checked)}
                                  className="data-[state=checked]:bg-indigo-500 shrink-0 ml-2"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            });
          })()
          )}
        </div>)}

        {/* ── All Users Tab (Full User & Subscription Plan Management) ── */}
        {activeTab === "users" && (<div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Total Registered</span>
                <p className="text-xl font-black text-slate-800 mt-0.5">{dashData.users.length}</p>
              </div>
              <Users2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Business Suite</span>
                <p className="text-xl font-black text-indigo-600 mt-0.5">
                  {dashData.users.filter(u => getUserPlans(u).includes("suite") || getUserPlans(u).includes("plan_3")).length}
                </p>
              </div>
              <Sparkles className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Business Accounting</span>
                <p className="text-xl font-black text-blue-600 mt-0.5">
                  {dashData.users.filter(u => getUserPlans(u).includes("accounting") || getUserPlans(u).includes("plan_2")).length}
                </p>
              </div>
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">No Business Assigned</span>
                <p className="text-xl font-black text-amber-600 mt-0.5">
                  {dashData.users.filter(u => !u.org_id).length}
                </p>
              </div>
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
          </div>

          <Card className="bg-white border-slate-200 text-slate-800 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users2 className="w-5 h-5 text-indigo-600" />
                    All Registered Users & Plan Management
                  </CardTitle>
                  <CardDescription className="text-slate-500 mt-0.5">
                    Search, inspect, and modify subscription plans directly for any registered user on the platform.
                  </CardDescription>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchDashboardData(true)}
                    className="border-slate-200 text-slate-600 hover:bg-slate-100 text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
                  </Button>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="pt-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search by name, email, business, user ID, or Account ID (#1XXXXX)..."
                    className="bg-slate-50 border-slate-200 pl-9 text-xs text-slate-800 placeholder:text-slate-500"
                  />
                  {userSearchQuery && (
                    <button
                      onClick={() => setUserSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-800"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter by Plan */}
                <div className="w-full md:w-56">
                  <Select value={userPlanFilter} onValueChange={setUserPlanFilter}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-xs text-slate-800">
                      <SelectValue placeholder="Filter by Plan" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-800 z-[9999]">
                      <SelectItem value="all">All Plans</SelectItem>
                      <SelectItem value="free">Business Starter (Free)</SelectItem>
                      <SelectItem value="accounting">Business Accounting</SelectItem>
                      <SelectItem value="hr">Business HR</SelectItem>
                      <SelectItem value="crm">Business CRM</SelectItem>
                      <SelectItem value="promotion">Business Promotion</SelectItem>
                      <SelectItem value="suite">Business Suite</SelectItem>
                      <SelectItem value="no_business">No Business Assigned</SelectItem>
                      <SelectItem value="attendance_only">Attendance Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter by Role */}
                <div className="w-full md:w-44">
                  <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-xs text-slate-800">
                      <SelectValue placeholder="Filter by Role" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-800 z-[9999]">
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Staff / Member</SelectItem>
                      <SelectItem value="no_role">No Business / Role</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Reset Filters */}
                {(userSearchQuery || userPlanFilter !== "all" || userRoleFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUserSearchQuery("");
                      setUserPlanFilter("all");
                      setUserRoleFilter("all");
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Reset Filters
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {(() => {
                const filteredUsers = (dashData?.users || []).filter(user => {
                  const searchLower = userSearchQuery.toLowerCase().trim();
                  const matchesSearch = !searchLower || 
                    user.email?.toLowerCase().includes(searchLower) ||
                    user.first_name?.toLowerCase().includes(searchLower) ||
                    user.last_name?.toLowerCase().includes(searchLower) ||
                    user.org_name?.toLowerCase().includes(searchLower) ||
                    user.user_id?.toLowerCase().includes(searchLower) ||
                    user.account_id?.toLowerCase().includes(searchLower) ||
                    `#${user.account_id || ""}`.toLowerCase().includes(searchLower);

                  if (!matchesSearch) return false;

                  if (userRoleFilter !== "all") {
                    if (userRoleFilter === "no_role" && user.role) return false;
                    if (userRoleFilter !== "no_role" && user.role !== userRoleFilter) return false;
                  }

                  if (userPlanFilter !== "all") {
                    if (userPlanFilter === "no_business") {
                      return !user.org_id;
                    }
                    if (userPlanFilter === "attendance_only") {
                      if (!user.org_id) return false;
                      const plans = getUserPlans(user);
                      return plans.length === 0 || (plans.length === 1 && (plans[0] === "free" || plans[0] === "Basic" || plans[0] === "plan_1"));
                    }
                    const plans = getUserPlans(user);
                    return plans.includes(userPlanFilter) || 
                      (userPlanFilter === "accounting" && plans.includes("plan_2")) ||
                      (userPlanFilter === "suite" && plans.includes("plan_3")) ||
                      (userPlanFilter === "hr" && plans.includes("plan_4")) ||
                      (userPlanFilter === "crm" && plans.includes("plan_5")) ||
                      (userPlanFilter === "promotion" && plans.includes("plan_6"));
                  }

                  return true;
                });

                if (filteredUsers.length === 0) {
                  return (
                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
                      <Users2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-600">No matching users found</p>
                      <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or filters.</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-slate-500 text-xs">
                          <th className="pb-3 pr-4 font-semibold">User Profile</th>
                          <th className="pb-3 pr-4 font-semibold">Email & ID</th>
                          <th className="pb-3 pr-4 font-semibold">Business</th>
                          <th className="pb-3 pr-4 font-semibold">Role</th>
                          <th className="pb-3 pr-4 font-semibold">Active Plan(s)</th>
                          <th className="pb-3 pr-4 font-semibold">Registration</th>
                          <th className="pb-3 text-right font-semibold">Manage / Change Plan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredUsers.map(user => {
                          const userPlans = getUserPlans(user);
                          const userOrg = getUserOrg(user);

                          return (
                            <tr key={user.user_id} className="hover:bg-slate-100/30 transition-colors">
                              {/* User Profile */}
                              <td className="py-3.5 pr-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-slate-800 text-xs font-bold shrink-0 shadow-sm">
                                    {(user.first_name?.[0] || user.email?.[0] || "?").toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-slate-800 font-semibold block leading-tight">
                                        {[user.first_name, user.last_name].filter(Boolean).join(" ") || "Unnamed User"}
                                      </span>
                                      {user.account_id && (
                                        <Badge variant="outline" className="font-mono text-[10px] font-bold bg-indigo-50 text-indigo-700 border-indigo-200 px-1.5 py-0">
                                          #{user.account_id}
                                        </Badge>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      ID: {user.user_id.slice(0, 8)}...
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Email & Copy */}
                              <td className="py-3.5 pr-4">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-600 text-xs">{user.email}</span>
                                  <button
                                    onClick={() => copyText(user.email, user.user_id)}
                                    title="Copy Email"
                                    className="text-slate-500 hover:text-indigo-600"
                                  >
                                    {copiedUserId === user.user_id ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </td>

                              {/* Business */}
                              <td className="py-3.5 pr-4">
                                {user.org_name ? (
                                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 text-[11px] font-medium max-w-[170px] truncate block">
                                    {user.org_name}
                                  </Badge>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                                    <AlertCircle className="w-3 h-3 text-amber-500" /> No Business
                                  </span>
                                )}
                              </td>

                              {/* Role */}
                              <td className="py-3.5 pr-4">
                                <Badge className={
                                  user.role === "owner" ? "bg-amber-50 text-amber-700 border border-amber-200 text-[10px]" :
                                  user.role === "admin" ? "bg-purple-50 text-purple-700 border border-purple-200 text-[10px]" :
                                  user.role === "member" ? "bg-slate-100 text-slate-600 border border-slate-200 text-[10px]" :
                                  "bg-slate-50 text-slate-500 border border-slate-200 text-[10px]"
                                }>
                                  {user.role ? user.role.toUpperCase() : "NO ROLE"}
                                </Badge>
                              </td>

                              {/* Active Plans */}
                              <td className="py-3.5 pr-4">
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {userPlans.length > 0 ? (
                                    userPlans.map(plan => (
                                      <Badge
                                        key={plan}
                                        className={`${PLAN_COLORS[plan] || PLAN_COLORS.free} text-[10px] font-bold border px-1.5 py-0.5 shadow-sm`}
                                      >
                                        {PLAN_DISPLAY_NAMES[plan] || plan}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-slate-500 text-xs italic">No Plan</span>
                                  )}
                                </div>
                              </td>

                              {/* Registration & Last Login */}
                              <td className="py-3.5 pr-4 text-xs text-slate-500">
                                <span className="block font-medium text-slate-600">
                                  {user.created_at ? new Date(user.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  Login: {user.last_sign_in ? new Date(user.last_sign_in).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "Never"}
                                </span>
                              </td>

                              {/* Actions: Change Plan & Manage */}
                              <td className="py-3.5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  
                                  {/* Change Plan Popover */}
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        size="sm"
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-8 px-2.5 shadow-sm shadow-indigo-600/30"
                                      >
                                        Change Plan <ChevronDown className="w-3.5 h-3.5 ml-1" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72 p-4 bg-white border-slate-200 text-slate-800 shadow-2xl rounded-xl z-[9999]" align="end">
                                      <div>
                                        <div className="border-b border-slate-200 pb-2.5 mb-3">
                                          <h4 className="text-xs font-bold text-slate-800 leading-snug">Change Plan for User</h4>
                                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{user.email}</p>
                                          {user.org_name && (
                                            <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">Org: {user.org_name}</p>
                                          )}
                                        </div>

                                        {/* Fast 1-Click Presets */}
                                        <div className="space-y-1.5 mb-3">
                                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                                            Quick Switch:
                                          </span>
                                          <div className="grid grid-cols-2 gap-1.5">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleSetUserDirectPlan(user, "free")}
                                              className="border-slate-200 hover:bg-slate-100 text-slate-600 text-[10px] h-7 px-1.5"
                                            >
                                              🆓 Starter
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleSetUserDirectPlan(user, "accounting")}
                                              className="border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] h-7 px-1.5 font-bold"
                                            >
                                              📦 Accounting
                                            </Button>
                                            <Button
                                              size="sm"
                                              onClick={() => handleSetUserDirectPlan(user, "suite")}
                                              className="col-span-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-[10px] h-7 font-black shadow-sm"
                                            >
                                              🏢 Business Suite (All-In-One)
                                            </Button>
                                          </div>
                                        </div>

                                        {/* Individual Multi-Plan Toggles */}
                                        <div className="border-t border-slate-200 pt-2.5">
                                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-2">
                                            Modular Plans & Add-ons:
                                          </span>
                                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                            {availablePlans.map(p => {
                                              const isChecked = userPlans.includes(p.id);
                                              return (
                                                <div key={p.id} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-100/60">
                                                  <label
                                                    htmlFor={`user-plan-${user.user_id}-${p.id}`}
                                                    className="text-xs text-slate-700 font-medium cursor-pointer flex-1 pr-2"
                                                  >
                                                    {p.label}
                                                  </label>
                                                  <Checkbox
                                                    id={`user-plan-${user.user_id}-${p.id}`}
                                                    checked={isChecked}
                                                    onCheckedChange={() => handleUserPlanToggle(user, p.id)}
                                                    className="border-slate-500 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                                  />
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>

                                        {/* If No Business: Helper Prompt */}
                                        {!user.org_id && (
                                          <div className="mt-3 p-2 bg-amber-950/40 border border-amber-800/40 rounded-lg text-[10px] text-amber-700">
                                            Toggling a plan will automatically create a business for this user.
                                          </div>
                                        )}
                                      </div>
                                    </PopoverContent>
                                  </Popover>

                                  {/* Manage User Modal Opener */}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedUserForModal(user);
                                      setIsManageUserModalOpen(true);
                                    }}
                                    className="border-slate-200 text-slate-600 hover:bg-slate-100 text-xs h-8 px-2.5"
                                  >
                                    <SlidersHorizontal className="w-3.5 h-3.5 mr-1 text-slate-500" /> Manage
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>)}

        {/* ── Admins Tab ── */}
        {activeTab === "admins" && (<div className="space-y-6">
          <Card className="bg-white border-slate-200 text-slate-800">
            <CardHeader>
              <CardTitle>Platform Admins</CardTitle>
              <CardDescription className="text-slate-500">Users with full access to this dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashData.admins.map(admin => (
                  <div key={admin.id} className="flex items-center justify-between p-4 rounded-lg bg-slate-100 border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-slate-800 font-bold">
                        {admin.email?.[0]?.toUpperCase() || "A"}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{admin.email}</p>
                        <p className="text-xs text-slate-500">ID: {admin.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <Badge className="bg-indigo-900/50 text-indigo-700">Super Admin</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>)}
        {/* ── Requests ── */}
        {activeTab === "data" && (<div className="space-y-6">
          <Card>
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-xl flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                Submitted Form Data
              </CardTitle>
              <CardDescription>View signups, partnership requests, and support queries from the website.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="demo" className="w-full">
                <div className="px-6 pt-4">
                  <TabsList className="bg-slate-100">
                    <TabsTrigger value="demo" className="relative">
                      Demo Requests
                      {featureRequests.filter((r: any) => r.request_type === 'demo_request' && r.feature_name !== 'Contact Us Inquiry').length > 0 && (
                        <Badge className="ml-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-1.5 min-w-[18px] h-4.5 flex items-center justify-center text-[10px]">
                          {featureRequests.filter((r: any) => r.request_type === 'demo_request' && r.feature_name !== 'Contact Us Inquiry').length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="signups">Recent Sign Ups</TabsTrigger>
                    <TabsTrigger value="partners">Partner With Us</TabsTrigger>
                    <TabsTrigger value="support">Help & Support</TabsTrigger>
                    <TabsTrigger value="contact">Contact Inquiries</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="demo" className="p-6">
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="w-[140px]">Date & Time</TableHead>
                          <TableHead className="min-w-[170px]">Prospect & Business</TableHead>
                          <TableHead className="min-w-[180px]">Contact Info</TableHead>
                          <TableHead className="min-w-[130px]">Location</TableHead>
                          <TableHead className="min-w-[190px]">Scheduled Slot</TableHead>
                          <TableHead className="min-w-[220px]">Requirements / Notes</TableHead>
                          <TableHead className="min-w-[130px]">Status</TableHead>
                          <TableHead className="w-[70px] text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {featureRequests
                          .filter((r: any) => r.request_type === 'demo_request' && r.feature_name !== 'Contact Us Inquiry')
                          .map((req: any) => {
                            let payload: any = {};
                            try { payload = JSON.parse(req.message || '{}'); } catch(e){}
                            const name = payload.name || 'Anonymous Prospect';
                            const mobile = payload.mobile || payload.phone || '';
                            const email = payload.email || req.user_email || '-';
                            const company = payload.company || payload.business || '-';
                            const city = payload.city || '-';
                            const preferredDate = payload.preferred_date || '';
                            const preferredTime = payload.preferred_time || '-';
                            const message = payload.message || '';

                            const formattedDemoDate = preferredDate ? (() => {
                              try {
                                return new Date(preferredDate + 'T00:00:00').toLocaleDateString('en-IN', {
                                  weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
                                });
                              } catch {
                                return preferredDate;
                              }
                            })() : '';

                            const waLink = mobile ? `https://wa.me/91${mobile}?text=Hello%20${encodeURIComponent(name)},%20thank%20you%20for%20booking%20a%20demo%20with%20Aassay%20Biz!%20Are%20you%20available%20for%20your%20scheduled%20session${formattedDemoDate ? `%20on%20${encodeURIComponent(formattedDemoDate)}` : ''}%20during%20${encodeURIComponent(preferredTime)}?` : '';

                            return (
                              <TableRow key={req.id} className="hover:bg-slate-50/80 transition-colors">
                                <TableCell className="whitespace-nowrap text-xs text-slate-500 font-medium">
                                  {new Date(req.created_at).toLocaleDateString('en-IN', {
                                    day: '2-digit', month: 'short', year: 'numeric'
                                  })}
                                  <div className="text-[11px] text-slate-400">
                                    {new Date(req.created_at).toLocaleTimeString('en-IN', {
                                      hour: '2-digit', minute: '2-digit'
                                    })}
                                  </div>
                                </TableCell>

                                <TableCell>
                                  <div className="font-bold text-slate-900 text-sm">
                                    {name}
                                  </div>
                                  <div className="text-xs text-indigo-700 font-medium flex items-center gap-1 mt-0.5">
                                    <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                    {company}
                                  </div>
                                </TableCell>

                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1 text-xs font-mono text-slate-700 font-medium">
                                      <Phone className="w-3 h-3 text-slate-400" />
                                      {mobile ? `+91 ${mobile}` : '-'}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                      <Mail className="w-3 h-3 text-slate-400" />
                                      {email}
                                    </div>
                                    {mobile && (
                                      <div className="flex items-center gap-2 pt-1">
                                        <a
                                          href={waLink}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold border border-emerald-200 transition-colors"
                                        >
                                          WhatsApp
                                        </a>
                                        <a
                                          href={`tel:${mobile}`}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold border border-indigo-200 transition-colors"
                                        >
                                          Call
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>

                                <TableCell>
                                  <div className="text-xs font-medium text-slate-800">{city}</div>
                                  {payload.industry && (
                                    <Badge variant="outline" className="text-[10px] mt-1 bg-slate-50 text-slate-500 border-slate-200">
                                      {payload.industry}
                                    </Badge>
                                  )}
                                </TableCell>

                                <TableCell>
                                  <div className="space-y-1">
                                    {formattedDemoDate ? (
                                      <div className="flex items-center gap-1 text-xs font-semibold text-slate-900">
                                        <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                        {formattedDemoDate}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-slate-400">Date not set</div>
                                    )}
                                    <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                                      <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
                                      {preferredTime}
                                    </div>
                                  </div>
                                </TableCell>

                                <TableCell className="max-w-[240px]">
                                  <div className="text-xs text-slate-600 line-clamp-2" title={message}>
                                    {message || 'No special requirements noted'}
                                  </div>
                                </TableCell>

                                <TableCell>
                                  <Select
                                    value={req.status || 'pending'}
                                    onValueChange={(val) => handleUpdateFeatureRequest(req.id, val)}
                                  >
                                    <SelectTrigger className={`h-8 text-xs font-bold rounded-lg border ${
                                      req.status === 'completed'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : req.status === 'contacted'
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : req.status === 'scheduled'
                                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">⏳ Pending</SelectItem>
                                      <SelectItem value="contacted">📞 Contacted</SelectItem>
                                      <SelectItem value="scheduled">📅 Scheduled</SelectItem>
                                      <SelectItem value="completed">✅ Completed</SelectItem>
                                      <SelectItem value="rejected">❌ Cancelled</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>

                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                    onClick={() => handleDeleteFeatureRequest(req.id)}
                                    title="Delete Request"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}

                        {!featureRequests.find((r: any) => r.request_type === 'demo_request' && r.feature_name !== 'Contact Us Inquiry') && (
                          <TableRow>
                            <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                              <div className="flex flex-col items-center justify-center space-y-1">
                                <Sparkles className="w-6 h-6 text-slate-400 mb-1" />
                                <p className="font-medium text-slate-600 text-sm">No demo requests yet</p>
                                <p className="text-xs text-slate-400">Incoming requests from the "Book a Demo" form will show up here.</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
                
                <TabsContent value="signups" className="p-6">
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>User Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Joined At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashData?.users?.map((user: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{user.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-slate-100">{user.role}</Badge>
                            </TableCell>
                            <TableCell className="text-slate-500">{new Date(user.created_at).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                        {!dashData?.users?.length && (
                          <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center text-slate-500">No signups found.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="partners" className="p-6">
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {featureRequests.filter((r: any) => r.request_type === 'partner_request').map((req: any, idx: number) => {
                          let payload: any = {};
                          try { payload = JSON.parse(req.message || '{}'); } catch(e){}
                          return (
                            <TableRow key={idx}>
                              <TableCell className="whitespace-nowrap text-slate-500">{new Date(req.created_at).toLocaleString()}</TableCell>
                              <TableCell className="font-medium">{payload.name || '-'}</TableCell>
                              <TableCell>
                                <div className="text-sm">{payload.email}</div>
                                <div className="text-sm text-slate-500">{payload.mobile}</div>
                              </TableCell>
                              <TableCell>{payload.company || '-'}</TableCell>
                              <TableCell className="max-w-[300px]">
                                <div className="truncate" title={payload.message}>{payload.message || req.message}</div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {!featureRequests.find((r: any) => r.request_type === 'partner_request') && (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-slate-500">No partner requests yet.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="support" className="p-6">
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Contact Info</TableHead>
                          <TableHead>Category / Subject</TableHead>
                          <TableHead>Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {featureRequests.filter((r: any) => r.request_type === 'support_request').map((req: any, idx: number) => {
                          let payload: any = {};
                          try { payload = JSON.parse(req.message || '{}'); } catch(e){}
                          return (
                            <TableRow key={idx}>
                              <TableCell className="whitespace-nowrap text-slate-500">{new Date(req.created_at).toLocaleString()}</TableCell>
                              <TableCell>
                                <div className="font-medium">{payload.name || '-'}</div>
                                <div className="text-sm text-slate-500">{payload.email}</div>
                                <div className="text-sm text-slate-500">{payload.phone}</div>
                              </TableCell>
                              <TableCell>
                                <Badge className="mb-1">{payload.category || '-'}</Badge>
                                <div className="text-sm font-medium">{payload.subject || '-'}</div>
                              </TableCell>
                              <TableCell className="max-w-[300px]">
                                <div className="truncate" title={payload.message}>{payload.message || req.message}</div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {!featureRequests.find((r: any) => r.request_type === 'support_request') && (
                          <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center text-slate-500">No support requests yet.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="contact" className="p-6">
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>User Details</TableHead>
                          <TableHead>Topic</TableHead>
                          <TableHead>Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {featureRequests.filter((r: any) => r.request_type === 'demo_request' && r.feature_name === 'Contact Us Inquiry').map((req: any) => {
                          let payload: any = {};
                          try { payload = JSON.parse(req.message || '{}'); } catch { }
                          return (
                            <TableRow key={req.id}>
                              <TableCell className="whitespace-nowrap font-medium text-slate-700">
                                {new Date(req.created_at).toLocaleDateString()} <span className="text-xs text-slate-400 font-normal block">{new Date(req.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{payload.name || '-'}</div>
                                <div className="text-sm text-slate-500">{payload.email}</div>
                                <div className="text-sm text-slate-500">{payload.mobile}</div>
                                {payload.mobile && (
                                  <div className="flex gap-2 mt-2">
                                    <a href={`https://wa.me/${payload.mobile.replace(/\D/g, '')}?text=Hi%20${payload.name},%20we%20received%20your%20inquiry%20regarding%20${payload.subject}.`} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                                      WhatsApp
                                    </a>
                                    <a href={`tel:${payload.mobile.replace(/\D/g, '')}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                      Call
                                    </a>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge className="mb-1">{payload.subject || '-'}</Badge>
                              </TableCell>
                              <TableCell className="max-w-[300px]">
                                <div className="whitespace-pre-wrap text-sm" title={payload.message}>{payload.message || req.message}</div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {!featureRequests.find((r: any) => r.request_type === 'demo_request' && r.feature_name === 'Contact Us Inquiry') && (
                          <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center text-slate-500">No contact inquiries yet.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

              </Tabs>
            </CardContent>
          </Card>
        </div>)}

        {activeTab === "requests" && (<div className="space-y-6">
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-800 flex items-center gap-2 text-xl">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                Feature Access Requests
              </CardTitle>
              <CardDescription className="text-slate-500">
                Manage requests from users asking for access to disabled features.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {featureRequests.filter((r) => (!r.request_type || r.request_type === 'feature_request') && r.feature_name !== 'Contact Us Inquiry').length === 0 ? (
                <div className="text-center p-8 text-slate-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                  <p>No feature requests at the moment.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {featureRequests.filter((r) => (!r.request_type || r.request_type === 'feature_request') && r.feature_name !== 'Contact Us Inquiry').map((req) => (
                    <div key={req.id} className="p-4 rounded-xl border border-slate-200 bg-slate-100/50 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-indigo-500/20 text-indigo-700 border-0 hover:bg-indigo-500/30">
                            {req.feature_name}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {new Date(req.created_at).toLocaleString()}
                          </span>
                        </div>
                        <h4 className="text-slate-800 font-medium">
                          {(() => {
                            // Try to extract business/company name from JSON message
                            try {
                              const parsed = JSON.parse(req.message || '{}');
                              return parsed.business || parsed.company || parsed.name || req.organizations?.name || 'Unknown Business';
                            } catch {
                              return req.organizations?.name || 'Unknown Business';
                            }
                          })()}
                        </h4>
                        <p className="text-sm text-slate-500">{req.user_email || 'Unknown User'}</p>
                        {req.message && (() => {
                          try {
                            const parsed = JSON.parse(req.message);
                            const labelMap: Record<string, string> = {
                              name: 'Name', email: 'Email', mobile: 'Mobile', phone: 'Phone',
                              company: 'Company', business: 'Business', category: 'Category',
                              subject: 'Subject', message: 'Message'
                            };
                            return (
                              <div className="mt-3 p-3 bg-white rounded-lg text-sm border border-slate-200/50 space-y-1">
                                {Object.entries(parsed).map(([k, v]) => (
                                  <div key={k} className="flex gap-2">
                                    <span className="font-medium text-slate-700 min-w-[70px]">{labelMap[k] || k}:</span>
                                    <span className="text-slate-600">{String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          } catch {
                            return (
                              <div className="mt-3 p-3 bg-white rounded-lg text-sm text-slate-600 border border-slate-200/50">
                                {req.message}
                              </div>
                            );
                          }
                        })()}
                      </div>
                      <div className="flex gap-2 w-full md:w-auto">
                        <Button 
                          size="sm" 
                          className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
                          onClick={() => {
                            // Automatically switch to orgs tab and expand this org to enable the feature
                            setExpandedOrg(req.org_id);
                            const orgsTab = document.querySelector('[value="orgs"]') as HTMLButtonElement;
                            if (orgsTab) orgsTab.click();
                          }}
                        >
                          Review & Enable
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>)}
        {/* ── Plans & Pricing Tab ── */}
        {activeTab === "pricing" && (<div className="space-y-8">
          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Plans & Pricing</h3>
            <p className="text-slate-500 text-sm mb-6">Manage subscription prices, global settings, and promo codes.</p>
            <PlansManager />
          </div>
          <hr className="border-slate-200 my-8" />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <PlatformSettingsManager />
            <CouponsManager />
          </div>
        </div>)}



        {/* --- Reviews Tab --- */}
        {activeTab === "reviews" && (<div className="space-y-8">
          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Customer Reviews</h3>
            <p className="text-slate-500 mb-6 text-sm">Manage the testimonials displayed on the landing page.</p>
            <LandingPageReviewsManager />
          </div>
        </div>)}

        {/* --- Ads Manager Tab --- */}
        {activeTab === "ads" && (<div className="space-y-8">
          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Portal Ad Manager</h3>
            <p className="text-slate-500 mb-6 text-sm">Manage promotional banners displayed on employee attendance portal.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <Card className="bg-white border-slate-200 text-slate-800">
                <CardHeader>
                  <CardTitle className="text-lg">Slides Settings</CardTitle>
                  <CardDescription className="text-slate-500">Configure how many ads are shown at once</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="slidesCount" className="text-slate-600">Slides Visible at Once</Label>
                      <Input 
                        id="slidesCount" 
                        type="number" 
                        min="1"
                        max="10"
                        value={adSlidesCount} 
                        onChange={(e) => handleUpdateSlidesCount(parseInt(e.target.value) || 1)}
                        className="bg-slate-100 border-slate-200 text-slate-800"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 text-slate-800">
                <CardHeader>
                  <CardTitle className="text-lg">Upload New Ad</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-slate-600">Title (Optional)</Label>
                      <Input value={adTitle} onChange={(e) => setAdTitle(e.target.value)} className="bg-slate-100 border-slate-200 text-slate-800" placeholder="Summer Sale" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600">Link URL (Optional)</Label>
                      <Input value={adLink} onChange={(e) => setAdLink(e.target.value)} className="bg-slate-100 border-slate-200 text-slate-800" placeholder="https://..." />
                    </div>
                    <div className="space-y-2">
                      <div className="space-y-2">
                        <Label className="text-slate-600">Ad Image (Max 2MB)</Label>
                        <Input type="file" accept="image/*" onChange={(e) => setAdFile(e.target.files?.[0] || null)} className="bg-slate-100 border-slate-200 text-slate-600" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-600">Duration</Label>
                          <select 
                            value={adDuration} 
                            onChange={(e) => setAdDuration(e.target.value)} 
                            className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-slate-800"
                          >
                            <option value="3">3 Seconds</option>
                            <option value="5">5 Seconds</option>
                            <option value="10">10 Seconds</option>
                            <option value="15">15 Seconds</option>
                            <option value="20">20 Seconds</option>
                            <option value="30">30 Seconds</option>
                          </select>
                        </div>
                        <div className="flex items-center space-x-2 pt-8">
                          <Switch id="sponsored" checked={isSponsored} onCheckedChange={setIsSponsored} className="data-[state=checked]:bg-indigo-500" />
                          <Label htmlFor="sponsored" className="text-slate-600 cursor-pointer">Show "Sponsored" tag</Label>
                        </div>
                      </div>
                    </div>
                    <Button onClick={handleUploadAd} disabled={adLoading || !adFile} className="w-full bg-indigo-600 hover:bg-indigo-700">
                      {adLoading ? "Uploading..." : "Upload Ad"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white border-slate-200 text-slate-800">
              <CardHeader>
                <CardTitle className="text-lg">Active Ads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {adsList.length === 0 ? (
                     <p className="text-slate-500 text-sm">No ads uploaded yet.</p>
                  ) : (
                    adsList.map(ad => (
                      <div key={ad.id} className="flex items-center justify-between p-4 bg-slate-100/50 border border-slate-200 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-24 h-16 bg-slate-100 rounded overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
                            {ad.image_url ? (
                              <img src={ad.image_url} alt="Ad" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-slate-500" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-slate-800">
                              {(() => {
                                try {
                                  const parsed = JSON.parse(ad.title || '{}');
                                  return parsed.text || ad.title || 'Untitled Ad';
                                } catch(e) {
                                  return ad.title || 'Untitled Ad';
                                }
                              })()}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">{ad.link_url || 'No link'}</p>
                            <p className="text-[10px] text-slate-500 mt-1">Created: {new Date(ad.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Switch 
                            checked={ad.is_active} 
                            onCheckedChange={(checked) => handleToggleAdActive(ad.id, checked)} 
                            className="data-[state=checked]:bg-indigo-500"
                          />
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteAd(ad.id)} className="text-rose-600 hover:text-rose-700 hover:bg-rose-900/20">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>)}

        {/* ── Social Media & Marketing Handles ── */}
        {activeTab === "social" && (<div className="space-y-6">
          <PlatformSocialsManager />
        </div>)}

        {/* ── Support Tickets Manager Tab ── */}
        {activeTab === "tickets" && (<div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Ticket className="w-5 h-5 text-indigo-600" /> Support Tickets Management
              </h3>
              <p className="text-slate-500 text-sm mt-0.5">
                Monitor all support tickets across every business, update statuses, and communicate with clients.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTickets}
              disabled={ticketLoading}
              className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 self-start sm:self-auto"
            >
              <RefreshCw className={`w-4 h-4 ${ticketLoading ? 'animate-spin' : ''}`} />
              Refresh Tickets
            </Button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Tickets</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">{tickets.length}</span>
              </CardContent>
            </Card>
            <Card className="bg-amber-50/50 border-amber-200 shadow-sm">
              <CardContent className="p-4">
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider block">Open Tickets</span>
                <span className="text-2xl font-bold text-amber-900 mt-1 block">
                  {tickets.filter(t => t.status === 'open').length}
                </span>
              </CardContent>
            </Card>
            <Card className="bg-blue-50/50 border-blue-200 shadow-sm">
              <CardContent className="p-4">
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider block">In Progress</span>
                <span className="text-2xl font-bold text-blue-900 mt-1 block">
                  {tickets.filter(t => t.status === 'in_progress' || t.status === 'pending').length}
                </span>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50/50 border-emerald-200 shadow-sm">
              <CardContent className="p-4">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">Resolved / Closed</span>
                <span className="text-2xl font-bold text-emerald-900 mt-1 block">
                  {tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['all', 'open', 'in_progress', 'resolved', 'closed'].map(st => (
                <Button
                  key={st}
                  size="sm"
                  variant={ticketFilter === st ? "default" : "ghost"}
                  onClick={() => setTicketFilter(st)}
                  className={`text-xs capitalize h-8 ${
                    ticketFilter === st
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {st === 'in_progress' ? 'In Progress' : st}
                  {st !== 'all' && (
                    <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
                      {tickets.filter(t => t.status === st).length}
                    </span>
                  )}
                </Button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search ticket, business, client..."
                value={ticketSearch}
                onChange={e => setTicketSearch(e.target.value)}
                className="pl-8 text-xs h-8 bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          {/* Tickets Table */}
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b border-slate-200">
                    <TableHead className="text-xs font-semibold text-slate-700">Subject & Category</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Business / User</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Contact Details</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Message Preview</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Submitted</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ticketLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                          <span>Loading tickets...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (() => {
                    const filtered = tickets.filter(t => {
                      if (ticketFilter !== 'all' && t.status !== ticketFilter) return false;
                      if (!ticketSearch.trim()) return true;
                      const q = ticketSearch.toLowerCase();
                      const subj = (t.subject || '').toLowerCase();
                      const msg = (t.message || '').toLowerCase();
                      const biz = (t.business || '').toLowerCase();
                      const name = (t.name || '').toLowerCase();
                      const email = (t.email || '').toLowerCase();
                      const phone = (t.phone || '').toLowerCase();
                      const cat = (t.category || '').toLowerCase();
                      return subj.includes(q) || msg.includes(q) || biz.includes(q) || name.includes(q) || email.includes(q) || phone.includes(q) || cat.includes(q);
                    });

                    if (filtered.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={7} className="h-32 text-center text-slate-400">
                            No support tickets found matching current filter.
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return filtered.map(t => (
                      <TableRow key={t.id} className="hover:bg-slate-50/70 border-b border-slate-100 transition-colors">
                        {/* Subject & Category */}
                        <TableCell className="font-medium">
                          <button 
                            onClick={() => handleOpenPlatformTicket(t)} 
                            className="text-left font-semibold text-indigo-600 hover:text-indigo-800 hover:underline block truncate max-w-[200px]"
                            title={t.subject}
                          >
                            {t.subject}
                          </button>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className="text-[10px] capitalize bg-indigo-50/80 text-indigo-700 border-indigo-200">
                              {t.category}
                            </Badge>
                            <span className="text-[10px] text-slate-400 font-mono">#{t.id.slice(0, 8)}</span>
                          </div>
                        </TableCell>

                        {/* Business / User */}
                        <TableCell>
                          <span className="text-xs font-semibold text-slate-800 block truncate max-w-[150px]">
                            {t.business}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate max-w-[150px]">
                            {t.name}
                          </span>
                        </TableCell>

                        {/* Contact Details */}
                        <TableCell>
                          <a href={`mailto:${t.email}`} className="text-xs text-indigo-600 hover:underline block truncate max-w-[160px]">
                            {t.email}
                          </a>
                          {t.phone && t.phone !== "N/A" && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[11px] font-mono text-slate-600">{t.phone}</span>
                              <a
                                href={`https://wa.me/91${t.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${t.name}, regarding your AssayBiz support request: "${t.subject}"`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-600 hover:text-emerald-700"
                                title="Chat on WhatsApp"
                              >
                                <Share2 className="w-3 h-3 inline ml-0.5" />
                              </a>
                            </div>
                          )}
                        </TableCell>

                        {/* Message Preview */}
                        <TableCell>
                          <p className="text-xs text-slate-600 line-clamp-2 max-w-[220px]" title={t.message}>
                            {t.message}
                          </p>
                        </TableCell>

                        {/* Status Select Dropdown (Platform Admin quick change) */}
                        <TableCell>
                          <Select
                            value={t.status}
                            onValueChange={(val) => handleUpdateTicketStatus(t.id, val)}
                          >
                            <SelectTrigger className={`h-7 w-[120px] text-[11px] font-semibold rounded-lg text-white border-0 shadow-xs ${
                              t.status === 'open' || t.status === 'pending' ? 'bg-amber-500 hover:bg-amber-600' :
                              t.status === 'in_progress' ? 'bg-blue-600 hover:bg-blue-700' :
                              t.status === 'resolved' ? 'bg-emerald-600 hover:bg-emerald-700' :
                              'bg-slate-600 hover:bg-slate-700'
                            }`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[9999]">
                              <SelectItem value="open">🟡 Open</SelectItem>
                              <SelectItem value="in_progress">🔵 In Progress</SelectItem>
                              <SelectItem value="resolved">🟢 Resolved</SelectItem>
                              <SelectItem value="closed">⚪ Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Created Date */}
                        <TableCell className="text-[11px] text-slate-500 whitespace-nowrap">
                          {t.created_at ? format(new Date(t.created_at), "dd MMM yyyy, hh:mm a") : "—"}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {t.status !== 'closed' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateTicketStatus(t.id, 'closed')}
                                className="h-7 px-2 text-[11px] font-medium text-slate-700 border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                              >
                                Close
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateTicketStatus(t.id, 'open')}
                                className="h-7 px-2 text-[11px] font-medium text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100"
                              >
                                Reopen
                              </Button>
                            )}

                            <Button
                              size="sm"
                              onClick={() => handleOpenPlatformTicket(t)}
                              className="h-7 px-2 text-[11px] bg-slate-900 hover:bg-slate-800 text-white font-medium gap-1"
                            >
                              <MessageSquare className="w-3 h-3" />
                              View
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteTicket(t.id)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                              title="Delete Request"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>)}

        {/* ── Partners ── */}
        {activeTab === "partners" && (<div className="space-y-6">
          <Card className="bg-white border-slate-200 text-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Tag className="w-5 h-5 text-indigo-600" /> Partner / Reseller Management
                </CardTitle>
                <CardDescription className="text-slate-500 text-xs mt-1">
                  Manage partners — referral code, max users limit, and status
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setNewPartner({ name: '', email: '', referral_code: generateReferralCode(), max_users: '10' });
                  setShowAddPartner(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-2"
              >
                <Plus className="w-4 h-4" /> Add Partner
              </Button>
            </CardHeader>
            <CardContent>
              {partnerLoading ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading partners...
                </div>
              ) : partners.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No partners found. Add a partner to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs font-semibold text-slate-600">Name</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Email</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Referral Code</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 text-center">Max Users</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 text-center">Linked Account</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Created</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partners.map((p) => (
                        <TableRow key={p.id} className="hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-800 text-sm">{p.name}</TableCell>
                          <TableCell className="text-slate-600 text-xs">{p.email}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md px-2.5 py-1 font-mono text-xs font-semibold tracking-wider">
                              <Tag className="w-3 h-3" /> {p.referral_code}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-slate-700 text-xs">
                              {p.max_users} users
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {p.user_id ? (
                              <Badge className="bg-emerald-100 text-emerald-700 text-xs border-0">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Registered
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-400 text-xs">
                                Not Signed Up
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-500 text-xs">
                            {p.created_at ? format(new Date(p.created_at), "dd MMM yyyy") : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Switch
                                checked={p.is_active}
                                onCheckedChange={() => togglePartnerStatus(p.id, p.is_active)}
                                className="data-[state=checked]:bg-emerald-500"
                              />
                              <span className={`text-xs font-medium ${p.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {p.is_active ? 'Active' : 'Inactive'}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePartner(p.id, p.name)}
                                className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 h-7 w-7"
                                title="Delete Partner"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Partner Dialog */}
          <Dialog open={showAddPartner} onOpenChange={setShowAddPartner}>
            <DialogContent className="max-w-md bg-white border-slate-200 text-slate-800 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                  <Plus className="w-5 h-5 text-indigo-600" /> Add New Partner
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs">
                  Enter partner name and referral code. The partner will use this code to sign up.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Partner Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Enterprises"
                    value={newPartner.name}
                    onChange={(e) => setNewPartner(p => ({ ...p, name: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Referral Code *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="PART-XXXXXX"
                      value={newPartner.referral_code}
                      onChange={(e) => setNewPartner(p => ({ ...p, referral_code: e.target.value.toUpperCase() }))}
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 uppercase"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNewPartner(p => ({ ...p, referral_code: generateReferralCode() }))}
                      className="text-xs border-slate-200 text-slate-600 hover:bg-slate-50 whitespace-nowrap"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Auto
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">This code will be used by the partner during sign up</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Max Users (Resell Limit)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="10"
                    value={newPartner.max_users}
                    onChange={(e) => setNewPartner(p => ({ ...p, max_users: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Maximum number of accounts this partner can resell</p>
                </div>
              </div>
              <DialogFooter className="border-t border-slate-100 pt-4 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddPartner(false)}
                  className="flex-1 border-slate-200 text-slate-600 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddPartner}
                  disabled={partnerSaving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                >
                  {partnerSaving ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                  {partnerSaving ? "Saving..." : "Add Partner"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>)}


        </div>
      </main>

      {/* ── Platform Admin Help & Support Query Modal ── */}
      {selectedPlatformTicket && (
        <Dialog open={!!selectedPlatformTicket} onOpenChange={(open) => { if (!open) setSelectedPlatformTicket(null); }}>
          <DialogContent className="max-w-2xl bg-white border-slate-200 text-slate-800 shadow-2xl p-6 z-[9999] max-h-[90vh] flex flex-col">
            <DialogHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-semibold bg-indigo-50 text-indigo-700 border-indigo-200 capitalize">
                      {selectedPlatformTicket.category || "Help & Support"}
                    </Badge>
                    <span className="text-[11px] text-slate-400 font-mono">#{selectedPlatformTicket.id.slice(0, 8)}</span>
                  </div>
                  <DialogTitle className="text-lg font-bold text-slate-900 leading-snug">
                    {selectedPlatformTicket.subject}
                  </DialogTitle>
                  <p className="text-xs text-slate-500">
                    Submitted on {selectedPlatformTicket.created_at ? format(new Date(selectedPlatformTicket.created_at), "dd MMM yyyy, hh:mm a") : "—"}
                  </p>
                </div>

                <Badge variant="outline" className={`uppercase text-[11px] font-semibold ${
                  selectedPlatformTicket.status === 'open' ? 'border-amber-200 text-amber-700 bg-amber-50' :
                  selectedPlatformTicket.status === 'in_progress' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                  selectedPlatformTicket.status === 'resolved' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' :
                  'border-slate-200 text-slate-600 bg-slate-50'
                }`}>
                  {selectedPlatformTicket.status}
                </Badge>
              </div>

              {/* Status Change & Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100 bg-slate-50 p-2.5 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">Change Status:</span>
                  <Select
                    value={selectedPlatformTicket.status}
                    onValueChange={(val) => handleUpdateTicketStatus(selectedPlatformTicket.id, val)}
                  >
                    <SelectTrigger className={`h-8 px-3 text-xs font-semibold rounded-lg text-white border-0 ${
                      selectedPlatformTicket.status === 'open' ? 'bg-amber-500' :
                      selectedPlatformTicket.status === 'in_progress' ? 'bg-blue-600' :
                      selectedPlatformTicket.status === 'resolved' ? 'bg-emerald-600' :
                      'bg-slate-600'
                    }`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                      <SelectItem value="open">🟡 Open</SelectItem>
                      <SelectItem value="in_progress">🔵 In Progress</SelectItem>
                      <SelectItem value="resolved">🟢 Resolved</SelectItem>
                      <SelectItem value="closed">⚪ Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  {selectedPlatformTicket.status !== 'closed' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateTicketStatus(selectedPlatformTicket.id, 'closed')}
                      className="h-8 text-xs font-semibold text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100"
                    >
                      Close Ticket
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateTicketStatus(selectedPlatformTicket.id, 'open')}
                      className="h-8 text-xs font-semibold text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100"
                    >
                      Reopen Ticket
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteTicket(selectedPlatformTicket.id)}
                    className="h-8 text-xs font-semibold text-slate-600 border-slate-200 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
              {/* User & Business Information Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Business & Sender</span>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 text-sm">
                    <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>{selectedPlatformTicket.business || "Platform Business"}</span>
                  </div>
                  <div className="text-slate-600 pl-5">
                    Contact: <span className="font-medium text-slate-800">{selectedPlatformTicket.name || "—"}</span>
                  </div>
                </div>

                <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Direct Contact</span>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a href={`mailto:${selectedPlatformTicket.email}`} className="text-indigo-600 hover:underline truncate">
                      {selectedPlatformTicket.email || "No email"}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-slate-700">{selectedPlatformTicket.phone || "No phone"}</span>
                  </div>
                </div>
              </div>

              {/* Quick Communication Actions Bar */}
              <div className="flex flex-wrap items-center gap-2">
                {selectedPlatformTicket.phone && selectedPlatformTicket.phone !== "N/A" && (
                  <a
                    href={`https://wa.me/91${selectedPlatformTicket.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Hello ${selectedPlatformTicket.name}, this is AssayBiz Platform Support regarding your ticket: "${selectedPlatformTicket.subject}". How can we assist you today?`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Chat on WhatsApp
                  </a>
                )}
                {selectedPlatformTicket.email && selectedPlatformTicket.email !== "—" && (
                  <a
                    href={`mailto:${selectedPlatformTicket.email}?subject=${encodeURIComponent(
                      `AssayBiz Support: ${selectedPlatformTicket.subject}`
                    )}&body=${encodeURIComponent(
                      `Hello ${selectedPlatformTicket.name},\n\nWe received your support request: "${selectedPlatformTicket.message}"\n\n`
                    )}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Send Email Reply
                  </a>
                )}
              </div>

              {/* Message Body */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Query / Problem Details:</span>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed min-h-[100px]">
                  {selectedPlatformTicket.message}
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPlatformTicket(null)}
                className="text-xs border-slate-200 text-slate-700"
              >
                Close Window
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Manage User Details & Plan Override Modal ── */}
      {selectedUserForModal && (
        <Dialog open={isManageUserModalOpen} onOpenChange={setIsManageUserModalOpen}>
          <DialogContent className="max-w-2xl bg-white border-slate-200 text-slate-800 shadow-2xl p-6 z-[9999] max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b border-slate-200 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-slate-800 text-base font-black shrink-0 shadow-md">
                    {(selectedUserForModal.first_name?.[0] || selectedUserForModal.email?.[0] || "?").toUpperCase()}
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      {[selectedUserForModal.first_name, selectedUserForModal.last_name].filter(Boolean).join(" ") || "Registered User"}
                      {selectedUserForModal.account_id && (
                        <Badge variant="outline" className="font-mono text-xs font-bold bg-indigo-50 text-indigo-700 border-indigo-200">
                          #{selectedUserForModal.account_id}
                        </Badge>
                      )}
                      <Badge className="bg-indigo-600/30 text-indigo-700 border border-indigo-500/40 text-[10px]">
                        {selectedUserForModal.role ? selectedUserForModal.role.toUpperCase() : "NO ROLE"}
                      </Badge>
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 text-xs mt-0.5">
                      {selectedUserForModal.email}
                    </DialogDescription>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 pt-4">
              {/* Profile Credentials Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Account ID</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    {selectedUserForModal.account_id ? (
                      <>
                        <Badge variant="outline" className="font-mono text-xs font-bold bg-indigo-50 text-indigo-700 border-indigo-200 px-1.5 py-0">
                          #{selectedUserForModal.account_id}
                        </Badge>
                        <button onClick={() => copyText(selectedUserForModal.account_id!, 'acc_id')} className="text-slate-500 hover:text-slate-800">
                          <Copy className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <span className="text-slate-400 font-mono text-xs">—</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">User ID</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="font-mono text-slate-600 truncate max-w-[90px]">{selectedUserForModal.user_id}</span>
                    <button onClick={() => copyText(selectedUserForModal.user_id, 'uid')} className="text-slate-500 hover:text-slate-800">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Registered On</span>
                  <span className="font-medium text-slate-600 mt-0.5 block">
                    {selectedUserForModal.created_at ? new Date(selectedUserForModal.created_at).toLocaleDateString("en-IN") : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Last Sign-In</span>
                  <span className="font-medium text-slate-600 mt-0.5 block">
                    {selectedUserForModal.last_sign_in ? new Date(selectedUserForModal.last_sign_in).toLocaleDateString("en-IN") : "Never"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Current Business</span>
                  <span className="font-medium text-indigo-600 mt-0.5 block truncate">
                    {selectedUserForModal.org_name || "None"}
                  </span>
                </div>
              </div>

              {/* Plan Management Section */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-100/40 border border-slate-200/60">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-indigo-600" /> Subscription Plan Allocation
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">Select and assign the subscription tier for this user's business.</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {getUserPlans(selectedUserForModal).map(p => (
                      <Badge key={p} className={`${PLAN_COLORS[p] || PLAN_COLORS.free} text-[10px]`}>
                        {PLAN_DISPLAY_NAMES[p] || p}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Fast Presets */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSetUserDirectPlan(selectedUserForModal, "free")}
                    className="border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold py-2"
                  >
                    🆓 Starter (₹0)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSetUserDirectPlan(selectedUserForModal, "accounting")}
                    className="border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold py-2"
                  >
                    📦 Accounting (₹599)
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSetUserDirectPlan(selectedUserForModal, "suite")}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md py-2"
                  >
                    🏢 Business Suite (₹1,999)
                  </Button>
                </div>

                {/* Modular Add-on Checkboxes */}
                <div className="pt-3 border-t border-slate-200/60">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                    Toggle Specific Modular Plans:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availablePlans.map(p => {
                      const isChecked = getUserPlans(selectedUserForModal).includes(p.id);
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                            isChecked ? "bg-indigo-950/40 border-indigo-500/40" : "bg-white/60 border-slate-200"
                          }`}
                        >
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">{p.label}</span>
                            <span className="text-[10px] text-slate-500">
                              {PLAN_DISPLAY_NAMES[p.id] || p.id}
                            </span>
                          </div>
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleUserPlanToggle(selectedUserForModal, p.id)}
                            className="border-slate-500 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Business Association Section */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-100/40 border border-slate-200/60">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" /> Business Association & Role
                </h4>

                {selectedUserForModal.org_id ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-lg border border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">{selectedUserForModal.org_name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">Org ID: {selectedUserForModal.org_id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Change Role:</span>
                      <Select
                        value={selectedUserForModal.role || "member"}
                        onValueChange={(val) => handleUserRoleChange(selectedUserForModal, val)}
                      >
                        <SelectTrigger className="w-32 bg-slate-50 border-slate-200 text-xs text-slate-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 text-slate-800 z-[9999]">
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Staff / Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-amber-700 bg-amber-950/30 border border-amber-800/30 p-2.5 rounded-lg">
                      This user has registered but has not yet created or joined any business.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleCreateAndAssignOrgForUser(selectedUserForModal, ['suite'])}
                        className="bg-emerald-600 hover:bg-emerald-700 text-slate-800 text-xs font-bold"
                      >
                        <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Create Business & Assign Business Suite
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreateAndAssignOrgForUser(selectedUserForModal, ['free'])}
                        className="border-slate-200 text-slate-600 hover:bg-slate-100 text-xs"
                      >
                        Create Business with Free Plan
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Granular Module Feature Toggles for linked Business */}
              {selectedUserForModal.org_id && (() => {
                const org = getUserOrg(selectedUserForModal);
                if (!org) return null;
                const sub = org.subscription || { plan_name: "free", enabled_features: ADMIN_FEATURE_GROUPS.map(g => g.key) };
                const currentFeatures = Array.isArray(sub.enabled_features) ? sub.enabled_features : ADMIN_FEATURE_GROUPS.map(g => g.key);

                return (
                  <div className="space-y-3 p-4 rounded-xl bg-slate-100/40 border border-slate-200/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <Settings2 className="w-4 h-4 text-purple-600" /> Module Access Control
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">Toggle specific feature modules on or off for this user's organization.</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEnableAll(org.id)}
                          className="border-slate-200 text-slate-600 hover:bg-slate-100 text-[10px] h-7 px-2"
                        >
                          Enable All
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDisableAll(org.id)}
                          className="border-slate-200 text-slate-600 hover:bg-slate-100 text-[10px] h-7 px-2"
                        >
                          Disable All
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {ADMIN_FEATURE_GROUPS.map(group => {
                        const isEnabled = currentFeatures.includes(group.key);
                        return (
                          <div
                            key={group.key}
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                              isEnabled ? "bg-indigo-50 border-indigo-200 text-slate-800" : "bg-white/60 border-slate-200 text-slate-500"
                            }`}
                          >
                            <span className="font-medium truncate pr-2">{group.label}</span>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) => handleToggleFeature(org.id, group.key, checked)}
                              className="data-[state=checked]:bg-indigo-600 shrink-0"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            <DialogFooter className="border-t border-slate-200 pt-4 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Changes are saved directly to the database.</span>
              <Button
                onClick={() => setIsManageUserModalOpen(false)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-5"
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Manage Capacity & Quota Limits Modal ── */}
      <Dialog open={isQuotaModalOpen} onOpenChange={setIsQuotaModalOpen}>
        <DialogContent className="max-w-xl bg-white border-slate-200 text-slate-800 shadow-2xl p-6 z-[9999]">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Business Quota & Capacity Limits
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Configure employee staff capacity, CRM sales team member logins, and platform admin user seats for <strong className="text-slate-800 font-semibold">{selectedOrgForQuota?.name}</strong>.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 1. Business HR / Staff Capacity */}
            <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                    <Users2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Business HR & Suite Staff Limit</h4>
                    <p className="text-[11px] text-slate-500">Max salaried employees & daily wage workers allowed in the staff portal</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-slate-200"
                    onClick={() => setQuotaEmpLimit(prev => Math.max(1, prev - 1))}
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={quotaEmpLimit}
                    onChange={(e) => setQuotaEmpLimit(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 h-8 text-center font-bold text-indigo-700 bg-white"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-slate-200"
                    onClick={() => setQuotaEmpLimit(prev => prev + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500 font-medium">Quick Presets:</span>
                {[10, 25, 50, 100].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setQuotaEmpLimit(val)}
                    className={`text-[10px] px-2 py-0.5 rounded border font-medium transition-colors ${
                      quotaEmpLimit === val
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                    }`}
                  >
                    {val} Staff
                  </button>
                ))}
                {[+5, +10, +25].map(inc => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => setQuotaEmpLimit(prev => prev + inc)}
                    className="text-[10px] px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    +{inc}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. CRM Sales Team Member Logins */}
            <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">CRM Sales Team Members (Logins)</h4>
                    <p className="text-[11px] text-slate-500">Official sales executive portal login accounts in Business CRM (/crm-team)</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-slate-200"
                    onClick={() => setQuotaCrmLimit(prev => Math.max(1, prev - 1))}
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={quotaCrmLimit}
                    onChange={(e) => setQuotaCrmLimit(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 h-8 text-center font-bold text-emerald-700 bg-white"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-slate-200"
                    onClick={() => setQuotaCrmLimit(prev => prev + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500 font-medium">Quick Presets:</span>
                {[2, 5, 10, 20].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setQuotaCrmLimit(val)}
                    className={`text-[10px] px-2 py-0.5 rounded border font-medium transition-colors ${
                      quotaCrmLimit === val
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    }`}
                  >
                    {val} Logins
                  </button>
                ))}
                {[+1, +2, +5].map(inc => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => setQuotaCrmLimit(prev => prev + inc)}
                    className="text-[10px] px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    +{inc}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Extra Admin / Platform Users */}
            <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/40 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Admin & Platform Users Limit</h4>
                    <p className="text-[11px] text-slate-500">Number of platform workspace invitations allowed in Admin Panel</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-slate-200"
                    onClick={() => setQuotaPlatUserLimit(prev => Math.max(1, prev - 1))}
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={quotaPlatUserLimit}
                    onChange={(e) => setQuotaPlatUserLimit(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 h-8 text-center font-bold text-amber-700 bg-white"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-slate-200"
                    onClick={() => setQuotaPlatUserLimit(prev => prev + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500 font-medium">Quick Presets:</span>
                {[3, 5, 10, 25].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setQuotaPlatUserLimit(val)}
                    className={`text-[10px] px-2 py-0.5 rounded border font-medium transition-colors ${
                      quotaPlatUserLimit === val
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50"
                    }`}
                  >
                    {val} Users
                  </button>
                ))}
                {[+1, +3, +5].map(inc => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => setQuotaPlatUserLimit(prev => prev + inc)}
                    className="text-[10px] px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    +{inc}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsQuotaModalOpen(false)}
              disabled={savingQuota}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveQuotaLimits}
              disabled={savingQuota}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              {savingQuota ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving Limits...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1.5" /> Save & Apply Quotas
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}


