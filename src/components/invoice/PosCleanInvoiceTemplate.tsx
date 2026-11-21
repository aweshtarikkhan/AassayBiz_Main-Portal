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

  const clientName = (invoice?.metadata as any)?.client_name || (parsedBillTo && typeof parsedBillTo === "object" ? parsedBillTo.name : null) || (invoice.clients as any)?.display_name || (invoice.clients as any)?.company_name || invoice.client_name || "Walk-in Customer";
  const number = type === "estimate" ? invoice.estimate_number : (type === "po" ? invoice.po_number : (type === "bill" ? invoice.bill_number : invoice.invoice_number));

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
  const paymentMode = (invoice?.metadata as any)?.payment_mode || invoice.payment_mode || "UPI";

  // Compute CGST / SGST (half of GST if not interstate)
  const totalTax = Number(invoice.tax_total ?? invoice.total_tax ?? 0);
  const halfTax = totalTax / 2;

  return (
    <div
      className="invoice-printable bg-white text-black font-mono shadow-sm mx-auto"
      style={{
        maxWidth: "80mm",
        width: "100%",
        padding: "10px 12px",
        boxSizing: "border-box",
        fontSize: "12px",
        lineHeight: 1.35,
        color: "#000000",
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
      <div className="border-t-2 border-black my-1"></div>

      {/* ── CUSTOMER NAME ── */}
      <div className="text-[12px] font-bold py-1">
        Name : <span className="font-normal">{clientName}</span>
      </div>

      {/* ── DIVIDER THICK ── */}
      <div className="border-t border-black my-1"></div>

      {/* ── DATE & BILL NO ROW ── */}
      <div className="grid grid-cols-2 gap-1 text-[11px] py-0.5">
        <div>
          Date : <span className="font-semibold">{dateStr}</span>
        </div>
        <div className="text-right">
          Bill No. : <span className="font-bold">{number}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 text-[11px] pb-1">
        <div className="truncate">
          Custome : <span className="font-medium">{clientName.split(" ")[0]}</span>
        </div>
        <div className="text-right">
          Custom : <span className="font-medium">Retail</span>
        </div>
      </div>

      {/* ── DIVIDER THICK ── */}
      <div className="border-t-2 border-black my-1"></div>

      {/* ── TABLE HEADER ── */}
      <div className="flex justify-between items-center font-bold text-[11px] py-1 border-b border-black">
        <span className="w-[44%] text-left">Item</span>
        <span className="w-[16%] text-center">Qty.</span>
        <span className="w-[20%] text-right">Price</span>
        <span className="w-[20%] text-right">Amount</span>
      </div>

      {/* ── ITEMS LIST ── */}
      <div className="py-1 space-y-1 text-[11px]">
        {lines.map((line, idx) => {
          const qty = Number(line.quantity || 1);
          const rate = Number(line.rate || 0);
          const amount = Number(line.line_total || (qty * rate));

          return (
            <div key={line.id || idx} className="flex justify-between items-start">
              <span className="w-[44%] text-left font-medium truncate">
                {line.item_name || (line as any).description || `Item ${idx + 1}`}
              </span>
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
      <div className="border-t-2 border-black my-1"></div>

      {/* ── TOTALS & TAX ── */}
      <div className="flex justify-between items-start text-[11px] py-1">
        {/* Left: Total Qty & Payment Method */}
        <div className="space-y-2">
          <div className="font-bold">
            Total Qty : <span className="font-black text-xs">{totalQty}</span>
          </div>
          <div className="font-medium text-[11px]">
            Paid via {paymentMode.toUpperCase()}
          </div>
        </div>

        {/* Right: Subtotal & GST Breakup */}
        <div className="text-right space-y-0.5 min-w-[120px]">
          <div className="flex justify-between">
            <span>Sub Total</span>
            <span className="font-semibold">{subtotal.toFixed(2)}</span>
          </div>
          {totalTax > 0 && !isInterstate ? (
            <>
              <div className="flex justify-between text-[10.5px]">
                <span>CGST</span>
                <span>{halfTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10.5px]">
                <span>SGST</span>
                <span>{halfTax.toFixed(2)}</span>
              </div>
            </>
          ) : totalTax > 0 ? (
            <div className="flex justify-between text-[10.5px]">
              <span>IGST</span>
              <span>{totalTax.toFixed(2)}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── DIVIDER THICK ── */}
      <div className="border-t-2 border-black my-1"></div>

      {/* ── GRAND TOTAL ── */}
      <div className="py-1 text-center font-black text-sm tracking-wide">
        Grand Total ₹ {grandTotal.toFixed(2)}
      </div>

      <div className="border-t border-black my-1"></div>
      <div className="text-center text-[10px] text-zinc-600 mt-1">
        Thank you for shopping with us!
      </div>
    </div>
  );
}
