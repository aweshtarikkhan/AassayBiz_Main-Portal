import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from "date-fns";
import { formatCurrency } from "@/lib/currency";
import { ChevronLeft, ChevronRight, Save, Send, MapPin, Clock, UserCircle2, Calculator, Edit3, Sparkles, HardHat, Laptop } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { SalariesTab } from "@/components/payroll/SalariesTab";
import { calculateHoursLoginToShiftEnd, isAutoClockOut } from "@/lib/salary-calculator";
import { safeFormatTime, safeFormatDate, toHHmm } from "@/lib/utils";

type Status = string;

export const STATUS_OPTIONS = [
  { value: "present",        label: "Present",                   short: "P",   cls: "bg-green-100 text-green-700 border-green-300", baseStatus: "present" },
  { value: "late",           label: "Late",                      short: "L",   cls: "bg-amber-100 text-amber-700 border-amber-300", baseStatus: "late" },
  { value: "half_day",       label: "Half-Day Leave",            short: "HD",  cls: "bg-orange-100 text-orange-700 border-orange-300", baseStatus: "half_day" },
  { value: "absent",         label: "Absent",                    short: "AB",  cls: "bg-red-100 text-red-700 border-red-300", baseStatus: "absent" },
  { value: "lwp",            label: "Leave Without Pay",         short: "LWP", cls: "bg-red-50 text-red-700 border-red-200", baseStatus: "absent" },
  { value: "casual",         label: "Casual Leave (CL)",         short: "CL",  cls: "bg-blue-100 text-blue-700 border-blue-300", baseStatus: "paid_leave" },
  { value: "el_pl",          label: "Earned/Privilege",          short: "PL",  cls: "bg-indigo-100 text-indigo-700 border-indigo-300", baseStatus: "paid_leave" },
  { value: "sick",           label: "Sick/Medical (SL)",         short: "SL",  cls: "bg-amber-100 text-amber-700 border-amber-300", baseStatus: "paid_leave" },
  { value: "comp_off",       label: "Compensatory Off",          short: "CO",  cls: "bg-teal-100 text-teal-700 border-teal-300", baseStatus: "paid_leave" },
  { value: "maternity",      label: "Maternity Leave",           short: "ML",  cls: "bg-pink-100 text-pink-700 border-pink-300", baseStatus: "paid_leave" },
  { value: "approved_leave", label: "Approved Leave",            short: "AL",  cls: "bg-purple-100 text-purple-700 border-purple-300", baseStatus: "paid_leave" },
  { value: "paid_leave",     label: "Paid Leave",                short: "PL",  cls: "bg-purple-100 text-purple-700 border-purple-300", baseStatus: "paid_leave" },
  { value: "leave",          label: "Leave",                     short: "LV",  cls: "bg-purple-100 text-purple-700 border-purple-300", baseStatus: "paid_leave" },
  { value: "wfh",            label: "Work From Home",            short: "WFH", cls: "bg-emerald-100 text-emerald-700 border-emerald-300", baseStatus: "present" },
  { value: "holiday",        label: "Holiday",                   short: "HO",  cls: "bg-muted text-muted-foreground border-border", baseStatus: "holiday" },
];

interface Employee {
  id: string; name: string; monthly_salary: number; paid_leaves_per_month: number; is_active: boolean;
}
interface AttRow { id?: string; employee_id: string; attendance_date: string; status: Status; }

const INDIAN_FESTIVALS = [
  { name: "Republic Day", date: "2026-01-26", type: "public" },
  { name: "Maha Shivaratri", date: "2026-02-14", type: "public" },
  { name: "Holi", date: "2026-03-04", type: "public" },
  { name: "Ram Navami", date: "2026-03-27", type: "public" },
  { name: "Mahavir Jayanti", date: "2026-04-01", type: "public" },
  { name: "Good Friday", date: "2026-04-03", type: "public" },
  { name: "Id-ul-Fitr", date: "2026-03-20", type: "public" },
  { name: "Buddha Purnima", date: "2026-05-01", type: "public" },
  { name: "Bakrid / Eid al Adha", date: "2026-05-27", type: "public" },
  { name: "Muharram", date: "2026-06-25", type: "public" },
  { name: "Independence Day", date: "2026-08-15", type: "public" },
  { name: "Raksha Bandhan", date: "2026-08-28", type: "public" },
  { name: "Janmashtami", date: "2026-09-04", type: "public" },
  { name: "Gandhi Jayanti", date: "2026-10-02", type: "public" },
  { name: "Dussehra", date: "2026-10-20", type: "public" },
  { name: "Diwali", date: "2026-11-08", type: "public" },
  { name: "Guru Nanak Jayanti", date: "2026-11-24", type: "public" },
  { name: "Christmas", date: "2026-12-25", type: "public" }
];

export default function AttendancePage() {
  const org = useAppStore((s) => s.organization);
  const setOrganization = useAppStore((s) => s.setOrganization);
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [att, setAtt] = useState<Record<string, Status>>({});
  const [rawAtt, setRawAtt] = useState<any[]>([]);
  const [clockData, setClockData] = useState<Record<string, any>>({});
  const [selectedClockInfo, setSelectedClockInfo] = useState<any | null>(null);
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [regularizations, setRegularizations] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [newHoliday, setNewHoliday] = useState({ name: "", date: "", type: "company" });
  const [weeklyOffs, setWeeklyOffs] = useState<number[]>(org?.weekly_offs || [0]);
  const [dailyWagesEnabled, setDailyWagesEnabled] = useState<boolean>(!!(org as any)?.daily_wages_enabled);
  const [enableIndividualWeekOffs, setEnableIndividualWeekOffs] = useState<boolean>(!!(org as any)?.enable_individual_week_offs);
  const [dailyDate, setDailyDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [dailyLogs, setDailyLogs] = useState<Record<string, any>>({});
  const [loadingDaily, setLoadingDaily] = useState(false);

  // Manual Punch Dialog for HR (wagers or any staff)
  const [manualPunchEmp, setManualPunchEmp] = useState<any | null>(null);
  const [manualPunchIn, setManualPunchIn] = useState("09:00");
  const [manualPunchOut, setManualPunchOut] = useState("18:00");
  const [savingManualPunch, setSavingManualPunch] = useState(false);

  // approved leaves per employee per date: empId|date -> leaveType
  const [approvedLeaveMap, setApprovedLeaveMap] = useState<Record<string, string>>({});
  // approved regularizations per employee per date: empId|date -> reg
  const [approvedRegMap, setApprovedRegMap] = useState<Record<string, any>>({});
  // employee shifts: empId -> shift
  const [empShiftMap, setEmpShiftMap] = useState<Record<string, any>>({});
  // organization default shift
  const [orgDefaultShift, setOrgDefaultShift] = useState<any>(null);
  // auto-computed att keys (not manually set by HR)
  const [autoAttKeys, setAutoAttKeys] = useState<Set<string>>(new Set());

  // Employee Detail Dialog
  const [selectedEmpDetail, setSelectedEmpDetail] = useState<any | null>(null);
  const [detailFrom, setDetailFrom] = useState(() => format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd"));
  const [detailTo, setDetailTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [detailRecords, setDetailRecords] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // --- HR Chat state ---
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "regularizations") return "regularizations";
      if (tabParam === "daily") return "daily";
      if (tabParam === "roster") return "roster";
    } catch {}
    return "monthly";
  });
  // Respond to URL query changes dynamically
  useEffect(() => {
    const handleUrlTab = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get("tab");
        if (tabParam === "regularizations") setActiveTab("regularizations");
        else if (tabParam === "daily") setActiveTab("daily");
        else if (tabParam === "roster") setActiveTab("roster");
      } catch {}
    };
    handleUrlTab();
    window.addEventListener("popstate", handleUrlTab);
    return () => window.removeEventListener("popstate", handleUrlTab);
  }, []);

  const fetchDailyLogs = async (dateStr: string) => {
    if (!org?.id) return;
    setLoadingDaily(true);
    try {
      await (supabase as any).rpc('auto_clock_out_expired_punches', { p_org_id: org.id });
    } catch (e) {
      console.warn("RPC auto_clock_out_expired_punches failed:", e);
    }

    try {
      // Query both attendances (plural) and attendance (singular) for 100% complete data
      const [pluralRes, singularRes] = await Promise.all([
        (supabase as any).from("attendances").select("*").eq("org_id", org.id).eq("date", dateStr),
        (supabase as any).from("attendance").select("*").eq("org_id", org.id).eq("attendance_date", dateStr)
      ]);

      const map: Record<string, any> = {};

      // 1. Process plural attendances records
      (pluralRes?.data || []).forEach((r: any) => {
        if (r.employee_id) {
          map[r.employee_id] = r;
        }
        // Match against employees list (by id or auth_user_id)
        const empMatch = employees.find((e: any) => e.id === r.employee_id || e.auth_user_id === r.employee_id);
        if (empMatch) {
          map[empMatch.id] = r;
        }
      });

      // 2. Process singular attendance records as fallback / merge
      (singularRes?.data || []).forEach((r: any) => {
        const empMatch = employees.find((e: any) => e.id === r.employee_id || e.auth_user_id === r.employee_id);
        const targetEmpId = empMatch?.id || r.employee_id;
        if (targetEmpId) {
          const existing = map[targetEmpId] || {};
          map[targetEmpId] = {
            ...existing,
            id: existing.id || r.id,
            employee_id: targetEmpId,
            org_id: r.org_id,
            date: dateStr,
            clock_in_time: existing.clock_in_time || r.clock_in_time,
            clock_in_location: existing.clock_in_location || r.clock_in_location,
            clock_out_time: existing.clock_out_time || r.clock_out_time,
            clock_out_location: existing.clock_out_location || r.clock_out_location,
            status: existing.status || r.status || r.computed_status,
            is_auto_clock_out: existing.is_auto_clock_out ?? r.is_auto_clock_out,
          };
        }
      });

      // 3. Process approved regularizations for the selected date
      try {
        const { data: regRes } = await (supabase as any)
          .from("attendance_regularizations")
          .select("*")
          .eq("org_id", org.id)
          .eq("status", "approved")
          .eq("date", dateStr);

        (regRes || []).forEach((r: any) => {
          const empMatch = employees.find((e: any) => e.id === r.employee_id || e.auth_user_id === r.employee_id);
          const targetEmpId = empMatch?.id || r.employee_id;
          if (targetEmpId) {
            const existing = map[targetEmpId] || {};
            map[targetEmpId] = {
              ...existing,
              id: existing.id || r.id,
              employee_id: targetEmpId,
              org_id: r.org_id,
              date: dateStr,
              clock_in_time: existing.clock_in_time || (r.requested_clock_in ? (r.requested_clock_in.includes('T') ? r.requested_clock_in : `${dateStr}T${r.requested_clock_in}`) : `${dateStr}T09:30:00`),
              clock_out_time: existing.clock_out_time || (r.requested_clock_out ? (r.requested_clock_out.includes('T') ? r.requested_clock_out : `${dateStr}T${r.requested_clock_out}`) : `${dateStr}T18:30:00`),
              status: "present",
              is_regularized: true,
            };
          }
        });

        if (regRes && regRes.length > 0) {
          setApprovedRegMap((prev) => {
            const next = { ...prev };
            (regRes || []).forEach((r: any) => {
              const regDate = (r.date || r.attendance_date || '').slice(0, 10);
              if (regDate) {
                next[`${r.employee_id}|${regDate}`] = r;
                const empMatch = employees.find((e: any) => e.id === r.employee_id || e.auth_user_id === r.employee_id);
                if (empMatch) {
                  next[`${empMatch.id}|${regDate}`] = r;
                  if (empMatch.auth_user_id) next[`${empMatch.auth_user_id}|${regDate}`] = r;
                }
              }
            });
            return next;
          });
        }
      } catch (regErr) {
        console.warn("fetchDailyLogs regularizations query error:", regErr);
      }

      setDailyLogs(map);
    } catch (fetchErr) {
      console.error("Error fetching daily logs:", fetchErr);
    } finally {
      setLoadingDaily(false);
    }
  };

  useEffect(() => {
    if (org?.id && dailyDate) {
      fetchDailyLogs(dailyDate);
    }
  }, [org?.id, dailyDate, employees]);

  // Realtime subscription + auto poll for Daily Attendance Logs
  useEffect(() => {
    if (!org?.id) return;
    const channel = supabase
      .channel(`daily-logs-live-${org.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendances", filter: `org_id=eq.${org.id}` },
        () => {
          if (dailyDate) fetchDailyLogs(dailyDate);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance", filter: `org_id=eq.${org.id}` },
        () => {
          if (dailyDate) fetchDailyLogs(dailyDate);
        }
      )
      .subscribe();

    const pollInterval = setInterval(() => {
      if (activeTab === "daily" && dailyDate) {
        fetchDailyLogs(dailyDate);
      }
    }, 8000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [org?.id, dailyDate, activeTab, employees]);


  useEffect(() => {
    if (org) {
      if (org.weekly_offs) setWeeklyOffs(org.weekly_offs);
      setDailyWagesEnabled(!!(org as any).daily_wages_enabled);
      setEnableIndividualWeekOffs(!!(org as any).enable_individual_week_offs);
    }
  }, [org]);

  const monthStart = useMemo(() => {
    try {
      if (!month || typeof month !== "string") return startOfMonth(new Date());
      const parsed = parseISO(month.length === 7 ? month + "-01" : month);
      if (isNaN(parsed.getTime())) return startOfMonth(new Date());
      return startOfMonth(parsed);
    } catch {
      return startOfMonth(new Date());
    }
  }, [month]);

  const monthEnd = useMemo(() => {
    try {
      return endOfMonth(monthStart);
    } catch {
      return endOfMonth(new Date());
    }
  }, [monthStart]);

  const days = useMemo(() => {
    try {
      return eachDayOfInterval({ start: monthStart, end: monthEnd });
    } catch {
      const now = new Date();
      return eachDayOfInterval({ start: startOfMonth(now), end: endOfMonth(now) });
    }
  }, [monthStart, monthEnd]);

  // Helper: compute attendance status from clock-in time + shift rules
  const computeShiftStatus = (clockInTime: string, shift: any, defaultShift?: any): Status => {
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

    // Effective shift: employee shift -> org default shift -> office default
    const effectiveShift = shift || defaultShift || {
      start_time: "09:00",
      grace_minutes: 15,
      late_end: "10:30",
      half_day_end: "14:00"
    };

    const toMins = (t: string) => {
      if (!t) return 0;
      const [h, m] = t.slice(0, 5).split(":").map(Number);
      return h * 60 + m;
    };
    const graceEnd = toMins(effectiveShift.start_time || "09:00") + (effectiveShift.grace_minutes ?? 15);
    const lateEnd  = toMins(effectiveShift.late_end  || "10:30");
    const halfEnd  = toMins(effectiveShift.half_day_end || "14:00");

    if (clockInMins <= graceEnd) return "present";
    if (clockInMins <= lateEnd)  return "late";
    if (clockInMins <= halfEnd)  return "half_day";
    return "half_day";
  };

  const load = async () => {
    if (!org?.id) return;
    setLoading(true);
    try {
      await (supabase as any).rpc('auto_clock_out_expired_punches', { p_org_id: org.id });
    } catch (e) {
      console.warn("RPC auto_clock_out_expired_punches failed:", e);
    }
    const [emps, atts, leavesData, holsRes, clockins, empShiftsRes, regRes, allShiftsRes] = await Promise.all([
      (supabase as any).from("employees").select("*").eq("org_id", org.id).eq("is_active", true).order("name"),
      (supabase as any).from("attendance").select("*").eq("org_id", org.id)
        .gte("attendance_date", format(monthStart, "yyyy-MM-dd"))
        .lte("attendance_date", format(monthEnd, "yyyy-MM-dd")),
      (supabase as any).from("leaves").select("*, employees(name)").eq("org_id", org.id).order('created_at', { ascending: false }),
      (supabase as any).from("holidays").select("*").eq("org_id", org.id).order("date", { ascending: true }),
      (supabase as any).from("attendances").select("*").eq("org_id", org.id)
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd")),
      (supabase as any).from("employee_shifts").select("*, shifts(*)").eq("org_id", org.id),
      (supabase as any).from("attendance_regularizations").select("*, employees(name, designation, auth_user_id)").eq("org_id", org.id).order('created_at', { ascending: false }),
      (supabase as any).from("shifts").select("*").eq("org_id", org.id).order("is_default", { ascending: false }),
    ]);
    if (emps.error) toast({ title: "Failed to load employees", description: emps.error.message, variant: "destructive" });

    const empList: any[] = emps.data || [];
    setEmployees(empList);

    let rawRegs: any[] = regRes?.data || [];
    if (!rawRegs || rawRegs.length === 0) {
      // Direct query fallback without relational join
      const { data: directRegs } = await (supabase as any)
        .from("attendance_regularizations")
        .select("*")
        .eq("org_id", org.id)
        .order("created_at", { ascending: false });
      if (directRegs && directRegs.length > 0) {
        rawRegs = directRegs;
      }
    }
    const resolvedRegs = (rawRegs || []).map((r: any) => ({
      ...r,
      employees: r.employees || empList.find((e: any) => e.id === r.employee_id) || null
    }));
    setRegularizations(resolvedRegs);

    const localApprovedRegMap: Record<string, any> = {};
    resolvedRegs.filter((r: any) => r.status === "approved").forEach((r: any) => {
      const regDate = (r.date || r.attendance_date || '').slice(0, 10);
      if (regDate) {
        localApprovedRegMap[`${r.employee_id}|${regDate}`] = r;
        if (r.employees?.id) localApprovedRegMap[`${r.employees.id}|${regDate}`] = r;
        if (r.employees?.auth_user_id) localApprovedRegMap[`${r.employees.auth_user_id}|${regDate}`] = r;
        const matched = empList.find((e: any) => e.id === r.employee_id || e.auth_user_id === r.employee_id);
        if (matched) {
          localApprovedRegMap[`${matched.id}|${regDate}`] = r;
          if (matched.auth_user_id) localApprovedRegMap[`${matched.auth_user_id}|${regDate}`] = r;
        }
      }
    });

    const orgShiftsList = allShiftsRes?.data || [];
    const defaultShift = orgShiftsList.find((s: any) => s.is_default) || orgShiftsList[0] || null;
    setOrgDefaultShift(defaultShift);
    const orgDefaultShift = defaultShift;

    const clkMap: Record<string, any> = {};
    (clockins?.data || []).forEach((r: any) => { clkMap[`${r.employee_id}|${r.date}`] = r; });
    Object.entries(localApprovedRegMap).forEach(([k, reg]) => {
      const rDate = (reg.date || reg.attendance_date || '').slice(0, 10);
      const regClkIn = reg.requested_clock_in ? (reg.requested_clock_in.includes('T') ? reg.requested_clock_in : `${rDate}T${reg.requested_clock_in}`) : (clkMap[k]?.clock_in_time || `${rDate}T09:30:00`);
      const regClkOut = reg.requested_clock_out ? (reg.requested_clock_out.includes('T') ? reg.requested_clock_out : `${rDate}T${reg.requested_clock_out}`) : (clkMap[k]?.clock_out_time || `${rDate}T18:30:00`);
      clkMap[k] = {
        ...(clkMap[k] || {}),
        employee_id: reg.employee_id,
        date: rDate,
        clock_in_time: regClkIn,
        clock_out_time: regClkOut,
        status: 'present',
        computed_status: 'present',
        is_regularized: true,
      };
    });

    // HR manually set records
    const map: Record<string, Status> = {};
    const hrOverriddenKeys = new Set<string>();
    (atts.data || []).forEach((r: any) => { 
      const key = `${r.employee_id}|${r.attendance_date}`;
      const statusVal = r.override_status || r.status;
      map[key] = statusVal;

      // If approved regularization exists, it is Present - NEVER treat as absent!
      if (localApprovedRegMap[key]) {
        map[key] = "present";
        return;
      }

      // If employee has a clock-in, but old record was absent, do NOT treat as HR override
      if (statusVal === "absent" && clkMap[key]?.clock_in_time) {
        return;
      }

      // If HR explicitly marked or saved an override, track it
      if (r.hr_note === "hr_override" || r.notes === "hr_override" || r.override_status) {
        hrOverriddenKeys.add(key);
      }
    });

    // Build approved leave map: empId|date -> leaveType
    const approvedLeaves = (leavesData?.data || []).filter((l: any) => l.status === "approved");
    const alvMap: Record<string, string> = {};
    approvedLeaves.forEach((l: any) => {
      try {
        if (!l.start_date) return;
        const sStr = String(l.start_date).split("T")[0];
        const eStr = String(l.end_date || l.start_date).split("T")[0];
        const start = parseISO(sStr);
        const end = parseISO(eStr);
        const interval = eachDayOfInterval({ start, end });
        interval.forEach((d) => {
          const ds = format(d, "yyyy-MM-dd");
          alvMap[`${l.employee_id}|${ds}`] = l.leave_type || "paid_leave";
        });
      } catch {}
    });

    // Build emp -> shift map
    const shiftMap: Record<string, any> = {};
    (empShiftsRes?.data || []).forEach((es: any) => { shiftMap[es.employee_id] = es.shifts; });

    // ── AUTO-COMPUTE: fill in attendance from clock-in data & approved leaves ──
    const orgWeeklyOffs = (org as any)?.weekly_offs || [0];
    const holsList: any[] = holsRes?.data || [];
    const newAutoKeys = new Set<string>();
    const todayStr = format(new Date(), "yyyy-MM-dd");

    empList.forEach((emp) => {
      eachDayOfInterval({ start: monthStart, end: monthEnd }).forEach((d) => {
        const ds = format(d, "yyyy-MM-dd");
        const key = `${emp.id}|${ds}`;

        // 0. Approved Regularization: Once approved by HR, status is always Present (regularized)
        if (localApprovedRegMap[key] || clkMap[key]?.is_regularized) {
          map[key] = "present";
          return;
        }

        // 1. HR Manual Override is supreme: If HR explicitly marked attendance for this day, keep it!
        if (hrOverriddenKeys.has(key)) {
          if (map[key] === "absent" && clkMap[key]?.clock_in_time) {
            // fall through to actual clock-in computation
          } else {
            return;
          }
        }

        // 2. Approved Leave: If not manually overridden by HR, apply approved leave
        const approvedLeaveType = alvMap[key];
        if (approvedLeaveType) {
          let lvStatus: Status = "approved_leave";
          if (approvedLeaveType === "half_day") lvStatus = "half_day";
          else if (approvedLeaveType === "wfh") lvStatus = "wfh";
          else if (approvedLeaveType === "lwp" || approvedLeaveType === "unpaid") lvStatus = "lwp";
          else if (STATUS_OPTIONS.some(o => o.value === approvedLeaveType)) lvStatus = approvedLeaveType as Status;
          map[key] = lvStatus;
          return;
        }

        // 3. Actual clock-in from attendances table (daily clock records)
        const clk = clkMap[key];
        if (clk) {
          if (clk.is_regularized || localApprovedRegMap[key]) {
            map[key] = "present";
            newAutoKeys.add(key);
            return;
          }
          if (clk.clock_in_time) {
            const shift = shiftMap[emp.id] || orgDefaultShift;
            const computedSt = computeShiftStatus(clk.clock_in_time, shift, orgDefaultShift);
            map[key] = (clk.status === "half_day" || clk.status === "late") ? clk.status : computedSt;
            newAutoKeys.add(key);
            return;
          } else if (clk.status) {
            map[key] = clk.status;
            newAutoKeys.add(key);
            return;
          }
        }

        // 4. If HR already manually set an explicit status in map, keep it
        if (map[key] && !newAutoKeys.has(key)) return;

        // 5. Weekly offs and holidays
        const effectiveWeeklyOffs = ((org as any)?.enable_individual_week_offs && Array.isArray(emp.weekly_offs) && emp.weekly_offs.length > 0)
          ? emp.weekly_offs
          : orgWeeklyOffs;
        const isOff = effectiveWeeklyOffs.includes(d.getDay());
        const isHoliday = holsList.some((h: any) => h.date === ds);
        if (isOff || isHoliday) { map[key] = "holiday"; return; } else if (ds < todayStr) {
          // Past day without attendance -> auto mark absent
          map[key] = "absent";
          newAutoKeys.add(key);
        } else if (ds === todayStr) {
          // Today: only mark absent if current time is past the half_day_end time
          // (because they could still clock in as late or half_day before then)
          const shift = shiftMap[emp.id] || orgDefaultShift;
          const now = new Date();
          const toMins = (t: string) => { if (!t) return 0; const [h,m] = t.split(':').map(Number); return h*60+m; };
          const halfEnd = toMins(shift?.half_day_end || '14:00');
          if (now.getHours() * 60 + now.getMinutes() > halfEnd) {
            map[key] = "absent";
            newAutoKeys.add(key);
          }
        }
      });
    });

    setAtt(map);
    setAutoAttKeys(newAutoKeys);
    setClockData(clkMap);
    setRawAtt(atts.data || []);
    setLeaves(leavesData?.data || []);
    setHolidays(holsRes?.data || []);
    setApprovedLeaveMap(alvMap);
    setApprovedRegMap(localApprovedRegMap);
    setEmpShiftMap(shiftMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, [org?.id, month]);

  // Realtime subscription for attendance regularizations & leaves updates
  useEffect(() => {
    if (!org?.id) return;
    const channel = supabase
      .channel(`attendance-regs-realtime-${org.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance_regularizations" },
        () => {
          load();
          window.dispatchEvent(new CustomEvent('hr-action-updated'));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leaves" },
        () => {
          load();
          window.dispatchEvent(new CustomEvent('hr-action-updated'));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [org?.id]);

  // --- Employee Detail Dialog Logic ---
  useEffect(() => {
    const fetchEmployeeDetail = async () => {
      if (!selectedEmpDetail || !org?.id || !detailFrom || !detailTo) return;
      setLoadingDetail(true);
      
      const [atts, clockins, regData] = await Promise.all([
        (supabase as any).from("attendance").select("*")
          .eq("org_id", org.id)
          .eq("employee_id", selectedEmpDetail.id)
          .gte("attendance_date", detailFrom)
          .lte("attendance_date", detailTo),
        (supabase as any).from("attendances").select("*")
          .eq("org_id", org.id)
          .eq("employee_id", selectedEmpDetail.id)
          .gte("date", detailFrom)
          .lte("date", detailTo),
        (supabase as any).from("attendance_regularizations").select("*")
          .eq("org_id", org.id)
          .eq("employee_id", selectedEmpDetail.id)
          .eq("status", "approved")
          .gte("date", detailFrom)
          .lte("date", detailTo),
      ]);
      
      const rangeDays = eachDayOfInterval({ start: parseISO(detailFrom), end: parseISO(detailTo) });
      const attMap: Record<string, string> = {};
      (atts.data || []).forEach((r: any) => { attMap[r.attendance_date] = r.override_status || r.status; });
      const clkMap: Record<string, any> = {};
      (clockins.data || []).forEach((r: any) => { clkMap[r.date] = r; });
      const regMap: Record<string, any> = {};
      (regData.data || []).forEach((r: any) => { regMap[r.date] = r; });

      const shift = empShiftMap[selectedEmpDetail.id];
      const orgWeeklyOffs = org?.weekly_offs || [0];
      
      const records = rangeDays.map((d) => {
        const ds = format(d, "yyyy-MM-dd");
        const effectiveWeeklyOffs = ((org as any)?.enable_individual_week_offs && Array.isArray(selectedEmpDetail.weekly_offs) && selectedEmpDetail.weekly_offs.length > 0)
          ? selectedEmpDetail.weekly_offs
          : orgWeeklyOffs;
        const isOff = effectiveWeeklyOffs.includes(d.getDay());
        const isHoliday = holidays.some(h => h.date === ds);
        const approvedLeave = approvedLeaveMap[`${selectedEmpDetail.id}|${ds}`];
        const clk = clkMap[ds];
        const hrStatus = attMap[ds];
        const approvedReg = regMap[ds];
        
        let finalStatus = "—";
        let isAuto = false;
        
        if (approvedReg) {
          const clkIn = approvedReg.requested_clock_in || clk?.clock_in_time;
          finalStatus = clkIn ? computeShiftStatus(clkIn, shift, orgDefaultShift) : "present";
        } else if (approvedLeave === "half_day") {
          finalStatus = "half_day";
        } else if (clk?.clock_in_time) {
          const shiftComputed = computeShiftStatus(clk.clock_in_time, shift, orgDefaultShift);
          finalStatus = (clk.status === "half_day" || clk.status === "late") ? clk.status : shiftComputed;
          isAuto = true;
        } else if (hrStatus) {
          finalStatus = hrStatus;
        } else if (approvedLeave && !clk?.clock_in_time) {
          finalStatus = "approved_leave";
        } else if (isHoliday || isOff) {
          finalStatus = "holiday";
        } else if (ds <= format(new Date(), "yyyy-MM-dd")) {
          finalStatus = "absent";
          isAuto = true;
        }
        
        return {
          date: ds,
          dayName: format(d, "EEE"),
          status: finalStatus,
          isAuto,
          clockIn: clk?.clock_in_time,
          clockOut: clk?.clock_out_time,
          locationIn: clk?.clock_in_location,
          locationOut: clk?.clock_out_location,
          isAutoClockOut: !!(clk?.is_auto_clock_out || clk?.clock_out_location?.auto || clk?.clock_out_location?.is_auto_clock_out),
          approvedLeave
        };
      });
      
      setDetailRecords(records.reverse()); // most recent first
      setLoadingDetail(false);
    };
    fetchEmployeeDetail();
  }, [selectedEmpDetail, detailFrom, detailTo]);

  const setCell = async (empId: string, dateStr: string, status: Status) => {
    setAtt((prev) => ({ ...prev, [`${empId}|${dateStr}`]: status }));
    if (!org?.id) return;
    const opt = STATUS_OPTIONS.find((o) => o.value === status) || STATUS_OPTIONS[0];
    try {
      await (supabase as any).from("attendance").upsert({
        org_id: org.id,
        employee_id: empId,
        attendance_date: dateStr,
        status: opt.baseStatus,
        override_status: opt.value,
        hr_note: "hr_override",
        notes: "hr_override",
      }, { onConflict: "employee_id,attendance_date" });

      await (supabase as any).from("attendances").upsert({
        org_id: org.id,
        employee_id: empId,
        date: dateStr,
        status: opt.value,
      }, { onConflict: "employee_id,date" });
    } catch (e) {
      console.error("Auto-sync error on setCell:", e);
    }
  };

  const cycle = (empId: string, dateStr: string) => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (dateStr > todayStr) {
      toast({ title: "Future date not allowed", description: "Attendance can only be marked for today or past dates.", variant: "destructive" });
      return;
    }
    const d = parseISO(dateStr);
    const orgWeeklyOffs = org?.weekly_offs || [0];
    const isOff = orgWeeklyOffs.includes(d.getDay());
    const current = att[`${empId}|${dateStr}`] || (isOff ? "holiday" : "absent");
    const idx = STATUS_OPTIONS.findIndex((s) => s.value === current);
    const next = STATUS_OPTIONS[(idx + 1) % STATUS_OPTIONS.length].value;
    setCell(empId, dateStr, next);
  };

  const markRowAll = (empId: string, status: Status) => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    setAtt((prev) => {
      const next = { ...prev };
      days.forEach((d) => {
        const ds = format(d, "yyyy-MM-dd");
        if (ds <= todayStr) { // only past and today
          next[`${empId}|${ds}`] = status;
        }
      });
      return next;
    });
  };

  const save = async () => {
    if (!org?.id) return;
    setSaving(true);
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const rows: any[] = [];
    const clkRows: any[] = [];
    Object.entries(att).forEach(([k, status]) => {
      const [employee_id, attendance_date] = k.split("|");
      // Skip future dates - never save attendance for future
      if (attendance_date > todayStr) return;
      // Do not save auto-computed absent records for today so employee can still clock in
      if (attendance_date === todayStr && status === "absent" && autoAttKeys.has(k)) return;

      if (employees.find((e) => e.id === employee_id)) {
        const opt = STATUS_OPTIONS.find((o) => o.value === status) || STATUS_OPTIONS[0]; 
        const isAuto = autoAttKeys.has(k);
        rows.push({ 
          org_id: org.id, 
          employee_id, 
          attendance_date, 
          status: opt.baseStatus, 
          override_status: opt.value,
          hr_note: isAuto ? null : "hr_override",
          notes: isAuto ? null : "hr_override"
        });
        if (!isAuto) {
          clkRows.push({ org_id: org.id, employee_id, date: attendance_date, status: opt.value });
        }
      }
    });
    if (rows.length === 0) { setSaving(false); toast({ title: "Nothing to save" }); return; }
    const { error } = await (supabase as any).from("attendance").upsert(rows, { onConflict: "employee_id,attendance_date" });
    if (error) {
      setSaving(false);
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    if (clkRows.length > 0) {
      await (supabase as any).from("attendances").upsert(clkRows, { onConflict: "employee_id,date" });
    }

    setSaving(false);
    toast({ title: "Attendance saved", description: `${rows.length} record(s) saved.` });
  };

  // Summaries
  const summaries = useMemo(() => {
    const orgWeeklyOffs = org?.weekly_offs || [0];
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return employees.map((emp) => {
      let p = 0, a = 0, h = 0, pl = 0, ho = 0, late = 0;
      days.forEach((d) => {
        const ds = format(d, "yyyy-MM-dd");
        const isOff = orgWeeklyOffs.includes(d.getDay());
        const isHoliday = holidays.some((hol) => hol.date === ds);

        // Priority: HR-set record > auto-computed in att map > fallback
        const s = att[`${emp.id}|${ds}`] || (isOff || isHoliday ? "holiday" : (ds <= todayStr ? "absent" : undefined));

        if (s === "present" || s === "wfh" || s === "od") p++;
        else if (s === "late") { late++; p++; } // late counts as present for payroll
        else if (s === "absent" || s === "lwp" || s === "ncns") a++;
        else if (s === "half_day" || s === "half-day") h++;
        else if (
          s === "paid_leave" ||
          s === "approved_leave" ||
          s === "casual" ||
          s === "el_pl" ||
          s === "sick" ||
          s === "comp_off" ||
          s === "maternity" ||
          s === "paternity"
        ) pl++;
        else if (s === "holiday") ho++;
      });
      const workingDays = days.length - ho;
      // Payable units: present=1, late=1, half=0.5, paid_leave=1 (within allowance), extra treated as absent
      const allowedPL = emp.paid_leaves_per_month;
      const paidPL = Math.min(pl, allowedPL);
      const unpaidPL = Math.max(0, pl - allowedPL);
      const payableDays = p + h * 0.5 + paidPL; // unpaid_pl deducted (treated as absent)
      const perDay = workingDays > 0 ? emp.monthly_salary / workingDays : 0;
      const payable = perDay * payableDays;
      return { emp, p, a: a + unpaidPL, h, pl: paidPL, ho, late, workingDays, payableDays, payable };
    });
  }, [employees, days, att, holidays, org]);

  const totalPayable = summaries.reduce((s, r) => s + r.payable, 0);

  const postToExpenses = async () => {
    if (!org?.id) return;
    if (summaries.length === 0) return;
    if (!confirm(`Post ${formatCurrency(totalPayable, (org as any)?.currency || "INR")} as salary expense for ${format(monthStart, "MMM yyyy")}?`)) return;
    setPosting(true);
    const rows = summaries
      .filter((s) => s.payable > 0)
      .map((s) => ({
        org_id: org.id,
        category: "Salary",
        description: `Salary — ${s.emp.name} (${format(monthStart, "MMM yyyy")})`,
        amount: Number(s.payable.toFixed(2)),
        expense_date: format(monthEnd, "yyyy-MM-dd"),
        is_recurring: false,
        recurring_frequency: null,
      }));
    if (rows.length === 0) { setPosting(false); return; }
    const { error } = await (supabase as any).from("business_expenses").insert(rows);
    setPosting(false);
    if (error) toast({ title: "Failed to post", description: error.message, variant: "destructive" });
    else toast({ title: "Salaries posted to Expenses", description: `${rows.length} entries added.` });
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(monthStart);
    d.setMonth(d.getMonth() + delta);
    setMonth(format(d, "yyyy-MM"));
  };

  const statusBadge = (s: Status | undefined, isAuto?: boolean) => {
    if (!s) return null;
    const norm = s.toLowerCase().replace("-", "_").trim();
    const opt = STATUS_OPTIONS.find((o) => o.value === norm || o.value === s) || {
      value: s,
      label: s.charAt(0).toUpperCase() + s.slice(1).replace("_", " "),
      short: s.slice(0, 2).toUpperCase(),
      cls: "bg-gray-100 text-gray-700 border-gray-300",
      baseStatus: "present"
    };
    return (
      <span className={`inline-flex items-center justify-center h-6 w-7 rounded border text-[10px] font-semibold relative ${opt.cls}`}>
        {opt.short}
        {isAuto && <span className="absolute -top-[3px] -right-[3px] flex h-2 w-2 rounded-full bg-blue-500 ring-1 ring-white" title="Auto-computed from clock-in"></span>}
      </span>
    );
  };

  const updateLeaveStatus = async (id: string, newStatus: string) => {
    const leaveReq = leaves.find(l => l.id === id);
    const { error } = await (supabase as any).from("leaves").update({ status: newStatus }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    if (leaveReq && org?.id) {
      try {
        const startStr = String(leaveReq.start_date).split("T")[0];
        const endStr = String(leaveReq.end_date || leaveReq.start_date).split("T")[0];
        const start = parseISO(startStr);
        const end = parseISO(endStr);
        const dateList: string[] = [];
        for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
          dateList.push(format(cur, "yyyy-MM-dd"));
        }

        if (newStatus === "approved" && leaveReq.status !== "approved") {
          let attStatus = "paid_leave";
          if (leaveReq.leave_type === "half_day") attStatus = "half_day";
          else if (leaveReq.leave_type === "wfh") attStatus = "wfh";
          else if (leaveReq.leave_type === "lwp" || leaveReq.leave_type === "unpaid") attStatus = "absent";
          else if (STATUS_OPTIONS.some(o => o.value === leaveReq.leave_type)) attStatus = leaveReq.leave_type;

          const hrRows = dateList.map(ds => ({
            org_id: org.id,
            employee_id: leaveReq.employee_id,
            attendance_date: ds,
            status: attStatus,
            override_status: leaveReq.leave_type || attStatus
          }));
          await (supabase as any).from("attendance").upsert(hrRows, { onConflict: "employee_id,attendance_date" });

          const clkRows = dateList.map(ds => ({
            org_id: org.id,
            employee_id: leaveReq.employee_id,
            date: ds,
            status: attStatus === "absent" ? "absent" : "approved_leave"
          }));
          await (supabase as any).from("attendances").upsert(clkRows, { onConflict: "employee_id,date" });

          const { data: bData } = await (supabase as any).from('employee_leave_balances')
            .select('id, used')
            .eq('employee_id', leaveReq.employee_id)
            .eq('leave_type', leaveReq.leave_type)
            .maybeSingle();

          let currentUsed = (bData?.used || 0) + (leaveReq.days || 1);

          if (bData?.id) {
            await (supabase as any).from('employee_leave_balances')
              .update({ used: currentUsed })
              .eq('id', bData.id);
          } else {
            await (supabase as any).from('employee_leave_balances')
              .insert({
                org_id: org.id,
                employee_id: leaveReq.employee_id,
                leave_type: leaveReq.leave_type,
                used: currentUsed
              });
          }
        } else if (newStatus === "rejected") {
          // Check if previously approved and we are rejecting it
          if (leaveReq.status === "approved") {
            const { data: bData } = await (supabase as any).from('employee_leave_balances')
              .select('id, used')
              .eq('employee_id', leaveReq.employee_id)
              .eq('leave_type', leaveReq.leave_type)
              .maybeSingle();
            
            if (bData?.id) {
              const currentUsed = Math.max(0, (bData.used || 0) - (leaveReq.days || 1));
              await (supabase as any).from('employee_leave_balances')
                .update({ used: currentUsed })
                .eq('id', bData.id);
            }
          }

          for (const ds of dateList) {
            await (supabase as any).from("attendance").delete()
              .eq("employee_id", leaveReq.employee_id)
              .eq("attendance_date", ds);
            await (supabase as any).from("attendances").delete()
              .eq("employee_id", leaveReq.employee_id)
              .eq("date", ds)
              .eq("status", "approved_leave");
          }
        }
      } catch (err: any) {
        console.error("Error syncing leave to attendance records:", err);
      }
    }

    toast({ title: "Updated", description: `Leave request ${newStatus}.` });
    window.dispatchEvent(new CustomEvent('hr-action-updated'));
    load();
  };

  const updateRegularizationStatus = async (reg: any, newStatus: 'approved' | 'rejected') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from("attendance_regularizations")
        .update({ status: newStatus, approved_by: user?.id || null })
        .eq("id", reg.id);

      if (error) throw error;

      if (newStatus === 'approved') {
        const regDate = reg.date || reg.attendance_date;
        const clkIn = reg.requested_clock_in 
          ? (reg.requested_clock_in.includes('T') ? reg.requested_clock_in : `${regDate}T${reg.requested_clock_in}`)
          : `${regDate}T09:30:00`;
        const clkOut = reg.requested_clock_out 
          ? (reg.requested_clock_out.includes('T') ? reg.requested_clock_out : `${regDate}T${reg.requested_clock_out}`)
          : `${regDate}T18:30:00`;

        // Upsert attendances table (daily clock records)
        await (supabase as any).from("attendances").upsert({
          org_id: org.id,
          employee_id: reg.employee_id,
          date: regDate,
          clock_in_time: clkIn,
          clock_out_time: clkOut,
          status: 'present',
          is_regularized: true,
        }, { onConflict: 'employee_id,date' });

        // Upsert attendance table (HR monthly calendar record)
        await (supabase as any).from("attendance").upsert({
          org_id: org.id,
          employee_id: reg.employee_id,
          attendance_date: regDate,
          status: 'present',
          override_status: 'present',
          is_regularized: true,
          clock_in_time: clkIn,
          clock_out_time: clkOut,
          hr_note: 'hr_override',
          notes: 'regularization_approved',
        }, { onConflict: 'employee_id,attendance_date' });
      }

      // Send notification to employee
      if (reg.employees?.auth_user_id) {
        try {
          await (supabase as any).from("notifications").insert({
            org_id: org.id,
            user_id: reg.employees.auth_user_id,
            title: `Regularization ${newStatus === 'approved' ? 'Approved' : 'Rejected'}`,
            message: `Your attendance regularization request for ${reg.date} has been ${newStatus}.`,
            type: newStatus === 'approved' ? 'regularization_approved' : 'regularization_rejected'
          });
        } catch {}
      }

      toast({ 
        title: `Regularization ${newStatus === 'approved' ? 'Approved' : 'Rejected'}`, 
        description: `Attendance for ${reg.employees?.name || 'employee'} on ${reg.date} has been updated.` 
      });
      window.dispatchEvent(new CustomEvent('hr-action-updated'));
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const addHoliday = async (h: { name: string; date: string; type: string }) => {
    if (!org?.id) return;
    if (!h.name || !h.date) {
      toast({ title: "Error", description: "Name and date are required.", variant: "destructive" });
      return;
    }
    const { error } = await (supabase as any).from("holidays").insert({
      org_id: org.id,
      name: h.name,
      date: h.date,
      type: h.type
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Holiday Added", description: `${h.name} added to calendar.` });
      setNewHoliday({ name: "", date: "", type: "company" });
      load();
    }
  };

  const removeHoliday = async (id: string) => {
    const { error } = await (supabase as any).from("holidays").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Removed", description: "Holiday removed from calendar." });
      load();
    }
  };

  const saveSettings = async () => {
    if (!org?.id) return;
    const { error } = await (supabase as any).from("organizations").update({
      weekly_offs: weeklyOffs,
      daily_wages_enabled: dailyWagesEnabled,
      enable_individual_week_offs: enableIndividualWeekOffs,
    }).eq("id", org.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Settings Saved", description: "Attendance & Wages settings updated successfully." });
      setOrganization({ ...org, weekly_offs: weeklyOffs, daily_wages_enabled: dailyWagesEnabled, enable_individual_week_offs: enableIndividualWeekOffs } as any);
    }
  };

  const handleSaveManualPunch = async () => {
    if (!org?.id || !manualPunchEmp || !dailyDate) return;
    // Prevent saving attendance for future dates
    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (dailyDate > todayStr) {
      toast({ title: "Future date not allowed", description: "Attendance can only be recorded for today or past dates.", variant: "destructive" });
      return;
    }
    setSavingManualPunch(true);
    try {
      const clockInIso = manualPunchIn ? `${dailyDate}T${manualPunchIn}:00` : null;
      const clockOutIso = manualPunchOut ? `${dailyDate}T${manualPunchOut}:00` : null;

      const existing = dailyLogs[manualPunchEmp.id];
      if (existing?.id) {
        const { error } = await (supabase as any).from("attendances").update({
          clock_in_time: clockInIso,
          clock_out_time: clockOutIso,
          status: "present",
        }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("attendances").insert({
          org_id: org.id,
          employee_id: manualPunchEmp.id,
          date: dailyDate,
          clock_in_time: clockInIso,
          clock_out_time: clockOutIso,
          status: "present",
        });
        if (error) throw error;
      }

      // Also sync to attendance (singular) table
      try {
        await (supabase as any).from("attendance").upsert({
          org_id: org.id,
          employee_id: manualPunchEmp.id,
          attendance_date: dailyDate,
          clock_in_time: clockInIso,
          clock_out_time: clockOutIso,
          status: "present",
        }, { onConflict: "employee_id,attendance_date" });
      } catch (e) {
        console.warn("Manual punch sync to attendance singular failed:", e);
      }

      toast({ title: "Punch Recorded", description: `Saved check-in / check-out time for ${manualPunchEmp.name}` });
      setManualPunchEmp(null);
      fetchDailyLogs(dailyDate);
    } catch (err: any) {
      toast({ title: "Failed to record punch", description: err.message, variant: "destructive" });
    } finally {
      setSavingManualPunch(false);
    }
  };

  const formatTime = (isoOrTime: any) => safeFormatTime(isoOrTime);

  const calculateHours = (inTime: string, outTime: string, isAuto?: boolean, shiftObj?: any) => {
    try {
      if (isAuto) {
        const stdHours = 9;
        const shiftStart = shiftObj?.start_time || "09:00:00";
        const shiftEnd = shiftObj?.end_time || "18:00:00";
        const worked = calculateHoursLoginToShiftEnd(inTime, "", stdHours, shiftStart, shiftEnd);
        const hrs = Math.floor(worked);
        const mins = Math.round((worked - hrs) * 60);
        return `${hrs}h ${mins}m`;
      }
      const sMins = (() => {
        const str = String(inTime).trim();
        const m = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (m) {
          let h = parseInt(m[1], 10);
          if (m[3]?.toUpperCase() === "PM" && h < 12) h += 12;
          if (m[3]?.toUpperCase() === "AM" && h === 12) h = 0;
          return h * 60 + parseInt(m[2], 10);
        }
        const d = new Date(str);
        if (!isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes();
        return NaN;
      })();

      const eMins = (() => {
        const str = String(outTime).trim();
        const m = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (m) {
          let h = parseInt(m[1], 10);
          if (m[3]?.toUpperCase() === "PM" && h < 12) h += 12;
          if (m[3]?.toUpperCase() === "AM" && h === 12) h = 0;
          return h * 60 + parseInt(m[2], 10);
        }
        const d = new Date(str);
        if (!isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes();
        return NaN;
      })();

      if (isNaN(sMins) || isNaN(eMins)) return "-";
      const diffMins = eMins - sMins;
      if (diffMins <= 0) return "-";
      const hrs = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hrs}h ${mins}m`;
    } catch {
      return "-";
    }
  };

  const renderLocation = (loc: any) => {
    if (!loc) return <span className="text-xs text-muted-foreground">-</span>;
    let parsed = loc;
    if (typeof loc === "string") {
      try {
        parsed = JSON.parse(loc);
      } catch {
        parsed = { address: loc };
      }
    }
    if (!parsed || (typeof parsed !== "object" && typeof parsed !== "string")) {
      return <span className="text-xs text-muted-foreground">-</span>;
    }
    if (parsed?.auto || parsed?.is_auto_clock_out) {
      return (
        <div className="flex flex-col text-xs space-y-0.5">
          <span className="font-semibold text-amber-700 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Auto Logout (System)
          </span>
          <span className="text-[11px] text-muted-foreground">
            {parsed.reason || "Shift timed out"}
          </span>
        </div>
      );
    }

    const rawAddress = parsed.address || parsed.name || parsed.formatted_address;
    if (rawAddress && (rawAddress.toLowerCase().includes("laptop") || rawAddress.toLowerCase().includes("desktop") || parsed.source === "laptop" || parsed.device === "Laptop/Desktop")) {
      return (
        <div className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
          <Laptop className="w-3.5 h-3.5 text-indigo-600" />
          <span>Login from Laptop/Desktop</span>
        </div>
      );
    }
    const isErroneousForeign = rawAddress && (
      rawAddress.toLowerCase().includes("russia") ||
      rawAddress.toLowerCase().includes("moscow")
    );

    const lat = (!isErroneousForeign && parsed.lat != null) ? Number(parsed.lat) : null;
    const lng = (!isErroneousForeign && parsed.lng != null) ? Number(parsed.lng) : null;
    const hasCoords = lat != null && lng != null && !isNaN(lat) && !isNaN(lng);

    const addressText = isErroneousForeign
      ? "Office Network / Web Check-In"
      : (rawAddress || (hasCoords ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : null));
    const mapUrl = hasCoords ? `https://maps.google.com/?q=${lat},${lng}` : null;

    if (!addressText && !mapUrl) {
      return <span className="text-xs text-muted-foreground">-</span>;
    }

    return (
      <div className="flex flex-col text-xs space-y-0.5">
        <span className="font-medium text-slate-700 text-wrap leading-tight max-w-[250px]" title={addressText || "Location Captured"}>
          {addressText || "GPS Recorded"}
        </span>
        {mapUrl && (
          <a
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline inline-flex items-center gap-0.5 font-semibold text-[11px]"
          >
            <MapPin className="w-3 h-3 text-blue-500" /> View Map
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {selectedClockInfo && (
        <Dialog open={!!selectedClockInfo} onOpenChange={(o) => !o && setSelectedClockInfo(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Attendance Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="flex items-start justify-between border-b pb-3">
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{safeFormatDate(selectedClockInfo.date, "MMMM dd, yyyy")}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{selectedClockInfo.status || 'Present'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 p-3 bg-slate-50 rounded border">
                  <p className="text-sm font-semibold flex items-center gap-1"><Clock className="w-4 h-4 text-green-600"/> Clock In</p>
                  {selectedClockInfo.clock_in_time ? (
                    <>
                      <p className="text-sm">{formatTime(selectedClockInfo.clock_in_time)}</p>
                      {selectedClockInfo.clock_in_location && selectedClockInfo.clock_in_location.lat && selectedClockInfo.clock_in_location.lng && !JSON.stringify(selectedClockInfo.clock_in_location).toLowerCase().includes("russia") && (
                        <a href={`https://maps.google.com/?q=${selectedClockInfo.clock_in_location.lat},${selectedClockInfo.clock_in_location.lng}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 flex items-center hover:underline mt-1">
                          <MapPin className="w-3 h-3 mr-1" /> View on Map
                        </a>
                      )}
                    </>
                  ) : <p className="text-xs text-muted-foreground">Not recorded</p>}
                </div>
                
                <div className="space-y-2 p-3 bg-slate-50 rounded border">
                  <p className="text-sm font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-orange-600"/> Clock Out</span>
                    {(selectedClockInfo.is_auto_clock_out || selectedClockInfo.clock_out_location?.auto || selectedClockInfo.clock_out_location?.is_auto_clock_out) && (
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 font-bold">
                        Auto Logout
                      </Badge>
                    )}
                  </p>
                  {selectedClockInfo.clock_out_time ? (
                    <>
                      <p className="text-sm font-medium">{formatTime(selectedClockInfo.clock_out_time)}</p>
                      {(selectedClockInfo.is_auto_clock_out || selectedClockInfo.clock_out_location?.auto || selectedClockInfo.clock_out_location?.is_auto_clock_out) && (
                        <p className="text-xs text-amber-700 bg-amber-50/80 p-1.5 rounded border border-amber-200">
                          ⚠️ Employee did not clock out manually. Automatically clocked out by system before next shift start.
                        </p>
                      )}
                      {selectedClockInfo.clock_out_location && !selectedClockInfo.clock_out_location?.auto && (
                        <a href={`https://maps.google.com/?q=${selectedClockInfo.clock_out_location.lat},${selectedClockInfo.clock_out_location.lng}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 flex items-center hover:underline mt-1">
                          <MapPin className="w-3 h-3 mr-1" /> View on Map
                        </a>
                      )}
                    </>
                  ) : <p className="text-xs text-muted-foreground">Not recorded</p>}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Manual Punch In / Out Time Setting Dialog */}
      {manualPunchEmp && (
        <Dialog open={!!manualPunchEmp} onOpenChange={(o) => !o && setManualPunchEmp(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Set Daily Clock In & Out Time
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="bg-slate-50 p-3 rounded-lg border">
                <p className="text-sm font-semibold text-slate-800">{manualPunchEmp.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>Date: <strong className="text-slate-700">{safeFormatDate(dailyDate, "dd MMM yyyy")}</strong></span>
                  {(manualPunchEmp as any).wage_type === "daily" && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px]">Daily Wager (₹{(manualPunchEmp as any).daily_rate || (manualPunchEmp as any).monthly_salary}/day)</Badge>
                  )}
                  {(manualPunchEmp as any).wage_type === "hourly" && (
                    <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-300 text-[10px]">Hourly Wager (₹{(manualPunchEmp as any).hourly_rate}/hr)</Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Clock In Time</Label>
                  <Input
                    type="time"
                    value={manualPunchIn}
                    onChange={(e) => setManualPunchIn(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Clock Out Time</Label>
                  <Input
                    type="time"
                    value={manualPunchOut}
                    onChange={(e) => setManualPunchOut(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              {manualPunchIn && manualPunchOut && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-center justify-between">
                  <span>Computed Working Hours:</span>
                  <span className="font-bold font-mono text-sm">
                    {(() => {
                      try {
                        const [inH, inM] = manualPunchIn.split(":").map(Number);
                        const [outH, outM] = manualPunchOut.split(":").map(Number);
                        const diffMins = (outH * 60 + outM) - (inH * 60 + inM);
                        if (diffMins > 0) {
                          const h = Math.floor(diffMins / 60);
                          const m = diffMins % 60;
                          return `${h}h ${m}m (${(diffMins / 60).toFixed(2)} hrs)`;
                        }
                        return "Invalid time range";
                      } catch {
                        return "-";
                      }
                    })()}
                  </span>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setManualPunchEmp(null)}>Cancel</Button>
              <Button onClick={handleSaveManualPunch} disabled={savingManualPunch}>
                <Save className="w-4 h-4 mr-1.5" />
                {savingManualPunch ? "Saving..." : "Save Punch"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Attendance</h1>
          <p className="text-sm text-muted-foreground">Click a cell to cycle: Present → Absent → Half → Paid Leave → Holiday.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild><NavLink to="/employees">Employees</NavLink></Button>
          <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
          <Button variant="outline" size="icon" onClick={() => shiftMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {STATUS_OPTIONS.map((o) => (
          <span key={o.value} className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${o.cls}`}>
            <span className="font-semibold">{o.short}</span>{o.label}
          </span>
        ))}
      </div>

      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="monthly">Monthly Overview</TabsTrigger>
          <TabsTrigger value="roster">Roster Planner</TabsTrigger>
          <TabsTrigger value="daily">Daily Clock Logs</TabsTrigger>

          <TabsTrigger value="regularizations" className="flex items-center gap-1.5 relative">
            Regularizations
            {regularizations.filter(r => r.status === 'pending').length > 0 && (
              <span className="flex items-center gap-1 ml-1">
                <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow-xs">
                  {regularizations.filter(r => r.status === 'pending').length}
                </span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="holidays">Company Holidays</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="monthly" className="space-y-4">
<Card>
        <CardContent className="p-0 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : employees.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No active employees. <NavLink to="/employees" className="text-primary underline">Add one</NavLink>.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[180px]">Employee</TableHead>
                  {days.map((d) => (
                    <TableHead key={d.toISOString()} className="text-center px-1">
                      <div className="text-[10px] text-muted-foreground">{format(d, "EEE")}</div>
                      <div className="text-xs font-medium">{format(d, "d")}</div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center">Bulk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="sticky left-0 bg-background z-10 font-medium">{emp.name}</TableCell>
                      {days.map((d) => {
                      const ds = format(d, "yyyy-MM-dd");
                      const orgWeeklyOffs = org?.weekly_offs || [0];
                      const isOff = orgWeeklyOffs.includes(d.getDay());
                      const isHoliday = holidays.some((h) => h.date === ds);
                      const approvedLeaveType = approvedLeaveMap[`${emp.id}|${ds}`];
                      const recordedStatus = att[`${emp.id}|${ds}`];
                      const c = clockData[`${emp.id}|${ds}`];

                      const todayStr = format(new Date(), "yyyy-MM-dd");

                      // Determine display status — HR manual/recorded status in att takes supreme priority!
                      let displayStatus: Status | null = null;
                      if (recordedStatus) {
                        displayStatus = recordedStatus as Status;
                      } else if (approvedLeaveType) {
                        if (approvedLeaveType === "half_day") displayStatus = "half_day";
                        else if (approvedLeaveType === "wfh") displayStatus = "wfh";
                        else if (approvedLeaveType === "lwp" || approvedLeaveType === "unpaid") displayStatus = "lwp";
                        else if (STATUS_OPTIONS.some(o => o.value === approvedLeaveType)) displayStatus = approvedLeaveType as Status;
                        else displayStatus = "approved_leave";
                      } else if (isHoliday || isOff) {
                        displayStatus = "holiday";
                      } else if (ds <= todayStr) {
                        displayStatus = "absent";
                      }

                      const isFuture = ds > todayStr;

                      return (
                        <TableCell key={ds} className={`text-center p-1 relative group ${isFuture ? "opacity-40 bg-slate-50" : ""}`}>
                          {isFuture ? (
                            // Future date — locked, no interaction
                            <span className="inline-flex items-center justify-center h-6 w-7 rounded border text-[10px] text-slate-400 border-dashed border-slate-300 cursor-not-allowed" title="Future date — cannot mark attendance">
                              —
                            </span>
                          ) : isHoliday || isOff ? (
                            <span className="inline-flex items-center justify-center h-6 w-7 rounded border text-[10px] font-semibold bg-muted text-muted-foreground border-border" title={ds}>HO</span>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button title={
                                  approvedLeaveType 
                                    ? (recordedStatus && recordedStatus !== approvedLeaveType && recordedStatus !== "approved_leave"
                                        ? `HR Override: ${STATUS_OPTIONS.find(o => o.value === displayStatus)?.label || displayStatus} (Approved Leave: ${approvedLeaveType})`
                                        : `Approved ${approvedLeaveType} leave`)
                                    : ds
                                }>
                                  {displayStatus ? (
                                    statusBadge(displayStatus as Status, autoAttKeys.has(`${emp.id}|${ds}`))
                                  ) : (
                                    <span className="inline-flex items-center justify-center h-6 w-7 rounded border text-[10px] text-muted-foreground border-dashed">-</span>
                                  )}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-56 max-h-[300px] overflow-y-auto">
                                {STATUS_OPTIONS.map(opt => (
                                  <DropdownMenuItem 
                                    key={opt.value} 
                                    onClick={() => setCell(emp.id, ds, opt.value)}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    <span className={`inline-flex items-center justify-center h-5 w-6 rounded border text-[9px] font-semibold ${opt.cls}`}>
                                      {opt.short}
                                    </span>
                                    {opt.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          {c && !isFuture && (
                            <button onClick={() => setSelectedClockInfo(c)} className="absolute top-0 right-0 p-0.5 text-blue-500 hover:text-blue-700 bg-white rounded-full shadow-sm opacity-80 hover:opacity-100" title="View details">
                              <MapPin className="w-3 h-3" />
                            </button>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      <Select onValueChange={(v) => markRowAll(emp.id, v as Status)}>
                        <SelectTrigger className="h-7 w-24 text-xs"><SelectValue placeholder="Mark all" /></SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>All {o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {employees.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Monthly Summary — {format(monthStart, "MMMM yyyy")}</CardTitle>
            <Button onClick={postToExpenses} disabled={posting} variant="default">
              <Send className="h-4 w-4 mr-2" />{posting ? "Posting…" : "Post Salaries to Expenses"}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-center">Present</TableHead>
                  <TableHead className="text-center text-amber-600">Late</TableHead>
                  <TableHead className="text-center">Half</TableHead>
                  <TableHead className="text-center">Paid Leave</TableHead>
                  <TableHead className="text-center">Absent</TableHead>
                  <TableHead className="text-center">Holiday</TableHead>
                  <TableHead className="text-right">Payable Days</TableHead>
                  <TableHead className="text-right">Monthly Salary</TableHead>
                  <TableHead className="text-right">Payable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map((r) => (
                  <TableRow key={r.emp.id}>
                    <TableCell className="font-medium">{r.emp.name}</TableCell>
                    <TableCell className="text-center">{r.p}</TableCell>
                    <TableCell className="text-center text-amber-600 font-medium">{r.late || 0}</TableCell>
                    <TableCell className="text-center">{r.h}</TableCell>
                    <TableCell className="text-center">{r.pl}</TableCell>
                    <TableCell className="text-center">{r.a}</TableCell>
                    <TableCell className="text-center">{r.ho}</TableCell>
                    <TableCell className="text-right">{r.payableDays.toFixed(1)} / {r.workingDays}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.emp.monthly_salary, (org as any)?.currency || "INR")}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(r.payable, (org as any)?.currency || "INR")}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={9} className="text-right font-semibold">Total Payable</TableCell>
                  <TableCell className="text-right font-bold text-primary">{formatCurrency(totalPayable, (org as any)?.currency || "INR")}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      </TabsContent>

      <TabsContent value="roster" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Roster Planner (Future Dates)</CardTitle>
            <p className="text-sm text-muted-foreground">Plan rotational week-offs by clicking a cell to toggle it as a "Week Off". Don't forget to click Save at the top!</p>
          </CardHeader>
          <CardContent className="p-0 overflow-auto">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading…</div>
            ) : employees.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No active employees.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[180px]">Employee</TableHead>
                    {days.map((d) => (
                      <TableHead key={d.toISOString()} className="text-center px-1">
                        <div className="text-[10px] text-muted-foreground">{format(d, "EEE")}</div>
                        <div className="text-xs font-medium">{format(d, "d")}</div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="sticky left-0 bg-background z-10 font-medium">{emp.name}</TableCell>
                        {days.map((d) => {
                        const ds = format(d, "yyyy-MM-dd");
                        const recordedStatus = att[`${emp.id}|${ds}`];
                        const orgWeeklyOffs = org?.weekly_offs || [0];
                        
                        // Effective weekly offs from profile
                        const effectiveWeeklyOffs = ((org as any)?.enable_individual_week_offs && Array.isArray(emp.weekly_offs) && emp.weekly_offs.length > 0)
                          ? emp.weekly_offs
                          : orgWeeklyOffs;

                        const isDefaultOff = effectiveWeeklyOffs.includes(d.getDay());
                        const isHoliday = holidays.some((h) => h.date === ds);
                        
                        // Current displayed state
                        const isRosterOff = recordedStatus === "holiday" || (!recordedStatus && (isDefaultOff || isHoliday));

                        return (
                          <TableCell key={ds} className="text-center p-1 relative">
                            <button
                              onClick={() => {
                                // In Roster, we only care about setting Holiday or "Working" (present)
                                const nextStatus = isRosterOff ? "present" : "holiday";
                                setCell(emp.id, ds, nextStatus);
                              }}
                              title={ds}
                              className={`h-6 w-8 rounded border text-[10px] font-semibold flex items-center justify-center transition-all ${
                                isRosterOff ? "bg-slate-200 text-slate-700 border-slate-300 shadow-sm" : "bg-white text-slate-300 border-dashed hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-500"
                              }`}
                            >
                              {isRosterOff ? "OFF" : "+"}
                            </button>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="daily" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-4 rounded-lg border shadow-sm">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-base font-semibold">Daily Attendance & Location Logs</h3>
              <p className="text-xs text-muted-foreground">View check-in time, check-out time, working hours and GPS location for all employees for any selected date.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Select Date:</span>
            <Input
              type="date"
              value={dailyDate}
              max={format(new Date(), "yyyy-MM-dd")}
              onChange={(e) => setDailyDate(e.target.value)}
              className="w-44"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-3.5 sm:p-4 bg-slate-50 min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">Total Staff</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-800 tabular-nums truncate">{employees.length}</p>
          </Card>
          <Card className="p-3.5 sm:p-4 bg-emerald-50 border-emerald-200 min-w-0">
            <p className="text-xs font-medium text-emerald-700 truncate">Clocked In</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-800 tabular-nums truncate">
              {employees.filter(e => dailyLogs[e.id]?.clock_in_time).length}
            </p>
          </Card>
          <Card className="p-3.5 sm:p-4 bg-amber-50 border-amber-200 min-w-0">
            <p className="text-xs font-medium text-amber-700 truncate">Clocked Out</p>
            <p className="text-xl sm:text-2xl font-bold text-amber-800 tabular-nums truncate">
              {employees.filter(e => dailyLogs[e.id]?.clock_out_time).length}
            </p>
          </Card>
          <Card className="p-3.5 sm:p-4 bg-rose-50 border-rose-200 min-w-0">
            <p className="text-xs font-medium text-rose-700 truncate">Pending / Not Clocked In</p>
            <p className="text-xl sm:text-2xl font-bold text-rose-800 tabular-nums truncate">
              {employees.filter(e => !dailyLogs[e.id]?.clock_in_time).length}
            </p>
          </Card>
        </div>

        {/* Inner Sub-tabs */}
        <Tabs defaultValue="all-staff">
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger value="all-staff" className="text-xs font-medium">
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              All Staff Logs
            </TabsTrigger>
            <TabsTrigger value="wager-punch" className="text-xs font-medium">
              <HardHat className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
              Daily / Hourly Wager Punches
              {employees.filter(e => (e as any).wage_type === 'daily' || (e as any).wage_type === 'hourly').length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white">
                  {employees.filter(e => (e as any).wage_type === 'daily' || (e as any).wage_type === 'hourly').length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ---- All Staff Tab ---- */}
          <TabsContent value="all-staff" className="mt-3">
            <Card>
              <CardContent className="p-0 overflow-auto">
                {loadingDaily ? (
                  <div className="p-8 text-center text-muted-foreground">Loading attendance logs...</div>
                ) : employees.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No active employees found.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80">
                        <TableHead className="font-semibold">Employee</TableHead>
                        <TableHead className="font-semibold">Shift</TableHead>
                        <TableHead className="font-semibold text-center">Computed Status</TableHead>
                        <TableHead className="font-semibold">Clock In Time</TableHead>
                        <TableHead className="font-semibold">Clock In Location</TableHead>
                        <TableHead className="font-semibold">Clock Out Time</TableHead>
                        <TableHead className="font-semibold">Clock Out Location</TableHead>
                        <TableHead className="font-semibold text-right">Hours Worked</TableHead>
                        <TableHead className="text-right font-semibold">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((emp) => {
                        const log = dailyLogs[emp.id];
                        const hasClockIn = !!log?.clock_in_time;
                        const hasClockOut = !!log?.clock_out_time;
                        const shift = empShiftMap[emp.id] || orgDefaultShift || null;

                        const computeStatus = (): { label: string; cls: string } => {
                          if (log?.is_regularized || approvedRegMap?.[`${emp.id}|${dailyDate}`]) {
                            return { label: "Present (Regularized)", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" };
                          }

                          const approvedLeave = approvedLeaveMap[`${emp.id}|${dailyDate}`];
                          if (approvedLeave === "half_day") {
                            return { label: "Half Day Leave", cls: "bg-orange-100 text-orange-800 border-orange-300" };
                          }

                          const isHolidayDay = holidays.some((h) => h.date === dailyDate);
                          if (isHolidayDay && !hasClockIn) return { label: "Holiday", cls: "bg-slate-100 text-slate-600 border" };
                          
                          if (approvedLeave && !hasClockIn) {
                            const opt = STATUS_OPTIONS.find(o => o.value === approvedLeave);
                            return { label: opt?.label || "Approved Leave", cls: opt?.cls || "bg-purple-100 text-purple-700 border-purple-300" };
                          }

                          const hrDailyStatus = att[`${emp.id}|${dailyDate}`];
                          if (hrDailyStatus && hrDailyStatus !== "absent" && hrDailyStatus !== "present" && !["casual", "sick", "el_pl", "comp_off", "maternity", "paternity", "approved_leave", "paid_leave"].includes(hrDailyStatus)) {
                            const opt = STATUS_OPTIONS.find(o => o.value === hrDailyStatus);
                            if (opt) return { label: opt.label, cls: opt.cls };
                          }

                          if (!hasClockIn) {
                            return { label: "Absent", cls: "bg-red-100 text-red-700 border-red-300" };
                          }

                          const shiftStatus = computeShiftStatus(log.clock_in_time, shift, orgDefaultShift);
                          const finalSt = (log.status === "half_day" || log.status === "late") ? log.status : shiftStatus;

                          if (finalSt === "late") return { label: "Late Coming", cls: "bg-amber-100 text-amber-800 border-amber-300" };
                          if (finalSt === "half_day") return { label: "Half Day", cls: "bg-orange-100 text-orange-800 border-orange-300" };
                          return { label: "Present", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" };
                        };

                        const statusInfo = computeStatus();

                        return (
                          <TableRow key={emp.id} className="hover:bg-slate-50/60">
                            <TableCell>
                              <button onClick={() => setSelectedEmpDetail(emp)} className="text-left font-medium text-sm text-primary hover:underline">
                                {emp.name}
                              </button>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {(emp as any).employee_code && (
                                  <span className="text-xs text-muted-foreground">{(emp as any).employee_code}</span>
                                )}
                                {(emp as any).wage_type === "daily" && (
                                  <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded">Daily Wager</span>
                                )}
                                {(emp as any).wage_type === "hourly" && (
                                  <span className="text-[10px] bg-purple-100 text-purple-800 font-semibold px-1.5 py-0.5 rounded">Hourly Wager</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {shift ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                  {shift.name} ({shift.start_time?.slice(0,5)}–{shift.end_time?.slice(0,5)})
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">No shift</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.cls}`}>
                                {statusInfo.label}
                              </span>
                            </TableCell>
                            <TableCell>
                              {hasClockIn ? (
                                <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                  {formatTime(log.clock_in_time)}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>{renderLocation(log?.clock_in_location)}</TableCell>
                            <TableCell>
                              {hasClockOut ? (
                                <div className="flex items-center gap-1.5 text-sm font-medium text-amber-700">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  {formatTime(log.clock_out_time)}
                                  {(log.is_auto_clock_out || log.clock_out_location?.auto || log.clock_out_location?.is_auto_clock_out) && (
                                    <Badge variant="outline" className="ml-1 text-[10px] bg-amber-50 text-amber-700 border-amber-300 font-bold">
                                      Auto Logout
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>{renderLocation(log?.clock_out_location)}</TableCell>
                            <TableCell className="text-right font-medium text-sm">
                              {hasClockIn && hasClockOut ? calculateHours(log.clock_in_time, log.clock_out_time, !!(log?.is_auto_clock_out || log?.clock_out_location?.auto || isAutoClockOut(log)), shift) : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs font-medium gap-1"
                                onClick={() => {
                                  setManualPunchEmp(emp);
                                  setManualPunchIn(toHHmm(log?.clock_in_time, "09:00"));
                                  setManualPunchOut(toHHmm(log?.clock_out_time, "18:00"));
                                }}
                              >
                                <Edit3 className="w-3 h-3 text-primary" />
                                {hasClockIn ? "Edit Punch" : "Set Punch"}
                              </Button>
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

          {/* ---- Daily / Hourly Wager Punch Tab ---- */}
          <TabsContent value="wager-punch" className="mt-3">
            {(() => {
              const wagerEmps = employees.filter(e => (e as any).wage_type === 'daily' || (e as any).wage_type === 'hourly');
              if (wagerEmps.length === 0) {
                return (
                  <Card>
                    <CardContent className="py-16 text-center">
                      <HardHat className="h-12 w-12 text-amber-300 mx-auto mb-3" />
                      <p className="text-base font-semibold text-muted-foreground">No Daily / Hourly Wage Workers found</p>
                      <p className="text-sm text-muted-foreground mt-1">Add daily or hourly wage workers from the <strong>Employees</strong> page first.</p>
                    </CardContent>
                  </Card>
                );
              }
              return (
                <Card className="border-amber-200">
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <div className="flex items-center gap-2">
                      <HardHat className="h-5 w-5 text-amber-600" />
                      <div>
                        <p className="font-semibold text-sm text-amber-900">Daily & Hourly Wager Attendance</p>
                        <p className="text-xs text-muted-foreground">Enter check-in & check-out times for each wager worker. Hit <strong>Save</strong> to record.</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-xs">
                      {safeFormatDate(dailyDate, "dd MMM yyyy")}
                    </Badge>
                  </div>
                  <CardContent className="p-0 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-amber-50/60">
                          <TableHead className="font-semibold text-amber-900">Worker</TableHead>
                          <TableHead className="font-semibold text-amber-900">Type & Rate</TableHead>
                          <TableHead className="font-semibold text-amber-900 w-44">Check-In Time</TableHead>
                          <TableHead className="font-semibold text-amber-900 w-44">Check-Out Time</TableHead>
                          <TableHead className="font-semibold text-amber-900 text-center w-32">Hours Worked</TableHead>
                          <TableHead className="font-semibold text-amber-900 text-center w-36">Est. Wage Today</TableHead>
                          <TableHead className="font-semibold text-right w-28">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wagerEmps.map((emp) => {
                          const log = dailyLogs[emp.id];
                          const hasClockIn = !!log?.clock_in_time;
                          const hasClockOut = !!log?.clock_out_time;
                          const existingIn = hasClockIn ? toHHmm(log.clock_in_time, "") : "";
                          const existingOut = hasClockOut ? toHHmm(log.clock_out_time, "") : "";
                          const wageType = (emp as any).wage_type as "daily" | "hourly";
                          const dailyRate = Number((emp as any).daily_rate) || 0;
                          const hourlyRate = Number((emp as any).hourly_rate) || 0;
                          const currency = (org as any)?.currency || "INR";

                          let inInputRef: HTMLInputElement | null = null;
                          let outInputRef: HTMLInputElement | null = null;

                          const calcHrsDecimal = (inT: string, outT: string) => {
                            try {
                              const [ih, im] = inT.split(":").map(Number);
                              const [oh, om] = outT.split(":").map(Number);
                              const diff = (oh * 60 + om) - (ih * 60 + im);
                              return diff > 0 ? diff / 60 : 0;
                            } catch { return 0; }
                          };
                          const hrs = existingIn && existingOut ? calcHrsDecimal(existingIn, existingOut) : 0;
                          const estWage = wageType === "hourly"
                            ? hrs * hourlyRate
                            : hrs >= 6 ? dailyRate : hrs >= 4 ? dailyRate * 0.5 : 0;

                          const handleSavePunch = async () => {
                            // Prevent saving future dates
                            const today = format(new Date(), "yyyy-MM-dd");
                            if (dailyDate > today) {
                              toast({ title: "Future date not allowed", description: "You can only add attendance for today or past dates.", variant: "destructive" });
                              return;
                            }
                            const inEl = document.getElementById(`wpunch-in-${emp.id}`) as HTMLInputElement;
                            const outEl = document.getElementById(`wpunch-out-${emp.id}`) as HTMLInputElement;
                            const inTime = inEl?.value;
                            const outTime = outEl?.value;
                            if (!inTime) {
                              toast({ title: "Clock-In required", description: `Enter check-in time for ${emp.name}`, variant: "destructive" });
                              return;
                            }
                            setSavingManualPunch(true);
                            try {
                              const clockInIso = `${dailyDate}T${inTime}:00`;
                              const clockOutIso = outTime ? `${dailyDate}T${outTime}:00` : null;
                              if (log?.id) {
                                const { error } = await (supabase as any).from("attendances").update({
                                  clock_in_time: clockInIso,
                                  clock_out_time: clockOutIso,
                                  status: "present",
                                }).eq("id", log.id);
                                if (error) throw error;
                              } else {
                                const { error } = await (supabase as any).from("attendances").insert({
                                  org_id: org?.id,
                                  employee_id: emp.id,
                                  date: dailyDate,
                                  clock_in_time: clockInIso,
                                  clock_out_time: clockOutIso,
                                  status: "present",
                                });
                                if (error) throw error;
                              }
                              toast({ title: "Saved!", description: `Punch recorded for ${emp.name}` });
                              fetchDailyLogs(dailyDate);
                            } catch (err: any) {
                              toast({ title: "Failed", description: err.message, variant: "destructive" });
                            } finally {
                              setSavingManualPunch(false);
                            }
                          };

                          return (
                            <TableRow key={emp.id} className={`hover:bg-amber-50/20 ${hasClockIn ? "bg-emerald-50/10" : ""}`}>
                              <TableCell>
                                <button onClick={() => setSelectedEmpDetail(emp)} className="text-left font-semibold text-sm text-amber-900 hover:underline">
                                  {emp.name}
                                </button>
                                {(emp as any).employee_code && (
                                  <div className="text-xs text-muted-foreground">{(emp as any).employee_code}</div>
                                )}
                                {(emp as any).designation && (
                                  <div className="text-xs text-muted-foreground italic">{(emp as any).designation}</div>
                                )}
                                {hasClockIn && (
                                  <div className="mt-0.5">
                                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded">✓ Punched</span>
                                  </div>
                                )}
                              </TableCell>

                              <TableCell>
                                {wageType === "daily" ? (
                                  <div>
                                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-bold">Daily Wager</Badge>
                                    <div className="text-xs text-amber-800 font-semibold mt-0.5">{formatCurrency(dailyRate, currency)} / day</div>
                                  </div>
                                ) : (
                                  <div>
                                    <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-300 text-[10px] font-bold">Hourly Wager</Badge>
                                    <div className="text-xs text-purple-800 font-semibold mt-0.5">{formatCurrency(hourlyRate, currency)} / hr</div>
                                  </div>
                                )}
                              </TableCell>

                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                  <Input
                                    id={`wpunch-in-${emp.id}`}
                                    type="time"
                                    defaultValue={existingIn || "09:00"}
                                    className="h-8 text-xs font-mono w-full border-emerald-300 focus:border-emerald-500 focus:ring-emerald-200"
                                  />
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                  <Input
                                    id={`wpunch-out-${emp.id}`}
                                    type="time"
                                    defaultValue={existingOut || "18:00"}
                                    className="h-8 text-xs font-mono w-full border-amber-300 focus:border-amber-500 focus:ring-amber-200"
                                  />
                                </div>
                              </TableCell>

                              <TableCell className="text-center">
                                {hrs > 0 ? (
                                  <span className={`text-xs font-bold ${hrs >= 9 ? "text-emerald-700" : hrs >= 4 ? "text-amber-700" : "text-red-600"}`}>
                                    {Math.floor(hrs)}h {Math.round((hrs % 1) * 60)}m
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>

                              <TableCell className="text-center">
                                {estWage > 0 ? (
                                  <span className="text-xs font-bold text-emerald-800">{formatCurrency(estWage, currency)}</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>

                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1 font-semibold"
                                  onClick={handleSavePunch}
                                  disabled={savingManualPunch}
                                >
                                  <Save className="w-3 h-3" />
                                  {hasClockIn ? "Update" : "Save"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })()}
          </TabsContent>
        </Tabs>
      </TabsContent>

      <TabsContent value="regularizations">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Regularization Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Requested In</TableHead>
                  <TableHead>Requested Out</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regularizations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No regularization requests found.</TableCell>
                  </TableRow>
                ) : (
                  regularizations.map((reg) => {
                    const emp = reg.employees || employees.find((e) => e.id === reg.employee_id);
                    return (
                    <TableRow key={reg.id}>
                      <TableCell className="font-medium">
                        <div className="font-semibold text-slate-900">{emp?.name || 'Employee'}</div>
                        {emp?.designation && (
                          <div className="text-xs text-muted-foreground">{emp.designation}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {safeFormatDate(reg.date, 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {reg.requested_clock_in ? (
                          <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Clock className="w-3 h-3 mr-1 text-emerald-600" />
                            {safeFormatTime(reg.requested_clock_in)}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {reg.requested_clock_out ? (
                          <span className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <Clock className="w-3 h-3 mr-1 text-amber-600" />
                            {safeFormatTime(reg.requested_clock_out)}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[220px] truncate" title={reg.reason}>
                        {reg.reason}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${reg.status === 'approved' ? 'bg-green-100 text-green-700 border border-green-200' : reg.status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                          {reg.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {reg.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="text-green-600 border-green-200 bg-green-50 hover:bg-green-100" onClick={() => updateRegularizationStatus(reg, 'approved')}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 bg-red-50 hover:bg-red-100" onClick={() => updateRegularizationStatus(reg, 'rejected')}>
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="holidays" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Custom Holiday</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Holiday Name</label>
                <Input value={newHoliday.name} onChange={e => setNewHoliday({...newHoliday, name: e.target.value})} placeholder="e.g. Company Foundation Day" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input type="date" value={newHoliday.date} onChange={e => setNewHoliday({...newHoliday, date: e.target.value})} />
              </div>
              <Button onClick={() => addHoliday(newHoliday)}>Add Holiday</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Standard Indian Festivals (2026)</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[300px] overflow-auto border rounded-md p-0">
              <Table>
                <TableBody>
                  {INDIAN_FESTIVALS.map((fest, idx) => {
                    const isAdded = holidays.some(h => h.date === fest.date && h.name === fest.name);
                    return (
                      <TableRow key={idx}>
                        <TableCell>
                          <div className="font-medium">{fest.name}</div>
                          <div className="text-xs text-muted-foreground">{safeFormatDate(fest.date, "MMM dd, yyyy")}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant={isAdded ? "secondary" : "outline"} 
                            size="sm" 
                            disabled={isAdded}
                            onClick={() => addHoliday(fest)}
                          >
                            {isAdded ? "Added" : "Add"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Company Calendar ({holidays.length} Holidays)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Holiday Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No holidays added to the company calendar yet.</TableCell>
                  </TableRow>
                ) : (
                  holidays.map(h => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">{h.name}</TableCell>
                      <TableCell>{safeFormatDate(h.date, "MMMM dd, yyyy")} ({safeFormatDate(h.date, "EEEE")})</TableCell>
                      <TableCell className="capitalize">{h.type}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => removeHoliday(h.id)}>Remove</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="settings" className="space-y-6">
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Attendance & Wages Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Daily & Hourly Wages Workers Toggle */}
            <div className="flex items-start justify-between p-4 border rounded-xl bg-slate-50/70 dark:bg-slate-900/40 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <HardHat className="w-5 h-5 text-amber-600" />
                  <Label htmlFor="daily-wages-toggle" className="text-base font-semibold cursor-pointer">
                    Daily & Hourly Wages Workers
                  </Label>
                  <Badge variant="outline" className={dailyWagesEnabled ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-slate-100 text-slate-600"}>
                    {dailyWagesEnabled ? "Enabled" : "Off by Default"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                  Turn this on to manage daily-wage (₹/day) and hourly-wage (₹/hour) workers. 
                  When enabled, you will see options in <strong>Employees</strong> to add daily/hourly wagers, 
                  manually set check-in & check-out times, and calculate accurate daily/hourly wage payouts in the <strong>Salaries</strong> tab.
                </p>
              </div>
              <Switch
                id="daily-wages-toggle"
                checked={dailyWagesEnabled}
                onCheckedChange={setDailyWagesEnabled}
              />
            </div>

            <div className="flex items-start justify-between p-4 border rounded-xl bg-slate-50/70 dark:bg-slate-900/40 gap-4 mt-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="individual-weekoffs-toggle" className="text-base font-semibold cursor-pointer">
                    Enable Individual Employee Week-Offs
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                  When enabled, you can assign different week-offs (like Monday or Tuesday) to individual employees for rotational shifts.
                  If disabled, the global company week-off (e.g., Sunday) will apply to everyone.
                </p>
              </div>
              <Switch
                id="individual-weekoffs-toggle"
                checked={enableIndividualWeekOffs}
                onCheckedChange={setEnableIndividualWeekOffs}
              />
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="font-semibold text-sm">Weekly Off Days</h3>
              <p className="text-xs text-muted-foreground">Select the days that are fixed weekly off days for your organization. These days will automatically be marked as "Holiday" in the monthly overview.</p>
              
              <div className="flex flex-wrap gap-4 mt-2">
                {[
                  { label: "Sunday", value: 0 },
                  { label: "Monday", value: 1 },
                  { label: "Tuesday", value: 2 },
                  { label: "Wednesday", value: 3 },
                  { label: "Thursday", value: 4 },
                  { label: "Friday", value: 5 },
                  { label: "Saturday", value: 6 }
                ].map((day) => (
                  <label key={day.value} className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-primary focus:ring-primary"
                      checked={weeklyOffs.includes(day.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setWeeklyOffs([...weeklyOffs, day.value]);
                        } else {
                          setWeeklyOffs(weeklyOffs.filter((v) => v !== day.value));
                        }
                      }}
                    />
                    <span className="text-sm font-medium">{day.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button onClick={saveSettings} className="gap-2"><Save className="h-4 w-4" />Save Settings</Button>
          </CardContent>
        </Card>
      </TabsContent>

      </Tabs>
      {/* Employee Detail Dialog */}
      <Dialog open={!!selectedEmpDetail} onOpenChange={(v) => { if (!v) setSelectedEmpDetail(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <div className="p-6 border-b flex-shrink-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserCircle2 className="h-6 w-6 text-primary" />
              {selectedEmpDetail?.name}'s Attendance History
            </DialogTitle>
            <div className="mt-4 flex flex-wrap gap-4 items-end">
              <div className="space-y-1">
                <label className="text-xs font-medium">From Date</label>
                <Input type="date" value={detailFrom} onChange={e => setDetailFrom(e.target.value)} className="h-8 w-40 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">To Date</label>
                <Input type="date" value={detailTo} onChange={e => setDetailTo(e.target.value)} className="h-8 w-40 text-sm" />
              </div>
            </div>
            
            {!loadingDetail && detailRecords.length > 0 && (
              <div className="mt-4 flex gap-4 text-sm font-medium">
                <span className="text-green-700">Present: {detailRecords.filter(r => r.status === 'present').length}</span>
                <span className="text-amber-700">Late: {detailRecords.filter(r => r.status === 'late').length}</span>
                <span className="text-orange-700">Half Day: {detailRecords.filter(r => r.status === 'half_day').length}</span>
                <span className="text-red-700">Absent: {detailRecords.filter(r => r.status === 'absent').length}</span>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-auto p-6">
            {loadingDetail ? (
              <div className="text-center py-10 text-muted-foreground">Loading history...</div>
            ) : detailRecords.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">No records found for the selected date range.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Location In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Location Out</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailRecords.map((r, i) => (
                    <TableRow key={i} className="hover:bg-slate-50">
                      <TableCell>
                        <div className="font-medium">{safeFormatDate(r.date, "MMM dd, yyyy")}</div>
                        <div className="text-xs text-muted-foreground">{r.dayName}</div>
                      </TableCell>
                      <TableCell>
                        {r.status === 'approved_leave' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">Approved Leave</span>
                        ) : r.status !== '—' ? (
                          <div className="flex items-center gap-1.5">
                            {statusBadge(r.status, r.isAuto)}
                            {r.isAuto && <span className="text-[10px] text-muted-foreground italic">Auto</span>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.clockIn ? (
                          <div className="flex items-center gap-1 text-emerald-700 text-sm">
                            <Clock className="w-3 h-3" /> {safeFormatTime(r.clockIn)}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>{renderLocation(r.locationIn)}</TableCell>
                      <TableCell>
                        {r.clockOut ? (
                          <div className="flex items-center gap-1.5 text-amber-700 text-sm font-medium">
                            <Clock className="w-3 h-3" /> {safeFormatTime(r.clockOut)}
                            {r.isAutoClockOut && (
                              <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-300 font-bold px-1 py-0">
                                Auto Logout
                              </Badge>
                            )}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>{renderLocation(r.locationOut)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {r.clockIn && r.clockOut ? calculateHours(r.clockIn, r.clockOut) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

