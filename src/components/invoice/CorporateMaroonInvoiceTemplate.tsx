import React from "react";
import { numberToWords } from "@/lib/number-to-words";
import { getAdaptiveCompanyNameStyle } from "@/lib/document-templates";

interface CorporateMaroonInvoiceTemplateProps {
  org: any;
  invoice: any;
  lines: any[];
  fmt: (n: number) => string;
  type?: "invoice" | "estimate" | "bill" | "po";
  taxBreakdown?: { name: string; amount: number; rate?: number }[];
  isInterstate?: boolean;
  showSignature?: boolean;
}

export function CorporateMaroonInvoiceTemplate({
  org,
  invoice,
  lines,
  fmt,
  type = "invoice",
  taxBreakdown = [],
  isInterstate = false,
  showSignature = true,
}: CorporateMaroonInvoiceTemplateProps) {
  const maroonColor = "#6b1a1a";
  const goldColor = "#e0b150";
  const creamBg = "#fdf8ee";
  const beigeBorder = "#d9cfb8";

  const snapshot = (invoice?.metadata as any) || {};
  const hasGst = snapshot.has_gst !== undefined
    ? Boolean(snapshot.has_gst)
    : Boolean((org?.gst_number || org?.tax_number)?.trim() && org?.gst_enabled !== false);

  const rawBillToObj = invoice?.billing_address || (invoice?.clients as any)?.billing_address;
  const parsedBillTo = typeof rawBillToObj === "string" ? (() => { try { return JSON.parse(rawBillToObj); } catch { return null; } })() : rawBillToObj;

  const rawShippingObj = invoice?.shipping_address || (invoice?.clients as any)?.shipping_address;
  const parsedShipping = typeof rawShippingObj === "string" ? (() => { try { return JSON.parse(rawShippingObj); } catch { return null; } })() : rawShippingObj;

  const rawClientName = (invoice?.metadata as any)?.client_name || (parsedBillTo && typeof parsedBillTo === "object" ? parsedBillTo.name : null) || (invoice.clients as any)?.display_name || (invoice.clients as any)?.company_name || (invoice.vendors as any)?.name || (invoice as any)?.client_name || "";
  const clientName = (rawClientName === "Walk-in Customer") ? "" : rawClientName;

  const clientAddress = (parsedBillTo && typeof parsedBillTo === "object" ? [parsedBillTo.street, parsedBillTo.city, parsedBillTo.state, parsedBillTo.zip].filter(Boolean).join(", ") : null) || (invoice.clients as any)?.address || "";
  const shippingAddress = (parsedShipping && typeof parsedShipping === "object" ? [parsedShipping.street, parsedShipping.city, parsedShipping.state, parsedShipping.zip].filter(Boolean).join(", ") : null) || (invoice.clients as any)?.shipping_address || clientAddress;

  const clientPhone = (invoice?.metadata as any)?.client_mobile || (parsedBillTo && typeof parsedBillTo === "object" ? parsedBillTo.phone : null) || (invoice.clients as any)?.phone || (invoice.vendors as any)?.phone || invoice.client_phone || "";
  const clientGstin = (invoice.clients as any)?.gstin || (invoice.clients as any)?.tax_number || (invoice as any)?.client_gstin || "";
  const placeOfSupply = invoice?.place_of_supply || (invoice.clients as any)?.state || org?.state || "";

  const referredBy = (invoice?.metadata as any)?.referred_by;
  const referredByLabel = (invoice?.metadata as any)?.referred_by_label || "Referred By";
  const showNotes = (invoice?.metadata as any)?.show_notes !== false;
  const notesText = (invoice.notes || (invoice?.metadata as any)?.notes || "")?.trim();
  const ewayBillNo = (invoice as any)?.eway_bill_no || (invoice?.metadata as any)?.eway_bill_no;
  const ewayVehicleNo = (invoice as any)?.eway_vehicle_no || (invoice?.metadata as any)?.eway_vehicle_no;
  const ewayTransportMode = (invoice as any)?.eway_transport_mode || (invoice?.metadata as any)?.eway_transport_mode;
  const ewayDistance = (invoice as any)?.eway_distance_km || (invoice?.metadata as any)?.eway_distance_km;

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
  const orgAddressStr = addressLines.length > 0 ? addressLines.join(", ") : (org?.city ? `${org.city}, ${org?.state || ""}` : "Shop No. 12, Main Road, City, State - 452001");

  // Totals
  const subtotal = Number(invoice.subtotal ?? lines.reduce((acc, l) => acc + (Number(l.quantity || 1) * Number(l.rate || 0)), 0));
  const discountTotal = Number(invoice.total_discount ?? invoice.discount_amount ?? 0);
  const taxTotal = Number(invoice.tax_total ?? invoice.total_tax ?? 0);
  const shippingAmount = Number(invoice.shipping_amount ?? invoice.delivery_charge ?? 0);
  const grandTotal = Number(invoice.total ?? (subtotal - discountTotal + taxTotal + shippingAmount));

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

  // Bank details
  let bankName = org?.bank_name || org?.template_bank_name || "";
  let accountName = org?.bank_account_name || org?.name || "";
  let accNo = org?.bank_account_no || org?.bank_acc_number || org?.template_bank_account_no || "";
  let ifsc = org?.bank_ifsc || org?.template_bank_ifsc || "";
  let upiId = org?.upi_id || org?.template_upi_id || "";

  if (org?.bank_details) {
    try {
      const parsed = typeof org.bank_details === "string" ? JSON.parse(org.bank_details) : org.bank_details;
      bankName = parsed.bank_name || bankName;
      accountName = parsed.account_name || accountName;
      accNo = parsed.account_no || parsed.acc_no || accNo;
      ifsc = parsed.ifsc || ifsc;
      upiId = parsed.upi_id || upiId;
    } catch {}
  }

  // Tax calculations
  const effectiveIsInterstate = isInterstate || (invoice.clients as any)?.is_interstate;
  const avgRate = lines.length > 0 ? lines[0]?.tax_rate || 18 : 18;
  const cgstAmount = !effectiveIsInterstate ? taxTotal / 2 : 0;
  const sgstAmount = !effectiveIsInterstate ? taxTotal / 2 : 0;
  const igstAmount = effectiveIsInterstate ? taxTotal : 0;

  // Amount in words
  const integerPart = Math.floor(grandTotal);
  const decimalPart = Math.round((grandTotal - integerPart) * 100);
  let words = numberToWords(integerPart) + " Rupees";
  if (decimalPart > 0) {
    words += " and " + numberToWords(decimalPart) + " Paise";
  }
  words += " Only";

  const companyStyle = getAdaptiveCompanyNameStyle(org?.name);

  return (
    <div className="w-full max-w-[210mm] mx-auto bg-white text-[#222] p-8 font-sans text-[11px] leading-normal select-none shadow-sm print:border-none print:shadow-none print:p-0">
      {/* Top Header */}
      <div className="flex justify-between items-start gap-4 mb-3">
        {/* Left: Organization Details */}
        <div className="flex-1 space-y-1">
          <div className="text-[#6b1a1a] font-black text-2xl tracking-tight uppercase leading-none">
            {org?.name || "YOUR BUSINESS NAME"}
          </div>
          <div className="text-[11px] text-[#333] pt-1">{orgAddressStr}</div>
          <div className="text-[10.5px] text-[#333]">
            <span>GSTIN: {org?.gst_number || org?.tax_number || "23XXXXX1234X1ZX"}</span>
            {org?.pan_number && <span className="ml-2 font-medium">| PAN: {org.pan_number}</span>}
          </div>
          <div className="text-[10.5px] text-[#333]">
            {(org?.phone || org?.mobile) && <span>Ph: +91 {org.phone || org.mobile}</span>}
            {org?.email && <span className="ml-2">| Email: {org.email}</span>}
          </div>
        </div>

        {/* Right: Golden INVOICE & Meta */}
        <div className="text-right min-w-[210px] space-y-1">
          <div className="text-[#e0b150] font-black text-3xl tracking-widest uppercase mb-1 drop-shadow-sm">
            {titleText}
          </div>
          <div className="text-[11px] font-medium text-[#222] space-y-0.5">
            <div className="flex justify-end gap-1">
              <span className="text-[#555] min-w-[85px] text-left">Invoice No:</span>
              <span className="font-bold border-b border-dotted border-[#999] min-w-[100px] text-right">{number || "INV-001"}</span>
            </div>
            <div className="flex justify-end gap-1">
              <span className="text-[#555] min-w-[85px] text-left">Date:</span>
              <span className="font-bold border-b border-dotted border-[#999] min-w-[100px] text-right">{invoiceDate}</span>
            </div>
            {dueDate && (
              <div className="flex justify-end gap-1">
                <span className="text-[#555] min-w-[85px] text-left">Due Date:</span>
                <span className="font-bold border-b border-dotted border-[#999] min-w-[100px] text-right">{dueDate}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Maroon Divider Line */}
      <div className="w-full h-[2.5px] bg-[#6b1a1a] mb-4" />

      {/* Bill To & Ship To Box */}
      <div className="grid grid-cols-2 gap-4 border border-[#d9cfb8] bg-[#fdf8ee] p-3 rounded-sm mb-4 text-[10.5px]">
        {/* Bill To */}
        <div className="space-y-1">
          <div className="text-[#6b1a1a] font-black tracking-wider uppercase text-[10px]">BILL TO</div>
          <div className="space-y-0.5 text-[#222]">
            <div className="flex items-baseline gap-1">
              <span className="text-[#555] min-w-[125px]">Customer / Firm Name:</span>
              <span className="font-bold border-b border-dotted border-[#999] flex-1 pb-0.5 min-h-[16px]">{clientName}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-[#555] min-w-[55px]">Address:</span>
              <span className="border-b border-dotted border-[#999] flex-1 pb-0.5 min-h-[16px]">{clientAddress}</span>
            </div>
            <div className="flex items-baseline gap-2 pt-0.5">
              <div className="flex-1 flex items-baseline gap-1">
                <span className="text-[#555] min-w-[45px]">GSTIN:</span>
                <span className="font-bold border-b border-dotted border-[#999] flex-1 pb-0.5 min-h-[16px]">{clientGstin}</span>
              </div>
              <div className="flex-1 flex items-baseline gap-1">
                <span className="text-[#555] min-w-[45px]">Phone:</span>
                <span className="border-b border-dotted border-[#999] flex-1 pb-0.5 min-h-[16px]">{clientPhone}</span>
              </div>
            </div>
            {referredBy && (
              <div className="flex items-baseline gap-1 pt-0.5">
                <span className="text-[#6b1a1a] font-semibold min-w-[100px]">{referredByLabel}:</span>
                <span className="font-bold border-b border-dotted border-[#999] flex-1 pb-0.5 min-h-[16px]">{referredBy}</span>
              </div>
            )}
          </div>
        </div>

        {/* Ship To */}
        <div className="space-y-1 pl-3 border-l border-[#d9cfb8]">
          <div className="text-[#6b1a1a] font-black tracking-wider uppercase text-[10px]">SHIP TO (if different)</div>
          <div className="space-y-0.5 text-[#222]">
            <div className="flex items-baseline gap-1">
              <span className="text-[#555] min-w-[55px]">Address:</span>
              <span className="border-b border-dotted border-[#999] flex-1 pb-0.5 min-h-[16px]">{shippingAddress}</span>
            </div>
            <div className="flex items-baseline gap-1 pt-1">
              <span className="text-[#555] min-w-[100px]">Place of Supply:</span>
              <span className="font-medium border-b border-dotted border-[#999] flex-1 pb-0.5 min-h-[16px]">{placeOfSupply}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance E-Way Bill (Only if added) */}
      {ewayBillNo && (
        <div className="mb-4 p-2.5 border border-[#d9cfb8] bg-[#fdf8ee] rounded-sm text-[10.5px]">
          <span className="font-bold text-[#6b1a1a] uppercase tracking-wide block mb-1">E-Way Bill / Transport Compliance:</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[#222]">
            <div><span className="text-[#555]">E-Way Bill:</span> <strong className="font-mono">{ewayBillNo}</strong></div>
            {ewayVehicleNo && <div><span className="text-[#555]">Vehicle:</span> <strong className="font-mono">{ewayVehicleNo}</strong></div>}
            {ewayTransportMode && <div><span className="text-[#555]">Mode:</span> <span className="capitalize">{ewayTransportMode}</span></div>}
            {ewayDistance && <div><span className="text-[#555]">Distance:</span> {ewayDistance} km</div>}
          </div>
        </div>
      )}

      {/* Item Table */}
      <div className="border border-[#d9cfb8] rounded-sm overflow-hidden mb-4">
        <table className="w-full border-collapse text-[10.5px]">
          <thead>
            <tr className="bg-[#6b1a1a] text-white font-bold uppercase text-[10px]">
              <th className="py-2 px-2 text-center w-[5%] border-r border-[#8d2d2d]">#</th>
              <th className="py-2 px-3 text-left border-r border-[#8d2d2d]">Item / Service</th>
              <th className="py-2 px-2 text-center w-[13%] border-r border-[#8d2d2d]">HSN/SAC</th>
              <th className="py-2 px-2 text-center w-[9%] border-r border-[#8d2d2d]">Qty</th>
              <th className="py-2 px-2 text-right w-[14%] border-r border-[#8d2d2d]">Rate (Rs.)</th>
              <th className="py-2 px-2 text-center w-[9%] border-r border-[#8d2d2d]">GST %</th>
              <th className="py-2 px-3 text-right w-[15%]">Amount (Rs.)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#d9cfb8]">
            {lines.map((l, idx) => {
              const lineTotal = Number(l.quantity || 1) * Number(l.rate || 0);
              const lineGst = l.tax_rate ?? avgRate;
              return (
                <tr key={idx} className="border-b border-[#d9cfb8] hover:bg-neutral-50/50">
                  <td className="py-2 px-2 text-center font-medium text-neutral-600 border-r border-[#d9cfb8]">{idx + 1}</td>
                  <td className="py-2 px-3 text-left font-medium text-[#222] border-r border-[#d9cfb8]">
                    <div>{l.description || l.item_name || "Item"}</div>
                    {l.batch_number && <div className="text-[9px] text-neutral-500 font-mono">Batch: {l.batch_number}</div>}
                  </td>
                  <td className="py-2 px-2 text-center font-mono text-neutral-600 border-r border-[#d9cfb8]">{l.hsn || l.sac || "-"}</td>
                  <td className="py-2 px-2 text-center font-semibold text-neutral-800 border-r border-[#d9cfb8]">{l.quantity} {l.unit || ""}</td>
                  <td className="py-2 px-2 text-right font-medium border-r border-[#d9cfb8]">{fmt(Number(l.rate || 0))}</td>
                  <td className="py-2 px-2 text-center font-medium border-r border-[#d9cfb8]">{lineGst}%</td>
                  <td className="py-2 px-3 text-right font-bold text-[#6b1a1a]">{fmt(lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Payment Details & Summary Grid */}
      <div className="grid grid-cols-2 gap-6 items-start mb-6">
        {/* Left: Payment Details & Words */}
        <div className="space-y-3">
          <div className="border border-[#d9cfb8] p-3 rounded-sm space-y-1 text-[10.5px]">
            <div className="font-bold text-[#222] uppercase tracking-wide text-[10px] mb-1">PAYMENT DETAILS</div>
            <div className="space-y-0.5 text-[#333]">
              <div className="flex gap-1"><span className="text-[#555] min-w-[70px]">Bank:</span><span className="font-medium">{bankName || "______________________"}</span></div>
              <div className="flex gap-1"><span className="text-[#555] min-w-[70px]">A/c Name:</span><span className="font-medium">{accountName || "______________________"}</span></div>
              <div className="flex gap-1"><span className="text-[#555] min-w-[70px]">A/c No:</span><span className="font-mono font-medium">{accNo || "______________________"}</span></div>
              <div className="flex gap-1"><span className="text-[#555] min-w-[70px]">IFSC:</span><span className="font-mono font-medium">{ifsc || "______________________"}</span></div>
              <div className="flex gap-1"><span className="text-[#555] min-w-[70px]">UPI ID:</span><span className="font-mono font-medium">{upiId || "______________________"}</span></div>
            </div>
          </div>

          <div className="text-[10px] text-[#333] space-y-0.5">
            <span className="font-bold text-[#222] block">Amount in words:</span>
            <div className="italic text-[#444] border-b border-dotted border-[#999] pb-1 min-h-[20px]">
              {words}
            </div>
          </div>
        </div>

        {/* Right: Totals Box with Maroon Banner */}
        <div className="border border-[#d9cfb8] rounded-sm overflow-hidden text-[11px]">
          <div className="flex justify-between px-3 py-1.5 border-b border-[#d9cfb8]">
            <span className="text-[#555] font-medium">Subtotal</span>
            <span className="font-bold text-[#222]">Rs. {fmt(subtotal)}</span>
          </div>
          {taxTotal > 0 && !effectiveIsInterstate && (
            <>
              <div className="flex justify-between px-3 py-1.5 border-b border-[#d9cfb8]">
                <span className="text-[#555]">CGST</span>
                <span className="font-medium">Rs. {fmt(cgstAmount)}</span>
              </div>
              <div className="flex justify-between px-3 py-1.5 border-b border-[#d9cfb8]">
                <span className="text-[#555]">SGST</span>
                <span className="font-medium">Rs. {fmt(sgstAmount)}</span>
              </div>
            </>
          )}
          {taxTotal > 0 && effectiveIsInterstate && (
            <div className="flex justify-between px-3 py-1.5 border-b border-[#d9cfb8]">
              <span className="text-[#555]">IGST</span>
              <span className="font-medium">Rs. {fmt(igstAmount)}</span>
            </div>
          )}
          {discountTotal > 0 && (
            <div className="flex justify-between px-3 py-1.5 border-b border-[#d9cfb8] text-emerald-800">
              <span>Discount</span>
              <span>- Rs. {fmt(discountTotal)}</span>
            </div>
          )}
          {shippingAmount > 0 && (
            <div className="flex justify-between px-3 py-1.5 border-b border-[#d9cfb8]">
              <span className="text-[#555]">Shipping</span>
              <span className="font-medium">Rs. {fmt(shippingAmount)}</span>
            </div>
          )}

          {/* Grand Total Solid Maroon Banner */}
          <div className="bg-[#6b1a1a] text-white font-black flex justify-between px-3 py-2 text-[13px]">
            <span>GRAND TOTAL</span>
            <span>Rs. {fmt(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Notes Section (Only if added) */}
      {showNotes && notesText && (
        <div className="mb-4 p-3 border border-[#d9cfb8] bg-[#fdf8ee] rounded-sm text-[10.5px]">
          <span className="font-bold text-[#6b1a1a] uppercase tracking-wide block mb-0.5">Notes:</span>
          <div className="whitespace-pre-wrap leading-relaxed text-[#333]">{notesText}</div>
        </div>
      )}

      {/* Terms & Conditions */}
      <div className="text-[9.5px] text-[#555] mb-8 space-y-1">
        <span className="font-bold text-[#333] block">Terms & Conditions:</span>
        <ol className="list-decimal list-inside space-y-0.5 leading-snug pl-1">
          <li>Payment is due within 15 days. Late payments incur interest at 18% p.a.</li>
          <li>Goods/services are as described in this invoice. Report any dispute within 7 days.</li>
          <li>This is a computer-generated invoice; signature is not required where applicable.</li>
        </ol>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-8 items-end mb-6 text-[10.5px]">
        <div className="text-center">
          <div className="w-48 mx-auto border-t border-[#444] pt-1 text-[#444] font-medium">
            Customer Signature
          </div>
        </div>

        <div className="text-center">
          <div className="text-[10.5px] font-bold text-[#222] mb-1">
            For {org?.name || "YOUR BUSINESS NAME"}
          </div>
          {org?.signature_url ? (
            <img src={org.signature_url} alt="Signature" className="max-h-12 object-contain mx-auto mb-1" />
          ) : (
            <div className="h-10" />
          )}
          <div className="w-56 mx-auto border-t border-[#444] pt-1 text-[#222] font-bold">
            Authorised Signatory
          </div>
        </div>
      </div>

      {/* Bottom Center Greeting */}
      <div className="text-center text-[#6b1a1a] font-bold text-sm tracking-wide pt-2">
        Thank you for your business!
      </div>
    </div>
  );
}
