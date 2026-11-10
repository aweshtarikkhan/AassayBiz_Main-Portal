import { useState, useEffect } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { normalizePlanKey } from "@/lib/subscription";
import { ArrowUpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SocialMediaLinks } from "@/components/shared/SocialMediaLinks";
import { AassayBizBrand } from "@/components/shared/AassayBizBrand";
import {
  LayoutDashboard,
  Users,
  FileText,
  Package,
  CreditCard,
  Settings,
  Receipt,
  Lock,
  ClipboardList,
  BarChart3,
  FileMinus2,
  Coins,
  Layout,
  FileSpreadsheet,
  ScrollText,
  SlidersHorizontal,
  Plus,
  RefreshCw,
  PieChart,
  Boxes,
  UserCog,
  CalendarCheck,
  CheckSquare,
  Calendar,
  FileBarChart2,
  Truck,
  PackageCheck,
  BookOpen,
  Briefcase,
  Building2,
  Percent,
  Calculator,
  Landmark,
  Send,
  MessageSquare,
  Workflow,
  ChevronDown,
  ChevronRight,
  Check,
  ShoppingCart,
  Shield,
  Warehouse,
  MessageCircle,
  Image as ImageIcon,
  BrainCircuit,
  MessageSquareQuote,
  Sparkles,
  HelpCircle,
  RotateCcw,
  Zap,
  Ticket,
  Link2,
} from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { useFeatureStore, ADMIN_FEATURE_GROUPS } from "@/store/feature-store";
import logoImg from "@/assets/logo.png";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLanguage } from "@/lib/i18n";


  

  const salesItems = [
  { title: "Invoices", url: "/invoices", icon: FileText, addUrl: "/invoices/new" },
  { title: "Quotations", url: "/quotations", icon: ClipboardList, addUrl: "/quotations/new" },
  { title: "Client", url: "/clients", icon: Users, addUrl: "/clients?add=1" },
  { title: "Credit Notes", url: "/credit-notes", icon: FileMinus2, addUrl: "/credit-notes/new" },
  { title: "Payments Received", url: "/payments", icon: CreditCard, addUrl: "/payments/new" },
  { title: "Delivery Challan", url: "/delivery-challans", icon: Truck, addUrl: "/delivery-challans/new" },
  { title: "Recurring", url: "/recurring-invoices", icon: RefreshCw, addUrl: null },
];

const purchaseItems = [
  { title: "Vendor", url: "/vendors", icon: Truck, addUrl: null },
  { title: "Purchase Orders", url: "/purchase-orders", icon: ClipboardList, addUrl: "/purchase-orders/new" },
  { title: "Goods Receipt (GRN)", url: "/grns", icon: PackageCheck, addUrl: "/grns/new" },
  { title: "Purchase Invoice", url: "/purchase-invoices", icon: Receipt, addUrl: "/purchase-invoices/new" },
  { title: "Vendor Payments", url: "/vendor-payments", icon: CreditCard, addUrl: "/vendor-payments/new" },
  { title: "Purchase Returns", url: "/purchase-returns", icon: RotateCcw, addUrl: "/purchase-returns/new" },
  { title: "Expenses", url: "/expenses", icon: Coins, addUrl: "/expenses?add=1" },
];

const accountingItems = [
  { title: "Chart of Accounts", url: "/accounts", icon: BookOpen, addUrl: null },
  { title: "Journal Entries", url: "/journal", icon: Calculator, addUrl: null },
  { title: "Bank", url: "/bank-accounts", icon: Landmark, addUrl: null },
  { title: "Cash Flow", url: "/cash-flow", icon: PieChart, addUrl: null },
];

const catalogItems = [
  { title: "Items", url: "/items", icon: Package, addUrl: "/items?add=1" },
  { title: "Inventory", url: "/inventory", icon: Boxes, addUrl: null },
  { title: "Branches", url: "/branches", icon: Building2, addUrl: null },
];

const peopleItems = [
  { title: "Employees", url: "/employees", icon: UserCog, addUrl: "/employees?add=1" },
  { title: "Attendance", url: "/attendance", icon: CalendarCheck, addUrl: null },
  { title: "Tasks", url: "/tasks", icon: CheckSquare, addUrl: "/tasks?add=1" },
  { title: "Leaves", url: "/leaves", icon: ClipboardList, addUrl: null },
  { title: "Expenses", url: "/employee-expenses", icon: Receipt, addUrl: null },
  { title: "Shifts", url: "/shifts", icon: CalendarCheck, addUrl: null },
  { title: "Documents", url: "/employee-documents", icon: ScrollText, addUrl: null },
  { title: "Payroll", url: "/payroll", icon: Calculator, addUrl: null },
];

const crmItems = [
  { title: "CRM Report", url: "/crm-report", icon: BarChart3, addUrl: null },
  { title: "Leads", url: "/leads", icon: Users, addUrl: "/leads?add=1" },
  { title: "Sales Team", url: "/crm-team", icon: Briefcase, addUrl: "/crm-team?add=1" },
  { title: "Calendar", url: "/calendar", icon: Calendar, addUrl: null },
  { title: "Automations", url: "/crm/automations", icon: Zap, addUrl: null },
  { title: "Support Tickets", url: "/tickets", icon: Ticket, addUrl: "/tickets?add=1" },
  { title: "Integrations & API", url: "/crm/integrations", icon: Link2, addUrl: null },
];

const marketingItems = [
  { title: "Promotion Reports", url: "/promotion-reports", icon: BarChart3, addUrl: null },
  { title: "Festival Posters", url: "/marketing/posters", icon: ImageIcon, addUrl: null },
  { title: "Campaigns", url: "/campaigns", icon: Send, addUrl: null },
  { title: "Templates", url: "/marketing/templates", icon: MessageSquare, addUrl: null },
  { title: "Journeys", url: "/journeys", icon: Workflow, addUrl: null },
  { title: "Message Logs", url: "/message-logs", icon: ScrollText, addUrl: null },
];

const settingsItems = [
  { title: "Templates", url: "/templates", icon: Layout },
  { title: "Custom Fields", url: "/custom-fields", icon: SlidersHorizontal },
  { title: "Audit Logs", url: "/audit-logs", icon: ScrollText },
  { title: "Settings", url: "/settings", icon: Settings },
];

// Map feature group key to sidebar items
const ADMIN_GROUP_ITEMS: Record<string, { label: string; items: any[] }> = {
  purchases: { label: "Purchases", items: purchaseItems },
  accounting: { label: "Banking", items: accountingItems },
  people: { label: "Business HR", items: peopleItems },
  crm: { label: "Business CRM", items: crmItems },
  marketing: { label: "Business Promotion", items: marketingItems },
};

export function AppSidebar() {
  const { state, setOpen } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
    const { profile, session } = useAuth();
  const { subscriptionPlan } = useSubscription();
  const org = useAppStore((s) => s.organization);
  const myOrganizations = useAppStore((s) => s.myOrganizations);
  const userRole = useAppStore((s) => s.userRole);
  const globalPermissions = useAppStore((s) => s.userPermissions);
  const inventoryEnabled = (org as any)?.inventory_enabled;
  const { enabledGroups, isAdmin, teamMembers, isGroupEnabled, platformFeatures } = useFeatureStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const { t } = useLanguage();
  const [unreadHrChatCount, setUnreadHrChatCount] = useState(0);
  const [pendingRegularizationsCount, setPendingRegularizationsCount] = useState(0);
  const [pendingLeavesCount, setPendingLeavesCount] = useState(0);
  const [pendingExpensesCount, setPendingExpensesCount] = useState(0);

  useEffect(() => {
    if (!org?.id) return;

    let isMounted = true;
    const fetchCounts = async () => {
      try {
        // 1. HR Chat unread: Resolve all potential HR/Admin IDs (employees + org owner + current user)
        const hrIdSet = new Set<string>();
        if (session?.user?.id) hrIdSet.add(session.user.id);
        if (org.owner_id) hrIdSet.add(org.owner_id);

        const { data: hrEmps } = await (supabase as any)
          .from("employees")
          .select("id, auth_user_id, designation")
          .eq("org_id", org.id)
          .or("designation.ilike.%hr%,designation.ilike.%admin%,designation.ilike.%owner%");

        (hrEmps || []).forEach((e: any) => {
          if (e.id) hrIdSet.add(e.id);
          if (e.auth_user_id) hrIdSet.add(e.auth_user_id);
        });

        const targetHrIds = Array.from(hrIdSet);
        if (targetHrIds.length > 0 && isMounted) {
          // Query unread messages sent to any HR ID
          const currentUserId = session?.user?.id;
          let chatQuery = (supabase as any)
            .from("chat_messages")
            .select("id, status, is_read, sender_id", { count: "exact", head: false })
            .eq("org_id", org.id)
            .in("receiver_id", targetHrIds);

          const { data: unreadRows } = await chatQuery;
          if (isMounted && unreadRows) {
            // Count messages that are unread (status === 'sent' or is_read === false) and not sent by current user
            const unreadCount = unreadRows.filter((m: any) => 
              (m.status === "sent" || m.is_read === false) &&
              m.sender_id !== currentUserId &&
              !targetHrIds.includes(m.sender_id)
            ).length;
            setUnreadHrChatCount(unreadCount);
          }
        }

        // 2. Pending Regularizations
        const { count: regCount } = await (supabase as any)
          .from("attendance_regularizations")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org.id)
          .eq("status", "pending");
        if (isMounted) setPendingRegularizationsCount(regCount || 0);

        // 3. Pending Leaves
        const { count: leaveCount } = await (supabase as any)
          .from("leaves")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org.id)
          .eq("status", "pending");
        if (isMounted) setPendingLeavesCount(leaveCount || 0);

        // 4. Pending Employee Expenses
        const { count: expCount } = await (supabase as any)
          .from("employee_expenses")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org.id)
          .eq("status", "submitted");
        if (isMounted) setPendingExpensesCount(expCount || 0);
      } catch (e) {
        // ignore
      }
    };

    fetchCounts();

    const handleUnreadEvent = (e: any) => {
      if (isMounted) setUnreadHrChatCount(e.detail?.count ?? 0);
    };
    const handleActionUpdate = () => {
      fetchCounts();
    };
    window.addEventListener("hr-chat-unread", handleUnreadEvent);
    window.addEventListener("hr-action-updated", handleActionUpdate);

    const channel = supabase
      .channel(`sidebar-hr-notifications-${org.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        () => { fetchCounts(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance_regularizations" },
        () => { fetchCounts(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leaves" },
        () => { fetchCounts(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employee_expenses" },
        () => { fetchCounts(); }
      )
      .subscribe();

    const interval = setInterval(fetchCounts, 5000);

    return () => {
      isMounted = false;
      window.removeEventListener("hr-chat-unread", handleUnreadEvent);
      window.removeEventListener("hr-action-updated", handleActionUpdate);
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [org?.id, org?.owner_id, session?.user?.id]);

  const toggleGroup = (key: string, isOpen: boolean) => {
    setOpenGroups(prev => ({ ...prev, [key]: !isOpen }));
    if (!isOpen) {
      setTimeout(() => {
        const el = document.getElementById(`group-${key}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }
  };

  const currentUserEmail = session?.user?.email?.toLowerCase().trim();
  const isUserAdmin = isAdmin(currentUserEmail);
  const isOrgAdmin = userRole === 'owner' || userRole === 'admin' || isUserAdmin;
  
  // Find permissions for regular users in current org
  const currentOrgId = org?.id || "default";
  const currentTeamMember = !isOrgAdmin ? (teamMembers[currentOrgId] || []).find(m => m.email === currentUserEmail) : null;
  // Combine local and global permissions
  const userPermissions = [...(currentTeamMember?.permissions || []), ...globalPermissions];

  const isGroupAccessible = (groupKey: string) => {
    if (isOrgAdmin) return true; // Admins & Owners see everything that is enabled
    // Regular invited users see only explicitly assigned features
    return userPermissions.includes(groupKey);
  };

  const multiWarehouseEnabled = (org as any)?.multi_warehouse_enabled;

  const catalogVisible = catalogItems.flatMap((it) => {
    if (it.url === "/inventory" && multiWarehouseEnabled) {
      return [it, { title: "Warehouses", url: "/warehouses", icon: Warehouse, addUrl: "/warehouses?add=1" }];
    }
    return [it];
  });

    // Default groups (always visible for admins, or if explicitly given permission)
  const effectivePlan = subscriptionPlan || (org as any)?.subscription_plan || 'free';
  const isFreePlan = effectivePlan.toLowerCase() === 'free';
  const isSuiteActive = effectivePlan.toLowerCase().trim() === 'suite' || 
                        effectivePlan.toLowerCase().trim() === 'plan_3' || 
                        effectivePlan.toLowerCase().includes('suite') ||
                        effectivePlan.toLowerCase().includes('flagship');

  const activePlans = effectivePlan.toLowerCase().split('+').map(p => normalizePlanKey(p));
  const hasPlan = (p: string) => isSuiteActive || activePlans.includes(p);

  const isItemLocked = (url: string) => {
    if (isSuiteActive) return false;
    
    // Admin Panel
    if (url === "/admin" || url.startsWith("/admin/")) {
      return isFreePlan;
    }

    // Business Integration (Official WhatsApp, Email, CRM integrations)
    if (["/emails", "/chats", "/crm/integrations", "/crm-integrations", "/integrations"].some(u => url === u || url.startsWith(u + "/"))) {
      if (["/crm/integrations", "/crm-integrations", "/integrations"].some(u => url === u || url.startsWith(u + "/"))) {
        return !hasPlan("crm");
      }
      return isFreePlan;
    }

    // Business Promotion
    if (["/campaigns", "/marketing/templates", "/journeys", "/message-logs", "/promotion-reports"].some(u => url === u || url.startsWith(u + "/"))) {
      return !hasPlan("promotion");
    }

    // Business HR
    if (["/employee-documents", "/payroll"].some(u => url === u || url.startsWith(u + "/"))) {
      return !hasPlan("hr");
    }

    // Business CRM
    if (["/crm-reports", "/pipeline", "/crm/automations", "/crm-automations", "/automations", "/tickets", "/support-tickets"].some(u => url === u || url.startsWith(u + "/"))) {
      return !hasPlan("crm");
    }

    // Purchases & Banking
    if (["/vendors", "/purchase-orders", "/grns", "/purchase-invoices", "/vendor-payments", "/purchase-returns", "/debit-notes", "/expenses", "/accounts", "/journal", "/bank-accounts", "/cash-flow"].some(u => url === u || url.startsWith(u + "/"))) {
      return !hasPlan("accounting");
    }

    return false;
  };

  const defaultGroups = [
    { key: "sales", label: "Sales", items: salesItems.filter(i => i.title !== "WhatsApp Chats" || userRole === 'admin' || userRole === 'owner' || userPermissions.includes('whatsapp_access')) },
    { key: "catalog", label: "Inventory Management", items: catalogVisible },
  ].map(g => {
    let hasPlatformFeature = platformFeatures.includes(g.key);
    return { ...g, isLocked: (!isSuiteActive && (!isGroupEnabled(g.key) || !hasPlatformFeature)) || !isGroupAccessible(g.key) };
  });

  // Admin controlled groups - mapped from the feature store
  const featureGroups = ADMIN_FEATURE_GROUPS
    .filter((g) => g.key !== "sales" && g.key !== "catalog")
    .map((g) => {
      let icon = ShoppingCart;
      if (g.icon === "Landmark") icon = Landmark;
      if (g.icon === "UserCog") icon = UserCog;
      if (g.icon === "Users") icon = Users;
      if (g.icon === "Warehouse") icon = Warehouse;

      const isOutreachUnlocked = g.key === 'outreach' && !isFreePlan;

      return {
        key: g.key,
        label: g.label,
        isUpcoming: g.isUpcoming,
        isLocked: (!isSuiteActive && !isOutreachUnlocked && (!isGroupEnabled(g.key) || !platformFeatures.includes(g.key))) || !isGroupAccessible(g.key),
        items: (ADMIN_GROUP_ITEMS[g.key]?.items || g.items).map(i => {
          let itemIcon = typeof i.icon === "function" || typeof i.icon === "object" ? i.icon : ShoppingCart;
          if (i.icon === "Truck") itemIcon = Truck;
          if (i.icon === "ClipboardList") itemIcon = ClipboardList;
          if (i.icon === "PackageCheck") itemIcon = PackageCheck;
          if (i.icon === "Receipt") itemIcon = Receipt;
          if (i.icon === "CreditCard") itemIcon = CreditCard;
          if (i.icon === "RotateCcw") itemIcon = RotateCcw;
          if (i.icon === "Coins") itemIcon = Coins;
          if (i.icon === "Landmark") itemIcon = Landmark;
          if (i.icon === "PieChart") itemIcon = PieChart;
          if (i.icon === "Building2") itemIcon = Building2;
          if (i.icon === "Warehouse") itemIcon = Warehouse;
          if (i.icon === "Boxes") itemIcon = Boxes;
          if (i.icon === "Package") itemIcon = Package;
          if (i.icon === "Percent") itemIcon = Percent;
          if (i.icon === "UserCog") itemIcon = UserCog;
          if (i.icon === "CalendarCheck") itemIcon = CalendarCheck;
          if (i.icon === "Calendar") itemIcon = Calendar;
          if (i.icon === "ScrollText") itemIcon = ScrollText;
          if (i.icon === "Calculator") itemIcon = Calculator;
          if (i.icon === "Users") itemIcon = Users;
          if (i.icon === "Briefcase") itemIcon = Briefcase;
          if (i.icon === "BarChart3") itemIcon = BarChart3;
          if (i.icon === "Image") itemIcon = ImageIcon;
          if (i.icon === "BrainCircuit") itemIcon = BrainCircuit;
          if (i.icon === "MessageSquareQuote") itemIcon = MessageSquareQuote;
          if (i.icon === "Zap") itemIcon = Zap;
          if (i.icon === "Ticket") itemIcon = Ticket;
          if (i.icon === "Link2") itemIcon = Link2;
          
          const hasAddBtn = ["/warehouses", "/crm-team", "/leads", "/vendors", "/accounts", "/tickets"].includes(i.url);
          let addUrl: string | null = i.addUrl !== undefined ? i.addUrl : null;
          if (addUrl === null) {
            if (i.url === "/vendor-payments") addUrl = "/vendor-payments/new";
            else if (i.url === "/purchase-returns") addUrl = "/purchase-returns/new";
            else if (i.url === "/purchase-invoices") addUrl = "/purchase-invoices/new";
            else if (i.url === "/purchase-orders") addUrl = "/purchase-orders/new";
            else if (i.url === "/grns") addUrl = "/grns/new";
            else if (hasAddBtn) addUrl = `${i.url}?add=1`;
          }
          
          return {
            title: i.title,
            url: i.url,
            icon: itemIcon,
            addUrl
          };
        })
      };
    });

    const allGroups = [...defaultGroups, ...featureGroups];
  
  const bmKeys = ["sales", "catalog", "purchases", "accounting", "reports"];
  const bmSubGroups = allGroups.filter(g => bmKeys.includes(g.key));
  const otherGroups = allGroups.filter(g => !bmKeys.includes(g.key));
  
  const isAllBmLocked = bmSubGroups.length > 0 && bmSubGroups.every(g => (g as any).isLocked);
  
  const sidebarGroups = bmSubGroups.length > 0 
    ? [
        { key: "business_management", label: "Business Accounting", items: [], subGroups: bmSubGroups, isLocked: isAllBmLocked },
        ...otherGroups
      ]
    : otherGroups;

  const getSubGroupIcon = (key: string) => {
    switch (key) {
      case "sales": return FileText;
      case "catalog": return Package;
      case "purchases": return ShoppingCart;
      case "accounting": return Landmark;
      case "reports": return BarChart3;
      default: return ClipboardList;
    }
  };

  // Check if any settings item is active to auto-open settings
  const isSettingsActive = settingsItems.some(
    (item) => location.pathname === item.url || location.pathname.startsWith(item.url + "/")
  ) || location.pathname === "/admin" || location.pathname.startsWith("/admin/");

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const switchOrganization = async (orgId: string) => {
    if (!profile || profile.org_id === orgId) return;
    
    // Update profile with new org_id
    const { error } = await supabase
      .from("profiles")
      .update({ org_id: orgId })
      .eq("id", profile.id);
      
    if (!error) {
      // Reload page to fetch new organization data
      window.location.href = "/dashboard";
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0 bg-sidebar text-sidebar-foreground">
      <SidebarHeader className={cn("flex flex-col transition-all", collapsed ? "p-2 items-center" : "px-4 py-6 gap-6")}>
        <NavLink to="/dashboard" className="flex items-center justify-center hover:opacity-90 transition-opacity">
          <div className={cn(
            "bg-white/95 rounded-xl shadow-sm flex items-center justify-center border border-white/20 transition-all",
            collapsed ? "w-8 h-8 p-1 rounded-lg" : "px-4 py-2 w-full"
          )}>
            <img 
              src={`${logoImg}?v=${Date.now()}`} 
              alt="Aassay Biz" 
              className={cn("object-contain transition-all", collapsed ? "h-6 w-6" : "h-10 w-auto")} 
            />
          </div>
        </NavLink>

        {/* Organization Switcher */}
        {!collapsed && myOrganizations.length > 0 && (
          <div className="px-0">
            <div className="relative group/org-switcher">
              <button className="w-full flex items-center gap-3 bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-foreground px-3 py-3 rounded-xl border border-sidebar-border transition-all text-left">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[10px] text-sidebar-foreground/70 font-semibold uppercase tracking-wider">Current Business</span>
                  <span className="text-sm font-bold text-sidebar-foreground truncate">{org?.name || "Loading..."}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-sidebar-foreground/70" />
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute top-full left-0 w-full mt-1 bg-popover border border-border rounded-xl shadow-lg opacity-0 invisible group-hover/org-switcher:opacity-100 group-hover/org-switcher:visible transition-all duration-200 z-50 overflow-hidden">
                <div className="max-h-60 overflow-y-auto p-1">
                  {myOrganizations.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => switchOrganization(o.id)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center justify-between transition-colors ${
                        o.id === org?.id 
                          ? "bg-primary/10 text-primary font-medium" 
                          : "hover:bg-accent text-foreground"
                      }`}
                    >
                      <span className="truncate">{o.name}</span>
                      {o.id === org?.id && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  ))}
                </div>
                <div className="p-1 border-t border-border bg-muted/20">
                  <button
                    onClick={() => navigate("/admin")}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 rounded-md transition-colors flex items-center gap-2"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add New Business
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className={cn("gap-1", collapsed ? "px-1.5" : "px-3")}>
        {/* Permanent Home / Dashboard Link */}
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className={cn(collapsed && "items-center")}>
              <SidebarMenuItem className={cn(collapsed && "flex justify-center")}>
                <SidebarMenuButton asChild isActive={isActive("/dashboard")} tooltip={t("Dashboard")}>
                  <NavLink
                    to="/dashboard"
                    className={cn(
                      "hover:bg-[#1e293b] hover:text-white rounded-lg transition-colors flex items-center",
                      collapsed ? "justify-center h-8 w-8 p-0" : "py-5 px-3"
                    )}
                    activeClassName="bg-blue-600 text-white font-medium shadow-md shadow-blue-600/20"
                  >
                    <LayoutDashboard className="h-5 w-5 shrink-0" />
                    {!collapsed && <span className="text-sm ml-2">{t("Dashboard")}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {sidebarGroups.map((g) => {
          const isActiveGroup = g.items.some((item) => isActive(item.url) || (item.addUrl && isActive(item.addUrl))) || g.subGroups?.some(sub => sub.items.some(item => isActive(item.url) || (item.addUrl && isActive(item.addUrl))));
          const isOpen = openGroups[g.key] !== undefined ? openGroups[g.key] : isActiveGroup;

          return (
            <SidebarGroup key={g.key} id={`group-${g.key}`} className={cn("p-0 mt-2", collapsed && "flex flex-col items-center")}>
              <SidebarGroupContent>
                <SidebarMenu className={cn(collapsed && "items-center")}>
                  <SidebarMenuItem className={cn(collapsed && "flex justify-center")}>
                    <SidebarMenuButton
                      onClick={() => {
                        if ((g as any).isLocked && !(g as any).subGroups) {
                          return;
                        }
                        if ((g as any).isUpcoming) {
                          if (g.key === "feedback") navigate("/feedback");
                          else if (g.key === "ai-analysis") navigate("/business-analysis");
                        } else {
                          toggleGroup(g.key, isOpen);
                        }
                      }}
                      isActive={isActiveGroup}
                      className={cn(
                        "hover:bg-[#1e293b] hover:text-white cursor-pointer rounded-lg transition-colors group/groupbtn",
                        (g as any).isLocked && !(g as any).subGroups ? "opacity-60 cursor-not-allowed" : "",
                        collapsed ? "justify-center h-8 w-8 p-0" : "h-10 py-5"
                      )}
                      tooltip={t(g.label)}
                    >
                      {g.key === "business_management" && <Briefcase className="h-5 w-5 opacity-70 group-hover/groupbtn:opacity-100 shrink-0" />}
                      {g.key === "sales" && <FileText className="h-5 w-5 opacity-70 group-hover/groupbtn:opacity-100 shrink-0" />}
                      {g.key === "catalog" && <Package className="h-5 w-5 opacity-70 group-hover/groupbtn:opacity-100 shrink-0" />}
                      {g.key === "purchases" && <ShoppingCart className="h-5 w-5 opacity-70 group-hover/groupbtn:opacity-100 shrink-0" />}
                      {g.key === "accounting" && <Landmark className="h-5 w-5 opacity-70 group-hover/groupbtn:opacity-100 shrink-0" />}
                      {g.key === "people" && (
                        <div className="relative flex items-center justify-center shrink-0">
                          <UserCog className="h-5 w-5 opacity-70 group-hover/groupbtn:opacity-100 shrink-0" />
                          {collapsed && (unreadHrChatCount > 0 || pendingRegularizationsCount > 0 || pendingLeavesCount > 0 || pendingExpensesCount > 0) && (
                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                            </span>
                          )}
                        </div>
                      )}
                      {g.key === "crm" && <Users className="h-5 w-5 opacity-70 group-hover/groupbtn:opacity-100 shrink-0" />}
                      {g.key === "marketing" && <Send className="h-5 w-5 opacity-70 group-hover/groupbtn:opacity-100 shrink-0" />}
                      {g.key === "reports" && <BarChart3 className="h-5 w-5 opacity-70 group-hover/groupbtn:opacity-100 shrink-0" />}
                      {g.key === "outreach" && <MessageCircle className="h-5 w-5 opacity-70 group-hover/groupbtn:opacity-100 shrink-0" />}
                      {g.key === "feedback" && <MessageSquareQuote className="h-5 w-5 opacity-70 group-hover/groupbtn:opacity-100 shrink-0" />}
                      {g.key === "ai-analysis" && <BrainCircuit className="h-5 w-5 opacity-70 group-hover/groupbtn:opacity-100 shrink-0" />}
                      
                      {!collapsed && (
                        <div className="flex-1 flex items-center justify-between pr-2 ml-2 min-w-0">
                            <span className="font-medium text-slate-300 group-hover/groupbtn:text-white tracking-wide text-sm truncate flex items-center">
                              {t(g.label)}
                              {g.key === "people" && (unreadHrChatCount > 0 || pendingRegularizationsCount > 0 || pendingLeavesCount > 0 || pendingExpensesCount > 0) && (
                                <span className="relative flex h-2 w-2 ml-1.5" title="New action or message pending">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                </span>
                              )}
                            </span>
                            {(g as any).isLocked && !(g as any).isUpcoming && <Lock className="h-3.5 w-3.5 text-amber-500 ml-2 shrink-0" title="Locked" />}
                            {(g as any).isUpcoming && (
                              <div className="flex items-center gap-1 shrink-0 ml-2" title="Coming Soon">
                                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 whitespace-nowrap">
                                  Coming Soon
                                </span>
                              </div>
                            )}
                          </div>
                      )}
                      {!collapsed && !(g as any).isUpcoming && !((g as any).isLocked && !(g as any).subGroups) && (
                        <ChevronRight className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  {isOpen && !(g as any).isLocked && g.items.map((item) => (
                    <SidebarMenuItem key={item.title} className={cn("group/item mt-1", collapsed ? "flex justify-center pl-0" : "pl-6")}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive(item.url)} 
                        tooltip={t(item.title)}
                        className={cn(
                          "hover:bg-[#1e293b] hover:text-white transition-colors rounded-lg",
                          collapsed ? "h-8 w-8 p-0 flex items-center justify-center" : "h-9"
                        )}
                      >
                        <NavLink
                          to={item.url}
                          className={cn(
                            "flex items-center w-full h-full",
                            collapsed ? "justify-center" : "gap-2"
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0 opacity-80" />
                          {!collapsed && (
                            <span className="text-sm flex items-center justify-between w-full">
                              <span>{t(item.title)}</span>
                              {isItemLocked(item.url) && (
                                <Lock className="h-3 w-3 text-amber-500 ml-auto shrink-0" title="Locked - Upgrade Plan" />
                              )}
                              {item.url === "/attendance" && (unreadHrChatCount > 0 || pendingRegularizationsCount > 0) && (
                                <div className="flex items-center gap-1.5 ml-auto shrink-0">
                                  {pendingRegularizationsCount > 0 && (
                                    <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-500 text-white rounded-full" title={`${pendingRegularizationsCount} pending regularizations`}>
                                      {pendingRegularizationsCount}
                                    </span>
                                  )}
                                  {unreadHrChatCount > 0 && (
                                    <span className="px-1.5 py-0.2 text-[9px] font-bold bg-blue-500 text-white rounded-full" title={`${unreadHrChatCount} new HR chat messages`}>
                                      {unreadHrChatCount > 9 ? "9+" : unreadHrChatCount}
                                    </span>
                                  )}
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                  </span>
                                </div>
                              )}
                              {item.url === "/leaves" && pendingLeavesCount > 0 && (
                                <div className="flex items-center gap-1.5 ml-auto shrink-0">
                                  <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-500 text-white rounded-full">
                                    {pendingLeavesCount}
                                  </span>
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                  </span>
                                </div>
                              )}
                              {item.url === "/employee-expenses" && pendingExpensesCount > 0 && (
                                <div className="flex items-center gap-1.5 ml-auto shrink-0">
                                  <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-500 text-white rounded-full">
                                    {pendingExpensesCount}
                                  </span>
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                  </span>
                                </div>
                              )}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                      
                      {!collapsed && item.addUrl && (
                        <NavLink 
                          to={item.addUrl}
                          title={`New ${item.title.replace(/s$/, "")}`}
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 p-1.5 hover:bg-slate-700 rounded-md transition-all text-slate-400 hover:text-white"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </NavLink>
                      )}
                    </SidebarMenuItem>
                  ))}

                  {isOpen && g.subGroups?.map((sub) => {
                    const isSubLocked = (sub as any).isLocked;
                    const isSubActive = sub.items.some(item => isActive(item.url) || (item.addUrl && isActive(item.addUrl)));
                    const isSubOpen = openGroups[sub.key] !== undefined 
                      ? openGroups[sub.key] 
                      : (!isSubLocked && isSubActive);
                    const SubIcon = getSubGroupIcon(sub.key);

                    return (
                      <div key={sub.key} id={`group-${sub.key}`} className={cn("mt-1", collapsed && "w-full flex flex-col items-center")}>
                        <SidebarMenuItem className={cn("group/item", collapsed ? "flex justify-center pl-0" : "pl-4")}>
                          <SidebarMenuButton 
                            onClick={() => {
                              if (!isSubLocked) {
                                toggleGroup(sub.key, isSubOpen);
                              } else {
                                window.dispatchEvent(new Event('open-plan-modal'));
                              }
                            }} 
                            isActive={isSubActive}
                            className={cn(
                              "hover:bg-[#1e293b] text-slate-400 hover:text-white rounded-lg transition-colors",
                              isSubLocked ? "opacity-60 cursor-pointer" : "cursor-pointer",
                              collapsed ? "h-8 w-8 p-0 flex items-center justify-center" : "h-9"
                            )}
                            tooltip={t(sub.label)}
                          >
                            {collapsed ? (
                              <SubIcon className="h-4 w-4 shrink-0 opacity-80" />
                            ) : (
                              <>
                                <span className="flex-1 text-sm flex items-center justify-between pr-2">
                                  <span className="flex items-center gap-2">
                                    <SubIcon className="h-4 w-4 shrink-0 opacity-70" />
                                    <span>{t(sub.label)}</span>
                                  </span>
                                  {isSubLocked && <Lock className="h-3.5 w-3.5 text-amber-500 ml-1.5 shrink-0" title="Locked" />}
                                </span>
                                {!isSubLocked && <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isSubOpen ? "rotate-90" : ""}`} />}
                              </>
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>

                        {isSubOpen && !isSubLocked && (
                          <div className={cn(collapsed ? "space-y-1 my-1 flex flex-col items-center" : "pl-6 border-l border-slate-700/50 ml-6 mt-1 space-y-1")}>
                            {sub.items.map(item => (
                              <SidebarMenuItem key={item.title} className={cn(collapsed ? "flex justify-center pl-0" : "group/subitem")}>
                                <SidebarMenuButton 
                                  asChild 
                                  isActive={isActive(item.url)} 
                                  tooltip={t(item.title)}
                                  className={cn(
                                    "hover:bg-[#1e293b] hover:text-white transition-colors rounded-lg",
                                    collapsed ? "h-8 w-8 p-0 flex items-center justify-center" : "h-8"
                                  )}
                                >
                                  <NavLink 
                                    to={item.url} 
                                    className={cn(
                                      "flex items-center w-full h-full",
                                      collapsed ? "justify-center" : "gap-2"
                                    )}
                                  >
                                    <item.icon className={cn("shrink-0", collapsed ? "h-4 w-4 opacity-80" : "h-3.5 w-3.5 opacity-70")} />
                                    {!collapsed && (
                                      <span className="text-sm flex items-center justify-between w-full">
                                        <span>{t(item.title)}</span>
                                        {isItemLocked(item.url) && (
                                          <Lock className="h-3 w-3 text-amber-500 ml-auto shrink-0" title="Locked - Upgrade Plan" />
                                        )}
                                      </span>
                                    )}
                                  </NavLink>
                                </SidebarMenuButton>
                                {!collapsed && item.addUrl && (
                                  <NavLink 
                                    to={item.addUrl}
                                    title={`New ${item.title.replace(/s$/, "")}`}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/subitem:opacity-100 p-1 hover:bg-slate-700 rounded-md transition-all text-slate-400 hover:text-white"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </NavLink>
                                )}
                              </SidebarMenuItem>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}

        {/* Settings group - collapsible under gear icon */}
        <SidebarGroup className={cn("p-0 mt-2", collapsed && "flex flex-col items-center")}>
          <SidebarGroupContent>
            <SidebarMenu className={cn(collapsed && "items-center")}>
              {(userRole === 'admin' || userRole === 'owner' || userPermissions.includes('settings_access')) && (
                <>
                  <SidebarMenuItem id="group-settings" className={cn(collapsed && "flex justify-center")}>
                    <SidebarMenuButton
                      onClick={() => {
                        setSettingsOpen(!settingsOpen);
                        if (!settingsOpen) {
                          setTimeout(() => {
                            document.getElementById("group-settings")?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 150);
                        }
                      }}
                      isActive={isSettingsActive}
                      className={cn(
                        "hover:bg-[#1e293b] hover:text-white cursor-pointer rounded-lg transition-colors group/groupbtn",
                        collapsed ? "justify-center h-8 w-8 p-0" : "h-10 py-5"
                      )}
                      tooltip={t("System & Settings")}
                    >
                      <Settings className="h-5 w-5 opacity-70 group-hover/groupbtn:opacity-100 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 font-medium text-slate-300 group-hover/groupbtn:text-white tracking-wide text-sm ml-2">{t("System & Settings")}</span>
                          <ChevronRight className={`h-4 w-4 text-slate-500 transition-transform ${settingsOpen || isSettingsActive ? 'rotate-90' : ''}`} />
                        </>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {(settingsOpen || isSettingsActive) && (
                    <>
                      {settingsItems.map((item) => (
                        <SidebarMenuItem key={item.title} className={cn("mt-1", collapsed ? "flex justify-center pl-0" : "pl-6")}>
                          <SidebarMenuButton 
                            asChild 
                            isActive={isActive(item.url)}
                            tooltip={t(item.title)}
                            className={cn(
                              "hover:bg-[#1e293b] hover:text-white transition-colors rounded-lg",
                              collapsed ? "h-8 w-8 p-0 flex items-center justify-center" : "h-9"
                            )}
                          >
                            <NavLink
                              to={item.url}
                              className={cn(
                                "flex items-center w-full h-full",
                                collapsed ? "justify-center" : "gap-2"
                              )}
                            >
                              <item.icon className="h-4 w-4 shrink-0 opacity-80" />
                              {!collapsed && <span className="text-sm">{t(item.title)}</span>}
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                      {userRole !== 'staff' && (
                        <SidebarMenuItem className={cn("mt-1", collapsed ? "flex justify-center pl-0" : "pl-6")}>
                          <SidebarMenuButton 
                            asChild 
                            isActive={isActive("/admin")}
                            tooltip={t("Admin Panel")}
                            className={cn(
                              "hover:bg-[#1e293b] hover:text-white transition-colors rounded-lg",
                              collapsed ? "h-8 w-8 p-0 flex items-center justify-center" : "h-9"
                            )}
                          >
                            <NavLink
                              to="/admin"
                              className={cn(
                                "flex items-center w-full h-full",
                                collapsed ? "justify-center" : "gap-2"
                              )}
                            >
                              <Shield className="h-4 w-4 shrink-0 opacity-80" />
                              {!collapsed && (
                                <span className="text-sm flex items-center justify-between w-full">
                                  <span>{t("Admin Panel")}</span>
                                  {isFreePlan && (
                                    <Lock className="h-3 w-3 text-amber-500 ml-auto shrink-0" title="Locked - Upgrade Plan" />
                                  )}
                                </span>
                              )}
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                    </>
                  )}
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isFreePlan && (
          <div className={collapsed ? "p-1 flex justify-center mt-2 mb-2" : "px-4 mt-2 mb-2"}>
            <button
              onClick={() => window.dispatchEvent(new Event('open-plan-modal'))}
              className={cn(
                "flex items-center justify-center bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md transition-all",
                collapsed ? 'w-8 h-8 rounded-lg p-0' : 'w-full py-2.5 px-4 rounded-xl gap-2'
              )}
              title="Upgrade to Paid Plans"
            >
              <ArrowUpCircle className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="font-semibold text-sm">Upgrade Plan</span>}
            </button>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className={cn("border-t border-slate-800/50 flex flex-col gap-3", collapsed ? "p-2 items-center" : "p-4 pb-6")}>
        {!collapsed && (
          <div className="px-1 pt-1 border-t border-slate-800/60 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Official Channels</span>
            <SocialMediaLinks iconSize="sm" />
          </div>
        )}
        <div className={cn("flex items-center", collapsed ? "justify-center py-1" : "justify-between px-3 mt-1")}>
          {!collapsed ? (
            <>
              <div className="flex flex-col">
                <AassayBizBrand theme="dark" className="text-xs" />
                <span className="text-[10px] text-slate-500">Version 2.0.0</span>
              </div>
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="System Online"></div>
            </>
          ) : (
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="System Online"></div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}






