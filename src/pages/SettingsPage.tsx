import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/app-store";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/PageHeader";
import { SEO } from "@/components/shared/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { stateCodeFromGstin } from "@/lib/gst";
import { INDIAN_STATES } from "@/lib/constants";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2, Search, Shield, Settings2, Receipt, Building2, Package, User, Mail, Phone, Globe, Warehouse, ExternalLink, Bell, Landmark, CreditCard, Pencil, LogOut, Copy, Check, MapPin, Hash, Lock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { fetchGstDetails } from "@/lib/gst-service";
import { AddWarehouseDialog } from "@/components/shared/AddWarehouseDialog";
import { INDIAN_GST_SLABS } from "@/lib/constants";
import { EmailSettingsTab } from "@/components/settings/EmailSettingsTab";
import { WhatsAppSettingsTab } from "@/components/settings/WhatsAppSettingsTab";
import SupportPage from "@/pages/SupportPage";
import { useToast } from "@/hooks/use-toast";
import { LockedFeature } from "@/components/subscription/LockedFeature";
import { PlanSelectorModal } from "@/components/shared/PlanSelectorModal";
import { useSubscription } from "@/hooks/use-subscription";
import { hasModuleAccess } from "@/lib/subscription";



export default function SettingsPage() {
  const org = useAppStore((s) => s.organization);
  const setOrganization = useAppStore((s) => s.setOrganization);
  const { profile, user, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab") || "profile";
  const currentTab = rawTab === "organization" ? "profile" : rawTab;
  const [addWarehouseOpen, setAddWarehouseOpen] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const { subscriptionPlan } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const effectivePlan = subscriptionPlan || org?.subscription_plan || 'free';
  const isIntegrationUnlocked = hasModuleAccess(effectivePlan, 'outreach');

  // Profile form
  const [profileForm, setProfileForm] = useState({
    first_name: "", last_name: "", phone: "",
    address_line: "", city: "", state: "", pincode: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [copiedAccountId, setCopiedAccountId] = useState(false);

  // Org form
  const [orgForm, setOrgForm] = useState({
    name: "", email: "", phone: "", website: "", logo_url: "",
    tax_number: "", tax_name: "", currency_code: "INR",
    invoice_prefix: "INV", payment_terms: 30,
    default_notes: "", default_terms: "",
    address: { street: "", city: "", state: "", zip: "", country: "" },
    gst_enabled: false, gst_number: "", show_client_gst: false, qr_code_enabled: false,
    upi_id: "",
    inventory_enabled: false, low_stock_threshold: 5,
    multi_warehouse_enabled: false,
    sub_unit_enabled: false,
    enable_individual_week_offs: false,
    automate_overdue_reminders: false,
  });
  const [isFetchingGst, setIsFetchingGst] = useState(false);

  // Tax rates
  const [taxRates, setTaxRates] = useState<any[]>([]);
  const [taxDialogOpen, setTaxDialogOpen] = useState(false);
  const [taxForm, setTaxForm] = useState({ name: "", rate: 0, is_default: false });

  // Bank accounts
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [editBankId, setEditBankId] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState({
    bank_name: "", account_holder_name: "", account_number: "", ifsc: "", branch: "", upi_id: ""
  });
  const [bankSaving, setBankSaving] = useState(false);

  const fetchBankAccounts = async () => {
    if (!org?.id) return;
    const { data } = await supabase.from("bank_accounts").select("*").eq("org_id", org.id).order("created_at", { ascending: false });
    setBankAccounts(data || []);
  };

  useEffect(() => {
    fetchBankAccounts();
  }, [org?.id]);

  useEffect(() => {
    const orgAddr = (org?.address as any) || {};
    const sharedPhone = (profile as any)?.phone || user?.phone || (user?.user_metadata as any)?.phone || org?.phone || "";
    const sharedStreet = (profile as any)?.address_line || orgAddr.street || "";
    const sharedCity = (profile as any)?.city || orgAddr.city || "";
    const sharedState = (profile as any)?.state || orgAddr.state || "";
    const sharedPin = (profile as any)?.pincode || orgAddr.zip || "";

    if (profile) {
      setProfileForm({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        phone: sharedPhone,
        address_line: sharedStreet,
        city: sharedCity,
        state: sharedState,
        pincode: sharedPin,
      });
    }

    if (org) {
      setOrgForm({
        name: org.name || "", 
        email: org.email || user?.email || "", 
        phone: sharedPhone,
        website: org.website || "", 
        logo_url: org.logo_url || "", 
        tax_number: org.tax_number || "", 
        tax_name: org.tax_number || "",
        currency_code: "INR", 
        invoice_prefix: org.invoice_prefix || "INV",
        payment_terms: org.payment_terms || 30, 
        default_notes: org.default_notes || "",
        default_terms: org.default_terms || "",
        address: { 
          street: sharedStreet, 
          city: sharedCity, 
          state: sharedState, 
          zip: sharedPin, 
          country: orgAddr.country || "India" 
        },
        gst_enabled: org.gst_enabled || false, 
        gst_number: org.gst_number || "",
        show_client_gst: org.show_client_gst || false, 
        qr_code_enabled: org.qr_code_enabled || false,
        upi_id: (org as any).upi_id || "",
        inventory_enabled: (org as any).inventory_enabled || false,
        low_stock_threshold: Number((org as any).low_stock_threshold ?? 5),
        multi_warehouse_enabled: (org as any).multi_warehouse_enabled || false,
        sub_unit_enabled: (org as any).sub_unit_enabled || false,
        enable_individual_week_offs: (org as any).enable_individual_week_offs || false,
        automate_overdue_reminders: (org as any).automate_overdue_reminders || false,
      });
      fetchTaxRates();
    }
  }, [profile, user, org]);

  const handlePhoneChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    setProfileForm(prev => ({ ...prev, phone: cleaned }));
    setOrgForm(prev => ({ ...prev, phone: cleaned }));
  };

  const handleAddressChange = (field: "street" | "city" | "state" | "zip", value: string) => {
    setOrgForm(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }));
    setProfileForm(prev => ({
      ...prev,
      address_line: field === "street" ? value : prev.address_line,
      city: field === "city" ? value : prev.city,
      state: field === "state" ? value : prev.state,
      pincode: field === "zip" ? value : prev.pincode,
    }));
  };

  const [isSavingAll, setIsSavingAll] = useState(false);

  const saveAllProfileAndOrg = async () => {
    const contactPhone = (profileForm.phone || orgForm.phone || "").trim();
    if (contactPhone && contactPhone.length < 10) {
      toast({ title: "Invalid Phone", description: "Phone number must be at least 10 digits.", variant: "destructive" });
      return;
    }
    const pin = (profileForm.pincode || orgForm.address.zip || "").trim();
    if (pin && pin.length !== 6) {
      toast({ title: "Invalid PIN Code", description: "PIN Code must be exactly 6 digits.", variant: "destructive" });
      return;
    }
    if (!orgForm.name?.trim()) {
      toast({ title: "Business Name Required", description: "Please enter your organization or business name.", variant: "destructive" });
      return;
    }

    setIsSavingAll(true);
    try {
      const street = (profileForm.address_line || orgForm.address.street || "").trim();
      const city = (profileForm.city || orgForm.address.city || "").trim();
      const state = (profileForm.state || orgForm.address.state || "").trim();

      if (profile?.id) {
        const { error: profError } = await supabase.from("profiles").update({
          first_name: profileForm.first_name.trim(),
          last_name: profileForm.last_name.trim(),
          phone: contactPhone || null,
          address_line: street || null,
          city: city || null,
          state: state || null,
          pincode: pin || null,
        } as any).eq("id", profile.id);

        if (profError) throw profError;
        await refreshProfile();
      }

      if (org?.id) {
        const { 
          sub_unit_enabled, 
          enable_individual_week_offs, 
          automate_overdue_reminders,
          ...dbOrgForm 
        } = orgForm as any;

        const isGstPresent = Boolean(orgForm.gst_number && orgForm.gst_number.trim().length > 0);
        const updatedOrgData = {
          ...dbOrgForm,
          gst_enabled: isGstPresent ? true : Boolean(orgForm.gst_enabled),
          name: orgForm.name.trim(),
          phone: contactPhone,
          email: orgForm.email.trim() || user?.email || "",
          address: {
            street,
            city,
            state,
            zip: pin,
            country: orgForm.address.country || "India",
          }
        };

        const { error: orgError } = await supabase.from("organizations").update(updatedOrgData).eq("id", org.id);
        if (orgError) throw orgError;
        setOrganization({ ...org, ...updatedOrgData } as any);

        if (isGstPresent) {
          const { count } = await supabase.from("tax_rates").select("id", { count: "exact", head: true }).eq("org_id", org.id);
          if (!count || count === 0) {
            await supabase.from("tax_rates").insert([
              { org_id: org.id, name: "GST 0%", rate: 0 },
              { org_id: org.id, name: "GST 5%", rate: 5 },
              { org_id: org.id, name: "GST 12%", rate: 12 },
              { org_id: org.id, name: "GST 18%", rate: 18 },
              { org_id: org.id, name: "GST 28%", rate: 28 },
            ]);
          }
        }
      }

      toast({ 
        title: "Details Saved Successfully!", 
        description: "Profile and business organization details have been saved." 
      });
    } catch (err: any) {
      toast({ title: "Error Saving", description: err.message, variant: "destructive" });
    } finally {
      setIsSavingAll(false);
    }
  };

  const fetchTaxRates = async () => {
    if (!org?.id) return;
    const { data } = await supabase.from("tax_rates").select("*").eq("org_id", org.id).order("name");
    setTaxRates(data || []);
  };

  const saveOrg = async () => {
    if (!org?.id) return;

    // Strip out frontend-only fields that do not exist in the DB schema yet
    const { 
      sub_unit_enabled, 
      enable_individual_week_offs, 
      automate_overdue_reminders,
      ...dbOrgForm 
    } = orgForm as any;

    if (dbOrgForm.gst_number && dbOrgForm.gst_number.trim()) {
      dbOrgForm.gst_enabled = true;
    }

    const { error } = await supabase.from("organizations").update(dbOrgForm).eq("id", org.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setOrganization({ ...org, ...orgForm, gst_enabled: dbOrgForm.gst_enabled || orgForm.gst_enabled } as any);
      toast({ title: "Settings saved!" });
    }
  };

  const handleFetchGst = async () => {
    if (!orgForm.gst_number || orgForm.gst_number.length !== 15) {
      toast({ title: "Invalid GST", description: "Please enter a valid 15-character GSTIN", variant: "destructive" });
      return;
    }
    setIsFetchingGst(true);
    try {
      const details = await fetchGstDetails(orgForm.gst_number);
      const extractedState = stateCodeFromGstin(orgForm.gst_number);
      const newStreet = details.address || orgForm.address.street || profileForm.address_line;
      const newCity = details.city || orgForm.address.city || profileForm.city;
      const newState = extractedState || details.state || orgForm.address.state || profileForm.state;
      const newZip = details.pincode || orgForm.address.zip || profileForm.pincode;
      const businessName = details.legalName || details.tradeName || orgForm.name;

      setOrgForm(prev => ({
        ...prev,
        name: businessName,
        gst_enabled: true,
        address: {
          ...prev.address,
          street: newStreet,
          city: newCity,
          state: newState,
          zip: newZip,
        }
      }));

      setProfileForm(prev => ({
        ...prev,
        address_line: newStreet,
        city: newCity,
        state: newState,
        pincode: newZip,
      }));

      toast({ title: "GST Details Fetched", description: "Business details and address auto-filled successfully!" });
    } catch (err: any) {
      toast({ title: "GST Fetch Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsFetchingGst(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !org?.id) return;
    
    setIsUploadingLogo(true);
    toast({ title: "Uploading logo...", description: "Please wait" });
    const fileExt = file.name.split('.').pop();
    const fileName = `logo_${Date.now()}.${fileExt}`;
    const path = `${org.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage.from("org-logos").upload(path, file, { upsert: true });
    
    if (uploadError) {
      toast({ title: "Upload Failed", description: uploadError.message, variant: "destructive" });
      setIsUploadingLogo(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("org-logos").getPublicUrl(path);
    
    // Immediately save logo to database and update state
    await supabase.from("organizations").update({ logo_url: publicUrl }).eq("id", org.id);
    setOrganization({ ...org, logo_url: publicUrl } as any);
    setOrgForm(prev => ({ ...prev, logo_url: publicUrl }));
    setIsUploadingLogo(false);
    toast({ title: "Logo updated!", description: "Your business logo has been saved and applied to all invoices." });
  };


  const handleEditBankAccount = (account: any) => {
    let notesData = {};
    try {
      if (account.notes) notesData = JSON.parse(account.notes);
    } catch (e) {}
    
    setBankForm({
      bank_name: account.bank_name || "",
      account_holder_name: account.name || "",
      account_number: account.account_number || "",
      ifsc: account.ifsc || "",
      branch: (notesData as any).branch || "",
      upi_id: account.upi_id || "",
    });
    setEditBankId(account.id);
    setBankDialogOpen(true);
  };

  const deleteBankAccount = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bank account?")) return;
    await supabase.from("bank_accounts").delete().eq("id", id);
    fetchBankAccounts();
    toast({ title: "Bank account deleted" });
  };

  const saveBankAccount = async () => {
    if (!org?.id || !bankForm.account_holder_name) {
      toast({ title: "Error", description: "Account Holder Name is required.", variant: "destructive" });
      return;
    }
    setBankSaving(true);
    
    const notesStr = JSON.stringify({
      branch: bankForm.branch,
      account_holder_name: bankForm.account_holder_name
    });

    const payload = {
      org_id: org.id,
      name: bankForm.account_holder_name,
      bank_name: bankForm.bank_name,
      account_number: bankForm.account_number,
      ifsc: bankForm.ifsc,
      upi_id: bankForm.upi_id,
      notes: notesStr,
      is_active: true,
      account_type: "Current"
    };

    let err;
    if (editBankId) {
      const { error } = await supabase.from("bank_accounts").update(payload).eq("id", editBankId);
      err = error;
    } else {
      const { error } = await supabase.from("bank_accounts").insert(payload);
      err = error;
    }

    setBankSaving(false);
    if (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } else {
      setBankDialogOpen(false);
      setEditBankId(null);
      setBankForm({ bank_name: "", account_holder_name: "", account_number: "", ifsc: "", branch: "", upi_id: "" });
      fetchBankAccounts();
      toast({ title: editBankId ? "Bank account updated!" : "Bank account added!" });
    }
  };

  const saveTaxRate = async () => {
    if (!taxForm.name.trim()) return;
    const { error } = await supabase.from("tax_rates").insert({
      org_id: org!.id,
      name: taxForm.name,
      rate: taxForm.rate,
      is_default: taxForm.is_default,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setTaxDialogOpen(false);
      setTaxForm({ name: "", rate: 0, is_default: false });
      fetchTaxRates();
      toast({ title: "Tax rate added!" });
    }
  };

  const deleteTaxRate = async (id: string) => {
    await supabase.from("tax_rates").delete().eq("id", id);
    fetchTaxRates();
    toast({ title: "Tax rate deleted" });
  };

  return (
    <div className="space-y-6 w-full">
      <SEO title="Settings" description="Configure organization details, currency, tax rates, branding and document preferences." path="/settings" />
      <PageHeader title="Settings" description="Manage your organization and preferences" />

      <Tabs value={currentTab} onValueChange={(tab) => setSearchParams({ tab })}>
        <TabsList className="flex flex-wrap gap-1 h-auto p-1.5">
          <TabsTrigger value="profile">Profile & Organization</TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-1.5">
            Email Settings
            {!isIntegrationUnlocked && <Lock className="h-3 w-3 text-amber-500" />}
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-1.5">
            WhatsApp
            {!isIntegrationUnlocked && <Lock className="h-3 w-3 text-amber-500" />}
          </TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="taxes">Tax Rates</TabsTrigger>
          <TabsTrigger value="support">Help & Support</TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-6 mt-4">
          {!isIntegrationUnlocked ? (
            <LockedFeature
              title="Email Settings Locked"
              description="Custom SMTP email server configuration and automatic document delivery via email requires Business Suite or Business Integration add-on."
              onUpgradeClick={() => setShowUpgradeModal(true)}
            />
          ) : (
            <EmailSettingsTab />
          )}
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-6 mt-4">
          {!isIntegrationUnlocked ? (
            <LockedFeature
              title="WhatsApp Integration Locked"
              description="WhatsApp automated document sharing and notifications require Business Suite or Business Integration add-on."
              onUpgradeClick={() => setShowUpgradeModal(true)}
            />
          ) : (
            <WhatsAppSettingsTab orgId={org?.id} />
          )}
        </TabsContent>

        <TabsContent value="profile" className="space-y-6 mt-4">
          {/* Unique Account ID & Identity Banner */}
          <Card className="overflow-hidden border-blue-200/70 dark:border-blue-900/60 shadow-sm">
            <CardContent className="p-0">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-indigo-50/40 dark:from-blue-950/40 dark:via-slate-900/40 dark:to-indigo-950/30">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-md shrink-0">
                    #
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider bg-blue-100/80 dark:bg-blue-900/60 px-2 py-0.5 rounded-full">
                        Unique Account ID
                      </span>
                      {useAppStore.getState().userRole && (
                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 capitalize bg-white/80 dark:bg-slate-800 px-2 py-0.5 rounded-full border">
                          {useAppStore.getState().userRole}
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-extrabold text-blue-950 dark:text-blue-100 font-mono tracking-wide mt-0.5">
                      {profile?.account_id || "1" + String(profile?.id || "00000").replace(/\D/g, "").slice(0, 5).padStart(5, "0")}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 self-start sm:self-center border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:text-blue-300 shadow-sm"
                  onClick={() => {
                    const accId = profile?.account_id || "1" + String(profile?.id || "00000").replace(/\D/g, "").slice(0, 5).padStart(5, "0");
                    navigator.clipboard.writeText(accId);
                    setCopiedAccountId(true);
                    setTimeout(() => setCopiedAccountId(false), 2000);
                    toast({ title: "Copied!", description: `Account ID #${accId} copied to clipboard.` });
                  }}
                >
                  {copiedAccountId ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  {copiedAccountId ? "Copied" : "Copy Account ID"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section 1: Business Details & GST */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" /> Business Details & Branding
              </CardTitle>
              <CardDescription>
                Your business details appear on all invoices, estimates, quotations, and payment receipts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* GST Number with auto-fetch */}
              <div className="space-y-2 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border">
                <div className="flex items-center justify-between">
                  <Label className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                    GSTIN / GST Number
                    <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                  </Label>
                  <span className="text-xs text-muted-foreground">15 Characters</span>
                </div>
                <div className="flex flex-col sm:row gap-2">
                  <Input 
                    value={orgForm.gst_number || ""} 
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      const st = stateCodeFromGstin(val);
                      setOrgForm(prev => ({ 
                        ...prev, 
                        gst_number: val, 
                        gst_enabled: val.trim().length > 0 ? true : prev.gst_enabled,
                        address: { ...prev.address, state: st || prev.address.state } 
                      }));
                      if (st) setProfileForm(prev => ({ ...prev, state: st }));
                    }} 
                    placeholder="e.g. 22AAAAA0000A1Z5" 
                    maxLength={15}
                    className="border-emerald-500/50 focus-visible:ring-emerald-500 max-w-sm uppercase font-mono tracking-wider"
                  />
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={handleFetchGst}
                    disabled={isFetchingGst || (orgForm.gst_number || "").length !== 15}
                    className="gap-2 shrink-0"
                  >
                    {isFetchingGst ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Fetch Business Details
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter your GSTIN to auto-fetch trade name, address, and state code directly from GST records.
                </p>
              </div>

              {/* Organization Logo */}
              <div className="space-y-2 border-b pb-6">
                <Label className="text-sm font-semibold">Business Logo</Label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-1">
                  {orgForm.logo_url ? (
                    <div className="relative group border rounded-xl p-2 bg-slate-50 dark:bg-slate-900 w-32 h-32 flex items-center justify-center shrink-0">
                      <img src={orgForm.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                      <button 
                        type="button"
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        onClick={() => setOrgForm({ ...orgForm, logo_url: "" })}
                        title="Remove logo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="border border-dashed rounded-xl p-4 bg-slate-50 dark:bg-slate-900 w-32 h-32 flex flex-col items-center justify-center text-muted-foreground text-xs text-center shrink-0">
                      <Building2 className="h-8 w-8 mb-2 opacity-40 text-primary" />
                      No logo uploaded
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="org-logo-upload" className="cursor-pointer inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50">
                      {isUploadingLogo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Upload Logo"}
                    </Label>
                    <input id="org-logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploadingLogo} />
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Shown on your Invoices, Quotations, Bills, POs, and Marketing Posters. Recommended: 400x400 PNG/JPG.
                    </p>
                  </div>
                </div>
              </div>

              {/* Business Name, Email, Website */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Business / Organization Name *</Label>
                  <Input 
                    value={orgForm.name} 
                    onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} 
                    placeholder="e.g. Assay Solutions Pvt Ltd" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Official Business Email</Label>
                  <Input 
                    type="email" 
                    value={orgForm.email} 
                    onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })} 
                    placeholder="billing@yourbusiness.com" 
                  />
                  <p className="text-[11px] text-muted-foreground">Appears in invoice contact headers.</p>
                </div>
                <div className="space-y-2">
                  <Label>Business Website</Label>
                  <Input 
                    value={orgForm.website} 
                    onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })} 
                    placeholder="https://yourbusiness.com" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Owner & Contact Information */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> Personal & Contact Details
              </CardTitle>
              <CardDescription>
                Owner profile and primary contact phone for communications and SMS/WhatsApp notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input 
                    value={profileForm.first_name} 
                    onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })} 
                    placeholder="First Name" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input 
                    value={profileForm.last_name} 
                    onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })} 
                    placeholder="Last Name" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Mobile / Contact Phone *</Label>
                  <Input
                    value={profileForm.phone || orgForm.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                  />
                  <p className="text-[11px] text-muted-foreground">Used for SMS alerts, customer contact, and account verification.</p>
                </div>
                <div className="space-y-2">
                  <Label>Registered Login Email</Label>
                  <Input value={user?.email || ""} disabled className="bg-slate-50 dark:bg-slate-900 cursor-not-allowed text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground">Primary login email (securely managed by auth).</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Registered Address & Location Details */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" /> Registered Address & Location
                  </CardTitle>
                  <CardDescription>
                    Official address printed on Invoices, Quotations, and Tax filings.
                  </CardDescription>
                </div>
                {Boolean(
                  (profile?.address_line || (org?.address as any)?.street || profileForm.address_line || orgForm.address.street)?.trim() &&
                  ((profile?.pincode || (org?.address as any)?.zip || profileForm.pincode || orgForm.address.zip)?.trim()?.length === 6)
                ) ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-1 rounded-full shrink-0 border border-emerald-200 dark:border-emerald-800/60">
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Successfully Submitted
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2.5 py-1 rounded-full shrink-0 border border-amber-200 dark:border-amber-800/60">
                    Required for Invoicing
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Complete Street Address *</Label>
                <Input
                  value={profileForm.address_line || orgForm.address.street}
                  onChange={(e) => handleAddressChange("street", e.target.value)}
                  placeholder="Shop/Office No., Building Name, Street, Landmark"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-2">
                  <Label>City *</Label>
                  <Input
                    value={profileForm.city || orgForm.address.city}
                    onChange={(e) => handleAddressChange("city", e.target.value)}
                    placeholder="City"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>State (GST Code) *</Label>
                  <Select
                    value={INDIAN_STATES.find(s => s.code === (profileForm.state || orgForm.address.state) || s.name.toLowerCase() === ((profileForm.state || orgForm.address.state) || "").toLowerCase())?.code || (profileForm.state || orgForm.address.state)}
                    onValueChange={(val) => handleAddressChange("state", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {INDIAN_STATES.map((st) => (
                        <SelectItem key={st.code} value={st.code}>
                          {st.name} ({st.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>PIN Code *</Label>
                  <Input
                    value={profileForm.pincode || orgForm.address.zip}
                    onChange={(e) => handleAddressChange("zip", e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit PIN"
                    maxLength={6}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input 
                    value={orgForm.address.country || "India"} 
                    onChange={(e) => setOrgForm(prev => ({ ...prev, address: { ...prev.address, country: e.target.value } }))} 
                    placeholder="India" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Unified Save Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border">
            <div className="text-sm text-muted-foreground">
              Saves both your personal profile and business organization details together.
            </div>
            <Button 
              size="lg" 
              onClick={saveAllProfileAndOrg} 
              disabled={isSavingAll} 
              className="w-full sm:w-auto font-semibold gap-2 shadow-sm px-8"
            >
              {isSavingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isSavingAll ? "Saving Details..." : "Save All Details"}
            </Button>
          </div>

          {/* Sign Out Card */}
          <Card className="border-red-200/60 dark:border-red-900/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-red-600 dark:text-red-400">
                <LogOut className="h-5 w-5" /> Account Session & Sign Out
              </CardTitle>
              <CardDescription>
                Sign out of your active session on this device. You will need to log back in with your credentials.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              <div className="space-y-1">
                <p className="text-sm font-medium">Logged in as {user?.email}</p>
                <p className="text-xs text-muted-foreground">Session is secure and active</p>
              </div>
              <Button 
                variant="destructive" 
                onClick={async () => {
                  await signOut();
                  navigate("/login");
                }}
                className="gap-2 font-medium shrink-0"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6 mt-4">
          <Tabs defaultValue="preferences">
            <TabsList>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              <TabsTrigger value="defaults">Defaults & Numbering</TabsTrigger>
              <TabsTrigger value="bank-accounts">Bank Accounts</TabsTrigger>
            </TabsList>

            <TabsContent value="preferences" className="space-y-6 mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Payments</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox id="notify-online" defaultChecked />
                    <Label htmlFor="notify-online">Get notified when customers pay online</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox id="receipt-thankyou" defaultChecked />
                    <Label htmlFor="receipt-thankyou">Include the payment receipt along with the Thank You note?</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox id="auto-thankyou" />
                    <Label htmlFor="auto-thankyou">Automate thank you note to customer on receipt of online payment</Label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Zero-Value Line Items</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Checkbox id="hide-zero" />
                    <Label htmlFor="hide-zero">Hide zero-value line items</Label>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 ml-7">
                    Choose whether to hide zero-value line items in an invoice's PDF and the Customer Portal. They will still be visible while editing an invoice.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Terms & Conditions</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Default Terms & Conditions</Label>
                    <Textarea value={orgForm.default_terms} onChange={(e) => setOrgForm({ ...orgForm, default_terms: e.target.value })} rows={4} />
                  </div>
                  <div className="space-y-2">
                    <Label>Customer Notes</Label>
                    <Textarea value={orgForm.default_notes} onChange={(e) => setOrgForm({ ...orgForm, default_notes: e.target.value })} placeholder="Thanks for your business." rows={4} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">GST Settings</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable GST</Label>
                      <p className="text-xs text-slate-600 dark:text-slate-300">Show GST details on invoices</p>
                    </div>
                    <Switch checked={orgForm.gst_enabled} onCheckedChange={(v) => setOrgForm({ ...orgForm, gst_enabled: v })} />
                  </div>
                  {orgForm.gst_enabled && (
                    <>
                      {/* GST Number moved to Business Details top */}
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Show Client GST</Label>
                          <p className="text-xs text-slate-600 dark:text-slate-300">Include client's GST number on invoice for input tax credit claims</p>
                        </div>
                        <Switch checked={orgForm.show_client_gst} onCheckedChange={(v) => setOrgForm({ ...orgForm, show_client_gst: v })} />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>


              <Card>
                <CardHeader><CardTitle className="text-base">Inventory Management</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Inventory Tracking</Label>
                      <p className="text-xs text-slate-600 dark:text-slate-300">Turn on if you sell physical products. Stock auto-deducts on each invoice. Service businesses can leave this off.</p>
                    </div>
                    <Switch checked={orgForm.inventory_enabled} onCheckedChange={(v) => setOrgForm({ ...orgForm, inventory_enabled: v })} />
                  </div>
                  {orgForm.inventory_enabled && (
                    <div className="space-y-2">
                      <Label>Low Stock Alert Threshold</Label>
                      <Input type="number" min={0} value={orgForm.low_stock_threshold} onChange={(e) => setOrgForm({ ...orgForm, low_stock_threshold: parseFloat(e.target.value) || 0 })} />
                      <p className="text-xs text-slate-600 dark:text-slate-300">Items at or below this stock level appear in the dashboard low-stock alert.</p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between border-t pt-4">
                    <div>
                      <Label>Enable Sub Units (e.g. 1 Box = 10 Packs)</Label>
                      <p className="text-xs text-slate-600 dark:text-slate-300">Allows selling products in smaller sub-units.</p>
                    </div>
                    <Switch checked={orgForm.sub_unit_enabled} onCheckedChange={(v) => setOrgForm({ ...orgForm, sub_unit_enabled: v })} />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-50">
                    <Bell className="h-5 w-5 text-purple-400" />
                    Automations
                  </CardTitle>
                  <CardDescription className="text-slate-400">Automate tasks and reminders</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium text-slate-50">Automate Overdue Reminders</Label>
                      <p className="text-sm text-slate-400 dark:text-slate-300">Automatically send WhatsApp and Email reminders when invoices become overdue.</p>
                    </div>
                    <Switch checked={orgForm.automate_overdue_reminders} onCheckedChange={(v) => setOrgForm({ ...orgForm, automate_overdue_reminders: v })} />
                  </div>
                </CardContent>
              </Card>

              <Button onClick={saveOrg}>Save</Button>
            </TabsContent>

            <TabsContent value="defaults" className="space-y-6 mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Invoice Defaults</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2 space-y-2 mb-2">
                      <Label>Invoice Number Format</Label>
                      <Input value={orgForm.invoice_prefix} onChange={(e) => setOrgForm({ ...orgForm, invoice_prefix: e.target.value })} placeholder="e.g. INV-{YYYY}-{NNNN}" />
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                        Use placeholders to create a custom format. E.g. <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">INV-{`{YYYY}`}-{`{NNNN}`}</code> produces INV-2024-0001, <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">SALES-{`{YY}`}-{`{NN}`}</code> produces SALES-24-01. If no placeholders are used, we append the year and number automatically.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Terms (days)</Label>
                      <Input type="number" value={orgForm.payment_terms} onChange={(e) => setOrgForm({ ...orgForm, payment_terms: parseInt(e.target.value) || 30 })} />
                    </div>
                  </div>
                  <Button onClick={saveOrg}>Save Changes</Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="bank-accounts" className="space-y-6 mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Bank Accounts</CardTitle>
                    <CardDescription className="text-xs">Manage bank details displayed on your invoices</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => {
                    setBankForm({ bank_name: "", account_holder_name: "", account_number: "", ifsc: "", branch: "", upi_id: "" });
                    setEditBankId(null);
                    setBankDialogOpen(true);
                  }}>
                    <Plus className="mr-1 h-4 w-4" /> Add Bank Account
                  </Button>
                </CardHeader>
                <CardContent>
                  {bankAccounts.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No bank accounts added. Click 'Add Bank Account' to add one.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {bankAccounts.map((account) => {
                        let notesData = { branch: "" };
                        try {
                          if (account.notes) notesData = JSON.parse(account.notes);
                        } catch (e) {}
                        
                        return (
                          <div key={account.id} className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 relative">
                            <div className="absolute top-4 right-4 flex gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditBankAccount(account)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteBankAccount(account.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-3 mb-4">
                              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                                <Landmark className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="font-semibold">{account.bank_name || "Unknown Bank"}</h4>
                                <p className="text-xs text-muted-foreground">{account.name}</p>
                              </div>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="grid grid-cols-3 gap-1">
                                <span className="text-muted-foreground">Account:</span>
                                <span className="col-span-2 font-mono">
                                  {account.account_number ? `••••${account.account_number.slice(-4)}` : "—"}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-1">
                                <span className="text-muted-foreground">IFSC:</span>
                                <span className="col-span-2 font-mono">{account.ifsc || "—"}</span>
                              </div>
                              <div className="grid grid-cols-3 gap-1">
                                <span className="text-muted-foreground">Branch:</span>
                                <span className="col-span-2">{notesData.branch || "—"}</span>
                              </div>
                              {account.upi_id && (
                                <div className="grid grid-cols-3 gap-1">
                                  <span className="text-muted-foreground">UPI ID:</span>
                                  <span className="col-span-2">{account.upi_id}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editBankId ? "Edit Bank Account" : "Add Bank Account"}</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label>Account Holder Name *</Label>
                      <Input value={bankForm.account_holder_name} onChange={(e) => setBankForm({ ...bankForm, account_holder_name: e.target.value })} placeholder="Business Name or Individual Name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <Input value={bankForm.bank_name} onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })} placeholder="e.g. HDFC Bank" />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Number</Label>
                      <Input value={bankForm.account_number} onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })} placeholder="Account Number" />
                    </div>
                    <div className="space-y-2">
                      <Label>IFSC Code</Label>
                      <Input value={bankForm.ifsc} onChange={(e) => setBankForm({ ...bankForm, ifsc: e.target.value.toUpperCase() })} placeholder="e.g. HDFC0001234" />
                    </div>
                    <div className="space-y-2">
                      <Label>Branch</Label>
                      <Input value={bankForm.branch} onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })} placeholder="Branch Location" />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>UPI ID (Optional)</Label>
                      <Input value={bankForm.upi_id} onChange={(e) => setBankForm({ ...bankForm, upi_id: e.target.value })} placeholder="e.g. yourname@upi" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setBankDialogOpen(false)} disabled={bankSaving}>Cancel</Button>
                    <Button onClick={saveBankAccount} disabled={bankSaving}>{bankSaving ? "Saving..." : "Save"}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

        </Tabs>
        </TabsContent>

        <TabsContent value="taxes" className="space-y-6 mt-4">
          <Card className="border-indigo-100 bg-indigo-50/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-indigo-950">Official GST Slabs</CardTitle>
              <CardDescription className="text-xs text-indigo-700">
                Standard GST tax slabs configured across your catalog, items, and billing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {INDIAN_GST_SLABS.map((slab) => (
                  <div key={slab.id} className="p-3 bg-white rounded-lg border border-indigo-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="inline-block px-2 py-0.5 text-xs font-bold bg-indigo-100 text-indigo-800 rounded mb-1.5">
                        {slab.rate}%
                      </span>
                      <div className="font-semibold text-xs text-slate-800 line-clamp-1">{slab.name.split(" - ")[1] || slab.name}</div>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-2">
                      {slab.rate === 0 && "Exempted goods & services"}
                      {slab.rate === 3 && "Gold, silver & precious metals"}
                      {slab.rate === 5 && "Essential goods & food items"}
                      {slab.rate === 18 && "Standard goods & services"}
                      {slab.rate === 40 && "Luxury & sin goods"}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Custom / Saved Tax Rates</CardTitle>
                <CardDescription className="text-xs">Database tax rate entries synced with your invoices</CardDescription>
              </div>
              <Button size="sm" onClick={() => {
                setTaxForm({ name: "", rate: 18, is_default: false });
                setTaxDialogOpen(true);
              }}>
                <Plus className="mr-1 h-4 w-4" /> Add Tax Rate
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {taxRates.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No custom tax rates saved. Standard 5 GST slabs are automatically active.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxRates.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell>{t.rate}%</TableCell>
                        <TableCell>{t.is_default ? "Yes" : "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteTaxRate(t.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Dialog open={taxDialogOpen} onOpenChange={setTaxDialogOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Tax Rate</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Preset Slab</Label>
                  <Select onValueChange={(val) => {
                    const slab = INDIAN_GST_SLABS.find(s => s.id === val);
                    if (slab) {
                      setTaxForm(prev => ({ ...prev, name: slab.name, rate: slab.rate }));
                    }
                  }}>
                    <SelectTrigger><SelectValue placeholder="Pick a standard GST slab" /></SelectTrigger>
                    <SelectContent>
                      {INDIAN_GST_SLABS.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={taxForm.name} onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })} placeholder="e.g. GST 18%" />
                </div>
                <div className="space-y-2">
                  <Label>Rate (%)</Label>
                  <Input type="number" step="0.01" value={taxForm.rate} onChange={(e) => setTaxForm({ ...taxForm, rate: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={taxForm.is_default} onCheckedChange={(v) => setTaxForm({ ...taxForm, is_default: !!v })} />
                  <Label>Set as default</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTaxDialogOpen(false)}>Cancel</Button>
                <Button onClick={saveTaxRate}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="support" className="space-y-6 mt-4">
          <SupportPage />
        </TabsContent>
        
        </Tabs>
        <AddWarehouseDialog
        open={addWarehouseOpen}
        onOpenChange={setAddWarehouseOpen}
        onWarehouseAdded={() => {
          toast({ title: "Warehouse added successfully" });
        }}
      />
      <PlanSelectorModal 
        open={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
        orgId={org?.id}
      />
    </div>
  );
}

