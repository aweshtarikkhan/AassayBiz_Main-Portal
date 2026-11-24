import React from "react";
import { Phone, MapPin, Globe } from "lucide-react";

interface IndustryA5ClassicInvoiceTemplateProps {
  org: any;
  invoice: any;
  lines: any[];
  fmt: (n: number) => string;
  type?: "invoice" | "estimate" | "bill" | "po";
  taxBreakdown?: { name: string; amount: number; rate?: number }[];
  isInterstate?: boolean;
  showSignature?: boolean;
}

export function IndustryA5ClassicInvoiceTemplate({
  org,
  invoice,
  lines,
  fmt,
  type = "invoice",
  taxBreakdown = [],
  isInterstate = false,
  showSignature = true,
}: IndustryA5ClassicInvoiceTemplateProps) {
  const snapshot = (invoice?.metadata as any) || {};
  const hasGst = snapshot.has_gst !== undefined
    ? Boolean(snapshot.has_gst)
    : Boolean((org?.gst_number || org?.tax_number)?.trim() && org?.gst_enabled !== false);

  const rawBillToObj = invoice?.billing_address || (invoice?.clients as any)?.billing_address;
  const parsedBillTo = typeof rawBillToObj === "string" ? (() => { try { return JSON.parse(rawBillToObj); } catch { return null; } })() : rawBillToObj;

  const rawShipToObj = invoice?.shipping_address || (invoice?.clients as any)?.shipping_address;
  const parsedShipTo = typeof rawShipToObj === "string" ? (() => { try { return JSON.parse(rawShipToObj); } catch { return null; } })() : rawShipToObj;

  const rawClientName = (invoice?.metadata as any)?.client_name || (parsedBillTo && typeof parsedBillTo === "object" ? parsedBillTo.name : null) || (invoice.clients as any)?.display_name || (invoice.clients as any)?.company_name || (invoice.vendors as any)?.name || (invoice as any)?.client_name || "";
  const clientName = (rawClientName === "Walk-in Customer") ? "" : rawClientName;
  const referredBy = (invoice?.metadata as any)?.referred_by;
  const referredByLabel = (invoice?.metadata as any)?.referred_by_label || "Referred By";
  const clientPhone = (invoice?.metadata as any)?.client_mobile || (parsedBillTo && typeof parsedBillTo === "object" ? parsedBillTo.phone : null) || (invoice.clients as any)?.phone || (invoice.vendors as any)?.phone || invoice.client_phone || "";
  const showNotes = (invoice?.metadata as any)?.show_notes !== false;
  const notesText = (invoice.notes || (invoice?.metadata as any)?.notes || "")?.trim();
  const ewayBillNo = (invoice as any)?.eway_bill_no || (invoice?.metadata as any)?.eway_bill_no;
  const ewayVehicleNo = (invoice as any)?.eway_vehicle_no || (invoice?.metadata as any)?.eway_vehicle_no;
  const ewayTransportMode = (invoice as any)?.eway_transport_mode || (invoice?.metadata as any)?.eway_transport_mode;
  const ewayDistance = (invoice as any)?.eway_distance_km || (invoice?.metadata as any)?.eway_distance_km;
  const number = type === "estimate" ? invoice.estimate_number : (type === "po" ? invoice.po_number : (type === "bill" ? invoice.bill_number : invoice.invoice_number));

  const formatAddressObj = (obj: any) => {
    if (!obj || typeof obj !== "object") return { street: "", cityLine: "" };
    const street = obj.street || obj.address || "";
    const cityParts = [obj.city, obj.state, obj.zip || obj.postal_code || obj.pincode].filter(Boolean);
    return { street, cityLine: cityParts.join(", ") };
  };

  const billAddress = formatAddressObj(parsedBillTo);
  const shipAddress = formatAddressObj(parsedShipTo);

  const addressLines: string[] = [];
  if (org?.address) {
    try {
      const a = typeof org.address === "string" ? JSON.parse(org.address) : org.address;
      if (a?.street) addressLines.push(a.street);
      const cityLine = [a?.city, a?.state, a?.zip].filter(Boolean).join(", ");
      if (cityLine) addressLines.push(cityLine);
    } catch {}
  }
  const orgAddressStr = addressLines.length > 0 ? addressLines.join(", ") : (org?.city ? `${org.city}, ${org?.state || ""}` : "Your Address, City, State, ZIP Code");

  // Totals calculation
  const subtotal = Number(invoice.subtotal ?? lines.reduce((acc, l) => acc + (Number(l.quantity || 1) * Number(l.rate || 0)), 0));
  const discountTotal = Number(invoice.total_discount ?? invoice.discount_amount ?? 0);
  const taxTotal = Number(invoice.tax_total ?? invoice.total_tax ?? 0);
  const grandTotal = Number(invoice.total ?? (subtotal - discountTotal + taxTotal));

  const titleText = type === "estimate" ? "QUOTATION" : type === "po" ? "PURCHASE ORDER" : type === "bill" ? "PURCHASE INVOICE" : (hasGst ? "TAX INVOICE" : "INVOICE");

  const formatDate = (d: any) => {
    if (!d) return "-";
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  // Bank Details
  const bankAccNum = org?.bank_account_number || org?.bank_account_no || "";
  const bankAccName = org?.bank_account_name || org?.name || "";
  const bankName = org?.bank_name || "";
  const bankIfsc = org?.bank_ifsc || "";

  return (
    <div
      className="invoice-printable relative bg-white text-slate-900 font-sans shadow-sm overflow-hidden"
      style={{
        maxWidth: "148mm",
        minHeight: "210mm",
        margin: "0 auto",
        padding: "18px 20px 22px 20px",
        boxSizing: "border-box",
        fontSize: "10px",
        lineHeight: 1.35,
      }}
    >
      {/* ── HEADER ── */}
      <div className="flex items-start justify-between gap-4 pb-3">
        {/* Company Logo & Brand */}
        <div className="flex items-center gap-2.5 max-w-[60%]">
          {org?.logo_url ? (
            <img src={org.logo_url} alt="Logo" className="h-10 w-auto max-w-[90px] object-contain" />
          ) : (
            <div className="w-9 h-9 bg-black rounded flex items-center justify-center font-black text-white text-base shrink-0">
              {(org?.name || "C")[0]}
            </div>
          )}
          <div>
            <div className="font-black text-base tracking-tight text-black uppercase leading-tight">
              {org?.name || "COMPANY NAME"}
            </div>
            <div className="text-[8.5px] font-semibold text-slate-500 uppercase tracking-wider">
              {org?.tagline || org?.industry_category || "COMPANY TAGLINE HERE"}
            </div>
          </div>
        </div>

        {/* Invoice Title & Dates */}
        <div className="text-right">
          <div className="text-2xl font-black tracking-tight text-black uppercase">
            {titleText}
          </div>
          <div className="mt-1 space-y-0.5 text-[9.5px]">
            <div className="flex justify-end gap-1.5 font-medium">
              <span className="text-slate-500">DATE:</span>
              <span className="font-bold text-black">{formatDate(invoice.issue_date || new Date())}</span>
            </div>
            {invoice.due_date && (
              <div className="flex justify-end gap-1.5 font-medium">
                <span className="text-slate-500">DUE DATE:</span>
                <span className="font-bold text-black">{formatDate(invoice.due_date)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── INVOICE TO / SHIP TO PANEL ── */}
      <div className="mt-1 bg-slate-50 border border-slate-200/80 rounded p-2.5 grid grid-cols-2 gap-4">
        {/* Left: INVOICE TO */}
        <div className="pr-2 border-r border-slate-200 space-y-0.5 text-[9.5px]">
          <div className="font-black text-[10px] text-black uppercase tracking-wider mb-1">
            INVOICE TO
          </div>
          <div className="font-bold text-slate-900 text-[11px]">
            {clientName || "Walk-in Customer"}
          </div>
          {billAddress.street && (
            <div className="text-slate-600">{billAddress.street}</div>
          )}
          {billAddress.cityLine && (
            <div className="text-slate-600">{billAddress.cityLine}</div>
          )}
          {clientPhone && (
            <div className="text-slate-600 pt-0.5">
              <span className="font-medium text-slate-500">Phone:</span> {clientPhone}
            </div>
          )}
          {referredBy && (
            <div className="text-slate-800 font-medium pt-0.5">
              <span className="text-slate-500">{referredByLabel}:</span> {referredBy}
            </div>
          )}
        </div>

        {/* Right: SHIP TO */}
        <div className="pl-1 space-y-0.5 text-[9.5px]">
          <div className="font-black text-[10px] text-black uppercase tracking-wider mb-1">
            SHIP TO
          </div>
          <div className="font-bold text-slate-900 text-[11px]">
            {clientName || "Shipping Destination"}
          </div>
          {shipAddress.street ? (
            <div className="text-slate-600">{shipAddress.street}</div>
          ) : billAddress.street ? (
            <div className="text-slate-600">{billAddress.street}</div>
          ) : null}
          {shipAddress.cityLine ? (
            <div className="text-slate-600">{shipAddress.cityLine}</div>
          ) : billAddress.cityLine ? (
            <div className="text-slate-600">{billAddress.cityLine}</div>
          ) : null}
          {clientPhone && (
            <div className="text-slate-600 pt-0.5">
              <span className="font-medium text-slate-500">Phone:</span> {clientPhone}
            </div>
          )}
        </div>
      </div>

      {/* ── SUB-BAR: DATE & INVOICE NO ── */}
      <div className="flex items-center justify-between text-[10px] font-bold py-1.5 px-0.5 uppercase tracking-wide">
        <div>
          <span className="text-slate-500">DATE:</span> {formatDate(invoice.issue_date || new Date())}
        </div>
        <div>
          <span className="text-slate-500">INVOICE NO:</span> <span className="font-mono">{number || "INV-0001"}</span>
        </div>
      </div>

      {/* ── TABLE ── */}
      <div className="mt-0.5">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100 border-y border-slate-300">
              <th className="text-left font-black text-black text-[9.5px] py-1.5 px-2 uppercase tracking-wider" style={{ width: "36px" }}>
                NO.
              </th>
              <th className="text-left font-black text-black text-[9.5px] py-1.5 px-2 uppercase tracking-wider">
                ITEM DESCRIPTION
              </th>
              <th className="text-right font-black text-black text-[9.5px] py-1.5 px-2 uppercase tracking-wider" style={{ width: "70px" }}>
                PRICE
              </th>
              <th className="text-center font-black text-black text-[9.5px] py-1.5 px-2 uppercase tracking-wider" style={{ width: "65px" }}>
                QUANTITY
              </th>
              <th className="text-right font-black text-black text-[9.5px] py-1.5 px-2.5 uppercase tracking-wider" style={{ width: "75px" }}>
                TOTAL
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70">
            {lines.map((l, idx) => {
              const qty = Number(l.quantity || 1);
              const rate = Number(l.rate || 0);
              const lineTotal = Number(l.amount ?? (qty * rate));

              return (
                <tr key={l.id || idx} className="hover:bg-slate-50/50">
                  <td className="py-1.5 px-2 text-slate-600 font-mono text-[9.5px] font-medium align-top">
                    {idx + 1}.
                  </td>
                  <td className="py-1.5 px-2 text-slate-900 align-top">
                    <div className="font-semibold text-black leading-tight">
                      {l.name || l.description || "Item description here"}
                    </div>
                    {l.description && l.description !== l.name && (
                      <div className="text-[9px] text-slate-500 leading-snug mt-0.5 line-clamp-2">
                        {l.description}
                      </div>
                    )}
                    {l.batch_no && (
                      <span className="inline-block mt-0.5 text-[8.5px] font-mono px-1 py-0.2 bg-slate-100 text-slate-800 border border-slate-300 rounded">
                        Batch: {l.batch_no}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono font-medium text-slate-800 align-top">
                    {fmt(rate)}
                  </td>
                  <td className="py-1.5 px-2 text-center text-slate-800 font-medium align-top">
                    {qty} {l.unit ? <span className="text-[8.5px] uppercase text-slate-500">{l.unit}</span> : ""}
                  </td>
                  <td className="py-1.5 px-2.5 text-right font-mono font-bold text-black align-top">
                    {fmt(lineTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── TOTAL DUE & FINANCIAL SUMMARY ── */}
      <div className="mt-3 pt-2.5 border-t-2 border-black grid grid-cols-2 gap-4 items-center">
        {/* Left: Total Due Card with Hatched Background */}
        <div className="pr-2">
          <div className="font-black text-[11px] text-black uppercase tracking-wider mb-1">
            TOTAL DUE
          </div>
          <div
            className="border border-slate-300 p-2 rounded text-center relative overflow-hidden"
            style={{
              backgroundImage: "repeating-linear-gradient(45deg, #f8f9fa, #f8f9fa 6px, #e9ecef 6px, #e9ecef 12px)",
            }}
          >
            <div className="font-black text-xl font-mono text-black tracking-tight">
              {fmt(grandTotal)}
            </div>
          </div>
        </div>

        {/* Right: Subtotal, Tax, Grand Total */}
        <div className="pl-2 space-y-1 text-[10px]">
          <div className="flex justify-between items-center font-bold">
            <span className="text-black uppercase">SUBTOTAL:</span>
            <span className="font-mono text-slate-900">{fmt(subtotal)}</span>
          </div>
          {discountTotal > 0 && (
            <div className="flex justify-between items-center text-slate-700">
              <span className="uppercase">DISCOUNT:</span>
              <span className="font-mono">(-) {fmt(discountTotal)}</span>
            </div>
          )}
          {taxTotal > 0 && (
            <div className="flex justify-between items-center font-bold text-slate-900">
              <span className="uppercase">TAX:</span>
              <span className="font-mono">(+) {fmt(taxTotal)}</span>
            </div>
          )}
          <div className="border-t border-slate-300 my-1 pt-1 flex justify-between items-center font-black text-[11px] text-black">
            <span className="uppercase tracking-wide">GRAND TOTAL:</span>
            <span className="font-mono text-base">{fmt(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Notes Section (Only shown if added) */}
      {showNotes && notesText && (
        <div className="mt-3 p-2.5 bg-slate-50 border border-slate-300 rounded text-[8.5px] text-slate-800">
          <span className="font-bold text-black uppercase tracking-wide block mb-0.5">Notes:</span>
          <div className="whitespace-pre-wrap leading-tight">{notesText}</div>
        </div>
      )}

      {/* ── BOTTOM 3-COLUMN SECTION ── */}
      <div className="mt-4 pt-3 border-t border-slate-300 grid grid-cols-3 gap-3 text-[9px]">
        {/* Column 1: Payment Info */}
        <div className="pr-1.5 border-r border-slate-200">
          <div className="font-black text-[9.5px] text-black uppercase tracking-wider mb-1">
            Payment Info:
          </div>
          <div className="space-y-0.5 text-slate-600">
            <div className="truncate"><span className="font-medium text-slate-500">Account:</span> {bankName || org?.name || "Company Account"}</div>
            <div className="truncate"><span className="font-medium text-slate-500">A/C Name:</span> {bankAccName || "Primary Account"}</div>
            <div className="truncate"><span className="font-medium text-slate-500">Bank Details:</span> {bankAccNum || "—"}</div>
            {bankIfsc && <div className="truncate"><span className="font-medium text-slate-500">IFSC:</span> {bankIfsc}</div>}
          </div>
        </div>

        {/* Column 2: Terms & Condition */}
        <div className="px-1.5 border-r border-slate-200">
          <div className="font-black text-[9.5px] text-black uppercase tracking-wider mb-1">
            Terms & Condition
          </div>
          <div className="text-slate-600 leading-snug line-clamp-4">
            {invoice.terms || "Standard business terms apply. Goods once delivered are subject to verification within 7 business days."}
          </div>
        </div>

        {/* Column 3: Account Manager / Signature */}
        <div className="pl-1.5 text-center flex flex-col justify-between">
          <div className="font-black text-[9.5px] text-black uppercase tracking-wider">
            ACCOUNT MANAGER
          </div>
          {showSignature && (
            <div className="my-1">
              <div className="font-serif italic text-base font-bold text-slate-800">
                Signature
              </div>
              <div className="w-24 mx-auto border-t border-black pt-0.5 text-[8.5px] font-bold uppercase text-black">
                Manager Name
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER BAR WITH ICONS ── */}
      <div className="mt-3 pt-2 border-t border-slate-300 flex flex-wrap items-center justify-between text-[8.5px] text-slate-600 gap-x-2">
        <div className="flex items-center gap-1">
          <MapPin className="w-2.5 h-2.5 text-black shrink-0" />
          <span className="truncate max-w-[200px]">{orgAddressStr}</span>
        </div>
        {org?.phone && (
          <div className="flex items-center gap-1">
            <Phone className="w-2.5 h-2.5 text-black shrink-0" />
            <span>{org.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Globe className="w-2.5 h-2.5 text-black shrink-0" />
          <span className="font-medium text-slate-700">{org?.email || "info@company.com"}</span>
        </div>
      </div>
    </div>
  );
}
