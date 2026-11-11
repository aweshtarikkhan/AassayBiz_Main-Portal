import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Receipt, 
  Bike, 
  Car, 
  Bus,
  Plane,
  Hotel,
  Utensils,
  Shirt,
  Coins, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Filter, 
  Download, 
  Eye, 
  Save, 
  IndianRupee, 
  Calendar, 
  User, 
  FileText, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  MapPin,
  Check,
  X,
  CreditCard,
  Tag,
  History,
  Navigation,
  Search,
  Hash
} from "lucide-react";
import { format, parseISO } from "date-fns";

export interface ExpenseItem {
  id: string;
  org_id: string;
  employee_id: string;
  claim_number?: string | null;
  category_id?: string;
  category_name: string;
  expense_type: string; // 'travel_km', 'manual', 'ticket'
  expense_date: string;
  amount: number;
  approved_amount?: number;
  vehicle_type?: string;
  distance_km?: number;
  rate_per_km?: number;
  travel_from?: string;
  travel_to?: string;
  trip_start_date?: string;
  trip_end_date?: string;
  outstation_details?: any;
  entries?: any[];
  description?: string;
  merchant_name?: string;
  invoice_number?: string;
  receipt_url?: string;
  receipt_mime_type?: string;
  status: "draft" | "submitted" | "approved" | "rejected" | "paid";
  rejection_reason?: string;
  reviewed_at?: string;
  paid_at?: string;
  payment_method?: string;
  payment_ref_no?: string;
  created_at: string;
  updated_at?: string;
  activity_history?: Array<{ at: string; actor: string; role: string; action: string; details?: string }>;
  employees?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    department?: string;
    designation?: string;
  };
}

export interface VehicleRate {
  id?: string;
  org_id: string;
  vehicle_type: string;
  rate_per_km: number;
  is_active: boolean;
}

export default function HRExpensesPage() {
  const org = useAppStore((s) => s.organization);
  const currentOrg = org || (() => {
    try {
      const raw = localStorage.getItem("app-storage");
      if (raw) return JSON.parse(raw)?.state?.organization || null;
    } catch {}
    return null;
  })();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [vehicleRates, setVehicleRates] = useState<Record<string, number>>({
    bike: 3.50,
    car: 8.00,
    auto: 5.00,
  });
  const [savingRates, setSavingRates] = useState(false);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialogs
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  const [receiptModalUrl, setReceiptModalUrl] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Payment Settlement Dialog
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState("bank_transfer");
  const [payoutRef, setPayoutRef] = useState("");

  // Partial Approval
  const [partialApproveOpen, setPartialApproveOpen] = useState(false);
  const [customApprovedAmount, setCustomApprovedAmount] = useState<string>("");

  // Outstation Breakdown Modal
  const [selectedOutstationItem, setSelectedOutstationItem] = useState<ExpenseItem | null>(null);

  useEffect(() => {
    if (currentOrg?.id) {
      loadAllData();

      const channel = supabase
        .channel("hr-expenses-live-" + currentOrg.id)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "employee_expenses", filter: `org_id=eq.${currentOrg.id}` },
          () => {
            loadAllData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentOrg?.id, selectedMonth]);

  const loadAllData = async () => {
    if (!currentOrg?.id) return;
    setLoading(true);
    try {
      // 1. Fetch Employees
      const { data: emps } = await supabase
        .from("employees")
        .select("id, name, email, phone, designation")
        .eq("org_id", currentOrg.id)
        .order("name");
      const empMap = new Map((emps || []).map((e: any) => [e.id, e]));
      setEmployees(emps || []);

      // 2. Fetch Vehicle Rates
      const { data: rates } = await supabase
        .from("vehicle_rate_configs")
        .select("*")
        .eq("org_id", currentOrg.id);
      if (rates && rates.length > 0) {
        const rateMap: Record<string, number> = { bike: 3.50, car: 8.00, auto: 5.00 };
        rates.forEach((r: any) => {
          rateMap[r.vehicle_type] = Number(r.rate_per_km);
        });
        setVehicleRates(rateMap);
      }

      // 3. Fetch Expenses (exclude employee unsent daily drafts)
      let expList: any[] = [];
      const { data: expData, error: expErr } = await supabase
        .from("employee_expenses")
        .select(`
          *,
          employees:employees!employee_expenses_employee_id_fkey (
            id,
            name,
            email,
            phone,
            designation
          )
        `)
        .eq("org_id", currentOrg.id)
        .neq("status", "draft")
        .order("expense_date", { ascending: false });

      if (expErr || !expData) {
        console.warn("Direct joined query had issue, falling back to basic query:", expErr);
        const { data: fallbackData, error: fbErr } = await supabase
          .from("employee_expenses")
          .select("*")
          .eq("org_id", currentOrg.id)
          .neq("status", "draft")
          .order("expense_date", { ascending: false });
        if (fbErr) throw fbErr;
        expList = fallbackData || [];
      } else {
        expList = expData;
      }

      // Ensure every expense item has employee details attached
      const enriched = expList.map((item: any) => {
        const emp = item.employees || empMap.get(item.employee_id);
        return {
          ...item,
          employees: emp ? {
            id: emp.id,
            name: emp.name || "Employee",
            email: emp.email || "",
            phone: emp.phone || "",
            designation: emp.designation || "Staff",
          } : {
            id: item.employee_id,
            name: "Employee",
            email: "",
            phone: "",
            designation: "Staff",
          }
        };
      });

      setExpenses(enriched);
    } catch (err: any) {
      console.error("Error loading expenses data:", err);
      toast({
        title: "Failed to load expenses",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save Vehicle Rates
  const handleSaveRates = async () => {
    if (!currentOrg?.id) return;
    setSavingRates(true);
    try {
      const updates = [
        { org_id: currentOrg.id, vehicle_type: "bike", rate_per_km: Number(vehicleRates.bike) || 3.50 },
        { org_id: currentOrg.id, vehicle_type: "car", rate_per_km: Number(vehicleRates.car) || 8.00 },
        { org_id: currentOrg.id, vehicle_type: "auto", rate_per_km: Number(vehicleRates.auto) || 5.00 },
      ];

      for (const item of updates) {
        const { error } = await supabase
          .from("vehicle_rate_configs")
          .upsert(item, { onConflict: "org_id,vehicle_type" });
        if (error) throw error;
      }

      toast({
        title: "Per-KM Rates Updated",
        description: "Vehicle reimbursement rates saved successfully for your business.",
      });
    } catch (err: any) {
      toast({
        title: "Error saving rates",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingRates(false);
    }
  };

  const getExpenseTimeline = (exp: ExpenseItem) => {
    if (Array.isArray(exp.activity_history) && exp.activity_history.length > 0) {
      return exp.activity_history;
    }
    const items: Array<{ at: string; actor: string; role: string; action: string; details?: string }> = [];
    if (exp.created_at) {
      items.push({
        at: exp.created_at,
        actor: exp.employees?.name || "Employee",
        role: "employee",
        action: "Claim Submitted",
        details: `${exp.expense_type === "outstation" ? "Outstation Tour" : exp.expense_type === "travel_km" ? "Local Travel" : exp.category_name || "Expense"} • ₹${Number(exp.amount || 0).toLocaleString("en-IN")}`,
      });
    }
    if (exp.updated_at && exp.updated_at !== exp.created_at && !exp.reviewed_at) {
      items.push({
        at: exp.updated_at,
        actor: exp.employees?.name || "Employee",
        role: "employee",
        action: "Edited Before Approval",
        details: `Updated claim amount ₹${Number(exp.amount || 0).toLocaleString("en-IN")}`,
      });
    }
    if (exp.reviewed_at) {
      if (exp.status === "rejected") {
        items.push({
          at: exp.reviewed_at,
          actor: "Business HR",
          role: "hr",
          action: "Rejected by HR",
          details: exp.rejection_reason || "Claim rejected",
        });
      } else {
        const isPartial = exp.approved_amount != null && Number(exp.approved_amount) < Number(exp.amount);
        items.push({
          at: exp.reviewed_at,
          actor: "Business HR",
          role: "hr",
          action: isPartial ? "Partially Approved by HR" : "Approved by HR",
          details: `Approved ₹${Number(exp.approved_amount ?? exp.amount).toLocaleString("en-IN")} of ₹${Number(exp.amount).toLocaleString("en-IN")}`,
        });
      }
    }
    if (exp.paid_at) {
      items.push({
        at: exp.paid_at,
        actor: "Business HR",
        role: "hr",
        action: "Paid / Settled",
        details: [exp.payment_method, exp.payment_ref_no ? `Ref: ${exp.payment_ref_no}` : ""].filter(Boolean).join(" • ") || "Reimbursement settled",
      });
    }
    return items;
  };

  // Approve single expense
  const handleApprove = async (exp: ExpenseItem, approvedAmt?: number) => {
    setActionLoading(true);
    try {
      const finalAmt = approvedAmt !== undefined ? approvedAmt : exp.amount;
      const nowIso = new Date().toISOString();
      const isPartial = Number(finalAmt) < Number(exp.amount);
      const nextHistory = [
        ...getExpenseTimeline(exp),
        {
          at: nowIso,
          actor: "Business HR",
          role: "hr",
          action: isPartial ? "Partially Approved by HR" : "Approved by HR",
          details: `Approved ₹${Number(finalAmt).toLocaleString("en-IN")} of ₹${Number(exp.amount).toLocaleString("en-IN")}`,
        },
      ];
      const { error } = await supabase
        .from("employee_expenses")
        .update({
          status: "approved",
          approved_amount: finalAmt,
          reviewed_at: nowIso,
          updated_at: nowIso,
          activity_history: nextHistory,
        } as any)
        .eq("id", exp.id);

      if (error) throw error;

      toast({
        title: "Expense Approved",
        description: `₹${finalAmt.toLocaleString("en-IN")} approved for ${exp.employees?.name || "employee"}.`,
      });

      // Local state update
      setExpenses((prev) =>
        prev.map((item) =>
          item.id === exp.id
            ? { ...item, status: "approved", approved_amount: finalAmt, reviewed_at: nowIso, updated_at: nowIso, activity_history: nextHistory }
            : item
        )
      );
      setSelectedOutstationItem((prev) =>
        prev && prev.id === exp.id
          ? { ...prev, status: "approved", approved_amount: finalAmt, reviewed_at: nowIso, updated_at: nowIso, activity_history: nextHistory }
          : prev
      );
      setPartialApproveOpen(false);
      setSelectedExpense(null);
    } catch (err: any) {
      toast({
        title: "Approval Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Reject single expense
  const handleReject = async () => {
    if (!selectedExpense) return;
    if (!rejectReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please specify why this claim is being rejected so the employee is informed.",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      const nowIso = new Date().toISOString();
      const reason = rejectReason.trim();
      const nextHistory = [
        ...getExpenseTimeline(selectedExpense),
        {
          at: nowIso,
          actor: "Business HR",
          role: "hr",
          action: "Rejected by HR",
          details: reason,
        },
      ];
      const { error } = await supabase
        .from("employee_expenses")
        .update({
          status: "rejected",
          rejection_reason: reason,
          reviewed_at: nowIso,
          updated_at: nowIso,
          activity_history: nextHistory,
        } as any)
        .eq("id", selectedExpense.id);

      if (error) throw error;

      toast({
        title: "Expense Rejected",
        description: "The claim has been marked as rejected with reason.",
      });

      setExpenses((prev) =>
        prev.map((item) =>
          item.id === selectedExpense.id
            ? { ...item, status: "rejected", rejection_reason: reason, reviewed_at: nowIso, updated_at: nowIso, activity_history: nextHistory }
            : item
        )
      );
      setSelectedOutstationItem((prev) =>
        prev && prev.id === selectedExpense.id
          ? { ...prev, status: "rejected", rejection_reason: reason, reviewed_at: nowIso, updated_at: nowIso, activity_history: nextHistory }
          : prev
      );
      setRejectModalOpen(false);
      setSelectedExpense(null);
      setRejectReason("");
    } catch (err: any) {
      toast({
        title: "Rejection Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Mark as Paid / Disbursed
  const handleMarkPaid = async () => {
    if (!selectedExpense) return;
    setActionLoading(true);
    try {
      const nowIso = new Date().toISOString();
      const refNo = payoutRef.trim() || null;
      const nextHistory = [
        ...getExpenseTimeline(selectedExpense),
        {
          at: nowIso,
          actor: "Business HR",
          role: "hr",
          action: "Paid / Settled",
          details: [payoutMethod, refNo ? `Ref: ${refNo}` : ""].filter(Boolean).join(" • ") || "Reimbursement settled",
        },
      ];
      const { error } = await supabase
        .from("employee_expenses")
        .update({
          status: "paid",
          paid_at: nowIso,
          updated_at: nowIso,
          payment_method: payoutMethod,
          payment_ref_no: refNo,
          activity_history: nextHistory,
        } as any)
        .eq("id", selectedExpense.id);

      if (error) throw error;

      toast({
        title: "Claim Settled",
        description: "Marked as paid and disbursed successfully.",
      });

      setExpenses((prev) =>
        prev.map((item) =>
          item.id === selectedExpense.id
            ? {
                ...item,
                status: "paid",
                paid_at: nowIso,
                updated_at: nowIso,
                payment_method: payoutMethod,
                payment_ref_no: refNo || undefined,
                activity_history: nextHistory,
              }
            : item
        )
      );
      setSelectedOutstationItem((prev) =>
        prev && prev.id === selectedExpense.id
          ? {
              ...prev,
              status: "paid",
              paid_at: nowIso,
              updated_at: nowIso,
              payment_method: payoutMethod,
              payment_ref_no: refNo || undefined,
              activity_history: nextHistory,
            }
          : prev
      );
      setPayoutModalOpen(false);
      setSelectedExpense(null);
      setPayoutRef("");
    } catch (err: any) {
      toast({
        title: "Settlement Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Approve all currently filtered pending
  const handleBulkApprove = async () => {
    const pendingList = filteredExpenses.filter((e) => e.status === "submitted");
    if (pendingList.length === 0) return;

    if (!confirm(`Are you sure you want to approve all ${pendingList.length} pending expense claims?`)) return;

    setActionLoading(true);
    try {
      const nowIso = new Date().toISOString();
      const ids = pendingList.map((e) => e.id);
      const nextHistMap: Record<string, any[]> = {};
      const results = await Promise.all(
        pendingList.map((exp) => {
          const hist = [
            ...getExpenseTimeline(exp),
            {
              at: nowIso,
              actor: "Business HR",
              role: "hr",
              action: "Approved by HR",
              details: `Bulk approved ₹${Number(exp.amount).toLocaleString("en-IN")}`,
            },
          ];
          nextHistMap[exp.id] = hist;
          return supabase
            .from("employee_expenses")
            .update({
              status: "approved",
              approved_amount: exp.amount,
              reviewed_at: nowIso,
              updated_at: nowIso,
              activity_history: hist,
            } as any)
            .eq("id", exp.id);
        })
      );
      const error = results.find((r) => r.error)?.error;

      if (error) throw error;

      toast({
        title: "Bulk Approval Complete",
        description: `Successfully approved ${pendingList.length} claims.`,
      });

      setExpenses((prev) =>
        prev.map((item) =>
          ids.includes(item.id)
            ? { ...item, status: "approved", approved_amount: item.amount, reviewed_at: nowIso, updated_at: nowIso, activity_history: nextHistMap[item.id] }
            : item
        )
      );
    } catch (err: any) {
      toast({
        title: "Bulk Approval Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "Claim No",
      "Date",
      "Employee Name",
      "Designation",
      "Type",
      "Category",
      "Distance (KM)",
      "Rate/KM",
      "From - To",
      "Claim Amount (INR)",
      "Approved Amount (INR)",
      "Status",
      "Description",
      "Receipt URL",
      "Payment Ref",
    ];

    const rows = searchedLedgerExpenses.map((e) => [
      e.claim_number || "",
      e.expense_date,
      `"${e.employees?.name || ""}"`,
      `"${e.employees?.designation || ""}"`,
      e.expense_type,
      `"${e.category_name}"`,
      e.distance_km || "",
      e.rate_per_km || "",
      `"${e.travel_from || ""} - ${e.travel_to || ""}"`,
      e.amount,
      e.approved_amount || e.amount,
      e.status,
      `"${(e.description || "").replace(/"/g, '""')}"`,
      e.receipt_url || "",
      `"${e.payment_ref_no || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Expenses_Report_${selectedMonth || "all"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Normalize sub-entries inside a monthly Local or Outstation card (with legacy 1-entry fallback)
  const getNormalizedEntries = (exp: ExpenseItem | null | undefined): any[] => {
    if (!exp) return [];
    if (Array.isArray(exp.entries) && exp.entries.length > 0) return exp.entries;
    return [
      {
        id: `legacy_${exp.id}`,
        expense_date: exp.expense_date,
        vehicle_type: exp.vehicle_type,
        distance_km: exp.distance_km,
        rate_per_km: exp.rate_per_km,
        travel_from: exp.travel_from,
        travel_to: exp.travel_to,
        trip_start_date: exp.trip_start_date,
        trip_end_date: exp.trip_end_date,
        amount: exp.amount,
        description: exp.description,
        receipt_url: exp.receipt_url,
        receipt_mime_type: exp.receipt_mime_type,
        outstation_details: exp.outstation_details,
      },
    ];
  };

  // Search helper (supports Claim # like 185412 or #185412, employee name, route, description, and sub-entries)
  const normalizedSearch = searchQuery.trim().toLowerCase().replace(/^#/, "");
  const matchesSearch = (e: ExpenseItem) => {
    if (!normalizedSearch) return true;
    const directMatch =
      (e.claim_number || "").toLowerCase().includes(normalizedSearch) ||
      (e.employees?.name || "").toLowerCase().includes(normalizedSearch) ||
      (e.category_name || "").toLowerCase().includes(normalizedSearch) ||
      (e.travel_from || "").toLowerCase().includes(normalizedSearch) ||
      (e.travel_to || "").toLowerCase().includes(normalizedSearch) ||
      (e.outstation_details?.trip_from || "").toLowerCase().includes(normalizedSearch) ||
      (e.outstation_details?.trip_to || "").toLowerCase().includes(normalizedSearch) ||
      (e.description || "").toLowerCase().includes(normalizedSearch);
    if (directMatch) return true;
    return getNormalizedEntries(e).some(
      (sub: any) =>
        (sub.travel_from || "").toLowerCase().includes(normalizedSearch) ||
        (sub.travel_to || "").toLowerCase().includes(normalizedSearch) ||
        (sub.description || "").toLowerCase().includes(normalizedSearch) ||
        (sub.vehicle_type || "").toLowerCase().includes(normalizedSearch) ||
        (sub.outstation_details?.trip_from || "").toLowerCase().includes(normalizedSearch) ||
        (sub.outstation_details?.trip_to || "").toLowerCase().includes(normalizedSearch) ||
        (sub.outstation_details?.purpose || "").toLowerCase().includes(normalizedSearch)
    );
  };

  // Filter Logic (always ignore unsent employee drafts)
  const submittedOnlyExpenses = expenses.filter((e) => e.status !== "draft");
  const filteredExpenses = submittedOnlyExpenses.filter((e) => {
    // Month filter
    if (selectedMonth && !e.expense_date.startsWith(selectedMonth)) return false;
    // Employee filter
    if (employeeFilter !== "all" && e.employee_id !== employeeFilter) return false;
    // Status filter
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    // Category filter
    if (categoryFilter !== "all" && e.category_name !== categoryFilter) return false;
    return true;
  });

  const searchedLedgerExpenses = filteredExpenses.filter(matchesSearch);
  const pendingExpenses = submittedOnlyExpenses.filter((e) => e.status === "submitted");
  const searchedPendingExpenses = pendingExpenses.filter(matchesSearch);

  // Summary Metrics
  const totalClaimed = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalApproved = filteredExpenses
    .filter((e) => e.status === "approved" || e.status === "paid")
    .reduce((sum, e) => sum + Number(e.approved_amount !== undefined ? e.approved_amount : e.amount), 0);
  const totalPaid = filteredExpenses
    .filter((e) => e.status === "paid")
    .reduce((sum, e) => sum + Number(e.approved_amount !== undefined ? e.approved_amount : e.amount), 0);
  const totalDistanceKM = filteredExpenses
    .filter((e) => e.expense_type === "travel_km")
    .reduce((sum, e) => sum + Number(e.distance_km || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100">Pending Review</Badge>;
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100">Approved</Badge>;
      case "paid":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100">Paid / Settled</Badge>;
      case "rejected":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-100">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Employee Expenses & Claims</h1>
              <p className="text-sm text-slate-500">
                Review daily claims, configure travel per-km rates, approve bills, and track monthly disbursements.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-44 bg-white shadow-sm"
          />
          <Button variant="outline" onClick={handleExportCSV} className="gap-2 shadow-sm">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Claimed</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">₹{totalClaimed.toLocaleString("en-IN")}</h3>
              <p className="text-xs text-slate-500 mt-1">{filteredExpenses.length} claims in {format(parseISO(`${selectedMonth}-01`), "MMMM yyyy")}</p>
            </div>
            <div className="p-3 bg-slate-100 rounded-xl text-slate-700">
              <IndianRupee className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Approved Amount</p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">₹{totalApproved.toLocaleString("en-IN")}</h3>
              <p className="text-xs text-slate-500 mt-1">Ready for settlement</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Disbursed / Paid</p>
              <h3 className="text-2xl font-bold text-blue-700 mt-1">₹{totalPaid.toLocaleString("en-IN")}</h3>
              <p className="text-xs text-slate-500 mt-1">Settled to bank/cash</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <CreditCard className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-slate-200">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Travel Logged</p>
              <h3 className="text-2xl font-bold text-amber-700 mt-1">{totalDistanceKM.toFixed(1)} <span className="text-sm font-semibold">KM</span></h3>
              <p className="text-xs text-slate-500 mt-1">Bike & Car distance logged</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
              <Bike className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="pending" className="gap-2 relative">
            <Clock className="h-4 w-4" />
            Pending Approvals
            {pendingExpenses.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-amber-500 text-white rounded-full">
                {pendingExpenses.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <FileText className="h-4 w-4" />
            All Expenses Ledger
          </TabsTrigger>
          <TabsTrigger value="rates" className="gap-2">
            <Bike className="h-4 w-4" />
            Vehicle Per-KM Rates
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PENDING APPROVALS */}
        <TabsContent value="pending" className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900">Pending Expense Claims</CardTitle>
                <CardDescription>
                  Review submitted bills, 6-digit claim tracking numbers, travel distances, and approve or reject.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-64">
                  <Search className="h-4 w-4 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Claim # or employee..."
                    className="pl-8 h-9 text-xs bg-white"
                  />
                </div>
                {pendingExpenses.length > 0 && (
                  <Button 
                    onClick={handleBulkApprove} 
                    disabled={actionLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm h-9"
                  >
                    <Check className="h-4 w-4" /> Approve All ({pendingExpenses.length})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {searchedPendingExpenses.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                  <h4 className="text-base font-semibold text-slate-700">
                    {normalizedSearch ? "No Matching Pending Claims" : "All Caught Up!"}
                  </h4>
                  <p className="text-sm text-slate-500">
                    {normalizedSearch
                      ? `No pending claims match "${searchQuery}". Try clearing the search filter.`
                      : "There are no pending expense claims awaiting HR review."}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-32">Date / Claim #</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type & Category</TableHead>
                      <TableHead>Claim Details</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center w-20">Receipt</TableHead>
                      <TableHead className="text-right w-44">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchedPendingExpenses.map((exp) => {
                      const rowEntries = getNormalizedEntries(exp);
                      const entryCount = rowEntries.length;
                      return (
                      <TableRow key={exp.id} onClick={() => setSelectedOutstationItem(exp)} className="hover:bg-slate-50/70 cursor-pointer" title="Click to view all entries, details & history">
                        <TableCell className="font-medium text-xs text-slate-600">
                          <div>{format(parseISO(exp.expense_date), "dd MMM yyyy")}</div>
                          {exp.claim_number && (
                            <span className="inline-flex items-center gap-0.5 mt-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 font-mono text-[11px] font-bold">
                              #{exp.claim_number}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-900 text-sm">{exp.employees?.name}</div>
                          <div className="text-xs text-slate-500">{exp.employees?.designation || "Staff"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap font-medium text-slate-800 text-sm">
                            {exp.expense_type === "outstation" ? (
                              <Badge variant="outline" className="gap-1 border-indigo-300 text-indigo-800 bg-indigo-50 font-semibold text-xs">
                                <Plane className="h-3 w-3" /> Outstation {entryCount > 1 ? "Monthly" : "Trip"}
                              </Badge>
                            ) : exp.expense_type === "travel_km" ? (
                              <Badge variant="outline" className="gap-1 border-amber-300 text-amber-800 bg-amber-50 font-semibold text-xs">
                                {exp.vehicle_type === 'car' ? <Car className="h-3 w-3" /> : exp.vehicle_type === 'auto' ? <Bus className="h-3 w-3" /> : <Bike className="h-3 w-3" />}
                                {entryCount > 1 ? "Local Monthly" : `Local (${exp.vehicle_type === 'car' ? 'Car' : exp.vehicle_type === 'auto' ? 'Cab/Auto' : 'Bike'})`}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-slate-300">
                                {exp.category_name}
                              </Badge>
                            )}
                            {entryCount > 1 && (
                              <Badge className="bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-100 text-[10px] font-bold">
                                {entryCount} {exp.expense_type === "outstation" ? "Trips" : "Daily Entries"}
                              </Badge>
                            )}
                          </div>
                          {exp.merchant_name && (
                            <div className="text-xs text-slate-500 mt-0.5">Vendor: {exp.merchant_name}</div>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {exp.expense_type === "outstation" ? (
                            <div className="text-xs space-y-1">
                              <div className="font-semibold text-slate-900 flex items-center gap-1 flex-wrap">
                                <MapPin className="h-3 w-3 shrink-0 text-indigo-500" />
                                <span>
                                  {entryCount > 1
                                    ? `${rowEntries[0]?.travel_from || exp.travel_from} → ${rowEntries[0]?.travel_to || exp.travel_to} + ${entryCount - 1} more`
                                    : `${exp.outstation_details?.trip_from || exp.travel_from} → ${exp.outstation_details?.trip_to || exp.travel_to}`}
                                </span>
                                <Badge className="bg-indigo-100 text-indigo-700 text-[10px] px-1 py-0 hover:bg-indigo-100 ml-1">
                                  {entryCount > 1 ? `${entryCount} Trips` : `${exp.outstation_details?.trip_days || 1} Days`}
                                </Badge>
                              </div>
                              <div className="text-slate-500 line-clamp-1 text-[11px]">
                                {exp.outstation_details?.purpose || exp.description || "Official tour"}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); setSelectedOutstationItem(exp); }}
                                className="h-6 text-[11px] px-2 gap-1 text-indigo-700 border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100"
                              >
                                <Eye className="h-3 w-3" /> {entryCount > 1 ? `View All Trips (${entryCount})` : "View Tour Breakdown"}
                              </Button>
                            </div>
                          ) : exp.expense_type === "travel_km" ? (
                            <div className="text-xs space-y-1">
                              <span className="font-semibold text-slate-800 block">
                                {entryCount > 1
                                  ? `Total ${exp.distance_km} KM across ${entryCount} daily entries`
                                  : `${exp.distance_km} KM @ ₹${exp.rate_per_km}/KM (${exp.vehicle_type?.toUpperCase()})`}
                              </span>
                              {exp.travel_from && exp.travel_to && entryCount <= 1 && (
                                <div className="text-slate-500 flex items-center gap-1 truncate">
                                  <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                                  <span>{exp.travel_from} → {exp.travel_to}</span>
                                </div>
                              )}
                              {entryCount > 1 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); setSelectedOutstationItem(exp); }}
                                  className="h-6 text-[11px] px-2 gap-1 text-amber-800 border-amber-200 bg-amber-50/70 hover:bg-amber-100"
                                >
                                  <Eye className="h-3 w-3" /> View All Entries ({entryCount})
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-600 line-clamp-2">
                              {exp.description || "No description provided"}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-slate-900 text-base">₹{Number(exp.amount).toLocaleString("en-IN")}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {exp.receipt_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); setReceiptModalUrl(exp.receipt_url!); }}
                              className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                              title="View uploaded receipt / bill"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleApprove(exp); }}
                              disabled={actionLoading}
                              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 gap-1"
                              title="Full Approve"
                            >
                              <Check className="h-3.5 w-3.5" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedExpense(exp);
                                setCustomApprovedAmount(String(exp.amount));
                                setPartialApproveOpen(true);
                              }}
                              className="h-8 text-xs px-2"
                              title="Partial Approve"
                            >
                              ₹
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedExpense(exp);
                                setRejectModalOpen(true);
                              }}
                              className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs px-2"
                              title="Reject"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: ALL EXPENSES LEDGER */}
        <TabsContent value="all" className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="p-4 border-b">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-600 uppercase">Filters:</span>
                </div>

                <div className="relative w-64">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Claim # (e.g. 185412), name..."
                    className="pl-8 h-8 text-xs bg-white"
                  />
                </div>

                <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                  <SelectTrigger className="w-44 h-8 text-xs bg-white">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36 h-8 text-xs bg-white">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="submitted">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <div className="ml-auto text-xs text-slate-500">
                  Showing <b>{searchedLedgerExpenses.length}</b> records
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {searchedLedgerExpenses.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <p className="text-sm">No expense records found matching selected filters or Claim #.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-32">Date / Claim #</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Category / Type</TableHead>
                      <TableHead>Description / Trip</TableHead>
                      <TableHead className="text-right">Claim Amount</TableHead>
                      <TableHead className="text-right">Approved Amount</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center w-20">Receipt</TableHead>
                      <TableHead className="text-right w-28">Disburse</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchedLedgerExpenses.map((exp) => {
                      const rowEntries = getNormalizedEntries(exp);
                      const entryCount = rowEntries.length;
                      return (
                      <TableRow key={exp.id} onClick={() => setSelectedOutstationItem(exp)} className="hover:bg-slate-50/70 cursor-pointer" title="Click to view all entries, details & history">
                        <TableCell className="font-medium text-xs text-slate-600">
                          <div>{format(parseISO(exp.expense_date), "dd MMM yyyy")}</div>
                          {exp.claim_number && (
                            <span className="inline-flex items-center gap-0.5 mt-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 font-mono text-[11px] font-bold">
                              #{exp.claim_number}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-900 text-sm">{exp.employees?.name}</div>
                          <div className="text-xs text-slate-500">{exp.employees?.designation || "Staff"}</div>
                        </TableCell>
                        <TableCell>
                          {exp.expense_type === "outstation" ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              <Badge variant="outline" className="gap-1 border-indigo-300 text-indigo-800 bg-indigo-50 font-semibold text-xs">
                                <Plane className="h-3 w-3" /> Outstation
                              </Badge>
                              {entryCount > 1 && (
                                <Badge className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">
                                  {entryCount} Trips
                                </Badge>
                              )}
                            </div>
                          ) : exp.expense_type === "travel_km" ? (
                            <div>
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-xs font-semibold text-slate-800">
                                  {entryCount > 1
                                    ? "Local Monthly"
                                    : `Local (${exp.vehicle_type === 'car' ? 'Car' : exp.vehicle_type === 'auto' ? 'Cab/Auto' : 'Bike'})`}
                                </span>
                                {entryCount > 1 && (
                                  <Badge className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">
                                    {entryCount} Entries
                                  </Badge>
                                )}
                              </div>
                              <span className="block text-[11px] text-amber-700 font-medium">
                                {entryCount > 1
                                  ? `Total ${exp.distance_km} KM logged`
                                  : `${exp.distance_km} KM @ ₹${exp.rate_per_km}/KM`}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-slate-800">{exp.category_name}</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs text-xs text-slate-600">
                          {exp.expense_type === "outstation" ? (
                            <div className="space-y-1">
                              <div className="font-semibold text-slate-900 flex items-center gap-1 flex-wrap">
                                <MapPin className="h-3 w-3 shrink-0 text-indigo-500" />
                                <span>
                                  {entryCount > 1
                                    ? `${rowEntries[0]?.travel_from || exp.travel_from} → ${rowEntries[0]?.travel_to || exp.travel_to} + ${entryCount - 1} more`
                                    : `${exp.outstation_details?.trip_from || exp.travel_from} → ${exp.outstation_details?.trip_to || exp.travel_to}`}
                                </span>
                                <Badge className="bg-indigo-100 text-indigo-700 text-[10px] px-1 py-0 hover:bg-indigo-100 ml-1">
                                  {entryCount > 1 ? `${entryCount} Trips` : `${exp.outstation_details?.trip_days || 1} Days`}
                                </Badge>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); setSelectedOutstationItem(exp); }}
                                className="h-6 text-[11px] px-2 gap-1 text-indigo-700 border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100"
                              >
                                <Eye className="h-3 w-3" /> {entryCount > 1 ? `View All Trips (${entryCount})` : "View Tour Breakdown"}
                              </Button>
                            </div>
                          ) : exp.expense_type === "travel_km" ? (
                            <div className="space-y-1">
                              <span className="block truncate">
                                {entryCount > 1
                                  ? `${rowEntries[0]?.travel_from || 'Start'} → ${rowEntries[0]?.travel_to || 'End'} + ${entryCount - 1} more`
                                  : `${exp.travel_from} → ${exp.travel_to}`}
                              </span>
                              {entryCount > 1 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); setSelectedOutstationItem(exp); }}
                                  className="h-6 text-[11px] px-2 gap-1 text-amber-800 border-amber-200 bg-amber-50/70 hover:bg-amber-100"
                                >
                                  <Eye className="h-3 w-3" /> View All Entries ({entryCount})
                                </Button>
                              )}
                            </div>
                          ) : (
                            <span className="truncate block">{exp.description || exp.merchant_name || "—"}</span>
                          )}
                          {exp.rejection_reason && (
                            <span className="block text-rose-600 text-[11px] font-medium mt-0.5">
                              Rejected: {exp.rejection_reason}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-900">
                          ₹{Number(exp.amount).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-700">
                          {exp.status === "approved" || exp.status === "paid" ? (
                            `₹${Number(exp.approved_amount !== undefined ? exp.approved_amount : exp.amount).toLocaleString("en-IN")}`
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(exp.status)}
                        </TableCell>
                        <TableCell className="text-center">
                          {exp.receipt_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); setReceiptModalUrl(exp.receipt_url!); }}
                              className="h-7 w-7 p-0 text-indigo-600 hover:text-indigo-800"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {exp.status === "approved" ? (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedExpense(exp);
                                setPayoutModalOpen(true);
                              }}
                              className="h-7 bg-blue-600 hover:bg-blue-700 text-white text-xs px-2.5"
                            >
                              Pay Now
                            </Button>
                          ) : exp.status === "paid" ? (
                            <div className="text-[11px] text-slate-500 font-medium">
                              Paid {exp.paid_at ? format(parseISO(exp.paid_at), "dd/MM") : ""}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: VEHICLE PER-KM RATE SETTINGS */}
        <TabsContent value="rates" className="space-y-4">
          <Card className="max-w-2xl border-slate-200 shadow-sm">
            <CardHeader className="p-5 border-b">
              <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Bike className="h-5 w-5 text-indigo-600" />
                Vehicle & Travel Per-KM Rate Settings
              </CardTitle>
              <CardDescription>
                Configure how much your business reimburses employees per kilometer when using personal vehicles (Bike, Car, Auto).
                Whenever an employee submits a travel claim by entering distance (KM), their payable amount is calculated automatically using these rates.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Two-Wheeler / Bike */}
                <div className="p-4 border rounded-xl bg-slate-50/50 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
                    <Bike className="h-5 w-5" /> Two-Wheeler / Bike
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Rate per Kilometer (₹ / KM)</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-2.5 text-slate-500 text-sm">₹</span>
                      <Input
                        type="number"
                        step="0.25"
                        min="0"
                        value={vehicleRates.bike}
                        onChange={(e) => setVehicleRates({ ...vehicleRates, bike: parseFloat(e.target.value) || 0 })}
                        className="pl-7 bg-white font-bold"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">Standard market rate: ₹3.00 - ₹4.50 / KM</p>
                </div>

                {/* Four-Wheeler / Car */}
                <div className="p-4 border rounded-xl bg-slate-50/50 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                    <Car className="h-5 w-5" /> Four-Wheeler / Car
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Rate per Kilometer (₹ / KM)</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-2.5 text-slate-500 text-sm">₹</span>
                      <Input
                        type="number"
                        step="0.50"
                        min="0"
                        value={vehicleRates.car}
                        onChange={(e) => setVehicleRates({ ...vehicleRates, car: parseFloat(e.target.value) || 0 })}
                        className="pl-7 bg-white font-bold"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">Standard market rate: ₹7.00 - ₹10.00 / KM</p>
                </div>

                {/* Auto / Three-Wheeler */}
                <div className="p-4 border rounded-xl bg-slate-50/50 space-y-3">
                  <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
                    <Bus className="h-5 w-5" /> Auto / Public Cab
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Rate per Kilometer (₹ / KM)</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-2.5 text-slate-500 text-sm">₹</span>
                      <Input
                        type="number"
                        step="0.50"
                        min="0"
                        value={vehicleRates.auto}
                        onChange={(e) => setVehicleRates({ ...vehicleRates, auto: parseFloat(e.target.value) || 0 })}
                        className="pl-7 bg-white font-bold"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">Standard rate: ₹4.50 - ₹6.00 / KM</p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button 
                  onClick={handleSaveRates} 
                  disabled={savingRates} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                  <Save className="h-4 w-4" />
                  {savingRates ? "Saving Rates..." : "Save Vehicle Rates"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: VIEW RECEIPT */}
      <Dialog open={!!receiptModalUrl} onOpenChange={(open) => !open && setReceiptModalUrl(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              Uploaded Bill / Receipt
              {receiptModalUrl && (
                <a
                  href={receiptModalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-normal text-indigo-600 flex items-center gap-1 hover:underline"
                >
                  Open in New Tab <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-900/5">
            {receiptModalUrl?.toLowerCase().includes(".pdf") ? (
              <iframe src={receiptModalUrl} className="w-full h-[60vh] border rounded" />
            ) : (
              <img src={receiptModalUrl || ""} alt="Receipt" className="max-h-[65vh] object-contain rounded shadow" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: REJECT REASON */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> Reject Expense Claim
            </DialogTitle>
            <DialogDescription>
              Please explain why this claim for ₹{selectedExpense?.amount} is rejected. The employee will see this reason in their portal.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label className="text-xs font-semibold">Rejection Reason *</Label>
            <Textarea
              rows={3}
              placeholder="e.g. Bill is blurry, claim exceeded allowed food cap, distance doesn't match client route..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="text-sm"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleReject} 
              disabled={actionLoading}
            >
              {actionLoading ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: PARTIAL APPROVE */}
      <Dialog open={partialApproveOpen} onOpenChange={setPartialApproveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Partial Approval</DialogTitle>
            <DialogDescription>
              Original claim amount: <b>₹{selectedExpense?.amount}</b>. Enter the approved amount below.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label className="text-xs font-semibold">Approved Amount (₹) *</Label>
            <Input
              type="number"
              min="0"
              max={selectedExpense?.amount}
              value={customApprovedAmount}
              onChange={(e) => setCustomApprovedAmount(e.target.value)}
              className="text-base font-bold"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPartialApproveOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => selectedExpense && handleApprove(selectedExpense, Number(customApprovedAmount))} 
              disabled={actionLoading || !customApprovedAmount}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Confirm ₹{customApprovedAmount} Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: PAYOUT SETTLEMENT */}
      <Dialog open={payoutModalOpen} onOpenChange={setPayoutModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" /> Disburse & Settle Claim
            </DialogTitle>
            <DialogDescription>
              Marking this claim of <b>₹{selectedExpense?.approved_amount || selectedExpense?.amount}</b> as paid to {selectedExpense?.employees?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-4">
            <div>
              <Label className="text-xs font-semibold">Payment Mode</Label>
              <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer (NEFT/IMPS)</SelectItem>
                  <SelectItem value="upi">UPI / GPay / PhonePe</SelectItem>
                  <SelectItem value="cash">Petty Cash</SelectItem>
                  <SelectItem value="payroll_addition">Included with Salary / Payroll</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Payment Reference / UTR Number (Optional)</Label>
              <Input
                placeholder="e.g. UTR12984029482 or UPI Txn ID"
                value={payoutRef}
                onChange={(e) => setPayoutRef(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPayoutModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleMarkPaid} 
              disabled={actionLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {actionLoading ? "Processing..." : "Confirm Settlement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* MODAL 5: UNIFIED CLAIM DETAILS, BREAKDOWN & ACTIVITY HISTORY */}
      <Dialog open={!!selectedOutstationItem} onOpenChange={(open) => !open && setSelectedOutstationItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-indigo-950">
              {selectedOutstationItem?.expense_type === "outstation" ? (
                <Plane className="h-5 w-5 text-indigo-600" />
              ) : selectedOutstationItem?.expense_type === "travel_km" ? (
                <Navigation className="h-5 w-5 text-amber-600" />
              ) : (
                <Receipt className="h-5 w-5 text-slate-700" />
              )}
              {selectedOutstationItem?.expense_type === "outstation"
                ? "Outstation Monthly Card & History"
                : selectedOutstationItem?.expense_type === "travel_km"
                ? "Local Monthly Card & History"
                : "Expense Claim Details & History"}
            </DialogTitle>
            <DialogDescription>
              Full claim particulars, itemized entries/trips, attached receipts, HR status, and activity history timeline.
            </DialogDescription>
          </DialogHeader>

          {selectedOutstationItem && (() => {
            const modalEntries = getNormalizedEntries(selectedOutstationItem);
            return (
            <div className="space-y-4 pt-2">
              {/* Employee Summary */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{selectedOutstationItem.employees?.name || "Employee"}</h4>
                    <p className="text-xs text-slate-500">
                      {selectedOutstationItem.employees?.designation || "Staff"} • Latest Date:{" "}
                      {selectedOutstationItem.expense_date ? format(parseISO(selectedOutstationItem.expense_date), "dd MMM yyyy") : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-white text-slate-800 border border-slate-200 hover:bg-white text-xs font-bold">
                      {modalEntries.length} {selectedOutstationItem.expense_type === "outstation" ? (modalEntries.length === 1 ? "Trip" : "Trips") : (modalEntries.length === 1 ? "Entry" : "Entries")}
                    </Badge>
                    {selectedOutstationItem.claim_number && (
                      <Badge className="bg-slate-900 text-white hover:bg-slate-900 font-mono text-xs px-2.5 py-0.5 tracking-wider gap-1">
                        <Hash className="h-3 w-3" /> {selectedOutstationItem.claim_number}
                      </Badge>
                    )}
                    {getStatusBadge(selectedOutstationItem.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-indigo-100 text-xs">
                  <div>
                    <span className="text-slate-500 block">Total Claimed Amount:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      ₹{Number(selectedOutstationItem.amount || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  {selectedOutstationItem.expense_type === "travel_km" && (
                    <div>
                      <span className="text-slate-500 block">Total Distance Logged:</span>
                      <span className="font-bold text-slate-800">
                        {selectedOutstationItem.distance_km || 0} KM
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 block">Card Type:</span>
                    <span className="font-bold text-slate-800">
                      {selectedOutstationItem.expense_type === "outstation"
                        ? "Outstation Monthly Card"
                        : selectedOutstationItem.expense_type === "travel_km"
                        ? "Local Travel Monthly Card"
                        : selectedOutstationItem.category_name || "Expense"}
                    </span>
                  </div>
                </div>
              </div>

              {selectedOutstationItem.expense_type !== "outstation" ? (
                <div className="space-y-2.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Daily Entries Inside Card ({modalEntries.length})
                  </div>
                  {modalEntries.map((entry: any, idx: number) => {
                    const vLabel =
                      entry.vehicle_type === "car"
                        ? "Car"
                        : entry.vehicle_type === "auto"
                        ? "Cab / Auto"
                        : "Bike (2-Wheeler)";
                    return (
                      <div key={entry.id || idx} className="p-3 border rounded-xl bg-white space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-amber-50 text-amber-800 border-amber-200 font-bold text-[10px]">
                              #{idx + 1} • {entry.expense_date ? format(parseISO(entry.expense_date), "dd MMM yyyy") : "—"}
                            </Badge>
                            {selectedOutstationItem.expense_type === "travel_km" && (
                              <span className="font-semibold text-slate-800">
                                {vLabel} • {entry.distance_km || 0} KM @ ₹{entry.rate_per_km || 0}/KM
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              ₹{Number(entry.amount || 0).toLocaleString("en-IN")}
                            </span>
                            {entry.receipt_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setReceiptModalUrl(entry.receipt_url)}
                                className="h-7 text-xs gap-1 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                              >
                                <Eye className="h-3.5 w-3.5" /> View Receipt
                              </Button>
                            )}
                          </div>
                        </div>
                        {(entry.travel_from || entry.travel_to) && (
                          <div className="text-slate-700 font-medium flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            <span>{entry.travel_from || "Start"} → {entry.travel_to || "End"}</span>
                          </div>
                        )}
                        {entry.description && (
                          <div className="bg-slate-50 p-2 rounded-lg border text-slate-700">
                            <span className="font-semibold">Purpose / Description: </span>
                            {entry.description}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Outstation Trips Inside Card ({modalEntries.length})
                  </div>
                  {modalEntries.map((trip: any, tripIdx: number) => {
                    const details = trip.outstation_details || {};
                    const items = details.items || {};
                    return (
                      <div key={trip.id || tripIdx} className="p-3.5 border border-indigo-200 rounded-xl bg-indigo-50/20 space-y-2.5">
                        <div className="flex items-start justify-between gap-2 pb-2 border-b border-indigo-100 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className="bg-indigo-600 text-white text-[10px] font-bold">
                                Trip #{tripIdx + 1}
                              </Badge>
                              <span className="font-bold text-slate-900 text-sm">
                                {details.trip_from || trip.travel_from || "Origin"} → {details.trip_to || trip.travel_to || "Destination"}
                              </span>
                              <Badge className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0">
                                {details.trip_days || 1} Days
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1">
                              {trip.trip_start_date ? format(parseISO(trip.trip_start_date), "dd MMM yyyy") : (trip.expense_date ? format(parseISO(trip.expense_date), "dd MMM yyyy") : "")}
                              {trip.trip_end_date ? ` - ${format(parseISO(trip.trip_end_date), "dd MMM yyyy")}` : ""}
                              {(details.purpose || trip.description) ? ` • ${details.purpose || trip.description}` : ""}
                            </p>
                          </div>
                          <span className="font-bold text-indigo-950 text-base">
                            ₹{Number(trip.amount || 0).toLocaleString("en-IN")}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {/* 1. Travel Fare */}
                          <div className="p-2.5 border rounded-xl bg-white flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                                <Plane className="h-4 w-4" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-800">1. Travel Fare / Tickets (ट्रेवलिंग बिल)</span>
                                <p className="text-[11px] text-slate-500">
                                  Mode: {items?.travel?.mode || "Travel"}
                                  {items?.travel?.booking_ref ? ` • Ref: ${items.travel.booking_ref}` : ""}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-900 text-sm">
                                ₹{(items?.travel?.amount || 0).toLocaleString("en-IN")}
                              </span>
                              {items?.travel?.receipt_url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setReceiptModalUrl(items.travel.receipt_url)}
                                  className="h-7 text-xs px-2 gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
                                >
                                  <Eye className="h-3 w-3" /> View Ticket
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* 2. Hotel Lodging */}
                          <div className="p-2.5 border rounded-xl bg-white flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 bg-purple-50 text-purple-700 rounded-lg">
                                <Hotel className="h-4 w-4" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-800">2. Hotel / Lodging (होटल बिल)</span>
                                <p className="text-[11px] text-slate-500">
                                  {items?.hotel?.hotel_name || "Hotel Stay"}
                                  {items?.hotel?.nights ? ` • ${items.hotel.nights} Nights` : ""}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-900 text-sm">
                                ₹{(items?.hotel?.amount || 0).toLocaleString("en-IN")}
                              </span>
                              {items?.hotel?.receipt_url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setReceiptModalUrl(items.hotel.receipt_url)}
                                  className="h-7 text-xs px-2 gap-1 text-purple-700 border-purple-200 hover:bg-purple-50"
                                >
                                  <Eye className="h-3 w-3" /> View Bill
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* 3. Food & Meals */}
                          <div className="p-2.5 border rounded-xl bg-white flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                                <Utensils className="h-4 w-4" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-800">3. Food / Meals (फूड बिल)</span>
                                <p className="text-[11px] text-slate-500">
                                  {items?.food?.description || "Tour food & meals"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-900 text-sm">
                                ₹{(items?.food?.amount || 0).toLocaleString("en-IN")}
                              </span>
                              {items?.food?.receipt_url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setReceiptModalUrl(items.food.receipt_url)}
                                  className="h-7 text-xs px-2 gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                >
                                  <Eye className="h-3 w-3" /> View Bill
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* 4. Other Expenses */}
                          <div className="p-2.5 border rounded-xl bg-white flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 bg-cyan-50 text-cyan-700 rounded-lg">
                                <Shirt className="h-4 w-4" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-800">4. Other (लॉन्ड्री & अन्य खर्च)</span>
                                <p className="text-[11px] text-slate-500">
                                  {items?.other?.description || "Incidentals, laundry, transit"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-900 text-sm">
                                ₹{(items?.other?.amount || 0).toLocaleString("en-IN")}
                              </span>
                              {items?.other?.receipt_url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setReceiptModalUrl(items.other.receipt_url)}
                                  className="h-7 text-xs px-2 gap-1 text-cyan-700 border-cyan-200 hover:bg-cyan-50"
                                >
                                  <Eye className="h-3 w-3" /> View Bill
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Custom Created Expense Items */}
                          {Array.isArray(items?.custom_items) &&
                            items.custom_items.map((cItem: any, idx: number) => (
                              <div key={cItem.id || idx} className="p-2.5 border border-orange-200 rounded-xl bg-orange-50/40 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-2 bg-orange-100 text-orange-700 rounded-lg">
                                    <Tag className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-800">{cItem.name}</span>
                                    {cItem.description && (
                                      <p className="text-[11px] text-slate-500">{cItem.description}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-slate-900 text-sm">
                                    ₹{Number(cItem.amount || 0).toLocaleString("en-IN")}
                                  </span>
                                  {cItem.receipt_url && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setReceiptModalUrl(cItem.receipt_url)}
                                      className="h-7 text-xs px-2 gap-1 text-orange-700 border-orange-200 hover:bg-orange-50"
                                    >
                                      <Eye className="h-3 w-3" /> View Bill
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}

                          {/* 5. Daily Allowance (DA) */}
                          <div className="p-2.5 border rounded-xl bg-white flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
                                <Coins className="h-4 w-4" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-800">5. DA (Daily Allowance / दैनिक भत्ता)</span>
                                <p className="text-[11px] text-slate-500">
                                  {items?.da?.days || details?.trip_days || 1} Days
                                  {items?.da?.daily_rate ? ` @ ₹${items.da.daily_rate}/day` : ""}
                                </p>
                              </div>
                            </div>
                            <span className="font-bold text-slate-900 text-sm">
                              ₹{(items?.da?.amount || 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedOutstationItem.rejection_reason && (
                <div className="text-xs bg-rose-50 p-3 rounded-lg border border-rose-200 text-rose-700">
                  <span className="font-semibold">Rejection Reason: </span>{selectedOutstationItem.rejection_reason}
                </div>
              )}

              {selectedOutstationItem.status === "paid" && (
                <div className="text-xs bg-blue-50 p-3 rounded-lg border border-blue-200 text-blue-800">
                  <span className="font-semibold">Payout Details: </span>
                  {selectedOutstationItem.payment_method || "Settled"}
                  {selectedOutstationItem.payment_ref_no ? ` • Ref: ${selectedOutstationItem.payment_ref_no}` : ""}
                </div>
              )}

              {/* Activity History Timeline */}
              {(() => {
                const timeline = getExpenseTimeline(selectedOutstationItem);
                return (
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                      <History className="h-3.5 w-3.5 text-indigo-600" />
                      Claim Activity History ({timeline.length})
                    </div>
                    {timeline.length === 0 ? (
                      <div className="text-xs text-slate-400">No history events recorded yet.</div>
                    ) : (
                      <div className="space-y-2.5 border-l-2 border-slate-200 pl-3 ml-1">
                        {timeline.map((ev, idx) => (
                          <div key={idx} className="relative text-xs">
                            <span className="absolute -left-[17px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-2 ring-white" />
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <span className="font-semibold text-slate-800">{ev.action}</span>
                              <span className="text-[11px] text-slate-400">
                                {ev.at ? format(parseISO(ev.at), "dd MMM yyyy, hh:mm a") : ""}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              By {ev.actor}{ev.details ? ` — ${ev.details}` : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Total & Action Footer */}
              <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Total Claimed Amount</span>
                  <span className="text-xl font-bold">₹{Number(selectedOutstationItem.amount).toLocaleString("en-IN")}</span>
                </div>
                {selectedOutstationItem.status === "approved" || selectedOutstationItem.status === "paid" ? (
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Approved Amount</span>
                    <span className="text-xl font-bold text-emerald-400">
                      ₹{Number(selectedOutstationItem.approved_amount !== undefined ? selectedOutstationItem.approved_amount : selectedOutstationItem.amount).toLocaleString("en-IN")}
                    </span>
                  </div>
                ) : selectedOutstationItem.status === "submitted" ? (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        const itm = selectedOutstationItem;
                        setSelectedOutstationItem(null);
                        handleApprove(itm);
                      }}
                      disabled={actionLoading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve Full (₹{Number(selectedOutstationItem.amount).toLocaleString("en-IN")})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const itm = selectedOutstationItem;
                        setSelectedOutstationItem(null);
                        setSelectedExpense(itm);
                        setCustomApprovedAmount(String(itm.amount));
                        setPartialApproveOpen(true);
                      }}
                      className="bg-white/10 hover:bg-white/20 text-white text-xs border-white/20"
                    >
                      Partial ₹
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        const itm = selectedOutstationItem;
                        setSelectedOutstationItem(null);
                        setSelectedExpense(itm);
                        setRejectModalOpen(true);
                      }}
                      className="text-xs"
                    >
                      Reject
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
