import React from "react";
import { resolveLineTaxRate } from "@/lib/invoiceCalculations";

interface IndustryA6MonochromeInvoiceTemplateProps {
  org: any;
  invoice: any;
  lines: any[];
  fmt: (n: number) => string;
  type?: "invoice" | "estimate" | "bill" | "po";
  taxBreakdown?: { name: string; amount: number; rate?: number }[];
  isInterstate?: boolean;
  showSignature?: boolean;
}

export function IndustryA6MonochromeInvoiceTemplate({
  org,
  invoice,
  lines,
  fmt,
  type = "invoice",
  taxBreakdown = [],
  isInterstate = false,
  showSignature = true,
}: IndustryA6MonochromeInvoiceTemplateProps) {
  const snapshot = (invoice?.metadata as any) || {};
  const hasGst = snapshot.has_gst !== undefined
    ? Boolean(snapshot.has_gst)
    : Boolean((org?.gst_number || org?.tax_number)?.trim() && org?.gst_enabled !== false);

  const rawBillToObj = invoice?.billing_address || (invoice?.clients as any)?.billing_address;
  const parsedBillTo = typeof rawBillToObj === "string" ? (() => { try { return JSON.parse(rawBillToObj); } catch { return null; } })() : rawBillToObj;

  const rawClientName = (invoice?.metadata as any)?.client_name || (parsedBillTo && typeof parsedBillTo === "object" ? parsedBillTo.name : null) || (invoice.clients as any)?.display_name || (invoice.clients as any)?.company_name || (invoice.vendors as any)?.name || (invoice as any)?.client_name || "";
  const clientName = (rawClientName === "Walk-in Customer") ? "" : rawClientName;

  const clientAddress = (parsedBillTo && typeof parsedBillTo === "object" ? [parsedBillTo.street, parsedBillTo.city, parsedBillTo.state, parsedBillTo.zip].filter(Boolean).join(", ") : null) || (invoice.clients as any)?.address || "";
  const clientCity = (parsedBillTo && typeof parsedBillTo === "object" ? parsedBillTo.city : null) || (invoice.clients as any)?.city || "";
  const clientState = (parsedBillTo && typeof parsedBillTo === "object" ? parsedBillTo.state : null) || (invoice.clients as any)?.state || "";
  const clientGstin = (invoice.clients as any)?.gstin || (invoice.clients as any)?.tax_number || (invoice as any)?.client_gstin || "";

  const referredBy = (invoice?.metadata as any)?.referred_by;
  const referredByLabel = (invoice?.metadata as any)?.referred_by_label || "Referred By";
  const showNotes = (invoice?.metadata as any)?.show_notes !== false;
  const notesText = (invoice.notes || (invoice?.metadata as any)?.notes || "")?.trim();
  const ewayBillNo = (invoice as any)?.eway_bill_no || (invoice?.metadata as any)?.eway_bill_no;
  const ewayVehicleNo = (invoice as any)?.eway_vehicle_no || (invoice?.metadata as any)?.eway_vehicle_no;

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
  const orgAddressStr = addressLines.length > 0 ? addressLines.join(", ") : (org?.city ? `${org.city}, ${org?.state || ""}` : "123, Business Park, Main Road");

  // Totals
  const subtotal = Number(invoice.subtotal ?? lines.reduce((acc, l) => acc + (Number(l.quantity || 1) * Number(l.rate || 0)), 0));
  const discountTotal = Number(invoice.total_discount ?? invoice.discount_amount ?? 0);
  const taxTotal = Number(invoice.tax_total ?? invoice.total_tax ?? 0);
  const grandTotal = Number(invoice.total ?? (subtotal - discountTotal + taxTotal));

  const titleText = type === "estimate" ? "QUOTATION" : type === "po" ? "PURCHASE ORDER" : type === "bill" ? "PURCHASE INVOICE" : (hasGst ? "TAX INVOICE" : "INVOICE");

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return d;
    }
  };

  const invoiceDate = formatDate(invoice.issue_date || invoice.created_at || new Date().toISOString());
  const dueDate = formatDate(invoice.due_date);

  // Bank Info
  let bankName = org?.bank_name || org?.template_bank_name || "";
  let accNo = org?.bank_account_no || org?.bank_acc_number || org?.template_bank_account_no || "";
  let ifsc = org?.bank_ifsc || org?.template_bank_ifsc || "";

  if (org?.bank_details) {
    try {
      const parsed = typeof org.bank_details === "string" ? JSON.parse(org.bank_details) : org.bank_details;
      bankName = parsed.bank_name || bankName;
      accNo = parsed.account_no || parsed.acc_no || accNo;
      ifsc = parsed.ifsc || ifsc;
    } catch {}
  }

  // Tax calculations
  const effectiveIsInterstate = isInterstate || (invoice.clients as any)?.is_interstate;
  const avgRate = lines.length > 0 ? lines[0]?.tax_rate || 18 : 18;
  const cgstAmount = !effectiveIsInterstate ? taxTotal / 2 : 0;
  const sgstAmount = !effectiveIsInterstate ? taxTotal / 2 : 0;
  const igstAmount = effectiveIsInterstate ? taxTotal : 0;

  return (
    <div className="w-full max-w-[105mm] mx-auto bg-white text-black p-3 font-sans text-[8px] leading-tight select-none border border-black shadow-sm print:border-none print:shadow-none print:p-0">
      {/* Top Header */}
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="flex-1">
          <div className="inline-block bg-black text-white text-[9px] font-black tracking-widest px-3 py-1 rounded-full uppercase mb-1.5">
            {titleText}
          </div>
          <div className="text-[7.5px] leading-snug text-neutral-800">
            <span className="font-bold text-black block">From:</span>
            <span className="font-black text-[9.5px] text-black uppercase tracking-tight block">{org?.name || "Business Name"}</span>
            <div className="text-neutral-700">{orgAddressStr}</div>
            {(org?.phone || org?.mobile) && <div>+91 {org.phone || org.mobile}</div>}
            {org?.email && <div>{org.email}</div>}
            {(org?.gst_number || org?.tax_number) && <div className="font-semibold">GSTIN: {org.gst_number || org.tax_number}</div>}
          </div>
        </div>

        <div className="text-right text-[7.5px] border border-black p-1.5 rounded min-w-[105px]">
          <div className="flex justify-between gap-1 py-0.5 border-b border-neutral-300">
            <span className="font-semibold text-neutral-700">Invoice No.</span>
            <span className="font-bold text-black">: {number || "INV-01"}</span>
          </div>
          <div className="flex justify-between gap-1 py-0.5 border-b border-neutral-300">
            <span className="font-semibold text-neutral-700">Invoice Date</span>
            <span className="font-bold text-black">: {invoiceDate}</span>
          </div>
          {dueDate && (
            <div className="flex justify-between gap-1 py-0.5">
              <span className="font-semibold text-neutral-700">Due Date</span>
              <span className="font-bold text-black">: {dueDate}</span>
            </div>
          )}
        </div>
      </div>

      <div className="w-full h-[1.5px] bg-black mb-2" />

      {/* Bill To Section */}
      <div className="mb-2 text-[7.5px] leading-tight">
        <div className="inline-block bg-black text-white text-[7.5px] font-bold px-2 py-0.5 rounded-full mb-1 uppercase tracking-wider">
          Bill To:
        </div>
        <div className="space-y-0.5 pl-1 text-neutral-800">
          <div className="flex items-baseline gap-1">
            <span className="font-semibold min-w-[70px] text-neutral-700">Customer Name :</span>
            <span className="font-bold text-black flex-1 border-b border-dotted border-neutral-400 pb-0.5 min-h-[12px]">
              {clientName}
            </span>
          </div>
          {clientAddress && (
            <div className="flex items-baseline gap-1">
              <span className="font-semibold min-w-[70px] text-neutral-700">Address :</span>
              <span className="flex-1 border-b border-dotted border-neutral-400 pb-0.5 min-h-[12px]">
                {clientAddress}
              </span>
            </div>
          )}
          <div className="flex items-baseline gap-2">
            <div className="flex-1 flex items-baseline gap-1">
              <span className="font-semibold min-w-[30px] text-neutral-700">City :</span>
              <span className="flex-1 border-b border-dotted border-neutral-400 pb-0.5 min-h-[12px]">{clientCity}</span>
            </div>
            <div className="flex-1 flex items-baseline gap-1">
              <span className="font-semibold min-w-[30px] text-neutral-700">State :</span>
              <span className="flex-1 border-b border-dotted border-neutral-400 pb-0.5 min-h-[12px]">{clientState}</span>
            </div>
          </div>
          {clientGstin && (
            <div className="flex items-baseline gap-1">
              <span className="font-semibold min-w-[70px] text-neutral-700">GSTIN :</span>
              <span className="font-bold text-black flex-1 border-b border-dotted border-neutral-400 pb-0.5 min-h-[12px]">{clientGstin}</span>
            </div>
          )}
          {referredBy && (
            <div className="flex items-baseline gap-1">
              <span className="font-semibold min-w-[70px] text-neutral-700">{referredByLabel} :</span>
              <span className="font-bold text-black flex-1 border-b border-dotted border-neutral-400 pb-0.5 min-h-[12px]">{referredBy}</span>
            </div>
          )}
        </div>
      </div>

      {/* Compliance E-Way Bill (Only if added) */}
      {ewayBillNo && (
        <div className="mb-2 p-1.5 border border-black rounded text-[6.5px] flex flex-wrap gap-x-2">
          <span className="font-bold uppercase">E-Way Bill:</span> <strong className="font-mono">{ewayBillNo}</strong>
          {ewayVehicleNo && <div>Vehicle: <strong className="font-mono">{ewayVehicleNo}</strong></div>}
        </div>
      )}

      {/* Item Table */}
      <div className="border border-black rounded-sm overflow-hidden mb-2">
        <table className="w-full border-collapse text-[7.5px]">
          <thead>
            <tr className="bg-black text-white font-bold uppercase">
              <th className="py-1 px-1 text-center w-[8%] border-r border-neutral-800">No.</th>
              <th className="py-1 px-1.5 text-left border-r border-neutral-800">Description</th>
              <th className="py-1 px-1 text-center w-[13%] border-r border-neutral-800">Qty</th>
              <th className="py-1 px-1 text-right w-[17%] border-r border-neutral-800">Rate (₹)</th>
              <th className="py-1 px-1 text-right w-[19%]">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/30">
            {lines.map((l, idx) => {
              const lineTotal = Number(l.quantity || 1) * Number(l.rate || 0);
              return (
                <tr key={idx} className="border-b border-black/20">
                  <td className="py-1 px-1 text-center font-semibold text-neutral-700 border-r border-black/20">{idx + 1}</td>
                  <td className="py-1 px-1.5 text-left font-medium text-black border-r border-black/20">
                    <div>{l.description || l.item_name || "Item"}</div>
                    {l.batch_number && <div className="text-[6.5px] text-neutral-500 font-mono">Batch: {l.batch_number}</div>}
                  </td>
                  <td className="py-1 px-1 text-center font-semibold border-r border-black/20">{l.quantity} {l.unit || ""}</td>
                  <td className="py-1 px-1 text-right font-medium border-r border-black/20">{fmt(Number(l.rate || 0))}</td>
                  <td className="py-1 px-1 text-right font-bold text-black">{fmt(lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bank & Totals Section */}
      <div className="grid grid-cols-2 gap-2 mb-2 items-start">
        {/* Bank Details */}
        <div className="text-[7px]">
          <div className="inline-block bg-black text-white text-[7px] font-bold px-2 py-0.5 rounded-full mb-1 uppercase tracking-wider">
            Bank Details (Optional)
          </div>
          <div className="space-y-0.5 pl-0.5 text-neutral-800">
            <div className="flex gap-1"><span className="font-semibold text-neutral-600 min-w-[48px]">Bank Name :</span><span className="font-medium flex-1 truncate">{bankName || "- -"}</span></div>
            <div className="flex gap-1"><span className="font-semibold text-neutral-600 min-w-[48px]">A/C No. :</span><span className="font-mono font-medium flex-1 truncate">{accNo || "- -"}</span></div>
            <div className="flex gap-1"><span className="font-semibold text-neutral-600 min-w-[48px]">IFSC Code :</span><span className="font-mono font-medium flex-1 truncate">{ifsc || "- -"}</span></div>
          </div>
        </div>

        {/* Totals Table */}
        <div className="border border-black rounded-sm overflow-hidden text-[7px]">
          <div className="flex justify-between px-1.5 py-0.5 border-b border-black/20">
            <span className="text-neutral-700 font-medium">Sub Total</span>
            <span className="font-bold">{fmt(subtotal)}</span>
          </div>
          {taxTotal > 0 && !effectiveIsInterstate && (
            <>
              <div className="flex justify-between px-1.5 py-0.5 border-b border-black/20">
                <span className="text-neutral-700">CGST (@ {avgRate / 2}%)</span>
                <span className="font-medium">{fmt(cgstAmount)}</span>
              </div>
              <div className="flex justify-between px-1.5 py-0.5 border-b border-black/20">
                <span className="text-neutral-700">SGST (@ {avgRate / 2}%)</span>
                <span className="font-medium">{fmt(sgstAmount)}</span>
              </div>
            </>
          )}
          {taxTotal > 0 && effectiveIsInterstate && (
            <div className="flex justify-between px-1.5 py-0.5 border-b border-black/20">
              <span className="text-neutral-700">IGST (@ {avgRate}%)</span>
              <span className="font-medium">{fmt(igstAmount)}</span>
            </div>
          )}
          {discountTotal > 0 && (
            <div className="flex justify-between px-1.5 py-0.5 border-b border-black/20 text-emerald-800">
              <span>Discount</span>
              <span>- {fmt(discountTotal)}</span>
            </div>
          )}
          <div className="bg-black text-white font-bold flex justify-between px-1.5 py-1 text-[8px]">
            <span>Total Amount</span>
            <span>{fmt(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Notes (Only if added) */}
      {showNotes && notesText && (
        <div className="mb-2 p-1.5 border border-black rounded text-[6.5px]">
          <span className="font-bold uppercase block mb-0.5">Notes:</span>
          <div className="whitespace-pre-wrap leading-tight">{notesText}</div>
        </div>
      )}

      {/* Terms & Conditions & Signatory */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-black/20 items-end text-[6.5px]">
        <div>
          <div className="inline-block bg-black text-white text-[6.5px] font-bold px-1.5 py-0.5 rounded-full mb-1 uppercase tracking-wider">
            Terms & Conditions
          </div>
          <ol className="list-decimal list-inside space-y-0.5 text-neutral-600 leading-tight pl-0.5">
            <li>Goods once sold will not be taken back.</li>
            <li>Payment is due within 7 days from invoice date.</li>
            <li>Late payment may attract interest @ 18% p.a.</li>
            <li>For any queries, please contact us.</li>
          </ol>
        </div>

        <div className="text-center flex flex-col justify-end items-center h-full">
          {org?.signature_url ? (
            <img src={org.signature_url} alt="Signature" className="max-h-7 object-contain mb-0.5" />
          ) : (
            <div className="h-7" />
          )}
          <div className="w-full border-t border-black pt-0.5 font-bold text-[7px] text-black uppercase tracking-tight">
            Authorised Signatory
          </div>
        </div>
      </div>
    </div>
  );
}
