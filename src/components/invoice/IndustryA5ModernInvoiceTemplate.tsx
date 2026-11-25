import React from "react";
import { Phone, Mail, MapPin } from "lucide-react";
import { computeDocumentTotals } from "@/lib/invoiceCalculations";

interface IndustryA5ModernInvoiceTemplateProps {
  org: any;
  invoice: any;
  lines: any[];
  fmt: (n: number) => string;
  type?: "invoice" | "estimate" | "bill" | "po";
  taxBreakdown?: { name: string; amount: number; rate?: number }[];
  isInterstate?: boolean;
  showSignature?: boolean;
}

export function IndustryA5ModernInvoiceTemplate({
  org,
  invoice,
  lines,
  fmt,
  type = "invoice",
  taxBreakdown = [],
  isInterstate = false,
  showSignature = true,
}: IndustryA5ModernInvoiceTemplateProps) {
  const cyanColor = "#0284c7"; // Cyan / Sky Blue
  const darkSlate = "#111827"; // Dark slate / Black

  const snapshot = (invoice?.metadata as any) || {};
  const hasGst = snapshot.has_gst !== undefined
    ? Boolean(snapshot.has_gst)
    : Boolean((org?.gst_number || org?.tax_number)?.trim() && org?.gst_enabled !== false);

  const rawBillToObj = invoice?.billing_address || (invoice?.clients as any)?.billing_address;
  const parsedBillTo = typeof rawBillToObj === "string" ? (() => { try { return JSON.parse(rawBillToObj); } catch { return null; } })() : rawBillToObj;

  const rawClientName = (invoice?.metadata as any)?.client_name || (parsedBillTo && typeof parsedBillTo === "object" ? parsedBillTo.name : null) || (invoice.clients as any)?.display_name || (invoice.clients as any)?.company_name || (invoice.vendors as any)?.name || (invoice as any)?.client_name || "";
  const clientName = (rawClientName === "Walk-in Customer") ? "" : rawClientName;
  const clientCompany = (invoice.clients as any)?.company_name && (invoice.clients as any)?.company_name !== clientName ? (invoice.clients as any)?.company_name : "";
  const referredBy = (invoice?.metadata as any)?.referred_by;
  const referredByLabel = (invoice?.metadata as any)?.referred_by_label || "Referred By";
  const clientPhone = (invoice?.metadata as any)?.client_mobile || (parsedBillTo && typeof parsedBillTo === "object" ? parsedBillTo.phone : null) || (invoice.clients as any)?.phone || (invoice.vendors as any)?.phone || invoice.client_phone || "";
  const clientEmail = (invoice?.clients as any)?.email || (invoice?.vendors as any)?.email || "";
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
  const orgAddressStr = addressLines.length > 0 ? addressLines.join(", ") : (org?.city ? `${org.city}, ${org?.state || ""}` : "123, Industrial Area, Phase II");

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

  const clientCity = extractCity(parsedShipTo) || extractCity(parsedBillTo) || (invoice.clients as any)?.city || (invoice.clients as any)?.billing_address?.city || (invoice.clients as any)?.shipping_address?.city || "";
  const placeOfSupply = clientCity || invoice?.place_of_supply || (invoice.clients as any)?.state || org?.city || org?.state || "";

  // Totals calculation using single source of truth
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

  const titleText = type === "estimate" ? "QUOTATION" : type === "po" ? "PURCHASE ORDER" : type === "bill" ? "PURCHASE INVOICE" : (hasGst ? "TAX INVOICE" : "INVOICE");

  const formatDate = (d: any) => {
    if (!d) return "-";
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  // Bank details resolution
  const invBank = invoice?.bank_details ? (typeof invoice.bank_details === "string" ? (() => { try { return JSON.parse(invoice.bank_details); } catch { return null; } })() : invoice.bank_details) : null;
  const orgBank = org?.bank_details ? (typeof org.bank_details === "string" ? (() => { try { return JSON.parse(org.bank_details); } catch { return null; } })() : org.bank_details) : null;

  const bankName = invBank?.bank_name || orgBank?.bank_name || org?.bank_name || org?.template_bank_name || "";
  const bankAccName = invBank?.bank_account_name || invBank?.account_name || invBank?.account_holder_name || orgBank?.bank_account_name || orgBank?.account_name || org?.bank_account_name || org?.name || "";
  const bankAccNum = invBank?.bank_account_number || invBank?.account_number || invBank?.account_no || orgBank?.bank_account_number || orgBank?.account_no || orgBank?.acc_no || org?.bank_account_number || org?.bank_account_no || org?.bank_acc_number || org?.template_bank_account_no || "";
  const bankIfsc = invBank?.bank_ifsc || invBank?.ifsc || orgBank?.bank_ifsc || orgBank?.ifsc || org?.bank_ifsc || org?.template_bank_ifsc || "";
  const bankBranch = invBank?.bank_branch || invBank?.branch || orgBank?.bank_branch || orgBank?.branch || org?.bank_branch || "";

  return (
    <div
      className="invoice-printable relative bg-white text-slate-800 font-sans shadow-sm overflow-hidden"
      style={{
        maxWidth: "148mm",
        minHeight: "210mm",
        margin: "0 auto",
        padding: "18px 20px 24px 20px",
        boxSizing: "border-box",
        fontSize: "10.5px",
        lineHeight: 1.35,
      }}
    >
      {/* ── TOP HEADER ── */}
      <div className="flex items-start justify-between gap-4 pb-3">
        {/* Company Logo & Brand */}
        <div className="max-w-[55%]">
          <div className="flex items-center gap-2.5 pb-1.5 border-b-2 border-slate-900">
            {org?.logo_url ? (
              <img src={org.logo_url} alt="Logo" className="h-9 w-auto max-w-[100px] object-contain" />
            ) : (
              <div
                className="w-8 h-8 rounded flex items-center justify-center font-black text-white text-base shrink-0 shadow-sm"
                style={{ backgroundColor: cyanColor }}
              >
                {(org?.name || "C")[0]}
              </div>
            )}
            <div>
              <div className="font-extrabold text-base tracking-tight text-slate-900 leading-tight uppercase">
                {org?.name || "COMPANY"}
              </div>
              <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
                {org?.tagline || org?.industry_category || "INDUSTRIAL EXCELLENCE"}
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Title & Metadata */}
        <div className="text-right">
          <div className="text-2xl font-black tracking-tight uppercase" style={{ color: cyanColor }}>
            {titleText}
          </div>
          <div className="mt-1 space-y-0.5 text-[10px]">
            <div className="flex justify-end gap-1.5">
              <span className="text-slate-500 font-medium">Invoice Number :</span>
              <span className="font-bold text-slate-900 font-mono">{number || "INV-0001"}</span>
            </div>
            <div className="flex justify-end gap-1.5">
              <span className="text-slate-500 font-medium">Invoice Date :</span>
              <span className="font-semibold text-slate-900">{formatDate(invoice.issue_date || new Date())}</span>
            </div>
          </div>
          <div className="h-0.5 w-full mt-1.5" style={{ backgroundColor: cyanColor }} />
        </div>
      </div>

      {/* ── INVOICE TO SECTION ── */}
      <div className="mt-2.5 mb-3.5">
        <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: cyanColor }}>
          INVOICE TO:
        </div>
        <div className="font-extrabold text-sm text-slate-900">
          {clientName || "Walk-in Customer"}
        </div>
        {clientCompany && (
          <div className="text-xs text-slate-700 font-medium">{clientCompany}</div>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[10px] text-slate-600 mt-0.5">
          {clientPhone && (
            <div><span className="font-medium text-slate-500">Phone :</span> {clientPhone}</div>
          )}
          {clientEmail && (
            <div><span className="font-medium text-slate-500">Email :</span> {clientEmail}</div>
          )}
          {placeOfSupply && (
            <div><span className="font-medium text-slate-500">Place of Supply :</span> <span className="font-semibold text-slate-800">{placeOfSupply}</span></div>
          )}
          {referredBy && (
            <div className="font-medium text-slate-800">
              <span className="text-slate-500">{referredByLabel} :</span> {referredBy}
            </div>
          )}
        </div>
      </div>

      {/* ── PRODUCT TABLE ── */}
      <div className="mt-2">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th
                className="text-left font-bold text-white text-[10px] py-1.5 px-2 uppercase tracking-wider"
                style={{ backgroundColor: cyanColor, width: "36px" }}
              >
                NO.
              </th>
              <th
                className="text-left font-bold text-white text-[10px] py-1.5 px-2 uppercase tracking-wider relative"
                style={{ backgroundColor: cyanColor }}
              >
                PRODUCT DESCRIPTION
              </th>
              <th
                className="text-right font-bold text-white text-[10px] py-1.5 px-2.5 uppercase tracking-wider"
                style={{ backgroundColor: darkSlate, width: "70px" }}
              >
                PRICE
              </th>
              <th
                className="text-center font-bold text-white text-[10px] py-1.5 px-2 uppercase tracking-wider"
                style={{ backgroundColor: darkSlate, width: "65px" }}
              >
                QUANTITY
              </th>
              <th
                className="text-right font-bold text-white text-[10px] py-1.5 px-2.5 uppercase tracking-wider"
                style={{ backgroundColor: darkSlate, width: "75px" }}
              >
                TOTAL
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((l, idx) => {
              const qty = Number(l.quantity || 1);
              const rate = Number(l.rate || 0);
              const lineTotal = Number(l.amount ?? (qty * rate));
              const lineNum = String(idx + 1).padStart(2, "0");

              return (
                <tr key={l.id || idx} className="hover:bg-slate-50/50">
                  <td className="py-1.5 px-2 text-slate-500 font-mono text-[10px] font-medium align-top">
                    {lineNum}
                  </td>
                  <td className="py-1.5 px-2 text-slate-800 align-top">
                    <div className="font-semibold text-slate-900 leading-tight">
                      {l.name || l.description || "Product / Service Description"}
                    </div>
                    {l.description && l.description !== l.name && (
                      <div className="text-[9.5px] text-slate-500 leading-snug mt-0.5 line-clamp-2">
                        {l.description}
                      </div>
                    )}
                    {l.batch_no && (
                      <span className="inline-block mt-0.5 text-[8.5px] font-mono px-1 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                        Batch: {l.batch_no}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 px-2.5 text-right font-mono font-medium text-slate-800 align-top">
                    {fmt(rate)}
                  </td>
                  <td className="py-1.5 px-2 text-center text-slate-700 font-medium align-top">
                    {qty} {l.unit ? <span className="text-[9px] uppercase text-slate-500">{l.unit}</span> : ""}
                  </td>
                  <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900 align-top">
                    {fmt(lineTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── SETTLEMENT & TOTALS ── */}
      <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 gap-4">
        {/* Left: Payment Method & Signature */}
        <div className="pr-2 border-r border-slate-200 flex flex-col justify-between">
          <div>
            <div className="font-bold text-xs text-slate-900 uppercase tracking-tight mb-1.5">
              Payment Method
            </div>
            <div className="space-y-0.5 text-[9.5px] text-slate-600">
              <div className="flex">
                <span className="w-24 text-slate-500 font-medium">Account No.</span>
                <span className="font-mono font-semibold text-slate-800">: {bankAccNum || "—"}</span>
              </div>
              <div className="flex">
                <span className="w-24 text-slate-500 font-medium">Account Name</span>
                <span className="font-semibold text-slate-800">: {bankAccName || "—"}</span>
              </div>
              <div className="flex">
                <span className="w-24 text-slate-500 font-medium">Branch Name</span>
                <span className="text-slate-800">: {bankBranch || bankName || "—"}</span>
              </div>
              {bankIfsc && (
                <div className="flex">
                  <span className="w-24 text-slate-500 font-medium">IFSC Code</span>
                  <span className="font-mono font-semibold text-slate-800">: {bankIfsc}</span>
                </div>
              )}
            </div>
          </div>

          {/* Signature */}
          {showSignature && (
            <div className="mt-4 pt-2">
              <div className="font-serif italic text-base text-slate-800 font-bold mb-0.5">
                {org?.name ? org.name.split(" ")[0] : "Authorized"}
              </div>
              <div className="w-36 border-t border-slate-800 pt-0.5 text-[9.5px] font-bold text-slate-900 uppercase tracking-tight">
                Your Name & Signature
              </div>
              <div className="text-[8.5px] text-slate-500">Designation / Authorized Signatory</div>
            </div>
          )}
        </div>

        {/* Right: Subtotal, Discount, Expenses, Shipping, Tax, Grand Total Box */}
        <div className="flex flex-col justify-between pl-2">
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-600 font-medium">Subtotal :</span>
              <span className="font-mono font-semibold text-slate-900">{fmt(subtotalVal)}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between items-center py-0.5 text-red-600">
                <span>Discount :</span>
                <span className="font-mono font-semibold">(-) {fmt(discountAmt)}</span>
              </div>
            )}
            {expensesAmt > 0 && (
              <div className="flex justify-between items-center py-0.5 text-slate-800">
                <span>Fixed Cost (Exp) :</span>
                <span className="font-mono font-semibold">(+) {fmt(expensesAmt)}</span>
              </div>
            )}
            {shippingAmt > 0 && (
              <div className="flex justify-between items-center py-0.5 text-slate-800">
                <span>Shipping :</span>
                <span className="font-mono font-semibold">(+) {fmt(shippingAmt)}</span>
              </div>
            )}
            {(discountAmt > 0 || expensesAmt > 0 || shippingAmt > 0 || hasGst) && (
              <div className="flex justify-between items-center py-0.5 font-bold text-slate-900 bg-slate-100/80 px-1 rounded">
                <span>Taxable Amount :</span>
                <span className="font-mono">{fmt(taxableAmount)}</span>
              </div>
            )}
            {hasGst && (
              gstBreakdown.length > 0 ? (
                gstBreakdown.map((t, idx) => (
                  <div key={idx} className="flex justify-between text-slate-700 py-0.5">
                    <span>{t.name} :</span>
                    <span className="font-mono">(+) {fmt(t.amount)}</span>
                  </div>
                ))
              ) : totalTaxAmt > 0 ? (
                <div className="flex justify-between items-center py-0.5 text-slate-700">
                  <span>{effectiveIsInterstate ? "IGST :" : "Tax :"}</span>
                  <span className="font-mono font-semibold">(+) {fmt(totalTaxAmt)}</span>
                </div>
              ) : null
            )}
            {effectiveAdjustment !== 0 && (
              <div className="flex justify-between items-center py-0.5 text-slate-600 text-[9px]">
                <span>{effectiveAdjustmentName} :</span>
                <span className="font-mono">{effectiveAdjustment > 0 ? "+" : ""}{fmt(effectiveAdjustment)}</span>
              </div>
            )}
          </div>

          {/* Solid Cyan Grand Total Banner */}
          <div
            className="mt-3 px-3 py-2 text-white flex justify-between items-center rounded-sm shadow-sm"
            style={{ backgroundColor: cyanColor }}
          >
            <span className="font-bold uppercase tracking-wider text-xs">Total :</span>
            <span className="font-black text-sm font-mono tracking-tight">{fmt(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Notes Section (Only shown if added) */}
      {showNotes && notesText && (
        <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded text-[8.5px] text-slate-700">
          <span className="font-bold text-slate-900 uppercase tracking-wide block mb-0.5">Notes:</span>
          <div className="whitespace-pre-wrap leading-tight">{notesText}</div>
        </div>
      )}

      {/* ── FOOTER: CONTACT BADGES & TERMS ── */}
      <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 gap-4">
        {/* Left: Thank You & Contact Badges */}
        <div className="pr-2 border-r border-slate-200 space-y-2">
          <div className="font-extrabold text-xs uppercase tracking-tight" style={{ color: cyanColor }}>
            Thank You For Your Business
          </div>
          <div className="space-y-1.5 text-[9px] text-slate-600">
            {org?.phone && (
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded flex items-center justify-center text-white shrink-0" style={{ backgroundColor: cyanColor }}>
                  <Phone className="w-2.5 h-2.5" />
                </div>
                <span className="font-medium text-slate-800">{org.phone}</span>
              </div>
            )}
            {org?.email && (
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded flex items-center justify-center text-white shrink-0" style={{ backgroundColor: cyanColor }}>
                  <Mail className="w-2.5 h-2.5" />
                </div>
                <span className="font-medium text-slate-800 truncate">{org.email}</span>
              </div>
            )}
            <div className="flex items-start gap-1.5">
              <div className="w-4 h-4 rounded flex items-center justify-center text-white shrink-0 mt-0.5" style={{ backgroundColor: cyanColor }}>
                <MapPin className="w-2.5 h-2.5" />
              </div>
              <span className="text-slate-700 leading-tight">{orgAddressStr}</span>
            </div>
          </div>
        </div>

        {/* Right: Terms & Conditions */}
        <div className="pl-2">
          <div className="font-bold text-xs text-slate-900 uppercase tracking-tight mb-1">
            Terms & Conditions:
          </div>
          <ul className="list-disc pl-3 text-[8.5px] text-slate-600 space-y-0.5 leading-snug">
            {invoice.terms ? (
              invoice.terms.split("\n").filter(Boolean).map((t: string, idx: number) => (
                <li key={idx}>{t.replace(/^\d+[\.\)]\s*/, "")}</li>
              ))
            ) : (
              <>
                <li>Payment is due within 15 days from invoice date.</li>
                <li>Late payment may incur additional statutory charges.</li>
                <li>Goods once sold are not returnable or exchangeable.</li>
                <li>All disputes are subject to local jurisdiction.</li>
              </>
            )}
          </ul>
        </div>
      </div>

      {/* ── BOTTOM LEFT DECORATIVE SHAPE ── */}
      <div
        className="absolute bottom-0 left-0 w-24 h-7 pointer-events-none"
        style={{
          backgroundColor: cyanColor,
          clipPath: "polygon(0% 0%, 85% 100%, 0% 100%)",
        }}
      />
    </div>
  );
}
