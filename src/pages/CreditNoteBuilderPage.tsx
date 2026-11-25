import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatSequenceNumber } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { INDIAN_GST_SLABS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Send, Info, ArrowLeft } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { AddClientDialog } from "@/components/shared/AddClientDialog";
import { ItemFormDialog } from "@/components/shared/ItemFormDialog";
import { logStockMovements } from "@/lib/stock";
import { useAuth } from "@/lib/auth";

interface LineItem {
  id: string;
  item_id: string | null;
  name: string;
  description: string;
  quantity: any;
  rate: any;
  discount: any;
  discount_type: "percentage" | "fixed";
  tax_id: string | null;
  tax_amount: number;
  amount: number;
  expiry_warning?: string;
}

function createEmptyLine(): LineItem {
  return {
    id: crypto.randomUUID(), item_id: null, name: "", description: "",
    quantity: 1, rate: "", discount: "", discount_type: "percentage",
    tax_id: null, tax_amount: 0, amount: 0,
  };
}

export default function CreditNoteBuilderPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const queryInvoiceId = searchParams.get("invoice_id");
  const queryClientId = searchParams.get("client_id");

  const navigate = useNavigate();
  const org = useAppStore((s) => s.organization);
  const { user } = useAuth();
  const { toast } = useToast();
  const isEdit = !!id;

  const [clients, setClients] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [taxRates, setTaxRates] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  const [clientId, setClientId] = useState("");
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState("");
  const [creditNoteNumber, setCreditNoteNumber] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [lines, setLines] = useState<LineItem[]>([createEmptyLine()]);
  const [restockInventory, setRestockInventory] = useState(false);
  const [prevRestock, setPrevRestock] = useState(false);

  const calculateLine = useCallback((line: LineItem, currentTaxRates = taxRates): LineItem => {
    let lineTotal = (line.quantity || 0) * (line.rate || 0);
    if (line.discount > 0) {
      lineTotal -= line.discount_type === "percentage" ? lineTotal * (line.discount / 100) : line.discount;
    }
    let taxAmt = 0;
    if (line.tax_id) {
      const slab = INDIAN_GST_SLABS.find((s) => s.id === line.tax_id);
      const tax = (currentTaxRates.length ? currentTaxRates : taxRates).find((t) => t.id === line.tax_id);
      const rate = slab ? slab.rate : (tax ? Number(tax.rate) : 0);
      taxAmt = lineTotal * (rate / 100);
    }
    return { ...line, tax_amount: taxAmt, amount: lineTotal + taxAmt };
  }, [taxRates]);

  const loadInvoiceLines = async (targetInvoiceId: string, currentTaxRates = taxRates) => {
    if (!targetInvoiceId) return;
    const { data: invLines, error } = await supabase
      .from("invoice_lines")
      .select("*")
      .eq("invoice_id", targetInvoiceId)
      .order("sort_order");

    if (error) {
      console.error("Error loading invoice lines:", error);
      return;
    }

    if (invLines && invLines.length > 0) {
      const mappedLines: LineItem[] = invLines.map((l: any) =>
        calculateLine({
          id: crypto.randomUUID(),
          item_id: l.item_id || null,
          name: l.name || "",
          description: l.description || "",
          quantity: Number(l.quantity) || 1,
          rate: Number(l.rate) || 0,
          discount: Number(l.discount) || 0,
          discount_type: l.discount_type || "percentage",
          tax_id: l.tax_id || null,
          tax_amount: Number(l.tax_amount) || 0,
          amount: Number(l.amount) || 0,
        }, currentTaxRates)
      );
      setLines(mappedLines);
      toast({
        title: "Invoice items loaded",
        description: `Loaded ${mappedLines.length} item(s) from invoice. You can remove items not being returned or adjust quantities.`,
      });
    }
  };

  useEffect(() => {
    if (!org?.id) return;
    const load = async () => {
      const [c, i, t, inv] = await Promise.all([
        supabase.from("clients").select("id, display_name").eq("org_id", org.id).eq("status", "active"),
        supabase.from("items").select("*").eq("org_id", org.id).eq("is_active", true),
        supabase.from("tax_rates").select("*").eq("org_id", org.id),
        supabase.from("invoices").select("id, invoice_number, client_id, status").eq("org_id", org.id).neq("status", "void").order("created_at", { ascending: false }),
      ]);
      setClients(c.data || []);
      setItems(i.data || []);
      setTaxRates(t.data || []);
      setInvoices(inv.data || []);

      if (!isEdit) {
        const prefix = org.credit_note_prefix || "CN";
        const num = org.credit_note_next_number || 1;
        setCreditNoteNumber(formatSequenceNumber(prefix, num, "CN"));
        setNotes(org.default_notes || "");
        setTerms(org.default_terms || "");

        if (queryClientId) {
          setClientId(queryClientId);
        }

        if (queryInvoiceId) {
          setInvoiceId(queryInvoiceId);
          const foundInv = inv.data?.find((x) => x.id === queryInvoiceId);
          if (foundInv?.client_id) {
            setClientId(foundInv.client_id);
          }
          await loadInvoiceLines(queryInvoiceId, t.data || []);
        }
      }
    };
    load();
  }, [org?.id]);

  useEffect(() => {
    if (!isEdit || !id) return;
    const loadCN = async () => {
      const { data: cn } = await supabase.from("credit_notes").select("*").eq("id", id).single();
      if (cn) {
        setClientId(cn.client_id);
        setInvoiceId(cn.invoice_id || "");
        setCreditNoteNumber(cn.credit_note_number);
        setIssueDate(cn.issue_date);
        setNotes(cn.notes || "");
        setTerms(cn.terms_conditions || "");
        setRestockInventory(!!(cn as any).restock_inventory);
        setPrevRestock(!!(cn as any).restock_inventory);
      }
      const { data: lineData } = await supabase.from("credit_note_lines").select("*").eq("credit_note_id", id).order("sort_order");
      if (lineData?.length) {
        setLines(lineData.map((l: any) => ({
          id: l.id, item_id: l.item_id, name: l.name, description: l.description || "",
          quantity: Number(l.quantity), rate: Number(l.rate), discount: Number(l.discount),
          discount_type: l.discount_type, tax_id: l.tax_id, tax_amount: Number(l.tax_amount),
          amount: Number(l.amount),
        })));
      }
    };
    loadCN();
  }, [id, isEdit]);

  const handleLineChange = (index: number, field: string, value: any) => {
    setLines((prev) => {
      const updated = [...prev];
      if (field === "item_id" && value) {
        const item = items.find((i) => i.id === value);
        if (item) {
          let __rate = Number(item.unit_price) || 0;
          const __priceType = item.sales_price_type || "without_tax";
          if (__priceType === "with_tax" && item.tax_id) {
            const __tax = taxRates.find((t: any) => t.id === item.tax_id);
            if (__tax && Number(__tax.rate) > 0) {
              __rate = Number((__rate / (1 + Number(__tax.rate) / 100)).toFixed(2));
            }
          }
          updated[index] = calculateLine({
            ...updated[index], item_id: value, name: item.name,
            description: item.description || "", rate: __rate,
            tax_id: item.tax_id,
          });
          return updated;
        }
      }
      updated[index] = calculateLine({ ...updated[index], [field]: value });
      return updated;
    });
  };

  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    if (invoiceId) {
      const inv = invoices.find((i) => i.id === invoiceId);
      if (inv && inv.client_id !== newClientId) {
        setInvoiceId("");
      }
    }
  };

  const handleInvoiceChange = async (selectedId: string) => {
    const invId = selectedId === "none" ? "" : selectedId;
    setInvoiceId(invId);
    if (!invId) return;

    const targetInv = invoices.find((i) => i.id === invId);
    if (targetInv?.client_id && targetInv.client_id !== clientId) {
      setClientId(targetInv.client_id);
    }

    await loadInvoiceLines(invId);
  };

  const subtotal = lines.reduce((s, l) => s + (l.quantity || 0) * (l.rate || 0), 0);
  const totalDiscount = lines.reduce((s, l) => {
    const lt = (l.quantity || 0) * (l.rate || 0);
    return s + (l.discount_type === "percentage" ? lt * ((l.discount || 0) / 100) : (l.discount || 0));
  }, 0);
  const totalTax = lines.reduce((s, l) => s + (l.tax_amount || 0), 0);
  const total = subtotal - totalDiscount + totalTax;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

  const handleSave = async (status: "draft" | "sent" = "draft") => {
    if (!clientId || lines.every((l) => !l.name.trim())) {
      toast({ title: "Please select a client and add items", variant: "destructive" });
      return;
    }
    const cnData = {
      org_id: org!.id, client_id: clientId, invoice_id: invoiceId || null,
      credit_note_number: creditNoteNumber, status, issue_date: issueDate,
      currency_code: org!.currency_code || "INR",
      exchange_rate: 1,
      discount: 0,
      discount_type: "percentage" as const,
      subtotal, total_tax: totalTax,
      total_discount: totalDiscount, total, notes: notes || null,
      terms_conditions: terms || null,
      restock_inventory: restockInventory,
    } as any;

    // Capture previous lines for stock adjustment on edit
    let prevLines: any[] = [];
    if (isEdit && id) {
      const { data: existing } = await supabase.from("credit_note_lines").select("item_id, quantity").eq("credit_note_id", id);
      prevLines = existing || [];
    }

    let cnId = id;
    if (isEdit) {
      const { error: updateErr } = await supabase.from("credit_notes").update(cnData).eq("id", id!);
      if (updateErr) {
        toast({ title: "Error updating credit note", description: updateErr.message, variant: "destructive" });
        return;
      }
      await supabase.from("credit_note_lines").delete().eq("credit_note_id", id!);
    } else {
      const { data, error: insertErr } = await supabase.from("credit_notes").insert(cnData).select().single();
      if (insertErr || !data) {
        toast({ title: "Error saving credit note", description: insertErr?.message || "Unknown error", variant: "destructive" });
        return;
      }
      cnId = data?.id;
      await supabase.from("organizations").update({
        credit_note_next_number: (org!.credit_note_next_number || 1) + 1,
      }).eq("id", org!.id);
    }

    const validLines = lines.filter((l) => l.name.trim());
    if (cnId) {
      const lineInserts = validLines.map((l, i) => ({
        credit_note_id: cnId!, item_id: l.item_id || null, name: l.name,
        description: l.description || null, quantity: Number(l.quantity) || 1, rate: Number(l.rate) || 0,
        discount: Number(l.discount) || 0, discount_type: l.discount_type || "percentage", tax_id: l.tax_id || null,
        tax_amount: l.tax_amount, amount: l.amount, sort_order: i,
      }));
      const { error: linesErr } = await supabase.from("credit_note_lines").insert(lineInserts);
      if (linesErr) {
        toast({ title: "Warning: Items may not have saved", description: linesErr.message, variant: "destructive" });
      }
    }

    // Inventory restock: undo prev restock and apply new restock
    if (prevRestock || restockInventory) {
      const delta: Record<string, number> = {};
      if (prevRestock) {
        for (const pl of prevLines) {
          if (pl.item_id) delta[pl.item_id] = (delta[pl.item_id] || 0) - Number(pl.quantity || 0);
        }
      }
      if (restockInventory) {
        for (const ln of validLines) {
          if (ln.item_id) delta[ln.item_id] = (delta[ln.item_id] || 0) + Number(ln.quantity || 0);
        }
      }
      const itemIds = Object.keys(delta).filter((k) => delta[k] !== 0);
      if (itemIds.length) {
        const { data: itemsForStock } = await supabase.from("items").select("id, type, stock_quantity").in("id", itemIds);
        const movements: Parameters<typeof logStockMovements>[0] = [];
        for (const it of itemsForStock || []) {
          if (it.type !== "product") continue;
          const newQty = Math.max(0, Number(it.stock_quantity || 0) + delta[it.id]);
          await supabase.from("items").update({ stock_quantity: newQty }).eq("id", it.id);
          movements.push({
            orgId: org!.id,
            itemId: it.id,
            changeQty: delta[it.id],
            balanceAfter: newQty,
            reason: isEdit ? "Credit note updated" : "Credit note restock",
            refType: "credit_note",
            refId: cnId!,
            refNumber: creditNoteNumber,
            createdBy: user?.id || null,
          });
        }
        await logStockMovements(movements);
      }
      setPrevRestock(restockInventory);
    }

    toast({ title: status === "sent" ? "Credit note sent!" : "Credit note saved!" });
    navigate("/credit-notes");
  };

  const filteredInvoices = clientId ? invoices.filter((inv) => inv.client_id === clientId) : invoices;
  const selectedInvoice = invoices.find((inv) => inv.id === invoiceId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 pb-16">
      <PageHeader title={isEdit ? "Edit Credit Note" : "New Credit Note"}>
        <Button variant="outline" size="sm" onClick={() => navigate("/credit-notes")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Button variant="outline" onClick={() => handleSave("draft")}><Save className="mr-1 h-4 w-4" /> Save Draft</Button>
        <Button onClick={() => handleSave("sent")}><Send className="mr-1 h-4 w-4" /> Save & Send</Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <div className="flex gap-2">
                <Select value={clientId} onValueChange={handleClientChange}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setAddClientOpen(true)} title="Add New Client">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <AddClientDialog open={addClientOpen} onOpenChange={setAddClientOpen} onClientAdded={(c) => { setClients(prev => [...prev, c]); setClientId(c.id); }} />
              <ItemFormDialog open={addItemOpen} onOpenChange={setAddItemOpen} onItemSaved={(item) => { if(item) setItems(prev => [...prev, item]); }} />
            </div>
            <div className="space-y-2">
              <Label>Against Invoice (optional)</Label>
              <Select value={invoiceId || "none"} onValueChange={handleInvoiceChange}>
                <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {filteredInvoices.map((inv) => <SelectItem key={inv.id} value={inv.id}>{inv.invoice_number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Credit Note #</Label>
              <Input value={creditNoteNumber} onChange={(e) => setCreditNoteNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Issue Date</Label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          {selectedInvoice && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200 text-xs border border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 shrink-0" />
              <span>
                Line items auto-populated from <strong>{selectedInvoice.invoice_number}</strong>. Remove items that are not being returned or adjust the returned quantity.
              </span>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Item</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-20">Qty</TableHead>
                <TableHead className="w-24">Rate</TableHead>
                <TableHead className="w-24">Tax</TableHead>
                <TableHead className="w-24 text-right">Amount</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line, idx) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <div className="flex gap-1">
                      <Select value={line.item_id || undefined} onValueChange={(v) => handleLineChange(idx, "item_id", v)}>
                        <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Select item" /></SelectTrigger>
                        <SelectContent>
                          {items.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <button type="button" onClick={() => setAddItemOpen(true)} className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:text-foreground hover:bg-accent shrink-0" title="Add New Item">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Input className="mt-1 h-8 text-xs" value={line.name} onChange={(e) => handleLineChange(idx, "name", e.target.value)} placeholder="Item name" />
                  </TableCell>
                  <TableCell><Input className="h-8 text-xs" value={line.description} onChange={(e) => handleLineChange(idx, "description", e.target.value)} /></TableCell>
                  <TableCell><Input className="h-8 text-xs" type="number" min="0" step="any" value={line.quantity} onChange={(e) => handleLineChange(idx, "quantity", parseFloat(e.target.value) || 0)} /></TableCell>
                  <TableCell><Input className="h-8 text-xs" type="number" min="0" step="any" value={line.rate} onChange={(e) => handleLineChange(idx, "rate", parseFloat(e.target.value) || 0)} /></TableCell>
                  <TableCell>
                    <Select 
                      value={
                        line.tax_id 
                          ? (INDIAN_GST_SLABS.find(s => s.id === line.tax_id)?.id || 
                             INDIAN_GST_SLABS.find(s => {
                               const t = taxRates.find((tr: any) => tr.id === line.tax_id);
                               return t && Number(t.rate) === s.rate;
                             })?.id || line.tax_id)
                          : "exempt"
                      } 
                      onValueChange={(v) => {
                        if (v === "exempt") {
                          handleLineChange(idx, "tax_id", null);
                          return;
                        }
                        const slab = INDIAN_GST_SLABS.find(s => s.id === v);
                        if (slab) {
                          const matched = taxRates.find((t: any) => Number(t.rate) === slab.rate);
                          handleLineChange(idx, "tax_id", matched ? matched.id : slab.id);
                        } else {
                          handleLineChange(idx, "tax_id", v);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="No tax" /></SelectTrigger>
                      <SelectContent>
                        {INDIAN_GST_SLABS.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.rate}% ({s.name.split(" - ")[1] || s.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">{fmt(line.amount - (line.tax_amount || 0))}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (lines.length <= 1) {
                          setLines([createEmptyLine()]);
                        } else {
                          setLines((p) => p.filter((_, i) => i !== idx));
                        }
                      }}
                      title="Remove item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setLines((p) => [...p, createEmptyLine()])}>
            <Plus className="mr-1 h-4 w-4" /> Add Line
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="space-y-4 lg:col-span-7">
          <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <div className="space-y-2"><Label>Terms & Conditions</Label><Textarea value={terms} onChange={(e) => setTerms(e.target.value)} /></div>
          <label className="flex items-start gap-2 rounded-md border border-input bg-card p-3 cursor-pointer hover:bg-accent/40 transition">
            <Checkbox checked={restockInventory} onCheckedChange={(v) => setRestockInventory(!!v)} className="mt-0.5" />
            <div className="text-xs">
              <div className="font-medium text-foreground">Restock items to inventory</div>
              <div className="text-muted-foreground mt-0.5">Adds the line quantities back to product stock. Use this when items are physically returned by the customer.</div>
            </div>
          </label>
        </div>
        <div className="lg:col-span-5">
          <Card>
            <CardContent className="pt-6 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmt(subtotal)}</span></div>
              {totalDiscount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-destructive">-{fmt(totalDiscount)}</span></div>}
              {totalTax > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>+{fmt(totalTax)}</span></div>}
              <div className="flex justify-between border-t pt-2 font-bold text-base"><span>Total</span><span>{fmt(total)}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

