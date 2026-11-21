import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/app-store";
import { logAudit } from "@/lib/audit";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { hasModuleAccess, calculateEmployeeLimit, getPlanDisplayName } from "@/lib/subscription";
import { LockedFeature } from "@/components/subscription/LockedFeature";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import { LimitReachedAlert } from "@/components/shared/LimitReachedAlert";
import { useSubscription } from "@/hooks/use-subscription";
import { Plus, Pencil, Trash2, CalendarCheck, FileText, KeyRound, Calculator, HardHat, Clock, Users, IndianRupee, Settings2, Eye, EyeOff, ExternalLink, Download, FileCheck, Loader2, Copy, Check, Share2, ShieldCheck, MailCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import { formatCurrency } from "@/lib/currency";
import { NavLink } from "@/components/NavLink";
import { SalaryStructureDialog } from "@/components/payroll/SalaryStructureDialog";

interface Employee {
  id: string;
  org_id: string;
  name: string;
  employee_code: string | null;
  designation: string | null;
  phone: string | null;
  email: string | null;
  joining_date: string | null;
  monthly_salary: number;
  paid_leaves_per_month: number;
  is_active: boolean;
  auth_user_id: string | null;
  notes: string | null;
  wage_type?: "monthly" | "daily" | "hourly";
  daily_rate?: number;
  hourly_rate?: number;
  weekly_offs?: number[] | null;
}

const empty = {
  name: "", employee_code: "", designation: "", phone: "", email: "",
  joining_date: "", monthly_salary: "0", paid_leaves_per_month: "2",
  wage_type: "monthly", daily_rate: "500", hourly_rate: "75", 
  is_active: true, notes: "",
  pan: "", bank_account: "", bank_ifsc: "", address: "",
  basic_percent: "50", hra_percent: "20",
  pf_applicable: false, pf_percent: "12",
  esic_applicable: false, esic_percent: "0.75",
  pt_applicable: true, pt_amount: "200",
  grant_portal_access: false, portal_password: "",
  weekly_offs: [],
};

export default function EmployeesPage() {
  const org = useAppStore((s) => s.organization);
  const { user } = useAuth();
  const setOrganization = useAppStore((s) => s.setOrganization);
  const { toast } = useToast();
  const [rows, setRows] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [portalEmp, setPortalEmp] = useState<any>(null);
  const [portalEmail, setPortalEmail] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalSuccessData, setPortalSuccessData] = useState<{
    name: string;
    email: string;
    password: string;
    orgName?: string;
    portalUrl: string;
    emailSent?: boolean;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSuccessPassword, setShowSuccessPassword] = useState(false);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast({ title: "Copied!", description: `${fieldName} copied to clipboard.` });
    setTimeout(() => setCopiedField(null), 2500);
  };

  const getShareableText = () => {
    if (!portalSuccessData) return "";
    return `Hello ${portalSuccessData.name},\n\nYour Attendance Portal account has been created!\n\n🔗 Portal Link: ${portalSuccessData.portalUrl}\n📧 Email: ${portalSuccessData.email}\n🔑 Temporary Password: ${portalSuccessData.password}\n\nPlease click the link to log in and record your daily attendance (Clock-In / Clock-Out).`;
  };

  const [shifts, setShifts] = useState<any[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string>("none");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<string>("ID Proof");
  const [selectedEmpForStructure, setSelectedEmpForStructure] = useState<any | null>(null);
  const [structureModalOpen, setStructureModalOpen] = useState(false);
  const [activeTabFilter, setActiveTabFilter] = useState<"all" | "monthly" | "wagers" | "portal" | "no_portal">("all");
  const [dailyWagesEnabled, setDailyWagesEnabled] = useState<boolean>(true);
  const [existingDocs, setExistingDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [viewerDoc, setViewerDoc] = useState<any | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string>("");
  const [viewerLoading, setViewerLoading] = useState(false);
  const [uploadingInlineDoc, setUploadingInlineDoc] = useState(false);
  const [weekOffEmp, setWeekOffEmp] = useState<any | null>(null);
  const [quickWeekOffs, setQuickWeekOffs] = useState<number[]>([]);
  const [resetEmp, setResetEmp] = useState<any | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Subscription plan & dynamic capacity limits
  const { subscriptionPlan, employeeLimit } = useSubscription();
  const effectivePlan = subscriptionPlan || org?.subscription_plan || 'free';
  const planName = getPlanDisplayName(effectivePlan, employeeLimit);
  const currentLimit = calculateEmployeeLimit(effectivePlan, employeeLimit);
  const limitReached = rows.length >= currentLimit;

  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showLimitAlert, setShowLimitAlert] = useState(false);

  const handleAddEmployeeClick = () => {
    if (limitReached) {
      setShowLimitAlert(true);
    } else {
      openNew("monthly");
    }
  };

  const isImage = (name?: string) => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(name || "");
  const isPdf = (name?: string) => /\.pdf$/i.test(name || "");

  const loadEmpDocs = async (empId: string) => {
    if (!empId) { setExistingDocs([]); return; }
    setLoadingDocs(true);
    const { data } = await (supabase as any)
      .from("employee_documents")
      .select("*")
      .eq("employee_id", empId)
      .order("uploaded_at", { ascending: false });
    setExistingDocs(data || []);
    setLoadingDocs(false);
  };

  const getDocUrl = async (filePath: string) => {
    if (!filePath) return "";
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) return filePath;
    try {
      const { data } = await supabase.storage.from("employee-documents").createSignedUrl(filePath, 3600);
      if (data?.signedUrl) return data.signedUrl;
    } catch (e) {
      console.warn("createSignedUrl error, falling back to public url:", e);
    }
    const { data: pubData } = supabase.storage.from("employee-documents").getPublicUrl(filePath);
    return pubData?.publicUrl || "";
  };

  const viewDoc = async (d: any) => {
    setViewerDoc(d);
    setViewerLoading(true);
    const url = await getDocUrl(d.file_path);
    setViewerUrl(url);
    setViewerLoading(false);
  };

  const openDoc = async (d: any) => {
    const url = await getDocUrl(d.file_path);
    if (!url) { toast({ title: "Failed to open document", variant: "destructive" }); return; }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const downloadDoc = async (d: any) => {
    try {
      const url = await getDocUrl(d.file_path);
      if (!url) throw new Error("Could not retrieve file URL");
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = d.file_name || "document";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
        return;
      }
    } catch (e) {
      console.warn("Direct blob download failed, falling back to window.open", e);
    }
    const fallbackUrl = await getDocUrl(d.file_path);
    if (fallbackUrl) window.open(fallbackUrl, "_blank");
  };

  const deleteDoc = async (d: any) => {
    if (!confirm(`Delete document "${d.file_name}"?`)) return;
    try {
      if (d.file_path) {
        await supabase.storage.from("employee-documents").remove([d.file_path]);
      }
      await (supabase as any).from("employee_documents").delete().eq("id", d.id);
      toast({ title: "Document deleted" });
      if (editId) loadEmpDocs(editId);
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const handleUploadSingleDoc = async () => {
    if (!org?.id || !editId || !docFile) {
      toast({ title: "Please select a file first", variant: "destructive" });
      return;
    }
    setUploadingInlineDoc(true);
    try {
      const safeName = docFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${org.id}/${editId}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage.from("employee-documents").upload(path, docFile);
      if (upErr) throw upErr;
      const { error: insErr } = await (supabase as any).from("employee_documents").insert({
        org_id: org.id,
        employee_id: editId,
        doc_type: docType,
        file_path: path,
        file_name: docFile.name,
      });
      if (insErr) throw insErr;
      toast({ title: "Document uploaded successfully" });
      setDocFile(null);
      loadEmpDocs(editId);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingInlineDoc(false);
    }
  };

  const load = async () => {
    if (!org?.id) return;
    setLoading(true);
    try {
      const [empsRes, shiftsRes, orgRes] = await Promise.all([
        (supabase as any).from("employees").select("*").eq("org_id", org.id).order("created_at", { ascending: false }),
        (supabase as any).from("shifts").select("*").eq("org_id", org.id).order("created_at"),
        (supabase as any).from("organizations").select("*").eq("id", org.id).single(),
      ]);

      if (empsRes.error) {
        toast({ title: "Failed to load", description: empsRes.error.message, variant: "destructive" });
      } else {
        setRows(empsRes.data || []);
      }
      setShifts(shiftsRes.data || []);

      if (orgRes.data) {
        setOrganization(orgRes.data);
        setDailyWagesEnabled(orgRes.data.daily_wages_enabled !== false);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [org?.id]);

  const toggleDailyWages = async (enabled: boolean) => {
    if (!org?.id) return;
    setDailyWagesEnabled(enabled);
    const { error } = await (supabase as any).from("organizations").update({ daily_wages_enabled: enabled }).eq("id", org.id);
    if (!error) {
      setOrganization({ ...org, daily_wages_enabled: enabled } as any);
      toast({
        title: enabled ? "Daily & Hourly Wagers Activated" : "Daily & Hourly Wagers Deactivated",
        description: enabled ? "You can now add daily and hourly wage workers." : "Daily wages features hidden.",
      });
    }
  };

  const openNew = (presetType: "monthly" | "daily" | "hourly" = "monthly") => {
    setEditId(null);
    setForm({
      ...empty,
      wage_type: presetType,
    });
    setSelectedShiftId("none");
    setDocFile(null);
    setDocType("ID Proof");
    setExistingDocs([]);
    setOpen(true);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("add") === "1" || params.get("new") === "1") {
      openNew("monthly");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const openEdit = async (e: any) => {
    setEditId(e.id);
    setForm({
      name: e.name,
      employee_code: e.employee_code || "",
      designation: e.designation || "",
      phone: e.phone || "",
      email: e.email || "",
      joining_date: e.joining_date || "",
      wage_type: e.wage_type || "monthly",
      daily_rate: String(e.daily_rate ?? 500),
      hourly_rate: String(e.hourly_rate ?? 75),
      monthly_salary: String(e.monthly_salary ?? 0),
      paid_leaves_per_month: String(e.paid_leaves_per_month ?? 2),
      is_active: e.is_active,
      notes: e.notes || "",
      pan: e.pan || "",
      bank_account: e.bank_account || "",
      bank_ifsc: e.bank_ifsc || "",
      address: e.address || "",
      basic_percent: String(e.basic_percent ?? 50),
      hra_percent: String(e.hra_percent ?? 20),
      pf_applicable: !!e.pf_applicable,
      pf_percent: String((e.salary_structure as any)?.pf_percent ?? 12),
      esic_applicable: !!e.esic_applicable,
      esic_percent: String((e.salary_structure as any)?.esic_percent ?? 0.75),
      pt_applicable: (e.salary_structure as any)?.pt_applicable !== undefined ? !!(e.salary_structure as any)?.pt_applicable : true,
      pt_amount: String((e.salary_structure as any)?.pt_amount ?? 200),
      grant_portal_access: false,
      portal_password: "",
      weekly_offs: e.weekly_offs || [],
    });
    // Fetch current shift assignment for this employee
    const { data: assignData } = await (supabase as any)
      .from("employee_shifts")
      .select("shift_id")
      .eq("employee_id", e.id)
      .maybeSingle();
    setSelectedShiftId(assignData?.shift_id || "none");
    setDocFile(null);
    setDocType("ID Proof");
    loadEmpDocs(e.id);
    setOpen(true);
  };

  const save = async () => {
    const cleanEmail = form.email?.trim();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    const cleanPhone = form.phone?.replace(/\D/g, "");
    if (cleanPhone && cleanPhone.length !== 10) {
      toast({ title: "Invalid Mobile No.", description: "Mobile number must be exactly 10 digits.", variant: "destructive" });
      return;
    }
    if (!org?.id) return;
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }

    // Enforce plan-based employee limit on save (not just on button click)
    // Always fetch live count from DB to prevent race conditions or stale state
    if (!editId) {
      const { data: currentEmps, error: countErr } = await (supabase as any)
        .from("employees")
        .select("id")
        .eq("org_id", org.id);
      const empCount = !countErr && currentEmps ? (currentEmps as any[]).length : rows.length;
      if (empCount >= currentLimit) {
        toast({
          title: "Employee Limit Reached",
          description: `In ${planName}, the Employee limit is ${currentLimit}. Please upgrade your plan to add more employees!`,
          variant: "destructive"
        });
        setOpen(false);
        setShowLimitAlert(true);
        return;
      }
    }

    const wageType = form.wage_type || "monthly";

    // Auto-enable daily wages feature if adding a daily/hourly wager
    if ((wageType === "daily" || wageType === "hourly") && !dailyWagesEnabled) {
      await toggleDailyWages(true);
    }

    const existingStructure = (rows.find(r => r.id === editId) as any)?.salary_structure || {};

    const payload: any = {
      org_id: org.id,
      name: form.name.trim(),
      employee_code: form.employee_code || null,
      designation: form.designation || null,
      phone: form.phone || null,
      email: form.email || null,
      joining_date: form.joining_date || null,
      wage_type: wageType,
      daily_rate: Number(form.daily_rate) || 0,
      hourly_rate: Number(form.hourly_rate) || 0,
      monthly_salary: wageType === "monthly" ? (Number(form.monthly_salary) || 0) : (wageType === "daily" ? (Number(form.daily_rate) * 26) : (Number(form.hourly_rate) * 208)),
      paid_leaves_per_month: Number(form.paid_leaves_per_month) || 0,
      is_active: !!form.is_active,
      notes: form.notes || null,
      pan: form.pan || null,
      bank_account: form.bank_account || null,
      bank_ifsc: form.bank_ifsc || null,
      address: form.address || null,
      basic_percent: Number(form.basic_percent) || 0,
      hra_percent: Number(form.hra_percent) || 0,
      pf_applicable: !!form.pf_applicable,
      esic_applicable: !!form.esic_applicable,
      weekly_offs: (org as any).enable_individual_week_offs ? (form.weekly_offs || []) : null,
      salary_structure: {
        ...existingStructure,
        monthly_gross: wageType === "monthly" ? (Number(form.monthly_salary) || 0) : existingStructure.monthly_gross,
        overtime_rate_per_hour: existingStructure.overtime_rate_per_hour ? Number(existingStructure.overtime_rate_per_hour) : 0,
        basic_percent: Number(form.basic_percent) || 50,
        hra_percent: Number(form.hra_percent) || 20,
        pf_applicable: !!form.pf_applicable,
        pf_percent: Number(form.pf_percent) || 12,
        esic_applicable: !!form.esic_applicable,
        esic_percent: Number(form.esic_percent) || 0.75,
        pt_applicable: !!form.pt_applicable,
        pt_amount: Number(form.pt_amount) || 200,
      },
    };

    const q = editId
      ? (supabase as any).from("employees").update(payload).eq("id", editId)
      : (supabase as any).from("employees").insert(payload).select().single();
    const { data: savedEmp, error } = await q;
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }

    const empId = editId || savedEmp?.id;

    // Handle shift assignment
    if (empId) {
      if (docFile) {
        try {
          const safeName = docFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `${org.id}/${empId}/${Date.now()}_${safeName}`;
          const { error: upErr } = await supabase.storage.from("employee-documents").upload(path, docFile);
          if (!upErr) {
            await (supabase as any).from("employee_documents").insert({
              org_id: org.id, employee_id: empId, doc_type: docType, file_path: path, file_name: docFile.name
            });
            toast({ title: "Document uploaded successfully" });
          } else {
            toast({ title: "Document upload failed", description: upErr.message, variant: "destructive" });
          }
        } catch(e: any) {
          console.error("Doc upload error", e);
        }
      }

      if (selectedShiftId && selectedShiftId !== "none") {
        await (supabase as any).from("employee_shifts").upsert(
          { org_id: org.id, employee_id: empId, shift_id: selectedShiftId, effective_from: new Date().toISOString().split("T")[0] },
          { onConflict: "employee_id" }
        );
        await supabase.from("employees").update({ shift_id: selectedShiftId }).eq("id", empId);
      } else {
        await (supabase as any).from("employee_shifts").delete().eq("employee_id", empId);
        await supabase.from("employees").update({ shift_id: null }).eq("id", empId);
      }

      // Handle direct portal access creation on new employee if checked
      if (!editId && form.grant_portal_access && form.email && form.portal_password?.length >= 6) {
        try {
          const cleanEmail = form.email.trim().toLowerCase();
          // 1. Ensure attendance portal access is granted in DB
          await supabase.rpc("grant_attendance_portal_access", {
            p_employee_id: empId,
            p_email: cleanEmail,
            p_password: form.portal_password
          }).catch((rpcErr) => console.warn("RPC portal grant notice:", rpcErr));

          // 2. Dispatch the official attendance portal credentials email via AWS SES
          const { data: { session } } = await supabase.auth.getSession();
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://api.aassaybiz.com";
          const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTc5OTUzNTYwMH0.NRbb_rsz4M7sEltMAtEec-k5fMBFhLvJkAz57yjdWmU";
          
          let emailSent = false;
          try {
            const createRes = await fetch(`${supabaseUrl}/functions/v1/create-employee`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session?.access_token}`,
                "apikey": supabaseKey,
              },
              body: JSON.stringify({
                employee_id: empId,
                email: cleanEmail,
                password: form.portal_password,
              }),
            });
            const createData = await createRes.json();
            emailSent = createRes.ok && (createData.email_sent ?? true);
          } catch (e) {
            console.warn("create-employee email dispatch error:", e);
          }

          setPortalSuccessData({
            name: form.name,
            email: cleanEmail,
            password: form.portal_password,
            orgName: org?.name,
            portalUrl: "https://attendance.aassaybiz.com",
            emailSent: emailSent || true
          });
        } catch (authErr: any) {
          console.error("Portal access auto-grant error:", authErr);
        }
      }
    }

    toast({ title: editId ? "Staff member updated" : "Staff member added successfully" });
    setOpen(false);
    load();
  };

  const grantAccess = async () => {
    if (!portalEmp || !portalEmail || !portalPassword) return;
    setPortalLoading(true);
    try {
      const empName = portalEmp.name;
      const cleanEmail = portalEmail.trim().toLowerCase();

      // 1. Grant attendance portal access via direct DB RPC
      const { data: rpcData, error: rpcErr } = await supabase.rpc("grant_attendance_portal_access", {
        p_employee_id: portalEmp.id,
        p_email: cleanEmail,
        p_password: portalPassword
      });

      if (rpcErr) {
        console.warn("RPC attendance grant warning:", rpcErr);
      }

      // 2. Dispatch credentials email via create-employee
      let emailDispatched = false;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://api.aassaybiz.com";
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTc5OTUzNTYwMH0.NRbb_rsz4M7sEltMAtEec-k5fMBFhLvJkAz57yjdWmU";
        const res = await fetch(`${supabaseUrl}/functions/v1/create-employee`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
            "apikey": supabaseKey,
          },
          body: JSON.stringify({
            employee_id: portalEmp.id,
            email: cleanEmail,
            password: portalPassword
          })
        });
        const data = await res.json();
        emailDispatched = res.ok && (data.email_sent ?? true);
      } catch (mailEx) {
        console.warn("create-employee email dispatch notice:", mailEx);
      }
      
      setPortalEmp(null);
      setPortalSuccessData({
        name: empName,
        email: cleanEmail,
        password: portalPassword,
        orgName: rpcData?.org_name || org?.name,
        portalUrl: "https://attendance.aassaybiz.com",
        emailSent: emailDispatched || true
      });
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const resetEmployeePassword = async () => {
    if (!resetEmp || resetNewPassword.length < 6) return;
    setResetLoading(true);
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc("reset_attendance_portal_password", {
        p_employee_id: resetEmp.id,
        p_new_password: resetNewPassword
      });

      if (rpcErr) {
        const { data: { session } } = await supabase.auth.getSession();
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://api.aassaybiz.com";
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTc5OTUzNTYwMH0.NRbb_rsz4M7sEltMAtEec-k5fMBFhLvJkAz57yjdWmU";
        const res = await fetch(`${supabaseUrl}/functions/v1/reset-employee-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
            "apikey": supabaseKey,
          },
          body: JSON.stringify({ employee_id: resetEmp.id, new_password: resetNewPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to reset password");
      }

      toast({ title: "Password Reset", description: `Password updated for ${resetEmp.name}` });
      setResetEmp(null);
      setResetNewPassword("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setResetLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this staff member? Their attendance records will also be removed.")) return;
    try {
      await supabase.rpc("delete_attendance_portal_access", { p_employee_id: id });
    } catch (e) {
      console.warn("delete_attendance_portal_access warning:", e);
    }
    const { error } = await (supabase as any).from("employees").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); load(); }
  };


  const saveQuickWeekOff = async () => {
    if (!weekOffEmp) return;
    const { error } = await (supabase as any).from("employees").update({ weekly_offs: quickWeekOffs }).eq("id", weekOffEmp.id);
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Week Offs Updated", description: `Updated week offs for ${weekOffEmp.name}` });
      setWeekOffEmp(null);
      load();
    }
  };

  // Portal Access Counts
  const portalAccessCount = useMemo(() => rows.filter(r => !!r.auth_user_id).length, [rows]);
  const noPortalAccessCount = useMemo(() => rows.filter(r => !r.auth_user_id).length, [rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    if (activeTabFilter === "all") return rows;
    if (activeTabFilter === "monthly") {
      return rows.filter((r) => !r.wage_type || r.wage_type === "monthly");
    }
    if (activeTabFilter === "wagers") {
      return rows.filter((r) => r.wage_type === "daily" || r.wage_type === "hourly");
    }
    if (activeTabFilter === "portal") {
      return rows.filter((r) => !!r.auth_user_id);
    }
    if (activeTabFilter === "no_portal") {
      return rows.filter((r) => !r.auth_user_id);
    }
    return rows;
  }, [rows, activeTabFilter]);

  const currency = (org as any)?.currency || "INR";

  if (!hasModuleAccess(effectivePlan as any, 'hr')) {
    return (
      <div className="flex-1 bg-slate-50 min-h-screen">
        <LockedFeature 
          title="HR & Attendance Locked"
          description="HR and Employee Management features require the Business HR or Business Suite plan."
          onUpgradeClick={() => setShowUpgrade(true)}
        />
        <UpgradeModal 
          isOpen={showUpgrade} 
          onClose={() => setShowUpgrade(false)} 
          onSelectPlan={(p, i, price) => { window.location.href = `/settings`; }} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-semibold">Employees & Staff</h1>
            
            {/* Total Employee Capacity Badge */}
            <Badge
              variant="outline"
              className={`font-semibold text-xs py-1 px-2.5 flex items-center gap-1.5 shadow-sm ${
                limitReached 
                  ? "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800" 
                  : "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>
                Staff Capacity: <strong>{rows.length}</strong> / <strong>{currentLimit}</strong>
                {currentLimit > ((effectivePlan === 'suite' || effectivePlan === 'hr') ? 10 : 3) && currentLimit !== 25 && (
                  <span className="ml-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    (+{currentLimit > 25 ? currentLimit - 25 : currentLimit - ((effectivePlan === 'suite' || effectivePlan === 'hr') ? 10 : 3)} Extra)
                  </span>
                )}
                <span className="ml-1 opacity-80 font-normal">({planName})</span>
              </span>
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Manage monthly salaried staff, daily/hourly wage workers, and portal access.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" asChild>
            <NavLink to="/attendance"><CalendarCheck className="h-4 w-4 mr-2" />Attendance</NavLink>
          </Button>

          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
            onClick={handleAddEmployeeClick}
            id="add-employee-btn"
          >
            <Plus className="h-4 w-4 mr-1.5" />Add Employee
          </Button>

          {dailyWagesEnabled && (
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm"
              onClick={() => {
              if (limitReached) {
                setShowLimitAlert(true);
              }
              else openNew("daily");
            }}
            >
              <HardHat className="h-4 w-4 mr-1.5" />+ Add Daily / Hourly Wager
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border flex-wrap gap-2">
        <Tabs value={activeTabFilter} onValueChange={(v: any) => setActiveTabFilter(v)}>
          <TabsList className="bg-white dark:bg-slate-800 border flex-wrap h-auto p-1 gap-1">
            <TabsTrigger value="all" className="text-xs">
              <Users className="w-3.5 h-3.5 mr-1" />
              All Staff ({rows.length} / {currentLimit})
            </TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs">
              Monthly Salaried ({rows.filter(r => !r.wage_type || r.wage_type === 'monthly').length})
            </TabsTrigger>
            {dailyWagesEnabled && (
              <TabsTrigger value="wagers" className="text-xs text-amber-800 dark:text-amber-300 font-semibold">
                <HardHat className="w-3.5 h-3.5 mr-1 text-amber-600" />
                Daily & Hourly Wagers ({rows.filter(r => r.wage_type === 'daily' || r.wage_type === 'hourly').length})
              </TabsTrigger>
            )}
            <TabsTrigger value="portal" className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              <KeyRound className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Portal Access ({portalAccessCount})
            </TabsTrigger>
            {noPortalAccessCount > 0 && (
              <TabsTrigger value="no_portal" className="text-xs text-slate-600 dark:text-slate-400">
                No Portal ({noPortalAccessCount})
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Daily Wages System:</span>
          <Badge
            variant="outline"
            className={dailyWagesEnabled ? "bg-amber-50 text-amber-800 border-amber-300 text-[11px] font-semibold" : "bg-slate-100 text-slate-600 text-[11px]"}
          >
            {dailyWagesEnabled ? "Active" : "Off"}
          </Badge>
          <Switch
            checked={dailyWagesEnabled}
            onCheckedChange={toggleDailyWages}
            className="scale-75"
            title="Toggle Daily & Hourly Wages Worker features"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Pay / Rate</TableHead>
                <TableHead className="text-right">Paid Leaves/mo</TableHead>
                <TableHead className="font-semibold">Portal ({portalAccessCount})</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-36 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <Users className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-foreground">No staff members found</p>
                        <p className="text-xs text-muted-foreground mt-1">Get started by adding employees to track attendance and payroll.</p>
                      </div>
                      <Button size="sm" onClick={handleAddEmployeeClick} className="font-semibold shadow-sm mt-1">
                        <Plus className="h-4 w-4 mr-1.5" /> Add Employee
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredRows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{e.name}</span>
                      {e.wage_type === "daily" && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] py-0 font-bold">Daily Wager</Badge>
                      )}
                      {e.wage_type === "hourly" && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-300 text-[10px] py-0 font-bold">Hourly Wager</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{e.employee_code || "—"}</TableCell>
                  <TableCell>{e.designation || "—"}</TableCell>
                  <TableCell>{e.phone || "—"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {e.wage_type === "daily" ? (
                      <span className="text-amber-800 dark:text-amber-300 font-bold">
                        {formatCurrency(Number(e.daily_rate) || 0, currency)} / day
                      </span>
                    ) : e.wage_type === "hourly" ? (
                      <span className="text-purple-800 dark:text-purple-300 font-bold">
                        {formatCurrency(Number(e.hourly_rate) || 0, currency)} / hr
                      </span>
                    ) : (
                      <span>{formatCurrency(e.monthly_salary, currency)} / mo</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{e.paid_leaves_per_month}</TableCell>
                  <TableCell>
                    {e.auth_user_id ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-green-600 text-xs font-medium flex items-center gap-1">✓ Active</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 border-amber-400 text-amber-700 hover:bg-amber-50"
                          onClick={() => { setResetEmp(e); setResetNewPassword(""); }}
                        >
                          <KeyRound className="h-3 w-3 mr-1" /> Reset Pass
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setPortalEmp(e); setPortalEmail(e.email || ""); setPortalPassword(""); }}>
                        <KeyRound className="h-3 w-3 mr-1 text-primary" /> Grant Access
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>{e.is_active ? <span className="text-green-600 text-xs font-medium">Active</span> : <span className="text-muted-foreground text-xs">Inactive</span>}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" asChild title="Documents">
                        <NavLink to={`/employees/${e.id}/documents`}><FileText className="h-4 w-4" /></NavLink>
                      </Button>
                      {(!e.wage_type || e.wage_type === "monthly") && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Configure Salary & Benefits"
                          onClick={() => {
                            setSelectedEmpForStructure(e);
                            setStructureModalOpen(true);
                          }}
                        >
                          <Calculator className="h-4 w-4 text-emerald-600" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                      {((org as any)?.enable_individual_week_offs) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Change Week Off"
                          onClick={() => {
                            setWeekOffEmp(e);
                            setQuickWeekOffs(e.weekly_offs || []);
                          }}
                        >
                          <CalendarCheck className="h-4 w-4 text-blue-600" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Employee Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Staff Member" : (form.wage_type === "daily" ? "Add Daily Wage Worker" : form.wage_type === "hourly" ? "Add Hourly Wage Worker" : "Add Regular Employee")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editId ? "Update employee details, compensation, and settings." : "Fill in the details below to add a new employee to your organization."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-1">
            
            {/* Employment & Wage Model Selection */}
            {dailyWagesEnabled && (
              <div className="col-span-2 p-3 bg-slate-50 dark:bg-slate-900/60 border rounded-lg space-y-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Employment & Wage Model</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, wage_type: "monthly" })}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                      form.wage_type === "monthly" || !form.wage_type
                        ? "border-primary bg-primary/5 text-primary font-bold shadow-sm"
                        : "bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <div className="font-semibold text-sm">Monthly Salaried</div>
                    <div className="text-[10px] text-muted-foreground">Fixed monthly CTC & benefits</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, wage_type: "daily" })}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                      form.wage_type === "daily"
                        ? "border-amber-600 bg-amber-50 text-amber-900 font-bold shadow-sm"
                        : "bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <div className="font-semibold text-sm flex items-center gap-1">
                      <HardHat className="w-3.5 h-3.5 text-amber-600" /> Daily Wager
                    </div>
                    <div className="text-[10px] text-muted-foreground">Paid per day worked (₹/day)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, wage_type: "hourly" })}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                      form.wage_type === "hourly"
                        ? "border-purple-600 bg-purple-50 text-purple-900 font-bold shadow-sm"
                        : "bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <div className="font-semibold text-sm flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-purple-600" /> Hourly Wager
                    </div>
                    <div className="text-[10px] text-muted-foreground">Paid per hour clocked (₹/hr)</div>
                  </button>
                </div>
              </div>
            )}

            {(org as any)?.enable_individual_week_offs && (
              <div className="col-span-2 space-y-2 mb-2 p-3 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-lg">
                <Label className="text-blue-900 dark:text-blue-200">Individual Week Offs</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, idx) => {
                    const isSelected = form.weekly_offs?.includes(idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const current = form.weekly_offs || [];
                          if (isSelected) setForm({ ...form, weekly_offs: current.filter((x: number) => x !== idx) });
                          else setForm({ ...form, weekly_offs: [...current, idx] });
                        }}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${isSelected ? "bg-blue-600 text-white border-blue-600 font-medium shadow-sm" : "bg-white dark:bg-slate-800 text-muted-foreground border-slate-200 dark:border-slate-700 hover:border-blue-400"}`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
                <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80">Select specific week off days for this employee (Rotational Shift logic).</p>
              </div>
            )}

            <div className="col-span-2">
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ramesh Kumar" />
            </div>

            <div>
              <Label>Worker / Employee Code</Label>
              <Input value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} placeholder="e.g. WAG-001" />
            </div>

            <div>
              <Label>Designation / Role</Label>
              <Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Mason / Helper / Electrician" />
            </div>

            <div>
              <Label>Mobile No.</Label>
              <Input maxLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} placeholder="10-digit mobile number" />
            </div>

            <div>
              <Label>Email {form.wage_type !== 'monthly' && <span className="text-xs text-muted-foreground">(optional for wagers)</span>}</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@domain.com" />
            </div>

            <div>
              <Label>Joining Date</Label>
              <Input type="date" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} />
            </div>

            <div>
              <Label>PAN Card</Label>
              <Input value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value })} placeholder="ABCDE1234F" />
            </div>

            <div>
              <Label>Bank Account Number</Label>
              <Input value={form.bank_account} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} />
            </div>

            <div>
              <Label>Bank IFSC Code</Label>
              <Input value={form.bank_ifsc} onChange={(e) => setForm({ ...form, bank_ifsc: e.target.value })} />
            </div>

            <div className="col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>



            {/* Compensation Details based on Wage Type */}
            <div className="col-span-2 mt-2 pt-2 border-t">
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">Compensation & Pay Rates</div>
            </div>

            {form.wage_type === "daily" ? (
              <>
                <div className="col-span-1">
                  <Label className="font-semibold text-amber-900 dark:text-amber-300">Daily Wage Rate (₹ / Day) *</Label>
                  <Input type="number" value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: e.target.value })} placeholder="e.g. 500" />
                  <p className="text-[11px] text-muted-foreground mt-0.5">Calculated based on full / half days present.</p>
                </div>
                <div className="col-span-1">
                  <Label>Paid Leaves / Month</Label>
                  <Input type="number" step="0.5" value={form.paid_leaves_per_month} onChange={(e) => setForm({ ...form, paid_leaves_per_month: e.target.value })} />
                </div>
              </>
            ) : form.wage_type === "hourly" ? (
              <>
                <div className="col-span-1">
                  <Label className="font-semibold text-purple-900 dark:text-purple-300">Hourly Wage Rate (₹ / Hour) *</Label>
                  <Input type="number" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} placeholder="e.g. 75" />
                  <p className="text-[11px] text-muted-foreground mt-0.5">Calculated directly from exact clocked working hours.</p>
                </div>
                <div className="col-span-1">
                  <Label>Paid Leaves / Month</Label>
                  <Input type="number" step="0.5" value={form.paid_leaves_per_month} onChange={(e) => setForm({ ...form, paid_leaves_per_month: e.target.value })} />
                </div>
              </>
            ) : (
              <>
                <div><Label>Monthly Salary (CTC)</Label><Input type="number" value={form.monthly_salary} onChange={(e) => setForm({ ...form, monthly_salary: e.target.value })} placeholder="50000" /></div>
                <div><Label>Paid Leaves / Month</Label><Input type="number" step="0.5" value={form.paid_leaves_per_month} onChange={(e) => setForm({ ...form, paid_leaves_per_month: e.target.value })} /></div>
                <div><Label>Basic %</Label><Input type="number" value={form.basic_percent} onChange={(e) => setForm({ ...form, basic_percent: e.target.value })} placeholder="50" /></div>
                <div><Label>HRA %</Label><Input type="number" value={form.hra_percent} onChange={(e) => setForm({ ...form, hra_percent: e.target.value })} placeholder="20" /></div>
                
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground">Deductions & Statutory Settings</span>
                    <span className="text-[11px] text-muted-foreground">Custom percentage & amounts</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* PF */}
                    <div className="space-y-1.5 p-2.5 bg-white dark:bg-slate-950 rounded border">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">PF (EPF)</Label>
                        <Switch checked={form.pf_applicable} onCheckedChange={(v) => setForm({ ...form, pf_applicable: v })} />
                      </div>
                      {form.pf_applicable && (
                        <div className="relative pt-1">
                          <Input type="number" step="0.5" value={form.pf_percent} onChange={(e) => setForm({ ...form, pf_percent: e.target.value })} placeholder="12" className="h-7 text-xs pr-6 font-medium" />
                          <span className="absolute right-2 top-2 text-[11px] text-muted-foreground">%</span>
                        </div>
                      )}
                    </div>

                    {/* ESIC */}
                    <div className="space-y-1.5 p-2.5 bg-white dark:bg-slate-950 rounded border">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">ESIC</Label>
                        <Switch checked={form.esic_applicable} onCheckedChange={(v) => setForm({ ...form, esic_applicable: v })} />
                      </div>
                      {form.esic_applicable && (
                        <div className="relative pt-1">
                          <Input type="number" step="0.05" value={form.esic_percent} onChange={(e) => setForm({ ...form, esic_percent: e.target.value })} placeholder="0.75" className="h-7 text-xs pr-6 font-medium" />
                          <span className="absolute right-2 top-2 text-[11px] text-muted-foreground">%</span>
                        </div>
                      )}
                    </div>

                    {/* PT */}
                    <div className="space-y-1.5 p-2.5 bg-white dark:bg-slate-950 rounded border">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Prof. Tax (PT)</Label>
                        <Switch checked={form.pt_applicable} onCheckedChange={(v) => setForm({ ...form, pt_applicable: v })} />
                      </div>
                      {form.pt_applicable && (
                        <div className="relative pt-1">
                          <span className="absolute left-2 top-2 text-[11px] text-muted-foreground">₹</span>
                          <Input type="number" value={form.pt_amount} onChange={(e) => setForm({ ...form, pt_amount: e.target.value })} placeholder="200" className="h-7 text-xs pl-5 font-medium" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Employee Documents Section */}
            <div className="col-span-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-primary" />
                  Employee Documents
                </div>
                {editId && (
                  <Button size="sm" variant="outline" asChild className="h-7 text-xs">
                    <NavLink to={`/employees/${editId}/documents`}>
                      <ExternalLink className="h-3 w-3 mr-1" /> Full Documents Manager
                    </NavLink>
                  </Button>
                )}
              </div>

              {/* If editing and existing docs exist, visibly list them */}
              {editId && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Uploaded Documents</Label>
                  {loadingDocs ? (
                    <div className="text-xs text-muted-foreground p-3 border rounded-lg bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading documents...
                    </div>
                  ) : existingDocs.length === 0 ? (
                    <div className="text-xs text-muted-foreground p-3 border border-dashed rounded-lg bg-slate-50 dark:bg-slate-900/50 text-center">
                      No documents uploaded yet for this employee.
                    </div>
                  ) : (
                    <div className="border rounded-lg divide-y bg-white dark:bg-slate-950 overflow-hidden">
                      {existingDocs.map((d: any) => (
                        <div key={d.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <Badge variant="secondary" className="text-[10px] shrink-0 font-medium">
                              {d.doc_type || "Document"}
                            </Badge>
                            <span className="text-xs font-medium truncate max-w-[220px]" title={d.file_name}>
                              {d.file_name}
                            </span>
                            {d.uploaded_at && (
                              <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:inline">
                                ({format(parseISO(d.uploaded_at), "dd MMM yyyy")})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                              onClick={() => viewDoc(d)}
                              title="View Preview"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" /> View
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                              onClick={() => openDoc(d)}
                              title="Open in new tab"
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                              onClick={() => downloadDoc(d)}
                              title="Download File"
                            >
                              <Download className="h-3.5 w-3.5 mr-1" /> Download
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                              onClick={() => deleteDoc(d)}
                              title="Delete Document"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Upload New Document */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border rounded-lg space-y-3">
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {editId ? "Upload Another Document" : "Upload Document (Optional)"}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Document Type</Label>
                    <Select value={docType} onValueChange={setDocType}>
                      <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Aadhaar", "PAN", "Offer Letter", "Appointment Letter", "Salary Slip", "Bank Proof", "Resume", "ID Proof", "Other"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">File (Max 25MB)</Label>
                    <Input type="file" className="mt-1 h-8 text-xs" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        if (f.size > 25 * 1024 * 1024) {
                          toast({ title: "File too large", description: "Max file size is 25MB", variant: "destructive" });
                          e.target.value = "";
                          setDocFile(null);
                        } else {
                          setDocFile(f);
                        }
                      } else {
                        setDocFile(null);
                      }
                    }} />
                  </div>
                </div>
                {editId && docFile && (
                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleUploadSingleDoc}
                      disabled={uploadingInlineDoc}
                      className="h-8 text-xs"
                    >
                      {uploadingInlineDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                      Upload Now
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {!editId && (
              <div className="col-span-2 mt-2 p-3 bg-blue-50/50 dark:bg-slate-900/50 border border-blue-200 dark:border-blue-900 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold text-blue-900 dark:text-blue-300 cursor-pointer">
                      Grant Attendance Portal Access
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Enable if this worker will punch attendance themselves on mobile portal.
                    </p>
                  </div>
                  <Switch
                    checked={form.grant_portal_access}
                    onCheckedChange={(v) => setForm({ ...form, grant_portal_access: v })}
                  />
                </div>

                {form.grant_portal_access && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-200 dark:border-blue-900">
                    <div>
                      <Label className="text-xs">Portal Login Email *</Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="worker@company.com"
                        className="text-xs bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Temporary Password *</Label>
                      <Input
                        type="text"
                        value={form.portal_password}
                        onChange={(e) => setForm({ ...form, portal_password: e.target.value })}
                        placeholder="Min 6 characters"
                        className="text-xs bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="col-span-2 flex items-center gap-2 mt-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Active Staff Member</Label>
            </div>

            <div className="col-span-2">
              <Label>Notes & Remarks</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Skill category, site location, contractor name..." />
            </div>

            {/* Shift Assignment */}
            <div className="col-span-2 mt-2 pt-2 border-t">
              <div className="text-sm font-medium text-muted-foreground mb-2">Shift Assignment</div>
              {shifts.length === 0 ? (
                <p className="text-xs text-muted-foreground">No shifts defined yet. <NavLink to="/shifts" className="text-primary underline">Create a shift first.</NavLink></p>
              ) : (
                <div>
                  <Label>Assign Shift</Label>
                  <Select value={selectedShiftId} onValueChange={setSelectedShiftId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a shift..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Standard 9h / No shift assigned —</SelectItem>
                      {shifts.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} &nbsp;·&nbsp; {s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}
                          {s.grace_minutes ? ` · Grace ${s.grace_minutes}m` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Determines shift hours and auto overtime calculation threshold.</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editId ? "Save Changes" : "Save Staff Member"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant Portal Access Dialog */}
      <Dialog open={!!portalEmp} onOpenChange={(v) => { if (!v) setPortalEmp(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Attendance Portal Access</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Create login credentials for <strong>{portalEmp?.name}</strong> to access the Attendance Portal.
            They can log in immediately with this email & password — no email confirmation needed.
          </p>
          <div className="space-y-3 py-2">
            <div>
              <Label>Email</Label>
              <Input type="email" value={portalEmail} onChange={(e) => setPortalEmail(e.target.value)} placeholder="employee@company.com" />
            </div>
            <div>
              <Label>Temporary Password</Label>
              <Input type="text" value={portalPassword} onChange={(e) => setPortalPassword(e.target.value)} placeholder="Min 6 characters" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPortalEmp(null)}>Cancel</Button>
            <Button onClick={grantAccess} disabled={portalLoading || !portalEmail || portalPassword.length < 6}>
              {portalLoading ? "Creating..." : "Grant Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance Portal Access Success Dialog */}
      <Dialog open={!!portalSuccessData} onOpenChange={(v) => { if (!v) setPortalSuccessData(null); }}>
        <DialogContent className="max-w-md sm:max-w-lg border-orange-500/30 shadow-2xl">
          <DialogHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-full flex items-center justify-center mb-2 shadow-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">
              Attendance Portal Access Created! 🎉
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Login credentials have been configured for <strong>{portalSuccessData?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Direct Link Action Button */}
            <div className="p-3.5 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-900/50 rounded-xl text-center space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-400">
                Attendance Portal Website
              </p>
              <a
                href={portalSuccessData?.portalUrl || "https://attendance.aassaybiz.com"}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold py-5 shadow-md flex items-center justify-center gap-2 text-sm">
                  <span>Open Attendance Portal</span>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
              <p className="text-[11px] text-muted-foreground">
                URL: <span className="font-mono text-orange-600 dark:text-orange-400 select-all font-medium">{portalSuccessData?.portalUrl}</span>
              </p>
            </div>

            {/* Credentials Card */}
            <div className="p-4 bg-muted/50 border rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Login Credentials</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-primary hover:text-primary font-medium"
                  onClick={() => copyToClipboard(getShareableText(), "All Credentials")}
                >
                  {copiedField === "All Credentials" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy All Details</span>
                </Button>
              </div>

              {/* Email Row */}
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase">Login Email</div>
                  <div className="text-sm font-semibold font-mono truncate">{portalSuccessData?.email}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs gap-1 flex-shrink-0"
                  onClick={() => copyToClipboard(portalSuccessData?.email || "", "Email")}
                >
                  {copiedField === "Email" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">Copy</span>
                </Button>
              </div>

              {/* Password Row */}
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase">Temporary Password</div>
                  <div className="text-sm font-semibold font-mono tracking-wider">
                    {showSuccessPassword ? portalSuccessData?.password : "••••••••••••"}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs text-muted-foreground"
                    onClick={() => setShowSuccessPassword(!showSuccessPassword)}
                    title={showSuccessPassword ? "Hide password" : "Show password"}
                  >
                    {showSuccessPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs gap-1 flex-shrink-0"
                    onClick={() => copyToClipboard(portalSuccessData?.password || "", "Password")}
                  >
                    {copiedField === "Password" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">Copy</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Email Notification Status */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-start gap-2.5">
              <MailCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-emerald-800 dark:text-emerald-300">
                <strong className="block font-semibold">Login Email Dispatched</strong>
                Login instructions with a secure <em>Tap-to-Reveal Password</em> have been sent to <strong>{portalSuccessData?.email}</strong>.
              </div>
            </div>

            {/* WhatsApp Quick Share */}
            <div className="pt-1">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(getShareableText())}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button variant="outline" className="w-full border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-medium py-4 text-xs gap-2">
                  <Share2 className="w-4 h-4" />
                  <span>Share Credentials with Employee via WhatsApp</span>
                </Button>
              </a>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full sm:w-auto bg-primary text-primary-foreground font-semibold"
              onClick={() => setPortalSuccessData(null)}
            >
              Done / Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Employee Password Dialog */}
      <Dialog open={!!resetEmp} onOpenChange={(v) => { if (!v) { setResetEmp(null); setResetNewPassword(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Portal Password</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Set a new password for <strong>{resetEmp?.name}</strong>. No old password required — HR can reset directly.
          </p>
          <div className="space-y-3 py-2">
            <div>
              <Label>New Password</Label>
              <Input
                type="text"
                value={resetNewPassword}
                onChange={(e) => setResetNewPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
              {resetNewPassword.length > 0 && resetNewPassword.length < 6 && (
                <p className="text-xs text-destructive mt-1">Password must be at least 6 characters</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetEmp(null); setResetNewPassword(""); }}>Cancel</Button>
            <Button onClick={resetEmployeePassword} disabled={resetLoading || resetNewPassword.length < 6}>
              {resetLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Salary Structure & Benefits Dialog */}
      {structureModalOpen && (
        <SalaryStructureDialog
          open={structureModalOpen}
          onOpenChange={setStructureModalOpen}
          employee={selectedEmpForStructure}
          currency={currency}
          onSaved={load}
        />
      )}

      {weekOffEmp && (
        <Dialog open={!!weekOffEmp} onOpenChange={(o) => !o && setWeekOffEmp(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Change Week Off</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm font-medium">Select week-off days for <span className="font-bold">{weekOffEmp.name}</span></p>
              <div className="flex flex-wrap gap-2">
                {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, idx) => {
                  const isSelected = quickWeekOffs.includes(idx);
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (isSelected) setQuickWeekOffs(quickWeekOffs.filter((x) => x !== idx));
                        else setQuickWeekOffs([...quickWeekOffs, idx]);
                      }}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${isSelected ? "bg-blue-600 text-white border-blue-600 font-medium" : "bg-white dark:bg-slate-800 text-muted-foreground hover:border-blue-400"}`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setWeekOffEmp(null)}>Cancel</Button>
              <Button onClick={saveQuickWeekOff}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Document Preview Modal */}
      <Dialog open={!!viewerDoc} onOpenChange={(isOpen) => { if (!isOpen) { setViewerDoc(null); setViewerUrl(""); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <div>
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <Badge variant="outline">{viewerDoc?.doc_type || "Document"}</Badge>
                <span className="truncate max-w-sm">{viewerDoc?.file_name}</span>
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2 pr-6">
              <Button size="sm" variant="outline" onClick={() => openDoc(viewerDoc)}>
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open in Tab
              </Button>
              <Button size="sm" onClick={() => downloadDoc(viewerDoc)}>
                <Download className="w-3.5 h-3.5 mr-1" /> Download
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto flex items-center justify-center p-2 min-h-[350px] bg-slate-50 dark:bg-slate-900 rounded-lg my-3 border">
            {viewerLoading ? (
              <div className="text-center text-sm text-muted-foreground animate-pulse flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading preview...
              </div>
            ) : !viewerUrl ? (
              <div className="text-center text-sm text-red-500">Unable to load document preview.</div>
            ) : isImage(viewerDoc?.file_name) ? (
              <img src={viewerUrl} alt={viewerDoc?.file_name} className="max-h-[70vh] max-w-full object-contain rounded shadow" />
            ) : isPdf(viewerDoc?.file_name) ? (
              <iframe src={viewerUrl} title={viewerDoc?.file_name} className="w-full h-[65vh] rounded border-0" />
            ) : (
              <div className="text-center p-6 space-y-3">
                <FileText className="w-16 h-16 mx-auto text-blue-500 opacity-60" />
                <p className="text-sm font-medium">{viewerDoc?.file_name}</p>
                <p className="text-xs text-muted-foreground">Inline preview is not supported for this file format.</p>
                <div className="flex justify-center gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => openDoc(viewerDoc)}>
                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open File
                  </Button>
                  <Button size="sm" onClick={() => downloadDoc(viewerDoc)}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Download File
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    
      <LimitReachedAlert 
        isOpen={showLimitAlert} 
        onClose={() => setShowLimitAlert(false)} 
        onUpgrade={() => { setShowLimitAlert(false); setShowUpgrade(true); }} 
        title="Employee Limit Reached" 
        description={`In ${planName}, the Employee limit is ${currentLimit}. Want to add more employees? Please upgrade your plan!`} 
      />
      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} onSelectPlan={() => { window.location.href = '/settings'; }} />
    </div>
  );
}

