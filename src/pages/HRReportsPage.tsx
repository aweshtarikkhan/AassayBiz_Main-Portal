import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { exportTableToCSV, exportTableToPDF } from "@/lib/exportUtils";
import { exportFullPagePDF } from "@/lib/pdfUtils";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, CalendarDays, IndianRupee, Download, FileText, ArrowLeft } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { isAutoClockOut } from "@/lib/salary-calculator";

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

function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return "—";
  try {
    const trimmed = String(timeStr).trim();
    if (!trimmed || trimmed === "-") return "—";
    if (/\b(AM|PM)\b/i.test(trimmed)) return trimmed;
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      const [h, m] = trimmed.split(":");
      const d = new Date();
      d.setHours(Number(h), Number(m), 0, 0);
      return format(d, "hh:mm a");
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour12: true, hour: "2-digit", minute: "2-digit" });
    }
    return trimmed;
  } catch {
    return timeStr || "—";
  }
}

function calculateHours(clockIn?: string | null, clockOut?: string | null, isAuto?: boolean, shiftObj?: any): string {
  if (!clockIn || !clockOut) return "—";
  try {
    if (isAuto) {
      const stdHours = 9;
      const shiftStart = shiftObj?.start_time || "09:00:00";
      const shiftEnd = shiftObj?.end_time || "18:00:00";
      const worked = calculateHoursLoginToShiftEnd(clockIn, "", stdHours, shiftStart, shiftEnd);
      const hrs = Math.floor(worked);
      const mins = Math.round((worked - hrs) * 60);
      return `${hrs}h ${mins}m`;
    }
    const d1 = new Date(clockIn);
    const d2 = new Date(clockOut);
    const diffMs = d2.getTime() - d1.getTime();
    if (isNaN(diffMs) || diffMs <= 0) return "—";
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${mins}m`;
  } catch {
    return "—";
  }
}

function getStatusBadge(status: string, leaveType?: string) {
  const norm = (status || "").toLowerCase().replace("-", "_").trim();

  if (norm === "present") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        Present
      </span>
    );
  }
  if (norm === "late") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        Late
      </span>
    );
  }
  if (norm === "half_day") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
        Half Day
      </span>
    );
  }
  if (norm === "absent") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
        Absent
      </span>
    );
  }
  if (norm === "leave" || norm === "paid_leave" || norm === "approved_leave" || ["casual", "sick", "el_pl", "comp_off", "maternity", "paternity", "lwp", "unpaid", "cl", "sl"].includes(norm)) {
    const label = leaveType 
      ? `Leave (${leaveType.toUpperCase()})` 
      : norm === "casual" || norm === "cl" 
      ? "Casual Leave (CL)" 
      : norm === "sick" || norm === "sl" 
      ? "Sick Leave (SL)" 
      : norm === "lwp" 
      ? "Leave Without Pay" 
      : "Leave";
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
        {label}
      </span>
    );
  }
  if (norm === "holiday") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        Holiday
      </span>
    );
  }
  if (norm === "wfh") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800 border border-cyan-200">
        WFH
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
      {status ? status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ") : "Present"}
    </span>
  );
}

export default function HRReportsPage() {
  const navigate = useNavigate();
  const org = useAppStore((s) => s.organization);
  
  const [headcount, setHeadcount] = useState(0);
  const [activeEmployees, setActiveEmployees] = useState(0);
  const [totalLeaveDays, setTotalLeaveDays] = useState(0);
  const [totalPayrollCost, setTotalPayrollCost] = useState(0);
  
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [leaveData, setLeaveData] = useState<any[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [todayStats, setTodayStats] = useState({ total: 0, present: 0, absent: 0, late: 0, halfDay: 0, onLeave: 0 });

  useEffect(() => {
    if (!org?.id) return;
    
    const fetchData = async () => {
      // Employees
      const { data: employees } = await supabase
        .from("employees")
        .select("*")
        .eq("org_id", org.id);
        
      if (employees) {
        setHeadcount(employees.length);
        setActiveEmployees(employees.filter(e => e.status !== 'inactive').length); // Adjust status check based on actual data
      }

      // Leaves
      const currentYear = new Date().getFullYear();
      const { data: leaves } = await supabase
        .from("leaves")
        .select("*, employees(id, name, designation)")
        .eq("org_id", org.id)
        .eq("status", "approved");

      let totalDays = 0;
      const leaveCounts: Record<string, number> = {};
      
      if (leaves) {
        leaves.forEach(l => {
          if (l.start_date && l.start_date.startsWith(currentYear.toString())) {
            const start = new Date(l.start_date);
            const end = new Date(l.end_date || l.start_date);
            const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);
            totalDays += days;
            
            const type = l.leave_type || 'Other';
            leaveCounts[type] = (leaveCounts[type] || 0) + days;
          }
        });
        
        setTotalLeaveDays(totalDays);
        setLeaveData(Object.keys(leaveCounts).map(key => ({
          name: key,
          value: leaveCounts[key]
        })));
      }

      // Payslips
      const { data: payslips } = await supabase
        .from("payslips")
        .select("*")
        .eq("org_id", org.id);
        
      if (payslips) {
        let totalCost = 0;
        const monthlyCost: Record<string, number> = {};
        
        payslips.forEach(p => {
          const cost = Number(p.net_pay) || 0;
          totalCost += cost;
          
          if (p.salary_month) {
            monthlyCost[p.salary_month] = (monthlyCost[p.salary_month] || 0) + cost;
          }
        });
        
        setTotalPayrollCost(totalCost);
        
        // Sort months appropriately if they are in "YYYY-MM" format
        const sortedMonths = Object.keys(monthlyCost).sort();
        setPayrollData(sortedMonths.map(m => ({
          month: m,
          cost: monthlyCost[m]
        })));
      }

      // Attendance: Fetch from both 'attendances' (clock-in/out) and 'attendance' (HR status), plus shifts and regularizations
      const [clockinRes, hrAttRes, shiftsRes, empShiftsRes, regRes] = await Promise.all([
        (supabase as any)
          .from("attendances")
          .select("*")
          .eq("org_id", org.id)
          .order("date", { ascending: false })
          .limit(500),
        (supabase as any)
          .from("attendance")
          .select("*")
          .eq("org_id", org.id)
          .order("attendance_date", { ascending: false })
          .limit(500),
        (supabase as any)
          .from("shifts")
          .select("*")
          .eq("org_id", org.id)
          .order("is_default", { ascending: false }),
        (supabase as any)
          .from("employee_shifts")
          .select("*")
          .eq("org_id", org.id),
        (supabase as any)
          .from("attendance_regularizations")
          .select("*")
          .eq("org_id", org.id)
          .eq("status", "approved")
          .limit(500),
      ]);

      const orgDefaultShift = (shiftsRes?.data || []).find((s: any) => s.is_default) || shiftsRes?.data?.[0] || null;
      const shiftById: Record<string, any> = {};
      (shiftsRes?.data || []).forEach((s: any) => {
        shiftById[s.id] = s;
      });

      const shiftMap: Record<string, any> = {};
      (empShiftsRes?.data || []).forEach((es: any) => {
        shiftMap[es.employee_id] = shiftById[es.shift_id] || orgDefaultShift;
      });

      const empMap: Record<string, any> = {};
      (employees || []).forEach((e: any) => {
        empMap[e.id] = e;
      });

      // Map approved leaves by employee_id|date
      const leaveMap: Record<string, { type: string; employeeName?: string; designation?: string }> = {};
      (leaves || []).forEach((l: any) => {
        try {
          if (!l.start_date || !l.employee_id) return;
          const s = new Date(l.start_date);
          const e = new Date(l.end_date || l.start_date);
          for (let cur = new Date(s); cur <= e; cur.setDate(cur.getDate() + 1)) {
            const ds = format(cur, "yyyy-MM-dd");
            leaveMap[`${l.employee_id}|${ds}`] = {
              type: l.leave_type || "Leave",
              employeeName: l.employees?.name,
              designation: l.employees?.designation,
            };
          }
        } catch {}
      });

      const hrOverriddenKeys = new Set<string>();
      const mergedMap: Record<string, any> = {};

      // 1. Process HR manual attendance records
      (hrAttRes?.data || []).forEach((r: any) => {
        const rawDate = r.attendance_date;
        if (!rawDate || !r.employee_id) return;
        const dateStr = typeof rawDate === "string" ? rawDate.slice(0, 10) : format(new Date(rawDate), "yyyy-MM-dd");
        const key = `${r.employee_id}|${dateStr}`;
        const emp = empMap[r.employee_id];
        const statusVal = (r.override_status || r.status || "present").toLowerCase().replace("-", "_");
        const isExplicitHrOverride = r.hr_note === "hr_override" || r.notes === "hr_override";

        mergedMap[key] = {
          id: r.id,
          date: dateStr,
          employee_id: r.employee_id,
          employeeName: emp?.name || "—",
          designation: emp?.designation || "",
          status: statusVal,
          clock_in_time: r.clock_in_time || r.check_in_time || null,
          clock_out_time: r.clock_out_time || r.check_out_time || null,
          is_auto_clock_out: !!r.is_auto_clock_out,
          created_at: r.created_at || dateStr,
          hr_note: r.hr_note || r.notes || null,
          is_hr_override: isExplicitHrOverride,
        };
        if (isExplicitHrOverride) {
          hrOverriddenKeys.add(key);
        }
      });

      // 1.5. Process approved regularizations
      (regRes?.data || []).forEach((r: any) => {
        const regDate = r.date || r.attendance_date;
        if (!regDate || !r.employee_id) return;
        const key = `${r.employee_id}|${regDate}`;
        const emp = empMap[r.employee_id];
        const clkIn = r.requested_clock_in 
          ? (r.requested_clock_in.includes('T') ? r.requested_clock_in : `${regDate}T${r.requested_clock_in}`)
          : `${regDate}T09:30:00`;
        const clkOut = r.requested_clock_out 
          ? (r.requested_clock_out.includes('T') ? r.requested_clock_out : `${regDate}T${r.requested_clock_out}`)
          : `${regDate}T18:30:00`;

        mergedMap[key] = {
          ...(mergedMap[key] || {}),
          id: r.id,
          date: regDate,
          employee_id: r.employee_id,
          employeeName: emp?.name || mergedMap[key]?.employeeName || "—",
          designation: emp?.designation || mergedMap[key]?.designation || "",
          status: "present",
          clock_in_time: clkIn,
          clock_out_time: clkOut,
          is_regularized: true,
          is_hr_override: true,
        };
        hrOverriddenKeys.add(key);
      });

      // 2. Process clock-in / clock-out records (punch logs)
      (clockinRes?.data || []).forEach((r: any) => {
        const rawDate = r.date;
        if (!rawDate || !r.employee_id) return;
        const dateStr = typeof rawDate === "string" ? rawDate.slice(0, 10) : format(new Date(rawDate), "yyyy-MM-dd");
        const key = `${r.employee_id}|${dateStr}`;
        const emp = empMap[r.employee_id];
        const shift = shiftMap[r.employee_id] || orgDefaultShift;

        let calculatedStatus = (r.status || "").toLowerCase().replace("-", "_");
        if (r.clock_in_time) {
          const shiftComputed = computeShiftStatus(r.clock_in_time, shift);
          if (shiftComputed === "late" || shiftComputed === "half_day" || !calculatedStatus || calculatedStatus === "present") {
            calculatedStatus = shiftComputed;
          }
        }

        const isAutoOut = !!(r.is_auto_clock_out || r.clock_out_location?.auto || r.clock_out_location?.is_auto_clock_out);

        const existing = mergedMap[key];
        if (existing) {
          existing.clock_in_time = r.clock_in_time || existing.clock_in_time;
          existing.clock_out_time = r.clock_out_time || existing.clock_out_time;
          if (isAutoOut) existing.is_auto_clock_out = true;
          if ((!existing.employeeName || existing.employeeName === "—") && emp?.name) {
            existing.employeeName = emp.name;
            existing.designation = emp.designation || "";
          }

          if (r.clock_in_time && (!existing.status || existing.status === "absent")) {
            existing.status = calculatedStatus || "present";
          } else if (!existing.is_hr_override) {
            if (calculatedStatus === "late" || calculatedStatus === "half_day") {
              existing.status = calculatedStatus;
            } else if (r.status === "late" || r.status === "half_day" || r.status === "half-day") {
              existing.status = r.status.toLowerCase().replace("-", "_");
            }
          }
        } else {
          mergedMap[key] = {
            id: r.id,
            date: dateStr,
            employee_id: r.employee_id,
            employeeName: emp?.name || "—",
            designation: emp?.designation || "",
            status: (calculatedStatus || r.status || "present").toLowerCase().replace("-", "_"),
            clock_in_time: r.clock_in_time || null,
            clock_out_time: r.clock_out_time || null,
            is_auto_clock_out: isAutoOut,
            created_at: r.created_at || dateStr,
            is_hr_override: false,
          };
        }
      });

      // 3. Overlay approved leaves (ONLY if HR has NOT manually overridden this employee & date)
      Object.keys(leaveMap).forEach((key) => {
        // HR manual override is supreme: do NOT overwrite HR's explicit mark!
        if (hrOverriddenKeys.has(key)) {
          return;
        }

        const [empId, dateStr] = key.split("|");
        const leaveInfo = leaveMap[key];
        const emp = empMap[empId];
        const isHalfDayLeave = leaveInfo.type === "half_day";

        if (mergedMap[key]) {
          if (!mergedMap[key].clock_in_time) {
            mergedMap[key].status = isHalfDayLeave ? "half_day" : (leaveInfo.type || "leave");
            mergedMap[key].leaveType = leaveInfo.type;
          }
        } else {
          mergedMap[key] = {
            id: `leave_${key}`,
            date: dateStr,
            employee_id: empId,
            employeeName: leaveInfo.employeeName || emp?.name || "—",
            designation: leaveInfo.designation || emp?.designation || "",
            status: isHalfDayLeave ? "half_day" : (leaveInfo.type || "leave"),
            leaveType: leaveInfo.type,
            clock_in_time: null,
            clock_out_time: null,
            created_at: dateStr,
            is_hr_override: false,
          };
        }
      });

      // 4. Fill in missing employee names
      Object.values(mergedMap).forEach((rec: any) => {
        if ((!rec.employeeName || rec.employeeName === "—") && empMap[rec.employee_id]) {
          rec.employeeName = empMap[rec.employee_id].name;
          rec.designation = empMap[rec.employee_id].designation || "";
        }
      });

      // 5. Sort descending by date, then by time
      const sorted = Object.values(mergedMap).sort((a: any, b: any) => {
        const cmp = b.date.localeCompare(a.date);
        if (cmp !== 0) return cmp;
        return (b.clock_in_time || b.created_at || "").localeCompare(a.clock_in_time || a.created_at || "");
      });

      setRecentAttendance(sorted.slice(0, 50));

      // 6. Calculate Today's Stats
      const todayStr = format(new Date(), "yyyy-MM-dd");
      let present = 0, absent = 0, late = 0, halfDay = 0, onLeave = 0;
      
      const activeEmps = (employees || []).filter((e: any) => e.is_active !== false);
      const total = activeEmps.length;

      activeEmps.forEach((emp: any) => {
        const key = `${emp.id}|${todayStr}`;
        const record = mergedMap[key];
        if (!record) {
          absent++;
        } else {
          const s = (record.status || "").toLowerCase().replace("-", "_");
          if (s === "half_day" || s === "half-day" || s === "hd") {
            halfDay++;
          } else if (s === "late" || s === "l") {
            late++;
          } else if (s === "present" || s === "p" || s === "wfh" || s === "od") {
            present++;
          } else if (s === "absent" || s === "ab") {
            absent++;
          } else if (
            s === "leave" || 
            s.includes("leave") || 
            ["casual", "sick", "el_pl", "comp_off", "maternity", "paternity", "lwp", "unpaid", "cl", "sl", "el", "pl", "al"].includes(s)
          ) {
            onLeave++;
          } else {
            present++; // fallback
          }
        }
      });
      
      setTodayStats({ total, present, absent, late, halfDay, onLeave });
    };
    
    fetchData();
  }, [org?.id]);

  const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#f97316", "#64748b", "#84cc16"];

  return (
    <div className="space-y-6" id="hr-report-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">HR Reports</h1>
          <p className="text-gray-500 mt-1">Analytics and KPIs for Human Resources</p>
        </div>
        <div>
          <Button variant="outline" size="sm" onClick={() => navigate("/reports")}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Reports
          </Button>
        </div>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold text-gray-900">Today's Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            <div>
              <div className="text-3xl font-bold text-gray-900">{todayStats.total}</div>
              <div className="text-sm font-medium text-gray-500 mt-1">Total Employees</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-emerald-600">{todayStats.present}</div>
              <div className="text-sm font-medium text-gray-500 mt-1">Present</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-rose-600">{todayStats.absent}</div>
              <div className="text-sm font-medium text-gray-500 mt-1">Absent</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-amber-500">{todayStats.late}</div>
              <div className="text-sm font-medium text-gray-500 mt-1">Late</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-600">{todayStats.halfDay}</div>
              <div className="text-sm font-medium text-gray-500 mt-1">Half Day</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">{todayStats.onLeave}</div>
              <div className="text-sm font-medium text-gray-500 mt-1">On Leave</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Headcount</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{headcount}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Employees</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{activeEmployees}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Leave Days (YTD)</CardTitle>
            <CalendarDays className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalLeaveDays}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Payroll Cost</CardTitle>
            <IndianRupee className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalPayrollCost)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Monthly Payroll Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {payrollData.length > 0 && payrollData.some((d) => d.cost > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={payrollData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => '₹' + Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(v))} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', color: '#111827' }}
                      formatter={(value: number) => [formatCurrency(value), 'Cost']}
                    />
                    <Bar dataKey="cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-sm text-gray-400 gap-1">
                  <span className="font-medium">Sufficient data not available</span>
                  <span className="text-xs text-gray-400/80">Generate payslips under Payroll to view monthly cost trends.</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Leave Types Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {leaveData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leaveData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {leaveData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', color: '#111827' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  No leave data available
                </div>
              )}
            </div>
      </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg text-gray-900">Recent Attendance & Punch Logs</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Live employee clock in, clock out, and total hours tracking</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  if (!recentAttendance.length) return;
                  const headers = ["Date", "Employee", "Designation", "Status", "Clock In", "Clock Out", "Working Hours"];
                  const rows = recentAttendance.map(att => [
                    att.date || '',
                    att.employeeName || '',
                    att.designation || '',
                    (att.status === 'leave' && att.leaveType ? `Leave (${att.leaveType.toUpperCase()})` : (att.status || '')).replace('_', ' ').toUpperCase(),
                    formatTime(att.clock_in_time),
                    formatTime(att.clock_out_time) + (att.is_auto_clock_out ? ' (Auto Logout)' : ''),
                    calculateHours(att.clock_in_time, att.clock_out_time, !!(att.is_auto_clock_out || isAutoClockOut(att))),
                  ]);
                  exportTableToCSV(headers, rows, "attendance_report");
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  if (!recentAttendance.length) return;
                  const headers = ["Date", "Employee", "Designation", "Status", "Clock In", "Clock Out", "Working Hours"];
                  const rows = recentAttendance.map(att => [
                    att.date || '',
                    att.employeeName || '',
                    att.designation || '',
                    (att.status === 'leave' && att.leaveType ? `Leave (${att.leaveType.toUpperCase()})` : (att.status || '')).replace('_', ' ').toUpperCase(),
                    formatTime(att.clock_in_time),
                    formatTime(att.clock_out_time) + (att.is_auto_clock_out ? ' (Auto Logout)' : ''),
                    calculateHours(att.clock_in_time, att.clock_out_time, !!(att.is_auto_clock_out || isAutoClockOut(att))),
                  ]);
                  exportTableToPDF("Attendance Report", headers, rows, "attendance_report");
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
          <div className="rounded-md border border-gray-200">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="border-gray-200 hover:bg-transparent">
                  <TableHead className="text-gray-500">Date</TableHead>
                  <TableHead className="text-gray-500">Employee</TableHead>
                  <TableHead className="text-gray-500">Status</TableHead>
                  <TableHead className="text-gray-500">Clock In</TableHead>
                  <TableHead className="text-gray-500">Clock Out</TableHead>
                  <TableHead className="text-gray-500">Working Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAttendance.length > 0 ? (
                  recentAttendance.map((record, idx) => {
                    const dateVal = record.date || record.attendance_date;
                    const employeeName = record.employeeName || record.employees?.name || "-";
                    const designation = record.designation || record.employees?.designation;
                    const clockIn = formatTime(record.clock_in_time || record.check_in || record.clock_in);
                    const clockOut = formatTime(record.clock_out_time || record.check_out || record.clock_out);
                    const status = record.status || "present";
                    const hoursWorked = calculateHours(record.clock_in_time, record.clock_out_time, !!(record.is_auto_clock_out || isAutoClockOut(record)));
                    return (
                      <TableRow key={record.id || idx} className="border-gray-200 hover:bg-gray-50/50">
                        <TableCell className="text-gray-600 font-medium">
                          {dateVal ? format(new Date(dateVal), "MMM dd, yyyy") : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="text-gray-900 font-semibold">{employeeName}</div>
                          {designation && <div className="text-xs text-gray-500">{designation}</div>}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(status, record.leaveType)}
                        </TableCell>
                        <TableCell className="text-gray-600 font-medium">{clockIn}</TableCell>
                        <TableCell className="text-gray-600 font-medium">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{clockOut}</span>
                            {record.is_auto_clock_out && clockOut !== "—" && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Auto Logout
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600 font-medium text-xs">
                          {hoursWorked}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow className="border-gray-200">
                    <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                      No recent attendance records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
