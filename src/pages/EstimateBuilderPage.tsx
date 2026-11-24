import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatSequenceNumber } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { INDIAN_GST_SLABS } from "@/lib/constants";
import { extractEntityState } from "@/lib/gst";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, Trash2, Plus, GripVertical, Mail, MessageCircle, Eye, ChevronDown, Clock, Printer, Share2, ArrowLeft, Lock, RefreshCw, Building2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AddClientDialog } from "@/components/shared/AddClientDialog";
import { ItemFormDialog } from "@/components/shared/ItemFormDialog";
import { ContactPromptDialog } from "@/components/shared/ContactPromptDialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSubscription } from "@/hooks/use-subscription";
import { hasUnlimitedEstimates, normalizePlanKey, canSendDirectEmailOrWhatsApp } from "@/lib/subscription";
import { PlanSelectorModal } from "@/components/shared/PlanSelectorModal";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";

import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

function SortableLine({ line, index, taxRates, items, onChange, onRemove, onAddItem, currency }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: line.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const fmt = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

  const handleItemSelect = async (itemId: string) => {
    if (itemId === "none") { onChange(index, "item_id", null); return; }
    const item = items.find((i: any) => i.id === itemId);
    if (item) {
      onChange(index, "item_id", item.id);
      onChange(index, "name", item.name);
      let extraDesc = "";
    const { data: cfs } = await supabase
      .from("custom_field_values")
      .select("value, custom_field_definitions(field_name)")
      .eq("entity_id", item.id);
      
    if (cfs && cfs.length > 0) {
      extraDesc = cfs
        .filter((cf: any) => cf.value)
        .map((cf: any) => `${(cf.custom_field_definitions as any)?.field_name}: ${cf.value}`)
        .join("\n");
    }
    onChange(index, "description", item.description ? (extraDesc ? `${item.description}\n${extraDesc}` : item.description) : extraDesc);
          let __rate = Number(item.unit_price) || 0;
    const __priceType = window.location.pathname.includes("bill") || window.location.pathname.includes("purchase") || window.location.pathname.includes("grn") ? (item.purchase_price_type || "without_tax") : (item.sales_price_type || "without_tax");
    if (__priceType === "with_tax" && item.tax_id) {
      const __tax = taxRates.find((t: any) => t.id === item.tax_id);
      if (__tax && Number(__tax.rate) > 0) {
        __rate = Number((__rate / (1 + Number(__tax.rate) / 100)).toFixed(2));
      }
    }
    onChange(index, "rate", __rate);
      onChange(index, "discount", Number(item.discount) || 0);
      onChange(index, "discount_type", "percentage");
      onChange(index, "unit", item.unit || "pcs");
      if (item.hsn_code) onChange(index, "hsn_code", item.hsn_code);
      if (item.tax_id) onChange(index, "tax_id", item.tax_id);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 py-2 border-b last:border-0">
      <button {...attributes} {...listeners} className="mt-3 cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="grid flex-1 grid-cols-12 gap-2">
        <div className="col-span-3">
          <div className="flex gap-1">
            <Select value={line.item_id || "none"} onValueChange={handleItemSelect}>
              <SelectTrigger className="h-9 text-xs flex-1"><SelectValue placeholder="Select item..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Custom item</SelectItem>
                {items.map((item: any) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} {Number(item.discount) > 0 ? `(₹${(Number(item.unit_price) * (1 - Number(item.discount)/100)).toFixed(2)} - ${item.discount}% off)` : `(₹${item.unit_price})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button type="button" onClick={onAddItem} className="h-9 w-9 flex items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:text-foreground hover:bg-accent shrink-0" title="Add New Item">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <Input className="mt-1 h-8 text-xs" placeholder="Item name" value={line.name}
            onChange={(e) => onChange(index, "name", e.target.value)} />
        </div>
        <div className="col-span-3">
          <Textarea className="min-h-[60px] text-xs" placeholder="Description" value={line.description}
            onChange={(e) => onChange(index, "description", e.target.value)} />
        </div>
        <div className="col-span-1">
          <Input placeholder="1" type="number" className="h-9 text-xs text-center" onFocus={(e) => e.target.select()} onBlur={(e) => { if (!e.target.value || parseFloat(e.target.value) <= 0) onChange(index, "quantity", 1); }} value={line.quantity}
            onKeyDown={(e) => { if (e.key === "-" || e.key === "e") e.preventDefault(); }}
            onChange={(e) => onChange(index, "quantity", e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0))} min={0} step="0.01" />
          <span className="text-[10px] text-muted-foreground">Qty</span>
        </div>
        <div className="col-span-2">
          <Input placeholder="0" type="number" className="h-9 text-xs" value={line.rate}
            onKeyDown={(e) => { if (e.key === "-" || e.key === "e") e.preventDefault(); }}
            onChange={(e) => onChange(index, "rate", e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0))} min={0} step="0.01" />
          <span className="text-[10px] text-muted-foreground">Rate</span>
        </div>
        <div className="col-span-1">
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
                onChange(index, "tax_id", null);
                return;
              }
              const slab = INDIAN_GST_SLABS.find(s => s.id === v);
              if (slab) {
                const matched = taxRates.find((t: any) => Number(t.rate) === slab.rate);
                onChange(index, "tax_id", matched ? matched.id : slab.id);
              } else {
                onChange(index, "tax_id", v);
              }
            }}
          >
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Tax" /></SelectTrigger>
            <SelectContent>
              {INDIAN_GST_SLABS.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.rate}% ({s.name.split(" - ")[1] || s.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[10px] text-muted-foreground">Tax</span>
        </div>
        <div className="col-span-2 text-right">
          <div className="h-9 flex items-center justify-end text-sm font-medium">
            {fmt(
              (Number(line.quantity || 0) * Number(line.rate || 0)) > 0
                ? Math.max(0, (Number(line.quantity || 0) * Number(line.rate || 0)) - (line.discount ? (line.discount_type === "percentage" ? (Number(line.quantity || 0) * Number(line.rate || 0) * (Number(line.discount) / 100)) : Number(line.discount)) : 0))
                : (Number(line.amount || 0) > Number(line.tax_amount || 0) ? Number(line.amount) - Number(line.tax_amount) : Number(line.amount || 0))
            )}
          </div>
          {line.tax_amount > 0 && <span className="text-[10px] text-muted-foreground">+{fmt(line.tax_amount)} tax</span>}
        </div>
      </div>
      <button onClick={() => onRemove(index)} className="mt-3 text-muted-foreground hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function EstimateBuilderPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const org = useAppStore((s) => s.organization);
  const { toast } = useToast();

  const [clients, setClients] = useState<any[]>([]);
  const [showSignature, setShowSignature] = useState(() => {
    const org = useAppStore.getState().organization;
    return !!(org?.address?.signature_type && org.address.signature_type !== 'none');
  });
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [taxRates, setTaxRates] = useState<any[]>([]);
  const [clientId, setClientId] = useState("");
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [estimateNumber, setEstimateNumber] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [shippingCharge, setShippingCharge] = useState(0);
  const [adjustment, setAdjustment] = useState(0);
  const [adjustmentName, setAdjustmentName] = useState("Adjustment");
  const [lines, setLines] = useState<LineItem[]>([createEmptyLine()]);
  const [saving, setSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [contactPromptOpen, setContactPromptOpen] = useState(false);
  const [contactPromptMissing, setContactPromptMissing] = useState<"email" | "phone">("email");
  const [pendingAction, setPendingAction] = useState<"email" | null>(null);
  const { subscriptionPlan } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [activeOrgPlans, setActiveOrgPlans] = useState<string[]>([]);
  const [autoRoundOff, setAutoRoundOff] = useState(true);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [showTerms, setShowTerms] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [showQr, setShowQr] = useState(false);
  const [savedBankAccounts, setSavedBankAccounts] = useState<any[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | null>(null);
  const [bankName, setBankName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankUpiId, setBankUpiId] = useState("");

  useEffect(() => {
    if (!org?.id) return;
    const fetchOrgSub = async () => {
      try {
        const { data: subData } = await supabase.rpc("get_my_org_subscription", { p_org_id: org.id });
        if (subData?.all_plans && Array.isArray(subData.all_plans)) {
          setActiveOrgPlans(subData.all_plans);
        }
      } catch (e) {
        console.error("Error fetching sub in estimate builder:", e);
      }
    };
    fetchOrgSub();
  }, [org?.id]);

  const plan = normalizePlanKey(subscriptionPlan || org?.subscription_plan || 'free');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!org?.id) return;
    const fetchData = async () => {
      const [c, i, t] = await Promise.all([
        supabase.from("clients").select("*").eq("org_id", org.id).eq("status", "active").order("display_name"),
        supabase.from("items").select("*").eq("org_id", org.id).eq("is_active", true).order("name"),
        supabase.from("tax_rates").select("*").eq("org_id", org.id),
      ]);
      setClients(c.data || []);
      setCatalogItems(i.data || []);
      setTaxRates(t.data || []);
      const { data: allBankAccounts } = await supabase.from("bank_accounts").select("*").eq("org_id", org.id).eq("is_active", true).order("created_at");
      setSavedBankAccounts(allBankAccounts || []);
      if (!id) {
        const { data: freshOrg } = await supabase
          .from("organizations")
          .select("estimate_prefix, estimate_next_number, default_notes, default_terms")
          .eq("id", org.id)
          .single();
        const prefix = freshOrg?.estimate_prefix || org.estimate_prefix || "EST";
        let num = freshOrg?.estimate_next_number || (org as any).estimate_next_number || 1;

        const { data: recentEsts } = await supabase
          .from("estimates")
          .select("estimate_number")
          .eq("org_id", org.id)
          .order("created_at", { ascending: false })
          .limit(50);
        let maxExisting = 0;
        recentEsts?.forEach((est: any) => {
          const m = (est.estimate_number || "").match(/(\d+)$/);
          if (m) {
            const val = parseInt(m[1], 10);
            if (val > maxExisting) maxExisting = val;
          }
        });
        if (maxExisting >= num) {
          num = maxExisting + 1;
        }
        setEstimateNumber(formatSequenceNumber(prefix, num, "EST"));
        setNotes(freshOrg?.default_notes || org.default_notes || "");
        setTerms(freshOrg?.default_terms || org.default_terms || "");
      }
    };
    fetchData();
  }, [org?.id, id]);

  useEffect(() => {
    if (issueDate) {
      const d = new Date(issueDate);
      d.setDate(d.getDate() + 30);
      setExpiryDate(d.toISOString().split("T")[0]);
    }
  }, [issueDate]);

  useEffect(() => {
    if (!id || !org?.id) return;
    const load = async () => {
      const { data: est } = await supabase.from("estimates").select("*").eq("id", id).single();
      if (!est) return;
      setClientId(est.client_id);
      setEstimateNumber(est.estimate_number);
      setIssueDate(est.issue_date);
      setExpiryDate(est.expiry_date);
      setNotes(est.notes || "");
      setTerms(est.terms_conditions || "");
      setDiscount(Number(est.discount));
      setDiscountType(est.discount_type as any);
      setShippingCharge(Number(est.shipping_charge));
      setAdjustment(Number(est.adjustment));
      setAdjustmentName(est.adjustment_name || "Adjustment");
      if (est.metadata) {
        setAutoRoundOff(est.metadata.auto_round_off !== false);
        setShowBankDetails(!!est.metadata.show_bank_details);
        setShowTerms(est.metadata.show_terms !== false);
        setShowNotes(est.metadata.show_notes !== false);
        setShowQr(!!est.metadata.show_qr);
      }
      if (est.metadata?.bank_details?.enabled) {
        setBankName(est.metadata.bank_details.bank_name || "");
        setBankAccountName(est.metadata.bank_details.bank_account_name || "");
        setBankAccountNumber(est.metadata.bank_details.bank_account_number || "");
        setBankIfsc(est.metadata.bank_details.bank_ifsc || "");
        setBankBranch(est.metadata.bank_details.bank_branch || "");
        setBankUpiId(est.metadata.bank_details.bank_upi_id || "");
      }

      const { data: lineData } = await supabase.from("estimate_lines").select("*").eq("estimate_id", id).order("sort_order");
      if (lineData?.length) {
        setLines(lineData.map((l) => ({
          id: l.id, item_id: l.item_id, name: l.name, description: l.description || "",
          quantity: Number(l.quantity), rate: Number(l.rate), discount: Number(l.discount),
          discount_type: l.discount_type as any, tax_id: l.tax_id,
          tax_amount: Number(l.tax_amount), amount: Number(l.amount),
        })));
      }
    };
    load();
  }, [id, org?.id]);

  const calculateLine = useCallback((line: LineItem): LineItem => {
    const sub = (Number(line.quantity) || 0) * (Number(line.rate) || 0);
    const disc = line.discount_type === "percentage" ? sub * ((Number(line.discount) || 0) / 100) : (Number(line.discount) || 0);
    const after = Math.max(0, sub - disc);
    const slab = INDIAN_GST_SLABS.find((s) => s.id === line.tax_id);
    const tr = taxRates.find((t) => t.id === line.tax_id);
    const rate = slab ? slab.rate : (tr ? Number(tr.rate) : 0);
    const tax = after * (rate / 100);
    return { ...line, tax_amount: tax, amount: after + tax };
  }, [taxRates]);

  const handleLineChange = (index: number, field: string, value: any) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      updated[index] = calculateLine(updated[index]);
      return updated;
    });
  };

  const addLine = () => setLines((prev) => [...prev, createEmptyLine()]);
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLines((prev) => {
        const oi = prev.findIndex((l) => l.id === active.id);
        const ni = prev.findIndex((l) => l.id === over.id);
        return arrayMove(prev, oi, ni);
      });
    }
  };

  const subtotal = lines.reduce((s, l) => {
    const q = Number(l.quantity) || 0;
    const r = Number(l.rate) || 0;
    if (q > 0 && r > 0) {
      const disc = l.discount_type === "percentage" ? (q * r) * ((Number(l.discount) || 0) / 100) : (Number(l.discount) || 0);
      return s + Math.max(0, (q * r) - disc);
    }
    return s + (Number(l.amount || 0) > Number(l.tax_amount || 0) ? Number(l.amount) - Number(l.tax_amount) : Number(l.amount || 0));
  }, 0);
  const totalDiscount = discountType === "percentage" ? subtotal * (discount / 100) : discount;
  const discountedSubtotal = Math.max(0, subtotal - totalDiscount);
  const selectedClient = clients.find(c => c.id === clientId);
  const orgState = extractEntityState(org);
  const clientState = extractEntityState(selectedClient);
  const isInterstate = Boolean(orgState && clientState && orgState !== clientState);

  const discountRatio = subtotal > 0 ? discountedSubtotal / subtotal : 1;

  const taxBreakdownMap: Record<string, { id: string, name: string, rate: number, amount: number }> = {};
  let maxTaxRate = 0;
  lines.forEach(line => {
    if (line.tax_id) {
      const slab = INDIAN_GST_SLABS.find(s => s.id === line.tax_id);
      const tax = taxRates.find((t: any) => t.id === line.tax_id);
      const rate = slab ? slab.rate : (tax ? Number(tax.rate) : 0);
      if (rate > maxTaxRate) maxTaxRate = rate;
      const taxAmt = Number(line.tax_amount || 0) * discountRatio;
      if (taxAmt > 0) {
        if (isInterstate) {
          const key = `IGST_${rate}`;
          if (!taxBreakdownMap[key]) taxBreakdownMap[key] = { id: key, name: `IGST @ ${rate}%`, rate, amount: 0 };
          taxBreakdownMap[key].amount += taxAmt;
        } else {
          const cgstKey = `CGST_${rate/2}`;
          const sgstKey = `SGST_${rate/2}`;
          if (!taxBreakdownMap[cgstKey]) taxBreakdownMap[cgstKey] = { id: cgstKey, name: `CGST @ ${rate/2}%`, rate: rate/2, amount: 0 };
          if (!taxBreakdownMap[sgstKey]) taxBreakdownMap[sgstKey] = { id: sgstKey, name: `SGST @ ${rate/2}%`, rate: rate/2, amount: 0 };
          taxBreakdownMap[cgstKey].amount += taxAmt / 2;
          taxBreakdownMap[sgstKey].amount += taxAmt / 2;
        }
      }
    }
  });

  if (maxTaxRate > 0 && shippingCharge > 0) {
    const extraTaxAmount = shippingCharge * (maxTaxRate / 100);
    if (extraTaxAmount > 0) {
      if (isInterstate) {
        const key = `IGST_${maxTaxRate}`;
        if (!taxBreakdownMap[key]) taxBreakdownMap[key] = { id: key, name: `IGST @ ${maxTaxRate}%`, rate: maxTaxRate, amount: 0 };
        taxBreakdownMap[key].amount += extraTaxAmount;
      } else {
        const cgstKey = `CGST_${maxTaxRate/2}`;
        const sgstKey = `SGST_${maxTaxRate/2}`;
        if (!taxBreakdownMap[cgstKey]) taxBreakdownMap[cgstKey] = { id: cgstKey, name: `CGST @ ${maxTaxRate/2}%`, rate: maxTaxRate/2, amount: 0 };
        if (!taxBreakdownMap[sgstKey]) taxBreakdownMap[sgstKey] = { id: sgstKey, name: `SGST @ ${maxTaxRate/2}%`, rate: maxTaxRate/2, amount: 0 };
        taxBreakdownMap[cgstKey].amount += extraTaxAmount / 2;
        taxBreakdownMap[sgstKey].amount += extraTaxAmount / 2;
      }
    }
  }

  const taxBreakdown = Object.values(taxBreakdownMap);
  const totalTax = taxBreakdown.length > 0 ? taxBreakdown.reduce((s, t) => s + t.amount, 0) : lines.reduce((s, l) => s + (l.tax_amount || 0), 0);
  const baseTotalBeforeRoundOff = discountedSubtotal + totalTax + shippingCharge + adjustment;
  let roundOffAdjustment = 0;
  let total = baseTotalBeforeRoundOff;
  if (autoRoundOff) {
    const roundedTotal = Math.round(baseTotalBeforeRoundOff);
    roundOffAdjustment = Number((roundedTotal - baseTotalBeforeRoundOff).toFixed(2));
    total = roundedTotal;
  }
  const currency = org?.currency_code || "INR";
  const fmt = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

  const handleBankAccountSelect = (accountId: string) => {
    const acc = savedBankAccounts.find((a: any) => a.id === accountId);
    if (acc) {
      setSelectedBankAccountId(accountId);
      setBankName(acc.bank_name || "");
      const parsedNotes = acc.notes ? (() => { try { return JSON.parse(acc.notes); } catch { return {}; } })() : {};
      setBankAccountName(parsedNotes.account_holder_name || acc.name || "");
      setBankAccountNumber(acc.account_number || "");
      setBankIfsc(acc.ifsc || "");
      setBankBranch(parsedNotes.branch || "");
      setBankUpiId(acc.upi_id || "");
      setShowBankDetails(true);
    }
  };

  const handleActionClick = (action: "email") => {
    if (action === "email" && !canSendDirectEmailOrWhatsApp(plan, activeOrgPlans)) {
      toast({
        title: "Feature Locked 🔒",
        description: "Direct document emailing is a premium feature. Please upgrade to Business Suite or Business Integration to send directly via Email.",
        variant: "destructive"
      });
      setShowUpgradeModal(true);
      return;
    }
    const client = clients.find(c => c.id === clientId);
    if (!client) {
      toast({ title: "Select a client first", variant: "destructive" });
      return;
    }
    if (action === "email" && !client.email) {
      setContactPromptMissing("email");
      setPendingAction("email");
      setContactPromptOpen(true);
      return;
    }
    handleSave("sent", action);
  };

  const handleSave = async (status: "draft" | "sent" = "draft", postAction?: "email") => {
    if (isSavingRef.current || saving) return;
    isSavingRef.current = true;
    setSaving(true);

    try {
      if (!clientId) { toast({ title: "Select a client", variant: "destructive" }); return; }
      if (!lines.some((l) => l.name.trim())) { toast({ title: "Add at least one line item", variant: "destructive" }); return; }

      if (!id) {
        const isUnlimited = hasUnlimitedEstimates(plan, activeOrgPlans);
        if (!isUnlimited) {
          const { count } = await supabase
            .from("estimates")
            .select("id", { count: "exact", head: true })
            .eq("org_id", org!.id);
          if ((count || 0) >= 100) {
            toast({
              title: "Quotation Limit Reached (100/100)",
              description: "In this plan you can only create up to 100 quotations. Upgrade to Business Accounting or Business Suite for unlimited quotations.",
              variant: "destructive",
            });
            setShowUpgradeModal(true);
            return;
          }
        }
      }

      const payload = {
        org_id: org!.id, client_id: clientId, estimate_number: estimateNumber, status,
        issue_date: issueDate, expiry_date: expiryDate, currency_code: currency,
        discount, discount_type: discountType, shipping_charge: shippingCharge,
        adjustment, adjustment_name: adjustmentName, subtotal, total_tax: totalTax,
        total_discount: totalDiscount, total, notes, terms_conditions: terms,
        metadata: { 
          auto_round_off: autoRoundOff, 
          show_bank_details: showBankDetails, 
          show_terms: showTerms, 
          show_notes: showNotes, 
          show_qr: showQr,
          bank_details: showBankDetails ? { bank_name: bankName, bank_account_name: bankAccountName, bank_account_number: bankAccountNumber, bank_ifsc: bankIfsc, bank_branch: bankBranch, bank_upi_id: bankUpiId, enabled: true } : { enabled: false }
        },
        ...(status === "sent" ? { sent_at: new Date().toISOString() } : {}),
      };

      let estimateId = id;
      if (id) {
        const { error } = await supabase.from("estimates").update(payload).eq("id", id);
        if (error) throw error;
        await supabase.from("estimate_lines").delete().eq("estimate_id", id);
      } else {
        let currentPayload = { ...payload };
        let insertData = null;
        let retryCount = 0;
        while (retryCount < 5) {
          const { data, error } = await supabase.from("estimates").insert(currentPayload).select().single();
          if (error) {
            if (error.code === "23505" && (error.message.includes("estimate_number") || error.message.includes("estimates_org_id_estimate_number_key"))) {
              const { data: recentEsts } = await supabase
                .from("estimates")
                .select("estimate_number")
                .eq("org_id", org!.id)
                .order("created_at", { ascending: false })
                .limit(100);
              let maxNum = 0;
              recentEsts?.forEach((est: any) => {
                const m = (est.estimate_number || "").match(/(\d+)$/);
                if (m) {
                  const n = parseInt(m[1], 10);
                  if (n > maxNum) maxNum = n;
                }
              });
              const { data: currentOrg } = await supabase.from("organizations").select("estimate_next_number, estimate_prefix").eq("id", org!.id).single();
              const baseNum = Math.max(currentOrg?.estimate_next_number || 1, maxNum + 1);
              const nextNum = baseNum + retryCount;
              const formattedEst = formatSequenceNumber(currentOrg?.estimate_prefix || "EST", nextNum, "EST");
              currentPayload.estimate_number = formattedEst;
              setEstimateNumber(formattedEst);
              retryCount++;
              continue;
            }
            throw error;
          }
          insertData = data;
          break;
        }
        if (!insertData) {
          throw new Error("Failed to generate a unique quotation number. Please try again.");
        }
        estimateId = insertData.id;
        // Instantly update browser URL so if the user refreshes, they never see blank entries on /quotations/new
        window.history.replaceState(null, "", `/quotations/${estimateId}`);
        const insertedNumMatch = (currentPayload.estimate_number || "").match(/(\d+)$/);
        const savedSeq = insertedNumMatch ? parseInt(insertedNumMatch[1], 10) : 1;
        const { data: latestOrg } = await supabase.from("organizations").select("estimate_next_number").eq("id", org!.id).single();
        const nextTarget = Math.max(latestOrg?.estimate_next_number || 1, savedSeq + 1);
        await supabase.from("organizations").update({
          estimate_next_number: nextTarget,
        }).eq("id", org!.id);
      }

      // Ensure tax rate records exist in DB for any slab selected
      const slabMap: Record<string, string> = {};
      for (const l of lines) {
        if (l.tax_id && INDIAN_GST_SLABS.some(s => s.id === l.tax_id)) {
          const slab = INDIAN_GST_SLABS.find(s => s.id === l.tax_id)!;
          if (slab.rate === 0) {
            slabMap[slab.id] = "";
          } else if (!slabMap[slab.id]) {
            const existing = taxRates.find(t => Number(t.rate) === slab.rate);
            if (existing) {
              slabMap[slab.id] = existing.id;
            } else {
              const { data: newTax } = await supabase.from('tax_rates').insert({
                org_id: org!.id,
                name: slab.name,
                rate: slab.rate,
              }).select().single();
              if (newTax) {
                slabMap[slab.id] = newTax.id;
                setTaxRates(prev => [...prev, newTax]);
              }
            }
          }
        }
      }

      const linePayloads = lines.filter((l) => l.name.trim()).map((l, i) => {
        let resolvedTaxId = l.tax_id;
        if (resolvedTaxId && slabMap[resolvedTaxId] !== undefined) {
          resolvedTaxId = slabMap[resolvedTaxId] || null;
        }
        return {
          estimate_id: estimateId!, item_id: l.item_id, name: l.name, description: l.description,
          quantity: Number(l.quantity) || 1, rate: Number(l.rate) || 0, discount: Number(l.discount) || 0, discount_type: l.discount_type,
          tax_id: resolvedTaxId, tax_amount: l.tax_amount, amount: l.amount, sort_order: i,
          hsn_code: l.hsn_code || null,
        };
      });

      const { error: lineError } = await supabase.from("estimate_lines").insert(linePayloads);
      if (lineError) throw lineError;

      if (postAction === "email") {
        const client = clients.find(c => c.id === clientId);
        if (client?.email) {
          navigate(`/quotations/${estimateId}?sendEmail=true`);
          toast({ title: "Saving and generating PDF..." });
          setSaving(false);
          return;
        }
      } else {
        toast({ title: status === "sent" ? "Quotation saved!" : "Quotation saved as draft!" });
      }

      navigate(`/quotations/${estimateId}`, { replace: true });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      isSavingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <ContactPromptDialog
        open={contactPromptOpen}
        onOpenChange={setContactPromptOpen}
        entityType="client"
        entityId={clientId || ""}
        entityName={clients.find(c => c.id === clientId)?.display_name || ""}
        missingField={contactPromptMissing}
        onSuccess={(val) => {
          setClients(prev => prev.map(c => c.id === clientId ? { ...c, [contactPromptMissing]: val } : c));
          if (pendingAction) handleSave("sent", pendingAction);
        }}
      />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate("/quotations")} title="Back to Quotations">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{id ? "Edit Quotation" : "New Quotation"}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/quotations")}>Cancel</Button>
          <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving}>
            <Save className="mr-1.5 h-4 w-4" /> Save Draft
          </Button>
          <div className="flex">
            <Button className="rounded-r-none font-semibold shadow-sm" onClick={() => handleSave("sent")} disabled={saving}>
              {saving ? <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              {saving ? "Saving..." : "Save Quotation"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="rounded-l-none border-l border-primary-foreground/20 px-2.5 shadow-sm" disabled={saving}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => handleActionClick("email")}>
                  <Mail className="mr-2 h-4 w-4 text-blue-600" /> Save and Email
                  {!canSendDirectEmailOrWhatsApp(plan, activeOrgPlans) && <Lock className="ml-auto h-3.5 w-3.5 text-amber-500" />}
                </DropdownMenuItem>

                <DropdownMenuItem onClick={async () => { await handleSave("sent"); setTimeout(() => window.print(), 500); }}>
                  <Printer className="mr-2 h-4 w-4" /> Save and Print
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  await handleSave("sent");
                  if (id) {
                    const { data: existing } = await supabase.from("portal_tokens").select("token").eq("entity_type", "estimate").eq("entity_id", id).maybeSingle();
                    let token = existing?.token;
                    if (!token) {
                      const { data } = await supabase.from("portal_tokens").insert({ org_id: org!.id, entity_type: "estimate", entity_id: id }).select("token").single();
                      token = data?.token;
                    }
                    if (token) {
                      await navigator.clipboard.writeText(`${window.location.origin}/portal/${token}`);
                      toast({ title: "Quotation saved & portal link copied!" });
                    }
                  }
                }}>
                  <Share2 className="mr-2 h-4 w-4" /> Save and Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSave("draft")}>
                  <Clock className="mr-2 h-4 w-4" /> Save and Send Later
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Client *</Label>
                <div className="flex gap-2">
                  <Select value={clientId || "placeholder"} onValueChange={(v) => { if (v !== "placeholder") setClientId(v); }}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select client..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="placeholder" disabled>Select client...</SelectItem>
                      {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => setAddClientOpen(true)} title="Add New Client">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <AddClientDialog open={addClientOpen} onOpenChange={setAddClientOpen} onClientAdded={(c) => { setClients(prev => [...prev, c]); setClientId(c.id); }} />
                <ItemFormDialog open={addItemOpen} onOpenChange={setAddItemOpen} onItemSaved={(item) => { if(item) setCatalogItems(prev => [...prev, item]); }} />
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Quotation #</Label>
                  <Input value={estimateNumber} onChange={(e) => setEstimateNumber(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Issue Date</Label>
                  <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Line Items</h3>
            <Button size="sm" variant="outline" onClick={addLine}>
              <Plus className="mr-1 h-3 w-3" /> Add Line
            </Button>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={lines.map((l) => l.id)} strategy={verticalListSortingStrategy}>
              {lines.map((line, i) => (
                <SortableLine key={line.id} line={line} index={i} taxRates={taxRates}
                  items={catalogItems} onChange={handleLineChange} onRemove={removeLine} onAddItem={() => setAddItemOpen(true)} currency={currency} />
              ))}
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes visible to client" />
            </div>
            <div className="space-y-2">
              <Label>Terms & Conditions</Label>
              <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Terms & conditions" />
            </div>

            <div className="pt-2 border-t space-y-3">
              <label className="flex items-center gap-2 cursor-pointer hover:bg-muted/40 p-1 rounded">
                <Checkbox checked={showBankDetails} onCheckedChange={(v) => setShowBankDetails(!!v)} />
                <span className="text-sm font-medium">Show Bank / UPI Details</span>
              </label>
              {showBankDetails && (
                <div className="space-y-3 pt-1">
                  {savedBankAccounts.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-xs">Select Saved Account</Label>
                      <Select value={selectedBankAccountId || ""} onValueChange={handleBankAccountSelect}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choose account..." /></SelectTrigger>
                        <SelectContent>
                          {savedBankAccounts.map((acc: any) => {
                            const parsedNotes = acc.notes ? (() => { try { return JSON.parse(acc.notes); } catch { return {}; } })() : {};
                            return <SelectItem key={acc.id} value={acc.id}>{acc.bank_name} — {parsedNotes.account_holder_name || acc.name}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Bank Name</Label><Input className="h-8 text-xs" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. HDFC Bank" /></div>
                    <div className="space-y-1"><Label className="text-xs">Account Holder</Label><Input className="h-8 text-xs" value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Account Number</Label><Input className="h-8 text-xs" value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">IFSC Code</Label><Input className="h-8 text-xs" value={bankIfsc} onChange={e => setBankIfsc(e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Branch</Label><Input className="h-8 text-xs" value={bankBranch} onChange={e => setBankBranch(e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">UPI ID</Label><Input className="h-8 text-xs" value={bankUpiId} onChange={e => setBankUpiId(e.target.value)} /></div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-medium">{fmt(subtotal)}</span></div>
            <div className="flex items-center gap-2">
              <span className="text-sm flex-1">Discount</span>
              <Input
                type="number"
                min={0}
                onKeyDown={(e) => {
                  if (e.key === "-" || e.key === "e") e.preventDefault();
                }}
                className="w-20 h-8 text-xs text-right"
                value={discount}
                onChange={(e) => {
                  let val = parseFloat(e.target.value) || 0;
                  val = Math.max(0, val);
                  if (discountType === "percentage" && val > 100) val = 100;
                  setDiscount(val);
                }}
              />
              <Select
                value={discountType}
                onValueChange={(v: any) => {
                  setDiscountType(v);
                  if (v === "percentage" && discount > 100) setDiscount(100);
                }}
              >
                <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">%</SelectItem>
                  <SelectItem value="fixed">Flat</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm font-medium w-24 text-right">-{fmt(totalDiscount)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm flex-1">Shipping</span>
              <Input
                type="number"
                min={0}
                onKeyDown={(e) => {
                  if (e.key === "-" || e.key === "e") e.preventDefault();
                }}
                className="w-24 h-8 text-xs text-right"
                value={shippingCharge}
                onChange={(e) => setShippingCharge(Math.max(0, parseFloat(e.target.value) || 0))}
              />
            </div>
            {taxBreakdown.length > 0 ? (
              taxBreakdown.map((tb) => (
                <div key={tb.id} className="flex justify-between text-sm">
                  <span>{tb.name}</span>
                  <span className="font-medium">+{fmt(tb.amount)}</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span className="font-medium">{fmt(totalTax)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm py-1 border-t border-dashed">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox
                  checked={autoRoundOff}
                  onCheckedChange={(v) => {
                    const checked = !!v;
                    setAutoRoundOff(checked);
                    if (!checked) {
                      setAdjustment(0);
                    }
                  }}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">Round Off</span>
              </label>
              <span className={`text-xs font-semibold tabular-nums ${roundOffAdjustment > 0 ? "text-emerald-600" : roundOffAdjustment < 0 ? "text-rose-600" : "text-muted-foreground"}`}>
                {autoRoundOff
                  ? (roundOffAdjustment !== 0 ? (roundOffAdjustment > 0 ? `+${fmt(roundOffAdjustment)}` : fmt(roundOffAdjustment)) : "₹0.00")
                  : "₹0.00"}
              </span>
            </div>
            <div className="border-t pt-3 flex justify-between text-lg font-bold">
              <span>Total</span><span>{fmt(total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <PlanSelectorModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        orgId={org?.id}
      />
    </div>
  );
}
