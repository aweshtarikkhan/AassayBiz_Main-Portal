import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { SEO } from "@/components/shared/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, FileText, Palette, Eye } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DOCUMENT_TEMPLATES, PAPER_SIZES } from "@/lib/document-templates";
import { StyledInvoiceTemplate } from "@/components/invoice/StyledInvoiceTemplate";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isRetailOrg } from "@/lib/business-category";

const SAMPLE_PREVIEW_DATA = {
  invoice: {
    id: "sample-preview-inv",
    invoice_number: "INV-01",
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

function TemplatePreviewBox({
  templateId,
  org,
  onOpenFullPreview,
}: {
  templateId: string;
  org: any;
  onOpenFullPreview?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.35);

  const isPos = templateId === "pos_clean" || templateId === "pos_detailed";
  const isA5 = templateId === "retail_a5";
  const targetWidth = isPos ? 302 : (isA5 ? 559 : 794);
  const targetMinHeight = isPos ? 550 : (isA5 ? 794 : 1123);
  const aspectClass = isPos ? "aspect-[80/150]" : (isA5 ? "aspect-[148/210]" : "aspect-[210/297]");

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        setScale(w / targetWidth);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [targetWidth]);

  const previewOrg = {
    ...org,
    template_style: templateId,
    template_paper_size: isPos ? "pos80" : (isA5 ? "a5" : "a4"),
  };

  return (
    <div className="relative group/preview w-full">
      <div
        ref={containerRef}
        className={`relative w-full ${aspectClass} overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm select-none`}
      >
        <div
          style={{
            width: `${targetWidth}px`,
            minHeight: `${targetMinHeight}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          className="bg-white text-slate-900 pointer-events-none"
        >
          <StyledInvoiceTemplate
            org={previewOrg}
            invoice={SAMPLE_PREVIEW_DATA.invoice}
            lines={SAMPLE_PREVIEW_DATA.lines}
            fmt={SAMPLE_PREVIEW_DATA.fmt}
            type="invoice"
            taxBreakdown={SAMPLE_PREVIEW_DATA.taxBreakdown}
            isInterstate={false}
          />
        </div>
      </div>

      {onOpenFullPreview && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onOpenFullPreview();
          }}
          className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center rounded-md cursor-pointer text-white z-10"
        >
          <span className="bg-white text-slate-900 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1.5 hover:scale-105 transition-transform">
            <Eye className="h-3.5 w-3.5 text-primary" /> Full View Preview
          </span>
        </div>
      )}
    </div>
  );
}

export default function InvoiceTemplatePage({ embedded = false }: { embedded?: boolean } = {}) {
  const org = useAppStore((s) => s.organization);
  const setOrganization = useAppStore((s) => s.setOrganization);
  const isRetail = isRetailOrg(org);
  const [selected, setSelected] = useState(org?.template_style || (isRetail ? "retail_a5" : "standard_gst"));
  const [paperSize, setPaperSize] = useState(org?.template_paper_size || (isRetail ? "a5" : "a4"));
  const [saving, setSaving] = useState(false);
  const [modalTemplateId, setModalTemplateId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (org?.template_style) {
      setSelected(org.template_style);
    }
    if (org?.template_paper_size) {
      setPaperSize(org.template_paper_size);
    }
  }, [org?.template_style, org?.template_paper_size]);

  const handleSelect = async (templateId: string) => {
    if (!org) return;
    setSaving(true);
    const tpl = DOCUMENT_TEMPLATES.find((t) => t.id === templateId);
    const recommended = (tpl as any)?.recommendedPaperSize || "a4";
    const enforcedSize =
      templateId === "retail_a5" ? "a5" :
      templateId === "pos_clean" || templateId === "pos_detailed" || templateId === "pos" ? "pos80" :
      templateId === "compact" ? "a6" :
      recommended;
    const updates: any = { template_style: templateId, template_paper_size: enforcedSize };
    const { error } = await supabase.from("organizations").update(updates).eq("id", org.id);
    setSaving(false);
    if (error) {
      toast({ title: "Could not save template", description: error.message, variant: "destructive" });
      return;
    }
    setSelected(templateId);
    setPaperSize(enforcedSize);
    setOrganization({ ...org, ...updates } as any);
    const sizeName = PAPER_SIZES.find((s) => s.id === enforcedSize)?.name || "A4";
    toast({ title: `Template set to "${tpl?.name}"`, description: `Paper size: ${sizeName}` });
  };

  const handlePaperSizeChange = async (sizeId: string) => {
    if (!org) return;
    const compatible = DOCUMENT_TEMPLATES.filter((t) => {
      if (sizeId === "a5") return t.id === "retail_a5";
      if (sizeId === "pos80") return t.id === "pos_clean" || t.id === "pos_detailed";
      return ((t as any).recommendedPaperSize || "a4") === sizeId;
    });
    let newTemplate = selected;
    const currentTpl = DOCUMENT_TEMPLATES.find((t) => t.id === selected);
    const currentSize = (currentTpl as any)?.recommendedPaperSize || "a4";
    if (currentSize !== sizeId && compatible.length > 0) {
      newTemplate = compatible[0]?.id || selected;
    }

    const updates: any = { template_paper_size: sizeId };
    if (newTemplate !== selected) updates.template_style = newTemplate;

    setSaving(true);
    const { error } = await supabase.from("organizations").update(updates).eq("id", org.id);
    setSaving(false);
    if (error) {
      toast({ title: "Could not save paper size", description: error.message, variant: "destructive" });
      return;
    }
    setPaperSize(sizeId);
    if (newTemplate !== selected) setSelected(newTemplate);
    setOrganization({ ...org, ...updates } as any);
    const sizeName = PAPER_SIZES.find((size) => size.id === sizeId)?.name;
    toast({
      title: `Paper size set to ${sizeName}`,
      description: newTemplate !== selected ? `Template switched to "${DOCUMENT_TEMPLATES.find(t => t.id === newTemplate)?.name}" for best fit.` : undefined,
    });
  };

  const displayTemplates = DOCUMENT_TEMPLATES.filter((t) => {
    if (paperSize === "a5") {
      return t.id === "retail_a5";
    }
    if (paperSize === "pos80") {
      return t.id === "pos_clean" || t.id === "pos_detailed";
    }
    if (isRetail) {
      // In retail, strictly show only the retail A5 & POS templates
      return t.id === "retail_a5" || t.id === "pos_clean" || t.id === "pos_detailed";
    }
    const rec = (t as any).recommendedPaperSize || "a4";
    return rec === paperSize;
  });

  const sampleOrg = {
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
    logo_url: org?.logo_url || "",
    template_accent_color: org?.template_accent_color || "#2563eb",
    template_font: org?.template_font || "Inter",
    template_show_logo: org?.template_show_logo !== false,
  };

  const activeTemplateName = DOCUMENT_TEMPLATES.find((t) => t.id === selected)?.name || "Standard GST";

  return (
    <div className="space-y-6">
      {!embedded ? (
        <>
          <SEO title="Invoice Templates" description="Choose and customize invoice templates that match your brand identity." path="/templates" />
          <PageHeader
            title="Invoice Templates"
            description="Choose a template style for your invoices, estimates, and credit notes. The previews below accurately match the actual generated documents."
          >
            <Button variant="outline" onClick={() => navigate("/templates/customize")}>
              <Palette className="mr-1 h-4 w-4" /> Customize Colors & Logo
            </Button>
          </PageHeader>
        </>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
          <div>
            <h3 className="text-base font-semibold text-foreground">Invoice &amp; Document Templates</h3>
            <p className="text-xs text-muted-foreground">Select default template design and paper size for your invoices, estimates, and credit notes.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/templates/customize")} className="self-start sm:self-center">
            <Palette className="mr-1.5 h-4 w-4" /> Customize Colors &amp; Logo
          </Button>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">PDF Paper Size</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            {PAPER_SIZES.map((size) => (
              <button
                key={size.id}
                type="button"
                disabled={saving}
                onClick={() => handlePaperSizeChange(size.id)}
                className={`rounded-lg border p-3 text-left transition-all ${paperSize === size.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/30"}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div>
                    <div className="font-medium text-sm">{size.name}</div>
                    <div className="text-[11px] text-muted-foreground">{size.dimensions}</div>
                  </div>
                  {paperSize === size.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Showing templates for <b>{PAPER_SIZES.find(s => s.id === paperSize)?.name || "A4"}</b> paper size. (Active: <span className="font-semibold text-primary">{activeTemplateName}</span>)
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayTemplates.map((tpl) => (
          <Card
            key={tpl.id}
            className={`cursor-pointer transition-all hover:shadow-lg flex flex-col justify-between ${
              selected === tpl.id ? "ring-2 ring-primary border-primary bg-primary/[0.02]" : "hover:border-slate-300"
            }`}
            onClick={() => handleSelect(tpl.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2 font-bold">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span>{tpl.name}</span>
                </CardTitle>
                {selected === tpl.id ? (
                  <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1 text-[11px] shrink-0">
                    <Check className="h-3 w-3" /> Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    Click to Use
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{tpl.description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Authentic rendered mini invoice preview matching actual generated document */}
              <TemplatePreviewBox
                templateId={tpl.id}
                org={sampleOrg}
                onOpenFullPreview={() => setModalTemplateId(tpl.id)}
              />

              <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px] font-medium">
                    {PAPER_SIZES.find((s) => s.id === ((tpl as any).recommendedPaperSize || "a4"))?.name || "A4"}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">recommended</span>
                </div>
                <Button 
                  size="sm" 
                  variant={selected === tpl.id ? "secondary" : "default"} 
                  className="h-7 text-xs font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(tpl.id);
                  }}
                >
                  {selected === tpl.id ? "Selected" : "Select Template"}
                </Button>
              </div>

              <div className="flex flex-wrap gap-1 pt-1">
                {tpl.features.map((f) => (
                  <Badge key={f} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">{f}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Full-size preview dialog */}
      <Dialog open={Boolean(modalTemplateId)} onOpenChange={(open) => { if (!open) setModalTemplateId(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-6">
              <span>
                {DOCUMENT_TEMPLATES.find((t) => t.id === modalTemplateId)?.name} (Actual Document View)
              </span>
              {selected === modalTemplateId ? (
                <Badge variant="default" className="bg-emerald-600 text-white gap-1">
                  <Check className="h-3 w-3" /> Currently Active
                </Badge>
              ) : (
                <Button 
                  size="sm" 
                  onClick={() => {
                    if (modalTemplateId) {
                      handleSelect(modalTemplateId);
                      setModalTemplateId(null);
                    }
                  }}
                >
                  Apply This Template
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center bg-slate-100 p-4 sm:p-8 rounded-lg overflow-x-auto border">
            <div className={`${modalTemplateId === 'pos_clean' || modalTemplateId === 'pos_detailed' ? 'w-[320px]' : modalTemplateId === 'retail_a5' ? 'w-[580px]' : 'w-[794px]'} bg-white rounded-md shadow-md overflow-hidden border`}>
              {modalTemplateId && (
                <StyledInvoiceTemplate
                  org={{
                    ...sampleOrg,
                    template_style: modalTemplateId,
                    template_paper_size: modalTemplateId === 'pos_clean' || modalTemplateId === 'pos_detailed' ? 'pos80' : modalTemplateId === 'retail_a5' ? 'a5' : 'a4',
                  }}
                  invoice={SAMPLE_PREVIEW_DATA.invoice}
                  lines={SAMPLE_PREVIEW_DATA.lines}
                  fmt={SAMPLE_PREVIEW_DATA.fmt}
                  type="invoice"
                  taxBreakdown={SAMPLE_PREVIEW_DATA.taxBreakdown}
                  isInterstate={false}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
