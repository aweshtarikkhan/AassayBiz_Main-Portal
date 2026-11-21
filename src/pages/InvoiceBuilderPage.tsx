import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { postInvoiceJournal } from "@/lib/accounting";
import { useAppStore } from "@/store/app-store";
import { useSubscription } from "@/hooks/use-subscription";
import { hasUnlimitedInvoices, normalizePlanKey, canSendDirectEmailOrWhatsApp } from "@/lib/subscription";
import { PlanSelectorModal } from "@/components/shared/PlanSelectorModal";
import { useAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { logStockMovements, detectNegativeStock } from "@/lib/stock";
import { CustomFieldsForm, saveCustomFieldValues } from "@/components/shared/CustomFieldsForm";
import { CURRENCIES, formatCurrency } from "@/lib/currency";
import { formatSequenceNumber } from "@/lib/utils";
import { COMMON_UNITS, INDIAN_STATES, INDIAN_GST_SLABS } from "@/lib/constants";
import { stateCodeFromGstin, normalizeStateCode, extractEntityState, formatStateWithCode } from "@/lib/gst";
import { getWhatsappTemplate, compileWhatsappMessage, openWhatsappShare } from "@/lib/whatsapp";
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
import { Save, Eye, Trash2, Plus, GripVertical, Printer, Share2, Clock, ChevronDown, AlertTriangle, Layers, Check, CreditCard, Mail, MessageCircle, ArrowLeft, Lock, RefreshCw, Wallet, User, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { InvoiceSettingsSheet } from "@/components/shared/InvoiceSettingsSheet";
import { isRetailOrg } from "@/lib/business-category";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddClientDialog } from "@/components/shared/AddClientDialog";
import { ItemFormDialog } from "@/components/shared/ItemFormDialog";
import { ContactPromptDialog } from "@/components/shared/ContactPromptDialog";
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
  org,
}: {
  line: LineItem;
  index: number;
  taxRates: any[];
  items: any[];
  onChange: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
  onAddItem: () => void;
  currency: string;
  org: any;
  onAutoAddLine?: () => void;
}) {
  const hasGst = Boolean((org?.gst_number?.trim() || (org as any)?.tax_number?.trim()) || (org as any)?.gst_enabled);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: line.id });
  const [itemDropdownOpen, setItemDropdownOpen] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleItemSelect = async (item: any) => {
    onChange(index, "item_id", item.id);
    onChange(index, "name", item.name);
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
    let __rate = Number(item.unit_price) || 0;
    const hasGst = Boolean((org?.gst_number?.trim() || (org as any)?.tax_number?.trim()) || (org as any)?.gst_enabled);
    const __priceType = window.location.pathname.includes("bill") || window.location.pathname.includes("purchase") || window.location.pathname.includes("grn") ? (item.purchase_price_type || "without_tax") : (item.sales_price_type || "without_tax");
    if (hasGst && __priceType === "with_tax" && item.tax_id) {
      const __tax = taxRates.find((t: any) => t.id === item.tax_id);
      if (__tax && Number(__tax.rate) > 0) {
        __rate = Number((__rate / (1 + Number(__tax.rate) / 100)).toFixed(2));
      }
    }
    onChange(index, "rate", __rate);
    onChange(index, "discount", Number(item.discount) || 0);
    onChange(index, "discount_type", "percentage");
    const itemUnit = item.unit || "pcs";
    onChange(index, "unit", itemUnit);
    onChange(index, "primary_unit", itemUnit);
    onChange(index, "base_unit_price", __rate);
    onChange(index, "hsn_code", hasGst ? (item.hsn_code || "") : "");
    onChange(index, "tax_id", hasGst ? (item.tax_id || null) : null);
    onChange(index, "sub_unit", item.sub_unit || "");
    onChange(index, "sub_unit_conversion_rate", Number(item.sub_unit_conversion_rate) || 1);
    setItemDropdownOpen(false);
    onAutoAddLine?.();
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
                className="h-8 text-xs pr-7"
                placeholder="Add new item"
                value={line.name}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange(index, "name", val);
                  setItemDropdownOpen(true);
                  const matched = items.find((i: any) => i.name.toLowerCase() === val.trim().toLowerCase());
                  if (matched) {
                    handleItemSelect(matched);
                  } else {
                    onChange(index, "item_id", null);
                  }
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
                        {Number(item.discount) > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="font-semibold text-emerald-700">
                              {fmt(Number(item.unit_price) * (1 - Number(item.discount) / 100))}
                            </span>
                            <div className="flex items-center gap-1 text-[10px]">
                              <span className="line-through text-muted-foreground">{fmt(Number(item.unit_price))}</span>
                              <span className="text-emerald-600 font-bold">({item.discount}% off)</span>
                            </div>
                          </div>
                        ) : (
                          <span className="font-medium text-foreground">{fmt(Number(item.unit_price))}</span>
                        )}
                        {item.sub_unit && item.sub_unit_conversion_rate > 1 && (
                          <div className="text-[9px] text-muted-foreground">1 {item.unit || 'Box'} = {item.sub_unit_conversion_rate} {item.sub_unit}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={onAddItem} className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:text-foreground hover:bg-accent shrink-0" title="Add New Item">
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
          {line.expiry_warning && <div className="text-[10px] text-red-500 font-medium mt-1">{line.expiry_warning}</div>}
        </div>
        {/* Quantity */}
        <div className="col-span-2 space-y-1">
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
                  // Prevent typing decimals for these units
                  val = String(Math.floor(parseFloat(val) || 0));
                }
              }
              onChange(index, "quantity", val === "" ? "" : Math.max(0, parseFloat(val) || 0));
            }} 
            min={0} 
            step={["pcs", "pieces", "box", "boxes", "nos"].includes((line.unit || "").toLowerCase()) ? "1" : "0.01"} 
          />
          {line.item_id ? (
            <div className="flex flex-col items-center">
              {hasSubUnit ? (
                <div className="w-full flex flex-col items-center gap-0.5">
                  <div className="flex items-center justify-center gap-1 bg-muted/60 rounded px-1 py-0.5 w-full">
                    <span className="text-[10px] font-bold text-foreground uppercase">{line.unit}</span>
                    <button
                      type="button"
                      title="Switch unit"
                      onClick={() => {
                        if (isSellingInSubUnit) {
                          // Switch to Primary Unit (e.g. BOX)
                          const targetUnit = line.primary_unit || "box";
                          const targetRate = line.base_unit_price || Number((line.rate * (line.sub_unit_conversion_rate || 1)).toFixed(2));
                          onChange(index, "unit", targetUnit);
                          onChange(index, "rate", targetRate);
                        } else {
                          // Switch to Sub-Unit (e.g. PCS)
                          const targetUnit = line.sub_unit;
                          const baseRate = line.rate;
                          onChange(index, "base_unit_price", baseRate);
                          const targetRate = Number((baseRate / (line.sub_unit_conversion_rate || 1)).toFixed(2));
                          onChange(index, "unit", targetUnit);
                          onChange(index, "rate", targetRate);
                        }
                      }}
                      className="text-[9px] text-blue-600 hover:text-blue-800 underline font-medium"
                    >
                      {isSellingInSubUnit ? `Switch to ${line.primary_unit?.toUpperCase() || 'BOX'}` : `Sell in ${line.sub_unit?.toUpperCase()}`}
                    </button>
                  </div>
                  {!isSellingInSubUnit ? (
                    <span className="text-[9px] text-muted-foreground text-center">
                      = {(line.quantity * (line.sub_unit_conversion_rate || 1)).toLocaleString("en-IN", { maximumFractionDigits: 2 })} {line.sub_unit}
                    </span>
                  ) : (
                    <span className="text-[9px] text-blue-600/80 text-center">
                      (1 {line.primary_unit || 'box'} = {line.sub_unit_conversion_rate} {line.sub_unit})
                    </span>
                  )}
                </div>
              ) : (
                <Input
                  className="h-5 text-[10px] text-foreground font-semibold text-center border-0 border-b border-muted-foreground/30 bg-transparent px-1 py-0 focus-visible:ring-0 focus-visible:ring-offset-0 mt-0.5 uppercase hover:border-foreground"
                  placeholder="UNIT"
                  value={line.unit || "pcs"}
                  onChange={(e) => onChange(index, "unit", e.target.value)}
                />
              )}
            </div>
          ) : (
            <Input
              className="h-5 text-[10px] text-foreground font-semibold text-center border-0 border-b border-dashed bg-transparent px-1 py-0 focus-visible:ring-0 focus-visible:ring-offset-0 mt-0.5 uppercase hover:border-foreground"
              placeholder="UNIT"
              value={line.unit || "pcs"}
              onChange={(e) => onChange(index, "unit", e.target.value)}
            />
          )}
        </div>
        {/* Rate */}
        <div className="col-span-2 space-y-0.5">
          <Input placeholder="0" type="number" className="h-8 text-xs text-right" value={line.rate}
            onKeyDown={(e) => { if (e.key === "-" || e.key === "e") e.preventDefault(); }}
            onChange={(e) => {
              const val = e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0);
              onChange(index, "rate", val);
              if (!isSellingInSubUnit && typeof val === "number") {
                onChange(index, "base_unit_price", val);
              }
            }} min={0} step="0.01" />
          {Number(line.discount) > 0 && (
            <div className="flex flex-col items-end mt-1 text-[10px]">
              <span className="text-emerald-600 font-semibold">{line.discount_type === 'percentage' ? `${line.discount}%` : `₹${line.discount}`} discount</span>
              <span className="text-muted-foreground font-medium">= ₹{(line.discount_type === 'percentage' ? Number(line.rate) * (1 - Number(line.discount)/100) : Number(line.rate) - Number(line.discount)).toFixed(2)}</span>
            </div>
          )}
        </div>
        {/* Tax */}
        {hasGst && (
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
        )}
        {/* Amount */}
        <div className={`text-right pt-1 ${!hasGst ? 'col-span-4' : 'col-span-2'}`}>
          <span className="text-sm font-bold">{fmt(hasGst ? line.amount - (line.tax_amount || 0) : line.amount)}</span>
        </div>
      </div>
      <button onClick={() => onRemove(index)} className="text-muted-foreground hover:text-destructive shrink-0 mt-2 ml-1">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function InvoiceBuilderPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const duplicateId = searchParams.get("duplicate");
  const org = useAppStore((s) => s.organization);
  const userRole = useAppStore((s) => s.userRole);
  const hasGst = Boolean((org?.gst_number?.trim() || (org as any)?.tax_number?.trim()) || (org as any)?.gst_enabled);
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { subscriptionPlan } = useSubscription();
  const plan = subscriptionPlan || org?.subscription_plan || 'free';
  const [activeOrgPlans, setActiveOrgPlans] = useState<string[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showIncompleteProfileDialog, setShowIncompleteProfileDialog] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  const [clients, setClients] = useState<any[]>([]);
  const [showSignature, setShowSignature] = useState(() => {
    const orgState = useAppStore.getState().organization;
    if (!orgState) return false;
    const prefs = (orgState as any)?.invoice_preferences || {};
    if (prefs.pdf_show_signature === false) return false;
    let addr: any = orgState.address;
    if (typeof addr === "string") {
      try { addr = JSON.parse(addr); } catch { addr = null; }
    }
    return !!(addr?.signature_type && addr.signature_type !== 'none');
  });
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [taxRates, setTaxRates] = useState<any[]>([]);

  const [clientId, setClientId] = useState("");
  const [clientAdvanceCredit, setClientAdvanceCredit] = useState(0);
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [clientStateOverride, setClientStateOverride] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(true);
  const [shippingName, setShippingName] = useState("");
  const [shippingStreet, setShippingStreet] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingZip, setShippingZip] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingGst, setShippingGst] = useState("");
  const isRetail = isRetailOrg(org);
  const [retailCustomerName, setRetailCustomerName] = useState("");
  const [retailCustomerPhone, setRetailCustomerPhone] = useState("");
  const [retailUseExistingClient, setRetailUseExistingClient] = useState(false);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState<number>(() => isRetail ? 0 : (org?.payment_terms !== undefined && org?.payment_terms !== null ? Number(org.payment_terms) : 30));
  const [notes, setNotes] = useState(org?.default_notes || "");
  const [terms, setTerms] = useState(org?.default_terms || "");
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [tdsTcsApplicable, setTdsTcsApplicable] = useState(false);
  const [tdsTcsType, setTdsTcsType] = useState<"tds" | "tcs">("tds");
  const [tdsTcsRate, setTdsTcsRate] = useState<number | string>(0);
  const [shippingCharge, setShippingCharge] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [adjustment, setAdjustment] = useState(0);
  const [adjustmentName, setAdjustmentName] = useState("Adjustment");
  // Invoice Builder sections & PDF display preferences (configured from Settings > Invoices > Preferences)
  const initialPrefs = (org as any)?.invoice_preferences || {};
  const [autoRoundOff, setAutoRoundOff] = useState<boolean>(initialPrefs.auto_round_off !== false);
  const [showBankDetails, setShowBankDetails] = useState<boolean>(initialPrefs.pdf_show_bank_details !== false && initialPrefs.show_bank_details !== false);
  const [showTerms, setShowTerms] = useState<boolean>(isRetail ? false : initialPrefs.pdf_show_terms !== false);
  const [showNotes, setShowNotes] = useState<boolean>(initialPrefs.pdf_show_notes !== false);

  const [prefShowTerms, setPrefShowTerms] = useState<boolean>(isRetail ? false : initialPrefs.show_terms !== false);
  const [prefShowNotes, setPrefShowNotes] = useState<boolean>(initialPrefs.show_notes !== false);
  const [prefShowBankDetails, setPrefShowBankDetails] = useState<boolean>(initialPrefs.show_bank_details !== false);
  const [prefShowDisplayOptions, setPrefShowDisplayOptions] = useState<boolean>(isRetail ? false : initialPrefs.show_display_options !== false);
  const [prefShowCompliance, setPrefShowCompliance] = useState<boolean>(initialPrefs.show_compliance !== false);
  const [lines, setLines] = useState<LineItem[]>([createEmptyLine()]);
  const [deductStock, setDeductStock] = useState(true);
  const [prevDeductStock, setPrevDeductStock] = useState(true);
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentMode, setPaymentMode] = useState<string>("cash");
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [paymentRef, setPaymentRef] = useState<string>("");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [paymentBankAccountId, setPaymentBankAccountId] = useState<string>("");

  // Bank details per organization
  const [includeBankDetails, setIncludeBankDetails] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankUpiId, setBankUpiId] = useState("");
  const [savedBankAccounts, setSavedBankAccounts] = useState<any[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | null>(null);
  const [addNewBankDialogOpen, setAddNewBankDialogOpen] = useState(false);
  const [newBankForm, setNewBankForm] = useState({
    bank_name: "", account_holder_name: "", account_number: "", ifsc: "", branch: "", upi_id: ""
  });

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
  const [clientInvoices, setClientInvoices] = useState<any[]>([]);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);

  const [contactPromptOpen, setContactPromptOpen] = useState(false);
  const [contactPromptMissing, setContactPromptMissing] = useState<"email" | "phone">("email");
  const [pendingAction, setPendingAction] = useState<"email" | "whatsapp" | null>(null);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Fetch reference data
  useEffect(() => {
    if (!org?.id) return;
    const fetchData = async () => {
      const [c, i, t, subRes] = await Promise.all([
        supabase.from("clients").select("*").eq("org_id", org.id).eq("status", "active").order("display_name"),
        supabase.from("items").select("*").eq("org_id", org.id).eq("is_active", true).order("name"),
        supabase.from("tax_rates").select("*").eq("org_id", org.id),
        supabase.rpc("get_my_org_subscription", { p_org_id: org.id })
      ]);
      setClients(c.data || []);
      setCatalogItems(i.data || []);
      setTaxRates(t.data || []);
      if (subRes?.data?.plan_name) {
        const plans = subRes.data.plan_name.split('+').map((s: string) => normalizePlanKey(s)).filter(Boolean);
        setActiveOrgPlans(plans);
      }

      // Fetch all saved bank accounts for dropdown
      const { data: allBankAccounts } = await supabase.from("bank_accounts").select("*").eq("org_id", org.id).eq("is_active", true).order("created_at");
      setSavedBankAccounts(allBankAccounts || []);

      // Auto-generate invoice number from fresh DB value
      if (!id) {
        const { data: freshOrg } = await supabase
          .from("organizations")
          .select("invoice_next_number, invoice_prefix, payment_terms, default_notes, default_terms, bank_name, bank_account_name, bank_account_number, bank_ifsc, bank_branch, bank_details_enabled, upi_id, name, invoice_preferences")
          .eq("id", org.id)
          .single();
        const prefix = freshOrg?.invoice_prefix || org.invoice_prefix || "INV";
        let num = freshOrg?.invoice_next_number || org.invoice_next_number || 1;

        // Check recent invoices in DB to ensure no duplicate number is assigned
        const { data: recentInvs } = await supabase
          .from("invoices")
          .select("invoice_number")
          .eq("org_id", org.id)
          .order("created_at", { ascending: false })
          .limit(50);
        let maxExisting = 0;
        recentInvs?.forEach((inv: any) => {
          const m = (inv.invoice_number || "").match(/(\d+)$/);
          if (m) {
            const val = parseInt(m[1], 10);
            if (val > maxExisting) maxExisting = val;
          }
        });
        if (maxExisting >= num) {
          num = maxExisting + 1;
        }
        setInvoiceNumber(formatSequenceNumber(prefix, num, "INV"));
        const rawTerms = isRetail ? 0 : (freshOrg?.payment_terms !== undefined && freshOrg?.payment_terms !== null 
          ? Number(freshOrg.payment_terms) 
          : (org?.payment_terms !== undefined && org?.payment_terms !== null ? Number(org.payment_terms) : 30));
        setPaymentTerms(rawTerms);
        setNotes(freshOrg?.default_notes || org.default_notes || "");
        setTerms(freshOrg?.default_terms || org.default_terms || "");

        const effectivePrefs = (freshOrg as any)?.invoice_preferences || (org as any)?.invoice_preferences;
        if (effectivePrefs) {
          // Builder input sections
          if (effectivePrefs.show_terms !== undefined) setPrefShowTerms(isRetail ? false : effectivePrefs.show_terms !== false);
          if (effectivePrefs.show_notes !== undefined) setPrefShowNotes(effectivePrefs.show_notes !== false);
          if (effectivePrefs.show_bank_details !== undefined) setPrefShowBankDetails(effectivePrefs.show_bank_details !== false);
          if (effectivePrefs.show_display_options !== undefined) setPrefShowDisplayOptions(isRetail ? false : effectivePrefs.show_display_options !== false);
          if (effectivePrefs.show_compliance !== undefined) setPrefShowCompliance(effectivePrefs.show_compliance !== false);

          // PDF document display defaults
          if (effectivePrefs.pdf_show_bank_details !== undefined) {
            setShowBankDetails(effectivePrefs.pdf_show_bank_details !== false);
            setIncludeBankDetails(effectivePrefs.pdf_show_bank_details !== false);
          }
          if (effectivePrefs.pdf_show_terms !== undefined) setShowTerms(isRetail ? false : effectivePrefs.pdf_show_terms !== false);
          if (effectivePrefs.pdf_show_notes !== undefined) setShowNotes(effectivePrefs.pdf_show_notes !== false);
          if (effectivePrefs.auto_round_off !== undefined) setAutoRoundOff(effectivePrefs.auto_round_off !== false);
          if (effectivePrefs.pdf_show_signature !== undefined) setShowSignature(effectivePrefs.pdf_show_signature !== false);
        }

        if (isRetail) {
          setPaymentTerms(0);
          setPrefShowTerms(false);
          setShowTerms(false);
          setPrefShowDisplayOptions(false);
        }

        // Auto-select Default / Primary Bank Account
        const defaultBankId = effectivePrefs?.default_bank_account_id;
        const targetAcc = (allBankAccounts || []).find((a: any) => a.id === defaultBankId) ||
          (allBankAccounts || []).find((a: any) => a.account_number === freshOrg?.bank_account_number) ||
          ((allBankAccounts || [])[0]);

        if (targetAcc) {
          setSelectedBankAccountId(targetAcc.id);
          const parsedNotes = targetAcc.notes ? (() => { try { return JSON.parse(targetAcc.notes); } catch { return {}; } })() : {};
          setBankName(targetAcc.bank_name || "");
          setBankAccountName(parsedNotes.account_holder_name || targetAcc.name || freshOrg?.name || org.name || "");
          setBankAccountNumber(targetAcc.account_number || "");
          setBankIfsc(targetAcc.ifsc || "");
          setBankBranch(parsedNotes.branch || "");
          setBankUpiId(targetAcc.upi_id || freshOrg?.upi_id || org.upi_id || "");
          const shouldPrintBank = effectivePrefs?.pdf_show_bank_details !== false && effectivePrefs?.show_bank_details !== false;
          setIncludeBankDetails(shouldPrintBank);
          setShowBankDetails(shouldPrintBank);
        } else if (freshOrg && (freshOrg.bank_name || freshOrg.bank_account_number)) {
          const shouldPrintBank = freshOrg.bank_details_enabled !== false && effectivePrefs?.pdf_show_bank_details !== false;
          setIncludeBankDetails(shouldPrintBank);
          setShowBankDetails(shouldPrintBank);
          setBankName(freshOrg.bank_name || "");
          setBankAccountName(freshOrg.bank_account_name || freshOrg.name || org.name || "");
          setBankAccountNumber(freshOrg.bank_account_number || "");
          setBankIfsc(freshOrg.bank_ifsc || "");
          setBankBranch(freshOrg.bank_branch || "");
          setBankUpiId(freshOrg.upi_id || org.upi_id || "");
        }
      }
    };
    fetchData();
  }, [org?.id, id, duplicateId]);

  // Update due date when issue date or payment terms change
  useEffect(() => {
    if (issueDate) {
      if (Number(paymentTerms) === 0) {
        setDueDate(issueDate);
      } else {
        const d = new Date(issueDate);
        d.setDate(d.getDate() + Number(paymentTerms));
        setDueDate(d.toISOString().split("T")[0]);
      }
    }
  }, [issueDate, paymentTerms]);

  // Load existing invoice for editing or duplicating
  useEffect(() => {
    const sourceId = id || duplicateId;
    if (!sourceId || !org?.id) return;
    const loadInvoice = async () => {
      const { data: inv } = await supabase
        .from("invoices")
        .select("*, clients(display_name)")
        .eq("id", sourceId)
        .single();
      if (!inv) return;

      if (inv.billing_address) {
        try {
          const parsed = typeof inv.billing_address === "string" ? JSON.parse(inv.billing_address) : inv.billing_address;
          if (parsed && typeof parsed === "object") {
            if (parsed.name) setRetailCustomerName(parsed.name);
            if (parsed.phone) setRetailCustomerPhone(parsed.phone);
          }
        } catch {}
      }
      if ((inv.metadata as any)?.client_name) {
        setRetailCustomerName((inv.metadata as any).client_name);
      }
      if ((inv.metadata as any)?.client_mobile) {
        setRetailCustomerPhone((inv.metadata as any).client_mobile);
      }

      setClientId(inv.client_id);
      const matchedClient = (inv as any)?.clients?.display_name || clients.find((c) => c.id === inv.client_id)?.display_name;
      if (matchedClient) {
        setClientSearch(matchedClient);
        if (isRetail && matchedClient !== "Cash Sale / Walk-in Customer") {
          setRetailUseExistingClient(true);
        }
      }
      
      if (inv.metadata && (inv.metadata as any).shipping_same_as_billing !== undefined) {
        setShippingSameAsBilling((inv.metadata as any).shipping_same_as_billing);
      }
      if (inv.shipping_address) {
        try {
          const parsed = typeof inv.shipping_address === "string" ? JSON.parse(inv.shipping_address) : inv.shipping_address;
          if (parsed && typeof parsed === "object") {
            setShippingName(parsed.name || parsed.shipping_name || "");
            setShippingStreet(parsed.street || parsed.address || "");
            setShippingCity(parsed.city || "");
            setShippingState(parsed.state || "");
            setShippingZip(parsed.zip || parsed.pincode || "");
            setShippingPhone(parsed.phone || parsed.contact || "");
            setShippingGst(parsed.gstin || parsed.tax_number || "");
          } else {
            setShippingStreet(String(inv.shipping_address));
          }
        } catch {
          setShippingStreet(String(inv.shipping_address));
        }
      }

      if (!duplicateId) {
        setInvoiceNumber(inv.invoice_number);
        setIssueDate(inv.issue_date);
        setDueDate(inv.due_date);
      }
      
      setNotes(inv.notes !== null && inv.notes !== undefined && inv.notes !== "" ? inv.notes : (org?.default_notes || ""));
      setTerms(inv.terms_conditions !== null && inv.terms_conditions !== undefined && inv.terms_conditions !== "" ? inv.terms_conditions : (org?.default_terms || ""));
      setDiscount(Number(inv.discount));
      setDiscountType(inv.discount_type as any);
      setShippingCharge(Number(inv.shipping_charge));
      setExpenses(Number((inv as any).expenses || 0));
      setAdjustment(Number(inv.adjustment));
      setAdjustmentName(inv.adjustment_name || "Adjustment");
        if (inv.metadata) {
          if ((inv.metadata as any).auto_round_off !== undefined) setAutoRoundOff((inv.metadata as any).auto_round_off);
          if ((inv.metadata as any).show_bank_details !== undefined) setShowBankDetails((inv.metadata as any).show_bank_details);
          if ((inv.metadata as any).show_terms !== undefined) setShowTerms((inv.metadata as any).show_terms);
          if ((inv.metadata as any).show_notes !== undefined) setShowNotes((inv.metadata as any).show_notes);
        }
      const isTdsTcsOn = Boolean(
        (inv as any).tds_tcs_applicable ||
        (inv.metadata as any)?.tds_tcs_applicable ||
        Number((inv as any).tds_tcs_rate || 0) > 0 ||
        Number((inv as any).tds_tcs_amount || 0) > 0 ||
        Number((inv.metadata as any)?.tds_tcs_rate || 0) > 0 ||
        Number((inv.metadata as any)?.tds_tcs_amount || 0) > 0
      );
      const loadedRate = (inv as any).tds_tcs_rate != null && (inv as any).tds_tcs_rate !== ""
        ? Number((inv as any).tds_tcs_rate)
        : (Number((inv.metadata as any)?.tds_tcs_rate) || 0);
      const loadedType = (inv as any).tds_tcs_type || (inv.metadata as any)?.tds_tcs_type || "tds";
      setTdsTcsApplicable(isTdsTcsOn);
      setTdsTcsType(loadedType === "tcs" ? "tcs" : "tds");
      setTdsTcsRate(loadedRate);
      setDeductStock((inv as any).deduct_stock !== undefined && (inv as any).deduct_stock !== null ? !!(inv as any).deduct_stock : true);
      setPrevDeductStock((inv as any).deduct_stock !== undefined && (inv as any).deduct_stock !== null ? !!(inv as any).deduct_stock : true);
      setAmountPaid(duplicateId ? 0 : Number(inv.amount_paid || 0));
      const loadedPayMode = (inv.metadata as any)?.payment_mode || (inv.status === "paid" ? "bank_transfer" : "cash");
      setPaymentMode(duplicateId ? "cash" : loadedPayMode);

      if (inv.bank_details && typeof inv.bank_details === "object") {
        setIncludeBankDetails(!!inv.bank_details.enabled);
        setBankName(inv.bank_details.bank_name || "");
        setBankAccountName(inv.bank_details.bank_account_name || "");
        setBankAccountNumber(inv.bank_details.bank_account_number || "");
        setBankIfsc(inv.bank_details.bank_ifsc || "");
        setBankBranch(inv.bank_details.bank_branch || "");
        setBankUpiId(inv.bank_details.bank_upi_id || "");
      } else if (org) {
        if ((org as any).bank_name || (org as any).bank_account_number) {
          setIncludeBankDetails((org as any).bank_details_enabled !== false);
          setBankName((org as any).bank_name || "");
          setBankAccountName((org as any).bank_account_name || org.name || "");
          setBankAccountNumber((org as any).bank_account_number || "");
          setBankIfsc((org as any).bank_ifsc || "");
          setBankBranch((org as any).bank_branch || "");
          setBankUpiId(org.upi_id || "");
        }
      }

      // Phase 5 compliance load
      if (!duplicateId) {
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
      }

      const { data: lineData } = await supabase
        .from("invoice_lines")
        .select("*")
        .eq("invoice_id", sourceId)
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
    loadInvoice();
  }, [id, duplicateId, org?.id]);

  // Fetch client pending invoices when client changes
  useEffect(() => {
    if (!clientId || !org?.id) {
      setClientInvoices([]);
      setClientAdvanceCredit(0);
      return;
    }
    const fetchClientInvoices = async () => {
      const [invRes, advRes, appliedRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("total, balance_due, due_date, status")
          .eq("client_id", clientId)
          .eq("org_id", org.id)
          .neq("status", "void")
          .neq("status", "draft"),
        supabase
          .from("payments")
          .select("amount, payment_number")
          .eq("org_id", org.id)
          .eq("client_id", clientId)
          .is("invoice_id", null),
        supabase
          .from("payments")
          .select("amount, reference_number")
          .eq("org_id", org.id)
          .eq("client_id", clientId)
          .eq("payment_mode", "advance_credit"),
      ]);

      setClientInvoices(invRes.data || []);

      const usedMap: Record<string, number> = {};
      (appliedRes.data || []).forEach((p: any) => {
        if (p.reference_number) {
          const ref = p.reference_number.trim();
          usedMap[ref] = (usedMap[ref] || 0) + Number(p.amount || 0);
        }
      });
      let totalAdv = 0;
      (advRes.data || []).forEach((a: any) => {
        const ref = (a.payment_number || "").trim();
        const used = usedMap[ref] || 0;
        const rem = Math.max(0, Number(a.amount || 0) - used);
        totalAdv += rem;
      });
      setClientAdvanceCredit(totalAdv);
    };
    fetchClientInvoices();
  }, [clientId, org?.id]);

  const clientAgingSummary = useMemo(() => {
    if (!clientInvoices.length) return null;
    const today = new Date();
    let totalDue = 0;
    let over15 = 0;
    let over45 = 0;
    let totalBilled = 0;

    clientInvoices.forEach((inv) => {
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
  }, [clientInvoices]);


  // Totals & Discount Pre-computation
  const rawSubtotal = lines.reduce((s, l) => s + ((Number(l.quantity) || 0) * (Number(l.rate) || 0)), 0);
  const itemLevelDiscountTotal = lines.reduce((s, l) => {
    const lineAmt = (Number(l.quantity) || 0) * (Number(l.rate) || 0);
    const d = Math.max(0, Number(l.discount) || 0);
    return s + (l.discount_type === "percentage" ? lineAmt * (d / 100) : d);
  }, 0);
  const subtotal = Math.max(0, rawSubtotal - itemLevelDiscountTotal);
  const cleanDiscount = Math.max(0, Number(discount) || 0);
  const totalDiscount = Math.min(
    subtotal,
    discountType === "percentage" ? (subtotal * cleanDiscount) / 100 : cleanDiscount
  );
  const discountedSubtotal = Math.max(0, subtotal - totalDiscount);
  const discountRatio = subtotal > 0 ? discountedSubtotal / subtotal : 1;

  const calculateLine = useCallback((line: LineItem, ratio = discountRatio): LineItem => {
    const lineSubtotal = (Number(line.quantity) || 0) * (Number(line.rate) || 0);
    
    // Add item specific discount if applicable
    const itemDiscount = line.discount_type === "percentage"
      ? lineSubtotal * ((Math.max(0, Number(line.discount) || 0)) / 100)
      : Math.max(0, Number(line.discount) || 0);
      
    const lineTaxable = Math.max(0, lineSubtotal - itemDiscount);
    // GST applies post-discount: on the effective taxable share of the line
    const effectiveLineTaxable = lineTaxable * ratio;
    
    let tax_amount = 0;
    let computedAmount = lineTaxable;
    const hasGst = Boolean((org?.gst_number?.trim() || (org as any)?.tax_number?.trim()) || (org as any)?.gst_enabled);

    if (hasGst && line.tax_id) {
      const slab = INDIAN_GST_SLABS.find(s => s.id === line.tax_id);
      const taxRateObj = taxRates.find((t: any) => t.id === line.tax_id);
      const rate = slab ? slab.rate : (taxRateObj ? Number(taxRateObj.rate) : 0);
      const computedTax = effectiveLineTaxable * (rate / 100);
      
      tax_amount = computedTax;
      computedAmount += tax_amount;
    }
    
    return { 
      ...line, 
      tax_amount: hasGst ? tax_amount : 0, 
      tax_id: hasGst ? line.tax_id : null,
      hsn_code: hasGst ? (line.hsn_code || "") : "",
      amount: computedAmount 
    };
  }, [taxRates, org?.gst_number, (org as any)?.tax_number, (org as any)?.gst_enabled, discountRatio]);

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

  const selectedClient = useMemo(() => clients.find((c) => c.id === clientId), [clients, clientId]);

  const baseClientState = useMemo(() => {
    return extractEntityState(selectedClient);
  }, [selectedClient]);

  const clientState = normalizeStateCode(clientStateOverride) || baseClientState;

  const isInterstate = Boolean(orgState && clientState && orgState !== clientState);

  const cleanTdsTcsRate = Math.max(0, parseFloat(String(tdsTcsRate)) || 0);
  const isTds = Boolean(tdsTcsApplicable && tdsTcsType === "tds" && cleanTdsTcsRate > 0);
  const tdsFactor = isTds ? (1 - cleanTdsTcsRate / 100) : 1;
  const effectiveLineRatio = discountRatio * tdsFactor;

  // Calculate item-wise totals
  const calculatedLines = lines.map(line => calculateLine(line, effectiveLineRatio));
  
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

  // TDS (Tax Deducted at Source): calculated BEFORE GST on Base Value and DEDUCTED (-)
  const tdsAmount = isTds ? (baseAmountBeforeTds * cleanTdsTcsRate) / 100 : 0;

  // Taxable Amount (Net Basic Value after Discount and TDS)
  const taxableAmount = Math.max(0, baseAmountBeforeTds - tdsAmount);

  // Total with GST (Net Taxable Amount + GST)
  const totalWithGst = taxableAmount + (hasGst ? totalTax : 0);

  // TCS (Tax Collected at Source): calculated AFTER GST on Total Value with GST (Net Taxable Amount + GST) and ADDED (+)
  const tcsAmount = (tdsTcsApplicable && tdsTcsType === "tcs")
    ? (totalWithGst * cleanTdsTcsRate) / 100
    : 0;

  const tdsTcsAmount = tdsTcsType === "tds" ? tdsAmount : tcsAmount;

  // Since TDS was already deducted to arrive at taxableAmount, totalWithGst already includes the TDS deduction
  const baseTotalBeforeRoundOff = totalWithGst + tcsAmount + (autoRoundOff ? 0 : adjustment);
  let total = baseTotalBeforeRoundOff;
  let finalAdjustment = autoRoundOff ? 0 : adjustment;
  let finalAdjustmentName = autoRoundOff ? "Round Off" : adjustmentName;

  if (autoRoundOff) {
    const roundedTotal = Math.round(baseTotalBeforeRoundOff);
    finalAdjustment = Number((roundedTotal - (totalWithGst + tcsAmount)).toFixed(2));
    total = roundedTotal;
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

  const handleActionClick = (action: "email" | "whatsapp") => {
    if (!canSendDirectEmailOrWhatsApp(plan, activeOrgPlans)) {
      toast({
        title: "Feature Locked 🔒",
        description: `Direct document ${action === "email" ? "emailing" : "sharing via WhatsApp"} is a premium feature. Please upgrade to Business Suite or Business Integration.`,
        variant: "destructive"
      });
      setShowUpgradeModal(true);
      return;
    }
    if (action === "whatsapp" && !(useAppStore.getState().userRole === 'admin' || useAppStore.getState().userRole === 'owner' || useAppStore.getState().userPermissions.includes('whatsapp_access'))) {
      toast({ title: "Access Denied", description: "You don't have permission to use WhatsApp features.", variant: "destructive" });
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
    if (action === "whatsapp" && !client.phone) {
      setContactPromptMissing("phone");
      setPendingAction("whatsapp");
      setContactPromptOpen(true);
      return;
    }
    handleSave("sent", action);
  };

  const handleBankAccountSelect = (accountId: string) => {
    if (accountId === "add-new") {
      setAddNewBankDialogOpen(true);
      return;
    }
    const acc = savedBankAccounts.find(a => a.id === accountId);
    if (acc) {
      setSelectedBankAccountId(accountId);
      setBankName(acc.bank_name || "");
      const parsedNotes = acc.notes ? (() => { try { return JSON.parse(acc.notes); } catch { return {}; } })() : {};
      setBankAccountName(parsedNotes.account_holder_name || acc.name || "");
      setBankAccountNumber(acc.account_number || "");
      setBankIfsc(acc.ifsc || "");
      setBankBranch(parsedNotes.branch || "");
      setBankUpiId(acc.upi_id || "");
      setIncludeBankDetails(true);
    }
  };

  const handleSaveNewBankAccount = async () => {
    if (!org?.id || !newBankForm.bank_name.trim()) return;
    const { data, error } = await supabase.from("bank_accounts").insert({
      org_id: org.id,
      name: newBankForm.account_holder_name.trim() || newBankForm.bank_name.trim(),
      bank_name: newBankForm.bank_name.trim(),
      account_number: newBankForm.account_number.trim(),
      ifsc: newBankForm.ifsc.trim(),
      upi_id: newBankForm.upi_id.trim() || null,
      account_type: "bank",
      notes: JSON.stringify({ branch: newBankForm.branch.trim(), account_holder_name: newBankForm.account_holder_name.trim() }),
    }).select().single();
    if (!error && data) {
      setSavedBankAccounts(prev => [...prev, data]);
      handleBankAccountSelect(data.id);
      setAddNewBankDialogOpen(false);
      setNewBankForm({ bank_name: "", account_holder_name: "", account_number: "", ifsc: "", branch: "", upi_id: "" });
      toast({ title: "Bank account saved!" });
    }
  };

  const handleSave = async (status: "draft" | "sent" = "draft", postAction?: "email" | "whatsapp") => {
    if (isSavingRef.current || saving) {
      return;
    }
    isSavingRef.current = true;
    setSaving(true);

    try {
      const isOrgOwner = (org as any)?.owner_id === (user?.id || profile?.user_id) || userRole === "owner";
    const hasOrgAddress = Boolean(profile?.address_line || (org?.address as any)?.street || (org?.address as any)?.address_line);
    const hasOrgPincode = Boolean(profile?.pincode || (org?.address as any)?.postal_code || (org?.address as any)?.pincode);

    if (isOrgOwner && (!hasOrgAddress || !hasOrgPincode)) {
      toast({
        title: "Profile Incomplete",
        description: "Please complete your Address and PIN Code in Settings before creating invoices.",
        variant: "destructive",
      });
      setShowIncompleteProfileDialog(true);
      return;
    }

    let effectiveClientId = (isRetail && !retailUseExistingClient) ? "" : clientId;
    if (isRetail && !effectiveClientId) {
      // Find or create default walk-in client for retail organization
      const { data: existingWalkIn } = await supabase
        .from("clients")
        .select("id")
        .eq("org_id", org!.id)
        .eq("display_name", "Cash Sale / Walk-in Customer")
        .maybeSingle();

      if (existingWalkIn?.id) {
        effectiveClientId = existingWalkIn.id;
      } else {
        const { data: createdWalkIn } = await supabase
          .from("clients")
          .insert({
            org_id: org!.id,
            display_name: "Cash Sale / Walk-in Customer",
            currency_code: org?.currency_code || "INR",
            billing_address: {
              name: retailCustomerName.trim() || "Walk-in Customer",
              phone: retailCustomerPhone.trim() || undefined,
              state: orgState || null,
            }
          })
          .select("id")
          .single();
        if (createdWalkIn?.id) {
          effectiveClientId = createdWalkIn.id;
        }
      }
    }

    if (!effectiveClientId) {
      toast({ title: isRetail ? "Please provide customer name" : "Select a client", variant: "destructive" });
      return;
    }

    if (!id) {
      const isUnlimited = hasUnlimitedInvoices(plan, activeOrgPlans);
      if (!isUnlimited) {
        const currentYear = new Date().getFullYear();
        const startOfYear = `${currentYear}-01-01T00:00:00.000Z`;
        const { count } = await supabase
          .from("invoices")
          .select("*", { count: "exact", head: true })
          .eq("org_id", org!.id)
          .gte("created_at", startOfYear);

        if ((count || 0) >= 100) {
          toast({
            title: "Invoice Limit Reached (100/100)",
            description: "In this plan you can only create up to 100 invoices. Upgrade to Business Accounting or Business Suite for unlimited invoices.",
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
        const { data: prev } = await supabase.from("invoice_lines").select("item_id, quantity").eq("invoice_id", id);
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

    const isBankPrinting = prefShowBankDetails && includeBankDetails && showBankDetails;
    const bankDetailsPayload = isBankPrinting && (bankName.trim() || bankAccountNumber.trim() || bankIfsc.trim()) ? {
      enabled: true,
      bank_name: bankName.trim(),
      bank_account_name: bankAccountName.trim(),
      bank_account_number: bankAccountNumber.trim(),
      bank_ifsc: bankIfsc.trim(),
      bank_branch: bankBranch.trim(),
      bank_upi_id: bankUpiId.trim(),
    } : { enabled: false };

    const isModePaid = Boolean(paymentMode && paymentMode !== "unpaid" && paymentMode !== "none");
    const paidVal = isModePaid ? total : (id ? Number(amountPaid) : 0);
    const calculatedBalance = Math.max(0, total - paidVal);
    const finalStatus = isModePaid 
      ? "paid" 
      : (paidVal > 0 ? (calculatedBalance <= 0.01 ? "paid" : "partial") : status);

    const effectiveClientName = isRetail 
      ? (retailUseExistingClient && selectedClient ? selectedClient.display_name : (retailCustomerName.trim() || selectedClient?.display_name || "Walk-in Customer"))
      : (selectedClient?.display_name || "");

    const effectiveClientPhone = isRetail 
      ? (retailUseExistingClient && selectedClient ? (selectedClient.phone || (selectedClient as any).mobile || "") : (retailCustomerPhone.trim() || selectedClient?.phone || ""))
      : (selectedClient?.phone || "");

    const retailBillingAddress = isRetail ? {
      name: effectiveClientName,
      phone: effectiveClientPhone || undefined,
      state: clientState || orgState || null,
    } : null;

    const invoicePayload = {
      org_id: org!.id,
      client_id: effectiveClientId,
      billing_address: (isRetail && !retailUseExistingClient) ? retailBillingAddress : (selectedClient?.billing_address ? {
        ...(typeof selectedClient.billing_address === 'object' ? selectedClient.billing_address : {}),
        state: clientState || (selectedClient.billing_address as any)?.state || null
      } : (clientState ? { state: clientState } : (retailBillingAddress || null))),
      shipping_address: shippingSameAsBilling
        ? ((isRetail && !retailUseExistingClient) ? retailBillingAddress : (selectedClient?.shipping_address || selectedClient?.billing_address || null))
        : {
            name: shippingName.trim(),
            street: shippingStreet.trim(),
            city: shippingCity.trim(),
            state: shippingState.trim(),
            zip: shippingZip.trim(),
            phone: shippingPhone.trim(),
            gstin: shippingGst.trim(),
          },
      metadata: {
        template_style: org?.template_style,
        template_accent_color: org?.template_accent_color,
        template_font: org?.template_font,
        template_paper_size: org?.template_paper_size,
        has_gst: hasGst,
        shipping_same_as_billing: shippingSameAsBilling,
        auto_round_off: autoRoundOff,
        round_off: finalAdjustment,
        show_bank_details: isBankPrinting,
        show_terms: isRetail ? false : (prefShowTerms && showTerms),
        show_notes: prefShowNotes && showNotes,
        show_signature: showSignature,
        pref_show_compliance: prefShowCompliance,
        tds_tcs_applicable: tdsTcsApplicable,
        tds_tcs_type: tdsTcsType,
        tds_tcs_rate: cleanTdsTcsRate,
        tds_tcs_amount: tdsTcsAmount,
        hide_due_date: isRetail ? true : Number(paymentTerms) === 0,
        payment_terms: isRetail ? 0 : Number(paymentTerms),
        payment_mode: paymentMode,
        is_retail: isRetail,
        client_name: isRetail ? effectiveClientName : undefined,
        client_mobile: isRetail ? effectiveClientPhone : undefined,
      },
      invoice_number: invoiceNumber,
      issue_date: issueDate,
      due_date: isRetail ? issueDate : dueDate,
      currency_code: org!.currency_code,
      discount,
      discount_type: discountType,
      shipping_charge: shippingCharge,
      expenses,
      adjustment: finalAdjustment,
      adjustment_name: finalAdjustmentName,
      deduct_stock: deductStock,
      bank_details: isBankPrinting ? bankDetailsPayload : { enabled: false },
      irn: prefShowCompliance && generateIrn && irn.trim() ? irn.trim() : null,
      ack_no: prefShowCompliance && generateIrn && ackNo.trim() ? ackNo.trim() : null,
      ack_date: prefShowCompliance && generateIrn && ackDate ? ackDate : null,
      eway_bill_no: prefShowCompliance && generateEway && ewayBillNo.trim() ? ewayBillNo.trim() : null,
      eway_valid_until: prefShowCompliance && generateEway && ewayValidUntil ? ewayValidUntil : null,
      eway_vehicle_no: prefShowCompliance && generateEway && ewayVehicleNo.trim() ? ewayVehicleNo.trim() : null,
      eway_transport_mode: prefShowCompliance && generateEway ? ewayTransportMode : null,
      eway_distance_km: prefShowCompliance && generateEway && ewayDistanceKm ? parseInt(ewayDistanceKm) : null,
      subtotal,
      total_tax: hasGst ? totalTax : 0,
      total_discount: totalDiscount,
      tds_tcs_applicable: tdsTcsApplicable,
      tds_tcs_type: tdsTcsType,
      tds_tcs_rate: cleanTdsTcsRate,
      tds_tcs_amount: tdsTcsAmount,
      total,
      amount_paid: paidVal,
      balance_due: calculatedBalance,
      status: finalStatus,
      notes: prefShowNotes ? notes : null,
      terms_conditions: isRetail ? null : (prefShowTerms ? terms : null),
      ...(status === "sent" ? { sent_at: new Date().toISOString() } : {}),
    };

    let invoiceId = id;
      // Capture previous lines and values for stock restoration and audit diff on edit
      let prevLines: any[] = [];
      let previousTotal = 0;
      let previousStatus = "";
      if (id) {
        const { data: existingInv } = await supabase.from("invoices").select("total, status").eq("id", id).maybeSingle();
        if (existingInv) {
          previousTotal = Number(existingInv.total || 0);
          previousStatus = existingInv.status || "";
        }
        const { data: existing } = await supabase.from("invoice_lines").select("item_id, quantity").eq("invoice_id", id);
        prevLines = existing || [];
        const { error } = await supabase.from("invoices").update(invoicePayload).eq("id", id);
        if (error) throw error;
        // Delete old lines and re-insert
        await supabase.from("invoice_lines").delete().eq("invoice_id", id);
      } else {
        let currentPayload = { ...invoicePayload };
        let currentNum = -1;
        let retryCount = 0;
        let insertData = null;
        
        while (retryCount < 5) {
          const { data, error } = await supabase.from("invoices").insert(currentPayload).select().single();
          if (error) {
            if (error.code === "23505" && (error.message.includes("invoices_org_id_invoice_number_key") || error.message.includes("invoice_number"))) {
              // Fetch latest invoices to find the real max number
              const { data: existingInvs } = await supabase
                .from("invoices")
                .select("invoice_number")
                .eq("org_id", org!.id)
                .order("created_at", { ascending: false })
                .limit(100);
              let maxNum = 0;
              existingInvs?.forEach((inv: any) => {
                const m = (inv.invoice_number || "").match(/(\d+)$/);
                if (m) {
                  const n = parseInt(m[1], 10);
                  if (n > maxNum) maxNum = n;
                }
              });
              const { data: currentOrg } = await supabase.from("organizations").select("invoice_next_number, invoice_prefix").eq("id", org!.id).single();
              const baseNum = Math.max(currentOrg?.invoice_next_number || 1, maxNum + 1);
              currentNum = baseNum + retryCount;
              const newNum = formatSequenceNumber(currentOrg?.invoice_prefix || "INV", currentNum, "INV");
              currentPayload.invoice_number = newNum;
              setInvoiceNumber(newNum); // Update UI state
              retryCount++;
              continue;
            }
            throw error;
          }
          insertData = data;
          break;
        }
        
        if (!insertData) {
          throw new Error("Failed to generate a unique invoice number. Please try again.");
        }
        
        invoiceId = insertData.id;
        // Instantly update browser URL so if the user refreshes, they never see blank entries on /invoices/new
        window.history.replaceState(null, "", `/invoices/${invoiceId}`);
        
        // Ensure organizations table sequence is incremented past the inserted invoice
        const insertedNumMatch = (currentPayload.invoice_number || "").match(/(\d+)$/);
        const savedSeq = insertedNumMatch ? parseInt(insertedNumMatch[1], 10) : (currentNum !== -1 ? currentNum : 1);
        const { data: latestOrg } = await supabase.from("organizations").select("invoice_next_number").eq("id", org!.id).single();
        const nextTarget = Math.max(latestOrg?.invoice_next_number || 1, savedSeq + 1);
        await supabase.from("organizations").update({
          invoice_next_number: nextTarget,
        }).eq("id", org!.id);
      }

      // Ensure tax rate records exist in DB for any slab selected
      const slabMap: Record<string, string> = {};
      if (hasGst) {
        for (const l of calculatedLines) {
          if (l.tax_id && INDIAN_GST_SLABS.some(s => s.id === l.tax_id)) {
            const slab = INDIAN_GST_SLABS.find(s => s.id === l.tax_id)!;
            if (slab.rate === 0) {
              slabMap[slab.id] = "";
            } else if (!slabMap[slab.id]) {
              const existing = taxRates.find(t => Number(t.rate) === slab.rate);
              if (existing) {
                slabMap[slab.id] = existing.id;
              } else {
                const { data: newTax } = await supabase.from("tax_rates").insert({
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
      }

      // Insert lines
      const linePayloads = calculatedLines
        .filter((l) => l.name.trim() || l.rate > 0)
        .map((l, i) => {
          let resolvedTaxId = hasGst ? l.tax_id : null;
          if (resolvedTaxId && slabMap[resolvedTaxId] !== undefined) {
            resolvedTaxId = slabMap[resolvedTaxId] || null;
          }
          return {
            invoice_id: invoiceId!,
            item_id: l.item_id,
            name: l.name,
            description: l.description,
            unit: l.unit || "pcs",
            quantity: Number(l.quantity) || 1,
            rate: Number(l.rate) || 0,
            discount: Number(l.discount) || 0,
            discount_type: l.discount_type,
            tax_id: hasGst ? resolvedTaxId : null,
            tax_amount: hasGst ? (l.tax_amount || 0) : 0,
            amount: l.amount,
            sort_order: i,
            hsn_code: hasGst ? (l.hsn_code?.trim() || null) : null,
            sub_unit: l.sub_unit,
            sub_unit_conversion_rate: l.sub_unit_conversion_rate
          };
        });

      const { error: lineError } = await supabase.from("invoice_lines").insert(linePayloads);

        // Sync Journal Entry
        try {
          const subtotal = linePayloads.reduce((sum, line) => sum + (line.rate * line.quantity), 0);
          const taxTotal = linePayloads.reduce((sum, line) => sum + (line.tax_amount || 0), 0);
          await postInvoiceJournal(org!.id, invoiceId, invoicePayload.issue_date, invoicePayload.invoice_number, subtotal, taxTotal, Number(invoicePayload.total), invoicePayload.branch_id || null);
        } catch (jErr) {
          console.error("Journal sync failed:", jErr);
        }

      if (lineError) throw lineError;

      // Inventory: adjust stock for product items (only when invoice opts in)
      if (prevDeductStock || deductStock) {
        const delta: Record<string, number> = {};
        if (prevDeductStock) {
          for (const pl of prevLines) {
            if (pl.item_id) delta[pl.item_id] = (delta[pl.item_id] || 0) + Number(pl.quantity || 0);
          }
        }
        if (deductStock) {
          for (const ln of linePayloads) {
            if (ln.item_id) delta[ln.item_id] = (delta[ln.item_id] || 0) - Number(ln.quantity || 0);
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
              reason: id ? "Invoice updated" : "Invoice created",
              refType: "invoice",
              refId: invoiceId,
              refNumber: invoiceNumber,
              createdBy: user?.id || null,
            });
          }
          await logStockMovements(movements);
        }
        setPrevDeductStock(deductStock);
      }

      // Save custom fields
      if (invoiceId && Object.keys(customFieldValues).length > 0) {
        await saveCustomFieldValues(invoiceId, customFieldValues);
      }

      // Record payment received when a payment mode is selected
      if (isModePaid && total > 0 && invoiceId) {
        try {
          const payNum = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          await supabase.from("payments").insert({
            org_id: org!.id,
            client_id: clientId,
            invoice_id: invoiceId,
            payment_number: payNum,
            amount: total,
            payment_date: issueDate,
            payment_mode: paymentMode,
            notes: `Paid via ${paymentMode.replace(/_/g, " ")} on invoice creation`,
          });
        } catch (payErr) {
          console.error("Failed to record payment:", payErr);
        }
      }

      // Audit log with detailed previous vs new value tracking
      if (org && user) {
        const isUpdate = Boolean(id);
        const newTotal = Number(invoicePayload.total || 0);
        await logAudit({
          orgId: org.id,
          userId: user.id,
          entityType: "invoice",
          entityId: invoiceId,
          action: isUpdate ? "update" : "create",
          description: isUpdate && previousTotal > 0
            ? `Invoice ${invoiceNumber} updated: Total ₹${previousTotal.toLocaleString("en-IN")} → ₹${newTotal.toLocaleString("en-IN")}`
            : `Invoice ${invoiceNumber} ${isUpdate ? "updated" : "created"} (${status})`,
          metadata: isUpdate ? {
            previous_value: previousTotal,
            new_value: newTotal,
            difference: newTotal - previousTotal,
            previous_status: previousStatus,
            new_status: status,
            items_count: validLines.length,
          } : {
            new_value: newTotal,
            status,
            items_count: validLines.length,
          }
        });
      }

      // Persist bank details per organization so next invoices have it pre-filled
      if (includeBankDetails && (bankName.trim() || bankAccountNumber.trim() || bankIfsc.trim())) {
        await supabase.from("organizations").update({
          bank_name: bankName.trim() || null,
          bank_account_name: bankAccountName.trim() || null,
          bank_account_number: bankAccountNumber.trim() || null,
          bank_ifsc: bankIfsc.trim() || null,
          bank_branch: bankBranch.trim() || null,
          bank_details_enabled: true,
          ...(bankUpiId.trim() ? { upi_id: bankUpiId.trim() } : {}),
        }).eq("id", org!.id);
      }

      // Check Post Actions (Email / WhatsApp)
      if (postAction === "email") {
        const client = clients.find(c => c.id === clientId);
        if (client?.email) {
          navigate(`/invoices/${invoiceId}?sendEmail=true`);
          toast({ title: "Saving and generating PDF..." });
          setSaving(false);
          return;
        }
      } else if (postAction === "whatsapp") {
        const client = clients.find(c => c.id === clientId);
        if (client?.phone) {
          const { data: existing } = await supabase.from("portal_tokens").select("token").eq("entity_type", "invoice").eq("entity_id", invoiceId).maybeSingle();
          let token = existing?.token;
          if (!token) {
            const { data } = await supabase.from("portal_tokens").insert({ org_id: org!.id, entity_type: "invoice", entity_id: invoiceId }).select("token").single();
            token = data?.token;
          }

          const template = await getWhatsappTemplate(org!.id, "invoice");
          const txt = compileWhatsappMessage(template, {
            client_name: client.display_name,
            document_no: invoiceNumber,
            total: fmt(total),
            due_date: dueDate || "",
            subtotal: fmt(subtotal),
            tax: fmt(totalTax),
            discount: fmt(totalDiscount),
            tds: tdsTcsApplicable && tdsTcsType === "tds" ? fmt(tdsTcsAmount) : "0.00",
            adjustment: adjustment ? fmt(adjustment) : "0.00",
            items: lines.map(l => `- ${l.name || 'Item'} x${l.quantity}`).join('\n'),
            portal_link: token ? `${window.location.origin}/portal/${token}` : "",
            org_name: org!.name
          });

          await openWhatsappShare({
            phone: client.phone,
            message: txt,
            orgId: org!.id
          });
          toast({ title: "Invoice saved and WhatsApp sent!" });
        }
      }



      toast({ title: status === "sent" ? "Invoice sent!" : "Invoice saved!" });
      navigate(`/invoices/${invoiceId}`, { replace: true });
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
  }, [clientId, lines, subtotal]);

  // Auto-save every 60s
  useEffect(() => {
    if (!clientId || !lines.some((l) => l.name.trim())) return;
    const interval = setInterval(() => {
      if (id) handleSave("draft");
    }, 60000);
    return () => clearInterval(interval);
  }, [id, clientId, lines]);

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
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate("/invoices")} title="Back to Invoices">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{id ? "Edit Invoice" : "New Invoice"}</h1>
        </div>
        <div className="flex gap-2">
          <InvoiceSettingsSheet />
          <Button variant="outline" onClick={() => navigate("/invoices")}>Cancel</Button>
          <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving}>
            <Save className="mr-1.5 h-4 w-4" /> Save as Draft
          </Button>
          <div className="flex">
            <Button className="rounded-r-none font-semibold shadow-sm" onClick={() => handleSave("sent")} disabled={saving}>
              {saving ? <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              {saving ? "Saving..." : "Save Invoice"}
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
                <DropdownMenuItem onClick={() => handleActionClick("whatsapp")}>
                  <MessageCircle className="mr-2 h-4 w-4 text-emerald-600" /> Save and WhatsApp
                  {!canSendDirectEmailOrWhatsApp(plan, activeOrgPlans) && <Lock className="ml-auto h-3.5 w-3.5 text-amber-500" />}
                </DropdownMenuItem>

                <DropdownMenuItem onClick={async () => { await handleSave("sent"); setTimeout(() => window.print(), 500); }}>
                  <Printer className="mr-2 h-4 w-4" /> Save and Print
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  await handleSave("sent");
                  if (id) {
                    const { data: existing } = await supabase.from("portal_tokens").select("token").eq("entity_type", "invoice").eq("entity_id", id).maybeSingle();
                    let token = existing?.token;
                    if (!token) {
                      const { data } = await supabase.from("portal_tokens").insert({ org_id: org!.id, entity_type: "invoice", entity_id: id }).select("token").single();
                      token = data?.token;
                    }
                    if (token) {
                      await navigator.clipboard.writeText(`${window.location.origin}/portal/${token}`);
                      toast({ title: "Invoice saved & portal link copied!" });
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
              {isRetail ? (
                <div className="space-y-3 p-4 rounded-xl border border-amber-200/90 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/60 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <User className="h-4 w-4 text-amber-600" />
                      <span>{retailUseExistingClient ? "Customer Details (From Client Master)" : "Customer Details (Retail Fast Checkout)"}</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const nextState = !retailUseExistingClient;
                          setRetailUseExistingClient(nextState);
                          if (!nextState) {
                            setClientId("");
                            setClientSearch("");
                          }
                        }}
                        className="h-6 text-[11px] font-semibold px-2.5 py-0 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/50 dark:hover:bg-amber-900/80 shadow-2xs gap-1.5 cursor-pointer"
                      >
                        {retailUseExistingClient ? (
                          <>
                            <User className="h-3 w-3" />
                            Type Directly (Counter Bill)
                          </>
                        ) : (
                          <>
                            <Users className="h-3 w-3" />
                            Choose from Clients
                          </>
                        )}
                      </Button>
                      <Badge variant="outline" className="text-[10px] bg-amber-100/80 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border-amber-300 font-medium">
                        {retailUseExistingClient ? "Registered Client" : "Direct Counter Bill"}
                      </Badge>
                    </div>
                  </div>

                  {!retailUseExistingClient ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Customer Name</Label>
                          <Input
                            placeholder="e.g. Walk-in Customer, Rahul"
                            value={retailCustomerName}
                            onChange={(e) => setRetailCustomerName(e.target.value)}
                            className="h-9 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Mobile Number (Optional)</Label>
                          <Input
                            placeholder="e.g. 9876543210"
                            value={retailCustomerPhone}
                            onChange={(e) => setRetailCustomerPhone(e.target.value)}
                            className="h-9 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                          />
                        </div>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-0.5">
                        <span>Invoice prints customer name and mobile directly without saving to client master.</span>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            className="h-9 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                            placeholder="Type to search clients..."
                            value={clientSearch}
                            onChange={(e) => {
                              setClientSearch(e.target.value);
                              setClientDropdownOpen(true);
                              if (!e.target.value) {
                                setClientId("");
                                setRetailCustomerName("");
                                setRetailCustomerPhone("");
                              }
                            }}
                            onFocus={() => setClientDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setClientDropdownOpen(false), 200)}
                          />
                          <button
                            type="button"
                            className="absolute right-0 top-0 h-9 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground"
                            onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          {clientDropdownOpen && (
                            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
                              {clients
                                .filter((c) => !clientSearch.trim() || c.display_name.toLowerCase().includes(clientSearch.toLowerCase()) || (c.company_name && c.company_name.toLowerCase().includes(clientSearch.toLowerCase())))
                                .map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${clientId === c.id ? "bg-accent/50 font-medium" : ""}`}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      setClientId(c.id);
                                      setClientSearch(c.display_name);
                                      setRetailCustomerName(c.display_name);
                                      setRetailCustomerPhone(c.billing_address?.phone || c.phone || (c as any).mobile || "");
                                      setClientDropdownOpen(false);
                                      setClientStateOverride("");
                                    }}
                                  >
                                    <div className="font-medium">{c.display_name}</div>
                                    {c.company_name && <div className="text-xs text-muted-foreground">{c.company_name}</div>}
                                  </button>
                                ))}
                              {clients.filter((c) => !clientSearch.trim() || c.display_name.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                                <div className="px-3 py-2 text-sm text-muted-foreground">No clients found</div>
                              )}
                            </div>
                          )}
                        </div>
                        <Button type="button" variant="outline" size="icon" onClick={() => setAddClientOpen(true)} title="Add New Client">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {selectedClient && (
                        <div className="rounded-lg border border-amber-300/80 bg-white/80 dark:bg-slate-900/80 p-2.5 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground text-sm">
                              {selectedClient.company_name ? `${selectedClient.display_name} (${selectedClient.company_name})` : selectedClient.display_name}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 font-medium">From Client Profile</span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                            {(selectedClient.phone || (selectedClient as any).mobile) && (
                              <div><strong className="text-foreground">Phone:</strong> {selectedClient.phone || (selectedClient as any).mobile}</div>
                            )}
                            {selectedClient.tax_number && (
                              <div><strong className="text-foreground">GSTIN:</strong> {selectedClient.tax_number}</div>
                            )}
                            {selectedClient.email && (
                              <div><strong className="text-foreground">Email:</strong> {selectedClient.email}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Client *</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        className="h-9"
                        placeholder="Type to search clients..."
                        value={clientSearch}
                        onChange={(e) => {
                          setClientSearch(e.target.value);
                          setClientDropdownOpen(true);
                          if (!e.target.value) setClientId("");
                        }}
                        onFocus={() => setClientDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setClientDropdownOpen(false), 200)}
                      />
                      <button
                        type="button"
                        className="absolute right-0 top-0 h-9 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground"
                        onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      {clientDropdownOpen && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
                          {clients
                            .filter((c) => !clientSearch.trim() || c.display_name.toLowerCase().includes(clientSearch.toLowerCase()) || (c.company_name && c.company_name.toLowerCase().includes(clientSearch.toLowerCase())))
                            .map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${clientId === c.id ? "bg-accent/50 font-medium" : ""}`}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setClientId(c.id);
                                  setClientSearch(c.display_name);
                                  setClientDropdownOpen(false);
                                  setClientStateOverride("");
                                }}
                              >
                                <div className="font-medium">{c.display_name}</div>
                                {c.company_name && <div className="text-xs text-muted-foreground">{c.company_name}</div>}
                              </button>
                            ))}
                          {clients.filter((c) => !clientSearch.trim() || c.display_name.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No clients found</div>
                          )}
                        </div>
                      )}
                    </div>
                    <Button type="button" variant="outline" size="icon" onClick={() => setAddClientOpen(true)} title="Add New Client">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Bill To Card (Fed Client Data) */}
                  {selectedClient && (
                    <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-xs space-y-1.5 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Bill To (Client Details)</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">From Client Profile</span>
                      </div>
                      <div className="font-semibold text-foreground text-sm">
                        {selectedClient.company_name ? `${selectedClient.display_name} (${selectedClient.company_name})` : selectedClient.display_name}
                      </div>
                      <div className="text-muted-foreground leading-relaxed">
                        {(() => {
                          const addr = selectedClient.billing_address;
                          const clientResolvedState = extractEntityState(selectedClient);
                          const stateStr = clientResolvedState ? formatStateWithCode(clientResolvedState) : ((addr && typeof addr === 'object') ? (addr as any).state : "");
                          if (!addr && !stateStr) return <span className="italic">No billing address saved for this client</span>;
                          if (typeof addr === "string") return addr;
                          const parts = [
                            (addr as any)?.street, 
                            (addr as any)?.city, 
                            stateStr, 
                            (addr as any)?.zip
                          ].filter(Boolean);
                          return parts.length > 0 ? parts.join(", ") : <span className="italic">No billing address saved</span>;
                        })()}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-muted-foreground">
                        {selectedClient.tax_number && (
                          <div><strong className="text-foreground">GSTIN:</strong> {selectedClient.tax_number}</div>
                        )}
                        {(selectedClient.phone || (selectedClient as any).mobile) && (
                          <div><strong className="text-foreground">Phone:</strong> {selectedClient.phone || (selectedClient as any).mobile}</div>
                        )}
                        {selectedClient.email && (
                          <div><strong className="text-foreground">Email:</strong> {selectedClient.email}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Ship To Section */}
              {!isRetail && (
                <div className="pt-2 border-t border-border/50 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="same_as_billing"
                      checked={shippingSameAsBilling}
                      onCheckedChange={(c) => {
                        const val = !!c;
                        setShippingSameAsBilling(val);
                        if (!val && selectedClient) {
                          const sAddr = selectedClient.shipping_address as any;
                          if (sAddr && typeof sAddr === "object") {
                            if (!shippingName && sAddr.name) setShippingName(sAddr.name);
                            if (!shippingStreet && sAddr.street) setShippingStreet(sAddr.street);
                            if (!shippingCity && sAddr.city) setShippingCity(sAddr.city);
                            if (!shippingState && sAddr.state) setShippingState(sAddr.state);
                            if (!shippingZip && sAddr.zip) setShippingZip(sAddr.zip);
                            if (!shippingPhone && sAddr.phone) setShippingPhone(sAddr.phone);
                            if (!shippingGst && sAddr.gstin) setShippingGst(sAddr.gstin);
                          } else if (!shippingName) {
                            setShippingName(selectedClient.company_name || selectedClient.display_name || "");
                          }
                        }
                      }}
                    />
                    <label htmlFor="same_as_billing" className="text-xs font-medium leading-none cursor-pointer">
                      Bill To and Ship To are same
                    </label>
                  </div>

                  {!shippingSameAsBilling && (
                    <div className="rounded-lg border border-border bg-card p-3 space-y-3 mt-2">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Ship To (Shipping Details)</span>
                        <span className="text-[10px] text-muted-foreground">Enter delivery address details</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs">Shipping Name / Consignee</Label>
                          <Input
                            placeholder="Recipient / Company / Branch Name"
                            value={shippingName}
                            onChange={(e) => setShippingName(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs">Street / Address</Label>
                          <Input
                            placeholder="Plot No., Building, Street address..."
                            value={shippingStreet}
                            onChange={(e) => setShippingStreet(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">City</Label>
                          <Input
                            placeholder="City"
                            value={shippingCity}
                            onChange={(e) => setShippingCity(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">State</Label>
                          <Select 
                            value={INDIAN_STATES.find(s => s.code === shippingState || s.name.toLowerCase() === (shippingState || "").toLowerCase())?.name || shippingState} 
                            onValueChange={setShippingState}
                          >
                            <SelectTrigger className="h-8 text-xs bg-white dark:bg-background">
                              <SelectValue placeholder="Select State" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {INDIAN_STATES.map((s) => (
                                <SelectItem key={s.code} value={s.name}>
                                  {s.name} ({s.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Pincode</Label>
                          <Input
                            placeholder="Pincode / ZIP"
                            value={shippingZip}
                            onChange={(e) => setShippingZip(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Phone Number</Label>
                          <Input
                            placeholder="Contact phone number"
                            value={shippingPhone}
                            onChange={(e) => setShippingPhone(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs">Shipping GSTIN (Optional)</Label>
                          <Input
                            placeholder="GSTIN if shipping to different GST branch"
                            value={shippingGst}
                            onChange={(e) => setShippingGst(e.target.value.toUpperCase())}
                            className="h-8 text-xs uppercase"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
                <AddClientDialog open={addClientOpen} onOpenChange={setAddClientOpen} onClientAdded={(c) => { setClients(prev => [...prev, c]); setClientId(c.id); setClientSearch(c.display_name); }} />
                <ItemFormDialog open={addItemOpen} onOpenChange={setAddItemOpen} onItemSaved={(item) => { if(item) setCatalogItems(prev => [...prev, item]); }} />
                {clientId && clientAgingSummary && clientAgingSummary.totalDue > 0 && (
                  <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-400">
                      <AlertTriangle className="h-4 w-4" />
                      Client Pending Summary
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md bg-background p-2 border">
                        <span className="text-muted-foreground">Total Billed</span>
                        <p className="font-bold text-foreground">{formatCurrency(clientAgingSummary.totalBilled, org?.currency_code || "INR")}</p>
                      </div>
                      <div className="rounded-md bg-background p-2 border border-destructive/30">
                        <span className="text-muted-foreground">Total Due</span>
                        <p className="font-bold text-destructive">{formatCurrency(clientAgingSummary.totalDue, org?.currency_code || "INR")}</p>
                      </div>
                      {clientAgingSummary.over15 > 0 && (
                        <div className="rounded-md bg-background p-2 border border-orange-300 dark:border-orange-700">
                          <span className="text-muted-foreground">15+ Days Overdue</span>
                          <p className="font-bold text-orange-600 dark:text-orange-400">{formatCurrency(clientAgingSummary.over15, org?.currency_code || "INR")}</p>
                        </div>
                      )}
                      {clientAgingSummary.over45 > 0 && (
                        <div className="rounded-md bg-background p-2 border border-destructive/50">
                          <span className="text-muted-foreground">45+ Days Overdue</span>
                          <p className="font-bold text-destructive">{formatCurrency(clientAgingSummary.over45, org?.currency_code || "INR")}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {clientId && clientAdvanceCredit > 0.001 && (
                  <div className="mt-3 rounded-xl border-2 border-[#e77817]/40 dark:border-[#e77817]/50 bg-gradient-to-r from-orange-50/80 via-amber-50/40 to-blue-50/70 dark:from-orange-950/20 dark:via-slate-900/40 dark:to-blue-950/30 p-3.5 flex items-center justify-between gap-3 text-xs shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-[#e77817]/15 dark:bg-[#e77817]/25 text-[#e77817] border border-[#e77817]/30 shrink-0">
                        <Wallet className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm block">
                          Available Advance Credit: <span className="text-[#e77817]">{formatCurrency(clientAdvanceCredit, org?.currency_code || "INR")}</span>
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-300">
                          This client has advance credit available. It can be applied and adjusted against this invoice upon recording payment.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* State Override if Client State is missing */}
                {clientId && !clientState && (
                  <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                      <AlertTriangle className="h-4 w-4" />
                      Client state missing
                    </div>
                    <p className="text-xs text-yellow-600 dark:text-yellow-500">
                      Select the client's state to correctly calculate CGST/SGST vs IGST.
                    </p>
                    <Select value={clientStateOverride} onValueChange={async (val) => {
                      setClientStateOverride(val);
                      if (selectedClient?.id) {
                        const existingAddr = (selectedClient.billing_address && typeof selectedClient.billing_address === 'object') ? selectedClient.billing_address : {};
                        const updatedAddr = { ...existingAddr, state: val };
                        await supabase.from("clients").update({ billing_address: updatedAddr }).eq("id", selectedClient.id);
                        setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...c, billing_address: updatedAddr } : c));
                        toast({ title: "Client state saved", description: "State saved to client profile for billing." });
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
            <div className="space-y-4">
              {Number(paymentTerms) === 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Invoice #</Label>
                    <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Issue Date</Label>
                    <Input
                      type="date"
                      value={issueDate}
                      onChange={(e) => {
                        setIssueDate(e.target.value);
                        setDueDate(e.target.value);
                      }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Invoice #</Label>
                      <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Terms</Label>
                      <Select value={String(paymentTerms)} onValueChange={(v) => {
                        const parsed = parseInt(v);
                        const val = isNaN(parsed) ? 0 : parsed;
                        setPaymentTerms(val);
                        if (val > 0) {
                          const d = new Date(issueDate);
                          d.setDate(d.getDate() + val);
                          setDueDate(d.toISOString().split("T")[0]);
                        } else {
                          setDueDate(issueDate);
                        }
                      }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Due on Receipt</SelectItem>
                          <SelectItem value="15">Net 15</SelectItem>
                          <SelectItem value="30">Net 30</SelectItem>
                          <SelectItem value="45">Net 45</SelectItem>
                          <SelectItem value="60">Net 60</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Issue Date</Label>
                      <Input
                        type="date"
                        value={issueDate}
                        onChange={(e) => {
                          setIssueDate(e.target.value);
                          if (paymentTerms > 0) {
                            const d = new Date(e.target.value);
                            d.setDate(d.getDate() + paymentTerms);
                            setDueDate(d.toISOString().split("T")[0]);
                          } else {
                            setDueDate(e.target.value);
                          }
                        }}
                      />
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
      <CustomFieldsForm entityType="invoice" entityId={id} onChange={setCustomFieldValues} />

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
            <div className="col-span-2 text-center">Quantity</div>
            <div className="col-span-2 text-right">Rate</div>
            {hasGst && <div className="col-span-2 text-left pl-2">Tax</div>}
            <div className={`text-right ${!hasGst ? 'col-span-4' : 'col-span-2'}`}>Amount</div>
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
                  onAutoAddLine={() => {
                    if (index === lines.length - 1) addLine();
                  }}
                />
              ))}
            </SortableContext>
          </DndContext>
          {/* Live Calculation Totals Row */}
          {lines.length > 0 && (
            <div className="flex items-center gap-1 py-3 border-b border-t mt-[-1px] bg-slate-50/50 text-slate-700 font-medium">
              <div className="w-4 shrink-0" /> {/* Spacer for grip handle */}
              <div className="grid flex-1 grid-cols-12 gap-2 items-center px-1">
                <div className="col-span-4 text-xs font-semibold uppercase tracking-wider text-right pr-2">Total</div>
                <div className="col-span-2 text-center text-sm font-semibold">{calculatedLines.reduce((s, l) => s + (Number(l.quantity) || 0), 0).toFixed(2)}</div>
                <div className="col-span-2 text-right text-sm font-semibold text-slate-600">
                  {/* Original rate total (before discount) */}
                  <div>{formatCurrency(lines.reduce((s, l) => s + ((Number(l.quantity) || 0) * (Number(l.rate) || 0)), 0), org?.currency_code || "INR")}</div>
                  {/* Discounted rate total — shown below if any item has discount */}
                  {lines.some(l => Number(l.discount) > 0) && (
                    <div className="text-[10px] text-emerald-600 font-semibold">
                      {formatCurrency(calculatedLines.reduce((s, l) => s + (l.amount - l.tax_amount), 0), org?.currency_code || "INR")} (discounted)
                    </div>
                  )}
                </div>
                {hasGst && <div className="col-span-2 text-left pl-2 text-sm font-semibold text-slate-600">{formatCurrency(calculatedLines.reduce((s, l) => s + l.tax_amount, 0), org?.currency_code || "INR")}</div>}
                <div className={`text-right text-sm font-bold ${!hasGst ? 'col-span-4' : 'col-span-2'}`}>
                  {/* Amount = discounted price WITHOUT GST */}
                  {formatCurrency(calculatedLines.reduce((s, l) => s + (hasGst ? l.amount - l.tax_amount : l.amount), 0), org?.currency_code || "INR")}
                </div>
              </div>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={addLine} className="mt-2 text-primary hover:text-primary/80 font-medium">
            <Plus className="mr-1 h-4 w-4" /> Click here to add new item
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Quick builder section toggles */}
          <div className="flex items-center justify-between pb-2 text-xs text-muted-foreground border-b flex-wrap gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Invoice Sections:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                type="button"
                variant={prefShowNotes ? "default" : "outline"}
                size="sm"
                className="h-6 px-2 text-[11px] font-normal"
                onClick={() => {
                  const next = !prefShowNotes;
                  setPrefShowNotes(next);
                  setShowNotes(next);
                }}
              >
                {prefShowNotes ? "✓ Notes" : "+ Notes"}
              </Button>
              {!isRetail && (
                <Button
                  type="button"
                  variant={prefShowTerms ? "default" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-[11px] font-normal"
                  onClick={() => {
                    const next = !prefShowTerms;
                    setPrefShowTerms(next);
                    setShowTerms(next);
                  }}
                >
                  {prefShowTerms ? "✓ Terms" : "+ Terms"}
                </Button>
              )}
              <Button
                type="button"
                variant={prefShowBankDetails ? "default" : "outline"}
                size="sm"
                className="h-6 px-2 text-[11px] font-normal"
                onClick={() => {
                  const next = !prefShowBankDetails;
                  setPrefShowBankDetails(next);
                  setShowBankDetails(next);
                  if (!next) setIncludeBankDetails(false);
                }}
              >
                {prefShowBankDetails ? "✓ Bank Details" : "+ Bank Details"}
              </Button>
              {!isRetail && (
                <Button
                  type="button"
                  variant={prefShowDisplayOptions ? "default" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-[11px] font-normal"
                  onClick={() => setPrefShowDisplayOptions(!prefShowDisplayOptions)}
                >
                  {prefShowDisplayOptions ? "✓ Display Options" : "+ Display Options"}
                </Button>
              )}
              <Button
                type="button"
                variant={prefShowCompliance ? "default" : "outline"}
                size="sm"
                className="h-6 px-2 text-[11px] font-normal"
                onClick={() => setPrefShowCompliance(!prefShowCompliance)}
              >
                {prefShowCompliance ? "✓ Compliance" : "+ Compliance"}
              </Button>
            </div>
          </div>

          {/* Payment Mode (Compact on Left) */}
          <div className="p-3 rounded-lg border bg-card/60 space-y-1.5 max-w-sm">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-primary" />
                Payment Mode
              </Label>
              {paymentMode && paymentMode !== "unpaid" && paymentMode !== "none" && (
                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  Paid In Full ✓
                </span>
              )}
            </div>
            <Select value={paymentMode} onValueChange={setPaymentMode}>
              <SelectTrigger className="h-8 text-xs bg-white dark:bg-background">
                <SelectValue placeholder="Select Payment Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unpaid">Unpaid / Collect Later</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer / NEFT</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI / QR</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="debit_card">Debit Card</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Customer Notes */}
          {prefShowNotes && (
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes visible on invoice..." />
            </div>
          )}

          {/* Terms & Conditions */}
          {!isRetail && prefShowTerms && (
            <div className="space-y-2">
              <Label>Terms & Conditions</Label>
              <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Payment terms, late fees..." />
            </div>
          )}

          {/* Bank Account Details */}
          {prefShowBankDetails && (
            <div className="space-y-3 rounded-md border p-3.5 bg-card/60">
              <label className="flex items-center justify-between cursor-pointer select-none">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Bank Account Details</span>
                </div>
                <Checkbox
                  checked={includeBankDetails}
                  onCheckedChange={(v) => setIncludeBankDetails(!!v)}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Display bank transfer &amp; payment instructions on this invoice. Saved automatically for this organization.
              </p>

              {includeBankDetails && (
                <div className="space-y-4 pt-2">
                  <Select value={selectedBankAccountId || undefined} onValueChange={handleBankAccountSelect}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {savedBankAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.bank_name} {acc.account_number ? `- ...${acc.account_number.slice(-4)}` : ""}
                        </SelectItem>
                      ))}
                      <SelectItem value="add-new" className="text-primary font-medium">
                        + Add New Account
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {selectedBankAccountId && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Bank Name</Label>
                        <div className="font-medium bg-muted/30 p-2 rounded-md">{bankName || "-"}</div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Account Holder Name</Label>
                        <div className="font-medium bg-muted/30 p-2 rounded-md">{bankAccountName || "-"}</div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Account Number</Label>
                        <div className="font-mono bg-muted/30 p-2 rounded-md">{bankAccountNumber || "-"}</div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">IFSC Code</Label>
                        <div className="font-mono bg-muted/30 p-2 rounded-md uppercase">{bankIfsc || "-"}</div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Branch Name</Label>
                        <div className="font-medium bg-muted/30 p-2 rounded-md">{bankBranch || "-"}</div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">UPI ID</Label>
                        <div className="font-medium bg-muted/30 p-2 rounded-md">{bankUpiId || "-"}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <Dialog open={addNewBankDialogOpen} onOpenChange={setAddNewBankDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Bank Account</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input value={newBankForm.bank_name} onChange={(e) => setNewBankForm({ ...newBankForm, bank_name: e.target.value })} placeholder="e.g. HDFC Bank" />
                </div>
                <div className="space-y-2">
                  <Label>Account Holder Name</Label>
                  <Input value={newBankForm.account_holder_name} onChange={(e) => setNewBankForm({ ...newBankForm, account_holder_name: e.target.value })} placeholder="e.g. Acme Corp" />
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input value={newBankForm.account_number} onChange={(e) => setNewBankForm({ ...newBankForm, account_number: e.target.value })} placeholder="e.g. 50200012345678" />
                </div>
                <div className="space-y-2">
                  <Label>IFSC Code</Label>
                  <Input value={newBankForm.ifsc} onChange={(e) => setNewBankForm({ ...newBankForm, ifsc: e.target.value })} placeholder="e.g. HDFC0001234" />
                </div>
                <div className="space-y-2">
                  <Label>Branch Name</Label>
                  <Input value={newBankForm.branch} onChange={(e) => setNewBankForm({ ...newBankForm, branch: e.target.value })} placeholder="e.g. Connaught Place" />
                </div>
                <div className="space-y-2">
                  <Label>UPI ID (Optional)</Label>
                  <Input value={newBankForm.upi_id} onChange={(e) => setNewBankForm({ ...newBankForm, upi_id: e.target.value })} placeholder="e.g. company@okhdfcbank" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddNewBankDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveNewBankAccount}>Save Account</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Display Options */}
          {!isRetail && prefShowDisplayOptions && (
            <div className="space-y-2 rounded-md border p-3">
              <div className="text-sm font-medium">Display Options</div>
              <p className="text-xs text-muted-foreground mb-2">Configure what appears on the invoice PDF.</p>
              
              <label className="flex items-center gap-2 cursor-pointer hover:bg-muted/40 p-1 rounded">
                <Checkbox checked={autoRoundOff} onCheckedChange={(v) => setAutoRoundOff(!!v)} />
                <span className="text-sm font-medium">Auto Round Off Total</span>
              </label>
              {prefShowBankDetails && (
                <label className="flex items-center gap-2 cursor-pointer hover:bg-muted/40 p-1 rounded">
                  <Checkbox checked={showBankDetails} onCheckedChange={(v) => setShowBankDetails(!!v)} />
                  <span className="text-sm font-medium">Show Bank / UPI Details</span>
                </label>
              )}
              {prefShowTerms && (
                <label className="flex items-center gap-2 cursor-pointer hover:bg-muted/40 p-1 rounded">
                  <Checkbox checked={showTerms} onCheckedChange={(v) => setShowTerms(!!v)} />
                  <span className="text-sm font-medium">Show Terms & Conditions</span>
                </label>
              )}
              {prefShowNotes && (
                <label className="flex items-center gap-2 cursor-pointer hover:bg-muted/40 p-1 rounded">
                  <Checkbox checked={showNotes} onCheckedChange={(v) => setShowNotes(!!v)} />
                  <span className="text-sm font-medium">Show Notes</span>
                </label>
              )}
            </div>
          )}

          <label className="flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/40">
            <Checkbox
              checked={deductStock}
              onCheckedChange={(v) => setDeductStock(!!v)}
              className="mt-0.5"
            />
            <div className="text-sm">
              <div className="font-medium">Deduct stock from inventory</div>
              <div className="text-xs text-muted-foreground">
                When saved, product item quantities on this invoice will be subtracted from stock.
              </div>
            </div>
          </label>

          {/* Include Authorized Signature */}
          <div className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/40 cursor-pointer">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="invoice-show-signature" 
                checked={showSignature} 
                onCheckedChange={(checked) => {
                  if (checked && (!org?.address?.signature_type || org.address.signature_type === 'none')) {
                    toast({ title: "No signature found", description: "Please upload or configure your signature in Settings > Invoices" });
                    return;
                  }
                  setShowSignature(!!checked);
                }} 
              />
              <Label htmlFor="invoice-show-signature" className="cursor-pointer text-sm font-medium">
                Include Authorized Signature
              </Label>
            </div>
            {(!org?.address?.signature_type || org?.address?.signature_type === 'none') && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                (Setup in Settings &gt; Invoices)
              </span>
            )}
          </div>

          {/* Phase 5 — Opt-in Compliance */}
          {prefShowCompliance && (
            <div className="space-y-2 rounded-md border p-3">
              <div className="text-sm font-medium">Compliance (optional)</div>
              <p className="text-xs text-muted-foreground">
                Tick to record IRN / E-way bill details. Nothing is generated automatically — paste the values you receive from the GST / NIC portal.
              </p>

              <label className="flex items-start gap-2 cursor-pointer mt-2">
                <Checkbox checked={generateIrn} onCheckedChange={(v) => setGenerateIrn(!!v)} className="mt-0.5" />
                <span className="text-sm font-medium">E-invoice (IRN) details</span>
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

        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{fmt(subtotal)}</span>
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
                {totalDiscount > 0 && <span className="text-destructive font-medium">-{fmt(totalDiscount)}</span>}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm gap-2">
              <span className="text-muted-foreground">Fixed Cost (Expenses)</span>
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
                {cleanExpenses > 0 && <span className="text-foreground font-medium">+{fmt(cleanExpenses)}</span>}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm gap-2">
              <span className="text-muted-foreground">Shipping</span>
              <div className="flex items-center gap-1">
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
                {cleanShipping > 0 && <span className="text-foreground font-medium">+{fmt(cleanShipping)}</span>}
              </div>
            </div>
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
            {hasGst && (
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
            )}
            {tdsTcsApplicable && tdsTcsType === "tcs" && tcsAmount > 0 && (
              <div className="flex items-center justify-between text-xs text-emerald-600 font-medium px-2">
                <span>TCS Collected ({cleanTdsTcsRate}%)</span>
                <span>+{fmt(tcsAmount)}</span>
              </div>
            )}
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
                        <input type="radio" name="tdsTcsType" checked={tdsTcsType === "tds"} onChange={() => setTdsTcsType("tds")} className="cursor-pointer" />
                        <span className="text-xs font-medium">TDS (-)</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="tdsTcsType" checked={tdsTcsType === "tcs"} onChange={() => setTdsTcsType("tcs")} className="cursor-pointer" />
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
                      : "TCS is calculated on Total Invoice Value (Basic Amount + GST) and added to total."}
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between text-sm gap-2">
              <Input
                  className="h-7 w-24 text-xs"
                  value={finalAdjustmentName}
                  onChange={(e) => setAdjustmentName(e.target.value)}
                  disabled={autoRoundOff}
                />
                <Input
                  type="number"
                  className="h-7 w-24 text-xs text-right"
                  value={finalAdjustment}
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

      {/* Fixed Bottom Action Bar */}
      <div className="sticky bottom-0 z-30 -mx-6 -mb-6 mt-8 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 border-t px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-6">
          <div className="flex items-baseline gap-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total Amount:</span>
            <span className="text-xl font-extrabold text-foreground">{fmt(total)}</span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground border-l pl-4 border-border">
            <span className="font-medium">{lines.filter(l => l.name.trim() || l.rate > 0).length} Line Item(s)</span>
            <span className="text-muted-foreground/40">•</span>
            <label className="flex items-center gap-2 cursor-pointer font-medium hover:text-foreground select-none">
              <Checkbox
                checked={deductStock}
                onCheckedChange={(v) => setDeductStock(!!v)}
                className="h-4 w-4"
              />
              <span>Deduct from Inventory</span>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/invoices")}>Cancel</Button>
          <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving}>
            <Save className="mr-1.5 h-4 w-4" /> Save as Draft
          </Button>
          <div className="flex">
            <Button className="rounded-r-none font-semibold shadow-sm" onClick={() => handleSave("sent")} disabled={saving}>
              {saving ? <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              {saving ? "Saving..." : "Save Invoice"}
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
                <DropdownMenuItem onClick={() => handleActionClick("whatsapp")}>
                  <MessageCircle className="mr-2 h-4 w-4 text-emerald-600" /> Save and WhatsApp
                  {!canSendDirectEmailOrWhatsApp(plan, activeOrgPlans) && <Lock className="ml-auto h-3.5 w-3.5 text-amber-500" />}
                </DropdownMenuItem>

                <DropdownMenuItem onClick={async () => { await handleSave("sent"); setTimeout(() => window.print(), 500); }}>
                  <Printer className="mr-2 h-4 w-4" /> Save and Print
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  await handleSave("sent");
                  if (id) {
                    const { data: existing } = await supabase.from("portal_tokens").select("token").eq("entity_type", "invoice").eq("entity_id", id).maybeSingle();
                    let token = existing?.token;
                    if (!token) {
                      const { data } = await supabase.from("portal_tokens").insert({ org_id: org!.id, entity_type: "invoice", entity_id: id }).select("token").single();
                      token = data?.token;
                    }
                    if (token) {
                      await navigator.clipboard.writeText(`${window.location.origin}/portal/${token}`);
                      toast({ title: "Invoice saved & portal link copied!" });
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

      <PlanSelectorModal 
        open={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
        forceOrgId={org?.id}
      />

      {/* Incomplete Profile Alert Dialog */}
      <AlertDialog open={showIncompleteProfileDialog} onOpenChange={setShowIncompleteProfileDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-lg">Profile Completion Required</AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-muted-foreground">
                  Address & PIN Code required for invoicing
                </AlertDialogDescription>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              To comply with billing standards and generate GST-ready invoices, you must complete your <strong>Street Address</strong> and <strong>PIN Code</strong> in your profile settings before creating invoices.
            </p>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => navigate("/settings?tab=profile")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              Complete Profile in Settings
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
