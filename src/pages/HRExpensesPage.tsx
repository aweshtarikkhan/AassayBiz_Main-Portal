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
  CreditCard
} from "lucide-react";
import { format, parseISO } from "date-fns";

export interface ExpenseItem {
  id: string;
  org_id: string;
  employee_id: string;
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

      // 3. Fetch Expenses
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
        .order("expense_date", { ascending: false });

      if (expErr || !expData) {
        console.warn("Direct joined query had issue, falling back to basic query:", expErr);
        const { data: fallbackData, error: fbErr } = await supabase
          .from("employee_expenses")
          .select("*")
          .eq("org_id", currentOrg.id)
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

  // Approve single expense
  const handleApprove = async (exp: ExpenseItem, approvedAmt?: number) => {
    setActionLoading(true);
    try {
      const finalAmt = approvedAmt !== undefined ? approvedAmt : exp.amount;
      const { error } = await supabase
        .from("employee_expenses")
        .update({
          status: "approved",
          approved_amount: finalAmt,
          reviewed_at: new Date().toISOString(),
        })
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
            ? { ...item, status: "approved", approved_amount: finalAmt, reviewed_at: new Date().toISOString() }
            : item
        )
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
      const { error } = await supabase
        .from("employee_expenses")
        .update({
          status: "rejected",
          rejection_reason: rejectReason.trim(),
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedExpense.id);

      if (error) throw error;

      toast({
        title: "Expense Rejected",
        description: "The claim has been marked as rejected with reason.",
      });

      setExpenses((prev) =>
        prev.map((item) =>
          item.id === selectedExpense.id
            ? { ...item, status: "rejected", rejection_reason: rejectReason.trim(), reviewed_at: new Date().toISOString() }
            : item
        )
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
      const { error } = await supabase
        .from("employee_expenses")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method: payoutMethod,
          payment_ref_no: payoutRef.trim() || null,
        })
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
                paid_at: new Date().toISOString(),
                payment_method: payoutMethod,
                payment_ref_no: payoutRef.trim() || undefined,
              }
            : item
        )
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
      const ids = pendingList.map((e) => e.id);
      const { error } = await supabase
        .from("employee_expenses")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .in("id", ids);

      if (error) throw error;

      toast({
        title: "Bulk Approval Complete",
        description: `Successfully approved ${pendingList.length} claims.`,
      });

      setExpenses((prev) =>
        prev.map((item) =>
          ids.includes(item.id)
            ? { ...item, status: "approved", approved_amount: item.amount, reviewed_at: new Date().toISOString() }
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

    const rows = filteredExpenses.map((e) => [
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
    link.setAttribute("download", `Expenses_Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter Logic
  const filteredExpenses = expenses.filter((e) => {
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

  const pendingExpenses = expenses.filter((e) => e.status === "submitted");

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
            <CardHeader className="p-5 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900">Pending Expense Claims</CardTitle>
                <CardDescription>
                  Review submitted bills, travel distances, and approve or reject with comments.
                </CardDescription>
              </div>
              {pendingExpenses.length > 0 && (
                <Button 
                  onClick={handleBulkApprove} 
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm"
                >
                  <Check className="h-4 w-4" /> Approve All ({pendingExpenses.length})
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {pendingExpenses.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                  <h4 className="text-base font-semibold text-slate-700">All Caught Up!</h4>
                  <p className="text-sm text-slate-500">There are no pending expense claims awaiting HR review.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-28">Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type & Category</TableHead>
                      <TableHead>Claim Details</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center w-20">Receipt</TableHead>
                      <TableHead className="text-right w-44">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingExpenses.map((exp) => (
                      <TableRow key={exp.id} className="hover:bg-slate-50/70">
                        <TableCell className="font-medium text-xs text-slate-600">
                          {format(parseISO(exp.expense_date), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-900 text-sm">{exp.employees?.name}</div>
                          <div className="text-xs text-slate-500">{exp.employees?.designation || "Staff"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 font-medium text-slate-800 text-sm">
                            {exp.expense_type === "outstation" ? (
                              <Badge variant="outline" className="gap-1 border-indigo-300 text-indigo-800 bg-indigo-50 font-semibold text-xs">
                                <Plane className="h-3 w-3" /> Outstation Trip
                              </Badge>
                            ) : exp.expense_type === "travel_km" ? (
                              <Badge variant="outline" className="gap-1 border-amber-300 text-amber-800 bg-amber-50 font-semibold text-xs">
                                {exp.vehicle_type === 'car' ? <Car className="h-3 w-3" /> : exp.vehicle_type === 'auto' ? <Bus className="h-3 w-3" /> : <Bike className="h-3 w-3" />}
                                Local ({exp.vehicle_type === 'car' ? 'Car' : exp.vehicle_type === 'auto' ? 'Cab/Auto' : 'Bike'})
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-slate-300">
                                {exp.category_name}
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
                              <div className="font-semibold text-slate-900 flex items-center gap-1">
                                <MapPin className="h-3 w-3 shrink-0 text-indigo-500" />
                                <span>{exp.outstation_details?.trip_from || exp.travel_from} → {exp.outstation_details?.trip_to || exp.travel_to}</span>
                                <Badge className="bg-indigo-100 text-indigo-700 text-[10px] px-1 py-0 hover:bg-indigo-100 ml-1">
                                  {exp.outstation_details?.trip_days || 1} Days
                                </Badge>
                              </div>
                              <div className="text-slate-500 line-clamp-1 text-[11px]">
                                {exp.outstation_details?.purpose || exp.description || "Official tour"}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedOutstationItem(exp)}
                                className="h-6 text-[11px] px-2 gap-1 text-indigo-700 border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100"
                              >
                                <Eye className="h-3 w-3" /> View Tour Breakdown
                              </Button>
                            </div>
                          ) : exp.expense_type === "travel_km" ? (
                            <div className="text-xs space-y-0.5">
                              <span className="font-semibold text-slate-800">
                                {exp.distance_km} KM @ ₹{exp.rate_per_km}/KM ({exp.vehicle_type?.toUpperCase()})
                              </span>
                              {exp.travel_from && exp.travel_to && (
                                <div className="text-slate-500 flex items-center gap-1 truncate">
                                  <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                                  <span>{exp.travel_from} → {exp.travel_to}</span>
                                </div>
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
                              onClick={() => setReceiptModalUrl(exp.receipt_url!)}
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
                              onClick={() => handleApprove(exp)}
                              disabled={actionLoading}
                              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 gap-1"
                              title="Full Approve"
                            >
                              <Check className="h-3.5 w-3.5" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
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
                              onClick={() => {
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
                    ))}
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

                <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                  <SelectTrigger className="w-48 h-8 text-xs bg-white">
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
                  Showing <b>{filteredExpenses.length}</b> records
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredExpenses.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <p className="text-sm">No expense records found matching selected filters.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-28">Date</TableHead>
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
                    {filteredExpenses.map((exp) => (
                      <TableRow key={exp.id} className="hover:bg-slate-50/70">
                        <TableCell className="font-medium text-xs text-slate-600">
                          {format(parseISO(exp.expense_date), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-900 text-sm">{exp.employees?.name}</div>
                          <div className="text-xs text-slate-500">{exp.employees?.designation || "Staff"}</div>
                        </TableCell>
                        <TableCell>
                          {exp.expense_type === "outstation" ? (
                            <div>
                              <Badge variant="outline" className="gap-1 border-indigo-300 text-indigo-800 bg-indigo-50 font-semibold text-xs">
                                <Plane className="h-3 w-3" /> Outstation
                              </Badge>
                            </div>
                          ) : exp.expense_type === "travel_km" ? (
                            <div>
                              <span className="text-xs font-semibold text-slate-800">
                                Local ({exp.vehicle_type === 'car' ? 'Car' : exp.vehicle_type === 'auto' ? 'Cab/Auto' : 'Bike'})
                              </span>
                              <span className="block text-[11px] text-amber-700 font-medium">
                                {exp.distance_km} KM @ ₹{exp.rate_per_km}/KM
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-slate-800">{exp.category_name}</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs text-xs text-slate-600">
                          {exp.expense_type === "outstation" ? (
                            <div className="space-y-1">
                              <div className="font-semibold text-slate-900 flex items-center gap-1">
                                <MapPin className="h-3 w-3 shrink-0 text-indigo-500" />
                                <span>{exp.outstation_details?.trip_from || exp.travel_from} → {exp.outstation_details?.trip_to || exp.travel_to}</span>
                                <Badge className="bg-indigo-100 text-indigo-700 text-[10px] px-1 py-0 hover:bg-indigo-100 ml-1">
                                  {exp.outstation_details?.trip_days || 1} Days
                                </Badge>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedOutstationItem(exp)}
                                className="h-6 text-[11px] px-2 gap-1 text-indigo-700 border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100"
                              >
                                <Eye className="h-3 w-3" /> View Tour Breakdown
                              </Button>
                            </div>
                          ) : exp.expense_type === "travel_km" ? (
                            <span>{exp.travel_from} → {exp.travel_to}</span>
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
                              onClick={() => setReceiptModalUrl(exp.receipt_url!)}
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
                              onClick={() => {
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
                    ))}
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
      {/* MODAL 5: OUTSTATION TOUR CLAIM BREAKDOWN & HR APPROVAL */}
      <Dialog open={!!selectedOutstationItem} onOpenChange={(open) => !open && setSelectedOutstationItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-indigo-950">
              <Plane className="h-5 w-5 text-indigo-600" /> Outstation Tour Claim Breakdown
            </DialogTitle>
            <DialogDescription>
              Review itemized travel, lodging, food, incidental costs, and daily allowance (DA).
            </DialogDescription>
          </DialogHeader>

          {selectedOutstationItem && (
            <div className="space-y-4 pt-2">
              {/* Employee & Route Summary */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{selectedOutstationItem.employees?.name || "Employee"}</h4>
                    <p className="text-xs text-slate-500">{selectedOutstationItem.employees?.designation || "Staff"} • {selectedOutstationItem.employees?.email}</p>
                  </div>
                  <div>
                    {getStatusBadge(selectedOutstationItem.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-indigo-100 text-xs">
                  <div>
                    <span className="text-slate-500 block">Route (सफर):</span>
                    <span className="font-bold text-slate-800">
                      {selectedOutstationItem.outstation_details?.trip_from || selectedOutstationItem.travel_from} → {selectedOutstationItem.outstation_details?.trip_to || selectedOutstationItem.travel_to}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Duration (दिन):</span>
                    <span className="font-bold text-slate-800">
                      {selectedOutstationItem.outstation_details?.trip_days || 1} Days
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Dates:</span>
                    <span className="font-medium text-slate-800">
                      {selectedOutstationItem.trip_start_date ? format(parseISO(selectedOutstationItem.trip_start_date), "dd MMM") : selectedOutstationItem.expense_date}
                      {selectedOutstationItem.trip_end_date && ` - ${format(parseISO(selectedOutstationItem.trip_end_date), "dd MMM yyyy")}`}
                    </span>
                  </div>
                </div>

                {selectedOutstationItem.outstation_details?.purpose && (
                  <div className="pt-1 border-t border-indigo-100 text-xs">
                    <span className="text-slate-500 block">Trip Purpose:</span>
                    <span className="font-medium text-slate-800">{selectedOutstationItem.outstation_details.purpose}</span>
                  </div>
                )}
              </div>

              {/* Itemized Table / Cards */}
              <div className="space-y-2 text-xs">
                {/* 1. Travel Fare */}
                <div className="p-3 border rounded-xl bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                      <Plane className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">1. Travel Fare / Tickets (ट्रेवलिंग बिल)</span>
                      <p className="text-[11px] text-slate-500">
                        Mode: {selectedOutstationItem.outstation_details?.items?.travel?.mode || "Travel"}
                        {selectedOutstationItem.outstation_details?.items?.travel?.booking_ref ? ` • Ref: ${selectedOutstationItem.outstation_details.items.travel.booking_ref}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 text-sm">
                      ₹{(selectedOutstationItem.outstation_details?.items?.travel?.amount || 0).toLocaleString("en-IN")}
                    </span>
                    {selectedOutstationItem.outstation_details?.items?.travel?.receipt_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReceiptModalUrl(selectedOutstationItem.outstation_details.items.travel.receipt_url)}
                        className="h-7 text-xs px-2 gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
                      >
                        <Eye className="h-3 w-3" /> View Ticket
                      </Button>
                    )}
                  </div>
                </div>

                {/* 2. Hotel Lodging */}
                <div className="p-3 border rounded-xl bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-purple-50 text-purple-700 rounded-lg">
                      <Hotel className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">2. Hotel / Lodging (होटल बिल)</span>
                      <p className="text-[11px] text-slate-500">
                        {selectedOutstationItem.outstation_details?.items?.hotel?.hotel_name || "Hotel Stay"}
                        {selectedOutstationItem.outstation_details?.items?.hotel?.nights ? ` • ${selectedOutstationItem.outstation_details.items.hotel.nights} Nights` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 text-sm">
                      ₹{(selectedOutstationItem.outstation_details?.items?.hotel?.amount || 0).toLocaleString("en-IN")}
                    </span>
                    {selectedOutstationItem.outstation_details?.items?.hotel?.receipt_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReceiptModalUrl(selectedOutstationItem.outstation_details.items.hotel.receipt_url)}
                        className="h-7 text-xs px-2 gap-1 text-purple-700 border-purple-200 hover:bg-purple-50"
                      >
                        <Eye className="h-3 w-3" /> View Bill
                      </Button>
                    )}
                  </div>
                </div>

                {/* 3. Food & Meals */}
                <div className="p-3 border rounded-xl bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                      <Utensils className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">3. Food / Meals (फूड बिल)</span>
                      <p className="text-[11px] text-slate-500">
                        {selectedOutstationItem.outstation_details?.items?.food?.description || "Tour food & meals"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 text-sm">
                      ₹{(selectedOutstationItem.outstation_details?.items?.food?.amount || 0).toLocaleString("en-IN")}
                    </span>
                    {selectedOutstationItem.outstation_details?.items?.food?.receipt_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReceiptModalUrl(selectedOutstationItem.outstation_details.items.food.receipt_url)}
                        className="h-7 text-xs px-2 gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      >
                        <Eye className="h-3 w-3" /> View Bill
                      </Button>
                    )}
                  </div>
                </div>

                {/* 4. Other Expenses */}
                <div className="p-3 border rounded-xl bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-cyan-50 text-cyan-700 rounded-lg">
                      <Shirt className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">4. Other (लॉन्ड्री & अन्य खर्च)</span>
                      <p className="text-[11px] text-slate-500">
                        {selectedOutstationItem.outstation_details?.items?.other?.description || "Incidentals, laundry, transit"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 text-sm">
                      ₹{(selectedOutstationItem.outstation_details?.items?.other?.amount || 0).toLocaleString("en-IN")}
                    </span>
                    {selectedOutstationItem.outstation_details?.items?.other?.receipt_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReceiptModalUrl(selectedOutstationItem.outstation_details.items.other.receipt_url)}
                        className="h-7 text-xs px-2 gap-1 text-cyan-700 border-cyan-200 hover:bg-cyan-50"
                      >
                        <Eye className="h-3 w-3" /> View Bill
                      </Button>
                    )}
                  </div>
                </div>

                {/* 5. Daily Allowance (DA) */}
                <div className="p-3 border rounded-xl bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
                      <Coins className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">5. DA (Daily Allowance / दैनिक भत्ता)</span>
                      <p className="text-[11px] text-slate-500">
                        {selectedOutstationItem.outstation_details?.items?.da?.days || selectedOutstationItem.outstation_details?.trip_days || 1} Days
                        {selectedOutstationItem.outstation_details?.items?.da?.daily_rate ? ` @ ₹${selectedOutstationItem.outstation_details.items.da.daily_rate}/day` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 text-sm">
                      ₹{(selectedOutstationItem.outstation_details?.items?.da?.amount || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
