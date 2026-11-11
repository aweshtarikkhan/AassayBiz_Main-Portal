import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Check, X, Trash2, Settings, Users, ClipboardList, Info, CalendarDays, History, PlusCircle, MinusCircle, AlertTriangle, Loader2 } from "lucide-react";
import { differenceInCalendarDays, parseISO, format } from "date-fns";

export const LEAVE_TYPES = [
  { v: "casual",      l: "Casual Leave (CL)",          short: "CL",  color: "bg-blue-100 text-blue-700 border-blue-300", annual: 12 },
  { v: "el_pl",       l: "Earned/Privilege (EL/PL)",   short: "PL",  color: "bg-indigo-100 text-indigo-700 border-indigo-300", annual: 0 },
  { v: "sick",        l: "Sick/Medical (SL/ML)",       short: "SL",  color: "bg-amber-100 text-amber-700 border-amber-300", annual: 5 },
  { v: "comp_off",    l: "Compensatory Off",           short: "CO",  color: "bg-teal-100 text-teal-700 border-teal-300", annual: 0 },
  { v: "maternity",   l: "Maternity Leave",            short: "ML",  color: "bg-pink-100 text-pink-700 border-pink-300", annual: 0 },
  { v: "paternity",   l: "Paternity Leave",            short: "PTL", color: "bg-cyan-100 text-cyan-700 border-cyan-300", annual: 0 },
  { v: "bereavement", l: "Bereavement Leave",          short: "BL",  color: "bg-slate-100 text-slate-700 border-slate-300", annual: 0 },
  { v: "marriage",    l: "Marriage Leave",             short: "MRL", color: "bg-rose-100 text-rose-700 border-rose-300", annual: 0 },
  { v: "study",       l: "Study/Sabbatical",           short: "STL", color: "bg-violet-100 text-violet-700 border-violet-300", annual: 0 },
  { v: "jury_duty",   l: "Jury Duty",                  short: "JD",  color: "bg-stone-100 text-stone-700 border-stone-300", annual: 0 },
  { v: "od",          l: "On Duty (OD)",               short: "OD",  color: "bg-sky-100 text-sky-700 border-sky-300", annual: 0 },
  { v: "wfh",         l: "Work From Home (WFH)",       short: "WFH", color: "bg-emerald-100 text-emerald-700 border-emerald-300", annual: 0 },
  { v: "half_day",    l: "Half-Day Leave",             short: "HD",  color: "bg-orange-100 text-orange-700 border-orange-300", annual: 0 },
  { v: "lwp",         l: "Leave Without Pay (LWP)",    short: "LWP", color: "bg-red-100 text-red-700 border-red-300", annual: 0 },
  { v: "ncns",        l: "Absent (NCNS)",              short: "AB",  color: "bg-red-100 text-red-800 border-red-400", annual: 0 },
  { v: "other",       l: "Other",                      short: "OTH", color: "bg-gray-100 text-gray-700 border-gray-300", annual: 0 },
];

const statusBadge = (s: string) => {
  const map: any = {
    pending:  "bg-amber-100 text-amber-800 border-amber-300",
    approved: "bg-green-100 text-green-800 border-green-300",
    rejected: "bg-red-100 text-red-800 border-red-300",
  };
  return <Badge variant="outline" className={map[s] || ""}>{s}</Badge>;
};

const typeMeta = (v: string) => LEAVE_TYPES.find((t) => t.v === v) || LEAVE_TYPES[4];

export default function LeavesPage() {
  const org = useAppStore((s) => s.organization);
  const { toast } = useToast();

  // Leave requests
  const [rows, setRows] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ employee_id: "", leave_type: "casual", start_date: "", end_date: "", reason: "" });
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Leave policies
  const [policies, setPolicies] = useState<any[]>([]);
  const [policyForm, setPolicyForm] = useState<Record<string, { annual_limit: number; monthly_accrual: number }>>({});
  const [savingPolicy, setSavingPolicy] = useState(false);
    
    // Adjust Balance Form
    const [adjustOpen, setAdjustOpen] = useState(false);
    const [adjustForm, setAdjustForm] = useState<any>({});

  // Transactions log
  const [transactions, setTransactions] = useState<any[]>([]);

  // Employee balances
  const [balances, setBalances] = useState<any[]>([]);

    const submitAdjust = async () => {
      const amt = Number(adjustForm.amount);
      if (!adjustForm.employee_id || !amt || amt <= 0 || !adjustForm.leave_type || !adjustForm.transaction_type) {
        toast({ title: "Fill all required fields", variant: "destructive" }); return;
      }
      
      try {
        // Log transaction
        const { error: txError } = await (supabase as any).from("leave_transactions").insert({
          org_id: org?.id,
          employee_id: adjustForm.employee_id,
          leave_type: adjustForm.leave_type,
          amount: amt,
          transaction_type: adjustForm.transaction_type,
          description: adjustForm.description,
          expiry_date: adjustForm.expiry_date || null
        });
        if (txError) throw txError;
        
        // Update balance across all leave types (policy base + accrued delta)
        const empBals = balances.find(b => b.employee_id === adjustForm.employee_id && b.leave_type === adjustForm.leave_type);
        const pol = policies.find((p: any) => p.leave_type === adjustForm.leave_type);
        const baseAnnual = Number(pol?.annual_limit ?? LEAVE_TYPES.find((t) => t.v === adjustForm.leave_type)?.annual ?? 0);
        const currentAccrued = Number(empBals?.accrued ?? 0);
        const newAccrued = adjustForm.transaction_type === 'credit'
          ? currentAccrued + amt
          : Math.max(-baseAnnual, currentAccrued - amt);
        
        const { error: balError } = await (supabase as any).from("employee_leave_balances").upsert({
          org_id: org?.id,
          employee_id: adjustForm.employee_id,
          leave_type: adjustForm.leave_type,
          accrued: newAccrued,
          used: Number(empBals?.used ?? 0)
        }, { onConflict: "employee_id,leave_type" });
        if (balError) throw balError;
        
        toast({ title: "Balance adjusted successfully" });
        setAdjustOpen(false);
        load();
      } catch (err: any) {
        toast({ title: "Adjustment failed", description: err.message, variant: "destructive" });
      }
    };


  const load = async () => {
    if (!org?.id) return;
    setLoading(true);
    const [lv, emps, pols, bals, txns] = await Promise.all([
      (supabase as any).from("leaves").select("*, employees(name)").eq("org_id", org.id).order("created_at", { ascending: false }),
      (supabase as any).from("employees").select("id,name").eq("org_id", org.id).eq("is_active", true).order("name"),
      (supabase as any).from("leave_policies").select("*").eq("org_id", org.id),
      (supabase as any).from("employee_leave_balances").select("*, employees(name)").eq("org_id", org.id),
      (supabase as any).from("leave_transactions").select("*, employees(name)").eq("org_id", org.id).order("created_at", { ascending: false }),
    ]);
    setRows(lv.data || []);
    setEmployees(emps.data || []);
    setPolicies(pols.data || []);
    setBalances(bals.data || []);
    setTransactions(txns.data || []);

    // Build policy form state - merge DB data with defaults
    const pf: Record<string, { annual_limit: number; monthly_accrual: number }> = {};
    ["casual", "sick", "el_pl", "comp_off"].forEach((t) => {
      const meta = LEAVE_TYPES.find((x) => x.v === t)!;
      const existing = (pols.data || []).find((p: any) => p.leave_type === t);
      pf[t] = {
        annual_limit: existing?.annual_limit ?? meta.annual,
        monthly_accrual: existing?.monthly_accrual ?? parseFloat((meta.annual / 12).toFixed(2)),
      };
    });
    setPolicyForm(pf);
    setLoading(false);
  };

  useEffect(() => { 
    load(); 
    if (!org?.id) return;

    const channel = supabase
      .channel(`leaves-realtime-${org.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leaves" },
        () => {
          load();
          window.dispatchEvent(new CustomEvent('hr-action-updated'));
        }
      )
      .subscribe();

    const handleActionUpdated = () => {
      load();
    };
    window.addEventListener("hr-action-updated", handleActionUpdated);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("hr-action-updated", handleActionUpdated);
    };
  }, [org?.id]);

  const submit = async () => {
    if (!org?.id || !form.employee_id || !form.start_date || !form.end_date) {
      toast({ title: "Fill all required fields", variant: "destructive" }); return;
    }
    const days = Math.max(1, differenceInCalendarDays(parseISO(form.end_date), parseISO(form.start_date)) + 1);
    const { error } = await (supabase as any).from("leaves").insert({
      org_id: org.id, employee_id: form.employee_id, leave_type: form.leave_type,
      start_date: form.start_date, end_date: form.end_date, days, reason: form.reason, status: "pending",
    });
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { 
      setOpen(false); 
      setForm({ employee_id: "", leave_type: "casual", start_date: "", end_date: "", reason: "" }); 
      load(); 
      window.dispatchEvent(new CustomEvent('hr-action-updated'));
      toast({ title: "Leave request created" }); 
    }
  };

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    const leaveReq = rows.find(r => r.id === id);
    const oldStatus = leaveReq?.status;
    if (oldStatus === status) return;
    
    setProcessingId(id);
    try {
      const { error } = await (supabase as any).from("leaves").update({ status, approved_at: new Date().toISOString() }).eq("id", id);
      if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
      
      if (leaveReq) {
        try {
          const { data: bData } = await (supabase as any).from('employee_leave_balances')
            .select('id, used')
            .eq('employee_id', leaveReq.employee_id)
            .eq('leave_type', leaveReq.leave_type)
            .maybeSingle();
            
          let currentUsed = bData?.used || 0;
          
          if (status === "approved" && oldStatus !== "approved") {
            currentUsed += leaveReq.days;
            
            // Auto-mark each leave day in both attendance and attendances tables
            const start = parseISO(String(leaveReq.start_date).split('T')[0]);
            const end = parseISO(String(leaveReq.end_date || leaveReq.start_date).split('T')[0]);
            const datesToMark: string[] = [];
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              datesToMark.push(format(d, 'yyyy-MM-dd'));
            }
            
            for (const dateStr of datesToMark) {
              let attStatus = 'paid_leave';
              if (leaveReq.leave_type === 'half_day') attStatus = 'half_day';
              else if (leaveReq.leave_type === 'wfh') attStatus = 'wfh';
              else if (leaveReq.leave_type === 'unpaid' || leaveReq.leave_type === 'lwp') attStatus = 'absent';
              else attStatus = leaveReq.leave_type || 'paid_leave';
              
              await (supabase as any).from('attendance').upsert({
                org_id: org.id,
                employee_id: leaveReq.employee_id,
                attendance_date: dateStr,
                status: attStatus,
                override_status: leaveReq.leave_type || attStatus
              }, { onConflict: 'employee_id,attendance_date' });

              await (supabase as any).from('attendances').upsert({
                org_id: org.id,
                employee_id: leaveReq.employee_id,
                date: dateStr,
                status: attStatus === 'absent' ? 'absent' : 'approved_leave',
              }, { onConflict: 'employee_id,date' });
            }
            
            toast({ title: "Leave Approved", description: `Attendance marked as ${leaveReq.leave_type.toUpperCase()} for ${leaveReq.days} day(s).` });
          } else if (oldStatus === "approved" && (status === "rejected" || status === "cancelled")) {
            currentUsed = Math.max(0, currentUsed - leaveReq.days);
            
            // Revert attendance records back to absent for those days
            const start = parseISO(String(leaveReq.start_date).split('T')[0]);
            const end = parseISO(String(leaveReq.end_date || leaveReq.start_date).split('T')[0]);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              const dateStr = format(d, 'yyyy-MM-dd');
              await (supabase as any).from('attendance').upsert({
                org_id: org.id,
                employee_id: leaveReq.employee_id,
                attendance_date: dateStr,
                status: 'absent',
                override_status: 'absent'
              }, { onConflict: 'employee_id,attendance_date' });

              await (supabase as any).from('attendances').upsert({
                org_id: org.id,
                employee_id: leaveReq.employee_id,
                date: dateStr,
                status: 'absent',
              }, { onConflict: 'employee_id,date' });
            }
            toast({ title: "Leave Rejected", description: `Balance refunded by ${leaveReq.days} day(s). Attendance reverted to Absent.` });
          }
          
          if (bData?.id) {
              await (supabase as any).from('employee_leave_balances').update({
                used: currentUsed
              }).eq('id', bData.id);
            } else {
              await (supabase as any).from('employee_leave_balances').insert({
                org_id: org.id,
                employee_id: leaveReq.employee_id,
                leave_type: leaveReq.leave_type,
                used: currentUsed
              });
            }
            
          } catch (e) {
            console.error("Error updating leave balance:", e);
            toast({ title: "Balance update failed", description: "Failed to update leave balance.", variant: "destructive" });
          }
      }
    } finally {
      setProcessingId(null);
    }
    load();
    window.dispatchEvent(new CustomEvent('hr-action-updated'));
  };

  const remove = async (id: string) => {
    if (!confirm("Delete leave?")) return;
    const { error } = await (supabase as any).from("leaves").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else {
      load();
      window.dispatchEvent(new CustomEvent('hr-action-updated'));
    }
  };

  const savePolicies = async () => {
    if (!org?.id) return;
    setSavingPolicy(true);
    try {
      const types = ["casual", "sick", "el_pl", "comp_off"];

      // Fetch existing policies for this organization to get their record IDs
      const { data: currentPolicies, error: fetchErr } = await (supabase as any)
        .from("leave_policies")
        .select("id, leave_type")
        .eq("org_id", org.id);

      if (fetchErr) throw fetchErr;

      const existingMap = new Map<string, string>(
        (currentPolicies || []).map((p: any) => [p.leave_type, p.id])
      );

      for (const t of types) {
        const annual_limit = Number(policyForm[t]?.annual_limit ?? 0);
        const monthly_accrual = Number(policyForm[t]?.monthly_accrual ?? 0);
        const existingId = existingMap.get(t);

        if (existingId) {
          const { error } = await (supabase as any)
            .from("leave_policies")
            .update({
              annual_limit,
              monthly_accrual,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingId);
          if (error) throw error;
        } else {
          const { error } = await (supabase as any)
            .from("leave_policies")
            .insert({
              org_id: org.id,
              leave_type: t,
              annual_limit,
              monthly_accrual,
              updated_at: new Date().toISOString(),
            });
          if (error) throw error;
        }
      }

      toast({ title: "Leave policies saved!" });
      load();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSavingPolicy(false);
    }
  };

  // Group balances per employee — keyed by emp.id for O(1) lookup
  const balancesByEmp: Record<string, Record<string, any>> = {};
  (employees || []).forEach((emp) => {
    const empBals = (balances || []).filter((b) => b.employee_id === emp.id);
    const byType: Record<string, any> = {};
    empBals.forEach((b) => { byType[b.leave_type] = b; });
    balancesByEmp[emp.id] = byType;
  });

  const balancesList = (employees || []).map((emp) => ({
    emp,
    byType: balancesByEmp[emp.id] || {},
  }));

  const getBalance = (byType: Record<string, any>, type: string) => {
    const pol = policies.find((p: any) => p.leave_type === type);
    const baseAnnual = Number(pol?.annual_limit ?? LEAVE_TYPES.find((t) => t.v === type)?.annual ?? 0);
    const accrued = Number(byType[type]?.accrued ?? 0);
    const annual = Math.max(0, baseAnnual + accrued);
    const used = Number(byType[type]?.used ?? 0);
    const remaining = Math.max(0, annual - used);
    return { annual, used, remaining };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leaves</h1>
          <p className="text-sm text-muted-foreground">
            Manage leave requests and policies. Balance deducts only when attendance is finalized.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={async () => {
            if (!confirm("Are you sure you want to run the monthly accrual? This will add the monthly allowance to all employees' balances.")) return;
            try {
              toast({ title: "Processing monthly accrual..." });
              for (const emp of employees) {
                for (const t of ["casual", "sick", "el_pl", "comp_off"]) {
                  const policy = policies.find(p => p.leave_type === t);
                  const monthlyAccrual = Number(policy?.monthly_accrual ?? 0);
                  if (!policy || monthlyAccrual <= 0) continue;
                  
                  const { data: bData, error: bFetchErr } = await (supabase as any).from('employee_leave_balances')
                    .select('id, accrued, used')
                    .eq('employee_id', emp.id)
                    .eq('leave_type', t)
                    .maybeSingle();
                  if (bFetchErr) throw bFetchErr;
                    
                  const currentAccrued = Number(bData?.accrued ?? 0);
                  const { error: upsertErr } = await (supabase as any).from('employee_leave_balances').upsert({
                    org_id: org.id,
                    employee_id: emp.id,
                    leave_type: t,
                    accrued: currentAccrued + monthlyAccrual,
                    used: Number(bData?.used ?? 0)
                  }, { onConflict: 'employee_id,leave_type' });
                  if (upsertErr) throw upsertErr;
                }
              }
              toast({ title: "Monthly accrual completed successfully!" });
              load();
            } catch (err: any) {
              toast({ title: "Error during accrual", description: err.message, variant: "destructive" });
            }
          }}><CalendarDays className="h-4 w-4 mr-2" />Run Monthly Accrual</Button>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Request</Button>
        </div>
      </div>

        <Tabs defaultValue="requests">
          <TabsList>
            <TabsTrigger value="requests" className="relative flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4" />
              Leave Requests
              {(rows || []).filter(r => r?.status === 'pending').length > 0 && (
                <span className="flex items-center gap-1 ml-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <span className="flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                    {(rows || []).filter(r => r?.status === 'pending').length}
                  </span>
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="balances" className="flex items-center gap-1.5"><Users className="h-4 w-4" />Employee Balances</TabsTrigger>
          <TabsTrigger value="policies" className="flex items-center gap-1.5"><Settings className="h-4 w-4" />Leave Policies</TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-1.5"><History className="h-4 w-4" />Transactions Log</TabsTrigger>
        </TabsList>

        {/* ── Leave Requests Tab ── */}
        <TabsContent value="requests">
          <Card>
            <CardContent className="p-0">
              {loading ? <div className="p-8 text-center text-muted-foreground">Loading…</div>
              : (!rows || rows.length === 0) ? <div className="p-8 text-center text-muted-foreground">No leave requests yet.</div>
              : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>From</TableHead>
                    <TableHead>To</TableHead><TableHead>Days</TableHead><TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead><TableHead className="text-right min-w-[220px]">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {(rows || []).map((r) => {
                      const meta = typeMeta(r.leave_type);
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.employees?.name || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${meta.color}`}>{meta.l}</Badge>
                          </TableCell>
                          <TableCell>{format(parseISO(r.start_date), "dd MMM yyyy")}</TableCell>
                          <TableCell>{format(parseISO(r.end_date), "dd MMM yyyy")}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold">{r.days}</span>
                              {["casual", "sick", "el_pl", "comp_off"].includes(r.leave_type) && (
                                <span className={`text-[10px] ${r.days > getBalance(balancesByEmp[r.employee_id] || {}, r.leave_type).remaining ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                                  {getBalance(balancesByEmp[r.employee_id] || {}, r.leave_type).remaining} available
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{r.reason || "—"}</TableCell>
                          <TableCell>{statusBadge(r.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {r.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs gap-1.5 transition-all active:scale-95"
                                    onClick={() => setStatus(r.id, "approved")}
                                    disabled={processingId === r.id}
                                    title="Approve Leave"
                                  >
                                    {processingId === r.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Check className="h-3.5 w-3.5" />
                                    )}
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-3 text-red-600 border-red-200 bg-red-50/50 hover:bg-red-100 hover:text-red-700 hover:border-red-300 dark:border-red-900/50 dark:bg-red-950/20 dark:hover:bg-red-950/50 font-medium text-xs gap-1.5 transition-all active:scale-95"
                                    onClick={() => setStatus(r.id, "rejected")}
                                    disabled={processingId === r.id}
                                    title="Reject Leave"
                                  >
                                    {processingId === r.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <X className="h-3.5 w-3.5" />
                                    )}
                                    Reject
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() => remove(r.id)}
                                disabled={processingId === r.id}
                                title="Delete Leave Request"
                              >
                                <Trash2 className="h-4 w-4" />
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

          {/* Info note */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Approving a leave request automatically deducts the required balance.
            </span>
          </div>
        </TabsContent>

        {/* ── Employee Balances Tab ── */}
        <TabsContent value="balances">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leave Balances (This Year)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? <div className="p-8 text-center text-muted-foreground">Loading…</div>
              : employees.length === 0 ? <div className="p-8 text-center text-muted-foreground">No active employees.</div>
              : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-center">Casual (Used / Annual)</TableHead>
                    <TableHead className="text-center">Sick (Used / Annual)</TableHead>
                    <TableHead className="text-center">Earned/PL (Used / Accrued)</TableHead>
                      <TableHead className="text-center">Comp-Off (Used / Accrued)</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {balancesList.map(({ emp, byType }) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        {["casual", "sick", "el_pl", "comp_off"].map((type) => {
                          const { annual, used, remaining } = getBalance(byType, type);
                          const pct = annual > 0 ? Math.min(100, (used / annual) * 100) : 0;
                          return (
                            <TableCell key={type} className="text-center">
                              <div className="text-sm font-medium">{used} / {annual}</div>
                              <div className="text-xs text-muted-foreground">{remaining} left</div>
                              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                                <div
                                  className={`h-1.5 rounded-full ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-green-500"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => {
                            setAdjustForm({ employee_id: emp.id, employee_name: emp.name, leave_type: "comp_off", amount: 1, transaction_type: "credit", description: "", expiry_date: "" });
                            setAdjustOpen(true);
                          }}>
                            <PlusCircle className="h-3.5 w-3.5 mr-1" />Adjust
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Leave Policies Tab ── */}
        <TabsContent value="policies">
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Set annual leave limits and monthly accrual for each leave type. These apply to all employees in your organization. Default values: Casual=12, Sick=5. EL/PL and Comp-Off start at 0 and grow through monthly accrual or manual credits.
              </span>
            </div>

            {["casual", "sick", "el_pl", "comp_off"].map((type) => {
              const meta = typeMeta(type);
              return (
                <Card key={type}>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${meta.color}`}>{meta.l}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 pt-0">
                    <div>
                      <Label>Annual Limit (days)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={policyForm[type]?.annual_limit ?? meta.annual}
                        onChange={(e) =>
                          setPolicyForm((prev) => ({
                            ...prev,
                            [type]: { ...prev[type], annual_limit: Number(e.target.value) },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Monthly Accrual (days/month)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.25}
                        value={policyForm[type]?.monthly_accrual ?? parseFloat((meta.annual / 12).toFixed(2))}
                        onChange={(e) =>
                          setPolicyForm((prev) => ({
                            ...prev,
                            [type]: { ...prev[type], monthly_accrual: Number(e.target.value) },
                          }))
                        }
                      />
                      <p className="text-xs text-muted-foreground mt-1">How many days accrue per month for this leave type.</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <Button onClick={savePolicies} disabled={savingPolicy}>
              {savingPolicy ? "Saving…" : "Save Leave Policies"}
            </Button>
          </div>
        </TabsContent>

        {/* ── Transactions Log Tab ── */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leave Balance Adjustments History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(!transactions || transactions.length === 0) ? <div className="p-8 text-center text-muted-foreground">No manual adjustments yet. Use the "Adjust" button in Employee Balances to credit or deduct leaves.</div>
              : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                    <TableHead className="text-center">Days</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {(transactions || []).map((tx: any) => {
                      const meta = typeMeta(tx.leave_type);
                      const isExpired = tx.expiry_date && new Date(tx.expiry_date) < new Date();
                      return (
                        <TableRow key={tx.id} className={isExpired ? "opacity-60" : ""}>
                          <TableCell className="text-sm">{format(parseISO(tx.created_at), "dd MMM yyyy")}</TableCell>
                          <TableCell className="font-medium">{tx.employees?.name || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${meta.color}`}>{meta.short}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {tx.transaction_type === "credit" ? (
                              <Badge className="bg-green-100 text-green-700 border-green-300" variant="outline">
                                <PlusCircle className="h-3 w-3 mr-1" />Credit
                              </Badge>
                            ) : tx.transaction_type === "expiry" ? (
                              <Badge className="bg-red-100 text-red-700 border-red-300" variant="outline">
                                <AlertTriangle className="h-3 w-3 mr-1" />Expired
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700 border-amber-300" variant="outline">
                                <MinusCircle className="h-3 w-3 mr-1" />Deduct
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-medium">{tx.amount}</TableCell>
                          <TableCell className="text-sm">
                            {tx.expiry_date ? (
                              <span className={isExpired ? "text-red-600 font-medium" : ""}>
                                {format(parseISO(tx.expiry_date), "dd MMM yyyy")}
                                {isExpired && " (Expired)"}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">No expiry</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[250px] truncate text-sm text-muted-foreground">{tx.description || "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── New Request Dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Leave Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Employee *</Label>
              <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{(employees || []).map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Leave Type</Label>
              <Select value={form.leave_type} onValueChange={(v) => setForm({ ...form, leave_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEAVE_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>From *</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>To *</Label><Input type="date" value={form.end_date} min={form.start_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div><Label>Reason</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        {/* === Adjust Balance Dialog === */}
        <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Adjust Leave Balance - {adjustForm.employee_name}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Leave Type</Label>
                <Select value={adjustForm.leave_type} onValueChange={(v) => setAdjustForm({ ...adjustForm, leave_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comp_off">Compensatory Off (CO)</SelectItem>
                    <SelectItem value="el_pl">Earned/Privilege (EL/PL)</SelectItem>
                    <SelectItem value="casual">Casual Leave</SelectItem>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Action</Label>
                  <Select value={adjustForm.transaction_type} onValueChange={(v) => setAdjustForm({ ...adjustForm, transaction_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">Credit (Add)</SelectItem>
                      <SelectItem value="deduction">Deduct (Remove)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Days</Label>
                  <Input type="number" min="0.5" step="0.5" value={adjustForm.amount} onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Expiry Date (Optional)</Label>
                <Input type="date" value={adjustForm.expiry_date} onChange={(e) => setAdjustForm({ ...adjustForm, expiry_date: e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">Leave blank if it does not expire.</p>
              </div>
              <div>
                <Label>Reason / Note</Label>
                <Textarea placeholder="e.g., Worked on Sunday (Aug 22)" value={adjustForm.description} onChange={(e) => setAdjustForm({ ...adjustForm, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
              <Button onClick={submitAdjust}>Save Adjustment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
}


