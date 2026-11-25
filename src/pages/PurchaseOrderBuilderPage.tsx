import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/app-store";
import { stateCodeFromGstin } from "@/lib/gst";
import { formatSequenceNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ItemFormDialog } from "@/components/shared/ItemFormDialog";
import { AddVendorDialog } from "@/components/shared/AddVendorDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ContactPromptDialog } from "@/components/shared/ContactPromptDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ListPlus, FileText, ShoppingCart, Save, Store, Calendar, CheckCircle2, Mail, MessageCircle, ChevronDown, Clock, Printer, Share2, Eye, ArrowLeft, Lock } from "lucide-react";
import { format, addDays } from "date-fns";
import { formatCurrency } from "@/lib/currency";
import { useSubscription } from "@/hooks/use-subscription";
import { hasUnlimitedPurchaseOrders, canSendDirectEmailOrWhatsApp, normalizePlanKey } from "@/lib/subscription";
import { PlanSelectorModal } from "@/components/shared/PlanSelectorModal";


interface Line {
  id?: string;
  item_id: string;
  description: string;
  hsn: string;
  quantity: string;
  rate: string;
  tax_rate: string;
  unit: string;
  expiry_warning?: string;
}
const emptyLine = (): Line => ({ item_id: "", description: "", hsn: "", quantity: "1", rate: "", tax_rate: "", unit: "" });

export default function PurchaseOrderBuilderPage() {
  const org = useAppStore((s) => s.organization);
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const duplicateId = searchParams.get("duplicate");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showSignature, setShowSignature] = useState(() => {
    const org = useAppStore.getState().organization;
    return !!(org?.address?.signature_type && org.address.signature_type !== 'none');
  });
  const { subscriptionPlan } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [activeOrgPlans, setActiveOrgPlans] = useState<string[]>([]);
  const plan = normalizePlanKey(subscriptionPlan);

  useEffect(() => {
    if (!org?.id) return;
    const fetchOrgSub = async () => {
      try {
        const { data: subData } = await supabase.rpc("get_my_org_subscription", { p_org_id: org.id });
        if (subData?.all_plans && Array.isArray(subData.all_plans)) {
          setActiveOrgPlans(subData.all_plans);
        }
      } catch (e) {
        console.error("Error fetching sub in PO builder:", e);
      }
    };
    fetchOrgSub();
  }, [org?.id]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [taxRates, setTaxRates] = useState<any[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [poDate, setPoDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [expectedDate, setExpectedDate] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [tdsTcsApplicable, setTdsTcsApplicable] = useState(false);
  const [tdsTcsType, setTdsTcsType] = useState<"tds" | "tcs">("tds");
  const [tdsTcsRate, setTdsTcsRate] = useState<number | string>(0);
  const cleanTdsTcsRate = Math.max(0, parseFloat(String(tdsTcsRate)) || 0);
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [discount, setDiscount] = useState<number | string>(0);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [shippingCharge, setShippingCharge] = useState<number | string>(0);
  const [adjustment, setAdjustment] = useState<number | string>(0);
  const [adjustmentName, setAdjustmentName] = useState<string>("Adjustment");
  
  // Display Options
  const [autoRoundOff, setAutoRoundOff] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [showTerms, setShowTerms] = useState(true);
  const [includeBankDetails, setIncludeBankDetails] = useState(false);

  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [newItemTargetLine, setNewItemTargetLine] = useState<number | null>(null);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [contactPromptOpen, setContactPromptOpen] = useState(false);
  const [contactPromptMissing, setContactPromptMissing] = useState<"email" | "phone">("email");
  const [pendingAction, setPendingAction] = useState<"email" | null>(null);
  // GST: determine if vendor has GSTIN and whether interstate
  const selectedVendor = useMemo(() => vendors.find(v => v.id === vendorId), [vendors, vendorId]);
  const vendorGstin = (selectedVendor?.gstin || "").trim();
  const vendorHasGst = vendorGstin.length === 15;
  const orgGstin = ((org as any)?.gstin || "").trim();
  const orgState = stateCodeFromGstin(orgGstin);
  const vendorState = stateCodeFromGstin(vendorGstin);
  const isInterstate = !!(orgState && vendorState && orgState !== vendorState);

  useEffect(() => {
    if (!org?.id) return;
    (async () => {
      const o = await (supabase as any).from("organizations").select("po_prefix, po_next_number").eq("id", org.id).maybeSingle();
      const v = await (supabase as any).from("vendors").select("id, name, display_name, gstin, email, phone").eq("org_id", org.id).order("name");
      const i = await (supabase as any).from("items").select("id, name, unit, hsn_code, purchase_price, purchase_price_type, tax_id, sku, unit_price").eq("org_id", org.id).order("name");
      const t = await (supabase as any).from("tax_rates").select("*").eq("org_id", org.id);
      setVendors(v.data || []);
      setItems(i.data || []);
      setTaxRates(t.data || []);

      if (!id) {
        const prefix = o.data?.po_prefix || "PO-";
        let next = o.data?.po_next_number || 1;
        const { data: recentPos } = await (supabase as any)
          .from("purchase_orders")
          .select("po_number")
          .eq("org_id", org.id)
          .order("created_at", { ascending: false })
          .limit(50);
        let maxExisting = 0;
        recentPos?.forEach((p: any) => {
          const m = (p.po_number || "").match(/(\d+)$/);
          if (m) {
            const val = parseInt(m[1], 10);
            if (val > maxExisting) maxExisting = val;
          }
        });
        if (maxExisting >= next) {
          next = maxExisting + 1;
        }
        setPoNumber(formatSequenceNumber(prefix, next));
      } else {
        loadPo();
      }
    })();
  }, [org?.id, id, duplicateId]);

  const loadPo = async () => {
    const sourceId = id || duplicateId;
    if (!sourceId) return;
    const { data: po } = await (supabase as any).from("purchase_orders").select("*").eq("id", sourceId).maybeSingle();
    const { data: pl } = await (supabase as any).from("purchase_order_lines").select("*").eq("po_id", sourceId).order("sort_order");
    if (po) {
      setVendorId(po.vendor_id || "");
      if (!duplicateId) {
        setPoNumber(po.po_number);
        setPoDate(po.po_date);
        setExpectedDate(po.expected_date || "");
      }
      setNotes(po.notes || "");
      setTerms(po.terms || "");
      const isTdsTcsOn = Boolean(
        po.tds_tcs_applicable ||
        (po.metadata as any)?.tds_tcs_applicable ||
        Number(po.tds_tcs_rate || 0) > 0 ||
        Number(po.tds_tcs_amount || 0) > 0 ||
        Number((po.metadata as any)?.tds_tcs_rate || 0) > 0 ||
        Number((po.metadata as any)?.tds_tcs_amount || 0) > 0
      );
      const loadedRate = po.tds_tcs_rate != null && po.tds_tcs_rate !== ""
        ? Number(po.tds_tcs_rate)
        : (Number((po.metadata as any)?.tds_tcs_rate) || 0);
      const loadedType = po.tds_tcs_type || (po.metadata as any)?.tds_tcs_type || "tds";
      setTdsTcsApplicable(isTdsTcsOn);
      setTdsTcsType(loadedType === "tcs" ? "tcs" : "tds");
      setTdsTcsRate(loadedRate);
    }
    if (pl) setLines(pl.map((l: any) => ({
      id: duplicateId ? crypto.randomUUID() : l.id, item_id: l.item_id || "", description: l.description, hsn: l.hsn || "",
      quantity: String(l.quantity), rate: String(l.rate), tax_rate: String(l.tax_rate || 0), unit: l.unit || "",
    })));
  };

  // GST-aware totals
  // GST-aware totals
  const totals = useMemo(() => {
    const rawSubtotal = lines.reduce((s, l) => s + ((Number(l.quantity) || 0) * (Number(l.rate) || 0)), 0);
    const cleanDiscount = Math.max(0, Number(discount) || 0);
    const totalDiscount = discountType === "percentage" ? (rawSubtotal * cleanDiscount) / 100 : cleanDiscount;
    const discountedSubtotal = Math.max(0, rawSubtotal - totalDiscount);
    const discountRatio = rawSubtotal > 0 ? discountedSubtotal / rawSubtotal : 1;

    const cleanTdsTcsRate = Math.max(0, parseFloat(String(tdsTcsRate)) || 0);
    const isTds = Boolean(tdsTcsApplicable && tdsTcsType === "tds" && cleanTdsTcsRate > 0);
    const tdsFactor = isTds ? (1 - cleanTdsTcsRate / 100) : 1;
    const effectiveLineRatio = discountRatio * tdsFactor;

    let sub = 0, cgst = 0, sgst = 0, igst = 0;
    const breakdown: Record<number, number> = {};
    
    let maxTaxRate = 0;
    lines.forEach(l => {
      const q = Number(l.quantity) || 0;
      const r = Number(l.rate) || 0;
      const orgHasGst = Boolean((org?.gst_number?.trim() || (org as any)?.tax_number?.trim()) || (org as any)?.gst_enabled);
      const t = (vendorHasGst || orgHasGst) ? (Number(l.tax_rate) || 0) : 0;
      if (t > maxTaxRate) maxTaxRate = t;
      
      const amt = q * r;
      sub += amt;
      
      const effectiveAmt = amt * effectiveLineRatio;
      const taxAmt = effectiveAmt * (t / 100);
      
      if (t > 0) {
        breakdown[t] = (breakdown[t] || 0) + taxAmt;
        if (isInterstate) {
          igst += taxAmt;
        } else {
          cgst += taxAmt / 2;
          sgst += taxAmt / 2;
        }
      }
    });

    const cleanShipping = Math.max(0, Number(shippingCharge) || 0);
    const cleanAdjustment = Number(adjustment) || 0;
    const baseAmountBeforeTds = discountedSubtotal + cleanShipping;

    if (maxTaxRate > 0 && cleanShipping > 0) {
      const extraTaxBase = cleanShipping * tdsFactor;
      const extraTaxAmount = extraTaxBase * (maxTaxRate / 100);
      if (extraTaxAmount > 0) {
        breakdown[maxTaxRate] = (breakdown[maxTaxRate] || 0) + extraTaxAmount;
        if (isInterstate) {
          igst += extraTaxAmount;
        } else {
          cgst += extraTaxAmount / 2;
          sgst += extraTaxAmount / 2;
        }
      }
    }

    const totalTax = igst + cgst + sgst;
    const tdsAmount = isTds ? (baseAmountBeforeTds * cleanTdsTcsRate) / 100 : 0;
    const taxableAmount = Math.max(0, baseAmountBeforeTds - tdsAmount);
    const totalWithGst = taxableAmount + totalTax;
    const tcsAmount = (tdsTcsApplicable && tdsTcsType === "tcs") ? (totalWithGst * cleanTdsTcsRate) / 100 : 0;
    const tdsTcsAmount = tdsTcsType === "tds" ? tdsAmount : tcsAmount;
    
    const rawTotal = totalWithGst + tcsAmount + cleanAdjustment;
    let finalTotal = rawTotal;
    let finalAdjustment = cleanAdjustment;
    if (autoRoundOff) {
      finalTotal = Math.round(rawTotal);
      finalAdjustment = finalTotal - (totalWithGst + tcsAmount);
    }
    
    return { 
      sub, 
      totalDiscount,
      discountedSubtotal,
      shippingCharge: cleanShipping,
      adjustment: cleanAdjustment,
      finalAdjustment,
      taxableSubtotal: taxableAmount, 
      tdsAmount, 
      tcsAmount, 
      cgst, 
      sgst, 
      igst, 
      totalTax, 
      tdsTcsAmount, 
      total: finalTotal, 
      breakdown 
    };
  }, [lines, vendorHasGst, isInterstate, tdsTcsApplicable, tdsTcsType, tdsTcsRate, discount, discountType, shippingCharge, adjustment, autoRoundOff, org]);

  const pickItem = (idx: number, itemId: string) => {
    const it = items.find(x => x.id === itemId);
    const x = [...lines];
    x[idx].item_id = itemId;
    if (it) {
      let extraDesc = "";
      if (it.custom_field_values && it.custom_field_values.length > 0) {
        extraDesc = it.custom_field_values
          .filter((cf: any) => cf.value)
          .map((cf: any) => `${cf.custom_field_definitions?.field_name}: ${cf.value}`)
          .join("\n");
      }
      x[idx].description = it.name + (extraDesc ? `\n${extraDesc}` : "");
      x[idx].hsn = it.hsn_code || "";
      x[idx].unit = it.unit || "";
      let __rate = Number(it.purchase_price || it.unit_price) || 0;
      const __priceType = it.purchase_price_type || "without_tax";
      if (__priceType === "with_tax" && it.tax_id) {
        const __tax = taxRates.find((t: any) => t.id === it.tax_id);
        if (__tax && Number(__tax.rate) > 0) {
          __rate = Number((__rate / (1 + Number(__tax.rate) / 100)).toFixed(2));
        }
      }
      x[idx].rate = String(__rate);
      x[idx].tax_rate = it.tax_id ? String(taxRates.find((t: any) => t.id === it.tax_id)?.rate || 0) : "0";
    }
    setLines(x);
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
    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor) {
      toast({ title: "Select a vendor first", variant: "destructive" });
      return;
    }
    if (action === "email" && !vendor.email) {
      setContactPromptMissing("email");
      setPendingAction("email");
      setContactPromptOpen(true);
      return;
    }
    save("sent", action);
  };

  const save = async (status: "draft" | "sent" = "draft", postAction?: "email") => {
    if (!org?.id || !vendorId) { toast({ title: "Vendor required", variant: "destructive" }); return; }
    if (!lines.some((l) => l.description.trim() || Number(l.rate) > 0 || Number(l.quantity) > 0)) {
      toast({ title: "Add at least one line item", variant: "destructive" });
      return;
    }
    if (!id) {
      const isUnlimited = hasUnlimitedPurchaseOrders(plan, activeOrgPlans);
      if (!isUnlimited) {
        const { count } = await supabase
          .from("purchase_orders")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org.id);
        if ((count || 0) >= 100) {
          toast({
            title: "Purchase Order Limit Reached (100)",
            description: "Free plan allows up to 100 Purchase Orders. Please upgrade to Business Suite for unlimited purchase orders!",
            variant: "destructive"
          });
          setShowUpgradeModal(true);
          return;
        }
      }
    }
    setSaving(true);
    try {
      const extraData = {
        tds_tcs_applicable: tdsTcsApplicable,
        tds_tcs_type: tdsTcsType,
        tds_tcs_rate: cleanTdsTcsRate,
        tds_tcs_amount: totals.tdsTcsAmount,
        discount: Number(discount) || null,
        discount_type: discountType,
        shipping_charge: Number(shippingCharge) || 0,
        adjustment: totals.finalAdjustment || 0,
        adjustment_name: totals.finalAdjustmentName,
        displayOptions: {
          autoRoundOff,
          showNotes,
          showTerms,
          includeBankDetails
        }
      };
      
      const payload: any = {
        org_id: org.id, vendor_id: vendorId,
        po_number: poNumber, po_date: poDate, expected_date: expectedDate || null,
        status, subtotal: totals.sub, tax_amount: totals.totalTax, 
        total: totals.total,
        currency: (org as any)?.currency || "INR", 
        notes: (notes || "") + "\n\n---EXTRA_DATA---\n" + JSON.stringify(extraData), 
        terms: terms || null,
      };
      let poId = id;
      if (id) {
        const { error } = await (supabase as any).from("purchase_orders").update(payload).eq("id", id);
        if (error) throw error;
        await (supabase as any).from("purchase_order_lines").delete().eq("po_id", id);
      } else {
        let currentPayload = { ...payload };
        let insertData = null;
        let retryCount = 0;
        while (retryCount < 5) {
          const { data, error } = await (supabase as any).from("purchase_orders").insert(currentPayload).select().single();
          if (error) {
            if (error.code === "23505" && (error.message.includes("po_number") || error.message.includes("purchase_orders_org_id_po_number_key"))) {
              const { data: recentPos } = await (supabase as any)
                .from("purchase_orders")
                .select("po_number")
                .eq("org_id", org.id)
                .order("created_at", { ascending: false })
                .limit(100);
              let maxNum = 0;
              recentPos?.forEach((p: any) => {
                const m = (p.po_number || "").match(/(\d+)$/);
                if (m) {
                  const n = parseInt(m[1], 10);
                  if (n > maxNum) maxNum = n;
                }
              });
              const { data: currentOrg } = await (supabase as any).from("organizations").select("po_next_number, po_prefix").eq("id", org.id).single();
              const baseNum = Math.max(currentOrg?.po_next_number || 1, maxNum + 1);
              const nextNum = baseNum + retryCount;
              const formattedPo = formatSequenceNumber(currentOrg?.po_prefix || "PO-", nextNum);
              currentPayload.po_number = formattedPo;
              setPoNumber(formattedPo);
              retryCount++;
              continue;
            }
            throw error;
          }
          insertData = data;
          break;
        }
        if (!insertData) {
          throw new Error("Failed to generate a unique purchase order number. Please try again.");
        }
        poId = insertData.id;
        const insertedNumMatch = (currentPayload.po_number || "").match(/(\d+)$/);
        const savedSeq = insertedNumMatch ? parseInt(insertedNumMatch[1], 10) : 1;
        const { data: latestOrg } = await (supabase as any).from("organizations").select("po_next_number").eq("id", org.id).single();
        const nextTarget = Math.max(latestOrg?.po_next_number || 1, savedSeq + 1);
        await (supabase as any).from("organizations").update({ po_next_number: nextTarget }).eq("id", org.id);
      }
      const orgHasGst = Boolean((org?.gst_number?.trim() || (org as any)?.tax_number?.trim()) || (org as any)?.gst_enabled);
      const canApplyTax = vendorHasGst || orgHasGst;
      const linePayloads = lines.map((l, idx) => {
        const q = Number(l.quantity) || 0;
        const r = Number(l.rate) || 0;
        const tRate = canApplyTax ? (Number(l.tax_rate) || 0) : 0;
        const effectiveAmt = (q * r) * (totals.tdsAmount > 0 && totals.sub > 0 ? (1 - (totals.tdsAmount / totals.sub)) : 1);
        const tAmount = canApplyTax ? (effectiveAmt * (tRate / 100)) : 0;
        return {
          org_id: org.id, po_id: poId, item_id: l.item_id || null, description: l.description,
          hsn: l.hsn || null, quantity: q, rate: r, tax_rate: tRate,
          amount: (q * r) + tAmount, sort_order: idx, unit: l.unit || null
        };
      });
      const { error: lErr } = await (supabase as any).from("purchase_order_lines").insert(linePayloads);
      if (lErr) throw lErr;

      if (postAction === "email") {
        const vendor = vendors.find(v => v.id === vendorId);
        if (vendor?.email) {
          navigate(`/purchase-orders/${poId}?sendEmail=true`);
          toast({ title: "Saving and generating PDF..." });
          setSaving(false);
          return;
        }
      } else {
        toast({ title: id ? "PO updated" : "PO created" });
      }

      navigate(`/purchase-orders/${poId}`);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const currency = (org as any)?.currency || "INR";

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <ContactPromptDialog
        open={contactPromptOpen}
        onOpenChange={setContactPromptOpen}
        entityType="vendor"
        entityId={vendorId || ""}
        entityName={vendors.find(v => v.id === vendorId)?.name || ""}
        missingField={contactPromptMissing}
        onSuccess={(val) => {
          setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, [contactPromptMissing]: val } : v));
          if (pendingAction) save("sent", pendingAction);
        }}
      />
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate("/purchase-orders")} title="Back to Purchase Orders">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{id ? "Edit Purchase Order" : "New Purchase Order"}</h1>
            <p className="text-sm text-slate-500">Create a new purchase order for your vendor</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-white" onClick={() => navigate("/purchase-orders")}>Cancel</Button>
          <Button variant="outline" onClick={() => save("draft")} disabled={saving}>
            <Save className="mr-1.5 h-4 w-4" /> Save as Draft
          </Button>
          <div className="flex">
            <Button className="rounded-r-none font-semibold shadow-sm bg-blue-600 hover:bg-blue-700 text-white" onClick={() => save("sent")} disabled={saving}>
              <Save className="mr-1.5 h-4 w-4" /> Save PO
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="rounded-l-none border-l border-primary-foreground/20 px-2.5 shadow-sm bg-blue-600 hover:bg-blue-700 text-white" disabled={saving}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => handleActionClick("email")}>
                  <Mail className="mr-2 h-4 w-4 text-blue-600" /> Save and Email
                  {!canSendDirectEmailOrWhatsApp(plan, activeOrgPlans) && <Lock className="ml-auto h-3.5 w-3.5 text-amber-500" />}
                </DropdownMenuItem>

                <DropdownMenuItem onClick={async () => { await save("sent"); setTimeout(() => window.print(), 500); }}>
                  <Printer className="mr-2 h-4 w-4" /> Save and Print
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => save("draft")}>
                  <Clock className="mr-2 h-4 w-4" /> Save and Send Later
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3 border-b bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-blue-100 text-blue-700 rounded-md flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base text-blue-700">Purchase Order Details</CardTitle>
              <p className="text-xs text-slate-500">Add vendor and order details</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-slate-700">Vendor <span className="text-red-500">*</span></Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Store className="absolute left-3 top-2.5 h-4 w-4 text-blue-600 z-10 pointer-events-none" />
                <Select value={vendorId || undefined} onValueChange={(v) => {
                  if (v === "new") {
                    setAddVendorOpen(true);
                  } else {
                    setVendorId(v);
                  }
                }}>
                  <SelectTrigger className="pl-9 h-10 border-slate-200 shadow-sm">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent className="z-50 max-h-60">
                    {vendors.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No vendors found
                      </SelectItem>
                    ) : (
                      vendors.map(v => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.display_name || v.name || "Vendor"} {v.gstin ? `(${v.gstin})` : ""}
                        </SelectItem>
                      ))
                    )}
                    <SelectItem value="new" className="text-primary font-medium cursor-pointer border-t mt-1 pt-1">
                      + Add New Vendor
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 border-slate-200"
                onClick={() => setAddVendorOpen(true)}
                title="Add New Vendor"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {vendorId && (
              <div className="pt-2">
                {vendorHasGst ? (
                  <div className="inline-flex items-center bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full border border-blue-100">
                    Vendor GSTIN: <span className="font-semibold ml-1">{vendorGstin}</span>
                    <span className="mx-2">•</span>
                    {isInterstate ? "Interstate (IGST)" : "Intrastate (CGST + SGST)"}
                  </div>
                ) : (
                  <div className="inline-flex items-center bg-amber-50 text-amber-700 text-xs px-2.5 py-1 rounded-full border border-amber-100">
                    ⚠ Vendor has no GST number — GST will not be applied
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-700">PO #</Label>
            <Input className="h-10 border-slate-200 shadow-sm" value={poNumber} onChange={e => setPoNumber(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-700">PO Date</Label>
            <div className="relative">
              <Input type="date" className="h-10 border-slate-200 shadow-sm pr-10" value={poDate} onChange={e => setPoDate(e.target.value)} />
              <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-700">Expected Date</Label>
            <div className="relative">
              <Input type="date" className="h-10 border-slate-200 shadow-sm pr-10" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
              <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-blue-100 text-blue-700 rounded-md flex items-center justify-center">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base text-blue-700">Line Items</CardTitle>
              <p className="text-xs text-slate-500">Add products or services to this purchase order</p>
            </div>
          </div>
          <div>
            <Button size="sm" variant="outline" className="mr-2" onClick={() => setBulkAddOpen(true)}><ListPlus className="h-4 w-4 mr-1" /> Bulk Add</Button>
            <Button size="sm" variant="outline" onClick={() => setLines([...lines, emptyLine()])}><Plus className="h-4 w-4 mr-1" /> Add Line</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead className="w-[300px]">Item &amp; Description</TableHead>
              <TableHead className="w-28">HSN</TableHead>
              <TableHead className="w-28">Qty / Unit</TableHead>
              <TableHead className="w-32">Rate ({currency === 'INR' ? '₹' : currency})</TableHead>
              <TableHead className="w-24">GST%</TableHead>
              <TableHead className="text-right">Amount ({currency === 'INR' ? '₹' : currency})</TableHead>
              <TableHead className="w-16 text-center">Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {lines.map((l, i) => {
                const qty = Number(l.quantity) || 0;
                const rate = Number(l.rate) || 0;
                const taxRate = vendorHasGst ? (Number(l.tax_rate) || 0) : 0;
                const base = qty * rate;
                const taxAmt = base * (taxRate / 100);
                const lineIgst = isInterstate ? taxAmt : 0;
                const lineCgst = isInterstate ? 0 : taxAmt / 2;
                const lineSgst = isInterstate ? 0 : taxAmt / 2;
                const lineTotal = base + taxAmt;

                return (
                  <TableRow key={i} className="hover:bg-slate-50/50">
                    <TableCell className="text-slate-500 font-medium text-sm">{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <Select
                          value={l.item_id || undefined}
                          onValueChange={(v) => {
                            if (v === "new") {
                              setNewItemTargetLine(i);
                              setCreateItemOpen(true);
                            } else {
                              pickItem(i, v);
                            }
                          }}
                        >
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select item" /></SelectTrigger>
                          <SelectContent className="z-50 max-h-60">
                            {items.length === 0 ? (
                              <SelectItem value="none" disabled>
                                No items in catalog
                              </SelectItem>
                            ) : (
                              items.map(it => (
                                <SelectItem key={it.id} value={it.id}>
                                  {it.name} {it.sku ? `(${it.sku})` : ""}
                                </SelectItem>
                              ))
                            )}
                            <SelectItem value="new" className="text-primary font-medium cursor-pointer border-t mt-1 pt-1">
                              + Create New Item
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Input value={l.description} onChange={e => { const x = [...lines]; x[i].description = e.target.value; setLines(x); }} className="h-7 text-xs px-2" placeholder="Description..." />
                      </div>
                    </TableCell>
                    <TableCell><Input value={l.hsn} onChange={e => { const x = [...lines]; x[i].hsn = e.target.value; setLines(x); }} /></TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <Input
                          type="number"
                          placeholder="1"
                          min={0}
                          value={l.quantity}
                          onKeyDown={(e) => { if (e.key === "-" || e.key === "e") e.preventDefault(); }}
                          onChange={e => {
                            const x = [...lines];
                            x[i].quantity = e.target.value === "" ? "" : String(Math.max(0, parseFloat(e.target.value) || 0));
                            setLines(x);
                          }}
                        />
                        <Select value={l.unit || undefined} onValueChange={v => { const x = [...lines]; x[i].unit = v; setLines(x); }}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Unit" /></SelectTrigger>
                          <SelectContent className="z-50 max-h-60">
                            {["pcs", "kg", "g", "ltr", "ml", "m", "cm", "ft", "inch", "box", "nos", "hrs", "days", "pair", "set", "sqft", "sqm", "ton", "dozen", "bundle", "roll", "bag", "carton"].map(u => (
                              <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="1"
                        min={0}
                        value={l.rate}
                        onKeyDown={(e) => { if (e.key === "-" || e.key === "e") e.preventDefault(); }}
                        onChange={e => {
                          const x = [...lines];
                          x[i].rate = e.target.value === "" ? "" : String(Math.max(0, parseFloat(e.target.value) || 0));
                          setLines(x);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {vendorHasGst ? (
                        <Select
                          value={l.tax_rate !== undefined && l.tax_rate !== "" ? String(l.tax_rate) : "0"}
                          onValueChange={(val) => {
                            const x = [...lines];
                            x[i].tax_rate = val;
                            setLines(x);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs min-w-[75px]">
                            <SelectValue placeholder="0%" />
                          </SelectTrigger>
                          <SelectContent className="z-50 max-h-60">
                            <SelectItem value="0">0%</SelectItem>
                            <SelectItem value="5">5%</SelectItem>
                            <SelectItem value="12">12%</SelectItem>
                            <SelectItem value="18">18%</SelectItem>
                            <SelectItem value="28">28%</SelectItem>
                            {taxRates
                              .filter((t: any) => ![0, 5, 12, 18, 28].includes(Number(t.rate)))
                              .map((t: any) => (
                                <SelectItem key={t.id} value={String(t.rate)}>
                                  {t.name} ({t.rate}%)
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type="text"
                          value="0%"
                          disabled
                          className="opacity-50 h-8 text-xs min-w-[70px] bg-slate-50"
                        />
                      )}
                    </TableCell>

                    <TableCell className="text-right font-bold text-slate-900">{formatCurrency(lineTotal, currency)}</TableCell>
                    <TableCell className="text-center">
                      <Button size="icon" variant="ghost" className="h-8 w-8 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 rounded-md" onClick={() => setLines(lines.filter((_, j) => j !== i))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="mt-6 flex justify-end">
            <div className="w-96 bg-slate-50/80 rounded-xl p-4 border shadow-sm space-y-3 text-sm">
                <div className="flex justify-between items-center text-slate-600">
                  <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-slate-400" /> <span>Subtotal</span></div>
                  <span className="font-medium text-slate-900">{formatCurrency(totals.sub, currency)}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span>Discount</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      onFocus={(e) => {
                        if (e.target.value === "0" || Number(e.target.value) === 0) {
                          e.target.select();
                        }
                      }}
                      onKeyDown={(e) => { if (e.key === "-" || e.key === "e") e.preventDefault(); }}
                      className="h-8 w-20 text-right font-medium"
                      value={discount === 0 || discount === "0" ? "" : discount}
                      onChange={(e) => {
                        let raw = e.target.value;
                        if (raw === "") {
                          setDiscount("");
                          return;
                        }
                        if (/^0+[0-9]/.test(raw) && !raw.startsWith("0.")) {
                          raw = raw.replace(/^0+/, "");
                          e.target.value = raw;
                        }
                        let val = parseFloat(raw) || 0;
                        val = Math.max(0, val);
                        if (discountType === "percentage" && val > 100) val = 100;
                        setDiscount(raw.endsWith(".") ? raw : val);
                      }}
                      onBlur={() => {
                        if (discount === "") setDiscount(0);
                      }}
                    />
                    <Select value={discountType} onValueChange={(v: any) => {
                      setDiscountType(v);
                      if (v === "percentage" && Number(discount) > 100) setDiscount(100);
                    }}>
                      <SelectTrigger className="h-8 w-16"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="fixed">Fixed</SelectItem>
                      </SelectContent>
                    </Select>
                    {totals.totalDiscount > 0 && <span className="text-red-600 font-medium">-{formatCurrency(totals.totalDiscount, currency)}</span>}
                  </div>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span>Shipping Charge</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      onFocus={(e) => {
                        if (e.target.value === "0" || Number(e.target.value) === 0) {
                          e.target.select();
                        }
                      }}
                      onKeyDown={(e) => { if (e.key === "-" || e.key === "e") e.preventDefault(); }}
                      className="h-8 w-24 text-right font-medium"
                      value={shippingCharge === 0 || shippingCharge === "0" ? "" : shippingCharge}
                      onChange={(e) => {
                        let raw = e.target.value;
                        if (raw === "") {
                          setShippingCharge("");
                          return;
                        }
                        if (/^0+[0-9]/.test(raw) && !raw.startsWith("0.")) {
                          raw = raw.replace(/^0+/, "");
                          e.target.value = raw;
                        }
                        let val = Math.max(0, parseFloat(raw) || 0);
                        setShippingCharge(raw.endsWith(".") ? raw : val);
                      }}
                      onBlur={() => {
                        if (shippingCharge === "") setShippingCharge(0);
                      }}
                    />
                    <span className="text-slate-900 font-medium">{formatCurrency(Number(shippingCharge) || 0, currency)}</span>
                  </div>
                </div>

                {tdsTcsApplicable && tdsTcsType === "tds" && totals.tdsAmount > 0 && (
                  <div className="flex justify-between items-center text-red-600">
                    <span>TDS Deducted ({tdsTcsRate}%)</span>
                    <span>-{formatCurrency(totals.tdsAmount, currency)}</span>
                  </div>
                )}
                {tdsTcsApplicable && tdsTcsType === "tds" && totals.tdsAmount > 0 && (
                  <div className="flex justify-between items-center font-semibold text-slate-800 bg-slate-100/80 px-2 py-1 rounded">
                    <span>Taxable Amount</span>
                    <span>{formatCurrency(totals.taxableSubtotal, currency)}</span>
                  </div>
                )}
                
                {vendorHasGst && Object.entries(totals.breakdown).map(([rateStr, amt]) => {
                  const rate = Number(rateStr);
                  const amount = Number(amt);
                  if (isInterstate) {
                    return (
                      <div key={rate} className="flex justify-between items-center text-slate-600">
                        <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-slate-400" /> <span>IGST ({rate}%)</span></div>
                        <span>{formatCurrency(amount, currency)}</span>
                      </div>
                    );
                  }
                  return (
                    <React.Fragment key={rate}>
                      <div className="flex justify-between items-center text-slate-600">
                        <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-slate-400" /> <span>CGST ({rate / 2}%)</span></div>
                        <span>{formatCurrency(amount / 2, currency)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-slate-400" /> <span>SGST ({rate / 2}%)</span></div>
                        <span>{formatCurrency(amount / 2, currency)}</span>
                      </div>
                    </React.Fragment>
                  );
                })}

                {/* TDS/TCS Configuration Section */}
                <div className="space-y-2 border-y py-3 my-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium">TDS / TCS Applicable?</span>
                    <Checkbox checked={tdsTcsApplicable} onCheckedChange={(v) => setTdsTcsApplicable(!!v)} />
                  </label>
                  {tdsTcsApplicable && (
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center justify-between text-sm gap-2">
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input type="radio" name="tdsTcsTypePo" checked={tdsTcsType === "tds"} onChange={() => setTdsTcsType("tds")} className="cursor-pointer" />
                            <span className="text-xs font-medium">TDS (-)</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input type="radio" name="tdsTcsTypePo" checked={tdsTcsType === "tcs"} onChange={() => setTdsTcsType("tcs")} className="cursor-pointer" />
                            <span className="text-xs font-medium">TCS (+)</span>
                          </label>
                        </div>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            className="h-7 w-16 text-xs text-right"
                            value={tdsTcsRate === 0 && !tdsTcsApplicable ? "" : tdsTcsRate}
                            onChange={(e) => setTdsTcsRate(e.target.value)}
                            placeholder="Rate"
                          />
                          <span className="text-muted-foreground text-xs">%</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {tdsTcsType === "tds" 
                          ? "TDS is calculated on Taxable Amount before GST and deducted from total."
                          : "TCS is calculated on Total Order Value (Basic Amount + GST) and added to total."}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm py-1 border-t border-dashed">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={autoRoundOff}
                      onCheckedChange={(v) => {
                        const checked = !!v;
                        setAutoRoundOff(checked);
                        if (!checked) {
                          setAdjustment("0");
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <span className="text-sm font-medium">Round Off</span>
                  </label>
                  <span className={`text-xs font-semibold tabular-nums ${totals.finalAdjustment > 0 ? "text-emerald-600" : totals.finalAdjustment < 0 ? "text-rose-600" : "text-muted-foreground"}`}>
                    {autoRoundOff
                      ? (totals.finalAdjustment !== 0 ? (totals.finalAdjustment > 0 ? `+${formatCurrency(totals.finalAdjustment, currency)}` : formatCurrency(totals.finalAdjustment, currency)) : formatCurrency(0, currency))
                      : formatCurrency(0, currency)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center font-bold text-base border-t border-slate-200 border-dashed pt-3 text-blue-700 mt-2">
                  <div className="flex items-center gap-2"><span>Total</span></div>
                  <span>{formatCurrency(totals.total, currency)}</span>
                </div>
              </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3 border-b bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 bg-blue-100 text-blue-700 rounded-md flex items-center justify-center">
                <FileText className="h-3.5 w-3.5" />
              </div>
              <CardTitle className="text-sm font-semibold text-blue-700">Notes</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <Textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              rows={3} 
              placeholder="Add any notes for this purchase order..."
              className="resize-none bg-slate-50/50 border-slate-200 text-sm"
              maxLength={500}
            />
            <div className="text-right text-xs text-slate-400 mt-2">{notes.length} / 500</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3 border-b bg-slate-50/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 bg-blue-100 text-blue-700 rounded-md flex items-center justify-center">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <CardTitle className="text-sm font-semibold text-blue-700">Terms</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Select onValueChange={(val) => {
                if (val === "due_on_receipt") setTerms("Due on receipt");
                else if (val === "net15") setTerms("Net 15 days");
                else if (val === "net30") setTerms("Net 30 days");
                else if (val === "net45") setTerms("Net 45 days");
                else if (val === "net60") setTerms("Net 60 days");
              }}>
                <SelectTrigger className="h-7 text-xs w-36 border-slate-200">
                  <SelectValue placeholder="Payment preset" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                  <SelectItem value="net15">Net 15 Days</SelectItem>
                  <SelectItem value="net30">Net 30 Days</SelectItem>
                  <SelectItem value="net45">Net 45 Days</SelectItem>
                  <SelectItem value="net60">Net 60 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <Textarea 
              value={terms} 
              onChange={e => setTerms(e.target.value)} 
              rows={3} 
              placeholder="Select payment terms (optional)..."
              className="resize-none bg-slate-50/50 border-slate-200 text-sm"
            />
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              Payment is due as per the selected terms.
            </div>
          </CardContent>
        </Card>
      </div>
      <AddVendorDialog
        open={addVendorOpen}
        onOpenChange={setAddVendorOpen}
        onVendorAdded={(newV: any) => {
          setVendors(prev => [...prev, newV]);
          setVendorId(newV.id);
        }}
      />
      <ItemFormDialog
        open={createItemOpen}
        onOpenChange={setCreateItemOpen}
        onItemSaved={(item) => {
          if (item) {
            setItems((prev: any[]) => [...prev, item]);
            if (newItemTargetLine !== null) {
              const newLines = [...lines];
              newLines[newItemTargetLine] = {
                ...newLines[newItemTargetLine],
                item_id: item.id,
                description: item.name,
                hsn: item.hsn_code || "",
                unit: item.unit || "pcs",
                rate: String(item.unit_price || 0),
                tax_rate: item.tax_id ? String(taxRates.find((t: any) => t.id === item.tax_id)?.rate || 0) : "0",
              };
              setLines(newLines);
              setNewItemTargetLine(null);
            }
          }
        }}
      />
      {/* Bulk Add Items Dialog */}
      <Dialog open={bulkAddOpen} onOpenChange={setBulkAddOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Add Items</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No items in catalog. Add items first.</p>
            ) : (
              <>
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox
                    checked={bulkSelected.size === items.length}
                    onCheckedChange={(checked) => {
                      if (checked) setBulkSelected(new Set(items.map((i: any) => i.id)));
                      else setBulkSelected(new Set());
                    }}
                  />
                  <span className="text-sm font-medium">Select All ({items.length} items)</span>
                </div>
                {items.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-accent/50">
                    <Checkbox
                      checked={bulkSelected.has(item.id)}
                      onCheckedChange={(checked) => {
                        const next = new Set(bulkSelected);
                        if (checked) next.add(item.id); else next.delete(item.id);
                        setBulkSelected(next);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{item.name}</span>
                      {item.description && <span className="text-xs text-muted-foreground ml-2">{item.description}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">{item.unit || "pcs"}</span>
                    <span className="text-sm font-medium">{formatCurrency(Number(item.unit_price), currency)}</span>
                  </div>
                ))}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAddOpen(false)}>Cancel</Button>
            <Button
              disabled={bulkSelected.size === 0}
              onClick={() => {
                const toAdd = Array.from(bulkSelected).map(id => items.find(i => i.id === id)).filter(Boolean);
                const newLines = toAdd.map(it => ({
                  item_id: it.id, description: it.name, hsn: it.hsn || "",
                  quantity: "1", unit: it.unit || "", rate: String(it.unit_price || 0), tax_rate: String(it.tax_rate || 0)
                }));
                setLines(lines.length === 1 && !lines[0].item_id && !lines[0].description ? newLines : [...lines, ...newLines]);
                setBulkAddOpen(false);
                setBulkSelected(new Set());
              }}
            >
              Add {bulkSelected.size} Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PlanSelectorModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        orgId={org?.id}
      />
    </div>
  );
}
