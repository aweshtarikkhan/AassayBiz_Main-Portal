import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { computeDocumentTotals } from "@/lib/invoiceCalculations";
import { Calendar, CreditCard, Handshake } from "lucide-react";

interface IndustryA6GeometricInvoiceTemplateProps {
  org: any;
  invoice: any;
  lines: any[];
  fmt: (n: number) => string;
  type?: "invoice" | "estimate" | "bill" | "po";
  taxBreakdown?: { name: string; amount: number; rate?: number }[];
  isInterstate?: boolean;
  showSignature?: boolean;
}

export function IndustryA6GeometricInvoiceTemplate({
  org,
  invoice,
  lines,
  fmt,
  type = "invoice",
  taxBreakdown = [],
  isInterstate = false,
  showSignature = true,
}: IndustryA6GeometricInvoiceTemplateProps) {
  const navyColor = "#092147";
  const orangeColor = "#f27a18";

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
  const clientPhone = (invoice?.metadata as any)?.client_mobile || (parsedBillTo && typeof parsedBillTo === "object" ? parsedBillTo.phone : null) || (invoice.clients as any)?.phone || (invoice.vendors as any)?.phone || invoice.client_phone || "";
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
  const orgAddressStr = addressLines.length > 0 ? addressLines.join(", ") : (org?.city ? `${org.city}, ${org?.state || ""}` : "123 Business Park, Main Hub");

  const extractCity = (addr: any) => {
    if (!addr) return "";
    if (typeof addr === "object") {
      if (addr.city && String(addr.city).trim()) return String(addr.city).trim();
    }
    if (typeof addr === "string") {
      try {
        const parsed = JSON.parse(addr);
        if (parsed?.city && String(parsed.city).trim()) return String(parsed.city).trim();
      } catch {}
      const parts = addr.split(",").map((p: string) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const candidate = parts[1];
        if (candidate && !/^\d+$/.test(candidate)) return candidate;
      }
    }
    return "";
  };

  const clientCity = extractCity(rawShippingObj) || extractCity(rawBillToObj) || (invoice.clients as any)?.city || (invoice.clients as any)?.billing_address?.city || (invoice.clients as any)?.shipping_address?.city || "";
  const placeOfSupply = clientCity || invoice?.place_of_supply || (invoice.clients as any)?.state || org?.city || org?.state || "";

  // Totals
  const effectiveIsInterstate = isInterstate || (invoice.clients as any)?.is_interstate;
  const {
    subtotalVal,
    discountAmt,
    expensesAmt,
    shippingAmt,
    taxableAmount,
    tdsAmount,
    tcsAmount,
    gstBreakdown,
    totalTaxAmt,
    effectiveAdjustment,
    effectiveAdjustmentName,
    grandTotal,
  } = computeDocumentTotals(invoice, lines, taxBreakdown, hasGst, effectiveIsInterstate);

  const titleText = type === "estimate" ? "QUOTATION" : type === "po" ? "PURCHASE ORDER" : type === "bill" ? "PURCHASE INVOICE" : (hasGst ? "INVOICE" : "INVOICE");

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

  // Bank Info resolution
  const invBank = invoice?.bank_details ? (typeof invoice.bank_details === "string" ? (() => { try { return JSON.parse(invoice.bank_details); } catch { return null; } })() : invoice.bank_details) : null;
  const orgBank = org?.bank_details ? (typeof org.bank_details === "string" ? (() => { try { return JSON.parse(org.bank_details); } catch { return null; } })() : org.bank_details) : null;

  const bankName = invBank?.bank_name || orgBank?.bank_name || org?.bank_name || org?.template_bank_name || "HDFC Bank";
  const accNo = invBank?.bank_account_number || invBank?.account_number || invBank?.account_no || orgBank?.bank_account_number || orgBank?.account_no || orgBank?.acc_no || org?.bank_account_number || org?.bank_account_no || org?.bank_acc_number || org?.template_bank_account_no || "";
  const ifsc = invBank?.bank_ifsc || invBank?.ifsc || orgBank?.bank_ifsc || orgBank?.ifsc || org?.bank_ifsc || org?.template_bank_ifsc || "";
  const upiId = invBank?.bank_upi_id || invBank?.upi_id || orgBank?.upi_id || org?.upi_id || org?.template_upi_id || org?.upi_number || "";

  const upiQrString = upiId
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(org?.name || "Business")}&am=${grandTotal.toFixed(2)}&cu=INR`
    : `PAYMENT-INVOICE-${number || "INV-01"}`;

  // Tax calculations
  const effectiveIsInterstate = isInterstate || (invoice.clients as any)?.is_interstate;
  const avgRate = lines.length > 0 ? lines[0]?.tax_rate || 18 : 18;
  const cgstAmount = !effectiveIsInterstate ? taxTotal / 2 : 0;
  const sgstAmount = !effectiveIsInterstate ? taxTotal / 2 : 0;
  const igstAmount = effectiveIsInterstate ? taxTotal : 0;

  return (
    <div className="w-full max-w-[105mm] mx-auto bg-white text-slate-900 font-sans text-[8px] leading-tight select-none border border-slate-300 shadow-sm relative overflow-hidden print:border-none print:shadow-none print:p-0">
      {/* Top Header Row with Geometric Angled Banner */}
      <div className="flex justify-between items-stretch gap-1">
        {/* Left: Hexagon Brand & Business Details */}
        <div className="p-3 pb-1 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {org?.logo_url ? (
              <img src={org.logo_url} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              <div className="w-7 h-7 bg-gradient-to-br from-[#f27a18] to-[#092147] rounded-lg flex items-center justify-center text-white font-black text-xs shadow-sm">
                S
              </div>
            )}
            <div>
              <div className="font-black text-[10px] text-[#092147] uppercase tracking-tight">{org?.name || "YOUR BUSINESS"}</div>
              <div className="text-[6.5px] text-slate-500 font-medium">Grow Together</div>
            </div>
          </div>
          <div className="text-[6.5px] text-slate-600 space-y-0.5 pl-0.5">
            <div>{orgAddressStr}</div>
            {(org?.phone || org?.mobile) && <div>+91 {org.phone || org.mobile}</div>}
            {org?.email && <div>{org.email}</div>}
            {(org?.gst_number || org?.tax_number) && <div className="font-semibold text-slate-800">GSTIN: {org.gst_number || org.tax_number}</div>}
          </div>
        </div>

        {/* Right: Angled Navy Banner */}
        <div className="relative bg-[#092147] text-white pl-6 pr-3 py-2 flex flex-col justify-center items-end min-w-[125px] overflow-hidden">
          {/* Diagonal orange slants */}
          <div className="absolute top-0 left-1 w-2.5 h-full bg-[#f27a18] transform -skew-x-[25deg]" />
          <div className="absolute top-0 left-4 w-1 h-full bg-white/20 transform -skew-x-[25deg]" />
          <div className="text-right z-10">
            <div className="text-[14px] font-black tracking-widest uppercase">{titleText}</div>
            <div className="text-[8px] font-bold text-slate-200"># {number || "INV-2025-001"}</div>
          </div>
        </div>
      </div>

      <div className="px-3 pb-3 space-y-2">
        {/* Bill To Card & Meta Grid */}
        <div className="grid grid-cols-2 gap-2 items-stretch">
          {/* Bill To Card */}
          <div className="relative">
            <div className="inline-block bg-[#092147] text-white text-[7px] font-bold px-2 py-0.5 rounded-t-md uppercase tracking-wider">
              Bill To:
            </div>
            <div className="bg-[#f0f4f9] border border-slate-200 rounded-b-md rounded-tr-md p-1.5 text-[7px] space-y-0.5 min-h-[58px]">
              <div className="font-bold text-[#092147] text-[7.5px]">{clientName || "Customer Name"}</div>
              {clientAddress && <div className="text-slate-600 truncate">{clientAddress}</div>}
              {(clientCity || clientState) && <div className="text-slate-600">{[clientCity, clientState].filter(Boolean).join(" - ")}</div>}
              {clientPhone && <div className="text-slate-600">+91 {clientPhone}</div>}
              {clientGstin && <div className="font-semibold text-slate-800">GSTIN: {clientGstin}</div>}
              {referredBy && <div className="font-semibold text-[#092147]">{referredByLabel}: {referredBy}</div>}
            </div>
          </div>

          {/* Metadata Cards */}
          <div className="flex flex-col justify-center space-y-1 text-[7px] pl-1">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Calendar className="w-3 h-3 text-[#092147] shrink-0" />
              <span className="font-semibold min-w-[55px]">Invoice Date</span>
              <span className="font-bold text-slate-900">: {invoiceDate}</span>
            </div>
            {dueDate && (
              <div className="flex items-center gap-1.5 text-slate-700">
                <Calendar className="w-3 h-3 text-[#f27a18] shrink-0" />
                <span className="font-semibold min-w-[55px]">Due Date</span>
                <span className="font-bold text-slate-900">: {dueDate}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-slate-700">
              <CreditCard className="w-3 h-3 text-[#092147] shrink-0" />
              <span className="font-semibold min-w-[55px]">Payment</span>
              <span className="font-medium text-slate-900">: Net 7 Days</span>
            </div>
          </div>
        </div>

        {/* Compliance E-Way Bill (Only if added) */}
      {ewayBillNo && (
        <div className="mb-2 p-1.5 border border-[#092147] bg-[#f0f4f9] rounded text-[6.5px] flex flex-wrap gap-x-2">
          <span className="font-bold text-[#092147] uppercase">E-Way Bill:</span> <strong className="font-mono">{ewayBillNo}</strong>
          {ewayVehicleNo && <div>Vehicle: <strong className="font-mono">{ewayVehicleNo}</strong></div>}
        </div>
      )}

      {/* Item Table */}
        <div className="border border-[#092147] rounded-sm overflow-hidden">
          <table className="w-full border-collapse text-[7.5px]">
            <thead>
              <tr className="bg-[#092147] text-white font-bold uppercase">
                <th className="py-1 px-1 text-center w-[8%] border-r border-slate-700">No.</th>
                <th className="py-1 px-1.5 text-left border-r border-slate-700">Description</th>
                <th className="py-1 px-1 text-center w-[12%] border-r border-slate-700">Qty</th>
                <th className="py-1 px-1 text-right w-[18%] border-r border-slate-700">Rate (₹)</th>
                <th className="py-1 px-1 text-right w-[20%]">Amount (₹)</th>
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
                    <td className="py-1 px-1 text-right font-bold text-[#092147]">{fmt(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Payment & Totals */}
        <div className="grid grid-cols-2 gap-2 items-start">
          {/* Left: Payment Details & QR */}
          <div className="text-[7px]">
            <div className="inline-block bg-[#092147] text-white text-[7px] font-bold px-2 py-0.5 rounded-full mb-1 uppercase tracking-wider">
              Payment Details
            </div>
            <div className="flex gap-2 items-center pl-0.5">
              <div className="space-y-0.5 text-slate-700 flex-1">
                {upiId && <div className="flex gap-1"><span className="font-semibold min-w-[40px]">UPI ID :</span><span className="font-mono flex-1 truncate">{upiId}</span></div>}
                <div className="flex gap-1"><span className="font-semibold min-w-[40px]">Bank :</span><span className="flex-1 truncate">{bankName}</span></div>
                {accNo && <div className="flex gap-1"><span className="font-semibold min-w-[40px]">A/C No. :</span><span className="font-mono flex-1 truncate">{accNo}</span></div>}
                {ifsc && <div className="flex gap-1"><span className="font-semibold min-w-[40px]">IFSC :</span><span className="font-mono flex-1 truncate">{ifsc}</span></div>}
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center bg-slate-50 border border-slate-200 p-1 rounded">
                <QRCodeSVG value={upiQrString} size={36} level="L" />
                <span className="text-[5.5px] font-bold text-slate-700 mt-0.5">Scan to Pay</span>
              </div>
            </div>
          </div>

          {/* Right: Subtotal & Total Amount Banner */}
          <div className="border border-slate-300 rounded-sm overflow-hidden text-[7px]">
            <div className="flex justify-between px-1.5 py-0.5 border-b border-slate-200 bg-slate-50">
              <span className="text-slate-600 font-medium">Subtotal</span>
              <span className="font-bold text-slate-800">{fmt(subtotalVal)}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between px-1.5 py-0.5 border-b border-slate-200 text-red-600">
                <span>Discount</span>
                <span className="font-semibold">- {fmt(discountAmt)}</span>
              </div>
            )}
            {expensesAmt > 0 && (
              <div className="flex justify-between px-1.5 py-0.5 border-b border-slate-200">
                <span className="text-slate-600">Fixed Cost</span>
                <span className="font-semibold text-slate-800">+ {fmt(expensesAmt)}</span>
              </div>
            )}
            {shippingAmt > 0 && (
              <div className="flex justify-between px-1.5 py-0.5 border-b border-slate-200">
                <span className="text-slate-600">Shipping</span>
                <span className="font-semibold text-slate-800">+ {fmt(shippingAmt)}</span>
              </div>
            )}
            {(discountAmt > 0 || expensesAmt > 0 || shippingAmt > 0 || hasGst) && (
              <div className="flex justify-between px-1.5 py-0.5 border-b border-slate-200 bg-slate-100/80 font-bold">
                <span>Taxable Amt</span>
                <span>{fmt(taxableAmount)}</span>
              </div>
            )}
            {hasGst && (
              gstBreakdown.length > 0 ? (
                gstBreakdown.map((t, i) => (
                  <div key={i} className="flex justify-between px-1.5 py-0.5 border-b border-slate-200">
                    <span className="text-slate-600">{t.name}</span>
                    <span className="font-medium">+ {fmt(t.amount)}</span>
                  </div>
                ))
              ) : totalTaxAmt > 0 ? (
                effectiveIsInterstate ? (
                  <div className="flex justify-between px-1.5 py-0.5 border-b border-slate-200">
                    <span className="text-slate-600">IGST</span>
                    <span className="font-medium">+ {fmt(totalTaxAmt)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between px-1.5 py-0.5 border-b border-slate-200">
                      <span className="text-slate-600">CGST</span>
                      <span className="font-medium">+ {fmt(totalTaxAmt / 2)}</span>
                    </div>
                    <div className="flex justify-between px-1.5 py-0.5 border-b border-slate-200">
                      <span className="text-slate-600">SGST</span>
                      <span className="font-medium">+ {fmt(totalTaxAmt / 2)}</span>
                    </div>
                  </>
                )
              ) : null
            )}
            {effectiveAdjustment !== 0 && (
              <div className="flex justify-between px-1.5 py-0.5 border-b border-slate-200 text-slate-600 text-[6.5px]">
                <span>{effectiveAdjustmentName}</span>
                <span className="font-semibold">{effectiveAdjustment > 0 ? "+" : ""}{fmt(effectiveAdjustment)}</span>
              </div>
            )}
            {/* Orange Total Box */}
            <div className="bg-[#f27a18] text-white font-black flex justify-between px-2 py-1 text-[8.5px]">
              <span>Total Amount</span>
              <span>₹ {fmt(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Notes (Only if added) */}
      {showNotes && notesText && (
        <div className="mb-2 p-1.5 border border-slate-200 rounded text-[6.5px] bg-slate-50">
          <span className="font-bold text-[#092147] uppercase block mb-0.5">Notes:</span>
          <div className="whitespace-pre-wrap leading-tight">{notesText}</div>
        </div>
      )}

      {/* Terms & Conditions & Signatory */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 items-end text-[6.5px]">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <span className="bg-[#092147] text-white text-[6.5px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Terms & Conditions
              </span>
              <span className="w-1.5 h-3 bg-[#f27a18] transform -skew-x-[25deg]" />
            </div>
            <ol className="list-decimal list-inside space-y-0.5 text-slate-600 leading-tight pl-0.5">
              <li>Goods once sold will not be taken back.</li>
              <li>Payment is due within 7 days from invoice date.</li>
              <li>Late payment may attract interest @ 18% per annum.</li>
              <li>For any queries, please contact us.</li>
            </ol>
          </div>

          <div className="text-center flex flex-col justify-end items-center h-full">
            <div className="text-[6.5px] font-bold text-slate-700 mb-0.5">For {org?.name || "Your Business"}</div>
            {org?.signature_url ? (
              <img src={org.signature_url} alt="Signature" className="max-h-6 object-contain mb-0.5" />
            ) : (
              <svg className="w-20 h-6 text-slate-800 mb-0.5" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M 5,20 Q 20,5 35,22 T 60,15 T 85,18" />
              </svg>
            )}
            <div className="w-full border-t border-slate-700 pt-0.5 font-bold text-[7px] text-[#092147] uppercase tracking-tight">
              Authorised Signatory
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Geometric Navy Ribbon with Handshake */}
      <div className="relative bg-[#092147] text-white px-3 py-1 flex items-center justify-between overflow-hidden">
        <div className="flex items-center gap-1.5 z-10">
          <Handshake className="w-3.5 h-3.5 text-[#f27a18]" />
          <span className="text-[8px] font-black italic tracking-wide">Thank You!</span>
          <span className="text-[7px] text-slate-300 font-medium">For Your Business</span>
        </div>
        <div className="flex space-x-1 z-10">
          <span className="w-2 h-4 bg-white/30 transform -skew-x-[25deg]" />
          <span className="w-2.5 h-4 bg-[#f27a18] transform -skew-x-[25deg]" />
        </div>
      </div>
    </div>
  );
}
