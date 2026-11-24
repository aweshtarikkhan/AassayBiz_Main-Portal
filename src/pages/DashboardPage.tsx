import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  IndianRupee, Wallet, ShoppingCart, FileText, AlertTriangle, BarChart as BarChartIcon,
  Plus, Users, Phone, PhoneCall, TrendingUp, TrendingDown, Clock, CheckCircle2,
  FilePlus2, Receipt, CreditCard, UserPlus, UserCircle, Briefcase, Mail, Activity, PackagePlus, FileSpreadsheet, Upload, Building2, BookOpen,
  Boxes, Flame, ShieldAlert, Hourglass, ArrowUpRight, Tag, Sparkles, RefreshCcw, PackageX, BadgePercent, AlertOctagon
} from "lucide-react";
import { isRetailOrg } from "@/lib/business-category";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import { format, subDays, isAfter, isSameDay } from "date-fns";
import { AutoFitNumber } from "@/components/shared/AutoFitNumber";
import { isAdvanceAdjustmentPayment } from "@/lib/utils";

function computeShiftStatus(clockInTime: string, shift: any): string {
  if (!clockInTime) return "absent";
  let clockInMins = NaN;
  try {
    const d = new Date(clockInTime);
    if (!isNaN(d.getTime())) {
      const istTimeStr = d.toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour12: false, hour: "2-digit", minute: "2-digit" });
      const [ih, im] = istTimeStr.split(":").map(Number);
      if (!isNaN(ih) && !isNaN(im)) {
        clockInMins = ih * 60 + im;
      } else {
        clockInMins = d.getHours() * 60 + d.getMinutes();
      }
    }
  } catch {}

  if (isNaN(clockInMins)) {
    const match = String(clockInTime).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[3]?.toUpperCase();
      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      clockInMins = h * 60 + m;
    }
  }

  if (isNaN(clockInMins)) return "present";

  const effectiveShift = shift || {
    start_time: "09:00",
    grace_minutes: 15,
    late_end: "10:30",
    half_day_end: "14:00",
  };

  const toMins = (t: string) => {
    if (!t) return 0;
    const [h, m] = t.slice(0, 5).split(":").map(Number);
    return h * 60 + m;
  };
  const startTimeMins = toMins(effectiveShift.start_time || "09:00");
  const graceMins = effectiveShift.grace_minutes ?? 15;
  const graceEnd = startTimeMins + graceMins;
  const lateEnd = toMins(effectiveShift.late_end || "10:30");
  const halfEnd = toMins(effectiveShift.half_day_end || "14:00");

  if (clockInMins <= graceEnd) return "present";
  if (clockInMins <= lateEnd) return "late";
  if (clockInMins <= halfEnd) return "half_day";
  return "half_day";
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const org = useAppStore((s) => s.organization);
  const [loading, setLoading] = useState(true);

  const [dateFilter, setDateFilter] = useState("30days");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [billPayments, setBillPayments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [todayHRStats, setTodayHRStats] = useState({ present: 0, absent: 0, onLeave: 0, late: 0, total: 0 });
  const [leaves, setLeaves] = useState<any[]>([]);
  const [regularizations, setRegularizations] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [creditNotes, setCreditNotes] = useState<any[]>([]);
  const [invoiceLines, setInvoiceLines] = useState<any[]>([]);

  useEffect(() => {
    if (!org?.id) return;
    const loadData = async () => {
      setLoading(true);

      const todayStr = format(new Date(), "yyyy-MM-dd");

      const [invRes, payRes, expRes, billRes, billPayRes, empRes, leadRes, actRes, hrAttRes, clockinRes, leavesRes, shiftsRes, empShiftsRes, regRes, itemsRes, creditNotesRes] = await Promise.all([
        supabase.from("invoices").select("*").eq("org_id", org.id).neq("status", "void").neq("status", "draft"),
        supabase.from("payments").select("*").eq("org_id", org.id),
        supabase.from("business_expenses").select("*").eq("org_id", org.id),
        supabase.from("bills").select("*").eq("org_id", org.id),
        (supabase as any).from("bill_payments").select("*").eq("org_id", org.id),
        supabase.from("employees").select("*").eq("org_id", org.id).eq("is_active", true),
        supabase.from("leads").select("*").eq("org_id", org.id),
        supabase.from("activities").select("*").eq("org_id", org.id),
        // HR Data for today
        supabase.from("attendance").select("*").eq("org_id", org.id).eq("attendance_date", todayStr),
        supabase.from("attendances").select("*").eq("org_id", org.id).eq("date", todayStr),
        supabase.from("leaves").select("*").eq("org_id", org.id),
        supabase.from("shifts").select("*").eq("org_id", org.id).order("is_default", { ascending: false }),
        supabase.from("employee_shifts").select("*, shifts(*)").eq("org_id", org.id),
        supabase.from("attendance_regularizations").select("*").eq("org_id", org.id).eq("status", "pending"),
        supabase.from("items").select("id, name, sku, stock_quantity, low_stock_threshold, unit, unit_price, purchase_price, expiry_date, batch_no").eq("org_id", org.id),
        supabase.from("credit_notes").select("*").eq("org_id", org.id),
      ]);

      const allInvoices = invRes.data || [];
      setInvoices(allInvoices);
      setPayments(payRes.data || []);
      setExpenses(expRes.data || []);
      setBills(billRes.data || []);
      setBillPayments(billPayRes.data || []);
      setEmployees(empRes.data || []);
      setLeads(leadRes.data || []);
      setActivities(actRes.data || []);
      setLeaves(leavesRes.data || []);
      setRegularizations(regRes.data || []);
      setItems(itemsRes.data || []);
      setCreditNotes(creditNotesRes.data || []);

      if (allInvoices.length > 0) {
        const topInvoiceIds = allInvoices.slice(0, 150).map((i: any) => i.id);
        const { data: linesData } = await supabase
          .from("invoice_lines")
          .select("id, item_id, name, quantity, rate, amount, invoice_id")
          .in("invoice_id", topInvoiceIds);
        setInvoiceLines(linesData || []);
      }

      // Calculate HR Stats for today
      const orgDefaultShift = (shiftsRes?.data || []).find((s: any) => s.is_default) || shiftsRes?.data?.[0] || null;
      const shiftMap: Record<string, any> = {};
      (empShiftsRes?.data || []).forEach((es: any) => {
        shiftMap[es.employee_id] = es.shifts;
      });

      const mergedMap: Record<string, any> = {};

      // 1. Manual Attendance Overrides
      (hrAttRes?.data || []).forEach((r: any) => {
        if (!r.employee_id) return;
        mergedMap[r.employee_id] = {
          status: r.override_status || r.status || "present",
          clock_in_time: r.clock_in_time || r.check_in_time || null
        };
      });

      // 2. Clock-ins
      (clockinRes?.data || []).forEach((r: any) => {
        if (!r.employee_id) return;
        const shift = shiftMap[r.employee_id] || orgDefaultShift;
        let calculatedStatus = r.status;
        if (r.clock_in_time && (!calculatedStatus || calculatedStatus === "present")) {
          calculatedStatus = computeShiftStatus(r.clock_in_time, shift);
        }

        const existing = mergedMap[r.employee_id];
        if (existing) {
          existing.clock_in_time = r.clock_in_time || existing.clock_in_time;
          if ((!existing.status || existing.status === "absent" || existing.status === "present") && r.clock_in_time) {
            existing.status = calculatedStatus || "present";
          }
          if (existing.status === "present" && (calculatedStatus === "late" || calculatedStatus === "half_day" || calculatedStatus === "half-day")) {
            existing.status = calculatedStatus;
          }
        } else {
          mergedMap[r.employee_id] = {
            status: calculatedStatus || "present",
            clock_in_time: r.clock_in_time || null
          };
        }
      });

      // 3. Approved Leaves
      (leavesRes?.data || [])
        .filter((l: any) => l.status === "approved")
        .forEach((l: any) => {
        if (!l.employee_id || !l.start_date) return;
        const s = new Date(l.start_date);
        const e = new Date(l.end_date || l.start_date);
        const today = new Date();
        // Reset time for accurate date comparison
        s.setHours(0,0,0,0);
        e.setHours(23,59,59,999);
        if (today >= s && today <= e) {
           const existing = mergedMap[l.employee_id];
           if (!existing || !existing.clock_in_time) {
             mergedMap[l.employee_id] = { status: "leave" };
           }
        }
      });

      let presentCount = 0;
      let absentCount = 0;
      let onLeaveCount = 0;
      let lateCount = 0;

      const allEmployees = empRes.data || [];
      allEmployees.forEach((emp) => {
        const att = mergedMap[emp.id];
        if (!att) {
          absentCount++;
          return;
        }
        const s = att.status?.toLowerCase() || "absent";
        if (["present", "wfh", "od"].includes(s)) {
          presentCount++;
        } else if (["late", "half_day", "half-day"].includes(s)) {
          presentCount++; // Consider late/half day as present for overall headcount
          lateCount++;
        } else if (["leave", "paid_leave", "casual", "sick", "el_pl", "comp_off", "maternity", "approved_leave"].includes(s)) {
          onLeaveCount++;
        } else {
          absentCount++; // absent, lwp, ncns etc
        }
      });

      setTodayHRStats({
        present: presentCount,
        absent: absentCount,
        onLeave: onLeaveCount,
        late: lateCount,
        total: allEmployees.length
      });
      
      setLoading(false);
    };
    loadData();
  }, [org?.id]);

  // Date Filtering Logic
  const getFilterDate = () => {
    const today = new Date();
    if (dateFilter === "7days") return subDays(today, 7);
    if (dateFilter === "30days") return subDays(today, 30);
    if (dateFilter === "90days") return subDays(today, 90);
    return subDays(today, 365); // year
  };

  const filterDate = getFilterDate();

  // Helper to check if record is in date range
  const isInRange = (dateStr: string) => isAfter(new Date(dateStr), filterDate);

  // Filtered Data
  const filteredInvoices = invoices.filter(i => isInRange(i.issue_date || i.created_at));
  const filteredPayments = payments.filter(p => isInRange(p.payment_date || p.created_at));
  const filteredExpenses = expenses.filter(e => isInRange(e.expense_date || e.created_at));
  const filteredBillPayments = billPayments.filter(bp => isInRange(bp.payment_date || bp.created_at));
  
  // KPI Calculations
  const totalRevenue = filteredInvoices.reduce((acc, curr) => acc + Number(curr.total || 0), 0);
  const paymentReceived = filteredPayments
    .filter(p => !isAdvanceAdjustmentPayment(p))
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const totalExpenses =
    filteredExpenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0) +
    filteredBillPayments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const totalOutstanding = filteredInvoices.reduce((acc, curr) => acc + Number(curr.balance_due || 0), 0);
  
  // Real Action Required Calculations
  const overdueInvoices = invoices.filter(
    (i) => i.status === "overdue" || (i.due_date && new Date(i.due_date) < new Date() && Number(i.balance_due || 0) > 0)
  );
  const overdueInvoicesCount = overdueInvoices.length;
  const overdueAmount = overdueInvoices.reduce((acc, curr) => acc + Number(curr.balance_due || 0), 0);
  const netCashFlow = paymentReceived - totalExpenses;

  const unpaidBills = bills.filter(
    (b) => Number(b.balance_due || 0) > 0 && b.status !== "paid" && b.status !== "cancelled"
  );
  const unpaidBillsCount = unpaidBills.length;
  const unpaidBillsAmount = unpaidBills.reduce((acc, curr) => acc + Number(curr.balance_due || 0), 0);

  const pendingLeaves = leaves.filter((l) => l.status === "pending");
  const pendingRegs = regularizations.filter((r) => r.status === "pending");
  const attendanceIssuesCount = pendingLeaves.length + pendingRegs.length;

  const followUpLeads = leads.filter(
    (l) => l.status === "new" || l.status === "contacted" || l.priority === "hot"
  );
  const followUpLeadsCount = followUpLeads.length;
  const hotLeadsCount = followUpLeads.filter((l) => l.priority === "hot").length;

  const hasAnyActionRequired =
    overdueInvoicesCount > 0 ||
    unpaidBillsCount > 0 ||
    attendanceIssuesCount > 0 ||
    followUpLeadsCount > 0;

  // Chart Data: Revenue vs Expenses
  const chartDataMap: Record<string, { date: string; revenue: number; expense: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = subDays(new Date(), i);
    const dateStr = format(d, "MMM dd");
    chartDataMap[dateStr] = { date: dateStr, revenue: 0, expense: 0, collections: 0, profit: 0 };
  }
  
  filteredInvoices.forEach(inv => {
    const dStr = format(new Date(inv.issue_date || inv.created_at), "MMM dd");
    if (chartDataMap[dStr]) chartDataMap[dStr].revenue += Number(inv.total || 0);
  });
  filteredExpenses.forEach(exp => {
    const dStr = format(new Date(exp.expense_date || exp.created_at), "MMM dd");
    if (chartDataMap[dStr]) chartDataMap[dStr].expense += Number(exp.amount || 0);
  });
  filteredBillPayments.forEach(bp => {
    const dStr = format(new Date(bp.payment_date || bp.created_at), "MMM dd");
    if (chartDataMap[dStr]) chartDataMap[dStr].expense += Number(bp.amount || 0);
  });
  const areaChartData = Object.values(chartDataMap);

  // Receivables Data
  const currentOutstanding = totalOutstanding - overdueAmount; // Simplification
  const pieData = [
    { name: "Current", value: currentOutstanding > 0 ? currentOutstanding : 1, color: "#3b82f6" },
    { name: "Overdue", value: overdueAmount > 0 ? overdueAmount : 1, color: "#ef4444" },
  ];

  // HR Data is now calculated in useEffect and stored in todayHRStats

  // CRM Data - Accurate counts from real database records
  const totalLeadsCount = leads.length;
  const newLeadsCount = leads.filter((l) => l.status === "new").length;
  const contactedLeadsCount = leads.filter((l) => l.status === "contacted").length;
  const qualifiedLeadsCount = leads.filter((l) => l.status === "qualified").length;

  // Real CRM Activities counts
  const callActivitiesCount = activities.filter((a) => (a.activity_type || a.type) === "call").length;
  const emailActivitiesCount = activities.filter((a) => (a.activity_type || a.type) === "email").length;
  const meetingTaskActivitiesCount = activities.filter((a) => {
    const t = a.activity_type || a.type;
    return t === "meeting" || t === "task";
  }).length;

  const fmtCurrency = (val: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);

  const isRetail = isRetailOrg(org);

  // Retail Calculations
  const todayInvoices = useMemo(() => {
    return invoices.filter((inv) => isSameDay(new Date(inv.issue_date || inv.created_at), new Date()));
  }, [invoices]);

  const todaySalesAmount = useMemo(() => {
    return todayInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
  }, [todayInvoices]);

  const todayInvoicesCount = todayInvoices.length;

  const monthSalesAmount = useMemo(() => {
    const now = new Date();
    return invoices
      .filter((inv) => {
        const d = new Date(inv.issue_date || inv.created_at);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((sum, inv) => sum + Number(inv.total || 0), 0);
  }, [invoices]);

  const totalCreditReturns = useMemo(() => {
    return creditNotes.reduce((sum, cn) => sum + Number(cn.total || 0), 0);
  }, [creditNotes]);

  const expiredItems = useMemo(() => {
    const now = new Date();
    return items.filter((it) => it.expiry_date && new Date(it.expiry_date) < now && Number(it.stock_quantity || 0) > 0);
  }, [items]);

  const expiredLoss = useMemo(() => {
    return expiredItems.reduce((sum, it) => {
      const cost = Number(it.purchase_price) || (Number(it.unit_price) * 0.7);
      return sum + (cost * Number(it.stock_quantity || 0));
    }, 0);
  }, [expiredItems]);

  const totalReturnAndLoss = totalCreditReturns + expiredLoss;

  const lowStockItems = useMemo(() => {
    return items.filter((it) => Number(it.stock_quantity || 0) <= (Number(it.low_stock_threshold) || 10));
  }, [items]);

  const top5LowestStockItems = useMemo(() => {
    return [...items]
      .sort((a, b) => Number(a.stock_quantity || 0) - Number(b.stock_quantity || 0))
      .slice(0, 5);
  }, [items]);

  const topSellingItems = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number; unit: string }> = {};
    invoiceLines.forEach((l) => {
      const key = l.name || l.item_id || "Item";
      if (!map[key]) map[key] = { name: key, qty: 0, revenue: 0, unit: l.unit || "pcs" };
      map[key].qty += Number(l.quantity || 0);
      map[key].revenue += Number(l.amount || 0);
    });
    return Object.values(map)
      .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
      .slice(0, 5);
  }, [invoiceLines]);

  // High-Margin Items: MUST have a valid positive purchase price > 0 and selling price > purchase price
  const highMarginItems = useMemo(() => {
    const salesMap: Record<string, number> = {};
    invoiceLines.forEach((l) => {
      const key = l.name?.toLowerCase().trim();
      if (key) salesMap[key] = (salesMap[key] || 0) + Number(l.quantity || 0);
    });

    return items
      .filter((it) => {
        const uPrice = Number(it.unit_price || 0);
        const pPrice = Number(it.purchase_price || 0);
        // Exclude items without purchase price (pPrice <= 0) to avoid false 100% margin
        return uPrice > 0 && pPrice > 0 && uPrice > pPrice;
      })
      .map((it) => {
        const uPrice = Number(it.unit_price || 0);
        const pPrice = Number(it.purchase_price || 0);
        const margin = Math.round(((uPrice - pPrice) / uPrice) * 100);
        const sales = salesMap[it.name?.toLowerCase().trim()] || 0;
        return { ...it, margin, sales, uPrice, pPrice };
      })
      .filter((it) => it.margin > 0)
      .sort((a, b) => b.margin - a.margin || b.uPrice - a.uPrice)
      .slice(0, 5);
  }, [items, invoiceLines]);

  // Slow-Moving Items: High inventory stock with lowest sales volume
  const slowMovingItems = useMemo(() => {
    const salesMap: Record<string, number> = {};
    invoiceLines.forEach((l) => {
      const key = l.name?.toLowerCase().trim();
      if (key) salesMap[key] = (salesMap[key] || 0) + Number(l.quantity || 0);
    });

    return items
      .filter((it) => Number(it.stock_quantity || 0) > 0)
      .map((it) => {
        const sales = salesMap[it.name?.toLowerCase().trim()] || 0;
        return { ...it, sales };
      })
      .sort((a, b) => a.sales - b.sales || Number(b.stock_quantity || 0) - Number(a.stock_quantity || 0))
      .slice(0, 5);
  }, [items, invoiceLines]);

  const expiryRiskStats = useMemo(() => {
    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    let expiredCount = 0;
    let expiredVal = 0;
    let nearExpiryCount = 0;
    let nearExpiryVal = 0;
    let safeCount = 0;

    const nearExpiryList: any[] = [];

    items.forEach((it) => {
      if (!it.expiry_date) return;
      const exp = new Date(it.expiry_date);
      const stock = Number(it.stock_quantity || 0);
      const cost = Number(it.purchase_price) || (Number(it.unit_price) * 0.7);

      if (exp < now) {
        expiredCount++;
        expiredVal += (cost * stock);
      } else if (exp <= in30Days) {
        nearExpiryCount++;
        nearExpiryVal += (cost * stock);
        nearExpiryList.push(it);
      } else {
        safeCount++;
      }
    });

    nearExpiryList.sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

    return {
      expiredCount,
      expiredVal,
      nearExpiryCount,
      nearExpiryVal,
      safeCount,
      nearExpiryList: nearExpiryList.slice(0, 5),
    };
  }, [items]);

  // Dynamic Recent Activity Timeline
  const recentActivities = useMemo(() => {
    const list: any[] = [];

    (invoices || []).slice(0, 10).forEach((inv) => {
      list.push({
        id: `inv-${inv.id}`,
        icon: FileText,
        color: "text-blue-500",
        bg: "bg-blue-50",
        title: `Invoice ${inv.invoice_number || ""} created`,
        amount: fmtCurrency(Number(inv.total || 0)),
        date: new Date(inv.created_at || inv.issue_date),
      });
    });

    (payments || []).slice(0, 10).forEach((pay) => {
      list.push({
        id: `pay-${pay.id}`,
        icon: Wallet,
        color: "text-emerald-500",
        bg: "bg-emerald-50",
        title: pay.payment_number ? `Payment ${pay.payment_number} received` : "Payment received",
        amount: `+ ${fmtCurrency(Number(pay.amount || 0))}`,
        date: new Date(pay.payment_date || pay.created_at),
      });
    });

    (leads || []).slice(0, 5).forEach((ld) => {
      list.push({
        id: `lead-${ld.id}`,
        icon: UserPlus,
        color: "text-purple-500",
        bg: "bg-purple-50",
        title: `Lead: ${ld.name || "Prospect added"}`,
        amount: ld.estimated_value ? fmtCurrency(Number(ld.estimated_value)) : "",
        date: new Date(ld.created_at),
      });
    });

    (activities || []).slice(0, 5).forEach((act) => {
      list.push({
        id: `act-${act.id}`,
        icon: Phone,
        color: "text-amber-500",
        bg: "bg-amber-50",
        title: act.subject || act.title || "CRM Activity recorded",
        amount: "",
        date: new Date(act.created_at),
      });
    });

    return list
      .filter((item) => !isNaN(item.date.getTime()))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5)
      .map((item) => ({
        ...item,
        time: format(item.date, "dd MMM, hh:mm a"),
      }));
  }, [invoices, payments, leads, activities]);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto bg-slate-50 min-h-screen">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500 bg-clip-text text-transparent">
            {isRetail ? "Retail Store Overview" : "Business Overview"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isRetail ? "Real-time counter sales, top selling items, and inventory alerts." : "Here's what's happening with your business today."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[160px] bg-white">
              <SelectValue placeholder="Select Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="1year">Last 1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button className="bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-2" /> Create
          </Button>
        </div>
      </div>

      {isRetail ? (
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-2 sm:gap-3">
          <QuickAction icon={FilePlus2} label="Counter Bill" onClick={() => navigate('/invoices/new')} />
          <QuickAction icon={PackagePlus} label="Items & Stock" onClick={() => navigate('/items')} />
          <QuickAction icon={FileSpreadsheet} label="Purchase Bill" onClick={() => navigate('/purchase-invoices/new')} />
          <QuickAction icon={RefreshCcw} label="Sales Return" onClick={() => navigate('/credit-notes')} />
          <QuickAction icon={Receipt} label="Add Expense" onClick={() => navigate('/expenses')} />
          <QuickAction icon={UserCircle} label="Customers" onClick={() => navigate('/clients')} />
          <QuickAction icon={Building2} label="Vendors" onClick={() => navigate('/vendors')} />
          <QuickAction icon={CheckCircle2} label="Attendance" onClick={() => navigate('/attendance')} />
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-2 sm:gap-3">
          <QuickAction icon={FilePlus2} label="Create Invoice" onClick={() => navigate('/invoices/new')} />
          <QuickAction icon={CreditCard} label="Record Payment" onClick={() => navigate('/payments')} />
          <QuickAction icon={Receipt} label="Add Expense" onClick={() => navigate('/expenses')} />
          <QuickAction icon={UserCircle} label="Add Customer" onClick={() => navigate('/clients')} />
          <QuickAction icon={UserPlus} label="Add Lead" onClick={() => navigate('/leads')} />
          <QuickAction icon={Briefcase} label="Add Employee" onClick={() => navigate('/employees?add=1')} />
          <QuickAction icon={CheckCircle2} label="Record Attendance" onClick={() => navigate('/attendance')} />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <QuickAction icon={Activity} label="More" onClick={() => {}} />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/tally-sync')}>
                <Upload className="w-4 h-4 mr-2 text-blue-500" />
                Tally Master Sync
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/purchase-invoices/new')}>
                <FileSpreadsheet className="w-4 h-4 mr-2 text-slate-500" />
                <span>Purchase Invoice</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/vendors')}>
                <Building2 className="w-4 h-4 mr-2 text-slate-500" />
                <span>Add Vendor</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/items')}>
                <PackagePlus className="w-4 h-4 mr-2 text-slate-500" />
                <span>Add Item/Product</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/journal')}>
                <BookOpen className="w-4 h-4 mr-2 text-slate-500" />
                <span>Record Journal</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* 2. Top KPI Row */}
      {isRetail ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 2xl:grid-cols-6 gap-3 sm:gap-4">
          <KPICard title="Today's Sale" value={fmtCurrency(todaySalesAmount)} icon={Flame} trend={`${todayInvoicesCount} bills`} isUp={true} color="text-amber-600" bg="bg-amber-100" />
          <KPICard title="Total Sales" value={fmtCurrency(totalRevenue)} icon={IndianRupee} trend="Overall" isUp={true} color="text-emerald-600" bg="bg-emerald-100" />
          <KPICard title="Monthly Sale" value={fmtCurrency(monthSalesAmount)} icon={TrendingUp} trend="This Month" isUp={true} color="text-blue-600" bg="bg-blue-100" />
          <KPICard title="Today's Counter Sales & Invoices" value={fmtCurrency(todaySalesAmount)} icon={Receipt} trend={`${todayInvoicesCount} invoices`} isUp={true} color="text-indigo-600" bg="bg-indigo-100" />
          <KPICard title="Sales Return & Loss" value={fmtCurrency(totalReturnAndLoss)} icon={PackageX} trend={`${creditNotes.length} returns`} isUp={false} color="text-rose-600" bg="bg-rose-100" />
          <KPICard title="Low Stock / Reorder Alerts" value={`${lowStockItems.length} Items`} icon={AlertTriangle} trend={lowStockItems.length > 0 ? "Action needed" : "Healthy"} isUp={lowStockItems.length === 0} color="text-orange-600" bg="bg-orange-100" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 2xl:grid-cols-6 gap-3 sm:gap-4">
          <KPICard title="Total Sales" value={fmtCurrency(totalRevenue)} icon={IndianRupee} trend="+12.5%" isUp={true} color="text-emerald-600" bg="bg-emerald-100" />
          <KPICard title="Payment Received" value={fmtCurrency(paymentReceived)} icon={Wallet} trend="+8.2%" isUp={true} color="text-emerald-600" bg="bg-emerald-100" />
          <KPICard title="Total Expenses" value={fmtCurrency(totalExpenses)} icon={ShoppingCart} trend="-2.4%" isUp={false} color="text-rose-600" bg="bg-rose-100" />
          <KPICard title="Outstanding (Pending)" value={fmtCurrency(totalOutstanding)} icon={FileText} trend="+5.1%" isUp={true} color="text-blue-600" bg="bg-blue-100" />
          <KPICard title="Overdue Amount" value={fmtCurrency(overdueAmount)} icon={AlertTriangle} trend="-1.2%" isUp={false} color="text-red-600" bg="bg-red-100" />
          <KPICard title="Net Cash Flow" value={fmtCurrency(netCashFlow)} icon={BarChartIcon} trend="+14.5%" isUp={true} color="text-purple-600" bg="bg-purple-100" />
        </div>
      )}

      {/* Retailer Dashboard Sections */}
      {isRetail ? (
        <>
          {/* Row 1: Sales Trend & Top 5 Lowest Stock Alerts */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Sales Trend Chart */}
            <Card className="lg:col-span-2 shadow-sm hover:shadow-md transition-shadow duration-300 border-slate-200/60 rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base font-semibold">Store Sales Trend</CardTitle>
                  <CardDescription className="text-xs">Daily counter sales and revenue performance</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Today: {fmtCurrency(todaySalesAmount)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="retailColorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => '₹' + Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(v))} />
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Sales']} />
                      <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#retailColorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top 5 Lowest Stock / Reorder Alerts */}
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 border-slate-200/60 rounded-2xl flex flex-col">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-900">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Low Stock / Reorder Alerts
                  </CardTitle>
                  <CardDescription className="text-xs">Top 5 items lowest in available inventory</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/items')} className="h-7 text-xs text-blue-600 hover:text-blue-700 px-2">
                  View All
                </Button>
              </CardHeader>
              <CardContent className="space-y-2.5 flex-1 flex flex-col justify-between">
                {top5LowestStockItems.length > 0 ? (
                  <div className="space-y-2">
                    {top5LowestStockItems.map((item, idx) => {
                      const qty = Number(item.stock_quantity ?? 0);
                      const isZero = qty <= 0;
                      return (
                        <div key={item.id || idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors">
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="text-xs font-semibold text-slate-800 truncate" title={item.name}>
                              {item.name}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span>Available:</span>
                              <span className={`font-bold ${isZero ? 'text-rose-600' : qty <= 5 ? 'text-orange-600' : 'text-slate-700'}`}>
                                {qty} {item.unit || 'pcs'}
                              </span>
                              {item.batch_no && (
                                <span className="text-[10px] text-slate-400">({item.batch_no})</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isZero ? 'bg-rose-100 text-rose-700' : 'bg-orange-100 text-orange-700'}`}>
                              {isZero ? 'Out of Stock' : 'Low'}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-[11px] font-medium"
                              onClick={() => navigate('/purchase-invoices/new')}
                            >
                              + Reorder
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                    All item inventory levels are healthy!
                  </div>
                )}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Total Low Stock Items:</span>
                  <span className="font-bold text-slate-800">{lowStockItems.length} items</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Top Selling Items, High-Margin Items, Slow-Moving Items, and Expiry Risk Graph */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {/* 1. Top Selling Items */}
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 border-slate-200/60 rounded-2xl flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-900">
                      <Flame className="w-4 h-4 text-amber-500" />
                      Top Selling Items
                    </CardTitle>
                    <CardDescription className="text-xs">Fastest-moving items by sales volume</CardDescription>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    Top 5
                  </span>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {topSellingItems.length > 0 ? (
                    topSellingItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${idx === 0 ? 'bg-amber-400 text-white' : idx === 1 ? 'bg-slate-300 text-slate-800' : idx === 2 ? 'bg-amber-600/60 text-white' : 'bg-slate-200 text-slate-600'}`}>
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-800 truncate" title={item.name}>
                              {item.name}
                            </div>
                            <div className="text-[10.5px] text-slate-500">
                              {item.qty} {item.unit || 'pcs'} sold
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-emerald-600">{fmtCurrency(item.revenue)}</div>
                          <div className="text-[9.5px] text-slate-400">Total Rev</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No sales data yet. Invoices will automatically calculate top sellers.
                    </div>
                  )}
                </CardContent>
              </div>
            </Card>

            {/* 2. High-Margin Items (Only items with valid purchase price) */}
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 border-slate-200/60 rounded-2xl flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-900">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      High-Margin Items
                    </CardTitle>
                    <CardDescription className="text-xs">Highest profit margin based on purchase cost</CardDescription>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    High Profit
                  </span>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {highMarginItems.length > 0 ? (
                    highMarginItems.map((item, idx) => (
                      <div key={item.id || idx} className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/40 border border-emerald-100/60">
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-semibold text-slate-800 truncate" title={item.name}>
                            {item.name}
                          </div>
                          <div className="text-[10.5px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>Stock: {item.stock_quantity ?? 0}</span>
                            <span>•</span>
                            <span>{item.sales} sold</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                            {item.margin}% Margin
                          </span>
                          <div className="text-[9.5px] text-slate-400 mt-0.5">₹{item.unit_price} / unit</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No items with purchase price & positive margin found. Add purchase price in Items to view margins.
                    </div>
                  )}
                </CardContent>
              </div>
            </Card>

            {/* 3. Slow-Moving Items (Available stock with low sales volume) */}
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 border-slate-200/60 rounded-2xl flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-900">
                      <TrendingDown className="w-4 h-4 text-purple-600" />
                      Slow-Moving Items
                    </CardTitle>
                    <CardDescription className="text-xs">High stock with low sales needing store push</CardDescription>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    Offers
                  </span>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {slowMovingItems.length > 0 ? (
                    slowMovingItems.map((item, idx) => (
                      <div key={item.id || idx} className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/40 border border-purple-100/60">
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-semibold text-slate-800 truncate" title={item.name}>
                            {item.name}
                          </div>
                          <div className="text-[10.5px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>Stock: {item.stock_quantity ?? 0} {item.unit || 'pcs'}</span>
                            <span>•</span>
                            <span className={item.sales === 0 ? "text-amber-600 font-semibold" : ""}>{item.sales} sold</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                            ₹{item.unit_price} / unit
                          </span>
                          <div className="text-[9.5px] text-amber-600 font-medium mt-0.5">
                            {item.sales === 0 ? "Zero Sales" : "Low Movement"}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      All in-stock inventory items are moving steadily.
                    </div>
                  )}
                </CardContent>
              </div>
            </Card>

            {/* 4. Expiry Risk / Near-Expiry Stock Graph */}
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 border-slate-200/60 rounded-2xl">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-900">
                    <Hourglass className="w-4 h-4 text-rose-500" />
                    Expiry Risk / Near-Expiry Stock
                  </CardTitle>
                  <CardDescription className="text-xs">Inventory shelf-life and loss prevention</CardDescription>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${expiryRiskStats.expiredCount > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                  {expiryRiskStats.expiredCount > 0 ? `${expiryRiskStats.expiredCount} Expired` : 'Safe'}
                </span>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Visual Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-slate-600">
                    <span>Stock Risk Distribution</span>
                    <span>{expiryRiskStats.expiredCount + expiryRiskStats.nearExpiryCount} at risk</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-100 flex overflow-hidden">
                    {expiryRiskStats.expiredCount > 0 && (
                      <div
                        className="bg-rose-500 h-full"
                        style={{ width: `${Math.max(15, (expiryRiskStats.expiredCount / (items.length || 1)) * 100)}%` }}
                        title={`Expired: ${expiryRiskStats.expiredCount} items`}
                      />
                    )}
                    {expiryRiskStats.nearExpiryCount > 0 && (
                      <div
                        className="bg-amber-400 h-full"
                        style={{ width: `${Math.max(15, (expiryRiskStats.nearExpiryCount / (items.length || 1)) * 100)}%` }}
                        title={`Near Expiry: ${expiryRiskStats.nearExpiryCount} items`}
                      />
                    )}
                    <div className="bg-emerald-400 h-full flex-1" title="Safe items" />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block"/> Expired ({expiryRiskStats.expiredCount})</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/> &lt;30 Days ({expiryRiskStats.nearExpiryCount})</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/> Safe ({expiryRiskStats.safeCount})</span>
                  </div>
                </div>

                {/* Expiry Loss Value Summary */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2 rounded-lg bg-rose-50/60 border border-rose-100">
                    <div className="text-[10px] text-rose-600 font-medium">Expired Stock Loss</div>
                    <div className="text-xs font-bold text-rose-700">{fmtCurrency(expiryRiskStats.expiredVal)}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-100">
                    <div className="text-[10px] text-amber-700 font-medium">Near Expiry Risk</div>
                    <div className="text-xs font-bold text-amber-800">{fmtCurrency(expiryRiskStats.nearExpiryVal)}</div>
                  </div>
                </div>

                {/* Near Expiry Items List */}
                {expiryRiskStats.nearExpiryList.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-semibold text-slate-700">Immediate Attention Needed:</div>
                    {expiryRiskStats.nearExpiryList.slice(0, 3).map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs p-1.5 rounded bg-slate-50 border border-slate-100">
                        <span className="truncate max-w-[140px] font-medium text-slate-800">{it.name}</span>
                        <span className="text-[10.5px] font-semibold text-amber-700">{it.expiry_date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Counter Receipts & Recent Activities */}
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-sm hover:shadow-md transition-shadow duration-300 border-slate-200/60 rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-semibold">Today's Counter Bills &amp; Invoices</CardTitle>
                  <CardDescription className="text-xs">Live invoices generated at counter today</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/invoices')} className="h-7 text-xs">
                  All Invoices
                </Button>
              </CardHeader>
              <CardContent>
                {todayInvoices.length > 0 ? (
                  <div className="space-y-2">
                    {todayInvoices.slice(0, 6).map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {inv.invoice_number?.slice(-3) || '#'}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-800">
                              {(inv.metadata as any)?.client_name || inv.client_name || 'Walk-in Customer'}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {inv.invoice_number} • {format(new Date(inv.created_at || inv.issue_date), "hh:mm a")}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-900">{fmtCurrency(Number(inv.total || 0))}</div>
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-700 uppercase">
                            {(inv.metadata as any)?.payment_mode || inv.payment_mode || "Cash"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No counter invoices created today yet.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions & Store Summary */}
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 border-slate-200/60 rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Store Quick Summary</CardTitle>
                <CardDescription className="text-xs">Overview of catalog and today's activity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-medium text-slate-600">Total Catalog Items</span>
                  <span className="text-xs font-bold text-slate-900">{items.length} items</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-medium text-slate-600">Invoices Today</span>
                  <span className="text-xs font-bold text-emerald-600">{todayInvoicesCount} invoices</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-medium text-slate-600">Credit Notes / Returns</span>
                  <span className="text-xs font-bold text-rose-600">{creditNotes.length}</span>
                </div>
                <div className="pt-2">
                  <Button className="w-full bg-slate-900 hover:bg-slate-800 text-xs h-9" onClick={() => navigate('/invoices/new')}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Start Counter Billing
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <>
          {/* 3. Chart & Action Required Row */}
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-sm hover:shadow-md transition-shadow duration-300 border-slate-200/60 rounded-2xl">
              <Tabs defaultValue="revenue" className="w-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-semibold">Revenue vs Expenses</CardTitle>
                  <TabsList className="grid w-[400px] grid-cols-4">
                    <TabsTrigger value="revenue">Revenue</TabsTrigger>
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                    <TabsTrigger value="collections">Collections</TabsTrigger>
                    <TabsTrigger value="profit">Profit</TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent>
                
                <TabsContent value="revenue" className="mt-4">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => '₹' + Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(v))} />
                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value, name) => [`₹${Number(value).toLocaleString('en-IN')}`, String(name).charAt(0).toUpperCase() + String(name).slice(1)]} />
                        <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
                
                <TabsContent value="expenses" className="mt-4">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => '₹' + Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(v))} />
                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value, name) => [`₹${Number(value).toLocaleString('en-IN')}`, String(name).charAt(0).toUpperCase() + String(name).slice(1)]} />
                        <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
                
                <TabsContent value="collections" className="mt-4">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCol" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => '₹' + Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(v))} />
                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value, name) => [`₹${Number(value).toLocaleString('en-IN')}`, String(name).charAt(0).toUpperCase() + String(name).slice(1)]} />
                        <Area type="monotone" dataKey="collections" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCol)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
                
                <TabsContent value="profit" className="mt-4">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPro" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => '₹' + Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(v))} />
                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value, name) => [`₹${Number(value).toLocaleString('en-IN')}`, String(name).charAt(0).toUpperCase() + String(name).slice(1)]} />
                        <Area type="monotone" dataKey="profit" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorPro)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
                </CardContent>
              </Tabs>
              </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 border-slate-200/60 rounded-2xl">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold">Action Required</CardTitle>
                {hasAnyActionRequired ? (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200/60">
                    {(overdueInvoicesCount > 0 ? 1 : 0) + (unpaidBillsCount > 0 ? 1 : 0) + (attendanceIssuesCount > 0 ? 1 : 0) + (followUpLeadsCount > 0 ? 1 : 0)} pending
                  </span>
                ) : (
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All caught up
                  </span>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {hasAnyActionRequired ? (
                  <>
                    {overdueInvoicesCount > 0 && (
                      <ActionAlert
                        icon={AlertTriangle}
                        iconColor="text-red-500"
                        bgColor="bg-red-50"
                        text={`${overdueInvoicesCount} ${overdueInvoicesCount === 1 ? 'invoice is' : 'invoices are'} overdue`}
                        subtext={fmtCurrency(overdueAmount)}
                        btnText="View Invoices"
                        onClick={() => navigate('/invoices')}
                      />
                    )}
                    {unpaidBillsCount > 0 && (
                      <ActionAlert
                        icon={Wallet}
                        iconColor="text-orange-500"
                        bgColor="bg-orange-50"
                        text={`${unpaidBillsCount} vendor ${unpaidBillsCount === 1 ? 'payment' : 'payments'} pending`}
                        subtext={fmtCurrency(unpaidBillsAmount)}
                        btnText="Review Payments"
                        onClick={() => navigate('/purchase-invoices')}
                      />
                    )}
                    {attendanceIssuesCount > 0 && (
                      <ActionAlert
                        icon={Users}
                        iconColor="text-yellow-600"
                        bgColor="bg-yellow-50"
                        text={`${attendanceIssuesCount} employee ${attendanceIssuesCount === 1 ? 'attendance issue' : 'attendance issues'}`}
                        subtext={
                          pendingLeaves.length > 0 && pendingRegs.length > 0
                            ? `${pendingLeaves.length} leave, ${pendingRegs.length} regularization`
                            : pendingLeaves.length > 0
                            ? `${pendingLeaves.length} leave request pending`
                            : `${pendingRegs.length} regularization pending`
                        }
                        btnText="Review Attendance"
                        onClick={() => navigate(pendingLeaves.length > 0 ? '/leaves' : '/attendance')}
                      />
                    )}
                    {followUpLeadsCount > 0 && (
                      <ActionAlert
                        icon={Phone}
                        iconColor="text-purple-500"
                        bgColor="bg-purple-50"
                        text={`${followUpLeadsCount} ${followUpLeadsCount === 1 ? 'lead needs' : 'leads need'} follow-up`}
                        subtext={hotLeadsCount > 0 ? `${hotLeadsCount} high priority` : 'Pending outreach'}
                        btnText="Open CRM"
                        onClick={() => navigate('/leads')}
                      />
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-7 text-center px-4 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="text-sm font-semibold text-slate-800">All caught up!</div>
                    <div className="text-xs text-slate-500 mt-1 max-w-[280px]">
                      No overdue invoices, pending vendor bills, leave requests, or urgent leads require your attention.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 4. Four Analytics Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
            {/* Receivables */}
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 border-slate-200/60 rounded-2xl min-w-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600">Outstanding Receivables</CardTitle>
              </CardHeader>
              <CardContent className="min-w-0">
                <div className="text-slate-900 min-w-0 mb-1">
                  <AutoFitNumber value={fmtCurrency(totalOutstanding)} maxSize="2xl" />
                </div>
                <div className="mt-4 flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="h-[90px] w-[90px] sm:h-[100px] sm:w-[100px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <RechartsTooltip formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Amount']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Pie data={pieData} innerRadius={28} outerRadius={42} dataKey="value" stroke="none">
                          {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex justify-between items-center text-xs gap-1">
                      <div className="flex items-center gap-1.5 truncate"><div className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></div> <span className="truncate">Current</span></div>
                      <span className="font-semibold shrink-0">{Math.round((currentOutstanding/totalOutstanding)*100) || 0}%</span>
                    </div>
                    <div className="flex justify-between items-center text-xs gap-1">
                      <div className="flex items-center gap-1.5 truncate"><div className="w-2 h-2 rounded-full bg-red-500 shrink-0"></div> <span className="truncate">Overdue</span></div>
                      <span className="font-semibold shrink-0">{Math.round((overdueAmount/totalOutstanding)*100) || 0}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expenses */}
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 border-slate-200/60 rounded-2xl min-w-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600">Purchases & Expenses</CardTitle>
              </CardHeader>
              <CardContent className="min-w-0">
                <div className="text-slate-900 min-w-0">
                  <AutoFitNumber value={fmtCurrency(totalExpenses)} maxSize="2xl" />
                </div>
                <div className="text-xs text-rose-600 font-medium mt-1 truncate">Expense vs Sales: {totalRevenue ? Math.round((totalExpenses/totalRevenue)*100) : 0}%</div>
                <div className="h-[70px] w-full mt-4">
                   <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={areaChartData.slice(-7)}>
                        <RechartsTooltip cursor={{fill: 'transparent'}} formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Expense']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="expense" fill="#c084fc" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* HR */}
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 border-slate-200/60 rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600">HR & Attendance (Today)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-2xl font-bold">{todayHRStats.total}</div>
                    <div className="text-xs text-slate-500">Total</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-600">{todayHRStats.present}</div>
                    <div className="text-xs text-slate-500">Present</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-rose-600">{todayHRStats.absent}</div>
                    <div className="text-xs text-slate-500">Absent</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{todayHRStats.onLeave}</div>
                    <div className="text-xs text-slate-500">On Leave</div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Attendance Rate</span>
                    <span>{Math.round((todayHRStats.present / (todayHRStats.total || 1)) * 100) || 0}%</span>
                  </div>
                  <Progress value={Math.round((todayHRStats.present / (todayHRStats.total || 1)) * 100) || 0} className="h-1.5" />
                </div>
              </CardContent>
            </Card>

            {/* CRM */}
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 border-slate-200/60 rounded-2xl">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-600">CRM & Promotion</CardTitle>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" /> {newLeadsCount} New
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 mb-4">{totalLeadsCount} Leads</div>
                <div className="flex items-center justify-between gap-1 mb-6 text-xs text-center font-medium text-slate-600">
                  <div className="bg-slate-100 rounded p-1.5 w-full">Total<br/>{totalLeadsCount}</div>
                  <div className="bg-blue-50 rounded p-1.5 w-full text-blue-700">Cont.<br/>{contactedLeadsCount}</div>
                  <div className="bg-emerald-50 rounded p-1.5 w-full text-emerald-700">Qual.<br/>{qualifiedLeadsCount}</div>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <div className="text-center" title="Phone Calls">
                    <PhoneCall className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-700">{callActivitiesCount}</span>
                  </div>
                  <div className="text-center" title="Emails Sent">
                    <Mail className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-700">{emailActivitiesCount}</span>
                  </div>
                  <div className="text-center" title="Tasks & Meetings">
                    <Clock className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-700">{meetingTaskActivitiesCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* 5. Bottom Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm hover:shadow-md transition-shadow duration-300 border-slate-200/60 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.map((act) => (
                  <ActivityRow
                    key={act.id}
                    icon={act.icon}
                    color={act.color}
                    bg={act.bg}
                    title={act.title}
                    amount={act.amount}
                    time={act.time}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">
                No recent activity recorded yet. Create an invoice, payment, or lead to see timeline updates.
              </div>
            )}
          </CardContent>
        </Card>

        
      </div>

    </div>
  );
}

// Subcomponents
const KPICard = ({ title, value, icon: Icon, trend, isUp, color, bg }: any) => (
  <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 border border-slate-100 rounded-2xl overflow-hidden relative bg-white min-w-0">
    <div className={`absolute -right-6 -top-6 w-28 h-28 rounded-full ${bg} opacity-40 blur-3xl pointer-events-none`}></div>
    <CardContent className="p-4 sm:p-5 relative z-10 min-w-0">
      <div className="flex justify-between items-start mb-3 gap-2">
        <div className={`p-2.5 sm:p-3 rounded-xl ${bg} border border-white/50 shadow-sm shrink-0`}>
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color}`} />
        </div>
        <div className={`flex items-center text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:py-1 rounded-full shrink-0 ${isUp ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {isUp ? <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 shrink-0" /> : <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 shrink-0" />}
          <span className="truncate max-w-[85px] sm:max-w-none">{trend}</span>
        </div>
      </div>
      <div className="mt-3 sm:mt-4 min-w-0">
        <div className="text-xs sm:text-[13px] font-medium text-slate-500 mb-1 truncate" title={title}>{title}</div>
        <div className="text-slate-900 min-w-0">
          <AutoFitNumber value={value} maxSize="2xl" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const ActionAlert = ({ icon: Icon, iconColor, bgColor, text, subtext, btnText, onClick }: any) => (
  <div className="group flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-100/80 hover:border-slate-200 hover:shadow-sm transition-all cursor-default">
    <div className="flex items-center gap-3.5">
      <div className={`p-2.5 rounded-xl ${bgColor}`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">{text}</div>
        <div className="text-xs text-slate-500 mt-0.5">{subtext}</div>
      </div>
    </div>
    <Button variant="ghost" size="sm" onClick={onClick} className="h-8 text-xs font-semibold text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg px-3">
      {btnText}
    </Button>
  </div>
);

const ActivityRow = ({ icon: Icon, color, bg, title, amount, time }: any) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 last:pb-0">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-full ${bg}`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div>
        <div className="text-sm font-medium text-slate-900">{title}</div>
        <div className="text-xs text-slate-500">{time}</div>
      </div>
    </div>
    {amount && (
      <div className={`text-sm font-semibold ${amount.startsWith('+') ? 'text-emerald-600' : 'text-slate-900'}`}>
        {amount}
      </div>
    )}
  </div>
);

const QuickAction = ({ icon: Icon, label, onClick }: any) => (
  <button 
    onClick={onClick}
    className="group flex flex-col items-center justify-start p-1.5 sm:p-2 hover:bg-slate-200/20 rounded-2xl transition-all gap-1 sm:gap-2 w-full min-w-0"
  >
    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[1.1rem] sm:rounded-[1.25rem] bg-white shadow-sm border border-slate-100/80 flex items-center justify-center group-hover:scale-105 group-hover:shadow-md group-hover:border-orange-200 transition-all shrink-0">
      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700 group-hover:text-[#f97316] transition-colors" />
    </div>
    <span className="text-[10px] sm:text-[11px] font-medium text-slate-600 text-center leading-tight mt-0.5 max-w-full break-words line-clamp-2 px-0.5">
      {label}
    </span>
  </button>
);
