import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatSequenceNumber } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { logStockMovements, detectNegativeStock } from "@/lib/stock";
import { CustomFieldsForm, saveCustomFieldValues } from "@/components/shared/CustomFieldsForm";
import { CURRENCIES, formatCurrency } from "@/lib/currency";
import { COMMON_UNITS, INDIAN_STATES, INDIAN_GST_SLABS } from "@/lib/constants";
import { stateCodeFromGstin, normalizeStateCode, extractEntityState, formatStateWithCode } from "@/lib/gst";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, Eye, Trash2, Plus, GripVertical, Printer, Share2, Clock, ChevronDown, AlertTriangle, Layers, Check, Mail, MessageCircle, ArrowLeft, Lock, RefreshCw, FileText, CheckCircle2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ContactPromptDialog } from "@/components/shared/ContactPromptDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { BillSettingsSheet } from "@/components/shared/BillSettingsSheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddVendorDialog } from "@/components/shared/AddVendorDialog";
import { openWhatsappShare } from "@/lib/share";
import { ItemFormDialog } from "@/components/shared/ItemFormDialog";
import { useSubscription } from "@/hooks/use-subscription";
import { hasUnlimitedBills, canSendDirectEmailOrWhatsApp, normalizePlanKey } from "@/lib/subscription";
import { PlanSelectorModal } from "@/components/shared/PlanSelectorModal";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface LineItem {
  id: string;
  item_id: string | null;
  name: string;
  description: string;
  unit: string;
  quantity: any;
  rate: any;
  sales_price?: any;
  discount: any;
  discount_type: "percentage" | "fixed";
  tax_id: string | null;
  tax_amount: number;
  amount: number;
  hsn_code: string;
  sub_unit?: string;
  sub_unit_conversion_rate?: number;
  primary_unit?: string;
  base_unit_price?: number;
  expiry_warning?: string;
}

const UNITS = COMMON_UNITS;

function createEmptyLine(): LineItem {
  return {
    id: crypto.randomUUID(),
    item_id: null,
    name: "",
    description: "",
    unit: "pcs",
    quantity: 1,
    rate: "",
    sales_price: "",
    discount: "",
    discount_type: "percentage",
    tax_id: null,
    tax_amount: 0,
    amount: 0,
    hsn_code: "",
    sub_unit: "",
    sub_unit_conversion_rate: 1,
    primary_unit: "pcs",
    base_unit_price: 0,
  };
}

function SortableLineItem({
  line,
  index,
  taxRates,
  items,
  onChange,
  onRemove,
  onAddItem,
  currency,
}: {
  line: LineItem;
  index: number;
  taxRates: any[];
  items: any[];
  onChange: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
  onAddItem: () => void;
  currency: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: line.id });
  const [itemDropdownOpen, setItemDropdownOpen] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleItemSelect = async (item: any) => {
    onChange(index, "item_id", item.id);
    onChange(index, "name", item.name);
    onChange(index, "sales_price", Number(item.unit_price) || 0);
    if (item.has_expiry && item.expiry_date) {
      const exp = new Date(item.expiry_date);
      const now = new Date();
      const days = (exp.getTime() - now.getTime()) / (1000 * 3600 * 24);
      const { format } = await import("date-fns");
      if (days < 0) {
        onChange(index, "expiry_warning", `Expired on ${format(exp, 'MMM d, yyyy')}`);
      } else if (days < 30) {
        onChange(index, "expiry_warning", `Expiring on ${format(exp, 'MMM d, yyyy')}`);
      } else {
        onChange(index, "expiry_warning", "");
      }
    } else {
      onChange(index, "expiry_warning", "");
    }
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
    let __rate = Number(item.purchase_price) || Number(item.unit_price) || 0;
    const __priceType = item.purchase_price_type || "without_tax";
    if (__priceType === "with_tax" && item.tax_id) {
      const __tax = taxRates.find((t: any) => t.id === item.tax_id);
      if (__tax && Number(__tax.rate) > 0) {
        __rate = Number((__rate / (1 + Number(__tax.rate) / 100)).toFixed(2));
      }
    }
    onChange(index, "rate", __rate);
    onChange(index, "discount", Number(item.discount) || 0);
    onChange(index, "discount_type", "percentage");
    onChange(index, "unit", (item.unit || "PCS").toUpperCase());
    onChange(index, "primary_unit", (item.unit || "PCS").toUpperCase());
    onChange(index, "base_unit_price", Number(item.purchase_price || item.unit_price) || 0);
    onChange(index, "hsn_code", item.hsn_code || "");
    onChange(index, "tax_id", item.tax_id || null);
    onChange(index, "sub_unit", item.sub_unit || "");
    onChange(index, "sub_unit_conversion_rate", Number(item.sub_unit_conversion_rate) || 1);
    setItemDropdownOpen(false);
  };

  const filteredItems = useMemo(() => {
    if (!line.name.trim()) return items;
    return items.filter((i: any) => i.name.toLowerCase().includes(line.name.toLowerCase()));
  }, [line.name, items]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

  const hasSubUnit = Boolean(line.sub_unit && line.sub_unit_conversion_rate && line.sub_unit_conversion_rate > 1);
  const isSellingInSubUnit = hasSubUnit && line.unit?.toLowerCase() === line.sub_unit?.toLowerCase();

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-1 py-3 border-b last:border-0">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground shrink-0 mt-2">
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="grid flex-1 grid-cols-12 gap-2 items-start">
        {/* Item Details - Name + Description */}
        <div className="col-span-4 space-y-1">
          <div className="flex gap-0.5">
            <div className="relative flex-1">
              <Input
                className="h-8 text-xs pr-7 font-medium"
                placeholder="Add new item or search..."
                value={line.name}
                onChange={(e) => {
                  onChange(index, "item_id", null);
                  onChange(index, "name", e.target.value);
                  setItemDropdownOpen(true);
                }}
                onFocus={() => setItemDropdownOpen(true)}
                onBlur={() => setTimeout(() => setItemDropdownOpen(false), 200)}
              />
              <button
                type="button"
                className="absolute right-0 top-0 h-8 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground"
                onClick={() => setItemDropdownOpen(!itemDropdownOpen)}
              >
                <ChevronDown className="h-3 w-3" />
              </button>
              {itemDropdownOpen && filteredItems.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
                  {filteredItems.map((item: any) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground flex justify-between items-center"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleItemSelect(item)}
                    >
                      <div>
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">{item.description}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-foreground">{fmt(Number(item.purchase_price || item.unit_price || 0))}</span>
                        {item.unit && (
                          <span className="text-[10px] text-muted-foreground ml-1">/ {item.unit}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={onAddItem} className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:text-foreground hover:bg-accent shrink-0" title="Add New Item to Catalog">
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <Textarea
            className="text-xs min-h-[40px] resize-none"
            placeholder="Add a description to your item"
            value={line.description}
            onChange={(e) => onChange(index, "description", e.target.value)}
            rows={2}
          />
          {line.item_id ? (
            <div className="flex items-center gap-1.5 pt-0.5">
              <a
                href="/items"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-medium"
                title="Open items catalog in new tab to view or edit"
              >
                <span>Edit in Items ↗</span>
              </a>
              <span className="text-[10px] text-muted-foreground">• Existing Catalog Item</span>
            </div>
          ) : line.name.trim() ? (
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium pt-0.5">
              ✨ Will auto-create in Items &amp; Inventory on save
            </div>
          ) : null}
          {line.expiry_warning && <div className="text-[10px] text-red-500 font-medium mt-1">{line.expiry_warning}</div>}
        </div>
        {/* Quantity & Unit */}
        <div className="col-span-2 space-y-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-muted-foreground font-medium text-center">Qty</span>
            <Input 
              placeholder="1" 
              type="number" 
              className="h-8 text-xs text-center font-medium" 
              onFocus={(e) => e.target.select()} 
              onBlur={(e) => { if (!e.target.value || parseFloat(e.target.value) <= 0) onChange(index, "quantity", 1); }} 
              value={line.quantity} 
              onKeyDown={(e) => { if (e.key === "-" || e.key === "e") e.preventDefault(); }}
              onChange={(e) => {
                let val = e.target.value;
                if (val !== "") {
                  const u = (line.unit || "").toLowerCase();
                  if (u === "pcs" || u === "pieces" || u === "box" || u === "boxes" || u === "nos") {
                    val = String(Math.floor(parseFloat(val) || 0));
                  }
                }
                onChange(index, "quantity", val === "" ? "" : Math.max(0, parseFloat(val) || 0));
              }} 
              min={0} 
              step={["pcs", "pieces", "box", "boxes", "nos"].includes((line.unit || "").toLowerCase()) ? "1" : "0.01"} 
            />
          </div>
          {hasSubUnit ? (
            <div className="w-full flex flex-col items-center gap-0.5 mt-1">
              <div className="flex items-center justify-center gap-1 bg-muted/60 rounded px-1 py-0.5 w-full">
                <span className="text-[10px] font-bold text-foreground uppercase">{line.unit}</span>
                <button
                  type="button"
                  title="Switch unit"
                  onClick={() => {
                    if (isSellingInSubUnit) {
                      const targetUnit = line.primary_unit || "box";
                      const targetRate = line.base_unit_price || Number((line.rate * (line.sub_unit_conversion_rate || 1)).toFixed(2));
                      onChange(index, "unit", targetUnit);
                      onChange(index, "rate", targetRate);
                    } else {
                      const targetUnit = line.sub_unit;
                      const base = line.base_unit_price || line.rate;
                      const targetRate = Number((base / (line.sub_unit_conversion_rate || 1)).toFixed(2));
                      onChange(index, "unit", targetUnit);
                      onChange(index, "rate", targetRate);
                    }
                  }}
                  className="text-[9px] text-blue-600 hover:text-blue-800 underline font-medium"
                >
                  {isSellingInSubUnit ? `Switch to ${line.primary_unit?.toUpperCase() || 'BOX'}` : `Buy in ${line.sub_unit?.toUpperCase()}`}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5 mt-1">
              <span className="text-[9px] text-muted-foreground font-medium text-center">Unit</span>
              <Select
                value={line.unit?.toUpperCase() || "PCS"}
                onValueChange={(val) => onChange(index, "unit", val)}
              >
                <SelectTrigger className="h-7 text-[10px] uppercase px-1.5 py-0 border-dashed bg-transparent text-center font-medium">
                  <SelectValue placeholder="UNIT" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {COMMON_UNITS.map((u) => (
                    <SelectItem key={u} value={u} className="text-xs">
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {/* Rate & Selling Price */}
        <div className="col-span-2 space-y-1">
          <div>
            <div className="flex justify-between items-center text-[9px] text-muted-foreground font-medium mb-0.5">
              <span>Buy Rate (₹)</span>
            </div>
            <Input 
              placeholder="0" 
              type="number" 
              className="h-7 text-xs text-right font-medium" 
              value={line.rate}
              onKeyDown={(e) => { if (e.key === "-" || e.key === "e") e.preventDefault(); }}
              onChange={(e) => onChange(index, "rate", e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0))} 
              min={0} 
              step="0.01" 
            />
          </div>
          <div>
            <div className="flex justify-between items-center text-[9px] text-emerald-600 dark:text-emerald-400 font-medium mb-0.5">
              <span>Sell Price (₹)</span>
            </div>
            <Input 
              placeholder="0" 
              type="number" 
              className="h-7 text-xs text-right border-emerald-300 dark:border-emerald-700 focus-visible:ring-emerald-500 font-medium" 
              value={line.sales_price ?? ""}
              onKeyDown={(e) => { if (e.key === "-" || e.key === "e") e.preventDefault(); }}
              onChange={(e) => onChange(index, "sales_price", e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0))} 
              min={0} 
              step="0.01"
              title="Sales price when selling this item" 
            />
          </div>
          {Number(line.discount) > 0 && (
            <div className="flex flex-col items-end mt-0.5 text-[9px] text-emerald-600 font-medium">
              <span>{line.discount_type === 'percentage' ? `${line.discount}%` : `₹${line.discount}`} off</span>
            </div>
          )}
        </div>
        {/* Tax */}
        <div className="col-span-2">
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
            onValueChange={(val) => {
              if (val === "exempt") {
                onChange(index, "tax_id", null);
                return;
              }
              const slab = INDIAN_GST_SLABS.find(s => s.id === val);
              if (slab) {
                const matched = taxRates.find((t: any) => Number(t.rate) === slab.rate);
                onChange(index, "tax_id", matched ? matched.id : slab.id);
              } else {
                onChange(index, "tax_id", val);
              }
            }}
          >
            <SelectTrigger className="h-8 text-[11px] px-2 bg-transparent border-dashed">
              <SelectValue placeholder="Tax" />
            </SelectTrigger>
            <SelectContent>
              {INDIAN_GST_SLABS.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Amount */}
        <div className="col-span-2 text-right pt-1">
          <span className="text-sm font-bold">{fmt(line.amount - (line.tax_amount || 0))}</span>
        </div>
      </div>
      <button onClick={() => onRemove(index)} className="text-muted-foreground hover:text-destructive shrink-0 mt-2 ml-1">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function BillBuilderPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const duplicateId = searchParams.get("duplicate");
  const queryGrnId = searchParams.get("grn");
  const [linkedGrnId, setLinkedGrnId] = useState<string | null>(null);
  const org = useAppStore((s) => s.organization);
  const { toast } = useToast();
  const billPref = (org?.invoice_preferences as any) || {};
  const billShowTerms = billPref.bill_show_terms !== false;
  const billShowNotes = billPref.bill_show_notes !== false;
  const billShowDisplayOptions = billPref.bill_show_display_options !== false;
  const billShowCompliance = billPref.bill_show_compliance !== false;
  const [showSignature, setShowSignature] = useState(() => {
    const org = useAppStore.getState().organization;
    return !!(org?.address?.signature_type && org.address.signature_type !== 'none');
  });
  const { user } = useAuth();
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const { subscriptionPlan } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [activeOrgPlans, setActiveOrgPlans] = useState<string[]>([]);
  const plan = normalizePlanKey(subscriptionPlan);

  useEffect(() => {
    if (!id && org?.invoice_preferences) {
      const pref = (org.invoice_preferences as any);
      if (pref.bill_default_add_stock !== undefined) {
        setDeductStock(pref.bill_default_add_stock !== false);
        setPrevDeductStock(pref.bill_default_add_stock !== false);
      }
      if (pref.bill_pdf_auto_round_off !== undefined) {
        setAutoRoundOff(pref.bill_pdf_auto_round_off !== false);
      }
      if (pref.bill_pdf_show_bank_details !== undefined) {
        setIncludeBankDetails(pref.bill_pdf_show_bank_details !== false);
      }
      if (pref.bill_pdf_show_terms !== undefined) {
        setShowTerms(pref.bill_pdf_show_terms !== false);
      }
      if (pref.bill_pdf_show_notes !== undefined) {
        setShowNotes(pref.bill_pdf_show_notes !== false);
      }
      if (pref.bill_pdf_show_signature !== undefined) {
        setShowSignature(pref.bill_pdf_show_signature !== false);
      }
    }
  }, [id, org?.invoice_preferences]);

  useEffect(() => {
    if (!org?.id) return;
    const fetchOrgSub = async () => {
      try {
        const { data: subData } = await supabase.rpc("get_my_org_subscription", { p_org_id: org.id });
        if (subData?.all_plans && Array.isArray(subData.all_plans)) {
          setActiveOrgPlans(subData.all_plans);
        }
      } catch (e) {
        console.error("Error fetching sub in bill builder:", e);
      }
    };
    fetchOrgSub();
  }, [org?.id]);

  const [vendors, setVendors] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [taxRates, setTaxRates] = useState<any[]>([]);

  const [vendorId, setVendorId] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [vendorStateOverride, setVendorStateOverride] = useState<string>("");
  const [billNumber, setBillNumber] = useState("");
  const [vendorBillNumber, setVendorBillNumber] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState(30);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [autoRoundOff, setAutoRoundOff] = useState(true);
  const [includeBankDetails, setIncludeBankDetails] = useState(true);
  const [showTerms, setShowTerms] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [shippingCharge, setShippingCharge] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [adjustment, setAdjustment] = useState(0);
  const [adjustmentName, setAdjustmentName] = useState("Adjustment");
  const [tdsTcsApplicable, setTdsTcsApplicable] = useState(false);
  const [tdsTcsType, setTdsTcsType] = useState<"tds" | "tcs">("tds");
  const [tdsTcsRate, setTdsTcsRate] = useState(0);
  const [lines, setLines] = useState<LineItem[]>([createEmptyLine()]);
  const [deductStock, setDeductStock] = useState(true);
  const [prevDeductStock, setPrevDeductStock] = useState(true);
  const [amountPaid, setAmountPaid] = useState(0);
  // Phase 5 — opt-in compliance
  const [generateIrn, setGenerateIrn] = useState(false);
  const [irn, setIrn] = useState("");
  const [ackNo, setAckNo] = useState("");
  const [ackDate, setAckDate] = useState("");
  const [generateEway, setGenerateEway] = useState(false);
  const [ewayBillNo, setEwayBillNo] = useState("");
  const [ewayValidUntil, setEwayValidUntil] = useState("");
  const [ewayVehicleNo, setEwayVehicleNo] = useState("");
  const [ewayTransportMode, setEwayTransportMode] = useState("road");
  const [ewayDistanceKm, setEwayDistanceKm] = useState("");
  const [saving, setSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [vendorBills, setVendorBills] = useState<any[]>([]);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [contactPromptOpen, setContactPromptOpen] = useState(false);
  const [contactPromptMissing, setContactPromptMissing] = useState<"email" | "phone">("email");
  const [pendingAction, setPendingAction] = useState<"email" | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Fetch reference data
  useEffect(() => {
    if (!org?.id) return;
    const fetchData = async () => {
      const [c, i, t] = await Promise.all([
        supabase.from("vendors").select("*").eq("org_id", org.id).eq("is_active", true).order("display_name"),
        supabase.from("items").select("*").eq("org_id", org.id).eq("is_active", true).order("name"),
        supabase.from("tax_rates").select("*").eq("org_id", org.id),
      ]);
      setVendors(c.data || []);
      setCatalogItems(i.data || []);
      setTaxRates(t.data || []);

      // Auto-generate bill number from fresh DB value
      if (!id) {
        const { data: freshOrg } = await supabase.from("organizations").select("next_bill_number, bill_prefix, payment_terms, default_notes, default_terms, invoice_preferences").eq("id", org.id).single();
        const prefix = freshOrg?.bill_prefix || (org as any)?.bill_prefix || "BILL";
        let num = freshOrg?.next_bill_number || (org as any)?.next_bill_number || 1;
        const { data: recentBills } = await supabase
          .from("bills")
          .select("bill_number")
          .eq("org_id", org.id)
          .order("created_at", { ascending: false })
          .limit(50);
        let maxExisting = 0;
        recentBills?.forEach((b: any) => {
          const m = (b.bill_number || "").match(/(\d+)$/);
          if (m) {
            const val = parseInt(m[1], 10);
            if (val > maxExisting) maxExisting = val;
          }
        });
        if (maxExisting >= num) {
          num = maxExisting + 1;
        }
        setBillNumber(formatSequenceNumber(prefix, num, "BILL"));
        const freshPrefs = (freshOrg as any)?.invoice_preferences || {};
        const billTermsDays = freshPrefs.bill_default_payment_terms !== undefined
          ? Number(freshPrefs.bill_default_payment_terms)
          : (freshOrg?.payment_terms || org.payment_terms || 30);
        setPaymentTerms(billTermsDays);
        const bNotes = freshPrefs.default_bill_notes || freshOrg?.default_notes || org.default_notes || "";
        setNotes(bNotes);
        const bTerms = freshPrefs.default_bill_terms || freshOrg?.default_terms || org.default_terms || "";
        setTerms(bTerms);
        if (freshPrefs.bill_pdf_auto_round_off !== undefined) {
          setAutoRoundOff(freshPrefs.bill_pdf_auto_round_off !== false);
        }
        if (freshPrefs.bill_pdf_show_bank_details !== undefined) {
          setIncludeBankDetails(freshPrefs.bill_pdf_show_bank_details !== false);
        }
        if (freshPrefs.bill_pdf_show_terms !== undefined) {
          setShowTerms(freshPrefs.bill_pdf_show_terms !== false);
        }
        if (freshPrefs.bill_pdf_show_notes !== undefined) {
          setShowNotes(freshPrefs.bill_pdf_show_notes !== false);
        }
        if (freshPrefs.bill_pdf_show_signature !== undefined) {
          setShowSignature(freshPrefs.bill_pdf_show_signature !== false);
        }
      }
    };
    fetchData();
  }, [org?.id, id, duplicateId]);

  // Update due date when issue date or payment terms change
  useEffect(() => {
    if (billDate) {
      const d = new Date(billDate);
      d.setDate(d.getDate() + paymentTerms);
      setDueDate(d.toISOString().split("T")[0]);
    }
  }, [billDate, paymentTerms]);

  // Load from GRN if navigated from GRN details
  useEffect(() => {
    if (!queryGrnId || !org?.id || id) return;
    const loadFromGrn = async () => {
      const { data: g } = await supabase.from("grns").select("*").eq("id", queryGrnId).single();
      if (!g) return;
      setLinkedGrnId(g.id);
      setDeductStock(false);
      setPrevDeductStock(false);
      if (g.vendor_id) {
        setVendorId(g.vendor_id);
      }
      const { data: gLines } = await supabase.from("grn_lines").select("*").eq("grn_id", queryGrnId);
      if (gLines && gLines.length) {
        setLines(gLines.map((gl: any) => ({
          id: crypto.randomUUID(),
          item_id: gl.item_id || null,
          name: gl.description || "Product",
          description: gl.description || "",
          quantity: Number(gl.quantity || 1),
          rate: Number(gl.unit_cost || 0),
          discount: 0,
          discount_type: "percentage",
          tax_rate: 18,
          tax_amount: (Number(gl.quantity || 1) * Number(gl.unit_cost || 0)) * 0.18,
          amount: (Number(gl.quantity || 1) * Number(gl.unit_cost || 0)) * 1.18,
          hsn: "",
        })));
        toast({
          title: "Items loaded from GRN",
          description: "Inventory stock is already received via GRN and locked from duplicate addition.",
        });
      }
    };
    loadFromGrn();
  }, [queryGrnId, org?.id, id]);

  // Load existing bill for editing or duplicating
  useEffect(() => {
    const sourceId = id || duplicateId;
    if (!sourceId || !org?.id) return;
    const loadBill = async () => {
      const { data: inv } = await supabase
        .from("bills")
        .select("*")
        .eq("id", sourceId)
        .single();
      if (!inv) return;

      if ((inv as any).grn_id) {
        setLinkedGrnId((inv as any).grn_id);
      }

      setVendorId(inv.vendor_id);
      const matchedVendor = vendors.find((c) => c.id === inv.vendor_id);
      if (matchedVendor) setVendorSearch(matchedVendor.display_name);
      
      if (!duplicateId) {
        setBillNumber(inv.bill_number);
        setBillDate(inv.bill_date);
        setDueDate(inv.due_date);
      }
      
      let baseNotes = inv.notes || "";
      let extraData: any = {};
      if (baseNotes.includes("---EXTRA_DATA---")) {
        const parts = baseNotes.split("---EXTRA_DATA---");
        baseNotes = parts[0].trim();
        try {
          extraData = JSON.parse(parts[1].trim());
        } catch (e) {
          console.error("Failed to parse extra data", e);
        }
      }

      setNotes(baseNotes);
      setTerms(inv.terms || inv.terms_conditions || "");
      const meta = inv.metadata && typeof inv.metadata === 'object' ? inv.metadata : {};
      
      setAutoRoundOff(extraData.autoRoundOff ?? !!meta.autoRoundOff);
      setIncludeBankDetails(extraData.includeBankDetails ?? !!meta.includeBankDetails);
      setShowTerms(extraData.showTerms ?? meta.showTerms !== false);
      setShowNotes(extraData.showNotes ?? meta.showNotes !== false);
      if (extraData.showSignature !== undefined) {
        setShowSignature(extraData.showSignature !== false);
      } else if (meta.showSignature !== undefined) {
        setShowSignature(meta.showSignature !== false);
      }
      
      setDiscount(Number(inv.discount));
      setDiscountType(inv.discount_type as any);
      setShippingCharge(Number(inv.shipping_charge));
      setExpenses(Number((inv as any).expenses || 0));
      setAdjustment(Number(inv.adjustment));
      setAdjustmentName(inv.adjustment_name || "Adjustment");
      
      setTdsTcsApplicable(extraData.tds_tcs_applicable ?? !!(inv as any).tds_tcs_applicable);
      setTdsTcsType(extraData.tds_tcs_type ?? ((inv as any).tds_tcs_type === "tcs" ? "tcs" : "tds"));
      setTdsTcsRate(Number(extraData.tds_tcs_rate ?? (inv as any).tds_tcs_rate ?? 0));
      
      let loadedDeductStock = true;
      if (extraData.deduct_stock !== undefined) {
         loadedDeductStock = !!extraData.deduct_stock;
      } else if ((inv as any).deduct_stock !== undefined && (inv as any).deduct_stock !== null) {
         loadedDeductStock = !!(inv as any).deduct_stock;
      } else if ((inv.metadata as any)?.deduct_stock !== undefined) {
         loadedDeductStock = !!(inv.metadata as any).deduct_stock;
      }
      
      setDeductStock(loadedDeductStock);
      setPrevDeductStock(loadedDeductStock);
      setAmountPaid(duplicateId ? 0 : Number(inv.amount_paid || 0));
      
      // Phase 5 compliance load
      const _irn = (inv as any).irn || "";
      const _eway = (inv as any).eway_bill_no || "";
      setIrn(_irn);
      setAckNo((inv as any).ack_no || "");
      setAckDate((inv as any).ack_date ? String((inv as any).ack_date).slice(0, 10) : "");
      setGenerateIrn(!!_irn);
      setEwayBillNo(_eway);
      setEwayValidUntil((inv as any).eway_valid_until ? String((inv as any).eway_valid_until).slice(0, 10) : "");
      setEwayVehicleNo((inv as any).eway_vehicle_no || "");
      setEwayTransportMode((inv as any).eway_transport_mode || "road");
      setEwayDistanceKm((inv as any).eway_distance_km ? String((inv as any).eway_distance_km) : "");
      setGenerateEway(!!_eway);

      const { data: lineData } = await supabase
        .from("bill_lines")
        .select("*")
        .eq("bill_id", sourceId)
        .order("sort_order");

      if (lineData?.length) {
        setLines(lineData.map((l) => ({
          id: duplicateId ? crypto.randomUUID() : l.id,
          item_id: l.item_id,
          name: l.name,
          description: l.description || "",
          unit: l.unit || "pcs",
          quantity: Number(l.quantity),
          rate: Number(l.rate),
          discount: Number(l.discount),
          discount_type: l.discount_type as any,
          tax_id: l.tax_id,
          tax_amount: Number(l.tax_amount),
          amount: Number(l.amount),
          hsn_code: (l as any).hsn_code || "",
          sub_unit: (l as any).sub_unit || "",
          sub_unit_conversion_rate: Number((l as any).sub_unit_conversion_rate) || 1,
        })));
      }
    };
    loadBill();
  }, [id, duplicateId, org?.id, vendors]);

  // Fetch vendor pending bills when vendor changes
  useEffect(() => {
    if (!vendorId || !org?.id) { setVendorBills([]); return; }
    const fetchVendorBills = async () => {
      const { data } = await supabase
        .from("bills")
        .select("total, balance_due, due_date, status")
        .eq("vendor_id", vendorId)
        .eq("org_id", org.id)
        .neq("status", "void")
        .neq("status", "draft");
      setVendorBills(data || []);
    };
    fetchVendorBills();
  }, [vendorId, org?.id]);

  const vendorAgingSummary = useMemo(() => {
    if (!vendorBills.length) return null;
    const today = new Date();
    let totalDue = 0;
    let over15 = 0;
    let over45 = 0;
    let totalBilled = 0;

    vendorBills.forEach((inv) => {
      totalBilled += Number(inv.total);
      const bal = Number(inv.balance_due);
      if (bal <= 0) return;
      totalDue += bal;
      const dueDt = new Date(inv.due_date);
      const daysPast = Math.floor((today.getTime() - dueDt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysPast > 45) over45 += bal;
      else if (daysPast > 15) over15 += bal;
    });

    return { totalBilled, totalDue, over15, over45 };
  }, [vendorBills]);


  const calculateLine = useCallback((line: LineItem, ratio = 1): LineItem => {
    const lineSubtotal = (Number(line.quantity) || 0) * (Number(line.rate) || 0);
    
    // Add item specific discount if applicable
    const itemDiscount = line.discount_type === "percentage"
      ? lineSubtotal * ((Number(line.discount) || 0) / 100)
      : (Number(line.discount) || 0);
      
    const lineTaxable = Math.max(0, lineSubtotal - itemDiscount);
    
    let tax_amount = 0;
    let tax_rate = 0;
    if (line.tax_id) {
      const slab = INDIAN_GST_SLABS.find(s => s.id === line.tax_id);
      const taxRateObj = taxRates.find((t: any) => t.id === line.tax_id);
      tax_rate = slab ? slab.rate : (taxRateObj ? Number(taxRateObj.rate) : 0);
      const effectiveLineTaxable = lineTaxable * ratio;
      tax_amount = effectiveLineTaxable * (tax_rate / 100);
    }
    
    return { ...line, tax_amount, tax_rate, amount: lineTaxable + tax_amount };
  }, [taxRates]);

  const handleLineChange = (index: number, field: string, value: any) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addLine = () => setLines((prev) => [...prev, createEmptyLine()]);
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLines((prev) => {
        const oldIndex = prev.findIndex((l) => l.id === active.id);
        const newIndex = prev.findIndex((l) => l.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  // State Detection (normalizes 2-digit code from GSTIN, state code, or full state name)
  const orgState = useMemo(() => {
    return extractEntityState(org);
  }, [org]);

  const selectedVendor = useMemo(() => vendors.find(c => c.id === vendorId), [vendorId, vendors]);

  const baseVendorState = useMemo(() => {
    return extractEntityState(selectedVendor);
  }, [selectedVendor]);

  const vendorState = normalizeStateCode(vendorStateOverride) || baseVendorState;

  const isInterstate = Boolean(orgState && vendorState && orgState !== vendorState);

  // Totals
  const rawSubtotal = lines.reduce((s, l) => s + ((Number(l.quantity) || 0) * (Number(l.rate) || 0)), 0);
  const totalDiscount = discountType === "percentage" ? rawSubtotal * (discount / 100) : discount;
  const discountedSubtotal = Math.max(0, rawSubtotal - totalDiscount);
  const discountRatio = rawSubtotal > 0 ? discountedSubtotal / rawSubtotal : 1;

  const cleanTdsTcsRate = Math.max(0, parseFloat(String(tdsTcsRate)) || 0);
  const isTds = Boolean(tdsTcsApplicable && tdsTcsType === "tds" && cleanTdsTcsRate > 0);
  const tdsFactor = isTds ? (1 - cleanTdsTcsRate / 100) : 1;
  const effectiveLineRatio = discountRatio * tdsFactor;
  
  // Calculate item-wise totals
  const calculatedLines = lines.map(line => calculateLine(line, effectiveLineRatio));
  const subtotal = calculatedLines.reduce((s, l) => s + ((Number(l.quantity) || 0) * (Number(l.rate) || 0)), 0);
  
  // Aggregate Taxes
  const taxBreakdownMap: Record<string, { id: string, name: string, rate: number, amount: number }> = {};
  
  let maxTaxRate = 0;
  calculatedLines.forEach(line => {
    if (line.tax_id && line.tax_amount > 0) {
      const tax = taxRates.find((t: any) => t.id === line.tax_id);
      if (tax) {
        const rate = Number(tax.rate);
        if (rate > maxTaxRate) maxTaxRate = rate;
        if (isInterstate) {
          const key = `IGST_${rate}`;
          if (!taxBreakdownMap[key]) taxBreakdownMap[key] = { id: key, name: `IGST @ ${rate}%`, rate, amount: 0 };
          taxBreakdownMap[key].amount += line.tax_amount;
        } else {
          const cgstKey = `CGST_${rate/2}`;
          const sgstKey = `SGST_${rate/2}`;
          if (!taxBreakdownMap[cgstKey]) taxBreakdownMap[cgstKey] = { id: cgstKey, name: `CGST @ ${rate/2}%`, rate: rate/2, amount: 0 };
          if (!taxBreakdownMap[sgstKey]) taxBreakdownMap[sgstKey] = { id: sgstKey, name: `SGST @ ${rate/2}%`, rate: rate/2, amount: 0 };
          taxBreakdownMap[cgstKey].amount += line.tax_amount / 2;
          taxBreakdownMap[sgstKey].amount += line.tax_amount / 2;
        }
      }
    }
  });

  const cleanExpenses = Math.max(0, Number(expenses) || 0);
  const cleanShipping = Math.max(0, Number(shippingCharge) || 0);
  const baseAmountBeforeTds = discountedSubtotal + cleanExpenses + cleanShipping;

  if (maxTaxRate > 0 && (cleanShipping > 0 || cleanExpenses > 0)) {
    const extraTaxBase = (cleanShipping + cleanExpenses) * tdsFactor;
    const extraTaxAmount = extraTaxBase * (maxTaxRate / 100);
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
  const totalTax = taxBreakdown.reduce((s, t) => s + t.amount, 0);

  // TDS is calculated BEFORE GST on Base Value and DEDUCTED (-)
  const tdsAmount = isTds ? (baseAmountBeforeTds * cleanTdsTcsRate) / 100 : 0;

  // Taxable Amount (Net Basic Value after Discount and TDS)
  const taxableAmount = Math.max(0, baseAmountBeforeTds - tdsAmount);

  // Total with GST (Net Taxable Amount + GST)
  const totalWithGst = taxableAmount + totalTax;

  // TCS is calculated AFTER GST on Total Value with GST (Net Taxable Amount + GST) and ADDED (+)
  const tcsAmount = (tdsTcsApplicable && tdsTcsType === "tcs")
    ? (totalWithGst * cleanTdsTcsRate) / 100
    : 0;

  const tdsTcsAmount = isTds ? tdsAmount : tcsAmount;
  const rawTotalBeforeRoundOff = totalWithGst + tcsAmount;
  let finalAdjustment = adjustment;
  if (autoRoundOff) {
    const rounded = Math.round(rawTotalBeforeRoundOff);
    finalAdjustment = rounded - rawTotalBeforeRoundOff;
  }
  const total = Math.max(0, rawTotalBeforeRoundOff + finalAdjustment);
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

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
    handleSave("received", action);
  };

  const handleSave = async (status: "draft" | "received" = "received", postAction?: "email") => {
    if (isSavingRef.current || saving) return;
    isSavingRef.current = true;
    setSaving(true);

    try {
      if (!org) return;
      if (!vendorId) {
        toast({ title: "Please select a vendor", variant: "destructive" });
        return;
      }
      if (!id) {
        const isUnlimited = hasUnlimitedBills(plan, activeOrgPlans);
        if (!isUnlimited) {
          const { count } = await supabase
            .from("bills")
            .select("id", { count: "exact", head: true })
            .eq("org_id", org.id);
          if ((count || 0) >= 100) {
            toast({
              title: "Purchase Invoice Limit Reached (100)",
              description: "Free plan allows up to 100 Purchase Invoices. Please upgrade to Business Suite for unlimited purchase invoices!",
              variant: "destructive"
            });
            setShowUpgradeModal(true);
            return;
          }
        }
      }
    // Auto-remove empty/blank lines before saving
    const validLines = lines.filter((l) => l.name.trim() || l.rate > 0 || l.quantity > 0);
    if (!validLines.length) {
      toast({ title: "Add at least one line item", variant: "destructive" });
      return;
    }
    setLines(validLines);

    // Non-blocking negative-stock warning (only when deducting)
    if (deductStock) {
      const restorePrev: Record<string, number> = {};
      if (prevDeductStock && id) {
        const { data: prev } = await supabase.from("bill_lines").select("item_id, quantity").eq("bill_id", id);
        for (const p of prev || []) {
          if (p.item_id) restorePrev[p.item_id] = (restorePrev[p.item_id] || 0) + Number(p.quantity || 0);
        }
      }
      const warnings = await detectNegativeStock(
        validLines.map((l) => ({ item_id: l.item_id, quantity: Number(l.quantity) || 1, name: l.name })),
        { restorePrevQty: restorePrev }
      );
      if (warnings.length) {
        toast({
          title: "Low stock warning",
          description: warnings.slice(0, 3).map((w) => `${w.name}: need ${w.requested}, have ${w.available}`).join(" • "),
          variant: "destructive",
        });
      }
    }

      const extraData = {
        tds_tcs_applicable: tdsTcsApplicable,
        tds_tcs_type: tdsTcsType,
        tds_tcs_rate: cleanTdsTcsRate,
        tds_tcs_amount: tdsTcsAmount,
        autoRoundOff,
        includeBankDetails,
        showTerms,
        showNotes,
        showSignature,
        deduct_stock: deductStock,
      };

      const billPayload = {
        org_id: org!.id,
        vendor_id: vendorId,
        bill_number: billNumber,
        vendor_bill_number: vendorBillNumber,
        bill_date: billDate,
        due_date: dueDate,
        currency: org!.currency_code,
        discount: totalDiscount,
        subtotal,
        tax_total: totalTax,
        total,
        balance_due: total - amountPaid,
        amount_paid: amountPaid,
        status: (total - amountPaid) <= 0 && amountPaid > 0 ? "paid" : (amountPaid > 0 ? "partial" : status),
        tds_tcs_applicable: tdsTcsApplicable,
        tds_tcs_type: tdsTcsType,
        tds_tcs_rate: cleanTdsTcsRate,
        round_off: finalAdjustment,
        tds_tcs_amount: tdsTcsAmount,
        notes: (notes || "") + "\n\n---EXTRA_DATA---\n" + JSON.stringify(extraData),
        terms,
        grn_id: linkedGrnId || null,
      };

      let billId = id;
      // Capture previous lines for stock restoration on edit
      let prevLines: any[] = [];
      if (id) {
        const { data: existing } = await supabase.from("bill_lines").select("item_id, quantity").eq("bill_id", id);
        prevLines = existing || [];
        const { error } = await supabase.from("bills").update(billPayload).eq("id", id);
        if (error) throw error;
        // Delete old lines and re-insert
        await supabase.from("bill_lines").delete().eq("bill_id", id);
      } else {
        let currentPayload = { ...billPayload };
        let insertData = null;
        let retryCount = 0;
        while (retryCount < 5) {
          const { data, error } = await supabase.from("bills").insert(currentPayload).select().single();
          if (error) {
            if (error.code === "23505" && (error.message.includes("bill_number") || error.message.includes("bills_org_id_bill_number_key"))) {
              const { data: recentBills } = await supabase
                .from("bills")
                .select("bill_number")
                .eq("org_id", org!.id)
                .order("created_at", { ascending: false })
                .limit(100);
              let maxNum = 0;
              recentBills?.forEach((b: any) => {
                const m = (b.bill_number || "").match(/(\d+)$/);
                if (m) {
                  const n = parseInt(m[1], 10);
                  if (n > maxNum) maxNum = n;
                }
              });
              const { data: currentOrg } = await supabase.from("organizations").select("next_bill_number, bill_prefix").eq("id", org!.id).single();
              const baseNum = Math.max(currentOrg?.next_bill_number || 1, maxNum + 1);
              const nextNum = baseNum + retryCount;
              const formattedBill = formatSequenceNumber(currentOrg?.bill_prefix || "BILL", nextNum, "BILL");
              currentPayload.bill_number = formattedBill;
              setBillNumber(formattedBill);
              retryCount++;
              continue;
            }
            throw error;
          }
          insertData = data;
          break;
        }
        if (!insertData) {
          throw new Error("Failed to generate a unique bill number. Please try again.");
        }
        billId = insertData.id;
        // Instantly update browser URL so if the user refreshes, they never see blank entries on /purchase-invoices/new
        window.history.replaceState(null, "", `/purchase-invoices/${billId}`);
        const insertedNumMatch = (currentPayload.bill_number || "").match(/(\d+)$/);
        const savedSeq = insertedNumMatch ? parseInt(insertedNumMatch[1], 10) : 1;
        const { data: latestOrg } = await supabase.from("organizations").select("next_bill_number").eq("id", org!.id).single();
        const nextTarget = Math.max(latestOrg?.next_bill_number || 1, savedSeq + 1);
        await supabase.from("organizations").update({ next_bill_number: nextTarget }).eq("id", org!.id);
      }

      // Auto-create missing items in items catalog & update existing items with sales_price/unit
      for (const l of calculatedLines) {
        if (!l.name?.trim()) continue;

        let currentItemId = l.item_id;

        if (!currentItemId) {
          // Check if item already exists with matching name
          const { data: existingItem } = await supabase
            .from("items")
            .select("id, unit_price, purchase_price, stock_quantity, type, unit")
            .eq("org_id", org!.id)
            .ilike("name", l.name.trim())
            .maybeSingle();

          if (existingItem) {
            currentItemId = existingItem.id;
            l.item_id = existingItem.id;
            const updates: any = {};
            if (Number(l.rate) > 0) updates.purchase_price = Number(l.rate);
            if (l.sales_price !== undefined && l.sales_price !== "" && Number(l.sales_price) > 0) {
              updates.unit_price = Number(l.sales_price);
            }
            if (l.unit) updates.unit = l.unit;
            if (Object.keys(updates).length > 0) {
              await supabase.from("items").update(updates).eq("id", existingItem.id);
            }
          } else if (deductStock) {
            // Auto-create new product item in items catalog
            const purchasePrice = Number(l.rate) || 0;
            const salesPrice = (l.sales_price !== undefined && l.sales_price !== "" && Number(l.sales_price) > 0)
              ? Number(l.sales_price)
              : purchasePrice;

            const { data: newItem, error: createItemErr } = await supabase
              .from("items")
              .insert({
                org_id: org!.id,
                name: l.name.trim(),
                type: "product",
                description: l.description || null,
                unit: l.unit || "pcs",
                purchase_price: purchasePrice,
                unit_price: salesPrice,
                stock_quantity: 0, // Will be incremented by delta logic below
                tax_id: l.tax_id || null,
                hsn_code: l.hsn_code?.trim() || null,
                is_active: true,
              })
              .select()
              .single();

            if (!createItemErr && newItem) {
              currentItemId = newItem.id;
              l.item_id = newItem.id;
              setCatalogItems((prev) => [...prev, newItem]);
            }
          }
        } else {
          // Existing item: update purchase_price, sales_price, and unit if specified
          const updates: any = {};
          if (Number(l.rate) > 0) updates.purchase_price = Number(l.rate);
          if (l.sales_price !== undefined && l.sales_price !== "" && Number(l.sales_price) > 0) {
            updates.unit_price = Number(l.sales_price);
          }
          if (l.unit) updates.unit = l.unit;
          if (Object.keys(updates).length > 0) {
            await supabase.from("items").update(updates).eq("id", currentItemId);
          }
        }
      }

      // Insert lines
      const linePayloads = calculatedLines
        .filter((l) => l.name.trim() || l.rate > 0)
        .map((l, i) => ({
          bill_id: billId!,
          org_id: org!.id,
          item_id: l.item_id,
          description: l.name + (l.description ? `\n${l.description}` : ""),
          unit: l.unit || "pcs",
          quantity: Number(l.quantity) || 1,
          rate: Number(l.rate) || 0,
          discount: l.discount_amount || 0,
          tax_rate: l.tax_rate,
          tax_amount: l.tax_amount || 0,
          amount: l.amount,
          sort_order: i,
          hsn: l.hsn_code?.trim() || null,
        }));

      const { error: lineError } = await supabase.from("bill_lines").insert(linePayloads);
      if (lineError) throw lineError;

      // Inventory: adjust stock for product items (only when bill opts in AND is not linked to GRN)
      // Purchase bill = stock INCREASES. If linked to GRN, stock was already received in GRN!
      if (!linkedGrnId && (prevDeductStock || deductStock)) {
        const delta: Record<string, number> = {};
        if (prevDeductStock) {
          for (const pl of prevLines) {
            if (pl.item_id) delta[pl.item_id] = (delta[pl.item_id] || 0) - Number(pl.quantity || 0);
          }
        }
        if (deductStock) {
          for (const ln of linePayloads) {
            if (ln.item_id) delta[ln.item_id] = (delta[ln.item_id] || 0) + Number(ln.quantity || 0);
          }
        }
        let stockToastMessages: string[] = [];
        const itemIds = Object.keys(delta).filter((k) => delta[k] !== 0);
        if (itemIds.length) {
          const { data: itemsForStock } = await supabase.from("items").select("id, name, type, stock_quantity").in("id", itemIds);
          const movements: Parameters<typeof logStockMovements>[0] = [];
          for (const it of itemsForStock || []) {
            if (it.type !== "product") continue;
            const oldQty = Number(it.stock_quantity || 0);
            const newQty = Math.max(0, oldQty + delta[it.id]);
            await supabase.from("items").update({ stock_quantity: newQty }).eq("id", it.id);
            movements.push({
              orgId: org!.id,
              itemId: it.id,
              changeQty: delta[it.id],
              balanceAfter: newQty,
              reason: id ? "Purchase bill updated" : "Purchase bill created",
              refType: "bill",
              refId: billId!,
              refNumber: billNumber,
              createdBy: user?.id || null,
            });
            stockToastMessages.push(`${it.name}: Prev ${oldQty} → Updated ${newQty}`);
          }
          await logStockMovements(movements);
        }
        setPrevDeductStock(deductStock);
        if (stockToastMessages.length) {
          (window as any).__lastStockMessages = stockToastMessages;
        }
      }

      // Save custom fields
      if (billId && Object.keys(customFieldValues).length > 0) {
        await saveCustomFieldValues(billId, customFieldValues);
      }

      // Audit log
      if (org && user) {
        await logAudit({
          orgId: org.id, userId: user.id, entityType: "bill",
          entityId: billId, action: id ? "update" : "create",
          description: `Bill ${billNumber} ${id ? "updated" : "created"} (${status})`,
        });
      }

      if (postAction === "email") {
        const vendor = vendors.find(v => v.id === vendorId);
        if (vendor?.email) {
          navigate(`/purchase-invoices/${billId}?sendEmail=true`);
          toast({ title: "Saving and generating PDF..." });
          setSaving(false);
          return;
        }
      } else {
        const stockMsgs = (window as any).__lastStockMessages as string[] | undefined;
        let desc = stockMsgs && stockMsgs.length > 0 
          ? "Product added to inventory.\n" + stockMsgs.join("\n")
          : undefined;
          
        toast({ 
          title: status === "received" ? "Purchase invoice saved!" : "Purchase invoice saved as draft!",
          description: desc,
        });
        (window as any).__lastStockMessages = undefined;
      }

      navigate(`/purchase-invoices/${billId}`, { replace: true });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      isSavingRef.current = false;
      setSaving(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave("draft");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [vendorId, lines, subtotal]);

  // Auto-save every 60s
  useEffect(() => {
    if (!vendorId || !lines.some((l) => l.name.trim())) return;
    const interval = setInterval(() => {
      if (id) handleSave("draft");
    }, 60000);
    return () => clearInterval(interval);
  }, [id, vendorId, lines]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <ContactPromptDialog
        open={contactPromptOpen}
        onOpenChange={setContactPromptOpen}
        entityType="vendor"
        entityId={vendorId || ""}
        entityName={vendors.find(v => v.id === vendorId)?.display_name || ""}
        missingField={contactPromptMissing}
        onSuccess={(val) => {
          setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, [contactPromptMissing]: val } : v));
          if (pendingAction) handleSave("received", pendingAction);
        }}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate("/purchase-invoices")} title="Back to Purchase Invoices">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{id ? "Edit Purchase Invoice" : "New Purchase Invoice"}</h1>
        </div>
        <div className="flex gap-2">
          <BillSettingsSheet />
          <Button variant="outline" onClick={() => navigate("/purchase-invoices")}>Cancel</Button>
          <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving}>
            <Save className="mr-1.5 h-4 w-4" /> Save as Draft
          </Button>
          <div className="flex">
            <Button className="rounded-r-none font-semibold shadow-sm" onClick={() => handleSave("received")} disabled={saving}>
              {saving ? <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              {saving ? "Saving..." : "Save Purchase Invoice"}
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

                <DropdownMenuItem onClick={async () => { await handleSave("received"); setTimeout(() => window.print(), 500); }}>
                  <Printer className="mr-2 h-4 w-4" /> Save and Print
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  await handleSave("received");
                  if (id) {
                    const { data: existing } = await supabase.from("portal_tokens").select("token").eq("entity_type", "bill").eq("entity_id", id).maybeSingle();
                    let token = existing?.token;
                    if (!token) {
                      const { data } = await supabase.from("portal_tokens").insert({ org_id: org!.id, entity_type: "bill", entity_id: id }).select("token").single();
                      token = data?.token;
                    }
                    if (token) {
                      await navigator.clipboard.writeText(`${window.location.origin}/portal/${token}`);
                      toast({ title: "Purchase invoice saved & portal link copied!" });
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

      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Vendor *</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      className="h-9"
                      placeholder="Type to search vendors..."
                      value={vendorSearch}
                      onChange={(e) => {
                        setVendorSearch(e.target.value);
                        setVendorDropdownOpen(true);
                        if (!e.target.value) setVendorId("");
                      }}
                      onFocus={() => setVendorDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setVendorDropdownOpen(false), 200)}
                    />
                    <button
                      type="button"
                      className="absolute right-0 top-0 h-9 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground"
                      onClick={() => setVendorDropdownOpen(!vendorDropdownOpen)}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    {vendorDropdownOpen && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
                        {vendors
                          .filter((c) => !vendorSearch.trim() || c.display_name.toLowerCase().includes(vendorSearch.toLowerCase()))
                          .map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${vendorId === c.id ? "bg-accent/50 font-medium" : ""}`}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setVendorId(c.id);
                                setVendorSearch(c.display_name);
                                setVendorDropdownOpen(false);
                              }}
                            >
                              {c.display_name}
                            </button>
                          ))}
                        {vendors.filter((c) => !vendorSearch.trim() || c.display_name.toLowerCase().includes(vendorSearch.toLowerCase())).length === 0 && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No vendors found</div>
                        )}
                      </div>
                    )}
                  </div>
                  <Button type="button" variant="outline" size="icon" onClick={() => setAddVendorOpen(true)} title="Add New Vendor">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <AddVendorDialog open={addVendorOpen} onOpenChange={setAddVendorOpen} onVendorAdded={(c) => { setVendors(prev => [...prev, c]); setVendorId(c.id); setVendorSearch(c.display_name); }} />
                <ItemFormDialog 
                  open={addItemOpen} 
                  onOpenChange={setAddItemOpen} 
                  taxRates={taxRates} 
                  onItemSaved={(item) => { if (item) setCatalogItems(prev => [...prev, item]); }}
                  onItemAdded={(item) => { if (item) setCatalogItems(prev => [...prev, item]); }} 
                />
                {vendorId && vendorAgingSummary && vendorAgingSummary.totalDue > 0 && (
                  <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-400">
                      <AlertTriangle className="h-4 w-4" />
                      Vendor Pending Summary
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md bg-background p-2 border">
                        <span className="text-muted-foreground">Total Billed</span>
                        <p className="font-bold text-foreground">{formatCurrency(vendorAgingSummary.totalBilled, org?.currency_code || "INR")}</p>
                      </div>
                      <div className="rounded-md bg-background p-2 border border-destructive/30">
                        <span className="text-muted-foreground">Total Due</span>
                        <p className="font-bold text-destructive">{formatCurrency(vendorAgingSummary.totalDue, org?.currency_code || "INR")}</p>
                      </div>
                      {vendorAgingSummary.over15 > 0 && (
                        <div className="rounded-md bg-background p-2 border border-orange-300 dark:border-orange-700">
                          <span className="text-muted-foreground">15+ Days Overdue</span>
                          <p className="font-bold text-orange-600 dark:text-orange-400">{formatCurrency(vendorAgingSummary.over15, org?.currency_code || "INR")}</p>
                        </div>
                      )}
                      {vendorAgingSummary.over45 > 0 && (
                        <div className="rounded-md bg-background p-2 border border-destructive/50">
                          <span className="text-muted-foreground">45+ Days Overdue</span>
                          <p className="font-bold text-destructive">{formatCurrency(vendorAgingSummary.over45, org?.currency_code || "INR")}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">
                  <Label className="text-muted-foreground flex items-center gap-1.5">Vendor Invoice Number</Label>
                  <Input 
                    value={vendorBillNumber} 
                    onChange={e => setVendorBillNumber(e.target.value)} 
                    className="h-11 bg-white border-muted font-medium text-blue-600 focus-visible:ring-blue-500 shadow-sm"
                    placeholder="Original Invoice No (e.g. VEN-101)"
                  />
                </div>
                
                {/* State Override if Vendor State is missing */}
                {vendorId && !vendorState && (
                  <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                      <AlertTriangle className="h-4 w-4" />
                      Vendor state missing
                    </div>
                    <p className="text-xs text-yellow-600 dark:text-yellow-500">
                      Select the vendor's state to correctly calculate CGST/SGST vs IGST.
                    </p>
                    <Select value={vendorStateOverride} onValueChange={async (val) => {
                      setVendorStateOverride(val);
                      if (selectedVendor?.id) {
                        const existingAddr = (selectedVendor.billing_address && typeof selectedVendor.billing_address === 'object') ? selectedVendor.billing_address : {};
                        const updatedAddr = { ...existingAddr, state: val };
                        await supabase.from("vendors").update({ billing_address: updatedAddr }).eq("id", selectedVendor.id);
                        setVendors(prev => prev.map(c => c.id === selectedVendor.id ? { ...c, billing_address: updatedAddr } : c));
                        toast({ title: "Vendor state saved", description: "State saved to vendor profile." });
                      }
                    }}>
                      <SelectTrigger className="h-8 text-xs bg-white dark:bg-background">
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {INDIAN_STATES.map((state) => (
                          <SelectItem key={state.code} value={state.code}>{state.name} ({state.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4">
              {paymentTerms === 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Purchase Invoice #</Label>
                      <button
                        type="button"
                        onClick={() => setPaymentTerms(30)}
                        className="text-[10px] text-blue-600 hover:underline"
                      >
                        + Add Due Date
                      </button>
                    </div>
                    <Input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Issue Date</Label>
                      <span className="text-[10px] text-muted-foreground font-medium">Due on Receipt (0d)</span>
                    </div>
                    <Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Purchase Invoice #</Label>
                      <Input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Terms</Label>
                      <Select value={String(paymentTerms)} onValueChange={(v) => setPaymentTerms(parseInt(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">Net 15</SelectItem>
                          <SelectItem value="30">Net 30</SelectItem>
                          <SelectItem value="45">Net 45</SelectItem>
                          <SelectItem value="60">Net 60</SelectItem>
                          <SelectItem value="0">Due on Receipt (0 days)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Issue Date</Label>
                      <Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      
  
      {/* Custom Fields */}
      <CustomFieldsForm entityType="bill" entityId={id} onChange={setCustomFieldValues} />

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="text-base">Line Items</CardTitle>
          <Button variant="outline" size="sm" onClick={() => { setBulkSelected(new Set()); setBulkAddOpen(true); }}>
            <Layers className="mr-1 h-4 w-4" /> Bulk Add
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider grid grid-cols-12 gap-2 px-6 pb-2 border-b">
            <div className="col-span-4">Item Details</div>
            <div className="col-span-2 text-center">Quantity &amp; Unit</div>
            <div className="col-span-2 text-right">Rates (Buy / Sell)</div>
            <div className="col-span-2 text-left pl-2">Tax</div>
            <div className="col-span-2 text-right">Amount</div>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={lines.map((l) => l.id)} strategy={verticalListSortingStrategy}>
              {lines.map((line, index) => (
                <SortableLineItem
                  key={line.id}
                  line={calculatedLines[index] || line}
                  index={index}
                  taxRates={taxRates}
                  items={catalogItems}
                  onChange={handleLineChange}
                  onRemove={removeLine}
                  onAddItem={() => setAddItemOpen(true)}
                  currency={org?.currency_code || "INR"}
                  org={org}
                />
              ))}
            </SortableContext>
          </DndContext>
          <Button variant="outline" size="sm" onClick={addLine} className="mt-3 text-xs border-dashed text-primary hover:text-primary hover:bg-primary/5">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> + Click here to add new item
          </Button>
        </CardContent>
      </Card>

      {/* Bulk Add Items Dialog */}
      <Dialog open={bulkAddOpen} onOpenChange={setBulkAddOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Add Items</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {catalogItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No items in catalog. Add items first.</p>
            ) : (
              <>
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox
                    checked={bulkSelected.size === catalogItems.length}
                    onCheckedChange={(checked) => {
                      if (checked) setBulkSelected(new Set(catalogItems.map((i: any) => i.id)));
                      else setBulkSelected(new Set());
                    }}
                  />
                  <span className="text-sm font-medium">Select All ({catalogItems.length} items)</span>
                </div>
                {catalogItems.map((item: any) => (
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
                    <span className="text-sm font-medium">{formatCurrency(Number(item.unit_price), org?.currency_code || "INR")}</span>
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
                const newLines: LineItem[] = [];
                bulkSelected.forEach((itemId) => {
                  const item = catalogItems.find((i: any) => i.id === itemId);
                  if (item) {
                    let line = createEmptyLine();
                    line.item_id = item.id;
                    line.name = item.name;
                    let extraDesc = "";
                    if (item.custom_field_values && item.custom_field_values.length > 0) {
                      extraDesc = item.custom_field_values
                        .filter((cf: any) => cf.value)
                        .map((cf: any) => `${cf.custom_field_definitions?.field_name}: ${cf.value}`)
                        .join("\n");
                    }
                    line.description = item.description ? (extraDesc ? `${item.description}\n${extraDesc}` : item.description) : extraDesc;
                    line.rate = Number(item.unit_price);
                    line.unit = item.unit || "pcs";
                    line.quantity = 1;
                    line.hsn_code = item.hsn_code || "";
                    line.tax_id = item.tax_id || null;
                    // Calculate amount
                    line.amount = line.quantity * line.rate;
                    newLines.push(line);
                  }
                });
                setLines((prev) => {
                  const filtered = prev.filter((l) => l.name || l.rate > 0);
                  return [...filtered, ...newLines];
                });
                setBulkAddOpen(false);
                toast({ title: `${newLines.length} items added` });
              }}
            >
              Add {bulkSelected.size} Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Totals & Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {(billShowNotes || billShowTerms || billShowDisplayOptions) && (
            <div className={`grid grid-cols-1 ${
              [billShowNotes, billShowTerms, billShowDisplayOptions].filter(Boolean).length === 3
                ? "md:grid-cols-3"
                : [billShowNotes, billShowTerms, billShowDisplayOptions].filter(Boolean).length === 2
                ? "md:grid-cols-2"
                : "md:grid-cols-1"
            } gap-6`}>
              {billShowNotes && (
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
                      placeholder="Notes visible on bill..."
                      className="resize-none bg-slate-50/50 border-slate-200 text-sm"
                      maxLength={500}
                    />
                    <div className="text-right text-xs text-slate-400 mt-2">{notes.length} / 500</div>
                  </CardContent>
                </Card>
              )}

              {billShowTerms && (
                <Card className="shadow-sm border-slate-200">
                  <CardHeader className="pb-3 border-b bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 bg-blue-100 text-blue-700 rounded-md flex items-center justify-center">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <CardTitle className="text-sm font-semibold text-blue-700">Terms</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <Textarea 
                      value={terms} 
                      onChange={e => setTerms(e.target.value)} 
                      rows={3} 
                      placeholder="Payment terms, late fees..."
                      className="resize-none bg-slate-50/50 border-slate-200 text-sm"
                    />
                  </CardContent>
                </Card>
              )}

              {billShowDisplayOptions && (
                <Card className="shadow-sm border-slate-200">
                  <CardHeader className="pb-3 border-b bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 bg-blue-100 text-blue-700 rounded-md flex items-center justify-center">
                        <Eye className="h-3.5 w-3.5" />
                      </div>
                      <CardTitle className="text-sm font-semibold text-blue-700">Display Options</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded-md transition-colors">
                      <Checkbox checked={autoRoundOff} onCheckedChange={(v) => setAutoRoundOff(!!v)} />
                      <span className="text-sm font-medium text-slate-700">Auto Round Off Total</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded-md transition-colors">
                      <Checkbox checked={includeBankDetails} onCheckedChange={(v) => setIncludeBankDetails(!!v)} />
                      <span className="text-sm font-medium text-slate-700">Show Bank / UPI Details</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded-md transition-colors">
                      <Checkbox checked={showTerms} onCheckedChange={(v) => setShowTerms(!!v)} />
                      <span className="text-sm font-medium text-slate-700">Show Terms</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded-md transition-colors">
                      <Checkbox checked={showNotes} onCheckedChange={(v) => setShowNotes(!!v)} />
                      <span className="text-sm font-medium text-slate-700">Show Notes</span>
                    </label>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          {/* Action Options: Stock & Signature */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {linkedGrnId ? (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/70 dark:bg-amber-950/20 dark:border-amber-800 p-3">
                <div className="text-sm">
                  <div className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <span>🔒</span> Stock Addition Locked (GRN)
                  </div>
                  <div className="text-xs text-amber-700/90 dark:text-amber-400 mt-1">
                    Product quantities were already added to inventory upon Goods Receipt (GRN). This bill will not add stock again to prevent duplicate inventory.
                  </div>
                </div>
              </div>
            ) : (
              <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40 transition-colors">
                <Checkbox
                  checked={deductStock}
                  onCheckedChange={(v) => setDeductStock(!!v)}
                  className="mt-0.5"
                />
                <div className="text-sm space-y-0.5">
                  <div className="font-medium">Add stock to inventory</div>
                  <div className="text-xs text-muted-foreground">
                    When saved, product item quantities on this purchase bill will be added to stock.
                  </div>
                </div>
              </label>
            )}

            {/* Signature Toggle */}
            <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40 transition-colors">
              <Checkbox
                id="show-signature"
                checked={showSignature}
                onCheckedChange={(checked) => {
                  if (checked && (!org?.address?.signature_type || org.address.signature_type === 'none')) {
                    toast({ title: "No signature found", description: "Please upload or select your signature in Settings > Invoices" });
                    return;
                  }
                  setShowSignature(!!checked);
                }}
                className="mt-0.5"
              />
              <div className="text-sm space-y-0.5">
                <div className="font-medium">Include Authorized Signature</div>
                <div className="text-xs text-muted-foreground">
                  Print company stamp and authorized signatory on purchase documents.
                </div>
              </div>
            </label>
          </div>

          {/* Phase 5 — Opt-in Compliance */}
          {billShowCompliance && (
            <div className="space-y-2 rounded-md border p-3">
              <div className="text-sm font-medium">Compliance (optional)</div>
              <p className="text-xs text-muted-foreground">
                Tick to record IRN / E-way bill details. Nothing is generated automatically — paste the values you receive from the GST / NIC portal.
              </p>

              <label className="flex items-start gap-2 cursor-pointer mt-2">
                <Checkbox checked={generateIrn} onCheckedChange={(v) => setGenerateIrn(!!v)} className="mt-0.5" />
                <span className="text-sm font-medium">E-bill (IRN) details</span>
              </label>
              {generateIrn && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pl-6">
                  <div className="md:col-span-3">
                    <Label className="text-xs">IRN</Label>
                    <Input value={irn} onChange={(e) => setIrn(e.target.value)} placeholder="64-char hash" className="h-8 text-xs font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs">Ack No.</Label>
                    <Input value={ackNo} onChange={(e) => setAckNo(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Ack Date</Label>
                    <Input type="date" value={ackDate} onChange={(e) => setAckDate(e.target.value)} className="h-8 text-xs" />
                  </div>
                </div>
              )}

              <label className="flex items-start gap-2 cursor-pointer mt-2">
                <Checkbox checked={generateEway} onCheckedChange={(v) => setGenerateEway(!!v)} className="mt-0.5" />
                <span className="text-sm font-medium">E-way bill details</span>
              </label>
              {generateEway && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pl-6">
                  <div>
                    <Label className="text-xs">EWB No.</Label>
                    <Input value={ewayBillNo} onChange={(e) => setEwayBillNo(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Valid Until</Label>
                    <Input type="date" value={ewayValidUntil} onChange={(e) => setEwayValidUntil(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Vehicle No.</Label>
                    <Input value={ewayVehicleNo} onChange={(e) => setEwayVehicleNo(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Transport Mode</Label>
                    <Select value={ewayTransportMode} onValueChange={setEwayTransportMode}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="road">Road</SelectItem>
                        <SelectItem value="rail">Rail</SelectItem>
                        <SelectItem value="air">Air</SelectItem>
                        <SelectItem value="ship">Ship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Distance (km)</Label>
                    <Input type="number" value={ewayDistanceKm} onChange={(e) => setEwayDistanceKm(e.target.value)} className="h-8 text-xs" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm gap-2">
              <span className="text-muted-foreground">Discount</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  onKeyDown={(e) => {
                    if (e.key === "-" || e.key === "e") e.preventDefault();
                  }}
                  className="h-7 w-16 text-xs text-right"
                  value={discount}
                  onChange={(e) => {
                    let val = parseFloat(e.target.value) || 0;
                    val = Math.max(0, val);
                    if (discountType === "percentage" && val > 100) val = 100;
                    setDiscount(val);
                  }}
                />
                <Select value={discountType} onValueChange={(v) => {
                    setDiscountType(v as any);
                    if (v === "percentage" && discount > 100) setDiscount(100);
                  }}>
                  <SelectTrigger className="h-7 w-14 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">%</SelectItem>
                    <SelectItem value="fixed">₹</SelectItem>
                  </SelectContent>
                </Select>
                {totalDiscount > 0 && <span className="text-destructive">-{fmt(totalDiscount)}</span>}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm gap-2">
              <span className="text-muted-foreground">Shipping</span>
              <Input
                type="number"
                min={0}
                className="h-7 w-24 text-xs text-right"
                value={shippingCharge}
                onKeyDown={(e) => {
                  if (e.key === "-" || e.key === "e") e.preventDefault();
                }}
                onChange={(e) => setShippingCharge(Math.max(0, parseFloat(e.target.value) || 0))}
              />
            </div>
            <div className="flex items-center justify-between text-sm gap-2">
              <span className="text-muted-foreground">Expenses (Fixed Cost)</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  className="h-7 w-24 text-xs text-right"
                  value={expenses}
                  onKeyDown={(e) => {
                    if (e.key === "-" || e.key === "e") e.preventDefault();
                  }}
                  onChange={(e) => setExpenses(Math.max(0, parseFloat(e.target.value) || 0))}
                />
                {expenses > 0 && <span className="text-foreground font-medium">+{fmt(expenses)}</span>}
              </div>
            </div>
            {/* TDS Deducted row directly ABOVE Taxable Amount */}
            {tdsTcsApplicable && tdsTcsType === "tds" && tdsAmount > 0 && (
              <div className="flex items-center justify-between text-xs text-destructive font-medium px-2">
                <span>TDS Deducted ({cleanTdsTcsRate}%)</span>
                <span>-{fmt(tdsAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm font-semibold bg-muted/50 px-2 py-1.5 rounded">
              <span>Taxable Amount</span>
              <span>{fmt(taxableAmount)}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm gap-2">
                <span className="text-muted-foreground">GST Breakdown</span>
              </div>
              {taxBreakdown.length === 0 && <span className="text-xs text-muted-foreground pl-2">No taxes applied</span>}
              {taxBreakdown.map((tb) => (
                <div key={tb.id} className="flex items-center justify-between text-xs pl-4 text-muted-foreground">
                  <span>{tb.name} ({tb.rate}%)</span>
                  <span className="font-medium text-foreground">+{fmt(tb.amount)}</span>
                </div>
              ))}
            </div>
            {/* TCS Collected row directly AFTER GST */}
            {tdsTcsApplicable && tdsTcsType === "tcs" && tcsAmount > 0 && (
              <div className="flex items-center justify-between text-xs text-emerald-600 font-medium px-2">
                <span>TCS Collected ({cleanTdsTcsRate}%)</span>
                <span>+{fmt(tcsAmount)}</span>
              </div>
            )}
            {/* TDS/TCS Settings Box */}
            <div className="space-y-2 border-y py-3 my-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium">TDS / TCS Applicable?</span>
                <Checkbox checked={tdsTcsApplicable} onCheckedChange={(v) => setTdsTcsApplicable(!!v)} />
              </label>
              {tdsTcsApplicable && (
                <div className="flex items-center justify-between text-sm gap-2 mt-2">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" name="tdsTcsTypeBill" checked={tdsTcsType === "tds"} onChange={() => setTdsTcsType("tds")} className="cursor-pointer" />
                      <span>TDS (-)</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" name="tdsTcsTypeBill" checked={tdsTcsType === "tcs"} onChange={() => setTdsTcsType("tcs")} className="cursor-pointer" />
                      <span>TCS (+)</span>
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
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between text-sm gap-2">
              <Input
                className="h-7 w-24 text-xs"
                value={adjustmentName}
                onChange={(e) => setAdjustmentName(e.target.value)}
                disabled={autoRoundOff}
              />
              <Input
                type="number"
                className="h-7 w-24 text-xs text-right"
                value={autoRoundOff ? finalAdjustment.toFixed(2) : adjustment}
                onChange={(e) => setAdjustment(parseFloat(e.target.value) || 0)}
                disabled={autoRoundOff}
              />
            </div>
            <div className="border-t pt-3 flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{fmt(total)}</span>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      <PlanSelectorModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        orgId={org?.id}
      />
    </div>
  );
}

