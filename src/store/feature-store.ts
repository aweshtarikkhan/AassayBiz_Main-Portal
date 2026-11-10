import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

// All feature groups with their items
export interface FeatureItem {
  key: string;
  title: string;
  description: string;
  icon: string; // lucide icon name
  url: string;
  isUpcoming?: boolean;
}

export interface FeatureGroup {
  key: string;
  label: string;
  icon: string;
  description: string;
  items: FeatureItem[];
  isUpcoming?: boolean;
}

export interface TeamMember {
  email: string;
  role: string;
  permissions: string[]; // Keys of FeatureGroups they can access
}

// Default features (now empty as all modules are toggleable)
export const DEFAULT_FEATURE_GROUPS: FeatureGroup[] = [];

// Admin-controlled feature groups
export const ADMIN_FEATURE_GROUPS: FeatureGroup[] = [
  {
    key: "sales",
    label: "Sales",
    icon: "FileText",
    description: "Invoices, Quotations, Credit Notes & more",
    items: [
      { key: "invoices", title: "Invoices", description: "Create & manage invoices", icon: "FileText", url: "/invoices" },
      { key: "estimates", title: "Quotations", description: "Send quotes to clients", icon: "ClipboardList", url: "/quotations" },
      { key: "clients", title: "Client", description: "Manage your customers", icon: "Users", url: "/clients" },
      { key: "credit-notes", title: "Credit Notes", description: "Issue credit notes", icon: "FileMinus2", url: "/credit-notes" },
      { key: "payments", title: "Payments Received", description: "Track all payments", icon: "CreditCard", url: "/payments" },
      { key: "delivery-challans", title: "Delivery Challan", description: "Manage delivery challans", icon: "Truck", url: "/delivery-challans" },
      { key: "recurring", title: "Recurring", description: "Set up recurring billing", icon: "RefreshCw", url: "/recurring-invoices" },
    ],
  },
  {
    key: "catalog",
    label: "Inventory Management",
    icon: "Package",
    description: "Items & Inventory management",
    items: [
      { key: "items", title: "Items", description: "Products & services catalog", icon: "Package", url: "/items" },
      { key: "inventory", title: "Inventory", description: "Stock management", icon: "Boxes", url: "/inventory" },
      { key: "warehouses", title: "Warehouses", description: "Multi-warehouse locations", icon: "Warehouse", url: "/warehouses" },
      { key: "branches", title: "Branches", description: "Multi-branch management", icon: "Building2", url: "/branches" },
    ],
  },
  {
    key: "purchases",
    label: "Purchases",
    icon: "ShoppingCart",
    description: "Vendors, Purchase Orders, Bills & Expenses",
    items: [
      { key: "vendors", title: "Vendor", description: "Manage vendors & suppliers", icon: "Truck", url: "/vendors" },
      { key: "purchase-orders", title: "Purchase Orders", description: "Create purchase orders", icon: "ClipboardList", url: "/purchase-orders" },
      { key: "grns", title: "Goods Receipt (GRN)", description: "Track received goods", icon: "PackageCheck", url: "/grns" },
      { key: "bills", title: "Purchase Invoice", description: "Manage purchase invoices", icon: "Receipt", url: "/purchase-invoices" },
      { key: "vendor-payments", title: "Vendor Payments", description: "Record & track vendor payments", icon: "CreditCard", url: "/vendor-payments" },
      { key: "debit-notes", title: "Purchase Returns", description: "Manage debit notes & returns", icon: "RotateCcw", url: "/purchase-returns" },
      { key: "expenses", title: "Expenses", description: "Track business expenses", icon: "Coins", url: "/expenses" },
    ],
  },
  {
    key: "accounting",
    label: "Banking",
    icon: "Landmark",
    description: "Chart of Accounts, Journal Entries, Bank & Cash Flow",
    items: [
      { key: "accounts", title: "Chart of Accounts", description: "Manage accounts", icon: "BookOpen", url: "/accounts" },
      { key: "journal", title: "Journal Entries", description: "Record journal entries", icon: "Calculator", url: "/journal" },
      { key: "bank-accounts", title: "Bank", description: "Bank account management", icon: "Landmark", url: "/bank-accounts" },
      { key: "cash-flow", title: "Cash Flow", description: "Cash flow analysis", icon: "PieChart", url: "/cash-flow" },
    ],
  },
  {
    key: "people",
    label: "Business HR",
    icon: "UserCog",
    description: "Employees, Attendance, Payroll & Leaves",
    items: [
      { key: "hr-reports", title: "HR Reports", description: "Employee analytics", icon: "BarChart3", url: "/hr-reports" },
      { key: "employees", title: "Employees", description: "Manage employees", icon: "UserCog", url: "/employees" },
      { key: "attendance", title: "Attendance", description: "Track attendance", icon: "CalendarCheck", url: "/attendance" },
      { key: "leaves", title: "Leaves", description: "Leave management", icon: "ClipboardList", url: "/leaves" },
      { key: "shifts", title: "Shifts", description: "Shift scheduling", icon: "CalendarCheck", url: "/shifts" },
      { key: "employee-documents", title: "Documents", description: "Employee documents", icon: "ScrollText", url: "/employee-documents" },
      { key: "payroll", title: "Payroll", description: "Payroll processing", icon: "Calculator", url: "/payroll" },
    ],
  },
  {
    key: "crm",
    label: "Business CRM",
    icon: "Users",
    description: "Leads, Pipeline & Sales Activities",
    items: [
      { key: "crm-reports", title: "CRM Report", description: "Executive overview of leads, pipeline, and tickets", icon: "BarChart3", url: "/crm-report" },
      { key: "leads", title: "Leads", description: "Manage sales leads", icon: "Users", url: "/leads" },
      { key: "crm-team", title: "Sales Team", description: "Manage CRM executives", icon: "Briefcase", url: "/crm-team" },
      { key: "calendar", title: "Calendar", description: "Schedule and tasks", icon: "Calendar", url: "/calendar" },
      { key: "automations", title: "Automations", description: "Workflow rules", icon: "Zap", url: "/crm/automations" },
      { key: "tickets", title: "Support Tickets", description: "Manage customer helpdesk", icon: "Ticket", url: "/tickets" },
      { key: "integrations", title: "Integrations & API", description: "Lead sources & webhooks", icon: "Link2", url: "/crm/integrations" },
    ],
  },
  {
    key: "marketing",
    label: "Business Promotion",
    icon: "Send",
    description: "Campaigns, Templates & Automations",
    items: [
      { key: "marketing-reports", title: "Promotion Reports", description: "Analyze your promotional campaigns", icon: "BarChart3", url: "/promotion-reports" },
      { key: "festival-posters", title: "Festival Posters", description: "Create & download festival marketing posters", icon: "Image", url: "/marketing/posters" },
      { key: "campaigns", title: "Campaigns", description: "Email & SMS campaigns", icon: "Send", url: "/campaigns" },
      { key: "marketing-templates", title: "Templates", description: "Marketing templates", icon: "MessageSquare", url: "/marketing/templates" },
      { key: "journeys", title: "Journeys", description: "Customer journeys", icon: "Workflow", url: "/journeys" },
      { key: "message-logs", title: "Message Logs", description: "View sent messages", icon: "ScrollText", url: "/message-logs" },
    ],
  },
  {
    key: "reports",
      label: "Reports",
    icon: "BarChart3",
    description: "All Business Reports",
          items: [
        { key: "reports", title: "General Reports", description: "All business reports", icon: "BarChart3", url: "/reports" },
        { key: "sales-reports", title: "Sales Reports", description: "Analyze your sales", icon: "BarChart3", url: "/sales-reports" },
        { key: "purchases-reports", title: "Purchases Reports", description: "Analyze your purchases", icon: "BarChart3", url: "/purchase-accounting-reports" },
        { key: "inventory-reports", title: "Inventory Reports", description: "Analyze your inventory", icon: "BarChart3", url: "/inventory-reports" },
        { key: "accounting-reports", title: "Accounting Reports", description: "Financial reports", icon: "Landmark", url: "/accounting-reports" },
      { key: "business-report", title: "Business Report", description: "Detailed analytics and KPIs", icon: "BarChart3", url: "/business-report" },
      { key: "profit-loss", title: "Profit & Loss", description: "P&L statements", icon: "PieChart", url: "/profit-loss" },
      { key: "gst-returns", title: "GST Returns", description: "GST filing reports", icon: "FileBarChart2", url: "/gst-returns" },
      { key: "tds", title: "TDS/TCS Returns", description: "Tax deducted at source", icon: "Percent", url: "/tds" },
      { key: "inventory-valuation", title: "Inventory Valuation", description: "Stock valuation reports", icon: "Boxes", url: "/inventory-valuation" },
      { key: "aging-details", title: "Aging Details", description: "Receivables & payables aging", icon: "ScrollText", url: "/aging-details" },
      { key: "statements", title: "Statements", description: "Customer statements", icon: "FileSpreadsheet", url: "/statements" },
    ],
  },
  {
    key: "outreach",
    label: "Business Integration",
    icon: "MessageCircle",
    description: "Emails & WhatsApp Chats",
    items: [
      { key: "emails", title: "Emails", description: "Send emails to customers", icon: "Send", url: "/emails" },
      { key: "chats", title: "WhatsApp Chats", description: "Chat with customers", icon: "MessageCircle", url: "/chats" },
    ],
  },
  {
    key: "feedback",
    label: "Business Feedback",
    icon: "MessageSquareQuote",
    description: "Manage & analyze customer feedback",
    isUpcoming: true,
    items: [],
  },
  {
    key: "ai-analysis",
    label: "Business Analysis",
    icon: "BrainCircuit",
    description: "AI-powered insights & business analytics",
    isUpcoming: true,
    items: [],
  },
];

// Settings features (shown under settings gear icon)
export const SETTINGS_FEATURES: FeatureItem[] = [
  { key: "templates", title: "Templates", description: "Invoice templates", icon: "Layout", url: "/templates" },
  { key: "custom-fields", title: "Custom Fields", description: "Add custom data fields", icon: "SlidersHorizontal", url: "/custom-fields" },
  { key: "audit-logs", title: "Audit Logs", description: "Activity history", icon: "ScrollText", url: "/audit-logs" },
  { key: "settings", title: "Settings", description: "Organization settings", icon: "Settings", url: "/settings" },
];

// All groups combined for dashboard tiles
export const ALL_FEATURE_GROUPS: FeatureGroup[] = [
  ...DEFAULT_FEATURE_GROUPS,
  ...ADMIN_FEATURE_GROUPS,
  {
    key: "system",
    label: "System & Settings",
    icon: "Settings",
    description: "Templates, Custom Fields & Configuration",
    items: SETTINGS_FEATURES,
  },
];

const FEATURES_STORAGE_KEY = "billflow-enabled-features";
const ORG_FEATURES_STORAGE_KEY = "billflow-org-features";
const ADMINS_STORAGE_KEY = "billflow-admin-users";
const TEAM_MEMBERS_STORAGE_KEY = "billflow-team-members";

// Default super admin emails
const DEFAULT_SUPER_ADMIN_EMAILS = ["awesh.etpl@gmail.com", "admin@aassaybiz.com"];
const DEFAULT_SUPER_ADMIN_EMAIL = "awesh.etpl@gmail.com";

interface FeatureState {
  currentOrgId: string | null;
  enabledGroups: string[];
  orgFeatures: Record<string, string[]>;
  adminEmails: string[];
  
  // Org features actions
  setOrgFeatures: (orgId: string, features: string[]) => void;
  initOrgFeatures: (orgId: string) => void;
  toggleGroup: (groupKey: string, orgId?: string) => Promise<void>;
  enableGroup: (groupKey: string, orgId?: string) => Promise<void>;
  disableGroup: (groupKey: string, orgId?: string) => Promise<void>;
  isGroupEnabled: (groupKey: string) => boolean;

  // Platform features & general
  platformFeatures: string[];
  setPlatformFeatures: (features: string[]) => void;
  setFeatures: (features: string[]) => void;

  // Subscription Metadata
  subscriptionPlan: string | null;
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'cancelled' | 'courtesy' | null;
  employeeLimit: number | null;
  platformEmployeeLimit: number | null;
  crmPortalLimit: number;
  employeeCount: number;
  platformEmployeeCount: number;
  invoiceLimit: number | null;
  clientLimit: number | null;
  itemLimit: number | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  setSubscriptionMeta: (meta: {
    plan_name: string;
    status: 'trial' | 'active' | 'expired' | 'cancelled' | 'courtesy';
    trial_ends_at: string | null;
    employee_limit: number | null;
    employee_count: number;
    platform_employee_limit?: number | null;
    platform_employee_count?: number;
    crm_portal_limit?: number | null;
    invoice_limit?: number | null;
    client_limit?: number | null;
    item_limit?: number | null;
    current_period_end: string | null;
  }) => void;

  // Admin management
  isSuperAdmin: (email: string | null | undefined) => boolean;
  isAdmin: (email: string | null | undefined) => boolean;
  addAdmin: (email: string) => void;
  removeAdmin: (email: string) => void;
  getAdminEmails: () => string[];
  
  // Team Management (Organization users)
  teamMembers: Record<string, TeamMember[]>; // org_id -> TeamMember array
  addTeamMember: (orgId: string, member: TeamMember) => void;
  removeTeamMember: (orgId: string, email: string) => void;
}

const loadAdminEmails = (): string[] => {
  try {
    const stored = localStorage.getItem(ADMINS_STORAGE_KEY);
    if (stored) {
      const emails: string[] = JSON.parse(stored);
      DEFAULT_SUPER_ADMIN_EMAILS.forEach((adm) => {
        if (!emails.includes(adm)) {
          emails.push(adm);
        }
      });
      return emails;
    }
  } catch {}
  return [...DEFAULT_SUPER_ADMIN_EMAILS];
};

const loadTeamMembers = (): Record<string, TeamMember[]> => {
  try {
    const stored = localStorage.getItem(TEAM_MEMBERS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
};

const loadOrgFeatures = (): Record<string, string[]> => {
  try {
    const stored = localStorage.getItem(ORG_FEATURES_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
};

const loadEnabledGroups = (): string[] => {
  try {
    const stored = localStorage.getItem(FEATURES_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return ADMIN_FEATURE_GROUPS.map(g => g.key);
};

export const useFeatureStore = create<FeatureState>((set, get) => ({
  currentOrgId: null,
  enabledGroups: loadEnabledGroups(),
  orgFeatures: loadOrgFeatures(),
  platformFeatures: ADMIN_FEATURE_GROUPS.map(g => g.key),
  adminEmails: loadAdminEmails(),
  teamMembers: loadTeamMembers(),

  subscriptionPlan: null,
  subscriptionStatus: null,
  employeeLimit: null,
  platformEmployeeLimit: null,
  crmPortalLimit: 2,
  employeeCount: 0,
  platformEmployeeCount: 0,
  invoiceLimit: null,
  clientLimit: null,
  itemLimit: null,
  trialEndsAt: null,
  currentPeriodEnd: null,

  setSubscriptionMeta: (meta) => {
    // employee_limit = plan's base limit (e.g. 10 for suite)
    // employee_count = purchased capacity (e.g. 27 = base + extras purchased)
    // Effective limit = max of both, so purchased extras are respected
    const effectiveLimit = Math.max(meta.employee_limit || 0, meta.employee_count || 0) || meta.employee_limit;
    set({
      subscriptionPlan: meta.plan_name,
      subscriptionStatus: meta.status,
      trialEndsAt: meta.trial_ends_at,
      employeeLimit: effectiveLimit,
      platformEmployeeLimit: meta.platform_employee_limit || null,
      employeeCount: meta.employee_count,
      platformEmployeeCount: meta.platform_employee_count || 0,
      crmPortalLimit: meta.crm_portal_limit || 2,
      invoiceLimit: meta.invoice_limit || null,
      clientLimit: meta.client_limit || null,
      itemLimit: meta.item_limit || null,
      currentPeriodEnd: meta.current_period_end,
    });
  },

  setOrgFeatures: (orgId: string, features: string[]) => {
    const newOrgFeatures = { ...get().orgFeatures, [orgId]: features };
    try {
      localStorage.setItem(ORG_FEATURES_STORAGE_KEY, JSON.stringify(newOrgFeatures));
      localStorage.setItem(FEATURES_STORAGE_KEY, JSON.stringify(features));
    } catch {}
    set({
      currentOrgId: orgId,
      orgFeatures: newOrgFeatures,
      enabledGroups: features,
    });
  },

  initOrgFeatures: (orgId: string) => {
    const existing = get().orgFeatures[orgId];
    const features = existing || ADMIN_FEATURE_GROUPS.map(g => g.key);
    get().setOrgFeatures(orgId, features);
  },

  setPlatformFeatures: (features: string[]) => {
    set({ platformFeatures: features });
  },

  setFeatures: (features: string[]) => {
    try {
      localStorage.setItem(FEATURES_STORAGE_KEY, JSON.stringify(features));
    } catch {}
    set({ enabledGroups: features });
  },

  toggleGroup: async (groupKey: string, orgId?: string) => {
    const targetOrgId = orgId || get().currentOrgId || "default";
    const currentList = get().orgFeatures[targetOrgId] || get().enabledGroups || ADMIN_FEATURE_GROUPS.map(g => g.key);
    const updated = currentList.includes(groupKey)
      ? currentList.filter((k) => k !== groupKey)
      : [...currentList, groupKey];

    const newOrgFeatures = { ...get().orgFeatures, [targetOrgId]: updated };
    try {
      localStorage.setItem(ORG_FEATURES_STORAGE_KEY, JSON.stringify(newOrgFeatures));
      localStorage.setItem(FEATURES_STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    set({
      orgFeatures: newOrgFeatures,
      enabledGroups: updated,
    });

    // Sync to Supabase organizations table for this specific business
    if (targetOrgId && targetOrgId !== "default") {
      try {
        await supabase
          .from("organizations")
          .update({ enabled_features: updated as any })
          .eq("id", targetOrgId);
      } catch (err) {
        console.error("Failed to update organization enabled_features in Supabase:", err);
      }
    }
  },

  enableGroup: async (groupKey: string, orgId?: string) => {
    const targetOrgId = orgId || get().currentOrgId || "default";
    const currentList = get().orgFeatures[targetOrgId] || get().enabledGroups || ADMIN_FEATURE_GROUPS.map(g => g.key);
    if (!currentList.includes(groupKey)) {
      const updated = [...currentList, groupKey];
      const newOrgFeatures = { ...get().orgFeatures, [targetOrgId]: updated };
      try {
        localStorage.setItem(ORG_FEATURES_STORAGE_KEY, JSON.stringify(newOrgFeatures));
        localStorage.setItem(FEATURES_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      set({ orgFeatures: newOrgFeatures, enabledGroups: updated });

      if (targetOrgId && targetOrgId !== "default") {
        try {
          await supabase.from("organizations").update({ enabled_features: updated as any }).eq("id", targetOrgId);
        } catch {}
      }
    }
  },

  disableGroup: async (groupKey: string, orgId?: string) => {
    const targetOrgId = orgId || get().currentOrgId || "default";
    const currentList = get().orgFeatures[targetOrgId] || get().enabledGroups || ADMIN_FEATURE_GROUPS.map(g => g.key);
    const updated = currentList.filter((k) => k !== groupKey);
    const newOrgFeatures = { ...get().orgFeatures, [targetOrgId]: updated };
    try {
      localStorage.setItem(ORG_FEATURES_STORAGE_KEY, JSON.stringify(newOrgFeatures));
      localStorage.setItem(FEATURES_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    set({ orgFeatures: newOrgFeatures, enabledGroups: updated });

    if (targetOrgId && targetOrgId !== "default") {
      try {
        await supabase.from("organizations").update({ enabled_features: updated as any }).eq("id", targetOrgId);
      } catch {}
    }
  },

  isGroupEnabled: (groupKey: string) => {
    const state = get();
    // 1. Business Suite always has full unrestricted access to the entire portal
    const plan = state.subscriptionPlan?.toLowerCase().trim() || '';
    if (
      plan === 'suite' ||
      plan === 'plan_3' ||
      plan.includes('suite') ||
      plan.includes('flagship') ||
      plan.includes('enterprise')
    ) {
      return true;
    }
    // 2. If the platform subscription explicitly grants this group, allow access
    if (state.platformFeatures.includes(groupKey)) {
      return true;
    }
    // 3. Fallback to business custom enabled groups
    return state.enabledGroups.includes(groupKey);
  },

  // Admin management
  isSuperAdmin: (email: string | null | undefined) => {
    if (!email) return false;
    const normalized = email.toLowerCase().trim();
    return DEFAULT_SUPER_ADMIN_EMAILS.includes(normalized);
  },

  isAdmin: (email: string | null | undefined) => {
    if (!email) return false;
    const isSuper = get().isSuperAdmin(email);
    if (isSuper) return true;
    return get().adminEmails.includes(email.toLowerCase().trim());
  },

  addAdmin: (email: string) => {
    const current = get().adminEmails;
    const normalized = email.toLowerCase().trim();
    if (!current.includes(normalized)) {
      const updated = [...current, normalized];
      try {
        localStorage.setItem(ADMINS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      set({ adminEmails: updated });
    }
  },

  removeAdmin: (email: string) => {
    const normalized = email.toLowerCase().trim();
    if (DEFAULT_SUPER_ADMIN_EMAILS.includes(normalized)) return;
    const current = get().adminEmails;
    const updated = current.filter((e) => e !== normalized);
    try {
      localStorage.setItem(ADMINS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    set({ adminEmails: updated });
  },

  getAdminEmails: () => {
    return get().adminEmails;
  },

  // Team Management
  addTeamMember: (orgId: string, member: TeamMember) => {
    const current = get().teamMembers;
    const orgMembers = current[orgId] || [];
    const normalizedEmail = member.email.toLowerCase().trim();
    
    if (orgMembers.some(m => m.email === normalizedEmail)) return;
    
    const newMember = { ...member, email: normalizedEmail };
    const updated = { ...current, [orgId]: [...orgMembers, newMember] };
    try {
      localStorage.setItem(TEAM_MEMBERS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    set({ teamMembers: updated });
  },
  
  removeTeamMember: (orgId: string, email: string) => {
    const current = get().teamMembers;
    const orgMembers = current[orgId] || [];
    const normalized = email.toLowerCase().trim();
    
    const updated = { 
      ...current, 
      [orgId]: orgMembers.filter(e => e.email !== normalized) 
    };
    
    try {
      localStorage.setItem(TEAM_MEMBERS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    set({ teamMembers: updated });
  },
}));
