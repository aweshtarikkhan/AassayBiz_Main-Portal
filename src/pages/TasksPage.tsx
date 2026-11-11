import { useEffect, useState, useMemo } from "react";
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
  CheckSquare, Plus, Search, Calendar, Clock, Trash2, Edit2, Users,
  CheckCircle2, AlertCircle, Filter, LayoutGrid, List, SlidersHorizontal,
  ChevronDown, RefreshCw, UserCheck, Flag, Check, PauseCircle, PlayCircle,
  HelpCircle, ArrowUpDown, MoreHorizontal, User, ShieldAlert, X,
  Video,
  Link2,
  ExternalLink,
  History,
} from "lucide-react";
import { format, isPast, isToday, parseISO } from "date-fns";
import { sendTaskCalendarInvites } from "@/lib/task-calendar-service";

export interface TaskStatus {
  id: string;
  org_id: string;
  name: string;
  color: string;
  is_default: boolean;
  is_completed: boolean;
  order_index: number;
}

export interface EmployeeTask {
  id: string;
  org_id: string;
  employee_id: string;
  assigned_employee_ids?: string[];
  assigned_employee_names?: string[];
  title: string;
  description: string | null;
  meeting_link?: string | null;
  task_type?: 'individual' | 'group' | string;
  status_id: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  due_time: string | null;
  assigned_by: string | null;
  assigned_by_name: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    name: string;
    email: string | null;
    designation: string | null;
    avatar_url?: string | null;
  };
  assignees?: Array<{
    id: string;
    name: string;
    email: string | null;
    designation: string | null;
    avatar_url?: string | null;
  }>;
  activity_history?: Array<{ at: string; actor: string; role: string; action: string; details?: string }> | null;
}

const DEFAULT_STATUS_LIST = [
  { name: "Pending", color: "amber", is_default: true, is_completed: false, order_index: 0 },
  { name: "Working on it", color: "blue", is_default: false, is_completed: false, order_index: 1 },
  { name: "On Hold", color: "purple", is_default: false, is_completed: false, order_index: 2 },
  { name: "Done", color: "emerald", is_default: false, is_completed: true, order_index: 3 },
];

export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  rose: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  cyan: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  slate: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
};

export const PRIORITY_CONFIG: Record<string, { label: string; color: string; badge: string }> = {
  Low: { label: "Low", color: "text-slate-600", badge: "bg-slate-100 text-slate-700 border-slate-200" },
  Medium: { label: "Medium", color: "text-blue-600", badge: "bg-blue-100 text-blue-700 border-blue-200" },
  High: { label: "High", color: "text-amber-600", badge: "bg-amber-100 text-amber-700 border-amber-200" },
  Urgent: { label: "Urgent", color: "text-rose-600", badge: "bg-rose-100 text-rose-700 border-rose-200" },
};

export default function TasksPage() {
  const org = useAppStore((s) => s.organization);
  const user = useAppStore((s) => s.currentUserId);
  const { toast } = useToast();

  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "board">("list");

  // Task Create / Edit Dialog
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<EmployeeTask | null>(null);
  const [viewingTask, setViewingTask] = useState<EmployeeTask | null>(null);

  const getTaskTimeline = (task: EmployeeTask) => {
    if (Array.isArray(task.activity_history) && task.activity_history.length > 0) {
      return task.activity_history;
    }
    const items: Array<{ at: string; actor: string; role: string; action: string; details?: string }> = [];
    if (task.created_at) {
      items.push({
        at: task.created_at,
        actor: task.assigned_by_name || "Business HR",
        role: "hr",
        action: "Task Assigned",
        details: `Priority: ${task.priority || "Medium"} • Initial Status: ${task.status || "Pending"}`,
      });
    }
    if (task.updated_at && task.updated_at !== task.created_at) {
      items.push({
        at: task.updated_at,
        actor: "Business HR / Team",
        role: "hr",
        action: "Task Updated",
        details: `Current Status: ${task.status}`,
      });
    }
    if (task.notes) {
      items.push({
        at: task.updated_at || task.created_at,
        actor: task.assignees?.[0]?.name || "Employee",
        role: "employee",
        action: "Employee Work Note",
        details: task.notes,
      });
    }
    if (task.completed_at) {
      items.push({
        at: task.completed_at,
        actor: "Team / HR",
        role: "employee",
        action: "Task Completed",
        details: `Marked ${task.status}`,
      });
    }
    return items;
  };
  const [taskForm, setTaskForm] = useState<{
    title: string;
    description: string;
    task_type: "individual" | "group";
    employee_ids: string[];
    status: string;
    priority: string;
    due_date: string;
    due_time: string;
    meeting_link: string;
  }>({
    title: "",
    description: "",
    task_type: "individual",
    employee_ids: [],
    status: "Pending",
    priority: "Medium",
    due_date: "",
    due_time: "",
    meeting_link: "",
  });
  const [empSearchQuery, setEmpSearchQuery] = useState("");
  const [savingTask, setSavingTask] = useState(false);

  // Status Management Dialog
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("blue");
  const [newStatusCompleted, setNewStatusCompleted] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  // Load Data
  const loadAll = async () => {
    if (!org?.id) return;
    setLoading(true);
    try {
      // 1. Load employees
      const { data: empData } = await supabase
        .from("employees")
        .select("id, name, email, designation, is_active")
        .eq("org_id", org.id)
        .order("name");
      setEmployees(empData || []);

      // 2. Load or seed statuses
      let { data: statusData } = await supabase
        .from("task_statuses")
        .select("*")
        .eq("org_id", org.id)
        .order("order_index", { ascending: true });

      if (!statusData || statusData.length === 0) {
        // Seed defaults
        const toInsert = DEFAULT_STATUS_LIST.map((s) => ({ ...s, org_id: org.id }));
        const { data: seeded } = await supabase
          .from("task_statuses")
          .insert(toInsert)
          .select();
        statusData = seeded || [];
      }
      setStatuses(statusData || []);

      // 3. Load tasks with employee details
      const { data: taskData, error: taskErr } = await supabase
        .from("employee_tasks")
        .select(`
          *,
          employee:employees(id, name, email, designation)
        `)
        .eq("org_id", org.id)
        .order("created_at", { ascending: false });

      if (taskErr) throw taskErr;

      // 4. Fetch all task_assignees for this org to enrich tasks with multiple assignees
      const { data: assigneeData } = await supabase
        .from("task_assignees")
        .select(`
          task_id,
          employee_id,
          employee:employees(id, name, email, designation)
        `)
        .eq("org_id", org.id);

      const assigneesByTask: Record<string, any[]> = {};
      assigneeData?.forEach((row: any) => {
        if (!assigneesByTask[row.task_id]) {
          assigneesByTask[row.task_id] = [];
        }
        if (row.employee) {
          assigneesByTask[row.task_id].push(row.employee);
        }
      });

      const enrichedTasks: EmployeeTask[] = (taskData || []).map((t: any) => {
        const directAssignees = assigneesByTask[t.id] || [];
        // If task_assignees has entries, use them; otherwise fallback to primary t.employee
        const finalAssignees = directAssignees.length > 0 
          ? directAssignees 
          : (t.employee ? [t.employee] : []);

        return {
          ...t,
          assignees: finalAssignees,
        };
      });

      setTasks(enrichedTasks);
    } catch (err: any) {
      console.error("Error loading task data:", err);
      toast({
        title: "Failed to load tasks",
        description: err.message || "Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [org?.id]);

  // Open Create Task Dialog
  const handleOpenCreateTask = () => {
    setEditingTask(null);
    setEmpSearchQuery("");
    setTaskForm({
      title: "",
      description: "",
      task_type: "individual",
      employee_ids: [],
      status: statuses.find((s) => s.is_default)?.name || "Pending",
      priority: "Medium",
      due_date: "",
      due_time: "",
      meeting_link: "",
    });
    setTaskDialogOpen(true);
  };

  // Open Edit Task Dialog
  const handleOpenEditTask = (task: EmployeeTask) => {
    setEditingTask(task);
    setEmpSearchQuery("");

    let ids: string[] = [];
    if (task.assigned_employee_ids && task.assigned_employee_ids.length > 0) {
      ids = task.assigned_employee_ids;
    } else if (task.assignees && task.assignees.length > 0) {
      ids = task.assignees.map((a) => a.id);
    } else if (task.employee_id) {
      ids = [task.employee_id];
    }

    const isGroupTask = (task.assigned_employee_ids && task.assigned_employee_ids.length > 1) || (task.assignees && task.assignees.length > 1) || task.task_type === "group";
    setTaskForm({
      title: task.title || "",
      description: task.description || "",
      task_type: isGroupTask ? "group" : "individual",
      employee_ids: ids,
      status: task.status || "Pending",
      priority: task.priority || "Medium",
      due_date: task.due_date || "",
      due_time: task.due_time || "",
      meeting_link: (task as any).meeting_link || "",
    });
    setTaskDialogOpen(true);
  };

  // Save Task (Create or Update)
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org?.id || !taskForm.title.trim() || taskForm.employee_ids.length === 0) {
      toast({
        title: "Missing Information",
        description: "Task title and at least one assigned employee are required.",
        variant: "destructive",
      });
      return;
    }

    setSavingTask(true);
    try {
      const selectedStatusObj = statuses.find((s) => s.name.toLowerCase() === taskForm.status.toLowerCase());
      const isCompleted = selectedStatusObj?.is_completed || taskForm.status.toLowerCase() === "done" || taskForm.status.toLowerCase() === "completed";

      const primaryEmployeeId = taskForm.employee_ids[0];
      const selectedEmps = employees.filter((e) => taskForm.employee_ids.includes(e.id));
      const selectedNames = selectedEmps.map((e) => e.name);

            const nowIso = new Date().toISOString();
      let nextTaskHistory: any[] = [];
      if (editingTask) {
        const changes: string[] = [];
        if (editingTask.title !== taskForm.title.trim()) changes.push(`Title → "${taskForm.title.trim()}"`);
        if (editingTask.priority !== taskForm.priority) changes.push(`Priority: ${editingTask.priority} → ${taskForm.priority}`);
        if (editingTask.status !== taskForm.status) changes.push(`Status: ${editingTask.status} → ${taskForm.status}`);
        if ((editingTask.due_date || "") !== (taskForm.due_date || "")) changes.push(`Due Date: ${taskForm.due_date || "Cleared"}`);
        if (((editingTask as any).meeting_link || "") !== (taskForm.meeting_link?.trim() || "")) changes.push("Meeting link updated");
        const prevCount = editingTask.assignees?.length || (editingTask.employee_id ? 1 : 0);
        if (prevCount !== selectedEmps.length) changes.push(`Assignees (${selectedEmps.length})`);
        nextTaskHistory = [
          ...getTaskTimeline(editingTask),
          {
            at: nowIso,
            actor: "Business HR",
            role: "hr",
            action: "Edited by HR",
            details: changes.length > 0 ? changes.join(" • ") : "Updated task details",
          },
        ];
      } else {
        nextTaskHistory = [
          {
            at: nowIso,
            actor: "Business HR",
            role: "hr",
            action: "Task Assigned",
            details: `Assigned to ${selectedNames.join(", ") || "Team"} • Priority: ${taskForm.priority} • Status: ${taskForm.status}`,
          },
        ];
      }

      const payload: any = {
        org_id: org.id,
        employee_id: primaryEmployeeId,
        assigned_employee_ids: taskForm.employee_ids,
        assigned_employee_names: selectedNames,
        task_type: taskForm.task_type,
        meeting_link: taskForm.meeting_link?.trim() || null,
        title: taskForm.title.trim(),
        description: taskForm.description?.trim() || null,
        status: taskForm.status,
        status_id: selectedStatusObj?.id || null,
        priority: taskForm.priority,
        due_date: taskForm.due_date || null,
        due_time: taskForm.due_time || null,
        completed_at: isCompleted ? (editingTask?.completed_at || new Date().toISOString()) : null,
        updated_at: nowIso,
        activity_history: nextTaskHistory,
      };

      let savedTaskId = editingTask?.id || null;

      if (editingTask) {
        const { error } = await supabase
          .from("employee_tasks")
          .update(payload)
          .eq("id", editingTask.id);
        if (error) throw error;
        toast({ title: "Task Updated", description: `Task "${payload.title}" updated successfully.` });
      } else {
        payload.assigned_by = user || null;
        payload.assigned_by_name = "Business HR";
        const { data: inserted, error } = await supabase
          .from("employee_tasks")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        savedTaskId = inserted?.id || null;
        toast({
          title: "Task Assigned",
          description: `Task assigned to ${taskForm.employee_ids.length} employee(s) successfully.`
        });
      }

      // Sync task_assignees junction table
      if (savedTaskId) {
        await supabase.from("task_assignees").delete().eq("task_id", savedTaskId);

        const rowsToInsert = taskForm.employee_ids.map((empId) => ({
          task_id: savedTaskId,
          employee_id: empId,
          org_id: org.id,
        }));

        if (rowsToInsert.length > 0) {
          const { error: syncErr } = await supabase.from("task_assignees").insert(rowsToInsert);
          if (syncErr) console.warn("Sync task_assignees error:", syncErr);
        }

        // Send Google Calendar invite email (.ics) to assigned employees if due date is specified
        if (taskForm.due_date && selectedEmps.length > 0) {
          sendTaskCalendarInvites({
            task: {
              id: savedTaskId,
              title: taskForm.title.trim(),
              description: taskForm.description?.trim() || null,
              priority: taskForm.priority,
              dueDate: taskForm.due_date,
              dueTime: taskForm.due_time || null,
              orgId: org.id,
              orgName: org.name || "Business HR",
              assignedByName: "Business HR",
            },
            employees: selectedEmps.map((e) => ({
              id: e.id,
              name: e.name,
              email: e.email,
            })),
          })
            .then(({ totalSent }) => {
              if (totalSent > 0) {
                toast({
                  title: "Calendar Invites Sent 📅",
                  description: `Google Calendar (.ics) invite delivered to ${totalSent} employee(s).`,
                });
              }
            })
            .catch((err) => console.warn("Calendar invite dispatch error:", err));
        }
      }

      setTaskDialogOpen(false);
      loadAll();
    } catch (err: any) {
      console.error("Save task error:", err);
      toast({
        title: "Error saving task",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingTask(false);
    }
  };

  // Quick Status Change
  const handleQuickStatusChange = async (taskId: string, newStatusName: string) => {
    try {
      const statusObj = statuses.find((s) => s.name.toLowerCase() === newStatusName.toLowerCase());
      const isCompleted = statusObj?.is_completed || newStatusName.toLowerCase() === "done" || newStatusName.toLowerCase() === "completed";

      const nowIso = new Date().toISOString();
      const existingTask = tasks.find((t) => t.id === taskId);
      const nextHistory = existingTask
        ? [
            ...getTaskTimeline(existingTask),
            {
              at: nowIso,
              actor: "Business HR",
              role: "hr",
              action: "Status Updated by HR",
              details: `${existingTask.status} → ${newStatusName}`,
            },
          ]
        : undefined;
      const updateData: any = {
        status: newStatusName,
        status_id: statusObj?.id || null,
        completed_at: isCompleted ? new Date().toISOString() : null,
        updated_at: nowIso,
        ...(nextHistory ? { activity_history: nextHistory } : {}),
      };

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...updateData } : t))
      );
      setViewingTask((prev) => (prev && prev.id === taskId ? { ...prev, ...updateData } : prev));

      const { error } = await supabase
        .from("employee_tasks")
        .update(updateData)
        .eq("id", taskId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Task marked as "${newStatusName}".`,
      });
    } catch (err: any) {
      toast({ title: "Failed to update status", description: err.message, variant: "destructive" });
      loadAll();
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete task "${title}"?`)) return;
    try {
      const { error } = await supabase.from("employee_tasks").delete().eq("id", taskId);
      if (error) throw error;
      toast({ title: "Task Deleted", description: `Task "${title}" removed.` });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err: any) {
      toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
    }
  };

  // Status Management: Add or Edit
  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatusName.trim() || !org?.id) return;
    setSavingStatus(true);
    try {
      if (editingStatusId) {
        const { error } = await supabase
          .from("task_statuses")
          .update({
            name: newStatusName.trim(),
            color: newStatusColor,
            is_completed: newStatusCompleted,
          })
          .eq("id", editingStatusId);
        if (error) throw error;
        toast({ title: "Status Updated" });
      } else {
        const nextOrder = statuses.length > 0 ? Math.max(...statuses.map((s) => s.order_index)) + 1 : 0;
        const { error } = await supabase.from("task_statuses").insert({
          org_id: org.id,
          name: newStatusName.trim(),
          color: newStatusColor,
          is_completed: newStatusCompleted,
          order_index: nextOrder,
        });
        if (error) throw error;
        toast({ title: "Status Created", description: `Added status "${newStatusName}".` });
      }

      setNewStatusName("");
      setEditingStatusId(null);
      setNewStatusCompleted(false);

      // Refresh statuses
      const { data } = await supabase
        .from("task_statuses")
        .select("*")
        .eq("org_id", org.id)
        .order("order_index", { ascending: true });
      setStatuses(data || []);
    } catch (err: any) {
      toast({ title: "Error saving status", description: err.message, variant: "destructive" });
    } finally {
      setSavingStatus(false);
    }
  };

  // Delete Status
  const handleDeleteStatus = async (statusId: string, statusName: string) => {
    if (!confirm(`Are you sure you want to delete status "${statusName}"?`)) return;
    try {
      const { error } = await supabase.from("task_statuses").delete().eq("id", statusId);
      if (error) throw error;
      toast({ title: "Status Deleted" });
      setStatuses((prev) => prev.filter((s) => s.id !== statusId));
    } catch (err: any) {
      toast({ title: "Error deleting status", description: err.message, variant: "destructive" });
    }
  };

  // Filtered Employees for dialog search
  const filteredEmployeesForForm = useMemo(() => {
    if (!empSearchQuery.trim()) return employees;
    const q = empSearchQuery.toLowerCase();
    return employees.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.designation?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q)
    );
  }, [employees, empSearchQuery]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title?.toLowerCase().includes(q);
        const matchesDesc = task.description?.toLowerCase().includes(q);
        const matchesEmp = task.employee?.name?.toLowerCase().includes(q);
        const matchesAssignees = task.assignees?.some((a) => a.name?.toLowerCase().includes(q));
        const matchesNames = task.assigned_employee_names?.some((n) => n?.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesEmp && !matchesAssignees && !matchesNames) return false;
      }

      // 2. Filter Employee (checks primary or any assignee)
      if (filterEmployee !== "all") {
        const matchesPrimary = task.employee_id === filterEmployee;
        const matchesArray = task.assigned_employee_ids?.includes(filterEmployee);
        const matchesAssignees = task.assignees?.some((a) => a.id === filterEmployee);
        if (!matchesPrimary && !matchesArray && !matchesAssignees) {
          return false;
        }
      }

      // 3. Filter Status
      if (filterStatus !== "all" && task.status.toLowerCase() !== filterStatus.toLowerCase()) {
        return false;
      }

      // 4. Filter Priority
      if (filterPriority !== "all" && task.priority.toLowerCase() !== filterPriority.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [tasks, searchQuery, filterEmployee, filterStatus, filterPriority]);

  // Statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    let pending = 0;
    let inProgress = 0;
    let onHold = 0;
    let done = 0;
    let overdue = 0;

    const todayStr = format(new Date(), "yyyy-MM-dd");

    tasks.forEach((t) => {
      const s = (t.status || "").toLowerCase();
      if (s === "pending") pending++;
      else if (s === "working on it" || s === "in progress" || s === "in-progress") inProgress++;
      else if (s === "on hold" || s === "hold") onHold++;
      else if (s === "done" || s === "completed") done++;

      if (t.due_date && t.due_date < todayStr && s !== "done" && s !== "completed") {
        overdue++;
      }
    });

    return { total, pending, inProgress, onHold, done, overdue };
  }, [tasks]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Task Management</h1>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
              Business HR
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Assign, schedule, and track employee tasks with real-time status updates from the Employee Portal.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatusModalOpen(true)}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
          >
            <SlidersHorizontal className="w-4 h-4 mr-1.5 text-slate-500" />
            Customize Statuses
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreateTask}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Assign New Task
          </Button>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3 bg-white border-slate-200/80 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Total Tasks</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{stats.total}</p>
        </Card>
        <Card className="p-3 bg-amber-50/60 border-amber-200/70 shadow-2xs">
          <p className="text-xs font-medium text-amber-700">⏳ Pending</p>
          <p className="text-xl font-bold text-amber-900 mt-0.5">{stats.pending}</p>
        </Card>
        <Card className="p-3 bg-blue-50/60 border-blue-200/70 shadow-2xs">
          <p className="text-xs font-medium text-blue-700">🚀 Working On It</p>
          <p className="text-xl font-bold text-blue-900 mt-0.5">{stats.inProgress}</p>
        </Card>
        <Card className="p-3 bg-purple-50/60 border-purple-200/70 shadow-2xs">
          <p className="text-xs font-medium text-purple-700">⏸️ On Hold</p>
          <p className="text-xl font-bold text-purple-900 mt-0.5">{stats.onHold}</p>
        </Card>
        <Card className="p-3 bg-emerald-50/60 border-emerald-200/70 shadow-2xs">
          <p className="text-xs font-medium text-emerald-700">✅ Completed</p>
          <p className="text-xl font-bold text-emerald-900 mt-0.5">{stats.done}</p>
        </Card>
        <Card className={`p-3 shadow-2xs border ${stats.overdue > 0 ? "bg-rose-50 border-rose-200" : "bg-white border-slate-200/80"}`}>
          <p className={`text-xs font-medium ${stats.overdue > 0 ? "text-rose-700" : "text-slate-500"}`}>⚠️ Overdue</p>
          <p className={`text-xl font-bold mt-0.5 ${stats.overdue > 0 ? "text-rose-900" : "text-slate-700"}`}>{stats.overdue}</p>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 bg-white border-slate-200">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by title, description, or employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-slate-200 text-sm h-9"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Employee Filter */}
            <Select value={filterEmployee} onValueChange={setFilterEmployee}>
              <SelectTrigger className="w-[160px] h-9 text-xs border-slate-200">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-9 text-xs border-slate-200">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s.id} value={s.name.toLowerCase()}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[130px] h-9 text-xs border-slate-200">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "list" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("board")}
                className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "board" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                }`}
                title="Kanban Board View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex items-center justify-center p-16">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card className="p-12 text-center bg-white border-slate-200">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No tasks found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {searchQuery || filterEmployee !== "all" || filterStatus !== "all"
              ? "No tasks match your current filter settings."
              : "Get started by assigning your first task to an employee."}
          </p>
          <Button onClick={handleOpenCreateTask} size="sm" className="bg-indigo-600 text-white">
            <Plus className="w-4 h-4 mr-1.5" /> Assign New Task
          </Button>
        </Card>
      ) : viewMode === "list" ? (
        /* ── LIST VIEW TABLE ── */
        <Card className="bg-white border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                <TableRow>
                  <TableHead className="w-[30%]">Task Title & Details</TableHead>
                  <TableHead>Assigned Employee(s)</TableHead>
                  <TableHead>Due Date & Time</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => {
                  const todayStr = format(new Date(), "yyyy-MM-dd");
                  const isOverdue = task.due_date && task.due_date < todayStr && task.status.toLowerCase() !== "done" && task.status.toLowerCase() !== "completed";
                  const isDueToday = task.due_date === todayStr;

                  const statusConfig = STATUS_COLORS[
                    statuses.find((s) => s.name.toLowerCase() === task.status.toLowerCase())?.color || "blue"
                  ] || STATUS_COLORS.blue;

                  const priorityInfo = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Medium;

                  return (
                    <TableRow key={task.id} onClick={() => setViewingTask(task)} className="hover:bg-slate-50/60 transition-colors cursor-pointer" title="Click to inspect full task & history">
                      {/* Title & Description */}
                      <TableCell className="align-top py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900 text-sm leading-snug">{task.title}</p>
                            {task.task_type === 'group' || (task.assignees && task.assignees.length > 1) ? (
                              <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold gap-1 shrink-0">
                                <Users className="w-2.5 h-2.5" /> Group
                              </Badge>
                            ) : null}
                          </div>
                          {task.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{task.description}</p>
                          )}
                          {task.meeting_link && (
                            <div className="pt-0.5">
                              <a
                                href={task.meeting_link}
                                onClick={(e) => e.stopPropagation()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs"
                                title="Open Online Meeting / Video Call"
                              >
                                <Video className="w-3.5 h-3.5 text-blue-600" />
                                <span>Join Meeting</span>
                                <ExternalLink className="w-3 h-3 text-blue-400" />
                              </a>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5">
                            <span>Created {format(new Date(task.created_at), "dd MMM yyyy")}</span>
                            {task.completed_at && (
                              <span className="text-emerald-600 font-medium">
                                • Completed {format(new Date(task.completed_at), "dd MMM, hh:mm a")}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Assigned Employee(s) */}
                      <TableCell className="align-top py-3">
                        {(() => {
                          const assigneesList = (task.assignees && task.assignees.length > 0)
                            ? task.assignees
                            : (task.employee ? [task.employee] : []);

                          if (assigneesList.length === 0) {
                            return <span className="text-xs text-slate-400 italic">Unassigned</span>;
                          }

                          if (assigneesList.length === 1) {
                            const emp = assigneesList[0];
                            return (
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                                  {emp.name?.[0]?.toUpperCase() || "E"}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-800 leading-tight">
                                    {emp.name}
                                  </p>
                                  <p className="text-xs text-slate-500 leading-tight mt-0.5">
                                    {emp.designation || "Staff"}
                                  </p>
                                </div>
                              </div>
                            );
                          }

                          // Multiple assignees
                          return (
                            <div className="space-y-1.5 max-w-[220px]">
                              <div className="flex items-center gap-1.5">
                                <div className="flex -space-x-2 overflow-hidden">
                                  {assigneesList.slice(0, 3).map((emp, i) => (
                                    <div
                                      key={emp.id || i}
                                      className="inline-block h-7 w-7 rounded-full ring-2 ring-white bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shadow-2xs"
                                      title={emp.name}
                                    >
                                      {emp.name?.[0]?.toUpperCase() || "E"}
                                    </div>
                                  ))}
                                  {assigneesList.length > 3 && (
                                    <div className="inline-block h-7 w-7 rounded-full ring-2 ring-white bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shadow-2xs">
                                      +{assigneesList.length - 3}
                                    </div>
                                  )}
                                </div>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold">
                                  <Users className="w-3 h-3 mr-1" /> {assigneesList.length} Staff
                                </Badge>
                              </div>
                              <p className="text-xs font-medium text-slate-700 line-clamp-1" title={assigneesList.map((a) => a.name).join(", ")}>
                                {assigneesList.map((a) => a.name).join(", ")}
                              </p>
                            </div>
                          );
                        })()}
                      </TableCell>

                      {/* Due Date & Time */}
                      <TableCell className="align-top py-3">
                        {task.due_date ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-xs font-medium text-slate-800">
                                {format(parseISO(task.due_date), "dd MMM yyyy")}
                              </span>
                            </div>
                            {task.due_time && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{task.due_time}</span>
                              </div>
                            )}
                            {isOverdue && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-rose-50 text-rose-700 border-rose-200 font-bold">
                                Overdue
                              </Badge>
                            )}
                            {isDueToday && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200 font-bold">
                                Due Today
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No due date</span>
                        )}
                      </TableCell>

                      {/* Priority */}
                      <TableCell className="align-top py-3">
                        <Badge variant="outline" className={`text-xs px-2 py-0.5 font-semibold ${priorityInfo.badge}`}>
                          {task.priority}
                        </Badge>
                      </TableCell>

                      {/* Status Dropdown */}
                      <TableCell onClick={(e) => e.stopPropagation()} className="align-top py-3">
                        <Select
                          value={task.status}
                          onValueChange={(val) => handleQuickStatusChange(task.id, val)}
                        >
                          <SelectTrigger className={`h-8 text-xs font-bold border rounded-lg shadow-2xs w-[140px] ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                            <SelectValue>{task.status}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {statuses.map((s) => (
                              <SelectItem key={s.id} value={s.name} className="text-xs font-medium">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full bg-${s.color}-500`} />
                                  <span>{s.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="align-top py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); handleOpenEditTask(task); }}
                            className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                            title="Edit Task"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id, task.title); }}
                            className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        /* ── KANBAN BOARD VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statuses.map((colStatus) => {
            const colTasks = filteredTasks.filter(
              (t) => t.status.toLowerCase() === colStatus.name.toLowerCase()
            );
            const colorClass = STATUS_COLORS[colStatus.color] || STATUS_COLORS.blue;

            return (
              <div
                key={colStatus.id}
                className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 flex flex-col min-h-[420px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${colorClass.bg} border ${colorClass.border}`} />
                    <h3 className="font-bold text-sm text-slate-800">{colStatus.name}</h3>
                  </div>
                  <Badge variant="outline" className="text-xs bg-white text-slate-700 font-bold px-2">
                    {colTasks.length}
                  </Badge>
                </div>

                {/* Column Task Cards */}
                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 italic">No tasks in {colStatus.name}</div>
                  ) : (
                    colTasks.map((task) => {
                      const todayStr = format(new Date(), "yyyy-MM-dd");
                      const isOverdue = task.due_date && task.due_date < todayStr && !colStatus.is_completed;
                      const priorityInfo = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Medium;

                      return (
                        <Card
                          key={task.id}
                          onClick={() => setViewingTask(task)}
                          title="Click to inspect full task & history"
                          className="p-3 bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all space-y-2 cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-slate-900 text-xs leading-snug line-clamp-2">
                              {task.title}
                            </h4>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleOpenEditTask(task); }}
                                className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id, task.title); }}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {task.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-2">{task.description}</p>
                          )}

                          {/* Meta & Assignee */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            {(() => {
                              const assigneesList = (task.assignees && task.assignees.length > 0)
                                ? task.assignees
                                : (task.employee ? [task.employee] : []);

                              if (assigneesList.length > 1) {
                                return (
                                  <div className="flex items-center gap-1.5 text-indigo-700" title={assigneesList.map((a) => a.name).join(", ")}>
                                    <div className="flex -space-x-1.5 overflow-hidden">
                                      {assigneesList.slice(0, 2).map((a, i) => (
                                        <div key={a.id || i} className="w-5 h-5 rounded-full ring-1 ring-white bg-indigo-100 text-indigo-700 font-bold text-[9px] flex items-center justify-center">
                                          {a.name?.[0]?.toUpperCase() || "E"}
                                        </div>
                                      ))}
                                    </div>
                                    <span className="text-[11px] font-semibold">
                                      {assigneesList.length} Staff
                                    </span>
                                  </div>
                                );
                              }

                              return (
                                <div className="flex items-center gap-1.5 text-slate-600">
                                  <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center">
                                    {assigneesList[0]?.name?.[0]?.toUpperCase() || "E"}
                                  </div>
                                  <span className="text-[11px] font-medium truncate max-w-[90px]">
                                    {assigneesList[0]?.name || "Staff"}
                                  </span>
                                </div>
                              );
                            })()}

                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priorityInfo.badge}`}>
                              {task.priority}
                            </Badge>
                          </div>

                          {/* Due date badge */}
                          {task.due_date && (
                            <div className="flex items-center justify-between pt-1 text-[10px]">
                              <span className={`flex items-center gap-1 ${isOverdue ? "text-rose-600 font-bold" : "text-slate-500"}`}>
                                <Calendar className="w-3 h-3" />
                                {format(parseISO(task.due_date), "dd MMM")}
                                {task.due_time && ` ${task.due_time}`}
                              </span>
                              {isOverdue && <span className="text-rose-600 font-bold uppercase">Overdue</span>}
                            </div>
                          )}

                          {/* Quick move dropdown */}
                          <div onClick={(e) => e.stopPropagation()} className="pt-1.5">
                            <Select
                              value={task.status}
                              onValueChange={(val) => handleQuickStatusChange(task.id, val)}
                            >
                              <SelectTrigger className="h-6 text-[10px] border-slate-200 text-slate-600 bg-slate-50/70">
                                <SelectValue placeholder="Move to..." />
                              </SelectTrigger>
                              <SelectContent>
                                {statuses.map((s) => (
                                  <SelectItem key={s.id} value={s.name} className="text-xs">
                                    Move to {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE / EDIT TASK DIALOG ── */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] bg-white border-slate-200 text-slate-900 shadow-2xl p-0 flex flex-col overflow-hidden rounded-2xl">
          {/* Sticky Header */}
          <DialogHeader className="p-5 border-b border-slate-100 bg-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  {editingTask ? "Edit Employee Task" : "Assign New Task"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {editingTask ? "Update task details, assignees, schedule, or meeting link" : "Create an individual or group task with schedule & online meeting link"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Form with Scrollable Content and Sticky Footer */}
          <form onSubmit={handleSaveTask} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Task Title */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Task Title *</Label>
                <Input
                  required
                  placeholder="e.g. File monthly GSTR-3B return, call with Dilip Sir, warehouse audit"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                  className="bg-white border-slate-200 text-sm h-10"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Description (Optional)</Label>
                <Textarea
                  rows={2}
                  placeholder="Detailed instructions, deliverables, meeting agenda, or checklist items..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
                  className="bg-white border-slate-200 text-xs"
                />
              </div>

              {/* Task Mode: Individual vs Group Task */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">
                    Assignment Mode *
                  </Label>
                  <span className="text-[11px] text-slate-400">
                    {taskForm.task_type === 'individual' ? 'Assign to a single employee' : 'Assign to multiple employees as a team'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setTaskForm((f) => ({
                        ...f,
                        task_type: 'individual',
                        employee_ids: f.employee_ids.slice(0, 1),
                      }));
                    }}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      taskForm.task_type === 'individual'
                        ? 'bg-white text-indigo-700 shadow-xs border border-indigo-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Individual Task</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTaskForm((f) => ({ ...f, task_type: 'group' }));
                    }}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      taskForm.task_type === 'group'
                        ? 'bg-white text-indigo-700 shadow-xs border border-indigo-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Group Task</span>
                  </button>
                </div>
              </div>

              {/* Assignee Selection (Individual Mode) */}
              {taskForm.task_type === 'individual' ? (
                <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Select Assigned Employee *</span>
                    {taskForm.employee_ids[0] && (
                      <span className="text-[11px] text-indigo-600 font-semibold">1 selected</span>
                    )}
                  </Label>
                  <Select
                    value={taskForm.employee_ids[0] || ""}
                    onValueChange={(val) => setTaskForm((f) => ({ ...f, employee_ids: [val] }))}
                  >
                    <SelectTrigger className="bg-white border-slate-200 text-xs h-10">
                      <SelectValue placeholder="Choose an employee to assign..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id} className="text-xs py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {emp.name?.[0]?.toUpperCase() || "E"}
                            </div>
                            <span className="font-semibold text-slate-800">{emp.name}</span>
                            {emp.designation && (
                              <span className="text-slate-400 text-[11px]">({emp.designation})</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {taskForm.employee_ids[0] && (() => {
                    const emp = employees.find((e) => e.id === taskForm.employee_ids[0]);
                    if (!emp) return null;
                    return (
                      <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-indigo-100 mt-2 shadow-2xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {emp.name?.[0]?.toUpperCase() || "E"}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{emp.name}</p>
                            <p className="text-[11px] text-slate-500">{emp.designation || "Staff"} • {emp.email || "No email"}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
                          Assigned
                        </Badge>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Assignee Selection (Group Task Mode - Multi-Select) */
                <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700">
                      Assign To Group Employees *{" "}
                      {taskForm.employee_ids.length > 0 && (
                        <span className="text-indigo-600 font-bold">
                          ({taskForm.employee_ids.length} selected)
                        </span>
                      )}
                    </Label>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          const allIds = employees.map((e) => e.id);
                          setTaskForm((f) => ({ ...f, employee_ids: allIds }));
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          setTaskForm((f) => ({ ...f, employee_ids: [] }));
                        }}
                        className="text-slate-500 hover:text-slate-700 font-semibold hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Selected Pills */}
                  {taskForm.employee_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-lg border border-slate-200 max-h-20 overflow-y-auto">
                      {taskForm.employee_ids.map((empId) => {
                        const emp = employees.find((e) => e.id === empId);
                        if (!emp) return null;
                        return (
                          <span
                            key={empId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
                          >
                            <span>{emp.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setTaskForm((f) => ({
                                  ...f,
                                  employee_ids: f.employee_ids.filter((id) => id !== empId),
                                }));
                              }}
                              className="hover:text-rose-600 rounded-full"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Searchable Checkbox List */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                      <Search className="w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search employees by name or designation..."
                        value={empSearchQuery}
                        onChange={(e) => setEmpSearchQuery(e.target.value)}
                        className="w-full bg-transparent text-xs border-none outline-none placeholder:text-slate-400"
                      />
                      {empSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setEmpSearchQuery("")}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 p-1">
                      {filteredEmployeesForForm.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-400">
                          No matching employees found
                        </div>
                      ) : (
                        filteredEmployeesForForm.map((emp) => {
                          const isSelected = taskForm.employee_ids.includes(emp.id);
                          return (
                            <label
                              key={emp.id}
                              className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors text-xs ${
                                isSelected ? "bg-indigo-50/60 text-indigo-900" : "hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setTaskForm((f) => ({ ...f, employee_ids: [...f.employee_ids, emp.id] }));
                                    } else {
                                      setTaskForm((f) => ({
                                        ...f,
                                        employee_ids: f.employee_ids.filter((id) => id !== emp.id),
                                      }));
                                    }
                                  }}
                                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[9px] flex items-center justify-center shrink-0">
                                  {emp.name?.[0]?.toUpperCase() || "E"}
                                </div>
                                <span className="font-medium truncate">{emp.name}</span>
                                {emp.designation && (
                                  <span className="text-[10px] text-slate-400 truncate">({emp.designation})</span>
                                )}
                              </div>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              )}
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Online Meeting / Video Call Link Box */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-blue-600" />
                    <span>Meeting / Call Link (Optional)</span>
                  </Label>
                  {taskForm.meeting_link && (
                    <button
                      type="button"
                      onClick={() => setTaskForm((f) => ({ ...f, meeting_link: "" }))}
                      className="text-[10px] text-slate-400 hover:text-slate-600"
                    >
                      Clear Link
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Provide Google Meet, Zoom, MS Teams, or call link. Employees can join with 1 click directly from their portal.
                </p>
                <div className="relative">
                  <Link2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    type="url"
                    placeholder="e.g. https://meet.google.com/abc-defg-hij or https://zoom.us/j/12345"
                    value={taskForm.meeting_link}
                    onChange={(e) => setTaskForm((f) => ({ ...f, meeting_link: e.target.value }))}
                    className="pl-9 bg-white border-blue-200 text-xs h-9"
                  />
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[10px] text-slate-400 font-medium">Quick link:</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!taskForm.meeting_link) setTaskForm((f) => ({ ...f, meeting_link: "https://meet.google.com/new" }));
                    }}
                    className="text-[10px] font-semibold text-blue-700 bg-blue-100/70 hover:bg-blue-100 px-2 py-0.5 rounded-md transition-colors"
                  >
                    + Google Meet
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!taskForm.meeting_link) setTaskForm((f) => ({ ...f, meeting_link: "https://zoom.us/join" }));
                    }}
                    className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/70 hover:bg-indigo-100 px-2 py-0.5 rounded-md transition-colors"
                  >
                    + Zoom Call
                  </button>
                </div>
              </div>

              {/* Due Date & Time */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Due Date (Optional)
                    </Label>
                    {taskForm.due_date && (
                      <button
                        type="button"
                        onClick={() => setTaskForm((f) => ({ ...f, due_date: "" }))}
                        className="text-[10px] text-slate-400 hover:text-slate-600"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <Input
                    type="date"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm((f) => ({ ...f, due_date: e.target.value }))}
                    className="bg-white border-slate-200 text-xs h-8"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" /> Due Time (Optional)
                    </Label>
                    {taskForm.due_time && (
                      <button
                        type="button"
                        onClick={() => setTaskForm((f) => ({ ...f, due_time: "" }))}
                        className="text-[10px] text-slate-400 hover:text-slate-600"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <Input
                    type="time"
                    value={taskForm.due_time}
                    onChange={(e) => setTaskForm((f) => ({ ...f, due_time: e.target.value }))}
                    className="bg-white border-slate-200 text-xs h-8"
                  />
                </div>
              </div>

              {/* Priority & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Priority</Label>
                  <Select
                    value={taskForm.priority}
                    onValueChange={(val) => setTaskForm((f) => ({ ...f, priority: val }))}
                  >
                    <SelectTrigger className="bg-white border-slate-200 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Initial Status</Label>
                  <Select
                    value={taskForm.status}
                    onValueChange={(val) => setTaskForm((f) => ({ ...f, status: val }))}
                  >
                    <SelectTrigger className="bg-white border-slate-200 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s.id} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Sticky Footer - Always 100% Visible */}
            <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTaskDialogOpen(false)}
                className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingTask}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-5 shadow-sm active:scale-95 transition-all"
              >
                {savingTask ? "Saving..." : editingTask ? "Update Task" : "Assign Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── CUSTOMIZE STATUSES MODAL ── */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900 shadow-2xl p-6">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Task Status Options
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Add, edit, or remove task status options for employees to choose from in the portal.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Current Statuses List */}
          <div className="space-y-2 py-3">
            <Label className="text-xs font-semibold text-slate-700 block">Current Status Options</Label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {statuses.map((s) => {
                const colorConfig = STATUS_COLORS[s.color] || STATUS_COLORS.blue;
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-slate-50/70 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded font-bold border ${colorConfig.bg} ${colorConfig.text} ${colorConfig.border}`}>
                        {s.name}
                      </span>
                      {s.is_completed && (
                        <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.2 rounded">
                          (Done State)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStatusId(s.id);
                          setNewStatusName(s.name);
                          setNewStatusColor(s.color || "blue");
                          setNewStatusCompleted(s.is_completed || false);
                        }}
                        className="p-1 text-slate-500 hover:text-indigo-600 rounded"
                        title="Edit Status"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {statuses.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteStatus(s.id, s.name)}
                          className="p-1 text-slate-500 hover:text-rose-600 rounded"
                          title="Delete Status"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add / Edit Status Form */}
          <form onSubmit={handleSaveStatus} className="border-t border-slate-100 pt-3 space-y-3">
            <h4 className="text-xs font-bold text-slate-800">
              {editingStatusId ? "Edit Status Option" : "Add New Status Option"}
            </h4>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600">Status Label *</Label>
              <Input
                required
                placeholder="e.g. Under Review, Client Feedback, Blocked"
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
                className="bg-white border-slate-200 text-xs h-8"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600">Color Theme</Label>
                <Select value={newStatusColor} onValueChange={setNewStatusColor}>
                  <SelectTrigger className="bg-white border-slate-200 text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amber">Amber (Warning / Pending)</SelectItem>
                    <SelectItem value="blue">Blue (Working on it)</SelectItem>
                    <SelectItem value="purple">Purple (On Hold / Review)</SelectItem>
                    <SelectItem value="emerald">Emerald (Completed / Done)</SelectItem>
                    <SelectItem value="rose">Rose (Urgent / Blocked)</SelectItem>
                    <SelectItem value="indigo">Indigo (Primary)</SelectItem>
                    <SelectItem value="cyan">Cyan (Information)</SelectItem>
                    <SelectItem value="slate">Slate (Neutral)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 py-1.5">
                  <input
                    type="checkbox"
                    checked={newStatusCompleted}
                    onChange={(e) => setNewStatusCompleted(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span>Counts as Completed</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {editingStatusId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingStatusId(null);
                    setNewStatusName("");
                    setNewStatusCompleted(false);
                  }}
                  className="text-xs text-slate-500"
                >
                  Cancel Edit
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
                disabled={savingStatus || !newStatusName.trim()}
                className="bg-indigo-600 text-white font-semibold text-xs"
              >
                {savingStatus ? "Saving..." : editingStatusId ? "Update Status" : "Add Status"}
              </Button>
            </div>
          </form>

          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStatusModalOpen(false)}
              className="w-full text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail & Activity History Modal */}
      <Dialog open={!!viewingTask} onOpenChange={(open) => !open && setViewingTask(null)}>
        <DialogContent className="max-w-xl max-h-[88vh] overflow-y-auto bg-white border-slate-200 text-slate-900">
          {viewingTask && (() => {
            const timeline = getTaskTimeline(viewingTask);
            const pInfo = PRIORITY_CONFIG[viewingTask.priority] || PRIORITY_CONFIG.Medium;
            const sMatch = statuses.find((s) => s.name.toLowerCase() === viewingTask.status.toLowerCase());
            const sConfig = STATUS_COLORS[sMatch?.color || "blue"] || STATUS_COLORS.blue;
            return (
              <>
                <DialogHeader className="border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant="outline" className={`text-[11px] font-semibold ${pInfo.badge}`}>
                      {viewingTask.priority} Priority
                    </Badge>
                    <Badge variant="outline" className={`text-[11px] font-semibold ${sConfig.bg} ${sConfig.text} ${sConfig.border}`}>
                      {viewingTask.status}
                    </Badge>
                    {(viewingTask.task_type === "group" || (viewingTask.assignees && viewingTask.assignees.length > 1)) && (
                      <Badge variant="outline" className="text-[11px] bg-indigo-50 text-indigo-700 border-indigo-200">
                        <Users className="w-3 h-3 mr-1" /> Group Task
                      </Badge>
                    )}
                  </div>
                  <DialogTitle className="text-lg font-bold text-slate-900">
                    {viewingTask.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Assigned by {viewingTask.assigned_by_name || "Business HR"}
                    {viewingTask.due_date
                      ? ` • Due: ${format(parseISO(viewingTask.due_date), "dd MMM yyyy")}${viewingTask.due_time ? ` at ${viewingTask.due_time}` : ""}`
                      : ""}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  {viewingTask.description && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {viewingTask.description}
                    </div>
                  )}

                  <div className="text-xs space-y-1.5">
                    <span className="font-semibold text-slate-600 block">Assigned Employee(s):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {viewingTask.assignees && viewingTask.assignees.length > 0 ? (
                        viewingTask.assignees.map((a, idx) => (
                          <span key={a.id || idx} className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium text-[11px]">
                            {a.name}{a.designation ? ` (${a.designation})` : ""}
                          </span>
                        ))
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium text-[11px]">
                          {viewingTask.employee?.name || "Assigned Employee"}
                        </span>
                      )}
                    </div>
                  </div>

                  {(viewingTask as any).meeting_link && (
                    <div>
                      <a
                        href={(viewingTask as any).meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                      >
                        Join Scheduled Meeting
                      </a>
                    </div>
                  )}

                  {viewingTask.notes && (
                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950">
                      <span className="font-bold block mb-0.5">Employee Work Note:</span>
                      {viewingTask.notes}
                    </div>
                  )}

                  {/* Quick HR Status Update */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Update Status</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(statuses.length > 0 ? statuses.map((s) => s.name) : ["Pending", "Working on it", "On Hold", "Done"]).map((stName) => {
                        const active = viewingTask.status.toLowerCase() === stName.toLowerCase();
                        return (
                          <button
                            key={stName}
                            type="button"
                            onClick={() => handleQuickStatusChange(viewingTask.id, stName)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                              active
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            {stName}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Activity History Timeline */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                      <History className="w-3.5 h-3.5 text-indigo-600" />
                      Task Activity History ({timeline.length})
                    </div>
                    {timeline.length === 0 ? (
                      <p className="text-xs text-slate-400">No history events recorded yet.</p>
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
                </div>

                <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      const target = viewingTask;
                      setViewingTask(null);
                      handleOpenEditTask(target);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Task
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setViewingTask(null)} className="text-xs">
                    Close
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

    </div>
  );
}
