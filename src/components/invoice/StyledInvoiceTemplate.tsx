import { InvoiceTotalsTable } from "./InvoiceTotalsTable";
import { getAdaptiveCompanyNameStyle, splitCompanyNameIntoTwoLines } from "@/lib/document-templates";
import { resolveLineTaxRate, computeDocumentTotals, computeLineFinancials } from "@/lib/invoiceCalculations";
import { QRCodeSVG } from "qrcode.react";
import { CorporateBlueInvoiceTemplate } from "./CorporateBlueInvoiceTemplate";
import { ProfessionalNavyInvoiceTemplate } from "./ProfessionalNavyInvoiceTemplate";

import { ClassicTabularInvoiceTemplate } from "./ClassicTabularInvoiceTemplate";
import { ModernNavyInvoiceTemplate } from "./ModernNavyInvoiceTemplate";
import { ModernTealInvoiceTemplate } from "./ModernTealInvoiceTemplate";
import { ModernCrimsonInvoiceTemplate } from "./ModernCrimsonInvoiceTemplate";
import { RetailA5InvoiceTemplate } from "./RetailA5InvoiceTemplate";
import { IndustryA5ModernInvoiceTemplate } from "./IndustryA5ModernInvoiceTemplate";
import { IndustryA5ClassicInvoiceTemplate } from "./IndustryA5ClassicInvoiceTemplate";
import { IndustryA6MonochromeInvoiceTemplate } from "./IndustryA6MonochromeInvoiceTemplate";
import { IndustryA6SlantInvoiceTemplate } from "./IndustryA6SlantInvoiceTemplate";
import { IndustryA6GeometricInvoiceTemplate } from "./IndustryA6GeometricInvoiceTemplate";
import { CorporateMaroonInvoiceTemplate } from "./CorporateMaroonInvoiceTemplate";
import { PosCleanInvoiceTemplate } from "./PosCleanInvoiceTemplate";
import { PosDetailedInvoiceTemplate } from "./PosDetailedInvoiceTemplate";
import { isRetailOrg } from "@/lib/business-category";


interface StyledInvoiceTemplateProps {
  org: any;
  invoice: any;
  lines: any[];
  fmt: (n: number) => string;
  type?: "invoice" | "estimate" | "bill" | "po";
  taxBreakdown?: { name: string; amount: number }[];
  isInterstate?: boolean;
  showSignature?: boolean;
}

const getTitleText = (type: string, hasGst = true) => {
  if (type === "estimate") return "QUOTATION";
  if (type === "po") return "PURCHASE ORDER";
  if (type === "bill") return "PURCHASE INVOICE";
  return hasGst ? "TAX INVOICE" : "INVOICE";
};

export function StyledInvoiceTemplate({ org, invoice, lines, fmt, type = "invoice", taxBreakdown, isInterstate, showSignature = true }: StyledInvoiceTemplateProps) {
  const paperSize = (invoice?.metadata as any)?.template_paper_size || org?.template_paper_size || "a4";
  const tplStyle = (invoice?.metadata as any)?.template_style || org?.template_style || "standard_gst";

  // Dedicated Industry A6 Templates
  if (tplStyle === "industry_a6_slant") {
    return (
      <IndustryA6SlantInvoiceTemplate
        org={org}
        invoice={invoice}
        lines={lines}
        fmt={fmt}
        type={type}
        taxBreakdown={taxBreakdown}
        isInterstate={isInterstate}
        showSignature={showSignature}
      />
    );
  }

  if (tplStyle === "industry_a6_geometric") {
    return (
      <IndustryA6GeometricInvoiceTemplate
        org={org}
        invoice={invoice}
        lines={lines}
        fmt={fmt}
        type={type}
        taxBreakdown={taxBreakdown}
        isInterstate={isInterstate}
        showSignature={showSignature}
      />
    );
  }

  if (tplStyle === "industry_a6_monochrome" || (!isRetailOrg(org) && paperSize === "a6")) {
    return (
      <IndustryA6MonochromeInvoiceTemplate
        org={org}
        invoice={invoice}
        lines={lines}
        fmt={fmt}
        type={type}
        taxBreakdown={taxBreakdown}
        isInterstate={isInterstate}
        showSignature={showSignature}
      />
    );
  }

  // Dedicated Corporate Maroon & Gold GST A4 Template
  if (tplStyle === "maroon_classic_gst") {
    return (
      <CorporateMaroonInvoiceTemplate
        org={org}
        invoice={invoice}
        lines={lines}
        fmt={fmt}
        type={type}
        taxBreakdown={taxBreakdown}
        isInterstate={isInterstate}
        showSignature={showSignature}
      />
    );
  }

  // Dedicated Industry A5 Templates
  if (tplStyle === "industry_a5_classic" || (!isRetailOrg(org) && paperSize === "a5" && tplStyle === "industry_a5_classic")) {
    return (
      <IndustryA5ClassicInvoiceTemplate
        org={org}
        invoice={invoice}
        lines={lines}
        fmt={fmt}
        type={type}
        taxBreakdown={taxBreakdown}
        isInterstate={isInterstate}
        showSignature={showSignature}
      />
    );
  }

  if (tplStyle === "industry_a5_modern" || (!isRetailOrg(org) && paperSize === "a5")) {
    return (
      <IndustryA5ModernInvoiceTemplate
        org={org}
        invoice={invoice}
        lines={lines}
        fmt={fmt}
        type={type}
        taxBreakdown={taxBreakdown}
        isInterstate={isInterstate}
        showSignature={showSignature}
      />
    );
  }

  // Dedicated Retail A5 & POS Templates
  if (tplStyle === "retail_a5" || (paperSize === "a5" && isRetailOrg(org))) {
    return (
      <RetailA5InvoiceTemplate
        org={org}
        invoice={invoice}
        lines={lines}
        fmt={fmt}
        type={type}
        taxBreakdown={taxBreakdown}
        isInterstate={isInterstate}
        showSignature={showSignature}
      />
    );
  }

  if (tplStyle === "pos_detailed") {
    return (
      <PosDetailedInvoiceTemplate
        org={org}
        invoice={invoice}
        lines={lines}
        fmt={fmt}
        type={type}
        taxBreakdown={taxBreakdown}
        isInterstate={isInterstate}
      />
    );
  }

  if (tplStyle === "pos_clean" || tplStyle === "pos" || paperSize === "pos80") {
    return (
      <PosCleanInvoiceTemplate
        org={org}
        invoice={invoice}
        lines={lines}
        fmt={fmt}
        type={type}
        taxBreakdown={taxBreakdown}
        isInterstate={isInterstate}
      />
    );
  }

  if (tplStyle === "classic_tabular") {
    return <ClassicTabularInvoiceTemplate org={org} invoice={invoice} lines={lines} fmt={fmt} type={type} taxBreakdown={taxBreakdown} isInterstate={isInterstate} showSignature={showSignature} />;
  }
  if (tplStyle === "modern_navy") {
    return <ModernNavyInvoiceTemplate org={org} invoice={invoice} lines={lines} fmt={fmt} type={type} taxBreakdown={taxBreakdown} isInterstate={isInterstate} showSignature={showSignature} />;
  }
  if (tplStyle === "modern_teal") {
    return <ModernTealInvoiceTemplate org={org} invoice={invoice} lines={lines} fmt={fmt} type={type} taxBreakdown={taxBreakdown} isInterstate={isInterstate} showSignature={showSignature} />;
  }
  if (tplStyle === "modern_crimson") {
    return <ModernCrimsonInvoiceTemplate org={org} invoice={invoice} lines={lines} fmt={fmt} type={type} taxBreakdown={taxBreakdown} isInterstate={isInterstate} showSignature={showSignature} />;
  }

  if (tplStyle === "professional_navy") {
    return (
      <ProfessionalNavyInvoiceTemplate
        org={org}
        invoice={invoice}
        lines={lines}
        fmt={fmt}
        type={type}
        taxBreakdown={taxBreakdown}
        isInterstate={isInterstate} showSignature={showSignature}
      />
    );
  }

  if (tplStyle === "corporate_blue") {
    return (
      <CorporateBlueInvoiceTemplate
        org={org}
        invoice={invoice}
        lines={lines}
        fmt={fmt}
        type={type}
        taxBreakdown={taxBreakdown}
        isInterstate={isInterstate} showSignature={showSignature}
      />
    );
  }

  const accent = (org?.template_accent_color as string) || "#2563eb";
  const font = (org?.template_font as string) || "Inter, system-ui, sans-serif";
  const showLogo = org?.template_show_logo !== false;

  const { line1: orgLine1, line2: orgLine2 } = splitCompanyNameIntoTwoLines(org?.name);
  const isRetailDoc = Boolean((invoice?.metadata as any)?.is_retail || isRetailOrg(org));
  const referredBy = (invoice?.metadata as any)?.referred_by;
  const referredByLabel = (invoice?.metadata as any)?.referred_by_label || "Referred By";
  const rawBillTo = invoice?.billing_address || (invoice?.clients as any)?.billing_address;
  const parsedBillTo = typeof rawBillTo === "string" ? (() => { try { return JSON.parse(rawBillTo); } catch { return null; } })() : rawBillTo;
  const clientName = (invoice?.metadata as any)?.client_name || (parsedBillTo && typeof parsedBillTo === "object" ? parsedBillTo.name : null) || (invoice.clients as any)?.display_name || (invoice.clients as any)?.company_name || (invoice.clients as any)?.name || (invoice as any)?.client_name || "";
  const clientPhone = (invoice?.metadata as any)?.client_mobile || (parsedBillTo && typeof parsedBillTo === "object" ? parsedBillTo.phone : null) || (invoice.clients as any)?.phone || (invoice.clients as any)?.mobile || "";
  const clientGst = (invoice.clients as any)?.tax_number;
  const number = type === "estimate" ? invoice.estimate_number : (type === "po" ? invoice.po_number : invoice.invoice_number);
  const balanceDue = type === "estimate" ? Number(invoice.total) : Number(invoice.balance_due ?? invoice.total);
  const snapshot = (invoice?.metadata as any) || {};
  const hasGst = snapshot.has_gst !== undefined
    ? Boolean(snapshot.has_gst)
    : Boolean((org?.gst_number || org?.tax_number)?.trim() && org?.gst_enabled !== false);

  const addressLines: string[] = [];
  if (org?.address) {
    try {
      const a = typeof org.address === "string" ? JSON.parse(org.address) : org.address;
      if (a?.street) addressLines.push(a.street);
      const cityLine = [a?.city, a?.state, a?.zip].filter(Boolean).join(", ");
      if (cityLine) addressLines.push(cityLine);
      if (a?.country) addressLines.push(a.country);
    } catch {}
  }

  const billToAddressLines: string[] = [];
  if (rawBillTo) {
    try {
      const a = typeof rawBillTo === "string" ? JSON.parse(rawBillTo) : rawBillTo;
      if (typeof a === "string") {
        billToAddressLines.push(a);
      } else if (a && typeof a === "object") {
        if (a.street) billToAddressLines.push(a.street);
        const cityLine = [a.city, a.state, a.zip].filter(Boolean).join(", ");
        if (cityLine) billToAddressLines.push(cityLine);
        if (a.country) billToAddressLines.push(a.country);
      }
    } catch {}
  }

  const rawShipTo = invoice?.shipping_address || ((invoice?.metadata as any)?.shipping_same_as_billing ? rawBillTo : (invoice?.clients as any)?.shipping_address);
  const shipToAddressLines: string[] = [];
  let shipToName = "";
  let shipToPhone = "";
  let shipToGstin = "";
  if (rawShipTo) {
    try {
      const a = typeof rawShipTo === "string" ? JSON.parse(rawShipTo) : rawShipTo;
      if (typeof a === "string") {
        shipToAddressLines.push(a);
      } else if (a && typeof a === "object") {
        if (a.name) shipToName = a.name;
        if (a.street) shipToAddressLines.push(a.street);
        const cityLine = [a.city, a.state, a.zip].filter(Boolean).join(", ");
        if (cityLine) shipToAddressLines.push(cityLine);
        if (a.country) shipToAddressLines.push(a.country);
        if (a.phone || a.contact) shipToPhone = a.phone || a.contact;
        if (a.gstin || a.tax_number) shipToGstin = a.gstin || a.tax_number;
      }
    } catch {}
  }
  if (!shipToName && (invoice?.metadata as any)?.shipping_same_as_billing) {
    shipToName = clientName;
  }

  const thStyle = { background: "#f4f4f5", color: "#18181b", padding: "8px 10px", fontWeight: 600, borderBottom: "1px solid #e4e4e7", fontSize: 11, textAlign: "right" as const };
  const tdStyle = { padding: "8px 10px", borderBottom: "1px solid #f4f4f5", verticalAlign: "top", textAlign: "right" as const };

  return (
    <div
      className="bg-white text-zinc-900"
      style={{
        fontFamily: font,
        fontSize: 12,
        lineHeight: 1.5,
        padding: "16px 24px",
        color: "#000",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `2px solid ${accent}`, paddingBottom: 16, marginBottom: 14 }}>
        <div>
          {showLogo && org?.logo_url && (
            <img src={org.logo_url} alt={org.name} style={{ maxHeight: 48, maxWidth: 130, objectFit: "contain", marginBottom: 8 }} />
          )}
          <div style={{ fontWeight: 900, fontSize: getAdaptiveCompanyNameStyle(org?.name).fontSize, textTransform: "uppercase", letterSpacing: "-0.02em", color: accent, lineHeight: getAdaptiveCompanyNameStyle(org?.name).lineHeight }}>
            <div>{orgLine1}</div>
            {orgLine2 && <div>{orgLine2}</div>}
          </div>
          {addressLines.map((l, i) => (
            <div key={i} style={{ fontSize: 11, color: "#3f3f46" }}>{l}</div>
          ))}
          {org?.phone && <div style={{ fontSize: 11, color: "#3f3f46" }}>Tel: {org.phone}</div>}
          {org?.email && <div style={{ fontSize: 11, color: "#3f3f46" }}>{org.email}</div>}
          {org?.gst_enabled && org?.gst_number && (
            <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4 }}>GSTIN: {org.gst_number}</div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 800, fontSize: 24, letterSpacing: 0.5, color: accent }}>{getTitleText(type, hasGst)}</div>
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "#71717a", marginRight: 8 }}>{type === "estimate" ? "Quotation#:" : (type === "po" ? "PO#:" : "Invoice#:")}</span>
            <span style={{ fontWeight: 600 }}>{number}</span>
          </div>
          <div>
            <span style={{ fontSize: 11, color: "#71717a", marginRight: 8 }}>Date:</span>
            <span style={{ fontWeight: 600 }}>{invoice.issue_date}</span>
          </div>
          {type === "invoice" && invoice.due_date && !isRetailDoc && !(invoice.metadata as any)?.hide_due_date && (invoice.metadata as any)?.payment_terms !== 0 && (
            <div>
              <span style={{ fontSize: 11, color: "#71717a", marginRight: 8 }}>Due Date:</span>
              <span style={{ fontWeight: 600 }}>{invoice.due_date}</span>
            </div>
          )}
          {type === "estimate" && invoice.expiry_date && (
            <div>
              <span style={{ fontSize: 11, color: "#71717a", marginRight: 8 }}>Valid Till:</span>
              <span style={{ fontWeight: 600 }}>{invoice.expiry_date}</span>
            </div>
          )}
          {invoice.reference_number && (
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 11, color: "#71717a", marginRight: 8 }}>Ref#:</span>
              <span>{invoice.reference_number}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bill To & Ship To */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Bill To</div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{clientName}</div>
          {billToAddressLines.map((l, i) => (
            <div key={i} style={{ fontSize: 11, color: "#3f3f46" }}>{l}</div>
          ))}
          {clientGst && org?.gst_enabled && org?.show_client_gst !== false && (
            <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4 }}>GSTIN: {clientGst}</div>
          )}
          {clientPhone ? (
            <div style={{ fontSize: 11, color: "#3f3f46" }}>Phone: {clientPhone}</div>
          ) : ((invoice.clients as any)?.phone && (
            <div style={{ fontSize: 11, color: "#3f3f46" }}>Phone: {(invoice.clients as any).phone}</div>
          ))}
          {(invoice.clients as any)?.email && (
            <div style={{ fontSize: 11, color: "#3f3f46" }}>Email: {(invoice.clients as any).email}</div>
          )}
          {(org as any)?.pan_enabled && (invoice.clients as any)?.pan_number && (
            <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>PAN: {(invoice.clients as any).pan_number}</div>
          )}
        </div>
        {referredBy ? (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              {referredByLabel}
            </div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{referredBy}</div>
          </div>
        ) : (shipToAddressLines.length > 0 || shipToName) ? (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Ship To</div>
            {shipToName && <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{shipToName}</div>}
            {shipToAddressLines.map((l, i) => (
              <div key={i} style={{ fontSize: 11, color: "#3f3f46" }}>{l}</div>
            ))}
            {shipToPhone && <div style={{ fontSize: 11, color: "#3f3f46" }}>Phone: {shipToPhone}</div>}
            {shipToGstin && <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4 }}>GSTIN: {shipToGstin}</div>}
          </div>
        ) : null}
      </div>

      {/* IRN & E-Invoice Details */}
      {type !== "po" && (invoice.irn || invoice.ack_no) && (
        <div style={{ marginBottom: 20, padding: 12, border: "1px solid #e4e4e7", borderRadius: 6, background: "#fafafa" }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>E-Invoice Details</div>
          <div style={{ display: "grid", gridTemplateColumns: invoice.irn_qr ? "1fr auto" : "1fr", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 11 }}>
              {invoice.irn && <div style={{ gridColumn: "span 2" }}><span style={{ color: "#71717a" }}>IRN:</span> <strong style={{ display: "block", wordBreak: "break-all" }}>{invoice.irn}</strong></div>}
              {invoice.ack_no && <div><span style={{ color: "#71717a" }}>Ack No:</span> <strong style={{ display: "block" }}>{invoice.ack_no}</strong></div>}
              {invoice.ack_date && <div><span style={{ color: "#71717a" }}>Ack Date:</span> <strong style={{ display: "block" }}>{invoice.ack_date}</strong></div>}
            </div>
            {invoice.irn_qr && (
              <div>
                <QRCodeSVG value={invoice.irn_qr} size={64} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* E-Way Bill Details */}
      {type !== "po" && invoice.eway_bill_no && (
        <div style={{ marginBottom: 20, padding: 12, border: "1px solid #e4e4e7", borderRadius: 6, background: "#fafafa" }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>E-Way Bill Details</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, fontSize: 11 }}>
            <div><span style={{ color: "#71717a" }}>E-Way Bill No:</span> <strong style={{ display: "block" }}>{invoice.eway_bill_no}</strong></div>
            {invoice.eway_vehicle_no && <div><span style={{ color: "#71717a" }}>Vehicle No:</span> <strong style={{ display: "block" }}>{invoice.eway_vehicle_no}</strong></div>}
            {invoice.eway_transport_mode && <div><span style={{ color: "#71717a" }}>Transport Mode:</span> <strong style={{ display: "block" }}>{invoice.eway_transport_mode}</strong></div>}
            {invoice.eway_distance_km && <div><span style={{ color: "#71717a" }}>Distance (Km):</span> <strong style={{ display: "block" }}>{invoice.eway_distance_km}</strong></div>}
          </div>
        </div>
      )}

      {/* Line Items */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, border: "1px solid #e4e4e7" }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, textAlign: "left", width: 30 }}>#</th>
            <th style={{ ...thStyle, textAlign: "left" }}>Item &amp; Description</th>
            {hasGst && <th style={{ ...thStyle, textAlign: "left", width: 60 }}>HSN/SAC</th>}
            <th style={{ ...thStyle, width: 60 }}>Qty</th>
            <th style={{ ...thStyle, width: 80 }}>Rate</th>
            {hasGst && !isInterstate && (
              <>
                <th style={{ ...thStyle, width: 80 }}>CGST</th>
                <th style={{ ...thStyle, width: 80 }}>SGST</th>
              </>
            )}
            {hasGst && isInterstate && (
              <th style={{ ...thStyle, width: 80 }}>IGST</th>
            )}
            <th style={{ ...thStyle, width: 100 }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, idx) => {
            const dRatio = invoice?.subtotal > 0 && invoice?.discount > 0 ? (Number(invoice.discount) / Number(invoice.subtotal)) : 0;
            const { qty, rate, taxableAmt, taxRate, taxAmt, lineTotal } = computeLineFinancials(line, dRatio);
            const itemName = line.name || line.items?.name || line.item?.name || line.item_name || (line.description ? String(line.description).split("\n")[0] : "") || "Item";
            const itemDesc = (line.name || line.items?.name || line.item?.name || line.item_name)
              ? (line.description && line.description !== itemName ? line.description : "")
              : (line.description && String(line.description).includes("\n") ? String(line.description).split("\n").slice(1).join("\n") : "");
            const isZeroTax = taxAmt === 0;
            const halfTax = taxAmt / 2;

            return (
              <tr key={line.id || idx}>
                <td style={{ ...tdStyle, textAlign: "left" }}>{idx + 1}</td>
                <td style={{ ...tdStyle, textAlign: "left" }}>
                  <div style={{ fontWeight: 600 }}>{itemName}</div>
                  {line.batch_no && <div style={{ fontSize: 9.5, color: "#64748b", marginTop: 1 }}>Batch: {line.batch_no}</div>}
                  {itemDesc && <div style={{ fontSize: 10, color: "#52525b", marginTop: 2, whiteSpace: "pre-wrap" }}>{itemDesc}</div>}
                </td>
                {hasGst && <td style={{ ...tdStyle, textAlign: "left", fontSize: 11 }}>{line.hsn_code || line.hsn || line.hsn_sac || line.item?.hsn_code || line.items?.hsn_code || "-"}</td>}
                <td style={{ ...tdStyle }}>
                  <div style={{ fontWeight: 600 }}>
                    {qty}
                    {(line.unit || line.item?.unit) && <span style={{ fontSize: 10, color: "#71717a", marginLeft: 2 }}>{line.unit || line.item?.unit}</span>}
                  </div>
                  {invoice?.show_sub_units !== false && line.sub_unit && line.sub_unit_conversion_rate && Number(line.sub_unit_conversion_rate) > 1 && line.unit?.toLowerCase() !== line.sub_unit?.toLowerCase() && (
                    <div style={{ fontSize: 9, color: "#71717a", marginTop: 2 }}>
                      (= {(Number(line.quantity) * Number(line.sub_unit_conversion_rate)).toLocaleString("en-IN", { maximumFractionDigits: 2 })} {line.sub_unit})
                    </div>
                  )}
                </td>
                <td style={{ ...tdStyle }}>
                  <div style={{ fontWeight: 600 }}>{fmt(rate).replace('₹', '').trim()}</div>
                  {Number(line.discount) > 0 && (
                    <div style={{ fontSize: 9, color: "#16a34a", fontWeight: 600, marginTop: 2 }}>
                      {line.discount}% disc.
                    </div>
                  )}
                </td>
                {hasGst && !isInterstate && (
                  <>
                    <td style={{ ...tdStyle }}>{isZeroTax ? "-" : fmt(halfTax).replace('₹', '').trim()}</td>
                    <td style={{ ...tdStyle }}>{isZeroTax ? "-" : fmt(halfTax).replace('₹', '').trim()}</td>
                  </>
                )}
                {hasGst && isInterstate && (
                  <td style={{ ...tdStyle }}>{isZeroTax ? "-" : fmt(taxAmt).replace('₹', '').trim()}</td>
                )}
                <td style={{ ...tdStyle, fontWeight: 700 }}>
                  {fmt(lineTotal).replace('₹', '').trim()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals & Notes */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 40 }}>
        
        {/* Left Side: Notes & Bank Details & QR */}
        {(() => {
          const showBank = invoice?.metadata?.show_bank_details !== false;
          const showTerms = !isRetailDoc && invoice?.metadata?.show_terms !== false;
          const showNotes = invoice?.metadata?.show_notes !== false;
          return (
            <div style={{ flex: 1 }}>
              {showNotes && invoice.notes && invoice.notes.trim() && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: accent, marginBottom: 4 }}>Notes</div>
                  <div style={{ fontSize: 11, whiteSpace: "pre-wrap", color: "#3f3f46" }}>{invoice.notes.trim()}</div>
                </div>
              )}
              {showTerms && (invoice.terms_conditions || invoice.terms || invoice.default_terms || org?.default_terms) && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: accent, marginBottom: 4 }}>Terms &amp; Conditions</div>
                  <div style={{ fontSize: 11, whiteSpace: "pre-wrap", color: "#3f3f46" }}>
                    {(invoice.terms_conditions || invoice.terms || invoice.default_terms || org?.default_terms).trim()}
                  </div>
                </div>
              )}

              {(() => {
                const invoiceBank = invoice?.bank_details;
                const isBankDisabled = !showBank || (invoiceBank && invoiceBank.enabled === false);
            const bankAccName = invoiceBank?.bank_account_name || (!isBankDisabled ? (org?.bank_account_name || org?.name) : null);
            const bankName = invoiceBank?.bank_name || (!isBankDisabled ? org?.bank_name : null);
            const bankAccNum = invoiceBank?.bank_account_number || (!isBankDisabled ? org?.bank_account_number : null);
            const bankIfsc = invoiceBank?.bank_ifsc || (!isBankDisabled ? org?.bank_ifsc : null);
            const bankBranch = invoiceBank?.bank_branch || (!isBankDisabled ? org?.bank_branch : null);
            const hasBankDetails = !isBankDisabled && Boolean(bankName || bankAccNum || bankIfsc);

            if (type === "po" || !hasBankDetails) return null;
            return (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: accent, marginBottom: 4 }}>Bank Details</div>
                <div style={{ fontSize: 11, color: "#3f3f46", display: "flex", flexDirection: "column", gap: 2 }}>
                  {bankAccName && <div>Account Name: <span style={{ fontWeight: 600 }}>{bankAccName}</span></div>}
                  {bankName && <div>Bank Name: <span style={{ fontWeight: 600 }}>{bankName}</span></div>}
                  {bankAccNum && <div>Account No: <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{bankAccNum}</span></div>}
                  {bankIfsc && <div>IFSC Code: <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{bankIfsc}</span></div>}
                  {bankBranch && <div>Branch: <span style={{ fontWeight: 600 }}>{bankBranch}</span></div>}
                </div>
              </div>
            );
          })()}
          
          {type !== "po" && showBank && org?.qr_code_enabled && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: 12, border: "1px dashed #d4d4d8", borderRadius: 6 }}>
              <QRCodeSVG
                value={
                  org?.upi_id
                    ? `upi://pay?pa=${org.upi_id}&pn=${encodeURIComponent(org.name || "")}&am=${balanceDue.toFixed(2)}&cu=${invoice.currency_code || "INR"}&tn=${encodeURIComponent(`Payment for ${number}`)}`
                    : `${window.location.origin}/portal/invoice/${invoice.id}`
                }
                size={80}
                level="M"
              />
              <div style={{ fontSize: 11 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{org?.upi_id ? "Scan to Pay" : "Scan to View"}</div>
                {org?.upi_id && <div>UPI: <b>{org.upi_id}</b></div>}
              </div>
            </div>
          )}
        </div>
          );
        })()}

        {/* Right Side: Totals */}
        <div style={{ width: 280, fontSize: 12 }}>
          <InvoiceTotalsTable
            invoice={invoice}
            lines={lines}
            taxBreakdown={taxBreakdown}
            hasGst={hasGst}
            fmt={fmt}
            primaryColor={accent}
            accentColor={accent}
            variant="corporate"
            type={type}
          />
        </div>
      </div>

      {/* Authorized Signature */}
      <div style={{ marginTop: 40, display: "flex", justifyContent: "flex-end" }}>
        <div style={{ textAlign: "center", width: 200 }}>
          <div style={{ height: 60, borderBottom: "1px solid #d4d4d8", marginBottom: 8 }}></div>
          
          {showSignature && org?.address?.signature_type && org?.address?.signature_type !== 'none' && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', height: 40, marginTop: -40, position: 'relative', zIndex: 10 }}>
              {org.address.signature_type === 'image' && org.address.signature_image_url ? (
                <img src={org.address.signature_image_url} alt="Signature" style={{ maxHeight: 60, mixBlendMode: 'multiply', objectFit: 'contain' }} />
              ) : org.address.signature_type === 'font' && org.address.signature_name ? (
                <div style={{ fontFamily: org.address.signature_font || 'Caveat', fontSize: 32, lineHeight: 1, color: '#1e293b' }}>
                  {org.address.signature_name}
                </div>
              ) : null}
            </div>
          )}
          <div style={{ fontSize: 11, fontWeight: 600 }}>Authorized Signature</div>
          <div style={{ fontSize: 10, color: "#71717a", marginTop: 2 }}>{org?.name}</div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
      <span style={{ color: "#52525b" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
