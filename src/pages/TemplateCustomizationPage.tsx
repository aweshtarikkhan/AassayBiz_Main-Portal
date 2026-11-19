import { StyledInvoiceTemplate } from "@/components/invoice/StyledInvoiceTemplate";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/app-store";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Upload, Check, FileText, Palette, ArrowLeft } from "lucide-react";
import { PAPER_SIZES } from "@/lib/document-templates";

const TEMPLATE_STYLES = [
  { id: "standard_gst", name: "Standard GST", description: "Indian GST compliant invoice with HSN/SAC, explicit CGST/SGST/IGST breakdown, and E-Way Bill details." },
  { id: "corporate_blue", name: "Corporate Blue GST", description: "Modern professional blue GST template with detailed tax breakdown, amount in words, bank details & QR code." },
    { id: "professional_navy", name: "Professional Navy GST", description: "Classic professional navy template matching standard business format with strict table borders." },
  { id: "classic_tabular", name: "Classic Tabular", description: "Detailed tabular format matching standard Indian tax invoice." },
  { id: "modern_navy", name: "Modern Navy Yellow", description: "Sleek navy and yellow themed template." },
  { id: "modern_teal", name: "Modern Teal", description: "Professional teal themed modern invoice." },
  { id: "modern_crimson", name: "Modern Crimson", description: "Professional crimson/red themed modern invoice." },
];

const FONTS = [
  "Inter", "Arial", "Helvetica", "Georgia", "Times New Roman",
  "Roboto", "Open Sans", "Lato", "Montserrat",
];

const ACCENT_COLORS = [
  "#2563eb", "#0891b2", "#059669", "#d97706", "#dc2626",
  "#7c3aed", "#db2777", "#1d4ed8", "#374151", "#0d9488",
];


const SAMPLE_PREVIEW_DATA = {
  invoice: {
    id: "sample-preview-inv",
    invoice_number: "INV-2026-0001",
    issue_date: "2026-09-04",
    due_date: "2026-09-18",
    subtotal: 25000,
    tax_total: 4500,
    total_tax: 4500,
    total: 29500,
    balance_due: 29500,
    amount_paid: 0,
    total_discount: 0,
    shipping_charge: 0,
    adjustment: 0,
    currency_code: "INR",
    notes: "Thank you for your business. Please remit payment by the due date.",
    terms: "1. Payment is due within 14 days of invoice date.\n2. Goods once sold will not be taken back.\n3. Subject to local jurisdiction.",
    clients: {
      display_name: "Acme Technologies Pvt Ltd",
      company_name: "Acme Technologies Pvt Ltd",
      tax_number: "27AABCU9603R1ZM",
      phone: "+91 98765 43210",
      email: "billing@acmetech.com",
    },
    billing_address: JSON.stringify({
      street: "Plot 42, Tech City, Sector 5",
      city: "Mumbai",
      state: "Maharashtra",
      zip: "400076",
      country: "India",
    }),
    shipping_address: JSON.stringify({
      street: "Plot 42, Tech City, Sector 5",
      city: "Mumbai",
      state: "Maharashtra",
      zip: "400076",
      country: "India",
    }),
    place_of_supply: "Maharashtra",
  },
  lines: [
    {
      id: "line-1",
      item_name: "Enterprise Software License",
      description: "Annual multi-user billing & inventory management module",
      hsn_code: "998313",
      quantity: 1,
      unit: "pcs",
      rate: 15000,
      discount_amount: 0,
      tax_rate: 18,
      tax_name: "GST 18%",
      line_total: 17700,
    },
    {
      id: "line-2",
      item_name: "Cloud Integration & Setup",
      description: "Data migration, staff onboarding and setup assistance",
      hsn_code: "998314",
      quantity: 1,
      unit: "hrs",
      rate: 10000,
      discount_amount: 0,
      tax_rate: 18,
      tax_name: "GST 18%",
      line_total: 11800,
    },
  ],
  taxBreakdown: [
    { name: "CGST (9%)", amount: 2250, rate: 9 },
    { name: "SGST (9%)", amount: 2250, rate: 9 },
  ],
  fmt: (n) => "₹" + (Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
};

export default function TemplateCustomizationPage() {
  const org = useAppStore((s) => s.organization);
  const setOrganization = useAppStore((s) => s.setOrganization);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [style, setStyle] = useState("standard_gst");
  const [accentColor, setAccentColor] = useState("#2563eb");
  const [font, setFont] = useState("Inter");
  const [showLogo, setShowLogo] = useState(true);
  const [logoUrl, setLogoUrl] = useState("");
  const [paperSize, setPaperSize] = useState("a4");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!org) return;
    setStyle((org as any).template_style || "standard_gst");
    setAccentColor((org as any).template_accent_color || "#2563eb");
    setFont((org as any).template_font || "Inter");
    setShowLogo((org as any).template_show_logo ?? true);
    setLogoUrl(org.logo_url || "");
    setPaperSize((org as any).template_paper_size || "a4");
  }, [org]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !org) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${org.id}/logo.${ext}`;

    const { error } = await supabase.storage.from("org-logos").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("org-logos").getPublicUrl(path);
    const url = urlData.publicUrl;

    await supabase.from("organizations").update({ logo_url: url }).eq("id", org.id);
    setLogoUrl(url);
    setOrganization({ ...org, logo_url: url } as any);
    toast({ title: "Logo uploaded!" });
    setUploading(false);
  };

  const handleSave = async () => {
    if (!org) return;
    const { error } = await supabase.from("organizations").update({
      template_style: style,
      template_accent_color: accentColor,
      template_font: font,
      template_show_logo: showLogo,
      template_paper_size: paperSize,
    }).eq("id", org.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setOrganization({ ...org, template_style: style, template_accent_color: accentColor, template_font: font, template_show_logo: showLogo, template_paper_size: paperSize } as any);
      toast({ title: "Template settings saved!" });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Template Customization" description="Customize the look of your invoices, estimates, and credit notes">
        <Button variant="outline" size="sm" onClick={() => navigate("/settings?tab=templates")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Templates
        </Button>
        <Button onClick={handleSave}>Save Changes</Button>
      </PageHeader>

      {/* Logo Upload */}
      <Card>
        <CardHeader><CardTitle className="text-base">Organization Logo</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-16 w-16 object-contain rounded-lg border" />
            ) : (
              <div className="h-16 w-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground/50" />
              </div>
            )}
            <div>
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted/50 transition-colors">
                  <Upload className="h-4 w-4" />
                  {uploading ? "Uploading..." : "Upload Logo"}
                </div>
              </Label>
              <Input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG. Max 2MB.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={showLogo} onCheckedChange={(v) => setShowLogo(!!v)} />
            <Label>Show logo on documents</Label>
          </div>
        </CardContent>
      </Card>

      {/* Template Style */}
      <Card>
        <CardHeader><CardTitle className="text-base">Template Style</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATE_STYLES.map((tpl) => (
              <div
                key={tpl.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  style === tpl.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                }`}
                onClick={() => setStyle(tpl.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{tpl.name}</span>
                  {style === tpl.id && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground">{tpl.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Accent Color */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palette className="h-4 w-4" /> Accent Color</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color}
                className={`h-10 w-10 rounded-full border-2 transition-all ${
                  accentColor === color ? "border-foreground scale-110 shadow-md" : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setAccentColor(color)}
              />
            ))}
            <div className="flex items-center gap-2 ml-2">
              <Input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-10 w-10 p-0 border-0 cursor-pointer"
              />
              <span className="text-xs text-muted-foreground">Custom</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Font */}
      <Card>
        <CardHeader><CardTitle className="text-base">Font</CardTitle></CardHeader>
        <CardContent>
          <Select value={font} onValueChange={setFont}>
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FONTS.map((f) => (
                <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Paper Size</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {PAPER_SIZES.map((size) => (
              <button
                key={size.id}
                type="button"
                onClick={() => setPaperSize(size.id)}
                className={`rounded-lg border p-4 text-left transition-all ${paperSize === size.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-sm">{size.name}</div>
                    <div className="text-xs text-muted-foreground">{size.dimensions}</div>
                  </div>
                  {paperSize === size.id && <Check className="h-4 w-4 text-primary" />}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Live Document Preview</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Accurate visual representation of the generated invoice matching your chosen style, colors, logo, and paper size.</p>
            </div>
            <Badge variant="outline" className="text-xs">{PAPER_SIZES.find((size) => size.id === paperSize)?.name || "A4"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center bg-slate-100/70 p-4 sm:p-8 rounded-b-lg overflow-x-auto border-t">
          <div className="w-full max-w-[794px] bg-white rounded-lg shadow-md border overflow-hidden">
            <StyledInvoiceTemplate
              org={{
                ...org,
                name: org?.name || "Acme Enterprises",
                legal_name: org?.legal_name || org?.name || "Acme Enterprises Private Limited",
                gst_number: org?.gst_number || "27AABCS1429B1Z",
                email: org?.email || "billing@acme.com",
                phone: org?.phone || "+91 98200 12345",
                address: org?.address || JSON.stringify({
                  street: "101 Skyline Heights, Commercial Hub",
                  city: "Mumbai",
                  state: "Maharashtra",
                  zip: "400001",
                  country: "India",
                }),
                bank_name: org?.bank_name || "HDFC Bank",
                bank_account_number: org?.bank_account_number || "50200012345678",
                bank_ifsc: org?.bank_ifsc || "HDFC0000123",
                bank_branch: org?.bank_branch || "Fort, Mumbai",
                upi_id: org?.upi_id || "acme@hdfcbank",
                template_style: style,
                template_accent_color: accentColor,
                template_font: font,
                template_show_logo: showLogo,
                logo_url: logoUrl || org?.logo_url || "",
                template_paper_size: paperSize,
              }}
              invoice={SAMPLE_PREVIEW_DATA.invoice}
              lines={SAMPLE_PREVIEW_DATA.lines}
              fmt={SAMPLE_PREVIEW_DATA.fmt}
              type="invoice"
              taxBreakdown={SAMPLE_PREVIEW_DATA.taxBreakdown}
              isInterstate={false}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
