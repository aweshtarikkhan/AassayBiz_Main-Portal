import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/app-store";
import { PageHeader } from "@/components/shared/PageHeader";
import { SEO } from "@/components/shared/SEO";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Package, Search, AlertTriangle, PackageX, PackagePlus, Sparkles, Database, Wrench, Pencil, Trash2, History, Infinity as InfinityIcon, Warehouse, Plus, ArrowLeftRight } from "lucide-react";
import { logStockMovements } from "@/lib/stock";
import { useAuth } from "@/lib/auth";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { ItemFormDialog } from "@/components/shared/ItemFormDialog";
import { CatalogNav } from "@/components/shared/CatalogNav";
import { AddWarehouseDialog } from "@/components/shared/AddWarehouseDialog";
import { TransferStockDialog } from "@/components/shared/TransferStockDialog";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function InventoryPage() {
  const org = useAppStore((s) => s.organization);
  const setOrganization = useAppStore((s) => s.setOrganization);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "products" | "services" | "low" | "transfers">("all");
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [target, setTarget] = useState<any>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [historyTarget, setHistoryTarget] = useState<any>(null);
  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [addWarehouseOpen, setAddWarehouseOpen] = useState(false);
  const [warehouseStock, setWarehouseStock] = useState<Record<string, Record<string, { qty: number, value: number }>>>({});
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const { user } = useAuth();
  const multiWarehouseEnabled = (org as any)?.multi_warehouse_enabled;

  const threshold = Number((org as any)?.low_stock_threshold ?? 5);

  const fetchItems = async () => {
    if (!org?.id) return;
    setLoading(true);
    const [itemsRes, whRes, movesRes, branchRes, trfRes] = await Promise.all([
      supabase.from("items").select("id, name, sku, unit, stock_quantity, unit_price, purchase_price, category, type, description, hsn_code").eq("org_id", org.id).order("type", { ascending: false }).order("name"),
      supabase.from("warehouses").select("id, name").eq("org_id", org.id),
      supabase.from("stock_movements").select("item_id, warehouse_id, change_qty").eq("org_id", org.id),
      supabase.from("branches").select("id, name, code, is_default").eq("org_id", org.id).eq("is_active", true),
      supabase.from("stock_transfers" as any).select("*, from_branch:from_branch_id(name), to_branch:to_branch_id(name), lines:stock_transfer_lines(quantity, item_id, items(name))").eq("org_id", org.id).order("created_at", { ascending: false }),
    ]);
    
    setItems(itemsRes.data || []);
    setWarehouses(whRes.data || []);
    setBranches(branchRes.data || []);
    setTransfers(trfRes.data || []);
    
    if (movesRes.data) {
       const wStock: Record<string, Record<string, { qty: number, value: number }>> = {};
       const pPriceMap: Record<string, number> = {};
       (itemsRes.data || []).forEach(it => pPriceMap[it.id] = Number(it.purchase_price || 0));
       
       movesRes.data.forEach(m => {
          const iid = m.item_id;
          const wid = m.warehouse_id;
          if (!wid || !iid) return;
          if (!wStock[iid]) wStock[iid] = {};
          if (!wStock[iid][wid]) wStock[iid][wid] = { qty: 0, value: 0 };
          
          wStock[iid][wid].qty += Number(m.change_qty || 0);
          wStock[iid][wid].value = wStock[iid][wid].qty * (pPriceMap[iid] || 0);
       });
       setWarehouseStock(wStock);
    }
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [org?.id]);

  const filtered = useMemo(() => {
    let arr = items.filter((i) => {
      const q = search.toLowerCase();
      const matchSearch = !q || [i.name, i.sku, i.category, i.hsn_code, i.type].filter(Boolean).some((f: string) => f?.toLowerCase().includes(q));
      const stock = Number(i.stock_quantity || 0);
      let matchTab = true;
      if (tab === "products") matchTab = i.type === "product";
      else if (tab === "services") matchTab = i.type === "service";
      else if (tab === "low") matchTab = i.type === "product" && stock <= threshold;
      return matchSearch && matchTab;
    });
    
    arr.sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (sortKey === "stock_quantity" || sortKey === "unit_price") {
         av = Number(av || 0);
         bv = Number(bv || 0);
      } else {
         av = (av || "").toString().toLowerCase();
         bv = (bv || "").toString().toLowerCase();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [items, search, tab, threshold, sortKey, sortDir]);

  const toggleSort = (k: string) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  const stats = useMemo(() => {
    const products = items.filter((i) => i.type === "product");
    const services = items.filter((i) => i.type === "service");
    const low = products.filter((i) => Number(i.stock_quantity || 0) <= threshold).length;
    const stockValue = products.reduce((s, i) => s + Number(i.stock_quantity || 0) * Number(i.unit_price || 0), 0);
    return { products: products.length, services: services.length, low, stockValue };
  }, [items, threshold]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

  const openAdjust = (item: any) => {
    setTarget(item);
    setAdjustQty(Number(item.stock_quantity || 0));
    setAdjustOpen(true);
  };

  const saveAdjust = async () => {
    if (!target) return;
    const next = Math.max(0, Number(adjustQty));
    const previous = Number(target.stock_quantity || 0);
    const { error } = await supabase.from("items").update({ stock_quantity: next }).eq("id", target.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (next !== previous && org?.id) {
      await logStockMovements([{
        orgId: org.id,
        itemId: target.id,
        changeQty: next - previous,
        balanceAfter: next,
        reason: "Manual adjustment",
        refType: "adjustment",
        createdBy: user?.id || null,
      }]);
    }
    toast({ title: "Stock updated", description: `${target.name} → ${next}` });
    setAdjustOpen(false);
    fetchItems();
  };

  const openHistory = async (item: any) => {
    setHistoryTarget(item);
    setHistoryRows([]);
    setHistoryLoading(true);
    const { data } = await (supabase as any)
      .from("stock_movements")
      .select("*")
      .eq("item_id", item.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setHistoryRows(data || []);
    setHistoryLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from("invoice_lines").update({ item_id: null }).eq("item_id", deleteTarget.id);
    await supabase.from("estimate_lines").update({ item_id: null }).eq("item_id", deleteTarget.id);
    await supabase.from("credit_note_lines").update({ item_id: null }).eq("item_id", deleteTarget.id);
    const { error } = await supabase.from("items").delete().eq("id", deleteTarget.id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Item deleted" });
    setDeleteTarget(null);
    fetchItems();
  };

  const toggleInventory = async (enabled: boolean) => {
    if (!org?.id) return;
    const { error } = await supabase.from("organizations").update({ inventory_enabled: enabled }).eq("id", org.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setOrganization({ ...(org as any), inventory_enabled: enabled });
    toast({ title: enabled ? "Inventory tracking enabled" : "Inventory tracking disabled" });
  };

  const inventoryEnabled = !!(org as any)?.inventory_enabled;

  // AI and Demo features removed

  if (!inventoryEnabled) {
    return (
      <div className="space-y-5">
        <SEO title="Inventory" description="Track stock levels across any unit (kg, ltr, pcs, box) with low-stock alerts and movement history." path="/inventory" />
        <PageHeader title="Inventory" description="Stock tracking is currently disabled" />
        <Card className="rounded-2xl border-border/60">
          <CardContent className="p-10 flex flex-col items-center text-center gap-4">
            <PackageX className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-lg">Inventory tracking is off</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Turn it on if you sell physical products (works with kg, ltr, pcs, box, or any unit). Service-only businesses can keep this disabled.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
              <Label htmlFor="inv-toggle" className="text-sm font-medium">Enable Inventory Tracking</Label>
              <Switch id="inv-toggle" checked={false} onCheckedChange={(v) => toggleInventory(v)} />
            </div>
            <Button variant="outline" onClick={() => navigate("/settings")}>Open Settings</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    { label: "PRODUCTS", value: stats.products, icon: Package, tone: "" },
    { label: "SERVICES", value: stats.services, icon: Wrench, tone: "" },
    { label: "LOW STOCK", value: stats.low, icon: AlertTriangle, tone: stats.low > 0 ? "text-orange-600" : "" },
    { label: "INVENTORY VALUE", value: fmt(stats.stockValue), icon: Package, tone: "" },
  ];

  return (
    <div className="space-y-5">
      <SEO title="Inventory" description="Track products and services with stock levels, low-stock alerts, and AI-powered restock guidance." path="/inventory" />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Inventory</h1>
            <CatalogNav active="inventory" />
          </div>
          <p className="text-sm text-muted-foreground mt-1">Products auto-deduct from stock when invoices are sent</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5">
            <Label htmlFor="inv-toggle" className="text-xs font-medium cursor-pointer">Tracking</Label>
            <Switch id="inv-toggle" checked={true} onCheckedChange={(v) => toggleInventory(v)} />
          </div>
          {multiWarehouseEnabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddWarehouseOpen(true)}
              title="Add Warehouse"
            >
              <Warehouse className="mr-1.5 h-4 w-4 text-muted-foreground" />
              + Warehouse
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTransferOpen(true)}
            title="Inter-Branch Stock Transfer"
          >
            <ArrowLeftRight className="mr-1.5 h-4 w-4 text-muted-foreground" />
            Transfer Stock
          </Button>
          <Button size="sm" onClick={() => { setEditTarget(null); setAddOpen(true); }}>
            <PackagePlus className="mr-1.5 h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="rounded-2xl border-border/60 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold tracking-wider text-muted-foreground">{s.label}</div>
                  <Icon className={`h-4 w-4 ${s.tone || "text-muted-foreground"}`} />
                </div>
                <div className={`text-2xl font-bold mt-2 ${s.tone}`}>{s.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="low">Low Stock</TabsTrigger>
            <TabsTrigger value="transfers">Branch Transfers</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or SKU..."
            className="pl-10 h-10 rounded-xl bg-card border-border/60 shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : tab === "transfers" ? (
            transfers.length === 0 ? (
              <EmptyState
                icon={ArrowLeftRight}
                title="No Branch Transfers Yet"
                description="Transfer stock between branches like Bhopal and Indore to keep branch inventories balanced."
                actionLabel="Transfer Stock"
                onAction={() => setTransferOpen(true)}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px] tracking-wider text-muted-foreground">TRANSFER #</TableHead>
                    <TableHead className="text-[11px] tracking-wider text-muted-foreground">DATE</TableHead>
                    <TableHead className="text-[11px] tracking-wider text-muted-foreground">FROM BRANCH</TableHead>
                    <TableHead className="text-[11px] tracking-wider text-muted-foreground">TO BRANCH</TableHead>
                    <TableHead className="text-[11px] tracking-wider text-muted-foreground">ITEMS & QTY</TableHead>
                    <TableHead className="text-[11px] tracking-wider text-muted-foreground">STATUS</TableHead>
                    <TableHead className="text-[11px] tracking-wider text-muted-foreground">NOTES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((trf) => (
                    <TableRow key={trf.id} className="hover:bg-muted/40">
                      <TableCell className="font-semibold text-primary">{trf.transfer_number}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{trf.transfer_date}</TableCell>
                      <TableCell className="font-medium">{trf.from_branch?.name || "—"}</TableCell>
                      <TableCell className="font-medium text-emerald-600">{trf.to_branch?.name || "—"}</TableCell>
                      <TableCell>
                        {trf.lines && trf.lines.length > 0 ? (
                          trf.lines.map((l: any, idx: number) => (
                            <span key={idx} className="inline-block bg-muted px-2 py-0.5 rounded text-xs font-medium mr-1.5">
                              {l.items?.name || "Product"}: {l.quantity}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">Stock units</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400">
                          {trf.status?.toUpperCase() || "COMPLETED"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {trf.notes || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Package}
              title={items.length === 0 ? "No items yet" : "No items match your filter"}
              description={items.length === 0 ? "Add an item or load demo data to get started." : "Try a different tab or search."}
              actionLabel={undefined}
              onAction={undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px] tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('name')}>ITEM</TableHead>
                  <TableHead className="text-[11px] tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('sku')}>SKU</TableHead>
                  <TableHead className="text-[11px] tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('type')}>TYPE</TableHead>
                  <TableHead className="text-[11px] tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('hsn_code')}>HSN CODE</TableHead>
                  <TableHead className="text-[11px] tracking-wider text-muted-foreground text-right cursor-pointer select-none" onClick={() => toggleSort('unit_price')}>PRICE</TableHead>
                  <TableHead className="text-[11px] tracking-wider text-muted-foreground text-right cursor-pointer select-none" onClick={() => toggleSort('stock_quantity')}>STOCK</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const isService = item.type === "service";
                  const stock = Number(item.stock_quantity || 0);
                  const isOut = !isService && stock <= 0;
                  const isLow = !isService && !isOut && stock <= threshold;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-semibold">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.sku || "—"}</TableCell>
                      <TableCell>
                        {isService ? (
                          <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border border-sky-200 uppercase text-[10px] tracking-wider">Service</Badge>
                        ) : (
                          <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 uppercase text-[10px] tracking-wider">Product</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                         {item.hsn_code ? <span className="text-sm">{item.hsn_code}</span> : 
                           <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-orange-500 hover:text-orange-600 hover:bg-orange-50" 
                             onClick={() => { setEditTarget(item); setAddOpen(true); }}>
                             <Plus className="h-3 w-3 mr-1"/> Missing
                           </Button>}
                      </TableCell>
                      <TableCell className="text-right font-medium">{fmt(Number(item.unit_price))}</TableCell>
                      <TableCell className="text-right">
                        {isService ? (
                          <InfinityIcon className="h-4 w-4 inline text-muted-foreground" />
                        ) : (
                          <div className="flex flex-col items-end">
                            <button
                              onClick={() => openAdjust(item)}
                              className={`inline-flex items-center gap-1 font-medium hover:underline ${isOut ? "text-destructive" : isLow ? "text-orange-600" : ""}`}
                            >
                              {(isOut || isLow) && <AlertTriangle className="h-3.5 w-3.5" />}
                              {stock} {item.unit || ""}
                            </button>
                            {warehouseStock[item.id] && Object.keys(warehouseStock[item.id]).length > 0 && (
                              <div className="mt-1 flex flex-col items-end border-t pt-1 w-full min-w-[150px]">
                                {Object.entries(warehouseStock[item.id]).filter(([_, d]) => d.qty !== 0).map(([wid, data]) => {
                                   const w = warehouses.find(wh => wh.id === wid);
                                   return (
                                     <div key={wid} className="flex justify-between items-center w-full text-xs text-muted-foreground">
                                       <span>{w?.name || "Unknown"}</span>
                                       <span className="font-medium ml-2">{data.qty} <span className="opacity-70 text-[10px] font-normal">({fmt(data.value)})</span></span>
                                     </div>
                                   );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {!isService && (
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openHistory(item)} title="Stock history">
                              <History className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => isService ? navigate("/items") : openAdjust(item)} title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(item)} title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Adjust stock dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
          </DialogHeader>
          {target && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="font-medium">{target.name}</div>
                <div className="text-sm text-muted-foreground">
                  Current: <span className="font-semibold">{Number(target.stock_quantity)} {target.unit || ""}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>New Stock Level</Label>
                <Input type="number" min={0} step="0.01" value={adjustQty} onChange={(e) => setAdjustQty(parseFloat(e.target.value) || 0)} autoFocus />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button onClick={saveAdjust}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              This will permanently delete the item. Any invoice or estimate lines using it will be unlinked.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ItemFormDialog
        open={addOpen}
        onOpenChange={(v) => { setAddOpen(v); if (!v) setEditTarget(null); }}
        editItem={editTarget}
        onItemSaved={(item) => {
          if (item) {
            setItems((prev: any[]) => [...prev.filter(i => i.id !== item.id), item]);
            fetchItems();
          }
        }}
      />

      {/* Stock movement history dialog */}
      <Dialog open={!!historyTarget} onOpenChange={(v) => { if (!v) setHistoryTarget(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Stock History</DialogTitle>
            {historyTarget && (
              <DialogDescription>
                {historyTarget.name} • Current stock: <span className="font-medium text-foreground">{Number(historyTarget.stock_quantity || 0)} {historyTarget.unit || ""}</span>
              </DialogDescription>
            )}
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {historyLoading ? (
              <div className="py-10 text-center text-muted-foreground text-sm">Loading...</div>
            ) : historyRows.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">No movements yet for this item.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px] tracking-wider text-muted-foreground">DATE</TableHead>
                    <TableHead className="text-[11px] tracking-wider text-muted-foreground">REASON</TableHead>
                    <TableHead className="text-[11px] tracking-wider text-muted-foreground">REF</TableHead>
                    <TableHead className="text-[11px] tracking-wider text-muted-foreground text-right">CHANGE</TableHead>
                    <TableHead className="text-[11px] tracking-wider text-muted-foreground text-right">BALANCE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyRows.map((m: any) => {
                    const change = Number(m.change_qty);
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</TableCell>
                        <TableCell className="text-sm">{m.reason}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.ref_number || "—"}</TableCell>
                        <TableCell className={`text-right text-sm font-medium ${change > 0 ? "text-emerald-600" : "text-destructive"}`}>
                          {change > 0 ? "+" : ""}{change}
                        </TableCell>
                        <TableCell className="text-right text-sm">{m.balance_after ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryTarget(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddWarehouseDialog
        open={addWarehouseOpen}
        onOpenChange={setAddWarehouseOpen}
        onWarehouseAdded={() => {
          toast({ title: "Warehouse added successfully" });
        }}
      />

      <TransferStockDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        branches={branches}
        items={items}
        onTransferSuccess={fetchItems}
      />
    </div>
  );
}
