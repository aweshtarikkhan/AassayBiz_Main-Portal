import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Calendar,
  Clock,
  Trash2,
  CheckCheck,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/store/app-store";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

export interface NotificationItem {
  id: string;
  source: "notification" | "leave" | "regularization";
  title: string;
  message: string;
  time: string;
  route: string;
  read?: boolean;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const org = useAppStore((s) => s.organization);
  const { user } = useAuth();

  const getDismissedIds = useCallback((): Set<string> => {
    try {
      const stored = localStorage.getItem("dismissed_notif_ids");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  }, []);

  const addDismissedId = useCallback((id: string) => {
    try {
      const ids = getDismissedIds();
      ids.add(id);
      localStorage.setItem("dismissed_notif_ids", JSON.stringify(Array.from(ids)));
    } catch (e) {
      console.error("Failed to save dismissed notification id:", e);
    }
  }, [getDismissedIds]);

  const loadNotifications = useCallback(async () => {
    if (!org?.id) return;
    setLoading(true);
    const dismissed = getDismissedIds();

    try {
      const [leavesRes, regRes, notifsRes] = await Promise.allSettled([
        // 1. Pending Leaves (Leave ka msg)
        supabase
          .from("leaves")
          .select("id, start_date, end_date, reason, created_at, employees(name)")
          .eq("org_id", org.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(10),

        // 2. Pending Attendance Regularizations (Attendance regularisation ka msg)
        supabase
          .from("attendance_regularizations")
          .select("id, date, reason, created_at, employees(name)")
          .eq("org_id", org.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(10),

        // 4. Notifications Table
        supabase
          .from("notifications")
          .select("id, title, message, type, is_read, created_at")
          .eq("org_id", org.id)
          .order("created_at", { ascending: false })
          .limit(15),
      ]);

      const items: NotificationItem[] = [];

      // Process Leaves
      if (leavesRes.status === "fulfilled" && leavesRes.value.data) {
        for (const l of leavesRes.value.data) {
          if (!dismissed.has(`leave-${l.id}`)) {
            const empName = (l.employees as any)?.name || "Employee";
            items.push({
              id: `leave-${l.id}`,
              source: "leave",
              title: "Leave Application Request",
              message: `${empName} applied for leave (${l.start_date || "N/A"}${l.end_date ? ` to ${l.end_date}` : ""}). Reason: ${l.reason || "Not specified"}`,
              time: l.created_at || new Date().toISOString(),
              route: "/leaves",
            });
          }
        }
      }

      // Process Regularizations
      if (regRes.status === "fulfilled" && regRes.value.data) {
        for (const r of regRes.value.data) {
          if (!dismissed.has(`reg-${r.id}`)) {
            const empName = (r.employees as any)?.name || "Employee";
            items.push({
              id: `reg-${r.id}`,
              source: "regularization",
              title: "Attendance Regularization",
              message: `${empName} requested regularization for ${r.date}. Reason: ${r.reason || "Not specified"}`,
              time: r.created_at || new Date().toISOString(),
              route: "/attendance?tab=regularizations",
            });
          }
        }
      }

      // Process Notifications table
      if (notifsRes.status === "fulfilled" && notifsRes.value.data) {
        for (const n of notifsRes.value.data) {
          if (!n.is_read && !dismissed.has(`notif-${n.id}`)) {
            let route = "/dashboard";
            if (n.type?.includes("leave")) route = "/leaves";
            else if (n.type?.includes("attendance")) route = "/attendance";
            else if (n.type?.includes("invoice")) route = "/invoices";

            items.push({
              id: `notif-${n.id}`,
              source: "notification",
              title: n.title || "Notification",
              message: n.message || "",
              time: n.created_at || new Date().toISOString(),
              route,
            });
          }
        }
      }

      // Sort by newest first
      items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setNotifications(items);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [org?.id, getDismissedIds]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000);

    const channel = supabase
      .channel(`notification-bell-${org?.id || "default"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_regularizations" }, () => {
        loadNotifications();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "leaves" }, () => {
        loadNotifications();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        loadNotifications();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [loadNotifications, org?.id]);

  // Click & Auto-Delete logic (Case 35: open krte hi us cheez ko auto delete ho jaye)
  const handleOpenAndDismiss = async (item: NotificationItem) => {
    // 1. Immediately delete from local state
    setNotifications((prev) => prev.filter((n) => n.id !== item.id));
    addDismissedId(item.id);

    // 2. Perform backend deletion / mark read
    try {
      if (item.source === "notification") {
        const rawId = item.id.replace("notif-", "");
        await supabase.from("notifications").delete().eq("id", rawId);
      }
    } catch (e) {
      console.error("Failed to auto-delete notification from backend:", e);
    }

    // 3. Close popover and navigate to target feature
    setOpen(false);
    navigate(item.route);
  };

  const handleClearAll = async () => {
    for (const item of notifications) {
      addDismissedId(item.id);
    }
    setNotifications([]);

    try {
      if (org?.id) {
        await Promise.allSettled([
          supabase.from("notifications").delete().eq("org_id", org.id),
        ]);
      }
    } catch (e) {
      console.error("Failed to clear notifications in DB:", e);
    }
  };

  const getSourceIcon = (source: NotificationItem["source"]) => {
    switch (source) {
      case "leave":
        return <Calendar className="h-4 w-4 text-emerald-500" />;
      case "regularization":
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <Bell className="h-4 w-4 text-purple-500" />;
    }
  };

  const getSourceBadge = (source: NotificationItem["source"]) => {
    switch (source) {
      case "leave":
        return <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 bg-emerald-50/50">Leave</Badge>;
      case "regularization":
        return <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50/50">Attendance</Badge>;
      case "chat":
        return <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200 bg-blue-50/50">Chat</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-200 bg-purple-50/50">System</Badge>;
    }
  };

  const unreadCount = notifications.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full h-9 w-9 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white shadow-sm ring-2 ring-background animate-in zoom-in-50">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 sm:w-96 p-0 shadow-lg border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm">Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs h-5 px-1.5 font-bold">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-7 text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Clear All
            </Button>
          )}
        </div>

        {/* Notification list */}
        <ScrollArea className="max-h-80 overflow-y-auto divide-y divide-border">
          {unreadCount === 0 ? (
            <div className="py-8 text-center text-muted-foreground space-y-2">
              <CheckCheck className="h-8 w-8 mx-auto text-emerald-500 opacity-70" />
              <p className="text-xs font-medium">All caught up! No pending notifications.</p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleOpenAndDismiss(item)}
                className="p-3.5 hover:bg-muted/50 cursor-pointer transition-colors space-y-1.5 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getSourceIcon(item.source)}
                    <span className="font-medium text-xs text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </span>
                  </div>
                  {getSourceBadge(item.source)}
                </div>

                <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
                  {item.message}
                </p>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted-foreground">
                    {(() => {
                      try {
                        return formatDistanceToNow(new Date(item.time), { addSuffix: true });
                      } catch {
                        return "recently";
                      }
                    })()}
                  </span>
                  <span className="text-[10px] text-primary flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open & Clear <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                  </span>
                </div>
              </div>
            ))
          )}
        </ScrollArea>

        {/* Footer info note */}
        <div className="px-4 py-2 border-t bg-muted/20 text-center">
          <p className="text-[10px] text-muted-foreground">
            💡 Clicking any notification opens the page and automatically clears it.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
