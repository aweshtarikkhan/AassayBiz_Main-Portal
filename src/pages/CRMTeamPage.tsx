import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  KeyRound,
  Copy,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
  Share2,
  ShieldCheck,
  CheckCircle2,
  Users,
  Building2,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/app-store";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CRM_BASE_PORTAL_USERS_LIMIT, CRM_ADDITIONAL_USER_COST_PER_MONTH } from "@/lib/subscription";
import { PlanSelectorModal } from "@/components/shared/PlanSelectorModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { ensureAdminInCrmTeam } from "@/lib/crm-automations";

interface CredentialsModalData {
  name: string;
  email: string;
  password: string;
  orgName: string;
  portalUrl: string;
  phone?: string;
}

export default function CRMTeamPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const org = useAppStore((state) => state.organization);
  const { toast } = useToast();

  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState<"all" | "access" | "no_access">("all");

  // Add / Edit Modal state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "Sales Executive",
    is_active: true,
    grant_portal_access: false,
    portal_password: "",
  });
  const [saving, setSaving] = useState(false);

  // Grant Access Modal state
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [grantMember, setGrantMember] = useState<any | null>(null);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantPassword, setGrantPassword] = useState("");
  const [grantRole, setGrantRole] = useState("Sales Executive");
  const [showGrantPassword, setShowGrantPassword] = useState(false);
  const [grantLoading, setGrantLoading] = useState(false);

  // Reset Password Modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetMember, setResetMember] = useState<any | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Credentials Success Modal state
  const [credentialsData, setCredentialsData] = useState<CredentialsModalData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // CRM Portal Access Quota & Upgrade Limit States
  const crmPortalLimit = CRM_BASE_PORTAL_USERS_LIMIT; // 2 included logins
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  const generateRandomPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let pass = "Ak@";
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const crmPortalUrl =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "http://localhost:5173"
      : "https://crm.aassaybiz.com";

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      openAdd();
      setSearchParams(new URLSearchParams());
    }
  }, [searchParams, setSearchParams]);

  const fetchTeam = async () => {
    if (!org?.id) return;
    try {
      setLoading(true);
      await ensureAdminInCrmTeam(org.id, null, org.email || undefined);
      const { data, error } = await supabase
        .from("crm_team")
        .select("*")
        .eq("org_id", org.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTeam(data || []);
    } catch (error: any) {
      toast({ title: "Error fetching CRM team", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, [org?.id]);

  // Handle Add / Edit
  const handleSave = async () => {
    if (!org?.id || !formData.name) return;
    try {
      setSaving(true);
      const cleanEmail = formData.email ? formData.email.trim().toLowerCase() : "";

      if (editingId) {
        const { error } = await supabase
          .from("crm_team")
          .update({
            name: formData.name,
            email: cleanEmail || null,
            phone: formData.phone || null,
            role: formData.role || "Sales Executive",
            is_active: formData.is_active,
          })
          .eq("id", editingId)
          .eq("org_id", org.id);

        if (error) throw error;
        toast({ title: "Executive updated successfully" });
      } else {
        // Insert new team member
        const { data: inserted, error: insErr } = await supabase
          .from("crm_team")
          .insert({
            name: formData.name,
            email: cleanEmail || null,
            phone: formData.phone || null,
            role: formData.role || "Sales Executive",
            is_active: formData.is_active,
            org_id: org.id,
          })
          .select()
          .single();

        if (insErr) throw insErr;

        // Auto grant portal access if checked
        if (formData.grant_portal_access && cleanEmail && formData.portal_password?.length >= 6) {
          if (accessCount >= crmPortalLimit) {
            toast({
              title: "Portal Access Limit Reached",
              description: `Your CRM plan includes ${crmPortalLimit} portal accounts (currently ${accessCount}/${crmPortalLimit} in use). Additional member costs ₹${CRM_ADDITIONAL_USER_COST_PER_MONTH}/Mo. Executive created without portal access.`,
              variant: "destructive",
            });
            setLimitModalOpen(true);
          } else {
            try {
            await supabase.rpc("grant_crm_portal_access", {
              p_team_member_id: inserted.id,
              p_email: cleanEmail,
              p_password: formData.portal_password,
              p_role: formData.role?.toLowerCase().includes("manager") ? "manager" : "sales_executive",
            });

            setCredentialsData({
              name: formData.name,
              email: cleanEmail,
              password: formData.portal_password,
              orgName: org.name,
              portalUrl: crmPortalUrl,
              phone: formData.phone,
            });
            } catch (accErr: any) {
              console.warn("Auto grant access error:", accErr);
            }
          }
        }

        toast({ title: "Executive added successfully" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchTeam();
    } catch (error: any) {
      toast({ title: "Error saving executive", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this executive?")) return;
    try {
      const { error } = await supabase.from("crm_team").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Deleted successfully" });
      fetchTeam();
    } catch (error: any) {
      toast({ title: "Error deleting", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "Sales Executive",
      is_active: true,
      grant_portal_access: false,
      portal_password: "",
    });
    setEditingId(null);
  };

  const openAdd = () => {
    resetForm();
    setFormData((f) => ({ ...f, portal_password: generateRandomPassword() }));
    setIsDialogOpen(true);
  };

  const openEdit = (member: any) => {
    setFormData({
      name: member.name || "",
      email: member.email || "",
      phone: member.phone || "",
      role: member.role || "Sales Executive",
      is_active: member.is_active,
      grant_portal_access: false,
      portal_password: "",
    });
    setEditingId(member.id);
    setIsDialogOpen(true);
  };

  // Open Grant Access Dialog
  const openGrantAccess = (member: any) => {
    if (accessCount >= crmPortalLimit && !member.auth_user_id) {
      setLimitModalOpen(true);
      return;
    }
    setGrantMember(member);
    setGrantEmail(member.email || "");
    setGrantPassword(generateRandomPassword());
    setGrantRole(member.role || "Sales Executive");
    setShowGrantPassword(false);
    setGrantModalOpen(true);
  };

  // Execute Grant Access
  const handleGrantAccess = async () => {
    if (!grantMember || !grantEmail || grantPassword.length < 6) return;
    setGrantLoading(true);
    try {
      const cleanEmail = grantEmail.trim().toLowerCase();
      const roleNormalized = grantRole.toLowerCase().includes("manager") ? "manager" : "sales_executive";

      const { data, error } = await supabase.rpc("grant_crm_portal_access", {
        p_team_member_id: grantMember.id,
        p_email: cleanEmail,
        p_password: grantPassword,
        p_role: roleNormalized,
      });

      if (error) throw error;

      toast({
        title: "CRM Portal Access Granted!",
        description: `Login credentials generated for ${grantMember.name}.`,
      });

      setGrantModalOpen(false);

      // Open Success Credentials Modal
      setCredentialsData({
        name: grantMember.name,
        email: cleanEmail,
        password: grantPassword,
        orgName: org?.name || "Your Company",
        portalUrl: crmPortalUrl,
        phone: grantMember.phone,
      });

      fetchTeam();
    } catch (err: any) {
      toast({
        title: "Failed to grant access",
        description: err.message || "Error creating portal login.",
        variant: "destructive",
      });
    } finally {
      setGrantLoading(false);
    }
  };

  // Open Reset Password Dialog
  const openResetPass = (member: any) => {
    setResetMember(member);
    setResetNewPassword(generateRandomPassword());
    setShowResetPassword(false);
    setResetModalOpen(true);
  };

  // Execute Reset Password
  const handleResetPassword = async () => {
    if (!resetMember || resetNewPassword.length < 6) return;
    setResetLoading(true);
    try {
      const { error } = await supabase.rpc("reset_crm_portal_password", {
        p_team_member_id: resetMember.id,
        p_new_password: resetNewPassword,
      });

      if (error) throw error;

      toast({
        title: "Password Updated!",
        description: `New password saved for ${resetMember.name}.`,
      });

      setResetModalOpen(false);

      setCredentialsData({
        name: resetMember.name,
        email: resetMember.email,
        password: resetNewPassword,
        orgName: org?.name || "Your Company",
        portalUrl: crmPortalUrl,
        phone: resetMember.phone,
      });

      fetchTeam();
    } catch (err: any) {
      toast({
        title: "Password update failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  // Execute Revoke Access
  const handleRevokeAccess = async (member: any) => {
    if (!confirm(`Are you sure you want to revoke CRM portal login access for ${member.name}?`)) return;
    try {
      const { error } = await supabase.rpc("revoke_crm_portal_access", {
        p_team_member_id: member.id,
      });
      if (error) throw error;

      toast({ title: "Access Revoked", description: `${member.name} can no longer log in to CRM portal.` });
      fetchTeam();
    } catch (err: any) {
      toast({ title: "Revoke failed", description: err.message, variant: "destructive" });
    }
  };

  const handleCopySingle = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: "Copied!", description: `${field} copied to clipboard.` });
  };

  const handleCopyAllCredentials = () => {
    if (!credentialsData) return;
    const msg = `Hello ${credentialsData.name},\n\nYour official CRM Portal login access for *${credentialsData.orgName}* has been set up.\n\n🌐 Portal URL: ${credentialsData.portalUrl}\n📧 Login Email: ${credentialsData.email}\n🔑 Password: ${credentialsData.password}\n\nPlease keep these credentials secure.`;
    navigator.clipboard.writeText(msg);
    toast({ title: "All Credentials Copied!", description: "Formatted login details ready to paste." });
  };

  const handleShareOnWhatsApp = () => {
    if (!credentialsData) return;
    const msg = `Hello ${credentialsData.name},\n\nYour official CRM Portal login access for *${credentialsData.orgName}* has been set up.\n\n🌐 *Portal URL:* ${credentialsData.portalUrl}\n📧 *Login Email:* ${credentialsData.email}\n🔑 *Password:* ${credentialsData.password}\n\nPlease log in and manage your assigned leads and pipelines.`;
    const cleanPhone = (credentialsData.phone || "").replace(/[^0-9]/g, "");
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  // Counts
  const accessCount = useMemo(() => team.filter((m) => !!m.auth_user_id).length, [team]);
  const noAccessCount = useMemo(() => team.filter((m) => !m.auth_user_id).length, [team]);

  // Filtered list
  const filteredTeam = useMemo(() => {
    return team
      .filter((t) => {
        if (activeFilterTab === "access") return !!t.auth_user_id;
        if (activeFilterTab === "no_access") return !t.auth_user_id;
        return true;
      })
      .filter(
        (t) =>
          t.name?.toLowerCase().includes(search.toLowerCase()) ||
          (t.email && t.email.toLowerCase().includes(search.toLowerCase())) ||
          (t.phone && t.phone.toLowerCase().includes(search.toLowerCase())) ||
          (t.role && t.role.toLowerCase().includes(search.toLowerCase()))
      );
  }, [team, activeFilterTab, search]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <Users className="w-6 h-6 text-blue-600" />
              Sales Team & Executives
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              Manage your sales representatives and grant them dedicated CRM portal logins scoped to {org?.name || "your organization"}.
            </p>
          </div>
          <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold">
            <Plus className="mr-2 h-4 w-4" /> Add Executive
          </Button>
        </div>

        {/* CRM Portal Access Quota Bar */}
        <div className="p-4 rounded-xl border bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/60 dark:from-slate-900 dark:via-blue-950/30 dark:to-slate-900 border-blue-200/80 dark:border-blue-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  CRM Portal Access: {accessCount} / {crmPortalLimit} Accounts Used
                </h3>
                {accessCount >= crmPortalLimit ? (
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 text-[11px] font-semibold">
                    Included Limit Reached (2/2)
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 text-[11px] font-semibold">
                    {crmPortalLimit - accessCount} Slot Available
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Base CRM includes 2 Sales Team portal logins. Additional members are ₹{CRM_ADDITIONAL_USER_COST_PER_MONTH}/Month per executive account.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            <Button
              size="sm"
              onClick={() => setLimitModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
            >
              + Add Member Slot (₹{CRM_ADDITIONAL_USER_COST_PER_MONTH}/mo)
            </Button>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Top Bar: Tabs & Search */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <Tabs
              value={activeFilterTab}
              onValueChange={(v: any) => setActiveFilterTab(v)}
              className="w-full sm:w-auto"
            >
              <TabsList className="bg-slate-200/60 dark:bg-slate-800 p-0.5">
                <TabsTrigger value="all" className="text-xs">
                  All ({team.length})
                </TabsTrigger>
                <TabsTrigger value="access" className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  Portal Access ({accessCount})
                </TabsTrigger>
                {noAccessCount > 0 && (
                  <TabsTrigger value="no_access" className="text-xs text-slate-600 dark:text-slate-400">
                    No Access ({noAccessCount})
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>

            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search executive, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-slate-50/50 dark:bg-slate-800/50">
                  <TableHead className="font-semibold">Executive</TableHead>
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="font-semibold">Contact Info</TableHead>
                  <TableHead className="font-semibold text-center">CRM Portal Access</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span>Loading sales team...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredTeam.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-500 text-sm">
                      No team members found. Click <strong>"Add Executive"</strong> to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTeam.map((member) => {
                    const initials = (member.name || "EX")
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);

                    const hasAccess = !!member.auth_user_id;

                    return (
                      <TableRow
                        key={member.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        {/* Name & Avatar */}
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold shrink-0 border border-blue-200 dark:border-blue-800">
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100">{member.name}</div>
                              <div className="text-[11px] text-muted-foreground">{member.role || "Sales Executive"}</div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Role */}
                        <TableCell className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {member.role || "Sales Executive"}
                        </TableCell>

                        {/* Contact */}
                        <TableCell>
                          <div className="flex flex-col text-xs text-slate-600 dark:text-slate-400">
                            <span className="font-medium text-foreground">{member.email || "-"}</span>
                            <span className="text-[11px] text-muted-foreground">{member.phone || "-"}</span>
                          </div>
                        </TableCell>

                        {/* CRM Portal Access */}
                        <TableCell className="text-center">
                          {hasAccess ? (
                            <div className="inline-flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 text-xs px-2 py-0.5 shadow-2xs font-medium"
                              >
                                <Check className="w-3 h-3 mr-1 text-emerald-600" />
                                Active
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-[11px] text-slate-600 hover:text-blue-600 px-1.5 gap-1"
                                onClick={() => openResetPass(member)}
                                title="Reset portal login password"
                              >
                                <KeyRound className="w-3 h-3 text-blue-600" />
                                Reset Pass
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2.5 gap-1.5 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 shadow-2xs font-semibold"
                              onClick={() => openGrantAccess(member)}
                            >
                              <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                              Grant Access
                            </Button>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          {member.is_active ? (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 text-xs font-medium"
                            >
                              Active
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 text-xs"
                            >
                              Inactive
                            </Badge>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(member)}>
                                <Edit2 className="mr-2 h-4 w-4" /> Edit Profile
                              </DropdownMenuItem>

                              {hasAccess ? (
                                <>
                                  <DropdownMenuItem onClick={() => openResetPass(member)}>
                                    <KeyRound className="mr-2 h-4 w-4 text-blue-600" /> Reset Password
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-amber-600"
                                    onClick={() => handleRevokeAccess(member)}
                                  >
                                    <ShieldCheck className="mr-2 h-4 w-4" /> Revoke Portal Access
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <DropdownMenuItem onClick={() => openGrantAccess(member)}>
                                  <KeyRound className="mr-2 h-4 w-4 text-blue-600" /> Grant Portal Access
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(member.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Executive
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* 1. ADD / EDIT EXECUTIVE DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Executive" : "Add Sales Executive"}</DialogTitle>
            <DialogDescription className="text-xs">
              {editingId
                ? "Update sales executive information and role."
                : "Add a new sales team member to manage leads and deals."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5 py-3">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Full Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Sumit Kumar"
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Role</Label>
                <Input
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="Sales Executive"
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Phone Number</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Email Address {formData.grant_portal_access ? "*" : ""}</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="sumit@company.com"
                className="h-8 text-xs"
              />
            </div>

            {/* If creating new executive, offer instant portal access toggle */}
            {!editingId && (
              accessCount >= crmPortalLimit ? (
                <div className="p-3 bg-amber-50/90 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900 space-y-2 mt-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-amber-900 dark:text-amber-200">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        CRM Portal Limit Reached ({accessCount}/{crmPortalLimit} Used)
                      </div>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300">
                        CRM includes 2 Sales Team logins. Additional members cost ₹{CRM_ADDITIONAL_USER_COST_PER_MONTH}/Month. You can still add this executive for pipeline tracking without portal login.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setLimitModalOpen(true)}
                      className="h-7 px-2 text-[11px] bg-amber-600 hover:bg-amber-700 text-white font-semibold shrink-0"
                    >
                      + Add Slot
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 space-y-2 mt-1">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-semibold text-blue-950 dark:text-blue-200 cursor-pointer">
                        Grant CRM Portal Access Immediately
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Creates official login account for this sales executive ({accessCount}/{crmPortalLimit} slots used).
                      </p>
                    </div>
                    <Switch
                      checked={formData.grant_portal_access}
                      onCheckedChange={(v) => setFormData({ ...formData, grant_portal_access: v })}
                    />
                  </div>

                {formData.grant_portal_access && (
                  <div className="pt-2 border-t border-blue-200/80 dark:border-blue-900/80 space-y-2">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <Label className="text-[11px] font-semibold">Initial Password *</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 text-[10px] text-blue-600 gap-1"
                          onClick={() => setFormData({ ...formData, portal_password: generateRandomPassword() })}
                        >
                          <RefreshCw className="w-2.5 h-2.5" /> Generate
                        </Button>
                      </div>
                      <Input
                        type="text"
                        value={formData.portal_password}
                        onChange={(e) => setFormData({ ...formData, portal_password: e.target.value })}
                        placeholder="Min 6 characters"
                        className="h-8 text-xs bg-white dark:bg-slate-900 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
            )}

            {editingId && (
              <div className="flex items-center gap-2 pt-1">
                <Switch
                  id="isActive"
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
                <Label htmlFor="isActive" className="text-xs cursor-pointer">
                  Active Status
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={
                saving ||
                !formData.name ||
                (formData.grant_portal_access && (!formData.email || formData.portal_password.length < 6))
              }
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? "Saving..." : "Save Executive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. GRANT ACCESS DIALOG */}
      <Dialog open={grantModalOpen} onOpenChange={setGrantModalOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 rounded-lg">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">Grant CRM Portal Access</DialogTitle>
                <DialogDescription className="text-xs">
                  Create dedicated CRM login credentials for <strong>{grantMember?.name}</strong>.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3.5 py-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border text-xs space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Target Organization: {org?.name}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Upon logging in, this executive will only view and manage leads, activities, and pipelines belonging to this business.
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Portal Login Email *</Label>
              <Input
                type="email"
                value={grantEmail}
                onChange={(e) => setGrantEmail(e.target.value)}
                placeholder="executive@company.com"
                className="h-8 text-xs bg-white dark:bg-slate-900"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold">Password (Min 6 chars) *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-[11px] text-blue-600 hover:text-blue-700 gap-1"
                  onClick={() => setGrantPassword(generateRandomPassword())}
                >
                  <RefreshCw className="w-3 h-3" /> Generate Random
                </Button>
              </div>
              <div className="relative">
                <Input
                  type={showGrantPassword ? "text" : "password"}
                  value={grantPassword}
                  onChange={(e) => setGrantPassword(e.target.value)}
                  placeholder="Enter strong password"
                  className="h-8 text-xs font-mono pr-8 bg-white dark:bg-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowGrantPassword(!showGrantPassword)}
                  className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                >
                  {showGrantPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">CRM Access Role</Label>
              <Input
                value={grantRole}
                onChange={(e) => setGrantRole(e.target.value)}
                placeholder="Sales Executive"
                className="h-8 text-xs bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setGrantModalOpen(false)} disabled={grantLoading}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleGrantAccess}
              disabled={grantLoading || !grantEmail || grantPassword.length < 6}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5"
            >
              {grantLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  Grant Access
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. RESET PASSWORD DIALOG */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 dark:bg-amber-950 text-amber-700 rounded-lg">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">Reset Password</DialogTitle>
                <DialogDescription className="text-xs">
                  Set a new CRM portal password for <strong>{resetMember?.name}</strong>.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="text-xs text-muted-foreground">
              Login Email: <strong className="text-foreground">{resetMember?.email}</strong>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold">New Password (Min 6 chars) *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-[11px] text-blue-600 hover:text-blue-700 gap-1"
                  onClick={() => setResetNewPassword(generateRandomPassword())}
                >
                  <RefreshCw className="w-3 h-3" /> Generate Random
                </Button>
              </div>
              <div className="relative">
                <Input
                  type={showResetPassword ? "text" : "password"}
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="New password"
                  className="h-8 text-xs font-mono pr-8 bg-white dark:bg-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                >
                  {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setResetModalOpen(false)} disabled={resetLoading}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleResetPassword}
              disabled={resetLoading || resetNewPassword.length < 6}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {resetLoading ? "Updating..." : "Save New Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. CREDENTIALS SUCCESS POPUP MODAL */}
      <Dialog open={!!credentialsData} onOpenChange={(open) => !open && setCredentialsData(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  CRM Portal Access Granted! 🎉
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Login credentials created for <strong>{credentialsData?.name}</strong>.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {credentialsData && (
            <div className="space-y-4 py-2">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/60 space-y-3">
                {/* Portal Link */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    CRM Portal URL
                  </span>
                  <div className="flex items-center justify-between bg-white dark:bg-slate-950 p-2 rounded border text-xs">
                    <a
                      href={credentialsData.portalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 font-medium truncate"
                    >
                      {credentialsData.portalUrl}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground shrink-0"
                      onClick={() => handleCopySingle(credentialsData.portalUrl, "Portal URL")}
                    >
                      {copiedField === "Portal URL" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>

                {/* Login Email */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Login Email
                  </span>
                  <div className="flex items-center justify-between bg-white dark:bg-slate-950 p-2 rounded border text-xs">
                    <span className="font-mono font-medium text-foreground">{credentialsData.email}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground shrink-0"
                      onClick={() => handleCopySingle(credentialsData.email, "Email")}
                    >
                      {copiedField === "Email" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Password
                  </span>
                  <div className="flex items-center justify-between bg-white dark:bg-slate-950 p-2 rounded border text-xs">
                    <span className="font-mono font-bold text-foreground text-sm tracking-wide">
                      {credentialsData.password}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground shrink-0"
                      onClick={() => handleCopySingle(credentialsData.password, "Password")}
                    >
                      {copiedField === "Password" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>

                {/* Org context reminder */}
                <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1.5 border-t">
                  <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Scoped to <strong>{credentialsData.orgName}</strong></span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs gap-1.5"
                  onClick={handleCopyAllCredentials}
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy All Details
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                  onClick={handleShareOnWhatsApp}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share on WhatsApp
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button size="sm" onClick={() => setCredentialsData(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CRM Portal Access Limit Reached Modal */}
      <Dialog open={limitModalOpen} onOpenChange={setLimitModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-2">
              <KeyRound className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">
              CRM Portal Access Limit Reached ({crmPortalLimit} / {crmPortalLimit} Used)
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-500 pt-1">
              Your business CRM subscription includes <strong>{crmPortalLimit} official Sales Team member accounts</strong> with login access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                <span>Included Portal Accounts:</span>
                <span className="font-bold text-slate-900 dark:text-white">{crmPortalLimit} Executives</span>
              </div>
              <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                <span>Currently Active Logins:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{accessCount} / {crmPortalLimit}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-blue-900 dark:text-blue-300 font-semibold">
                <span>Additional Sales Member Cost:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">₹{CRM_ADDITIONAL_USER_COST_PER_MONTH}/Month per user</span>
              </div>
            </div>

            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900 text-[11px] text-blue-900 dark:text-blue-200 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                Each Additional CRM Member Gets:
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-400">
                <li>Dedicated CRM Portal login at <code>https://crm.aassaybiz.com</code></li>
                <li>Personalized sales pipeline & assigned leads</li>
                <li>Follow-ups, notes & call logs scoped to their accounts</li>
                <li>Direct WhatsApp & Email outreach capability</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setLimitModalOpen(false)}
              className="w-full sm:w-auto text-xs"
            >
              Close
            </Button>
            <Button
              onClick={() => {
             setLimitModalOpen(false);
             setIsPlanModalOpen(true);
              }}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
            >
              + Add Member Slot (₹{CRM_ADDITIONAL_USER_COST_PER_MONTH}/mo)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Upgrade / Plan Selector Modal */}
      <PlanSelectorModal
        open={isPlanModalOpen}
        onOpenChange={setIsPlanModalOpen}
      />
    </div>
  );
}
