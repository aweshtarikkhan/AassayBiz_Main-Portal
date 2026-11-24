import { useEffect, useState, useMemo } from "react";
import JsBarcode from "jsbarcode";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/app-store";
import { COMMON_UNITS, INDIAN_GST_SLABS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Package, Trash2, FileText, Tag, Users, Database, X, Settings, Info, Ruler, Plus, Lock, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";


interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: any | null;
  onItemSaved?: (item?: any) => void;
  categories?: string[];
  defaultType?: "product" | "service";
}

export function ItemFormDialog({ open, onOpenChange, editItem, onItemSaved, categories = [], defaultType = "product" }: ItemFormDialogProps) {
  const org = useAppStore((s) => s.organization);
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("basic");
  const [loading, setLoading] = useState(false);
  const [taxRates, setTaxRates] = useState<any[]>([]);
  const [partyPrices, setPartyPrices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [customFieldDefs, setCustomFieldDefs] = useState<any[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  
  const hasGst = Boolean((org?.gst_number?.trim() || (org as any)?.tax_number?.trim()) || (org as any)?.gst_enabled);

  const defaultForm = {
    name: "", description: "", sku: "", type: defaultType,
    unit_price: 0, sales_price_type: hasGst ? "with_tax" : "without_tax",
    purchase_price: 0, purchase_price_type: hasGst ? "with_tax" : "without_tax",
    discount: 0,
    unit: defaultType === "service" ? "" : "pcs", tax_id: null as string | null,
    category: "", stock_quantity: 0, hsn_code: "",
    show_online: false,
    as_of_date: new Date().toISOString().split('T')[0],
    sub_unit: "", sub_unit_conversion_rate: 1,
    low_stock_threshold: 5,
    show_sub_unit: false,
    show_low_stock_warning: false,
    batch_no: "",
    has_expiry: false,
    expiry_date: "",
  };
  
  const [form, setForm] = useState(defaultForm);
  
  const [showAddCf, setShowAddCf] = useState(false);
  const [newCfName, setNewCfName] = useState("");
  const [newCfType, setNewCfType] = useState("text");
  const [addingCf, setAddingCf] = useState(false);

  const handleAddCustomField = async () => {
    if (!newCfName.trim() || !org?.id) return;
    setAddingCf(true);
    const { error, data } = await supabase.from("custom_field_definitions").insert({
      org_id: org.id,
      entity_type: "item",
      field_name: newCfName.trim(),
      field_type: newCfType,
      sort_order: customFieldDefs.length,
      is_required: false
    }).select().single();
    if (error) {
      toast({ title: "Failed to add field", description: error.message, variant: "destructive" });
    } else {
      setCustomFieldDefs([...customFieldDefs, data]);
      setNewCfName("");
      setNewCfType("text");
      setShowAddCf(false);
      toast({ title: "Field added successfully" });
    }
    setAddingCf(false);
  };

  useEffect(() => {
    if (open && org?.id) {
      fetchDependencies();
      if (editItem) {
        setForm({
          ...defaultForm,
          name: editItem.name || "", description: editItem.description || "", sku: editItem.sku || "",
          type: editItem.type || defaultType, unit_price: Number(editItem.unit_price) || 0, unit: editItem.unit !== undefined && editItem.unit !== null ? editItem.unit : (editItem.type === "service" ? "" : "pcs"),
          tax_id: hasGst ? editItem.tax_id : null, 
          category: editItem.category || "", 
          stock_quantity: Number(editItem.stock_quantity || 0),
          hsn_code: hasGst ? (editItem.hsn_code || "") : "",
          purchase_price: Number(editItem.purchase_price) || 0,
          sales_price_type: hasGst ? (editItem.sales_price_type || "with_tax") : "without_tax",
          purchase_price_type: hasGst ? (editItem.purchase_price_type || "with_tax") : "without_tax",
          discount: Number(editItem.discount) || 0,
          show_online: editItem.show_online || false,
          sub_unit: editItem.sub_unit || "",
          sub_unit_conversion_rate: Number(editItem.sub_unit_conversion_rate) || 1,
          show_sub_unit: Boolean(editItem.sub_unit && editItem.sub_unit.trim()),
          low_stock_threshold: editItem.low_stock_threshold !== null && editItem.low_stock_threshold !== undefined ? Number(editItem.low_stock_threshold) : 5,
          show_low_stock_warning: Boolean(editItem.low_stock_threshold !== null && editItem.low_stock_threshold !== undefined && Number(editItem.low_stock_threshold) > 0),
          batch_no: (editItem as any).batch_no || "",
          has_expiry: Boolean(editItem.has_expiry),
          expiry_date: editItem.expiry_date || "",
        });
        fetchItemDetails(editItem.id);
      } else {
        setForm(defaultForm);
        setPartyPrices([]);
        setCustomFieldValues({});
        setActiveTab("basic");
      }
    }
  }, [open, org?.id, editItem]);

  const fetchDependencies = async () => {
    if (!org?.id) return;
    const [tRes, cRes, vRes, cfRes] = await Promise.all([
      supabase.from("tax_rates").select("*").eq("org_id", org.id),
      supabase.from("clients").select("id, display_name").eq("org_id", org.id).eq("status", "active"),
      supabase.from("vendors").select("id, name").eq("org_id", org.id),
      supabase.from("custom_field_definitions").select("*").eq("org_id", org.id).eq("entity_type", "item").order("sort_order")
    ]);
    if (tRes.data) setTaxRates(tRes.data);
    if (cRes.data) setClients(cRes.data);
    if (vRes.data) setVendors(vRes.data);
    if (cfRes.data) setCustomFieldDefs(cfRes.data);
  };

  const fetchItemDetails = async (itemId: string) => {
    const [partyRes, cfRes] = await Promise.all([
      supabase.from("item_party_prices").select("*").eq("item_id", itemId),
      supabase.from("custom_field_values").select("*").eq("entity_id", itemId)
    ]);
    setPartyPrices(partyRes.data || []);
    
    const cfMap: Record<string, any> = {};
    cfRes.data?.forEach(v => cfMap[v.field_id] = v.field_value);
    setCustomFieldValues(cfMap);
  };

  const handleSave = async (saveAndNew = false) => {
    if (!form.name.trim()) {
      toast({ title: "Item Name required", variant: "destructive" });
      setActiveTab("basic");
      return;
    }

    setLoading(true);

    let finalTaxId = form.tax_id;
    if (form.tax_id) {
      const slab = INDIAN_GST_SLABS.find(s => s.id === form.tax_id);
      if (slab) {
        if (slab.rate === 0) {
          finalTaxId = null;
        } else {
          const existing = taxRates.find(t => Number(t.rate) === slab.rate);
          if (existing) {
            finalTaxId = existing.id;
          } else {
            const { data: newTax } = await supabase.from('tax_rates').insert({
              org_id: org!.id,
              name: slab.name,
              rate: slab.rate,
            }).select().single();
            if (newTax) {
              finalTaxId = newTax.id;
              setTaxRates(prev => [...prev, newTax]);
            }
          }
        }
      }
    }

    const payload = {
      org_id: org!.id,
      name: form.name,
      description: form.description || null,
      sku: form.sku || null,
      type: form.type,
      unit_price: form.unit_price,
      unit: form.unit?.trim() ? form.unit.trim() : null,
      tax_id: hasGst ? finalTaxId : null,
      category: form.category || null,
      stock_quantity: form.type === "service" ? 0 : form.stock_quantity,
      hsn_code: hasGst ? (form.hsn_code || null) : null,
      purchase_price: form.purchase_price,
      sales_price_type: hasGst ? form.sales_price_type : "without_tax",
      purchase_price_type: hasGst ? form.purchase_price_type : "without_tax",
      sub_unit: form.show_sub_unit && form.sub_unit && form.sub_unit.trim() ? form.sub_unit.trim() : null,
      sub_unit_conversion_rate: form.show_sub_unit && form.sub_unit && form.sub_unit.trim() ? (Number(form.sub_unit_conversion_rate) || 1) : null,
      low_stock_threshold: form.show_low_stock_warning ? (Number(form.low_stock_threshold) || 0) : null,
      discount: form.discount,
      show_online: form.show_online,
      batch_no: form.batch_no?.trim() ? form.batch_no.trim() : null,
      has_expiry: form.has_expiry,
      expiry_date: form.has_expiry && form.expiry_date ? form.expiry_date : null,
      is_active: true
    };

    let savedItem = null;

    if (editItem) {
      const { data, error } = await supabase.from("items").update(payload).eq("id", editItem.id).select().single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setLoading(false); return; }
      savedItem = data;
      toast({ title: "Item updated" });
    } else {
      const { data, error } = await supabase.from("items").insert(payload).select().single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setLoading(false); return; }
      savedItem = data;
      toast({ title: "Item created" });
    }
    
    if (savedItem) {
      await supabase.from("item_party_prices").delete().eq("item_id", savedItem.id);
      if (partyPrices.length > 0) {
        await supabase.from("item_party_prices").insert(
          partyPrices.map(p => ({
            org_id: org!.id,
            item_id: savedItem.id,
            party_type: p.party_type,
            party_id: p.party_id,
            price: p.price
          }))
        );
      }

      await supabase.from("custom_field_values").delete().eq("entity_id", savedItem.id);
      const cfEntries = Object.entries(customFieldValues)
        .filter(([_, val]) => val !== undefined && val !== "")
        .map(([field_id, val]) => ({
          field_id,
          entity_id: savedItem.id,
          field_value: val,
        }));
      if (cfEntries.length > 0) {
        await supabase.from("custom_field_values").insert(cfEntries);
      }
    }
    
    setLoading(false);
    
    if (onItemSaved) {
      onItemSaved(savedItem);
    }

    if (saveAndNew) {
      setForm(defaultForm);
      setPartyPrices([]);
      setCustomFieldValues({});
      setActiveTab("basic");
    } else {
      onOpenChange(false);
    }
  };

  const handleGenerateBarcode = () => {
    let sku = form.sku;
    if (!sku) {
      sku = "ITM" + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
      setForm({ ...form, sku });
    }
    
    setTimeout(() => {
      const canvas = document.createElement("canvas");
      JsBarcode(canvas, sku, { format: "CODE128", displayValue: true, margin: 10, height: 50 });
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `barcode-${sku}.png`;
      link.href = url;
      link.click();
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 gap-0 overflow-hidden bg-slate-50 [&>button]:hidden">
        <div className="flex flex-col h-[85vh] max-h-[750px]">
          <div className="flex items-center justify-between px-6 py-4 border-b bg-white shadow-sm z-10">
            <DialogTitle className="text-xl font-semibold text-slate-800">{editItem ? "Edit Item" : "Create New Item"}</DialogTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex flex-1 overflow-hidden">
            <div className="w-[260px] bg-white border-r flex flex-col py-4">
              <div className="px-3 space-y-1">
                <button
                  onClick={() => setActiveTab("basic")}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === "basic" ? "bg-indigo-50/70 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  <span className="flex items-center gap-3"><FileText className="h-4 w-4" /> Basic Details</span>
                  <span className="text-destructive">*</span>
                </button>
                
                <div className="px-4 pt-6 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Advance Details</div>
                
                <button
                  onClick={() => setActiveTab("stock")}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === "stock" ? "bg-indigo-50/70 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  <Package className="h-4 w-4 mr-3" /> Stock Details
                </button>
                
                <button
                  onClick={() => setActiveTab("pricing")}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === "pricing" ? "bg-indigo-50/70 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  <Tag className="h-4 w-4 mr-3" /> Pricing Details
                </button>
                
                <button
                  onClick={() => setActiveTab("party")}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === "party" ? "bg-indigo-50/70 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  <Users className="h-4 w-4 mr-3" /> Party Wise Prices
                </button>
                
                <button
                  onClick={() => setActiveTab("custom")}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === "custom" ? "bg-indigo-50/70 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  <Database className="h-4 w-4 mr-3" /> Custom Fields
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              
              {activeTab === "basic" && (
                <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-3">
                    <Label className="text-slate-600">Item Type <span className="text-destructive">*</span></Label>
                    <RadioGroup 
                      value={form.type} 
                      onValueChange={(v) => {
                        const newType = v as "product" | "service";
                        setForm(prev => ({
                          ...prev,
                          type: newType,
                          unit: newType === "service" ? "" : (prev.unit || "pcs"),
                          stock_quantity: newType === "service" ? 0 : prev.stock_quantity,
                        }));
                      }}
                      className="grid grid-cols-2 gap-4 w-full"
                    >
                      <div className={`flex items-center justify-center space-x-2 border rounded-lg px-4 py-2.5 cursor-pointer transition-colors ${form.type === 'product' ? 'border-indigo-500 bg-indigo-50/30 ring-1 ring-indigo-500/20' : 'bg-white hover:bg-slate-50'}`}>
                        <RadioGroupItem value="product" id="r1" className="text-indigo-600 border-indigo-600" />
                        <Package className={`h-4 w-4 ${form.type === 'product' ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <Label htmlFor="r1" className="cursor-pointer font-medium">Product</Label>
                      </div>
                      <div className={`flex items-center justify-center space-x-2 border rounded-lg px-4 py-2.5 cursor-pointer transition-colors ${form.type === 'service' ? 'border-indigo-500 bg-indigo-50/30 ring-1 ring-indigo-500/20' : 'bg-white hover:bg-slate-50'}`}>
                        <RadioGroupItem value="service" id="r2" className="text-indigo-600 border-indigo-600" />
                        <Settings className={`h-4 w-4 ${form.type === 'service' ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <Label htmlFor="r2" className="cursor-pointer font-medium">Service</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-slate-600 flex items-center gap-1">Item Name <span className="text-destructive">*</span> <Info className="h-3.5 w-3.5 text-slate-400" /></Label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        value={form.name} 
                        onChange={(e) => setForm({ ...form, name: e.target.value })} 
                        placeholder="ex: Maggie 20gm" 
                        className="pl-9 h-11 border-indigo-200 focus-visible:ring-indigo-500 bg-white" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-slate-600">Sales Price</Label>
                      <div className="flex relative shadow-sm rounded-lg">
                        <span className="absolute left-3 top-3 text-slate-400">₹</span>
                        <Input 
                          type="number" 
                          value={form.unit_price || ""} 
                          onChange={(e) => setForm({ ...form, unit_price: parseFloat(e.target.value) || 0 })} 
                          className="pl-8 h-11 rounded-r-none border-r-0 bg-white focus-visible:ring-indigo-500 z-10" 
                          placeholder="ex: 200" 
                        />
                        <Select 
                          value={hasGst ? form.sales_price_type : "without_tax"} 
                          onValueChange={(v) => hasGst && setForm({...form, sales_price_type: v})}
                          disabled={!hasGst}
                        >
                          <SelectTrigger className="w-[130px] h-11 rounded-l-none bg-slate-50 border-l-0 text-slate-600 focus:ring-0 focus:ring-offset-0 disabled:opacity-80">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="without_tax">Without Tax</SelectItem>
                            {hasGst && <SelectItem value="with_tax">With Tax</SelectItem>}
                          </SelectContent>
                        </Select>
                      </div>
                      {(form.show_sub_unit || org?.sub_unit_enabled) && form.sub_unit && form.sub_unit_conversion_rate > 0 && form.unit_price > 0 && (
                        <div className="text-xs text-blue-600 font-medium mt-1.5 flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded border border-blue-100 w-fit">
                          <span>Sub-unit Price:</span>
                          <b>1 {form.sub_unit.toUpperCase()} = ₹{(form.unit_price / form.sub_unit_conversion_rate).toFixed(2)}</b>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-slate-600">GST Tax Rate(%)</Label>
                        {!hasGst && (
                          <TooltipProvider>
                            <Tooltip delayDuration={100}>
                              <TooltipTrigger asChild>
                                <button type="button" className="text-amber-500 hover:text-amber-600 inline-flex items-center">
                                  <HelpCircle className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-slate-900 text-white text-xs max-w-xs p-2.5 space-y-1 shadow-lg z-50">
                                <p className="font-semibold flex items-center gap-1 text-amber-400">
                                  <Lock className="w-3.5 h-3.5" /> Feature Locked
                                </p>
                                <p>Add your GST No. to unlock this feature.</p>
                                <a href="/settings?tab=general" className="text-indigo-300 underline font-medium block pt-0.5 hover:text-indigo-200">
                                  Add GST No. &rarr;
                                </a>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <Select 
                        disabled={!hasGst}
                        value={
                          !hasGst 
                            ? "exempt"
                            : (form.tax_id 
                                ? (INDIAN_GST_SLABS.find(s => s.id === form.tax_id)?.id || 
                                   INDIAN_GST_SLABS.find(s => {
                                     const t = taxRates.find(tr => tr.id === form.tax_id);
                                     return t && Number(t.rate) === s.rate;
                                   })?.id || form.tax_id)
                                : "exempt")
                        } 
                        onValueChange={(v) => {
                          if (!hasGst) return;
                          const slab = INDIAN_GST_SLABS.find(s => s.id === v);
                          if (slab) {
                            const matched = taxRates.find(t => Number(t.rate) === slab.rate);
                            setForm({ ...form, tax_id: matched ? matched.id : slab.id });
                          } else {
                            setForm({ ...form, tax_id: v === "exempt" ? null : v });
                          }
                        }}
                      >
                        <SelectTrigger className="h-11 bg-white disabled:bg-slate-100 disabled:text-slate-500">
                          <SelectValue placeholder="0% - Exempted" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDIAN_GST_SLABS.map((slab) => (
                            <SelectItem key={slab.id} value={slab.id}>
                              {slab.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!hasGst && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-400" /> Locked (No GST registered)
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-slate-600">Measuring Unit</Label>
                      <div className="relative">
                        <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                        <Select value={form.unit || "none"} onValueChange={(v) => setForm({ ...form, unit: v === "none" ? "" : v })}>
                          <SelectTrigger className="pl-9 h-11 bg-white">
                            <SelectValue placeholder={form.type === "service" ? "None (Blank)" : "Pieces(PCS)"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None (Blank)</SelectItem>
                            {COMMON_UNITS.map(u => (
                              <SelectItem key={u} value={u}>{u.toUpperCase()}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-600">Opening Stock</Label>
                        {form.type === "service" && (
                          <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked for Services
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                        <Input 
                          type="text" 
                          disabled={form.type === "service"}
                          value={form.type === "service" ? "N/A (Infinite / Unlimited)" : (form.stock_quantity || "")} 
                          onChange={(e) => setForm({ ...form, stock_quantity: parseFloat(e.target.value) || 0 })} 
                          className={`pl-9 h-11 pr-16 ${form.type === "service" ? "bg-slate-100 text-slate-500 cursor-not-allowed font-medium select-none" : "bg-white"}`} 
                          placeholder="ex: 150" 
                        />
                        <div className="absolute right-0 top-0 h-full flex items-center justify-center px-4 border-l text-slate-500 text-sm font-medium bg-slate-50 rounded-r-md min-w-16">
                          {form.type === "service" ? 'N/A' : (form.unit ? form.unit.toUpperCase() : 'PCS')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "stock" && (
                <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className={`grid ${hasGst ? "grid-cols-2" : "grid-cols-1"} gap-6`}>
                    <div className="space-y-3">
                      <Label className="text-slate-600">Item Code</Label>
                      <div className="flex rounded-lg shadow-sm">
                        <Input 
                          value={form.sku} 
                          onChange={(e) => setForm({ ...form, sku: e.target.value })} 
                          className="h-11 rounded-r-none bg-white" 
                          placeholder="ex: ITM12549" 
                        />
                        <Button variant="secondary" className="h-11 rounded-l-none bg-blue-50 text-blue-600 hover:bg-blue-100 border border-l-0" onClick={handleGenerateBarcode}>
                          Generate Barcode
                        </Button>
                      </div>
                    </div>
                    {hasGst && (
                      <div className="space-y-3">
                        <Label className="text-slate-600">HSN code</Label>
                        <Input 
                          value={form.hsn_code} 
                          onChange={(e) => setForm({ ...form, hsn_code: e.target.value })} 
                          className="h-11 bg-white" 
                          placeholder="ex: 4010" 
                        />
                        <button className="text-blue-500 text-sm hover:underline">Find HSN Code</button>
                      </div>
                    )}
                  </div>

                  {/* Measuring Unit & Alternate / Sub Unit */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-slate-600">Measuring Unit (Primary)</Label>
                        <Select value={form.unit || "none"} onValueChange={(v) => setForm({ ...form, unit: v === "none" ? "" : v })}>
                          <SelectTrigger className="h-11 bg-white">
                            <SelectValue placeholder={form.type === "service" ? "None (Blank)" : "Pieces (PCS)"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None (Blank)</SelectItem>
                            {COMMON_UNITS.map(u => (
                              <SelectItem key={u} value={u}>{u.toUpperCase()}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-col justify-end">
                        {!form.show_sub_unit ? (
                          <div className="pb-1">
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, show_sub_unit: true, sub_unit: form.sub_unit || "pcs", sub_unit_conversion_rate: form.sub_unit_conversion_rate || 10 })}
                              className="text-blue-600 text-sm hover:underline font-semibold flex items-center gap-1.5 py-2 px-3 rounded-lg border border-blue-200 bg-blue-50/60 hover:bg-blue-100/60 transition-colors w-fit"
                            >
                              <Plus className="h-4 w-4" /> Add Alternate / Sub Unit
                            </button>
                            <p className="text-[11px] text-slate-400 mt-1">e.g. 1 Box = 10 Pcs, 1 Strip = 10 Tablets</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-slate-600">Sub Unit (Secondary)</Label>
                              <button
                                type="button"
                                onClick={() => setForm({ ...form, show_sub_unit: false, sub_unit: "", sub_unit_conversion_rate: 1 })}
                                className="text-xs text-rose-500 hover:underline flex items-center gap-1 font-medium"
                              >
                                <Trash2 className="h-3 w-3" /> Remove
                              </button>
                            </div>
                            <div className="flex shadow-sm rounded-lg">
                              <Input
                                value={form.sub_unit || ""}
                                onChange={(e) => setForm({ ...form, sub_unit: e.target.value })}
                                className="h-11 rounded-r-none bg-white min-w-[80px]"
                                placeholder="ex: pcs, pack"
                              />
                              <div className="flex items-center bg-slate-100 border-y px-2.5 text-slate-600 text-sm font-semibold whitespace-nowrap">
                                =
                              </div>
                              <Input
                                type="number"
                                min={0.01}
                                step={0.01}
                                value={form.sub_unit_conversion_rate || ""}
                                onChange={(e) => setForm({ ...form, sub_unit_conversion_rate: parseFloat(e.target.value) || 1 })}
                                className="h-11 rounded-none border-x-0 bg-white w-[80px] px-2 text-center font-bold"
                                placeholder="Qty"
                              />
                              <div className="flex items-center bg-slate-100 border rounded-r-lg px-2.5 text-slate-600 text-xs font-semibold whitespace-nowrap uppercase">
                                / {form.unit || 'pcs'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Conversion Helper Banner */}
                    {form.show_sub_unit && form.sub_unit && (
                      <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-blue-900">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">Conversion:</span>
                          <span>1 {form.unit ? form.unit.toUpperCase() : "BOX"} = <b>{form.sub_unit_conversion_rate || 1} {form.sub_unit.toUpperCase()}</b></span>
                        </div>
                        {form.unit_price > 0 && form.sub_unit_conversion_rate > 0 && (
                          <div className="text-slate-600">
                            Sub-unit Rate: <b className="text-blue-700">₹{(form.unit_price / form.sub_unit_conversion_rate).toFixed(2)}</b> / {form.sub_unit.toUpperCase()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stock Quantity & As of Date */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-slate-600">Opening Stock</Label>
                      <div className="relative">
                        <Input 
                          type="number" 
                          value={form.stock_quantity || ""} 
                          onChange={(e) => setForm({ ...form, stock_quantity: parseFloat(e.target.value) || 0 })} 
                          className="h-11 bg-white pr-16" 
                          placeholder="ex: 150" 
                        />
                        <span className="absolute right-3 top-3 text-slate-400 text-xs font-semibold uppercase">{form.unit ? form.unit.toUpperCase() : 'PCS'}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-slate-600">As of Date</Label>
                      <Input type="date" className="h-11 bg-white" value={form.as_of_date} onChange={(e) => setForm({...form, as_of_date: e.target.value})} />
                    </div>
                  </div>

                  {/* Batch Number */}
                  <div className="space-y-1.5 pt-2">
                    <Label className="text-slate-600 font-medium text-xs">Batch Number (Optional)</Label>
                    <Input 
                      className="h-10 bg-white max-w-[280px]" 
                      placeholder="e.g. B-01 or BATCH-2026-A"
                      value={form.batch_no || ""} 
                      onChange={(e) => setForm({...form, batch_no: e.target.value})} 
                    />
                    <p className="text-[11px] text-slate-400">Assign a batch number for tracking and invoice printing</p>
                  </div>

                  {/* Expiry Details */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center space-x-2 pb-2">
                      <Switch 
                        id="has-expiry" 
                        checked={form.has_expiry} 
                        onCheckedChange={(c) => setForm({ ...form, has_expiry: !!c })} 
                      />
                      <Label htmlFor="has-expiry" className="text-slate-600 cursor-pointer">Item has expiry date</Label>
                    </div>
                    {form.has_expiry && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                        <Label className="text-slate-600">Expiry Date</Label>
                        <Input 
                          type="date" 
                          className="h-11 bg-white max-w-[250px]" 
                          value={form.expiry_date} 
                          onChange={(e) => setForm({...form, expiry_date: e.target.value})} 
                        />
                      </div>
                    )}
                  </div>

                  {/* Low Stock Warning */}
                  <div className="pt-1">
                    {!form.show_low_stock_warning ? (
                      <div>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, show_low_stock_warning: true, low_stock_threshold: form.low_stock_threshold || 5 })}
                          className="text-blue-600 text-sm hover:underline font-semibold flex items-center gap-1.5 py-2 px-3 rounded-lg border border-blue-200 bg-blue-50/60 hover:bg-blue-100/60 transition-colors w-fit"
                        >
                          <Plus className="h-4 w-4" /> Enable Low Stock Quantity Warning
                        </button>
                        <p className="text-[11px] text-slate-400 mt-1">Get warned when item stock goes below minimum quantity</p>
                      </div>
                    ) : (
                      <div className="p-4 border border-amber-200 bg-amber-50/50 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-amber-900 font-semibold text-xs flex items-center gap-1.5">
                            Low Stock Alert Threshold
                          </Label>
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, show_low_stock_warning: false, low_stock_threshold: 0 })}
                            className="text-xs text-rose-500 hover:underline flex items-center gap-1 font-medium"
                          >
                            <Trash2 className="h-3 w-3" /> Disable Warning
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 items-center">
                          <div className="relative">
                            <Input
                              type="number"
                              min={0}
                              value={form.low_stock_threshold}
                              onChange={(e) => setForm({ ...form, low_stock_threshold: parseFloat(e.target.value) || 0 })}
                              className="h-10 bg-white pr-16"
                              placeholder="e.g. 5"
                            />
                            <span className="absolute right-3 top-2.5 text-slate-400 text-xs font-semibold uppercase">{form.unit ? form.unit.toUpperCase() : 'PCS'}</span>
                          </div>
                          <p className="text-xs text-amber-800">
                            Alert will trigger when inventory drops to <b>{form.low_stock_threshold || 0} {form.unit || 'pcs'}</b> or lower.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-slate-600">Description</Label>
                    <Textarea 
                      value={form.description} 
                      onChange={(e) => setForm({ ...form, description: e.target.value })} 
                      className="min-h-[100px] bg-white resize-none" 
                      placeholder="Enter Description"
                    />
                  </div>
                </div>
              )}

              {activeTab === "pricing" && (
                <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-slate-600">Sales Price</Label>
                      <div className="flex relative shadow-sm rounded-lg">
                        <span className="absolute left-3 top-3 text-slate-400">₹</span>
                        <Input 
                          type="number" 
                          value={form.unit_price || ""} 
                          onChange={(e) => setForm({ ...form, unit_price: parseFloat(e.target.value) || 0 })} 
                          className="pl-8 h-11 rounded-r-none border-r-0 bg-white" 
                          placeholder="ex: 200" 
                        />
                        <Select 
                          value={hasGst ? form.sales_price_type : "without_tax"} 
                          onValueChange={(v) => hasGst && setForm({...form, sales_price_type: v})}
                          disabled={!hasGst}
                        >
                          <SelectTrigger className="w-[130px] h-11 rounded-l-none bg-slate-50 border-l-0 text-slate-600 focus:ring-0 disabled:opacity-80">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="without_tax">Without Tax</SelectItem>
                            {hasGst && <SelectItem value="with_tax">With Tax</SelectItem>}
                          </SelectContent>
                        </Select>
                      </div>
                      {form.discount > 0 && form.unit_price > 0 ? (
                        <div className="mt-1.5 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-emerald-700">
                              ₹{(form.unit_price * (1 - form.discount / 100)).toFixed(2)}
                            </span>
                            <span className="text-xs text-slate-400 line-through">
                              ₹{form.unit_price.toFixed(2)}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                              {form.discount}% OFF
                            </span>
                          </div>
                          {org?.sub_unit_enabled && form.sub_unit && form.sub_unit_conversion_rate > 0 && (
                            <div className="text-xs text-slate-500 font-medium">
                              1 {form.sub_unit} = <b className="text-emerald-700">₹{((form.unit_price * (1 - form.discount / 100)) / form.sub_unit_conversion_rate).toFixed(2)}</b>{" "}
                              <span className="text-[10px] text-slate-400 line-through">
                                (₹{(form.unit_price / form.sub_unit_conversion_rate).toFixed(2)})
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        org?.sub_unit_enabled && form.sub_unit && form.sub_unit_conversion_rate > 0 && form.unit_price > 0 && (
                          <div className="text-sm text-slate-500 font-medium mt-1">
                            1 {form.sub_unit} = ₹{(form.unit_price / form.sub_unit_conversion_rate).toFixed(2)}
                          </div>
                        )
                      )}
                    </div>
                    <div className="space-y-3">
                      <Label className="text-slate-600">Purchase Price</Label>
                      <div className="flex relative shadow-sm rounded-lg">
                        <span className="absolute left-3 top-3 text-slate-400">₹</span>
                        <Input 
                          type="number" 
                          value={form.purchase_price || ""} 
                          onChange={(e) => setForm({ ...form, purchase_price: parseFloat(e.target.value) || 0 })} 
                          className="pl-8 h-11 rounded-r-none border-r-0 bg-white" 
                          placeholder="ex: 200" 
                        />
                        <Select 
                          value={hasGst ? form.purchase_price_type : "without_tax"} 
                          onValueChange={(v) => hasGst && setForm({...form, purchase_price_type: v})}
                          disabled={!hasGst}
                        >
                          <SelectTrigger className="w-[130px] h-11 rounded-l-none bg-slate-50 border-l-0 text-slate-600 focus:ring-0 disabled:opacity-80">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="without_tax">Without Tax</SelectItem>
                            {hasGst && <SelectItem value="with_tax">With Tax</SelectItem>}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-slate-600">GST Tax Rate(%)</Label>
                        {!hasGst && (
                          <TooltipProvider>
                            <Tooltip delayDuration={100}>
                              <TooltipTrigger asChild>
                                <button type="button" className="text-amber-500 hover:text-amber-600 inline-flex items-center">
                                  <HelpCircle className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-slate-900 text-white text-xs max-w-xs p-2.5 space-y-1 shadow-lg z-50">
                                <p className="font-semibold flex items-center gap-1 text-amber-400">
                                  <Lock className="w-3.5 h-3.5" /> Feature Locked
                                </p>
                                <p>Add your GST No. to unlock this feature.</p>
                                <a href="/settings?tab=general" className="text-indigo-300 underline font-medium block pt-0.5 hover:text-indigo-200">
                                  Add GST No. &rarr;
                                </a>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <Select 
                        disabled={!hasGst}
                        value={
                          !hasGst 
                            ? "exempt"
                            : (form.tax_id 
                                ? (INDIAN_GST_SLABS.find(s => s.id === form.tax_id)?.id || 
                                   INDIAN_GST_SLABS.find(s => {
                                     const t = taxRates.find(tr => tr.id === form.tax_id);
                                     return t && Number(t.rate) === s.rate;
                                   })?.id || form.tax_id)
                                : "exempt")
                        } 
                        onValueChange={(v) => {
                          if (!hasGst) return;
                          const slab = INDIAN_GST_SLABS.find(s => s.id === v);
                          if (slab) {
                            const matched = taxRates.find(t => Number(t.rate) === slab.rate);
                            setForm({ ...form, tax_id: matched ? matched.id : slab.id });
                          } else {
                            setForm({ ...form, tax_id: v === "exempt" ? null : v });
                          }
                        }}
                      >
                        <SelectTrigger className="h-11 bg-white disabled:bg-slate-100 disabled:text-slate-500">
                          <SelectValue placeholder="0% - Exempted" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDIAN_GST_SLABS.map((slab) => (
                            <SelectItem key={slab.id} value={slab.id}>
                              {slab.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!hasGst && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-400" /> Locked (No GST registered)
                        </p>
                      )}
                    </div>
                    <div className="space-y-3">
                      <Label className="text-slate-600">Discount on Sales Price <span className="text-slate-400 ml-1">ⓘ</span></Label>
                      <div className="relative">
                        <Input 
                          type="number" 
                          value={form.discount || ""} 
                          onChange={(e) => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} 
                          className="h-11 bg-white pr-12" 
                          placeholder="ex: 12" 
                        />
                        <span className="absolute right-3 top-3 text-slate-400 text-sm font-medium">%</span>
                      </div>
                      {form.discount > 0 && form.unit_price > 0 && (
                        <p className="text-[11px] text-emerald-600 font-medium">
                          Saves ₹{(form.unit_price * (form.discount / 100)).toFixed(2)} per {form.unit || 'unit'}
                        </p>
                      )}
                    </div>
                  </div>

                  {form.discount > 0 && form.unit_price > 0 && (
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                          Discounted Rate Summary
                        </div>
                        <div className="text-xs text-slate-600 flex items-center gap-2">
                          <span>Original Price:</span>
                          <span className="line-through text-slate-400 font-semibold">₹{form.unit_price.toFixed(2)}</span>
                          <span className="text-emerald-700 font-semibold bg-emerald-100/80 px-1.5 py-0.5 rounded text-[11px]">
                            {form.discount}% OFF
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium block">Effective Price</span>
                        <span className="text-lg font-extrabold text-emerald-700">₹{(form.unit_price * (1 - form.discount / 100)).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === "party" && (
                <div className="max-w-2xl space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-slate-800">Special Pricing</h3>
                    <Button size="sm" onClick={() => setPartyPrices([...partyPrices, { party_type: 'client', party_id: '', price: 0 }])}>
                      <Plus className="h-4 w-4 mr-2" /> Add Price
                    </Button>
                  </div>
                  {partyPrices.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 border-2 border-dashed rounded-xl bg-slate-50">
                      No special prices configured. Add special prices for specific clients or vendors.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {partyPrices.map((p, idx) => (
                        <div key={idx} className="flex gap-4 items-end bg-white p-4 rounded-xl border shadow-sm">
                          <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={p.party_type} onValueChange={v => { const n = [...partyPrices]; n[idx].party_type = v; n[idx].party_id = ''; setPartyPrices(n); }}>
                              <SelectTrigger className="w-[120px] bg-white"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="client">Client</SelectItem>
                                <SelectItem value="vendor">Vendor</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2 flex-1">
                            <Label>{p.party_type === 'client' ? 'Client' : 'Vendor'}</Label>
                            <Select value={p.party_id} onValueChange={v => { const n = [...partyPrices]; n[idx].party_id = v; setPartyPrices(n); }}>
                              <SelectTrigger className="bg-white"><SelectValue placeholder={`Select ${p.party_type}`} /></SelectTrigger>
                              <SelectContent>
                                {(p.party_type === 'client' ? clients : vendors).map(party => (
                                  <SelectItem key={party.id} value={party.id}>{party.display_name || party.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2 w-[150px]">
                            <Label>Price (₹)</Label>
                            <Input 
                              type="number" 
                              value={p.price || ""} 
                              onChange={e => { const n = [...partyPrices]; n[idx].price = parseFloat(e.target.value) || 0; setPartyPrices(n); }} 
                              className="bg-white" 
                            />
                          </div>
                          <Button variant="ghost" className="text-destructive mb-0.5" onClick={() => { const n = [...partyPrices]; n.splice(idx, 1); setPartyPrices(n); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "custom" && (
                <div className="max-w-2xl space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-slate-800">Additional Details</h3>
                    {!showAddCf && (
                      <Button variant="outline" size="sm" onClick={() => setShowAddCf(true)}>
                        <Plus className="mr-1.5 h-4 w-4" /> Add Field
                      </Button>
                    )}
                  </div>
                  
                  {showAddCf && (
                    <div className="p-4 bg-slate-50 border rounded-xl space-y-3 mb-6">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-semibold">New Custom Field</h4>
                        <Button variant="ghost" size="sm" onClick={() => setShowAddCf(false)} className="h-6 px-2 text-slate-500">Close</Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs">Field Name (e.g. Batch No)</Label>
                          <Input value={newCfName} onChange={e => setNewCfName(e.target.value)} className="h-9" placeholder="Enter name" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Field Type</Label>
                          <Select value={newCfType} onValueChange={setNewCfType}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="boolean">Checkbox</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end pt-1">
                        <Button size="sm" disabled={!newCfName.trim() || addingCf} onClick={handleAddCustomField}>
                          {addingCf ? "Adding..." : "Add Field"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {customFieldDefs.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 border-2 border-dashed rounded-xl bg-slate-50">
                      No custom fields defined. Click "Add Field" to create one.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-6">
                      {customFieldDefs.map(cf => (
                        <div key={cf.id} className="space-y-3">
                          <Label className="text-slate-600">{cf.field_name} {cf.is_required && <span className="text-destructive">*</span>}</Label>
                          {cf.field_type === 'select' || cf.field_type === 'dropdown' ? (
                            <Select 
                              value={customFieldValues[cf.id] || ""} 
                              onValueChange={v => setCustomFieldValues({...customFieldValues, [cf.id]: v})}
                            >
                              <SelectTrigger className="h-11 bg-white">
                                <SelectValue placeholder={`Select ${cf.field_name}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.isArray(cf.field_options) && cf.field_options.map((opt: any) => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : cf.field_type === 'boolean' || cf.field_type === 'checkbox' ? (
                            <div className="flex items-center h-11">
                              <Switch 
                                checked={customFieldValues[cf.id] === 'true'} 
                                onCheckedChange={c => setCustomFieldValues({...customFieldValues, [cf.id]: c ? 'true' : 'false'})}
                              />
                            </div>
                          ) : (
                            <Input 
                              type={cf.field_type === 'number' ? 'number' : cf.field_type === 'date' ? 'date' : 'text'}
                              value={customFieldValues[cf.id] || ""} 
                              onChange={e => setCustomFieldValues({...customFieldValues, [cf.id]: e.target.value})}
                              className="h-11 bg-white" 
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
            </div>
          </div>

          <div className="p-4 bg-white border-t flex justify-between items-center z-10">
            <Button variant="outline" className="h-11 px-8 rounded-xl" onClick={() => onOpenChange(false)}>Cancel</Button>
            <div className="flex gap-3">
              <Button disabled={loading} variant="outline" className="h-11 px-6 rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => handleSave(true)}>
                Save & New
              </Button>
              <Button disabled={loading} className="h-11 px-8 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm font-medium" onClick={() => handleSave(false)}>
                {loading ? "Saving..." : "Save Item"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
