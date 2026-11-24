import React from "react";
import { resolveLineTaxRate } from "@/lib/invoiceCalculations";

interface PosCleanInvoiceTemplateProps {
  org: any;
  invoice: any;
  lines: any[];
  fmt: (n: number) => string;
  type?: "invoice" | "estimate" | "bill" | "po";
  taxBreakdown?: { name: string; amount: number; rate?: number }[];
  isInterstate?: boolean;
}

export function PosCleanInvoiceTemplate({
  org,
  invoice,
  lines,
  fmt,
  type = "invoice",
  taxBreakdown = [],
  isInterstate = false,
}: PosCleanInvoiceTemplateProps) {
  const rawBillToObj = invoice?.billing_address || (invoice?.clients as any)?.billing_address;
  const parsedBillTo = typeof rawBillToObj === "string" ? (() => { try { return JSON.parse(rawBillToObj); } catch { return null; } })() : rawBillToObj;

  const referredBy = (invoice?.metadata as any)?.referred_by;
  const referredByLabel = (invoice?.metadata as any)?.referred_by_label || "Referred By";
  const clientName = (invoice?.metadata as any)?.client_name || (parsedBillTo && typeof parsedBillTo === "object" ? parsedBillTo.name : null) || (invoice.clients as any)?.display_name || (invoice.clients as any)?.company_name || invoice.client_name || "Walk-in Customer";
  const clientPhone = (invoice?.metadata as any)?.client_mobile || (invoice?.metadata as any)?.customer_phone || (invoice?.metadata as any)?.phone || (parsedBillTo && typeof parsedBillTo === "object" ? (parsedBillTo.phone || parsedBillTo.mobile) : null) || (invoice.clients as any)?.phone || invoice.client_phone || invoice.customer_phone || "";

  const number = type === "estimate" ? invoice.estimate_number : (type === "po" ? invoice.po_number : (type === "bill" ? invoice.bill_number : invoice.invoice_number));
  const typeLabel = type === "estimate" ? "Estimate" : (type === "po" ? "PO" : (type === "bill" ? "Bill" : "Invoice"));

  const addressLines: string[] = [];
  if (org?.address) {
    try {
      const a = typeof org.address === "string" ? JSON.parse(org.address) : org.address;
      if (a?.street) addressLines.push(a.street);
      const cityLine = [a?.city, a?.state, a?.zip].filter(Boolean).join(", ");
      if (cityLine) addressLines.push(cityLine);
    } catch {}
  }
  const orgAddressStr = addressLines.length > 0 ? addressLines.join(", ") : (org?.city ? `${org.city}, ${org?.state || ""}` : "");

  // Totals & Quantities
  const totalQty = lines.reduce((acc, l) => acc + Number(l.quantity || 1), 0);
  const subtotal = Number(invoice.subtotal ?? lines.reduce((acc, l) => acc + (Number(l.quantity || 1) * Number(l.rate || 0)), 0));
  const grandTotal = Number(invoice.total ?? subtotal);

  // Format Date & Time
  const invoiceDate = invoice.issue_date || invoice.created_at;
  const dt = invoiceDate ? new Date(invoiceDate) : new Date();
  const dateStr = !isNaN(dt.getTime())
    ? `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getFullYear()).slice(-2)} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`
    : "02/11/26 04:13";

  // Payment mode
  const paymentMode = (invoice?.metadata as any)?.payment_mode || invoice.payment_mode || "Cash";

  // Compute CGST / SGST (half of GST if not interstate)
  const totalTax = Number(invoice.tax_total ?? invoice.total_tax ?? 0);
  const halfTax = totalTax / 2;

  // Determine tax rates
  let cgstRate = 0;
  let sgstRate = 0;
  let igstRate = 0;

  if (taxBreakdown && taxBreakdown.length > 0) {
    const cgstItem = taxBreakdown.find((t) => t.name && t.name.toLowerCase().includes("cgst"));
    const sgstItem = taxBreakdown.find((t) => t.name && t.name.toLowerCase().includes("sgst"));
    const igstItem = taxBreakdown.find((t) => t.name && t.name.toLowerCase().includes("igst"));

    if (cgstItem?.rate) cgstRate = cgstItem.rate;
    if (sgstItem?.rate) sgstRate = sgstItem.rate;
    if (igstItem?.rate) igstRate = igstItem.rate;

    if (!cgstRate && !sgstRate && !igstRate) {
      const firstWithRate = taxBreakdown.find((t) => (t.rate || 0) > 0);
      if (firstWithRate?.rate) {
        if (isInterstate) {
          igstRate = firstWithRate.rate;
        } else {
          cgstRate = firstWithRate.rate / 2;
          sgstRate = firstWithRate.rate / 2;
        }
      }
    }
  }

  // Also check lines if rates not yet found
  if (!cgstRate && !sgstRate && !igstRate && lines && lines.length > 0) {
    const lineWithTax = lines.find((l) => (l.tax_rates && l.tax_rates.rate) || l.tax_rate);
    const fullRate = Number(lineWithTax?.tax_rates?.rate || lineWithTax?.tax_rate || 0);
    if (fullRate > 0) {
      if (isInterstate) {
        igstRate = fullRate;
      } else {
        cgstRate = fullRate / 2;
        sgstRate = fullRate / 2;
      }
    }
  }

  // Fallback calculation from totalTax and subtotal if rates still 0
  if (totalTax > 0 && subtotal > 0 && (!cgstRate && !sgstRate && !igstRate)) {
    const totalRate = (totalTax / subtotal) * 100;
    if (isInterstate) {
      igstRate = Math.round(totalRate * 10) / 10;
    } else {
      const half = Math.round((totalRate / 2) * 10) / 10;
      cgstRate = half;
      sgstRate = half;
    }
  }

  const formatTaxRate = (r: number) => {
    if (!r) return "";
    return r % 1 === 0 ? `${r}%` : `${r.toFixed(1)}%`;
  };

  // Collect genuine custom fields if added by user
  const customFields: { name: string; value: string }[] = [];
  if (Array.isArray(invoice?.custom_field_values)) {
    invoice.custom_field_values.forEach((cf: any) => {
      const name = cf.custom_field_definitions?.field_name || cf.name || cf.field_name;
      const val = cf.value || cf.field_value;
      if (val && String(val).trim()) {
        customFields.push({ name: String(name || "Custom"), value: String(val).trim() });
      }
    });
  } else if (Array.isArray((invoice?.metadata as any)?.custom_fields)) {
    (invoice.metadata as any).custom_fields.forEach((cf: any) => {
      const name = cf.name || cf.field_name || cf.key;
      const val = cf.value;
      if (val && String(val).trim()) {
        customFields.push({ name: String(name || "Custom"), value: String(val).trim() });
      }
    });
  }

  return (
    <div
      className="invoice-printable bg-white text-black shadow-sm mx-auto"
      style={{
        maxWidth: "80mm",
        width: "100%",
        padding: "10px 12px",
        boxSizing: "border-box",
        fontSize: "12px",
        lineHeight: 1.4,
        color: "#000000",
        fontFamily: '"SF Mono", "Segoe UI Mono", "Roboto Mono", "Courier New", Courier, monospace',
      }}
    >
      {/* ── HEADER ── */}
      <div className="text-center pb-2">
        <h1 className="text-base font-black uppercase tracking-normal text-black">
          {org?.name || "Company Name"}
        </h1>
        {orgAddressStr && (
          <div className="text-[11px] font-medium mt-0.5">
            Address : {orgAddressStr}
          </div>
        )}
        {org?.phone && (
          <div className="text-[11px] font-medium">
            Phone No. : {org.phone}
          </div>
        )}
        {org?.gst_number && (
          <div className="text-[11px] font-bold mt-0.5">
            GSTIN : {org.gst_number}
          </div>
        )}
      </div>

      {/* ── DIVIDER THICK ── */}
      <div className="border-t-2 border-black my-1.5"></div>

      {/* ── CUSTOMER NAME & PHONE (ONE LINE) ── */}
      <div className="flex justify-between items-baseline text-[11px] font-bold py-1.5 overflow-visible" style={{ minHeight: "24px" }}>
        <div className="whitespace-nowrap overflow-visible pr-2" style={{ lineHeight: "1.6" }}>
          Name : <span className="font-normal">{clientName}</span>
        </div>
        {clientPhone && (
          <div className="shrink-0 text-right whitespace-nowrap overflow-visible" style={{ lineHeight: "1.6" }}>
            Phone No. : <span className="font-normal">{clientPhone}</span>
          </div>
        )}
      </div>
      {referredBy && (
        <div className="flex justify-between items-baseline text-[10.5px] font-bold pb-1 overflow-visible">
          <div className="whitespace-nowrap overflow-visible pr-2" style={{ lineHeight: "1.5" }}>
            {referredByLabel} : <span className="font-semibold">{referredBy}</span>
          </div>
        </div>
      )}

      {/* ── DIVIDER ── */}
      <div className="border-t border-black my-1.5"></div>

      {/* ── DATE & INVOICE NO ROW (ONE LINE) ── */}
      <div className="flex justify-between items-center text-[11px] pt-0.5 pb-0.5 whitespace-nowrap overflow-visible leading-normal">
        <div>
          Date : <span className="font-semibold">{dateStr}</span>
        </div>
        <div className="text-right pl-1">
          {typeLabel} No. : <span className="font-bold">{number}</span>
        </div>
      </div>

      {/* ── CUSTOM FIELDS (ONLY IF ACTUALLY ADDED BY USER) ── */}
      {customFields.length > 0 && (
        <div className="space-y-0.5 text-[10.5px] py-0.5">
          {customFields.map((cf, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <span>{cf.name} :</span>
              <span className="font-medium">{cf.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── DIVIDER THICK ── */}
      <div className="border-t-2 border-black my-1.5"></div>

      {/* ── TABLE HEADER ── */}
      <div className="flex justify-between items-center font-bold text-[11px] pb-1.5 border-b border-black">
        <span className="w-[44%] text-left">Item</span>
        <span className="w-[16%] text-center">Qty.</span>
        <span className="w-[20%] text-right">Price</span>
        <span className="w-[20%] text-right">Amount</span>
      </div>

      {/* ── ITEMS LIST ── */}
      <div className="pt-2 pb-1 space-y-1.5 text-[11px]">
        {lines.map((line, idx) => {
          const itemName = line.name || line.items?.name || line.item?.name || line.item_name || (line.description ? String(line.description).split("\n")[0] : "") || `Item ${idx + 1}`;
          const qty = Number(line.quantity || 1);
          const rate = Number(line.rate || 0);
          const amount = Number(line.line_total || (qty * rate));

          return (
            <div key={line.id || idx} className="flex justify-between items-start leading-snug">
              <div className="w-[44%] text-left font-medium break-words pr-1">
                <div>{itemName}</div>
                {line.batch_no && (
                  <div className="text-[9.5px] text-zinc-600 font-normal">
                    Batch: {line.batch_no}
                  </div>
                )}
              </div>
              <span className="w-[16%] text-center font-medium">{qty}</span>
              <span className="w-[20%] text-right font-medium">
                {rate.toFixed(2)}
              </span>
              <span className="w-[20%] text-right font-bold">
                {amount.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── DIVIDER THICK ── */}
      <div className="border-t-2 border-black my-1.5"></div>

      {/* ── TOTALS & TAX ── */}
      <div className="flex justify-between items-start text-[11px] py-1">
        {/* Left: Total Qty & Payment Method */}
        <div className="space-y-1.5">
          <div className="font-bold">
            Total Qty : <span className="font-black text-xs">{totalQty}</span>
          </div>
          <div className="font-medium text-[10.5px]">
            Paid via {paymentMode.toUpperCase()}
          </div>
        </div>

        {/* Right: Subtotal & GST Breakup */}
        <div className="text-right space-y-0.5 min-w-[130px]">
          <div className="flex justify-between">
            <span>Sub Total</span>
            <span className="font-semibold">{subtotal.toFixed(2)}</span>
          </div>
          {totalTax > 0 && !isInterstate ? (
            <>
              <div className="flex justify-between text-[10.5px]">
                <span>CGST {cgstRate > 0 ? `(${formatTaxRate(cgstRate)})` : ""}</span>
                <span>{halfTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10.5px]">
                <span>SGST {sgstRate > 0 ? `(${formatTaxRate(sgstRate)})` : ""}</span>
                <span>{halfTax.toFixed(2)}</span>
              </div>
            </>
          ) : totalTax > 0 ? (
            <div className="flex justify-between text-[10.5px]">
              <span>IGST {igstRate > 0 ? `(${formatTaxRate(igstRate)})` : ""}</span>
              <span>{totalTax.toFixed(2)}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── DIVIDER THICK ── */}
      <div className="border-t-2 border-black my-1.5"></div>

      {/* ── GRAND TOTAL ── */}
      <div className="py-1 text-center font-black text-sm tracking-wide">
        Grand Total ₹ {grandTotal.toFixed(2)}
      </div>

      {/* ── NOTES / TERMS IF PRESENT AND ENABLED ── */}
      {Boolean(invoice?.notes && ((invoice?.metadata as any)?.show_notes !== false)) && (
        <div className="text-[10px] pt-1 border-t border-black/40 mt-1">
          <span className="font-bold">Note: </span>
          <span>{invoice.notes}</span>
        </div>
      )}

      {Boolean((invoice?.terms_conditions || invoice?.terms) && ((invoice?.metadata as any)?.show_terms !== false)) && (
        <div className="text-[9.5px] pt-1 text-zinc-700 leading-tight">
          <span className="font-bold text-black">*TERMS &amp; CONDITIONS*</span>
          <div className="whitespace-pre-line mt-0.5">{invoice.terms_conditions || invoice.terms}</div>
        </div>
      )}

      <div className="border-t border-black my-1"></div>
      <div className="text-center text-[10px] text-zinc-600 mt-1">
        Thank you for shopping with us!
      </div>
    </div>
  );
}
