import React from "react";
import { resolveLineTaxRate } from "@/lib/invoiceCalculations";

interface IndustryA6SlantInvoiceTemplateProps {
  org: any;
  invoice: any;
  lines: any[];
  fmt: (n: number) => string;
  type?: "invoice" | "estimate" | "bill" | "po";
  taxBreakdown?: { name: string; amount: number; rate?: number }[];
  isInterstate?: boolean;
  showSignature?: boolean;
}

export function IndustryA6SlantInvoiceTemplate({
  org,
  invoice,
  lines,
  fmt,
  type = "invoice",
  taxBreakdown = [],
  isInterstate = false,
  showSignature = true,
}: IndustryA6SlantInvoiceTemplateProps) {
  const navyColor = "#0f2347";
  const orangeColor = "#f58220";

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
  const orgAddressStr = addressLines.length > 0 ? addressLines.join(", ") : (org?.city ? `${org.city}, ${org?.state || ""}` : "123, Business Park, Phase II");

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

  // Tax breakdown
  const effectiveIsInterstate = isInterstate || (invoice.clients as any)?.is_interstate;
  const avgRate = lines.length > 0 ? lines[0]?.tax_rate || 18 : 18;
  const cgstAmount = !effectiveIsInterstate ? taxTotal / 2 : 0;
  const sgstAmount = !effectiveIsInterstate ? taxTotal / 2 : 0;
  const igstAmount = effectiveIsInterstate ? taxTotal : 0;

  return (
    <div className="w-full max-w-[105mm] mx-auto bg-white text-slate-900 p-3 font-sans text-[8px] leading-tight select-none border border-slate-300 shadow-sm relative overflow-hidden print:border-none print:shadow-none print:p-0">
      {/* Top Navy Banner with Orange Slant Accents */}
      <div className="relative bg-[#0f2347] text-white px-3 py-2 flex items-center justify-between rounded-t-sm mb-2 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-black tracking-widest uppercase">{titleText}</span>
          <div className="flex items-center space-x-1 pl-1">
            <span className="w-1.5 h-4 bg-white/30 transform -skew-x-[25deg]" />
            <span className="w-2 h-4 bg-[#f58220] transform -skew-x-[25deg]" />
          </div>
        </div>
        <div className="text-[7.5px] font-medium text-slate-200">
          Official GST Voucher
        </div>
      </div>

      {/* From & Invoice Details */}
      <div className="flex justify-between items-start gap-2 mb-2 px-0.5">
        <div className="flex-1 text-[7.5px] text-slate-700 space-y-0.5">
          <div className="font-bold text-[#0f2347] text-[8px]">From:</div>
          <div className="font-black text-[9.5px] text-[#0f2347] uppercase tracking-tight">{org?.name || "Your Business Name"}</div>
          <div className="text-slate-600 border-b border-dotted border-slate-300 pb-0.5">{orgAddressStr}</div>
          <div className="flex gap-2 border-b border-dotted border-slate-300 pb-0.5">
            {(org?.phone || org?.mobile) && <span>Ph: +91 {org.phone || org.mobile}</span>}
            {org?.email && <span>{org.email}</span>}
          </div>
          {(org?.gst_number || org?.tax_number) && (
            <div className="font-semibold text-slate-900 border-b border-dotted border-slate-300 pb-0.5">
              GSTIN: {org.gst_number || org.tax_number}
            </div>
          )}
        </div>

        <div className="text-right text-[7.5px] min-w-[110px] space-y-1">
          <div className="flex justify-between items-baseline gap-1 border-b border-dotted border-slate-300 pb-0.5">
            <span className="font-semibold text-slate-600">Invoice No. :</span>
            <span className="font-bold text-[#0f2347]">{number || "INV-001"}</span>
          </div>
          <div className="flex justify-between items-baseline gap-1 border-b border-dotted border-slate-300 pb-0.5">
            <span className="font-semibold text-slate-600">Invoice Date :</span>
            <span className="font-bold text-[#0f2347]">{invoiceDate}</span>
          </div>
          {dueDate && (
            <div className="flex justify-between items-baseline gap-1 border-b border-dotted border-slate-300 pb-0.5">
              <span className="font-semibold text-slate-600">Due Date :</span>
              <span className="font-bold text-[#0f2347]">{dueDate}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bill To Section with Pill Badge */}
      <div className="mb-2 text-[7.5px]">
        <div className="inline-block bg-[#0f2347] text-white text-[7.5px] font-bold px-2.5 py-0.5 rounded-full mb-1 uppercase tracking-wider">
          Bill To:
        </div>
        <div className="space-y-0.5 pl-1">
          <div className="flex items-baseline gap-1">
            <span className="font-semibold text-slate-600 min-w-[55px]">Name :</span>
            <span className="font-bold text-[#0f2347] flex-1 border-b border-dotted border-slate-300 pb-0.5 min-h-[12px]">{clientName}</span>
          </div>
          {clientAddress && (
            <div className="flex items-baseline gap-1">
              <span className="font-semibold text-slate-600 min-w-[55px]">Address :</span>
              <span className="text-slate-700 flex-1 border-b border-dotted border-slate-300 pb-0.5 min-h-[12px]">{clientAddress}</span>
            </div>
          )}
          <div className="flex items-baseline gap-2">
            <div className="flex-1 flex items-baseline gap-1">
              <span className="font-semibold text-slate-600 min-w-[30px]">City :</span>
              <span className="text-slate-700 flex-1 border-b border-dotted border-slate-300 pb-0.5 min-h-[12px]">{clientCity}</span>
            </div>
            <div className="flex-1 flex items-baseline gap-1">
              <span className="font-semibold text-slate-600 min-w-[30px]">State :</span>
              <span className="text-slate-700 flex-1 border-b border-dotted border-slate-300 pb-0.5 min-h-[12px]">{clientState}</span>
            </div>
          </div>
          {clientGstin && (
            <div className="flex items-baseline gap-1">
              <span className="font-semibold text-slate-600 min-w-[55px]">GSTIN :</span>
              <span className="font-bold text-slate-900 flex-1 border-b border-dotted border-slate-300 pb-0.5 min-h-[12px]">{clientGstin}</span>
            </div>
          )}
          {referredBy && (
            <div className="flex items-baseline gap-1">
              <span className="font-semibold text-slate-600 min-w-[55px]">{referredByLabel} :</span>
              <span className="font-bold text-[#0f2347] flex-1 border-b border-dotted border-slate-300 pb-0.5 min-h-[12px]">{referredBy}</span>
            </div>
          )}
        </div>
      </div>

      {/* Compliance E-Way Bill (Only if added) */}
      {ewayBillNo && (
        <div className="mb-2 p-1.5 border border-[#0f2347] bg-slate-50 rounded text-[6.5px] flex flex-wrap gap-x-2">
          <span className="font-bold text-[#0f2347] uppercase">E-Way Bill:</span> <strong className="font-mono">{ewayBillNo}</strong>
          {ewayVehicleNo && <div>Vehicle: <strong className="font-mono">{ewayVehicleNo}</strong></div>}
        </div>
      )}

      {/* Item Table */}
      <div className="border border-[#0f2347] rounded-sm overflow-hidden mb-2">
        <table className="w-full border-collapse text-[7.5px]">
          <thead>
            <tr className="bg-[#0f2347] text-white font-bold uppercase">
              <th className="py-1 px-1 text-center w-[8%] border-r border-slate-700">No.</th>
              <th className="py-1 px-1.5 text-left border-r border-slate-700">Description</th>
              <th className="py-1 px-1 text-center w-[13%] border-r border-slate-700">Qty</th>
              <th className="py-1 px-1 text-right w-[17%] border-r border-slate-700">Rate (₹)</th>
              <th className="py-1 px-1 text-right w-[19%]">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {lines.map((l, idx) => {
              const lineTotal = Number(l.quantity || 1) * Number(l.rate || 0);
              return (
                <tr key={idx} className="border-b border-slate-200">
                  <td className="py-1 px-1 text-center font-medium text-slate-600 border-r border-slate-200">{idx + 1}</td>
                  <td className="py-1 px-1.5 text-left font-medium text-slate-900 border-r border-slate-200">
                    <div>{l.description || l.item_name || "Item"}</div>
                    {l.batch_number && <div className="text-[6.5px] text-slate-500 font-mono">Batch: {l.batch_number}</div>}
                  </td>
                  <td className="py-1 px-1 text-center font-semibold text-slate-800 border-r border-slate-200">{l.quantity} {l.unit || ""}</td>
                  <td className="py-1 px-1 text-right font-medium text-slate-700 border-r border-slate-200">{fmt(Number(l.rate || 0))}</td>
                  <td className="py-1 px-1 text-right font-bold text-[#0f2347]">{fmt(lineTotal)}</td>
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
          <div className="inline-block bg-[#0f2347] text-white text-[7px] font-bold px-2 py-0.5 rounded-full mb-1 uppercase tracking-wider">
            Bank Details (Optional)
          </div>
          <div className="space-y-0.5 pl-0.5 text-slate-700">
            <div className="flex gap-1 border-b border-dotted border-slate-300 pb-0.5"><span className="font-semibold min-w-[50px]">Bank Name :</span><span className="flex-1 truncate">{bankName || "- -"}</span></div>
            <div className="flex gap-1 border-b border-dotted border-slate-300 pb-0.5"><span className="font-semibold min-w-[50px]">A/C No. :</span><span className="font-mono flex-1 truncate">{accNo || "- -"}</span></div>
            <div className="flex gap-1 border-b border-dotted border-slate-300 pb-0.5"><span className="font-semibold min-w-[50px]">IFSC Code :</span><span className="font-mono flex-1 truncate">{ifsc || "- -"}</span></div>
          </div>
        </div>

        {/* Totals Box */}
        <div className="border border-[#0f2347] rounded-sm overflow-hidden text-[7px]">
          <div className="flex justify-between px-1.5 py-0.5 border-b border-slate-200 bg-slate-50">
            <span className="text-slate-600 font-medium">Sub Total</span>
            <span className="font-bold text-slate-800">{fmt(subtotal)}</span>
          </div>
          {taxTotal > 0 && !effectiveIsInterstate && (
            <>
              <div className="flex justify-between px-1.5 py-0.5 border-b border-slate-200">
                <span className="text-slate-600">CGST ( {avgRate / 2}% )</span>
                <span className="font-medium">{fmt(cgstAmount)}</span>
              </div>
              <div className="flex justify-between px-1.5 py-0.5 border-b border-slate-200">
                <span className="text-slate-600">SGST ( {avgRate / 2}% )</span>
                <span className="font-medium">{fmt(sgstAmount)}</span>
              </div>
            </>
          )}
          {taxTotal > 0 && effectiveIsInterstate && (
            <div className="flex justify-between px-1.5 py-0.5 border-b border-slate-200">
              <span className="text-slate-600">IGST ( {avgRate}% )</span>
              <span className="font-medium">{fmt(igstAmount)}</span>
            </div>
          )}
          {discountTotal > 0 && (
            <div className="flex justify-between px-1.5 py-0.5 border-b border-slate-200 text-emerald-700">
              <span>Discount</span>
              <span>- {fmt(discountTotal)}</span>
            </div>
          )}
          <div className="bg-[#0f2347] text-white font-black flex justify-between px-1.5 py-1 text-[8px]">
            <span>Total Amount</span>
            <span>{fmt(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Notes (Only if added) */}
      {showNotes && notesText && (
        <div className="mb-2 p-1.5 border border-slate-300 rounded text-[6.5px] bg-slate-50">
          <span className="font-bold text-[#0f2347] uppercase block mb-0.5">Notes:</span>
          <div className="whitespace-pre-wrap leading-tight">{notesText}</div>
        </div>
      )}

      {/* Terms & Signatory */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 items-end text-[6.5px] mb-2">
        <div>
          <div className="inline-block bg-[#0f2347] text-white text-[6.5px] font-bold px-2 py-0.5 rounded-full mb-1 uppercase tracking-wider">
            Terms & Conditions
          </div>
          <ol className="list-decimal list-inside space-y-0.5 text-slate-600 leading-tight pl-0.5">
            <li>Goods once sold will not be taken back.</li>
            <li>Payment is due within 7 days from the date of invoice.</li>
            <li>Late payment may attract interest @ 18% per annum.</li>
            <li>For any queries, please contact us.</li>
          </ol>
        </div>

        <div className="text-center flex flex-col justify-end items-center h-full">
          {org?.signature_url ? (
            <img src={org.signature_url} alt="Signature" className="max-h-7 object-contain mb-0.5" />
          ) : (
            <div className="h-7" />
          )}
          <div className="w-full border-t border-slate-700 pt-0.5 font-bold text-[7px] text-[#0f2347] uppercase tracking-tight">
            Authorised Signatory
          </div>
        </div>
      </div>

      {/* Bottom Footer Slant Ribbon */}
      <div className="relative h-2 bg-[#0f2347] rounded-b-sm overflow-hidden flex justify-end items-center px-2">
        <div className="flex space-x-1">
          <span className="w-2 h-4 bg-white/40 transform -skew-x-[25deg]" />
          <span className="w-2.5 h-4 bg-[#f58220] transform -skew-x-[25deg]" />
        </div>
      </div>
    </div>
  );
}
