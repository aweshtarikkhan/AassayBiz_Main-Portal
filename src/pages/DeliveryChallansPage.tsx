import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Eye, Trash2, Edit, MessageSquare, Search, Truck, CheckCircle2, Clock, FileText, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { DeliveryChallanModal } from "@/components/delivery-challan/DeliveryChallanModal";

export default function DeliveryChallansPage() {
  const org = useAppStore((s) => s.organization);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Preview Modal state
  const [selectedChallan, setSelectedChallan] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => {
    if (!org?.id) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("delivery_challans")
      .select("*, clients(*), branches(*), delivery_challan_lines(*)")
      .eq("org_id", org.id)
      .order("challan_date", { ascending: false });

    if (error) {
      toast({ title: "Failed to load challans", description: error.message, variant: "destructive" });
    } else {
      setRows(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [org?.id]);

  const remove = async (id: string, challanNum: string) => {
    if (!confirm(`Are you sure you want to delete challan ${challanNum}?`)) return;
    await (supabase as any).from("delivery_challan_lines").delete().eq("dc_id", id);
    const { error } = await (supabase as any).from("delivery_challans").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Challan deleted successfully" });
      load();
    }
  };

  const openPreview = (challan: any) => {
    setSelectedChallan(challan);
    setModalOpen(true);
  };



  const formatLocation = (loc: any): string => {
    if (!loc) return "";
    if (typeof loc === "string") {
      try {
        const trimmed = loc.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === "object") {
            const parts = [parsed.street, parsed.city, parsed.state, parsed.zip || parsed.pincode, parsed.country].filter(Boolean);
            return parts.length > 0 ? parts.join(", ") : "";
          }
        }
      } catch (_) {}
      return loc;
    }
    if (typeof loc === "object") {
      const parts = [loc.street, loc.city, loc.state, loc.zip || loc.pincode, loc.country].filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : "";
    }
    return String(loc);
  };

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      const q = search.toLowerCase();
      const destStr = formatLocation(r.destination).toLowerCase();
      const matchQuery =
        !q ||
        r.challan_number?.toLowerCase().includes(q) ||
        r.clients?.display_name?.toLowerCase().includes(q) ||
        destStr.includes(q) ||
        r.vehicle_number?.toLowerCase().includes(q) ||
        r.transporter?.toLowerCase().includes(q) ||
        r.driver_name?.toLowerCase().includes(q) ||
        r.driver_phone?.includes(q) ||
        r.eway_bill_number?.toLowerCase().includes(q);

      return matchStatus && matchQuery;
    });
  }, [rows, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      dispatched: rows.filter((r) => r.status === "dispatched").length,
      delivered: rows.filter((r) => r.status === "delivered").length,
      draft: rows.filter((r) => r.status === "draft").length,
    };
  }, [rows]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "dispatched":
        return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200">Dispatched</Badge>;
      case "delivered":
        return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200">Delivered</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Delivery Challans</h1>
          <p className="text-xs text-muted-foreground">
            Official GST Rule 55 goods transportation challans & driver trip sheets
          </p>
        </div>
        <Button onClick={() => navigate("/delivery-challans/new")} className="gap-1.5 shadow-sm">
          <Plus className="h-4 w-4" /> New Delivery Challan
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3.5 border-border/70 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase">Total Challans</div>
            <div className="text-xl font-bold">{stats.total}</div>
          </div>
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <FileText className="h-4 w-4" />
          </div>
        </Card>
        <Card className="p-3.5 border-border/70 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase">In Transit / Dispatched</div>
            <div className="text-xl font-bold text-blue-600">{stats.dispatched}</div>
          </div>
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Truck className="h-4 w-4" />
          </div>
        </Card>
        <Card className="p-3.5 border-border/70 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase">Delivered</div>
            <div className="text-xl font-bold text-emerald-600">{stats.delivered}</div>
          </div>
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </Card>
        <Card className="p-3.5 border-border/70 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase">Drafts</div>
            <div className="text-xl font-bold text-slate-500">{stats.draft}</div>
          </div>
          <div className="h-8 w-8 rounded-lg bg-slate-500/10 text-slate-500 flex items-center justify-center">
            <Clock className="h-4 w-4" />
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="border-border/70">
        <CardHeader className="p-4 pb-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search Challan #, Client, Vehicle, Driver..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-36 text-xs h-9">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="dispatched">Dispatched</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading challans…</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="w-32">Challan #</TableHead>
                    <TableHead>Consignee / Client</TableHead>
                    <TableHead className="w-28">Date</TableHead>
                    <TableHead className="w-32">Vehicle #</TableHead>
                    <TableHead className="w-36">Driver</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="text-right w-44">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((r) => (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-muted/30 text-xs"
                      onClick={() => openPreview(r)}
                    >
                      <TableCell className="font-bold font-mono text-primary">
                        {typeof r.challan_number === 'string' ? r.challan_number : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {(typeof r.clients?.display_name === 'string' && r.clients.display_name) ||
                           (typeof r.clients?.name === 'string' && r.clients.name) ||
                           "—"}
                        </div>
                        {r.destination && formatLocation(r.destination) ? (
                          <div className="text-[11px] text-muted-foreground">{formatLocation(r.destination)}</div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {r.challan_date ? (() => {
                          try {
                            return format(new Date(r.challan_date), "dd MMM yyyy");
                          } catch {
                            return String(r.challan_date);
                          }
                        })() : "—"}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-semibold">
                          {typeof r.vehicle_number === 'string' ? r.vehicle_number : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {typeof r.driver_name === 'string' ? r.driver_name : "—"}
                        </div>
                        {typeof r.driver_phone === 'string' && r.driver_phone ? (
                          <div className="text-[10px] text-muted-foreground font-mono">{r.driver_phone}</div>
                        ) : null}
                      </TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="Preview & 1-Page PDF"
                            onClick={() => openPreview(r)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="Edit Challan"
                            onClick={() => navigate(`/delivery-challans/${r.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            title="Delete"
                            onClick={() => remove(r.id, r.challan_number)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filteredRows.length && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                        No delivery challans found matching your criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Official 1-Page Delivery Challan Modal */}
      {selectedChallan && (
        <DeliveryChallanModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          challan={{
            challan_number: selectedChallan.challan_number,
            challan_date: selectedChallan.challan_date,
            status: selectedChallan.status,
            vehicle_number: selectedChallan.vehicle_number,
            transporter: selectedChallan.transporter,
            driver_name: selectedChallan.driver_name,
            driver_phone: selectedChallan.driver_phone,
            eway_bill_number: selectedChallan.eway_bill_number,
            destination: formatLocation(selectedChallan.destination),
            notes: selectedChallan.notes,
          }}
          lines={(selectedChallan.delivery_challan_lines || []).map((l: any) => ({
            description: l.description,
            quantity: l.quantity,
            unit: l.unit,
            batch_no: l.batch_no,
            serial_no: l.serial_no,
          }))}
          org={org}
          client={selectedChallan.clients}
          branch={selectedChallan.branches}
          onEdit={() => {
            navigate(`/delivery-challans/${selectedChallan.id}/edit`);
          }}
        />
      )}
    </div>
  );
}
