export const DOCUMENT_TEMPLATES = [
  {
    id: "standard_gst",
    name: "Standard GST",
    description: "Indian GST compliant invoice with HSN/SAC, explicit CGST/SGST/IGST breakdown, and E-Way Bill details.",
    preview: "bg-background border-border",
    features: ["Company logo", "CGST/SGST columns", "E-Way Bill support", "TDS/TCS support"],
    recommendedPaperSize: "a4",
  },
  {
    id: "professional_navy",
    name: "Professional Navy GST",
    description: "Classic professional navy template matching standard business format with strict table borders.",
    preview: "bg-blue-50 border-blue-900/20",
    features: ["Classic Navy header", "Strict tabular layout", "Amount in words", "Bank details & QR", "Separate Terms & Totals"],
    recommendedPaperSize: "a4",
  },
  {
    id: "corporate_blue",
    name: "Corporate Blue GST",
    description: "Modern professional blue GST template with detailed tax breakdown, amount in words, bank details & QR code.",
    preview: "bg-blue-50 border-blue-200",
    features: ["Corporate Blue header", "Detailed GST breakdown", "Amount in words", "Bank details & QR", "Custom Tax Summary"],
    recommendedPaperSize: "a4",
  },
  {
    id: "classic_tabular",
    name: "Classic Tabular",
    description: "Detailed tabular format matching standard Indian tax invoice.",
    preview: "bg-slate-50 border-slate-900/20",
    features: ["Classic Tabular layout", "Amount in words", "Bank details & QR", "Custom Tax Summary"],
    recommendedPaperSize: "a4",
  },
  {
    id: "modern_navy",
    name: "Modern Navy Yellow",
    description: "Sleek navy and yellow themed template.",
    preview: "bg-blue-50 border-blue-900/20",
    features: ["Modern Navy layout", "Yellow accents", "Amount in words", "Bank details & QR", "Custom Tax Summary"],
    recommendedPaperSize: "a4",
  },
  {
    id: "modern_teal",
    name: "Modern Teal",
    description: "Professional teal themed modern invoice.",
    preview: "bg-teal-50 border-teal-900/20",
    features: ["Modern Teal layout", "Amount in words", "Bank details & QR", "Custom Tax Summary"],
    recommendedPaperSize: "a4",
  },
  {
    id: "modern_crimson",
    name: "Modern Crimson",
    description: "Professional crimson/red themed modern invoice.",
    preview: "bg-rose-50 border-rose-900/20",
    features: ["Modern Crimson layout", "Amount in words", "Bank details & QR", "Custom Tax Summary"],
    recommendedPaperSize: "a4",
  },
  {
    id: "retail_a5",
    name: "Retail A5 Invoice",
    description: "Official retail A5 invoice featuring top diagonal banner, branded contact icons, boxed invoice metadata, and curved footer.",
    preview: "bg-sky-50 border-sky-600/30",
    features: ["A5 voucher format", "Diagonal banner", "Boxed invoice meta", "Clean tax table", "Decorative curved footer"],
    recommendedPaperSize: "a5",
    category: "retail",
  },
  {
    id: "pos_clean",
    name: "POS Thermal Slip (Clean Receipt)",
    description: "Clean high-contrast 80mm thermal receipt with company header, instant customer info, item price table, and UPI/Cash grand total.",
    preview: "bg-zinc-50 border-zinc-900/40",
    features: ["80mm thermal receipt", "Customer bill row", "Item price columns", "UPI/Cash payment mode", "Instant thermal printing"],
    recommendedPaperSize: "pos80",
    category: "retail",
  },
  {
    id: "pos_detailed",
    name: "POS Tax Invoice (Detailed GST Summary)",
    description: "Comprehensive 80mm POS slip featuring HSN codes, Salesman details, GST Summary table breakdown, and Terms & Conditions.",
    preview: "bg-zinc-100 border-zinc-900/60",
    features: ["Tax Invoice header", "HSN & Salesman slots", "GST summary box table", "Cash & Round off calculation", "Terms & conditions"],
    recommendedPaperSize: "pos80",
    category: "retail",
  },
] as const;

export const PAPER_SIZES = [
  { id: "a4", name: "A4", dimensions: "210 × 297 mm" },
  { id: "letter", name: "Letter", dimensions: "8.5 × 11 in" },
  { id: "legal", name: "Legal", dimensions: "8.5 × 14 in" },
  { id: "a5", name: "A5", dimensions: "148 × 210 mm" },
  { id: "a6", name: "A6", dimensions: "105 × 148 mm" },
  { id: "pos80", name: "POS 80mm", dimensions: "80 × auto mm" },
] as const;

export function getDocumentPreviewClass(templateStyle?: string, paperSize?: string) {
  const sizeClass = {
    a4: "max-w-[210mm]",
    letter: "max-w-[8.5in]",
    legal: "max-w-[8.5in] min-h-[14in]",
    a5: "max-w-[148mm]",
    a6: "max-w-[105mm]",
    pos80: "max-w-[80mm]",
  }[paperSize || "a4"];

  return `invoice-printable mx-auto w-full rounded-xl border border-border bg-card text-card-foreground shadow-sm ${sizeClass || "max-w-[210mm]"} print:max-w-none print:shadow-none print:border-0 print:rounded-none`;
}

export function getPaperSizeLabel(paperSize?: string) {
  return PAPER_SIZES.find((size) => size.id === paperSize)?.name || "A4";
}

/** Returns CSS class to add to <html> or a <style> tag for @page sizing */
export function getPrintPageCSS(paperSize?: string): string {
  const sizes: Record<string, string> = {
    a4: "210mm 297mm",
    letter: "8.5in 11in",
    legal: "8.5in 14in",
    a5: "148mm 210mm",
    a6: "105mm 148mm",
    pos80: "80mm auto",
  };
  const size = sizes[paperSize || "a4"] || sizes.a4;

  const fontScale: Record<string, string> = {
    a4: "11px",
    letter: "11px",
    legal: "11px",
    a5: "9px",
    a6: "7px",
    pos80: "11px",
  };
  const baseFontSize = fontScale[paperSize || "a4"] || "11px";
  const pageMargin = paperSize === "pos80" ? "2mm" : "8mm";
  const pagePadding = paperSize === "pos80" ? "0" : "12px";

  return `
@media print {
  @page { size: ${size}; margin: ${pageMargin}; }
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
  body * { visibility: hidden; }
  .invoice-printable, .invoice-printable * { visibility: visible; }
  .invoice-printable {
    position: absolute; left: 0; top: 0;
    width: 100% !important; max-width: none !important;
    margin: 0 !important; padding: ${pagePadding} !important;
    font-size: ${baseFontSize} !important;
    box-shadow: none !important; border: none !important; border-radius: 0 !important;
    color: #000 !important; background: #fff !important;
  }
  .invoice-printable table { font-size: inherit !important; border-collapse: collapse; width: 100%; }
  .invoice-printable th, .invoice-printable td { padding: 3px 6px !important; font-size: inherit !important; }
  .invoice-printable thead { display: table-header-group; }
  .invoice-printable tr, .invoice-printable td, .invoice-printable th { page-break-inside: avoid !important; break-inside: avoid !important; }
  .invoice-printable h1, .invoice-printable h2, .invoice-printable h3 { font-size: 1.1em !important; }
  .no-print, header, nav, aside, [data-sidebar], .sidebar-trigger { display: none !important; }
}`;
}

/**
 * Dynamic typography helper for company name display on invoices & quotations.
 * Automatically scales font size so that longer company names (e.g. 50-70+ chars)
 * neatly fit in at most 2 lines, preventing unsightly 3-5 line wraps.
 */
export function getAdaptiveCompanyNameStyle(name?: string): {
  className: string;
  fontSize: string;
  lineHeight: string;
} {
  const len = (name || "").trim().length;
  if (len > 50) {
    return {
      className: "text-[12.5px] leading-[1.2] font-black uppercase tracking-tight",
      fontSize: "12.5px",
      lineHeight: "1.2",
    };
  }
  if (len > 35) {
    return {
      className: "text-[14px] leading-[1.2] font-black uppercase tracking-tight",
      fontSize: "14px",
      lineHeight: "1.2",
    };
  }
  if (len > 20) {
    return {
      className: "text-[16.5px] leading-[1.2] font-black uppercase tracking-tight",
      fontSize: "16.5px",
      lineHeight: "1.2",
    };
  }
  return {
    className: "text-[21px] leading-[1.2] font-black uppercase tracking-tight",
    fontSize: "21px",
    lineHeight: "1.2",
  };
}

/**
 * Splits a company name gracefully into at most 2 balanced lines across words,
 * ensuring lengthy names never spill into 3 or 4 lines.
 */
export function splitCompanyNameIntoTwoLines(name?: string): { line1: string; line2?: string } {
  if (!name) return { line1: "" };
  const trimmed = name.trim();
  if (trimmed.includes("\n")) {
    const parts = trimmed.split("\n");
    return { line1: parts[0], line2: parts.slice(1).join(" ") };
  }
  if (trimmed.length <= 32) {
    return { line1: trimmed };
  }
  const words = trimmed.split(/\s+/);
  if (words.length <= 1) {
    return { line1: trimmed };
  }
  const mid = trimmed.length / 2;
  let bestIdx = 1;
  let bestDiff = Infinity;
  let runningLen = 0;
  for (let i = 0; i < words.length - 1; i++) {
    runningLen += words[i].length + (i > 0 ? 1 : 0);
    const diff = Math.abs(runningLen - mid);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i + 1;
    }
  }
  const line1 = words.slice(0, bestIdx).join(" ");
  const line2 = words.slice(bestIdx).join(" ");
  return { line1, line2 };
}
