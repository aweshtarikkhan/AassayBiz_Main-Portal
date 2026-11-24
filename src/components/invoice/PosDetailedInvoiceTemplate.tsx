import React from "react";
import { resolveLineTaxRate } from "@/lib/invoiceCalculations";

interface PosDetailedInvoiceTemplateProps {
  org: any;
  invoice: any;
  lines: any[];
  fmt: (n: number) => string;
  type?: "invoice" | "estimate" | "bill" | "po";
  taxBreakdown?: { name: string; amount: number; rate?: number }[];
  isInterstate?: boolean;
}

export function PosDetailedInvoiceTemplate({
  org,
  invoice,
  lines,
  fmt,
  type = "invoice",
  taxBreakdown = [],
  isInterstate = false,
}: PosDetailedInvoiceTemplateProps) {
  const rawBillToObj = invoice?.billing_address || (invoice?.clients as any)?.billing_address;
  const parsedBillTo = typeof rawBillToObj === "string" ? (() => { try { return JSON.parse(rawBillToObj); } catch { return null; } })() : rawBillToObj;

  const referredBy = (invoice?.metadata as any)?.referred_by;
  const referredByLabel = (invoice?.metadata as any)?.referred_by_label || "Referred By";
  const clientName = (invoice?.metadata as any)?.client_name || (parsedBillTo && typeof parsedBillTo === "object" ? parsedBillTo.name : null) || (invoice.clients as any)?.display_name || (invoice.clients as any)?.company_name || invoice.client_name || "Walk-in Customer";
  const clientPhone = (invoice?.metadata as any)?.client_mobile || (parsedBillTo && typeof parsedBillTo === "object" ? parsedBillTo.phone : null) || (invoice.clients as any)?.phone || invoice.client_phone || "-";
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
  const discountTotal = Number(invoice.total_discount ?? invoice.discount_amount ?? 0);
  const totalTax = Number(invoice.tax_total ?? invoice.total_tax ?? 0);
  const rawGrandTotal = Number(invoice.total ?? (subtotal - discountTotal + totalTax));
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOff = roundedGrandTotal - rawGrandTotal;
  const amountPaid = Number(invoice.amount_paid ?? roundedGrandTotal);

  // Format Date
  const invoiceDate = invoice.issue_date || invoice.created_at;
  const dt = invoiceDate ? new Date(invoiceDate) : new Date();
  const dateStr = !isNaN(dt.getTime())
    ? `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`
    : "02/11/2026";

  // Build GST Summary Rows
  const gstRows: { desc: string; taxable: number; cgst: number; sgst: number; cess: number }[] = [];
  if (taxBreakdown && taxBreakdown.length > 0) {
    taxBreakdown.forEach((t) => {
      const rate = t.rate || 18;
      const taxAmt = t.amount || 0;
      const taxable = rate > 0 ? (taxAmt / (rate / 100)) : subtotal;
      gstRows.push({
        desc: `${rate}% GST`,
        taxable: Math.round(taxable * 100) / 100,
        cgst: Math.round((taxAmt / 2) * 100) / 100,
        sgst: Math.round((taxAmt / 2) * 100) / 100,
        cess: 0,
      });
    });
  } else if (totalTax > 0) {
    gstRows.push({
      desc: "GST",
      taxable: subtotal,
      cgst: Math.round((totalTax / 2) * 100) / 100,
      sgst: Math.round((totalTax / 2) * 100) / 100,
      cess: 0,
    });
  }

  return (
    <div
      className="invoice-printable bg-white text-black font-sans shadow-sm mx-auto"
      style={{
        maxWidth: "80mm",
        width: "100%",
        padding: "10px 12px",
        boxSizing: "border-box",
        fontSize: "11px",
        lineHeight: 1.35,
        color: "#000000",
      }}
    >
      {/* ── HEADER ── */}
      <div className="text-center pb-1">
        <h1 className="text-base font-black uppercase tracking-tight text-black">
          {org?.name || "Company Name"}
        </h1>
        {orgAddressStr && (
          <div className="text-[10.5px] mt-0.5">
            Address : {orgAddressStr}
          </div>
        )}
        {org?.phone && (
          <div className="text-[10.5px]">
            Phone No. : {org.phone}
          </div>
        )}
        {org?.gst_number && (
          <div className="text-[10.5px] font-bold mt-0.5">
            GSTIN : {org.gst_number}
          </div>
        )}
      </div>

      {/* ── DIVIDER ── */}
      <div className="border-t border-black my-1"></div>

      {/* ── TITLE: TAX INVOICE ── */}
      <div className="text-center font-black text-sm uppercase tracking-wide py-0.5">
        Tax Invoice
      </div>

      {/* ── DIVIDER ── */}
      <div className="border-t border-black my-1"></div>

      {/* ── INVOICE META ── */}
      <div className="space-y-0.5 text-[10.5px]">
        <div className="flex justify-between">
          <span>Invoice No. :</span>
          <span className="font-bold">{number}</span>
        </div>
        <div className="flex justify-between">
          <span>Date :</span>
          <span>{dateStr}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax Invoice No. :</span>
          <span>{number}</span>
        </div>
      </div>

      {/* ── DIVIDER ── */}
      <div className="border-t border-black my-1"></div>

      {/* ── CUSTOMER INFO ── */}
      <div className="space-y-0.5 text-[10.5px]">
        <div className="flex justify-between">
          <span>Customer Name :</span>
          <span className="font-semibold truncate max-w-[150px]">{clientName}</span>
        </div>
        <div className="flex justify-between">
          <span>Customer Mobile :</span>
          <span>{clientPhone}</span>
        </div>
        {referredBy && (
          <div className="flex justify-between">
            <span>{referredByLabel} :</span>
            <span className="font-semibold truncate max-w-[150px]">{referredBy}</span>
          </div>
        )}
      </div>

      {/* ── DIVIDER ── */}
      <div className="border-t border-black my-1"></div>

      {/* ── PRODUCT TABLE HEADER ── */}
      <div className="font-bold text-[10px] py-1">
        <div className="flex justify-between items-center">
          <span className="w-[8%] text-left">Sl.</span>
          <span className="w-[38%] text-left">Product</span>
          <span className="w-[12%] text-center">Qty</span>
          <span className="w-[14%] text-right">Rate</span>
          <span className="w-[12%] text-center">Disc.</span>
          <span className="w-[16%] text-right">Amount</span>
        </div>
        <div className="flex justify-between items-center text-[9px] text-zinc-600 mt-0.5">
          <span className="w-[8%]"></span>
          <span className="w-[45%] text-left">HSN Code</span>
          <span className="w-[47%] text-right">Salesman No.</span>
        </div>
      </div>

      {/* ── DIVIDER ── */}
      <div className="border-t border-black my-1"></div>

      {/* ── PRODUCT ROWS ── */}
      <div className="space-y-1.5 py-1 text-[10.5px]">
        {lines.map((line, idx) => {
          const itemName = line.name || line.items?.name || line.item?.name || line.item_name || (line.description ? String(line.description).split("\n")[0] : "") || `Product ${idx + 1}`;
          const qty = Number(line.quantity || 1);
          const rate = Number(line.rate || 0);
          const disc = Number(line.discount_amount || 0);
          const amount = Number(line.line_total || (qty * rate - disc));

          return (
            <div key={line.id || idx}>
              <div className="flex justify-between items-start">
                <span className="w-[8%] text-left text-zinc-700">{idx + 1}.</span>
                <span className="w-[38%] text-left font-semibold">
                  <div>{itemName}</div>
                  {line.batch_no && (
                    <div className="text-[8.5px] text-zinc-600 font-normal">Batch: {line.batch_no}</div>
                  )}
                </span>
                <span className="w-[12%] text-center">{qty}</span>
                <span className="w-[14%] text-right">{rate.toFixed(2)}</span>
                <span className="w-[12%] text-center">{disc > 0 ? disc.toFixed(0) : "-"}</span>
                <span className="w-[16%] text-right font-bold">{amount.toFixed(2)}</span>
              </div>
              {line.hsn_code && (
                <div className="text-[9px] text-zinc-500 pl-4">
                  HSN: {line.hsn_code}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── DIVIDER ── */}
      <div className="border-t border-black my-1"></div>

      {/* ── TOTALS ── */}
      <div className="space-y-1 text-[10.5px] py-1">
        <div className="flex justify-between">
          <span>Total :</span>
          <span className="font-semibold">{totalQty} Item(s)</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Rs :</span>
          <span>{subtotal.toFixed(2)}</span>
        </div>
      </div>

      {/* ── DIVIDER ── */}
      <div className="border-t border-black my-1"></div>

      {/* ── CASH / PAYMENT ── */}
      <div className="flex justify-between text-[10.5px] py-0.5">
        <span>Cash :</span>
        <span className="font-semibold">{amountPaid.toFixed(2)}</span>
      </div>

      {/* ── DIVIDER ── */}
      <div className="border-t border-black my-1"></div>

      {/* ── SALE SUMMARY & NET PAYABLE ── */}
      <div className="space-y-0.5 text-[10.5px] py-1">
        <div className="flex justify-between">
          <span>Total Sale :</span>
          <span>{rawGrandTotal.toFixed(2)}</span>
        </div>
        {roundOff !== 0 && (
          <div className="flex justify-between text-[10px] text-zinc-600">
            <span>Round Off :</span>
            <span>{roundOff > 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-black text-xs pt-1 border-t border-black">
          <span>Net Payable :</span>
          <span>{roundedGrandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* ── GST SUMMARY BOX TABLE ── */}
      {gstRows.length > 0 && (
        <div className="my-2 border border-black">
          <div className="font-bold text-[9.5px] bg-zinc-100 p-1 border-b border-black text-center">
            GST Summary
          </div>
          <table className="w-full text-[9px] border-collapse text-center">
            <thead>
              <tr className="border-b border-black font-semibold">
                <th className="py-0.5 px-1 border-r border-black">Description</th>
                <th className="py-0.5 px-1 border-r border-black">Taxable</th>
                <th className="py-0.5 px-1 border-r border-black">CGST</th>
                <th className="py-0.5 px-1 border-r border-black">SGST</th>
                <th className="py-0.5 px-1">ESS</th>
              </tr>
            </thead>
            <tbody>
              {gstRows.map((g, gi) => (
                <tr key={gi} className="border-b border-black last:border-0">
                  <td className="py-0.5 px-1 border-r border-black">{g.desc}</td>
                  <td className="py-0.5 px-1 border-r border-black">{g.taxable.toFixed(2)}</td>
                  <td className="py-0.5 px-1 border-r border-black">{g.cgst.toFixed(2)}</td>
                  <td className="py-0.5 px-1 border-r border-black">{g.sgst.toFixed(2)}</td>
                  <td className="py-0.5 px-1">{g.cess.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TERMS & CONDITIONS ── */}
      <div className="border-t border-black pt-1 my-1 text-[9.5px]">
        <div className="font-bold mb-0.5">*TERMS &amp; CONDITIONS*</div>
        <div className="space-y-0.5 text-zinc-700">
          <div>• Goods once sold will not be taken back.</div>
          <div>• Subject to local jurisdiction.</div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="border-t border-black my-1.5"></div>
      <div className="text-center font-bold text-[11px] py-1">
        Thank You Please Visit Again
      </div>
    </div>
  );
}
