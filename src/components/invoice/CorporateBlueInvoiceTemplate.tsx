import { InvoiceTotalsTable } from "./InvoiceTotalsTable";
import { getAdaptiveCompanyNameStyle, splitCompanyNameIntoTwoLines } from "@/lib/document-templates";
import { resolveLineTaxRate, computeDocumentTotals, computeLineFinancials } from "@/lib/invoiceCalculations";
import { useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { numberToWords } from "@/lib/number-to-words";
import { INDIAN_STATES } from "@/lib/constants";
import { MapPin, Phone, Mail, Globe, CreditCard, FileText, Calendar, Building2, User, ShieldCheck, QrCode } from "lucide-react";
import { isRetailOrg } from "@/lib/business-category";

interface CorporateBlueInvoiceTemplateProps {
  org: any;
  invoice: any;
  lines: any[];
  fmt: (n: number) => string;
  type?: "invoice" | "estimate" | "bill" | "po";
  taxBreakdown?: { name: string; amount: number; rate?: number }[];
  isInterstate?: boolean;
  showSignature?: boolean;
}

function formatAmountInWords(num: number): string {
  const rounded = Math.round(num * 100) / 100;
  const integerPart = Math.floor(Math.abs(rounded));
  const decimalPart = Math.round((Math.abs(rounded) - integerPart) * 100);
  let words = numberToWords(integerPart) + " Rupees";
  if (decimalPart > 0) {
    words += " and " + numberToWords(decimalPart) + " Paise";
  }
  return words + " Only";
}

export function CorporateBlueInvoiceTemplate({
  org,
  invoice,
  lines,
  fmt,
  type = "invoice",
  taxBreakdown = [],
  isInterstate = false,
  showSignature = true,
}: CorporateBlueInvoiceTemplateProps) {
  const primaryBlue = "#0a47d0";
  const darkNavy = "#002060";
  const lightBlueBg = "#eef4ff";
  const lightBorder = "#c7d2fe";
  const snapshot = (invoice?.metadata as any) || {};
  const hasGst = snapshot.has_gst !== undefined
    ? Boolean(snapshot.has_gst)
    : Boolean((org?.gst_number || org?.tax_number)?.trim() && org?.gst_enabled !== false);

  const isRetailDoc = Boolean((invoice?.metadata as any)?.is_retail || isRetailOrg(org));
  const rawBillToObj = invoice?.billing_address || (invoice?.clients as any)?.billing_address;
  const parsedBillTo = typeof rawBillToObj === "string" ? (() => { try { return JSON.parse(rawBillToObj); } catch { return null; } })() : rawBillToObj;

  const clientName = (invoice?.metadata as any)?.client_name || (parsedBillTo && typeof parsedBillTo === "object" ? parsedBillTo.name : null) || (invoice.clients as any)?.display_name || (invoice.clients as any)?.company_name || (invoice.vendors as any)?.name || (invoice.vendors as any)?.display_name || invoice.client_name || "Client Name";
  const clientGst = (invoice.clients as any)?.tax_number || (invoice.vendors as any)?.tax_number || invoice.client_gst;
  const referredBy = (invoice?.metadata as any)?.referred_by;
  const referredByLabel = (invoice?.metadata as any)?.referred_by_label || "Referred By";
  const clientPhone = (invoice?.metadata as any)?.client_mobile || (parsedBillTo && typeof parsedBillTo === "object" ? parsedBillTo.phone : null) || (invoice.clients as any)?.phone || (invoice.vendors as any)?.phone || invoice.client_phone;
  const number = type === "estimate" ? invoice.estimate_number : (type === "po" ? invoice.po_number : (type === "bill" ? invoice.bill_number : invoice.invoice_number));
  const balanceDue = type === "estimate" ? Number(invoice.total) : Number(invoice.balance_due ?? invoice.total);

  // Address parsing
  const addressLines: string[] = useMemo(() => {
    if (!org?.address) return [];
    try {
      const a = typeof org.address === "string" ? JSON.parse(org.address) : org.address;
      const res: string[] = [];
      if (a?.street) res.push(a.street);
      const cityLine = [a?.city, a?.state, a?.zip].filter(Boolean).join(", ");
      if (cityLine) res.push(cityLine);
      if (a?.country) res.push(a.country);
      return res;
    } catch {
      return [];
    }
  }, [org?.address]);

  // Billing address parsing
  const billingAddressLines: string[] = useMemo(() => {
    const raw = invoice.billing_address || (invoice.clients as any)?.billing_address || (invoice.clients as any)?.address || (invoice.vendors as any)?.address;
    if (!raw) return [];
    try {
      const a = typeof raw === "string" ? JSON.parse(raw) : raw;
      const res: string[] = [];
      if (a?.street) res.push(a.street);
      const cityLine = [a?.city, a?.state, a?.zip].filter(Boolean).join(", ");
      if (cityLine) res.push(cityLine);
      if (a?.country) res.push(a.country);
      return res;
    } catch {
      return [];
    }
  }, [invoice?.billing_address]);

  // Place of Supply
  const placeOfSupply = useMemo(() => {
    const pos = invoice.place_of_supply || (invoice.billing_address as any)?.state || org?.state;
    if (!pos) return "Maharashtra (27)";
    const foundState = INDIAN_STATES.find(s => s.code === pos || s.name.toLowerCase() === String(pos).toLowerCase());
    if (foundState) return `${foundState.name} (${foundState.code})`;
    return String(pos);
  }, [invoice.place_of_supply, invoice.billing_address, org?.state]);

  // Detailed tax rates mapping for middle breakdown
  const taxGroupBreakdown = useMemo(() => {
    const map: Record<number, number> = {}; // rate % -> taxable amount
    for (const l of lines) {
      const rate = Number(l.tax_rate || l.gst_rate || (l.tax_amount > 0 && l.amount > 0 ? Math.round((l.tax_amount / l.amount) * 100) : 0));
      const taxAmt = Number(l.tax_amount || 0);
      if (taxAmt > 0) {
        map[rate] = (map[rate] || 0) + taxAmt;
      }
    }
    return Object.entries(map).map(([rateStr, totalTaxAmt]) => ({
      rate: Number(rateStr),
      amount: totalTaxAmt,
    }));
  }, [lines]);

  const totalQty = useMemo(() => lines.reduce((acc, l) => acc + Number(l.quantity || 0), 0), [lines]);
  const totalTax = useMemo(() => Number(invoice.total_tax || 0), [invoice.total_tax]);
  const subtotal = useMemo(() => (!hasGst && totalTax === 0 && Number(invoice.subtotal || 0) < Number(invoice.total || 0) ? Number(invoice.total) : Number(invoice.subtotal || invoice.total)), [invoice.subtotal, invoice.total, hasGst, totalTax]);
  const grandTotal = useMemo(() => Number(invoice.total || 0), [invoice.total]);

  const { line1: orgLine1, line2: orgLine2 } = splitCompanyNameIntoTwoLines(org?.name);
  const titleText = type === "estimate" ? "QUOTATION" : (type === "po" ? "PURCHASE ORDER" : (type === "bill" ? "PURCHASE INVOICE" : (hasGst ? "TAX INVOICE" : "INVOICE")));

  return (
    <div
      className="bg-white text-slate-800"
      style={{
        fontFamily: "'Inter', sans-serif, system-ui",
        fontSize: 12,
        lineHeight: 1.4,
        padding: "16px 22px",
        color: "#0f172a",
        boxSizing: "border-box",
      }}
    >
      {/* 1. Header Section */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        {/* Company Info Left */}
        <div style={{ flex: 1, paddingRight: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            {org?.template_show_logo !== false && org?.logo_url ? (
              <img src={org.logo_url} alt={org.name} style={{ maxHeight: 54, maxWidth: 180, objectFit: "contain" }} />
            ) : (
              <div style={{ width: 42, height: 42, background: primaryBlue, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, fontWeight: 900, fontSize: 22 }}>
                A
              </div>
            )}
            <div>
              <div style={{ fontSize: getAdaptiveCompanyNameStyle(org?.name).fontSize, fontWeight: 900, color: darkNavy, letterSpacing: -0.3, lineHeight: getAdaptiveCompanyNameStyle(org?.name).lineHeight }}>
                <div>{orgLine1}</div>
                {orgLine2 && <div>{orgLine2}</div>}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                {org?.tagline || "Your Tagline Goes Here"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 10, fontSize: 11, color: "#334155" }}>
            {addressLines.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <MapPin style={{ width: 13, height: 13, color: primaryBlue, flexShrink: 0 }} />
                <span>{addressLines.join(", ")}</span>
              </div>
            )}
            {org?.phone && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Phone style={{ width: 13, height: 13, color: primaryBlue, flexShrink: 0 }} />
                <span>{org.phone}</span>
              </div>
            )}
            {org?.email && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Mail style={{ width: 13, height: 13, color: primaryBlue, flexShrink: 0 }} />
                <span>{org.email}</span>
              </div>
            )}
            {org?.website && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Globe style={{ width: 13, height: 13, color: primaryBlue, flexShrink: 0 }} />
                <span>{org.website}</span>
              </div>
            )}
            {org?.gst_enabled && org?.gst_number && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, marginTop: 2 }}>
                <Building2 style={{ width: 13, height: 13, color: primaryBlue, flexShrink: 0 }} />
                <span>GSTIN: {org.gst_number}</span>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1.5, background: "#cbd5e1", margin: "0 16px" }} />

        {/* Invoice Meta Right */}
        <div style={{ width: 300, textAlign: "right" }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: darkNavy, letterSpacing: 0.5, textTransform: "uppercase" }}>
            {titleText}
          </div>
          <div style={{ height: 3.5, background: primaryBlue, width: "100%", marginTop: 4, marginBottom: 14, borderRadius: 2 }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 11 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
              <div style={{ background: lightBlueBg, color: primaryBlue, padding: 4, borderRadius: 4 }}>
                <FileText style={{ width: 14, height: 14 }} />
              </div>
              <span style={{ fontWeight: 700, width: 100, textAlign: "left" }}>{type === "estimate" ? "Quotation No." : (type === "po" ? "PO No." : "Invoice No.")}</span>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>: {number}</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
              <div style={{ background: lightBlueBg, color: primaryBlue, padding: 4, borderRadius: 4 }}>
                <Calendar style={{ width: 14, height: 14 }} />
              </div>
              <span style={{ fontWeight: 700, width: 100, textAlign: "left" }}>{type === "estimate" ? "Quotation Date" : (type === "po" ? "PO Date" : "Invoice Date")}</span>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>: {invoice.issue_date || invoice.bill_date || invoice.date || "-"}</span>
            </div>

            {(type === "invoice" || type === "bill") && invoice.due_date && !isRetailDoc && !(invoice.metadata as any)?.hide_due_date && (invoice.metadata as any)?.payment_terms !== 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                <div style={{ background: lightBlueBg, color: primaryBlue, padding: 4, borderRadius: 4 }}>
                  <Calendar style={{ width: 14, height: 14 }} />
                </div>
                <span style={{ fontWeight: 700, width: 100, textAlign: "left" }}>Due Date</span>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>: {invoice.due_date}</span>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
              <div style={{ background: lightBlueBg, color: primaryBlue, padding: 4, borderRadius: 4 }}>
                <MapPin style={{ width: 14, height: 14 }} />
              </div>
              <span style={{ fontWeight: 700, width: 100, textAlign: "left" }}>Place of Supply</span>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>: {placeOfSupply}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BILL TO Section */}
      <div style={{ border: `1px solid ${lightBorder}`, borderRadius: 6, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ background: lightBlueBg, borderBottom: `1px solid ${lightBorder}`, padding: "6px 12px", display: "flex", alignItems: "center", gap: 8, color: primaryBlue, fontWeight: 800, fontSize: 12 }}>
          <User style={{ width: 15, height: 15 }} />
          <span>BILL TO</span>
        </div>
        <div style={{ padding: "10px 14px", fontSize: 11, background: "#ffffff" }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: darkNavy, marginBottom: 2 }}>{clientName}</div>
          {billingAddressLines.map((line, idx) => (
            <div key={idx} style={{ color: "#475569" }}>{line}</div>
          ))}
          <div style={{ display: "flex", gap: 24, marginTop: 6, fontWeight: 600, color: "#1e293b" }}>
            {clientGst && <div>GSTIN : <span style={{ fontWeight: 700 }}>{clientGst}</span></div>}
            {clientPhone && <div>Mobile : <span style={{ fontWeight: 700 }}>{clientPhone}</span></div>}
            {referredBy && <div style={{ color: primaryBlue, fontWeight: 700 }}>{referredByLabel} : <span>{referredBy}</span></div>}
          </div>
        </div>
      </div>

      {/* 2.5 E-Invoice & E-Way Bill */}
      {type !== "po" && (invoice.irn || invoice.eway_bill_no) && (
        <div style={{ marginBottom: 20, padding: 14, border: "1px solid #cbd5e1", borderRadius: 6, background: "#f8fafc", display: "flex", gap: 24 }}>
          {/* E-Invoice / IRN Details */}
          {(invoice.irn || invoice.ack_no) && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: darkNavy, marginBottom: 8, textTransform: "uppercase" }}>E-Invoice Details</div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
                  {invoice.irn && <div><span style={{ color: "#64748b" }}>IRN:</span> <strong style={{ wordBreak: "break-all" }}>{invoice.irn}</strong></div>}
                  <div style={{ display: "flex", gap: 16 }}>
                    {invoice.ack_no && <div><span style={{ color: "#64748b" }}>Ack No:</span> <strong>{invoice.ack_no}</strong></div>}
                    {invoice.ack_date && <div><span style={{ color: "#64748b" }}>Ack Date:</span> <strong>{invoice.ack_date}</strong></div>}
                  </div>
                </div>
                {invoice.irn_qr && (
                  <div style={{ padding: 4, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 4 }}>
                    <QRCodeSVG value={invoice.irn_qr} size={56} />
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Divider */}
          {invoice.irn && invoice.eway_bill_no && <div style={{ width: 1, background: "#cbd5e1" }} />}
          
          {/* E-Way Bill Details */}
          {invoice.eway_bill_no && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: darkNavy, marginBottom: 8, textTransform: "uppercase" }}>E-Way Bill Details</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", fontSize: 11 }}>
                <div><span style={{ color: "#64748b" }}>E-Way Bill No:</span> <strong>{invoice.eway_bill_no}</strong></div>
                {invoice.eway_vehicle_no && <div><span style={{ color: "#64748b" }}>Vehicle No:</span> <strong>{invoice.eway_vehicle_no}</strong></div>}
                {invoice.eway_transport_mode && <div><span style={{ color: "#64748b" }}>Mode:</span> <strong>{invoice.eway_transport_mode}</strong></div>}
                {invoice.eway_distance_km && <div><span style={{ color: "#64748b" }}>Distance (Km):</span> <strong>{invoice.eway_distance_km}</strong></div>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Items Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, border: "1px solid #cbd5e1" }}>
        <thead>
          <tr style={{ background: primaryBlue, color: "#ffffff", fontSize: 11, fontWeight: 700 }}>
            <th style={{ padding: "8px 6px", textAlign: "center", width: 36, borderRight: "1px solid #2563eb" }}>#</th>
            <th style={{ padding: "8px 10px", textAlign: "left", borderRight: "1px solid #2563eb" }}>DESCRIPTION</th>
            {hasGst && <th style={{ padding: "8px 6px", textAlign: "center", width: 90, borderRight: "1px solid #2563eb" }}>HSN / SAC</th>}
            <th style={{ padding: "8px 6px", textAlign: "center", width: 50, borderRight: "1px solid #2563eb" }}>QTY</th>
            <th style={{ padding: "8px 10px", textAlign: "right", width: 90, borderRight: "none" }}>RATE (₹)</th>
            {hasGst && <th style={{ padding: "8px 6px", textAlign: "center", width: 70, borderRight: "1px solid #2563eb" }}>GST %</th>}
            {hasGst && <th style={{ padding: "8px 10px", textAlign: "right", width: 110, borderRight: "1px solid #2563eb" }}>GST AMOUNT (₹)</th>}
            <th style={{ padding: "8px 10px", textAlign: "right", width: 100 }}>SUBTOTAL (₹)</th>
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

            return (
              <tr key={line.id || idx} style={{ borderBottom: "1px solid #e2e8f0", background: idx % 2 === 1 ? "#f8fafc" : "#ffffff" }}>
                <td style={{ padding: "8px 6px", textAlign: "center", fontWeight: 600, borderRight: "1px solid #e2e8f0" }}>{idx + 1}</td>
                <td style={{ padding: "8px 10px", textAlign: "left", borderRight: "1px solid #e2e8f0" }}>
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{itemName}</div>
                  {itemDesc && <div style={{ fontSize: 10, color: "#64748b", marginTop: 2, whiteSpace: "pre-wrap" }}>{itemDesc}</div>}
                </td>
                {hasGst && <td style={{ padding: "8px 6px", textAlign: "center", borderRight: "1px solid #e2e8f0", color: "#475569" }}>{line.hsn_code || line.hsn || line.hsn_sac || line.item?.hsn_code || "-"}</td>}
                <td style={{ padding: "8px 6px", textAlign: "center", borderRight: "1px solid #e2e8f0", fontWeight: 600 }}>
                  <div>{qty} {line.unit && <span style={{ fontSize: 10, color: "#64748b" }}>{line.unit}</span>}</div>
                  {invoice?.show_sub_units !== false && line.sub_unit && line.sub_unit_conversion_rate && Number(line.sub_unit_conversion_rate) > 1 && line.unit?.toLowerCase() !== line.sub_unit?.toLowerCase() && (
                    <div style={{ fontSize: 9, color: "#64748b", fontWeight: 400, marginTop: 1 }}>
                      (= {(Number(line.quantity) * Number(line.sub_unit_conversion_rate)).toLocaleString("en-IN", { maximumFractionDigits: 2 })} {line.sub_unit})
                    </div>
                  )}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right", borderRight: hasGst ? "1px solid #e2e8f0" : "none" }}>
                  <div>{hasGst ? Number(line.rate).toFixed(2) : (Number(line.amount || 0) / (Number(line.quantity) || 1)).toFixed(2)}</div>
                  {Number(line.discount) > 0 && (
                    <div style={{ fontSize: 9, color: "#16a34a", fontWeight: 600, marginTop: 2 }}>
                      ({line.discount_type === "percentage" ? `${line.discount}% off` : `₹${Number(line.discount).toFixed(2)} off`})
                    </div>
                  )}
                </td>
                {hasGst && <td style={{ padding: "8px 6px", textAlign: "center", borderRight: "1px solid #e2e8f0" }}>{taxRate > 0 ? `${taxRate}%` : "-"}</td>}
                {hasGst && <td style={{ padding: "8px 10px", textAlign: "right", borderRight: "1px solid #e2e8f0" }}>{taxAmt > 0 ? taxAmt.toFixed(2) : "-"}</td>}
                <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>{lineTotal.toFixed(2)}</td>
              </tr>
            );
          })}
          {/* Summary Row */}
          <tr style={{ background: "#f1f5f9", fontWeight: 800, borderTop: "2px solid #cbd5e1" }}>
            <td colSpan={2} style={{ padding: "8px 10px", textAlign: "center", borderRight: "1px solid #cbd5e1" }}>TOTAL</td>
            <td style={{ padding: "8px 6px", textAlign: "center", borderRight: "1px solid #cbd5e1" }}>-</td>
            <td style={{ padding: "8px 6px", textAlign: "center", borderRight: "1px solid #cbd5e1" }}>{totalQty}</td>
            <td style={{ padding: "8px 10px", textAlign: "right", borderRight: hasGst ? "1px solid #cbd5e1" : "none" }}>
              {/* Sum of original rates (before discount) */}
              {lines.reduce((s: number, l: any) => s + (Number(l.quantity || 0) * (hasGst ? Number(l.rate || 0) : (Number(l.amount || 0) / (Number(l.quantity) || 1)))), 0).toFixed(2)}
            </td>
            {hasGst && <td style={{ padding: "8px 6px", textAlign: "center", borderRight: "1px solid #cbd5e1" }}>-</td>}
            {hasGst && <td style={{ padding: "8px 10px", textAlign: "right", borderRight: "1px solid #cbd5e1" }}>{totalTax.toFixed(2)}</td>}
            <td style={{ padding: "8px 10px", textAlign: "right", color: darkNavy, fontSize: 13 }}>{lines.reduce((s: number, l: any) => s + (Number(l.amount || 0) - (hasGst ? Number(l.tax_amount || 0) : 0)), 0).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      {/* 4. Middle Section: Notes & Tax Breakdown */}
      <div style={{ display: "flex", gap: 32, marginBottom: 24, alignItems: "flex-start" }}>
        {/* Left Side: Notes */}
        <div style={{ flex: 1 }}>
          {(invoice?.metadata?.show_notes !== false && invoice.notes && invoice.notes.trim()) ? (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: darkNavy, marginBottom: 4, textDecoration: "underline" }}>Notes:</div>
              <div style={{ fontSize: 11, color: "#334155", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                {invoice.notes.trim()}
              </div>
            </div>
          ) : null}
          <div style={{ textAlign: "left", marginTop: invoice.notes ? 20 : 12, color: primaryBlue, fontFamily: "serif", fontStyle: "italic", fontSize: 12, fontWeight: 600 }}>
            —— Thank you for your business! ——
          </div>
        </div>

        {/* Right Side: Totals & Tax Breakdown */}
        <div style={{ width: 330, fontSize: 11 }}>
          <InvoiceTotalsTable
            invoice={invoice}
            lines={lines}
            taxBreakdown={taxBreakdown}
            hasGst={hasGst}
            fmt={fmt}
            primaryColor={darkNavy}
            accentColor={primaryBlue}
            variant="corporate"
            showItemCount={true}
            type={type}
             isInterstate={isInterstate}
          />
        </div>
      </div>

      {/* 5. Footer Grid: Bank Details, Terms, QR & Signature */}
      {(() => {
        const showBank = invoice?.metadata?.show_bank_details !== false;
        const showTerms = !isRetailDoc && invoice?.metadata?.show_terms !== false;
        const invoiceBank = invoice?.bank_details;
        const isBankDisabled = !showBank || (invoiceBank && invoiceBank.enabled === false);
        const bankAccName = invoiceBank?.bank_account_name || (!isBankDisabled ? (org?.bank_account_name || org?.name) : null);
        const bankName = invoiceBank?.bank_name || (!isBankDisabled ? org?.bank_name : null);
        const bankAccNum = invoiceBank?.bank_account_number || (!isBankDisabled ? org?.bank_account_number : null);
        const bankIfsc = invoiceBank?.bank_ifsc || (!isBankDisabled ? org?.bank_ifsc : null);
        const bankBranch = invoiceBank?.bank_branch || (!isBankDisabled ? org?.bank_branch : null);
        const hasBankDetails = showBank && !isBankDisabled && Boolean(bankName || bankAccNum || bankIfsc);

        const termsContent = showTerms ? (invoice?.terms_conditions || invoice?.terms || invoice?.default_terms || org?.default_terms)?.trim() : "";
        const upiId = showBank ? (invoiceBank?.bank_upi_id || org?.upi_id) : "";
        const showQr = Boolean((showBank && upiId) || org?.qr_code_enabled);

        return (
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 20, paddingTop: 14, borderTop: "1.5px solid #cbd5e1", fontSize: 11 }}>
            {/* Bank Details */}
            {type !== "po" && hasBankDetails && (
              <div style={{ flex: "1 1 200px", minWidth: 180 }}>
                <div style={{ fontWeight: 800, color: darkNavy, display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                  <CreditCard style={{ width: 14, height: 14, color: primaryBlue }} />
                  <span>BANK DETAILS</span>
                </div>
                <div style={{ fontSize: 10, color: "#334155", display: "flex", flexDirection: "column", gap: 2 }}>
                  {bankAccName && <div>Account Name : <span style={{ fontWeight: 600 }}>{bankAccName}</span></div>}
                  {bankName && <div>Bank Name : <span style={{ fontWeight: 600 }}>{bankName}</span></div>}
                  {bankAccNum && <div>Account No. : <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{bankAccNum}</span></div>}
                  {bankIfsc && <div>IFSC Code : <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{bankIfsc}</span></div>}
                  {bankBranch && <div>Branch : <span style={{ fontWeight: 600 }}>{bankBranch}</span></div>}
                </div>
              </div>
            )}

            {/* Terms & Conditions */}
            {termsContent && (
              <div style={{ flex: "1 1 200px", minWidth: 180 }}>
                <div style={{ fontWeight: 800, color: darkNavy, display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                  <ShieldCheck style={{ width: 14, height: 14, color: primaryBlue }} />
                  <span>TERMS &amp; CONDITIONS</span>
                </div>
                <div style={{ fontSize: 10, color: "#334155", lineHeight: 1.4 }}>
                  <div style={{ whiteSpace: "pre-wrap" }}>{termsContent}</div>
                  <div style={{ textAlign: "center", marginTop: 8, fontStyle: "italic", color: primaryBlue, fontWeight: 600 }}>
                    —— Thank You! ——
                  </div>
                </div>
              </div>
            )}

            {/* Scan to Pay */}
            {type !== "po" && showQr && (
              <div style={{ textAlign: "center", flex: "0 0 110px" }}>
                <div style={{ fontWeight: 800, color: darkNavy, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 4 }}>
                  <QrCode style={{ width: 14, height: 14, color: primaryBlue }} />
                  <span>SCAN TO PAY</span>
                </div>
                <div style={{ display: "inline-block", background: "#ffffff", padding: 4, border: "1px solid #e2e8f0", borderRadius: 4 }}>
                  <QRCodeSVG
                    value={
                      upiId
                        ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(org?.name || "")}&am=${grandTotal.toFixed(2)}&cu=INR`
                        : (invoice?.id ? `${window.location.origin}/portal/invoice/${invoice.id}` : `${window.location.origin}/portal`)
                    }
                    size={64}
                    level="M"
                  />
                </div>
                {upiId && <div style={{ fontSize: 9, color: "#64748b", marginTop: 3 }}>UPI: {upiId}</div>}
              </div>
            )}

            {/* Authorized Signature */}
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "space-between", flex: "0 0 160px", marginLeft: "auto" }}>
              
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
              <div style={{ fontWeight: 800, color: darkNavy }}>AUTHORIZED SIGNATURE</div>
              <div style={{ margin: "8px 0 4px", minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {org?.signature_url ? (
                  <img src={org.signature_url} alt="Signature" style={{ maxHeight: 36, maxWidth: 140, margin: "0 auto" }} />
                ) : (
                  <div style={{ height: 28 }} />
                )}
              </div>
              <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: 3, fontSize: 10, color: "#64748b" }}>
                For, {org?.name || "Company Name"}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 6. Bottom Banner */}
      {(org?.email || org?.website || org?.phone) && (
        <div style={{ background: primaryBlue, color: "#ffffff", borderRadius: "0 0 4px 4px", marginTop: 14, padding: "6px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, fontWeight: 600 }}>
          {org?.email ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Mail style={{ width: 12, height: 12 }} />
              <span>{org.email}</span>
            </div>
          ) : <div />}
          {org?.website && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Globe style={{ width: 12, height: 12 }} />
              <span>{org.website}</span>
            </div>
          )}
          {org?.phone && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Phone style={{ width: 12, height: 12 }} />
              <span>{org.phone}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
