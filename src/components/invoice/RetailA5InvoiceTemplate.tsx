import React from "react";
import { resolveLineTaxRate, computeDocumentTotals } from "@/lib/invoiceCalculations";
import { Phone, Mail, MapPin } from "lucide-react";
import { isRetailOrg } from "@/lib/business-category";

interface RetailA5InvoiceTemplateProps {
  org: any;
  invoice: any;
  lines: any[];
  fmt: (n: number) => string;
  type?: "invoice" | "estimate" | "bill" | "po";
  taxBreakdown?: { name: string; amount: number; rate?: number }[];
  isInterstate?: boolean;
  showSignature?: boolean;
}

export function RetailA5InvoiceTemplate({
  org,
  invoice,
  lines,
  fmt,
  type = "invoice",
  taxBreakdown = [],
  isInterstate = false,
  showSignature = true,
}: RetailA5InvoiceTemplateProps) {
  const primaryBlue = "#004b87";
  const lightBlue = "#0088cc";
  const softBlueBg = "#f0f8ff";
  const borderColor = "#cbd5e1";

  const snapshot = (invoice?.metadata as any) || {};
  const hasGst = snapshot.has_gst !== undefined
    ? Boolean(snapshot.has_gst)
    : Boolean((org?.gst_number || org?.tax_number)?.trim() && org?.gst_enabled !== false);

  const rawBillToObj = invoice?.billing_address || (invoice?.clients as any)?.billing_address;
  const parsedBillTo = typeof rawBillToObj === "string" ? (() => { try { return JSON.parse(rawBillToObj); } catch { return null; } })() : rawBillToObj;

  const rawClientName = (invoice?.metadata as any)?.client_name || (parsedBillTo && typeof parsedBillTo === "object" ? parsedBillTo.name : null) || (invoice.clients as any)?.display_name || (invoice.clients as any)?.company_name || (invoice.vendors as any)?.name || (invoice as any)?.client_name || "";
  // If customer name is not given or is default "Walk-in Customer", keep it blank
  const clientName = (rawClientName === "Walk-in Customer") ? "" : rawClientName;
  const referredBy = (invoice?.metadata as any)?.referred_by;
  const referredByLabel = (invoice?.metadata as any)?.referred_by_label || "Referred By";
  const showNotes = (invoice?.metadata as any)?.show_notes !== false;
  const notesText = (invoice.notes || (invoice?.metadata as any)?.notes || "")?.trim();
  const ewayBillNo = (invoice as any)?.eway_bill_no || (invoice?.metadata as any)?.eway_bill_no;
  const ewayVehicleNo = (invoice as any)?.eway_vehicle_no || (invoice?.metadata as any)?.eway_vehicle_no;
  const clientPhone = (invoice?.metadata as any)?.client_mobile || (parsedBillTo && typeof parsedBillTo === "object" ? parsedBillTo.phone : null) || (invoice.clients as any)?.phone || (invoice.vendors as any)?.phone || invoice.client_phone || "";
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
  const orgAddressStr = addressLines.length > 0 ? addressLines.join(", ") : (org?.city ? `${org.city}, ${org?.state || ""}` : "123, Business Road, City");

  // Totals calculation
  const subtotal = Number(invoice.subtotal ?? lines.reduce((acc, l) => acc + (Number(l.quantity || 1) * Number(l.rate || 0)), 0));
  const discountTotal = Number(invoice.total_discount ?? invoice.discount_amount ?? 0);
  const taxTotal = Number(invoice.tax_total ?? invoice.total_tax ?? 0);
  const grandTotal = Number(invoice.total ?? (subtotal - discountTotal + taxTotal));

  const titleText = type === "estimate" ? "ESTIMATE" : type === "po" ? "PURCHASE ORDER" : type === "bill" ? "PURCHASE BILL" : (hasGst ? "INVOICE" : "INVOICE");

  // Format date helper
  const formatDate = (d: any) => {
    if (!d) return "-";
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  // Lines to display (only show as many rows as there are items)
  const displayLines = [...lines];

  return (
    <div
      className="invoice-printable relative bg-white text-slate-800 font-sans shadow-sm overflow-hidden"
      style={{
        maxWidth: "148mm",
        minHeight: "210mm",
        margin: "0 auto",
        padding: "16px 20px 30px 20px",
        boxSizing: "border-box",
        fontSize: "11px",
        lineHeight: 1.4,
      }}
    >
      {/* ── TOP HEADER ── */}
      <div className="relative pb-3.5 border-b-2" style={{ borderColor: primaryBlue }}>
        {/* Top Right Decorative Angled Banner */}
        <div className="absolute -top-4 -right-5 flex items-start pointer-events-none">
          {/* Subtle light blue diagonal lines */}
          <div className="w-16 h-12 bg-sky-200/60 -skew-x-12 mr-[-10px] transform origin-top-right"></div>
          <div
            className="px-6 py-2 text-white font-black tracking-wider text-base uppercase shadow-sm"
            style={{
              backgroundColor: primaryBlue,
              clipPath: "polygon(15% 0%, 100% 0%, 100% 100%, 0% 100%)",
              minWidth: "130px",
              textAlign: "right",
              paddingRight: "22px",
            }}
          >
            {titleText}
          </div>
        </div>

        {/* Top Left Company Brand */}
        <div className="flex items-start gap-2.5 max-w-[65%]">
          {org?.logo_url ? (
            <img
              src={org.logo_url}
              alt={org.name || "Business Logo"}
              className="w-10 h-10 object-contain rounded shrink-0 mt-0.5"
            />
          ) : (
            <div
              className="w-10 h-10 rounded flex items-center justify-center shrink-0 text-white font-bold"
              style={{ backgroundColor: primaryBlue }}
            >
              <svg className="w-6 h-6 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
          )}
          <div>
            <h1 className="text-base font-black uppercase tracking-tight" style={{ color: primaryBlue }}>
              {org?.name || "Your Business Name"}
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">
              {(org as any)?.tagline || (org as any)?.business_type || "Retail & General Store"}
            </p>
            <div className="mt-1 space-y-1 text-[10px] text-slate-600 leading-normal">
              {org?.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-2.5 h-2.5 shrink-0" style={{ color: primaryBlue }} />
                  <span>{org.phone}</span>
                </div>
              )}
              {org?.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-2.5 h-2.5 shrink-0" style={{ color: primaryBlue }} />
                  <span>{org.email}</span>
                </div>
              )}
              <div className="flex items-start gap-1.5 pt-0.5">
                <MapPin className="w-2.5 h-2.5 shrink-0 mt-0.5" style={{ color: primaryBlue }} />
                <span className="break-words max-w-[280px] leading-snug">{orgAddressStr}</span>
              </div>
              {org?.gst_number && (
                <div className="text-[10px] font-semibold text-slate-800 pt-0.5 tracking-tight">
                  GSTIN: {org.gst_number}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── METADATA ROW ── */}
      <div className="grid grid-cols-2 gap-3 my-3 items-center">
        {/* Left: Customer Info */}
        <div className="space-y-1 text-[10.5px]">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700 shrink-0">Customer Name :</span>
            <span className="border-b border-slate-400 font-semibold text-slate-900 pb-0.5 flex-1 truncate min-h-[16px]">
              {clientName || ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-700 shrink-0">Phone No. :</span>
            <span className="border-b border-slate-400 font-medium text-slate-900 pb-0.5 flex-1 truncate min-h-[16px]">
              {clientPhone || ""}
            </span>
          </div>
          {referredBy && (
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700 shrink-0">{referredByLabel} :</span>
              <span className="border-b border-slate-400 font-bold text-slate-900 pb-0.5 flex-1 truncate">
                {referredBy}
              </span>
            </div>
          )}
        </div>

        {/* Right: Boxed Invoice Info */}
        <div className="justify-self-end w-full max-w-[190px]">
          <div
            className="rounded-lg border-2 p-2 space-y-1 text-[10.5px] shadow-2xs"
            style={{ borderColor: lightBlue, backgroundColor: softBlueBg }}
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-700">Invoice No.</span>
              <span className="font-extrabold text-slate-900">: {number}</span>
            </div>
            <div className="flex justify-between items-center border-t border-sky-200/80 pt-1">
              <span className="font-bold text-slate-700">Invoice Date</span>
              <span className="font-semibold text-slate-900">: {formatDate(invoice.issue_date || invoice.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ITEMS TABLE ── */}
      <div className="rounded-md overflow-hidden border border-slate-200 mb-3 shadow-2xs">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr style={{ backgroundColor: primaryBlue }} className="text-white">
              <th className="py-1.5 px-2 text-center font-bold border-r border-sky-700/60 w-[8%]">S. No.</th>
              <th className="py-1.5 px-2 text-left font-bold border-r border-sky-700/60 w-[42%]">Description</th>
              <th className="py-1.5 px-2 text-center font-bold border-r border-sky-700/60 w-[12%]">Qty</th>
              <th className="py-1.5 px-2 text-right font-bold border-r border-sky-700/60 w-[13%]">Rate (₹)</th>
              <th className="py-1.5 px-2 text-center font-bold border-r border-sky-700/60 w-[11%]">Tax (%)</th>
              <th className="py-1.5 px-2 text-right font-bold w-[14%]">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {displayLines.map((line, idx) => {
              const itemName = line.name || line.items?.name || line.item?.name || line.item_name || (line.description ? String(line.description).split("\n")[0] : "") || "Item";
              const qty = Number(line.quantity || 1);
              const rate = Number(line.rate || 0);
              const taxRate = resolveLineTaxRate(line);
              const lineAmount = Number(line.line_total || (qty * rate));

              return (
                <tr key={line.id || idx} className={idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}>
                  <td className="py-1.5 px-2 text-center border-t border-r border-slate-200 text-slate-600 font-medium">
                    {idx + 1}.
                  </td>
                  <td className="py-1.5 px-2 text-left border-t border-r border-slate-200 font-semibold text-slate-900">
                    <div>{itemName}</div>
                    <div className="flex items-center gap-2">
                      {line.hsn_code && (
                        <span className="text-[8.5px] text-slate-400 font-normal">HSN: {line.hsn_code}</span>
                      )}
                      {line.batch_no && (
                        <span className="text-[8.5px] text-slate-500 font-normal">Batch: {line.batch_no}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-1.5 px-2 text-center border-t border-r border-slate-200 font-medium text-slate-800">
                    {qty} {line.unit || ""}
                  </td>
                  <td className="py-1.5 px-2 text-right border-t border-r border-slate-200 font-medium text-slate-800">
                    {rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1.5 px-2 text-center border-t border-r border-slate-200 text-slate-600">
                    {taxRate ? `${taxRate}%` : "0%"}
                  </td>
                  <td className="py-1.5 px-2 text-right border-t border-slate-200 font-bold text-slate-900">
                    {lineAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── TOTALS TABLE (BOTTOM RIGHT) ── */}
      <div className="flex justify-end mb-4">
        <div
          className="w-56 rounded-lg overflow-hidden border text-[10.5px] shadow-2xs"
          style={{ borderColor: primaryBlue }}
        >
          <div className="p-2 space-y-1 bg-white">
            <div className="flex justify-between items-center text-slate-600 font-semibold">
              <span>Subtotal</span>
              <span className="text-slate-900">₹ {subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between items-center text-rose-600 font-semibold">
                <span>Discount</span>
                <span>(-) ₹ {discountTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-slate-600 font-semibold">
              <span>Tax</span>
              <span className="text-slate-900">(+) ₹ {taxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          {/* Highlighted Grand Total Row */}
          <div
            className="px-2.5 py-1.5 flex justify-between items-center text-white font-extrabold text-[11.5px]"
            style={{ backgroundColor: primaryBlue }}
          >
            <span>Total Amount</span>
            <span>₹ {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* ── FOOTER ROW ── */}
      <div className="flex justify-between items-end mt-4 pt-2 text-[10px]">
        <div className="text-slate-600 italic font-semibold">
          Thank you for your business!
        </div>
        {showSignature && (
          <div className="text-center w-40">
            <div className="border-b border-slate-400 mb-1 h-8"></div>
            <span className="text-[9.5px] font-bold text-slate-600">Authorized Signature</span>
          </div>
        )}
      </div>

      {/* ── BOTTOM DECORATIVE WAVES ── */}
      <div className="absolute bottom-0 left-0 right-0 h-4 overflow-hidden pointer-events-none">
        <svg viewBox="0 0 500 40" preserveAspectRatio="none" className="w-full h-full">
          <path d="M0,20 C150,40 350,0 500,20 L500,40 L0,40 Z" fill={lightBlue} opacity="0.6" />
          <path d="M0,25 C200,10 300,35 500,25 L500,40 L0,40 Z" fill={primaryBlue} />
        </svg>
      </div>
    </div>
  );
}
