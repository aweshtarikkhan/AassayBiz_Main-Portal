import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatSequenceNumber } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useAuth } from "@/lib/auth";
import { getOrgCategory } from "@/lib/business-category";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Printer, Eye, MessageSquare, Download, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { AddClientDialog } from "@/components/shared/AddClientDialog";
import { DeliveryChallanModal } from "@/components/delivery-challan/DeliveryChallanModal";

interface Line {
  item_id: string;
  description: string;
  quantity: string;
  unit: string;
  batch_no: string;
  serial_no: string;
  expiry_warning?: string;
}
const emptyLine = (): Line => ({ item_id: "", description: "", quantity: 1, unit: "", batch_no: "", serial_no: "" });

export default function DeliveryChallanBuilderPage() {
  const org = useAppStore((s) => s.organization);
  const isRetail = getOrgCategory(org) === "retail";
  const { user } = useAuth();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const queryClientId = searchParams.get("client_id");

  const navigate = useNavigate();
  const { toast } = useToast();
  const [clients, setClients] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [clientId, setClientId] = useState(queryClientId || "");
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [status, setStatus] = useState("dispatched");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [transporter, setTransporter] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [ewayBill, setEwayBill] = useState("");
  const [destination, setDestination] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const formatAddress = (addr: any): string => {
    if (!addr) return "";
    if (typeof addr === "string") {
      try {
        const trimmed = addr.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === "object") {
            const parts = [parsed.street, parsed.city, parsed.state, parsed.zip || parsed.pincode, parsed.country].filter(Boolean);
            return parts.length > 0 ? parts.join(", ") : "";
          }
        }
      } catch (_) {}
      return addr;
    }
    if (typeof addr === "object") {
      const parts = [addr.street, addr.city, addr.state, addr.zip || addr.pincode, addr.country].filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : "";
    }
    return String(addr);
  };

  useEffect(() => {
    if (!org?.id) return;
    (async () => {
      const [c, it, br, o] = await Promise.all([
        supabase.from("clients").select("*").eq("org_id", org.id).neq("status", "inactive").order("display_name"),
        supabase.from("items").select("id, name, unit, sku, hsn_code, track_batches, track_serials").eq("org_id", org.id).order("name"),
        (supabase as any).from("branches").select("id, name, is_default").eq("org_id", org.id),
        supabase.from("organizations").select("dc_next_number, dc_prefix").eq("id", org.id).maybeSingle(),
      ]);
      setClients(c.data || []);
      setItems(it.data || []);
      setBranches(br.data || []);

      if (!id) {
        const prefix = o.data?.dc_prefix || "DC-";
        const next = o.data?.dc_next_number || 1;
        setNumber(formatSequenceNumber(prefix, next, "DC"));
        // Default branch if exists
        const defBr = br.data?.find((b: any) => b.is_default);
        if (defBr) setBranchId(defBr.id);
        else if (br.data && br.data.length > 0) setBranchId(br.data[0].id);
        else if (isRetail) setBranchId("default");
        else setBranchId("");
      } else {
        const { data: d } = await (supabase as any).from("delivery_challans").select("*").eq("id", id).maybeSingle();
        const { data: l } = await (supabase as any).from("delivery_challan_lines").select("*").eq("dc_id", id).order("sort_order");
        if (d) {
          setClientId(d.client_id || ""); setBranchId(d.branch_id || "");
          setNumber(d.challan_number); setDate(d.challan_date); setStatus(d.status);
          setVehicleNumber(d.vehicle_number || ""); setTransporter(d.transporter || "");
          setDriverName(d.driver_name || ""); setDriverPhone(d.driver_phone || "");
          setEwayBill(d.eway_bill_number || "");
          setDestination(formatAddress(d.destination));
          setNotes(d.notes || "");
        }
        if (l) setLines(l.map((x: any) => ({
          item_id: x.item_id || "", description: x.description, quantity: String(x.quantity),
          unit: x.unit || "", batch_no: x.batch_no || "", serial_no: x.serial_no || "",
        })));
      }
    })();
  }, [org?.id, id]);

  const pickItem = (i: number, itemId: string) => {
    const it = items.find(x => x.id === itemId);
    const x = [...lines]; x[i].item_id = itemId;
    if (it) { x[i].description = it.name; x[i].unit = it.unit || ""; }
    setLines(x);
  };

  const save = async () => {
    if (!org?.id || !clientId) { toast({ title: "Client required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload: any = {
        org_id: org.id, client_id: clientId, branch_id: (branchId && branchId !== "default") ? branchId : null,
        challan_number: number, challan_date: date, status,
        vehicle_number: vehicleNumber || null, transporter: transporter || null,
        driver_name: driverName || null, driver_phone: driverPhone || null,
        eway_bill_number: ewayBill || null, destination: formatAddress(destination) || null,
        notes: notes || null, created_by: user?.id || null,
      };
      let dcId = id;
      if (id) {
        const { error } = await (supabase as any).from("delivery_challans").update(payload).eq("id", id);
        if (error) throw error;
        await (supabase as any).from("delivery_challan_lines").delete().eq("dc_id", id);
      } else {
        const { data, error } = await (supabase as any).from("delivery_challans").insert(payload).select().single();
        if (error) throw error;
        dcId = data.id;
        const { data: o } = await (supabase as any).from("organizations").select("dc_next_number").eq("id", org.id).maybeSingle();
        await (supabase as any).from("organizations").update({ dc_next_number: (o?.dc_next_number || 1) + 1 }).eq("id", org.id);
      }
      const payloads = lines.filter(l => l.description).map((l, idx) => ({
        org_id: org.id, dc_id: dcId, item_id: l.item_id || null,
        description: l.description, quantity: Number(l.quantity) || 0, unit: l.unit || null,
        batch_no: l.batch_no || null, serial_no: l.serial_no || null, sort_order: idx,
      }));
      const { error: lErr } = await (supabase as any).from("delivery_challan_lines").insert(payloads);
      if (lErr) throw lErr;
      toast({ title: id ? "Challan updated successfully" : "Challan created successfully" });
      navigate("/delivery-challans");
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const selectedClient = clients.find((c) => c.id === clientId);
  const selectedBranch = branches.find((b) => b.id === branchId);

  const currentChallanData = {
    challan_number: number || "DC-0001",
    challan_date: date,
    status,
    vehicle_number: vehicleNumber,
    transporter,
    driver_name: driverName,
    driver_phone: driverPhone,
    eway_bill_number: ewayBill,
    destination: formatAddress(destination),
    notes,
  };

  const currentLinesData = lines
    .filter((l) => l.description.trim())
    .map((l) => ({
      description: l.description,
      quantity: Number(l.quantity) || 1,
      unit: l.unit,
      batch_no: l.batch_no,
      serial_no: l.serial_no,
    }));

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-10">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border/70 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => navigate("/delivery-challans")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {id ? `Edit Challan: ${number}` : "New Delivery Challan"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Official transportation document under Rule 55 of CGST Rules
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview & PDF
          </Button>

          <Button
            size="sm"
            onClick={save}
            disabled={saving}
            className="gap-1.5 text-xs"
          >
            {saving ? "Saving..." : "Save Challan"}
          </Button>
        </div>
      </div>

      {/* Main Details Card */}
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Dispatch & Consignee Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Consignee / Client *</Label>
            <div className="flex gap-2">
              <Select 
                value={clientId || undefined} 
                onValueChange={(val) => {
                  setClientId(val);
                  const c = clients.find(x => x.id === val);
                  if (c && !destination) {
                    setDestination(formatAddress(c.shipping_address || c.billing_address));
                  }
                }}
              >
                <SelectTrigger className="flex-1 text-xs h-9">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent className="z-50 max-h-60">
                  {clients.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No clients found. Click + to add
                    </SelectItem>
                  ) : (
                    clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.display_name} {c.tax_number ? `(${c.tax_number})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setAddClientOpen(true)}
                title="Add New Client"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <AddClientDialog
              open={addClientOpen}
              onOpenChange={setAddClientOpen}
              onClientAdded={(c) => {
                setClients((prev) => [...prev, c]);
                setClientId(c.id);
                if (c && !destination) {
                  setDestination(formatAddress(c.shipping_address || c.billing_address));
                }
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Dispatch Branch / From</Label>
            <Select 
              value={branchId || (isRetail ? "default" : undefined)} 
              onValueChange={(val) => setBranchId(val === "none" ? "" : val)}
            >
              <SelectTrigger className="text-xs h-9 w-full">
                <SelectValue placeholder={isRetail ? "Main Store / Location" : (branches.length === 0 ? "No branches found" : "Select Branch")} />
              </SelectTrigger>
              <SelectContent className="z-50 max-h-60">
                {isRetail && (
                  <SelectItem value="default">Main Store / Location</SelectItem>
                )}
                {branches.length === 0 && !isRetail ? (
                  <SelectItem value="none" disabled>
                    No branches configured
                  </SelectItem>
                ) : (
                  branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} {b.is_default ? "(Primary)" : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">Manage branches in Settings</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Challan Number *</Label>
            <Input
              className="text-xs h-9 font-mono"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Challan Date</Label>
            <Input
              type="date"
              className="text-xs h-9"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Vehicle Number</Label>
            <Input
              className="text-xs h-9 font-mono uppercase"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              placeholder="e.g. MH-12-AB-1234"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Transporter Name</Label>
            <Input
              className="text-xs h-9"
              value={transporter}
              onChange={(e) => setTransporter(e.target.value)}
              placeholder="e.g. VRL Logistics, Self"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Driver Name</Label>
            <Input
              className="text-xs h-9"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Driver Phone</Label>
            <Input
              className="text-xs h-9 font-mono"
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value)}
              placeholder="e.g. 9876543210"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">E-Way Bill Number</Label>
            <Input
              className="text-xs h-9 font-mono"
              value={ewayBill}
              onChange={(e) => setEwayBill(e.target.value)}
              placeholder="e.g. 1214 5678 9012"
            />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-xs font-semibold">Destination / Delivery Location</Label>
            <Input
              className="text-xs h-9"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Factory Site, Pune / Mumbai"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Challan Status</Label>
            <Select value={status || "dispatched"} onValueChange={setStatus}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="dispatched">Dispatched</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Items Section */}
      <Card className="border-border/70">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
          <div>
            <CardTitle className="text-base font-semibold">Goods / Items Dispatched</CardTitle>
            <p className="text-xs text-muted-foreground">Particulars of items sent with this transport copy</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 text-xs"
            onClick={() => setLines([...lines, emptyLine()])}
          >
            <Plus className="h-3.5 w-3.5" /> Add Line
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-52 text-xs">Item Catalog</TableHead>
                <TableHead className="text-xs">Description of Goods</TableHead>
                <TableHead className="w-24 text-xs">Quantity</TableHead>
                <TableHead className="w-24 text-xs">Unit</TableHead>
                <TableHead className="w-32 text-xs">Batch No</TableHead>
                <TableHead className="w-32 text-xs">Serial No</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l, i) => {
                const it = items.find((x) => x.id === l.item_id);
                return (
                  <TableRow key={i} className="hover:bg-muted/20">
                    <TableCell className="p-2">
                      <Select value={l.item_id || undefined} onValueChange={(v) => pickItem(i, v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent className="z-50 max-h-60">
                          {items.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No items in catalog
                            </SelectItem>
                          ) : (
                            items.map((x) => (
                              <SelectItem key={x.id} value={x.id}>
                                {x.name} {x.sku ? `(${x.sku})` : ""}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        className="h-8 text-xs"
                        value={l.description}
                        onChange={(e) => {
                          const x = [...lines];
                          x[i].description = e.target.value;
                          setLines(x);
                        }}
                        placeholder="Item name / specifications"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        type="number"
                        min={0}
                        className="h-8 text-xs font-mono font-semibold"
                        value={l.quantity}
                        onKeyDown={(e) => { if (e.key === "-" || e.key === "e") e.preventDefault(); }}
                        onChange={(e) => {
                          const x = [...lines];
                          x[i].quantity = e.target.value === "" ? "" : String(Math.max(0, parseFloat(e.target.value) || 0));
                          setLines(x);
                        }}
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        className="h-8 text-xs"
                        value={l.unit}
                        onChange={(e) => {
                          const x = [...lines];
                          x[i].unit = e.target.value;
                          setLines(x);
                        }}
                        placeholder="pcs / kg / box"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        className="h-8 text-xs font-mono"
                        value={l.batch_no}
                        onChange={(e) => {
                          const x = [...lines];
                          x[i].batch_no = e.target.value;
                          setLines(x);
                        }}
                        placeholder="Batch #"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        className="h-8 text-xs font-mono"
                        value={l.serial_no}
                        onChange={(e) => {
                          const x = [...lines];
                          x[i].serial_no = e.target.value;
                          setLines(x);
                        }}
                        placeholder="Serial #"
                      />
                    </TableCell>
                    <TableCell className="p-2 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setLines(lines.filter((_, j) => j !== i))}
                        disabled={lines.length === 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Remarks / Notes */}
      <Card className="border-border/70">
        <CardContent className="p-4 space-y-1.5">
          <Label className="text-xs font-semibold">Special Instructions / Remarks</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="text-xs"
            placeholder="e.g. Handle with care, Material for job work / installation site."
          />
        </CardContent>
      </Card>

      {/* Official 1-Page Delivery Challan Modal */}
      <DeliveryChallanModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        challan={currentChallanData}
        lines={currentLinesData}
        org={org}
        client={selectedClient}
        branch={selectedBranch}
      />
    </div>
  );
}


