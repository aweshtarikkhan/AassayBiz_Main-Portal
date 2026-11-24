import React, { forwardRef } from "react";
import { format } from "date-fns";

export interface DeliveryChallanData {
  id?: string;
  challan_number: string;
  challan_date: string;
  status?: string;
  vehicle_number?: string | null;
  transporter?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  eway_bill_number?: string | null;
  destination?: string | null;
  notes?: string | null;
  supply_type?: string | null;
}

export interface DeliveryChallanLineData {
  id?: string;
  description: string;
  quantity: number | string;
  unit?: string | null;
  batch_no?: string | null;
  serial_no?: string | null;
  hsn_code?: string | null;
}

export interface DeliveryChallanDocumentProps {
  challan: DeliveryChallanData;
  lines: DeliveryChallanLineData[];
  org: any;
  client: any;
  branch?: any | null;
}

export const DeliveryChallanDocument = forwardRef<HTMLDivElement, DeliveryChallanDocumentProps>(
  ({ challan, lines, org, client, branch }, ref) => {
    const formattedDate = challan.challan_date
      ? (() => {
          try {
            return format(new Date(challan.challan_date), "dd-MMM-yyyy");
          } catch {
            return challan.challan_date;
          }
        })()
      : format(new Date(), "dd-MMM-yyyy");

    // Safe address formatter for string, JSON string, or object
    const formatAddress = (addr: any): string => {
      if (!addr) return "";
      if (typeof addr === "string") {
        try {
          const trimmed = addr.trim();
          if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed === "object") {
              const parts = [parsed.street, parsed.city, parsed.state, parsed.zip || parsed.pincode, parsed.country].filter(Boolean);
              return parts.length > 0 ? parts.join(", ") : "";
            }
          }
        } catch (_) {}
        return addr;
      }
      if (typeof addr === "object") {
        const parts = [addr.street, addr.city, addr.state, addr.zip || addr.pincode, addr.country].filter(Boolean);
        return parts.length > 0 ? parts.join(", ") : "";
      }
      return String(addr);
    };

    // Supplier details
    const orgName = (typeof org?.name === "string" && org.name) || "Company Name";
    const orgGst = (typeof org?.gst_number === "string" && org.gst_number) || (typeof org?.tax_number === "string" && org.tax_number) || "";
    const orgPhone = (typeof org?.phone === "string" && org.phone) || "";
    const orgEmail = (typeof org?.email === "string" && org.email) || "";
    const orgAddress = formatAddress(org?.address);

    // Branch / Dispatch From details
    const isRetail = org?.business_type === 'retail' || (org?.invoice_preferences as any)?.business_category === 'retail';
    const whName = (typeof branch?.name === "string" && branch.name) || (isRetail ? "Main Store / Location" : orgName);
    const whGst = (typeof branch?.gstin === "string" && branch.gstin) || orgGst;
    const whLocation = formatAddress(branch?.address) || orgAddress;

    // Client / Consignee details
    const clientName = (typeof client?.display_name === "string" && client.display_name) || (typeof client?.name === "string" && client.name) || "Customer / Consignee";
    const clientGst = (typeof client?.tax_number === "string" && client.tax_number) || "";
    const clientPhone = (typeof client?.phone === "string" && client.phone) || "";
    const clientState = (typeof client?.state === "string" && client.state) || "";
    const clientAddress = formatAddress(client?.shipping_address || client?.billing_address);
    const destinationDisplay = formatAddress(challan.destination) || clientState || "—";

    const totalQty = lines.reduce((acc, l) => acc + (Number(l.quantity) || 0), 0);

    return (
      <div
        ref={ref}
        id="delivery-challan-print-area"
        className="w-full max-w-[800px] mx-auto bg-white text-slate-900 text-[11px] leading-tight font-sans p-6 sm:p-7 border border-slate-300 shadow-sm print:border-none print:shadow-none print:p-4 print:max-w-none print:w-full print:m-0"
        style={{
          boxSizing: "border-box",
          backgroundColor: "#ffffff",
          color: "#0f172a",
        }}
      >
        {/* TOP HEADER */}
        <div className="border-b-2 border-slate-900 pb-2 mb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5 max-w-[60%]">
              {org?.logo_url ? (
                <div className="flex items-center gap-3 mb-1">
                  <img
                    src={org.logo_url}
                    alt={orgName}
                    className="h-10 max-w-[140px] object-contain"
                  />
                  <div>
                    <h1 className="text-base font-bold uppercase tracking-tight text-slate-900">
                      {orgName}
                    </h1>
                  </div>
                </div>
              ) : (
                <h1 className="text-base font-bold uppercase tracking-tight text-slate-900">
                  {orgName}
                </h1>
              )}
              <p className="text-[10.5px] text-slate-600 leading-snug">
                {orgAddress || "Business Address"}
              </p>
              <div className="flex flex-wrap gap-x-3 text-[10px] text-slate-700 font-medium pt-0.5">
                {orgGst && <span><strong>GSTIN:</strong> {orgGst}</span>}
                {orgPhone && <span><strong>Phone:</strong> {orgPhone}</span>}
                {orgEmail && <span><strong>Email:</strong> {orgEmail}</span>}
              </div>
            </div>

            <div className="text-right space-y-0.5">
              <div className="inline-block bg-slate-900 text-white font-bold px-3 py-1 text-xs uppercase tracking-wider rounded-sm">
                DELIVERY CHALLAN
              </div>
              <div className="text-[9.5px] text-slate-600 font-semibold mt-0.5">
                (Issued under Rule 55 of CGST Rules, 2017)
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                Original for Consignee / Transporter Copy
              </div>
            </div>
          </div>
        </div>

        {/* METADATA & DISPATCH GRID */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-[10.5px]">
          {/* Left Column: Challan & Transport Info */}
          <div className="border border-slate-300 rounded p-2 bg-slate-50/50 space-y-1">
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="text-slate-500 font-medium">Challan Number:</span>
              <span className="font-bold text-slate-900 font-mono text-xs">
                {challan.challan_number}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="text-slate-500 font-medium">Challan Date:</span>
              <span className="font-semibold text-slate-900">{formattedDate}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="text-slate-500 font-medium">Vehicle Number:</span>
              <span className="font-bold text-slate-900 font-mono uppercase">
                {challan.vehicle_number || "—"}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="text-slate-500 font-medium">Transporter:</span>
              <span className="font-medium text-slate-900">
                {challan.transporter || "Self / Direct Transport"}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="text-slate-500 font-medium">Driver Contact:</span>
              <span className="font-medium text-slate-900">
                {challan.driver_name ? `${challan.driver_name}` : ""}
                {challan.driver_phone ? ` (${challan.driver_phone})` : (!challan.driver_name ? "—" : "")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">E-Way Bill No:</span>
              <span className="font-mono font-semibold text-slate-900">
                {challan.eway_bill_number || "—"}
              </span>
            </div>
          </div>

          {/* Right Column: Dispatch & Destination */}
          <div className="border border-slate-300 rounded p-2 bg-slate-50/50 space-y-1">
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="text-slate-500 font-medium">Dispatch Place:</span>
              <span className="font-semibold text-slate-900 truncate max-w-[180px]">
                {whName}
              </span>
            </div>
            {whGst && (
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500 font-medium">Dispatch GSTIN:</span>
                <span className="font-mono text-slate-900 font-medium">{whGst}</span>
              </div>
            )}
            {whLocation ? (
              <div className="text-[10px] text-slate-600 border-b border-slate-200 pb-1 leading-snug">
                <span className="text-slate-500 font-medium">From: </span>
                {whLocation}
              </div>
            ) : null}
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="text-slate-500 font-medium">Destination / City:</span>
              <span className="font-semibold text-slate-900">
                {destinationDisplay}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Purpose of Movement:</span>
              <span className="font-semibold text-slate-900">
                {challan.supply_type || "Delivery / Goods Transportation"}
              </span>
            </div>
          </div>
        </div>

        {/* CONSIGNOR & CONSIGNEE BOXES */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-[10.5px]">
          {/* Dispatched From */}
          <div className="border border-slate-300 rounded p-2.5 space-y-0.5">
            <div className="font-bold uppercase text-[10px] text-slate-500 tracking-wider mb-1">
              Dispatched From (Consignor)
            </div>
            <div className="font-bold text-slate-900 text-xs">{orgName}</div>
            <div className="text-slate-600 leading-snug">{whLocation || orgAddress || "Business Address"}</div>
            {orgGst && (
              <div className="pt-1 text-[10px]">
                <strong className="text-slate-700">GSTIN / UIN:</strong>{" "}
                <span className="font-mono">{whGst || orgGst}</span>
              </div>
            )}
          </div>

          {/* Dispatched To (Consignee) */}
          <div className="border border-slate-300 rounded p-2.5 space-y-0.5">
            <div className="font-bold uppercase text-[10px] text-slate-500 tracking-wider mb-1">
              Dispatched To (Consignee / Recipient)
            </div>
            <div className="font-bold text-slate-900 text-xs">{clientName}</div>
            <div className="text-slate-600 leading-snug">
              {clientAddress || "Delivery Address as per Purchase Order"}
            </div>
            <div className="flex flex-wrap gap-x-3 pt-1 text-[10px]">
              {clientGst && (
                <span>
                  <strong className="text-slate-700">GSTIN:</strong>{" "}
                  <span className="font-mono">{clientGst}</span>
                </span>
              )}
              {clientState && <span><strong>State:</strong> {clientState}</span>}
              {clientPhone && <span><strong>Phone:</strong> {clientPhone}</span>}
            </div>
          </div>
        </div>

        {/* ITEMS TABLE (Rule 55 Compliant) */}
        <div className="border border-slate-300 rounded overflow-hidden mb-3">
          <table className="w-full text-left border-collapse text-[10.5px]">
            <thead>
              <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold uppercase text-[9.5px]">
                <th className="py-1.5 px-2 w-8 text-center border-r border-slate-300">#</th>
                <th className="py-1.5 px-2 border-r border-slate-300">Description of Goods / Items</th>
                <th className="py-1.5 px-2 w-20 border-r border-slate-300">Batch / S.No</th>
                <th className="py-1.5 px-2 w-16 text-right border-r border-slate-300">Quantity</th>
                <th className="py-1.5 px-2 w-14 text-center">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-1.5 px-2 text-center text-slate-500 border-r border-slate-200">
                    {idx + 1}
                  </td>
                  <td className="py-1.5 px-2 font-medium text-slate-900 border-r border-slate-200">
                    {line.description || "—"}
                  </td>
                  <td className="py-1.5 px-2 font-mono text-[10px] text-slate-600 border-r border-slate-200">
                    {line.batch_no ? `B: ${line.batch_no}` : ""}
                    {line.serial_no ? ` S: ${line.serial_no}` : ""}
                    {!line.batch_no && !line.serial_no ? "—" : ""}
                  </td>
                  <td className="py-1.5 px-2 text-right font-bold text-slate-900 border-r border-slate-200 font-mono">
                    {line.quantity}
                  </td>
                  <td className="py-1.5 px-2 text-center text-slate-600">
                    {line.unit || "Units"}
                  </td>
                </tr>
              ))}

              {/* Pad empty rows if fewer than 4 items to ensure balanced look on 1 page */}
              {lines.length < 4 &&
                Array.from({ length: 4 - lines.length }).map((_, i) => (
                  <tr key={`empty-${i}`} className="text-transparent select-none">
                    <td className="py-1.5 px-2 border-r border-slate-200">&nbsp;</td>
                    <td className="py-1.5 px-2 border-r border-slate-200">&nbsp;</td>
                    <td className="py-1.5 px-2 border-r border-slate-200">&nbsp;</td>
                    <td className="py-1.5 px-2 border-r border-slate-200">&nbsp;</td>
                    <td className="py-1.5 px-2">&nbsp;</td>
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100/80 border-t-2 border-slate-300 font-bold">
                <td colSpan={3} className="py-1.5 px-2 text-right uppercase text-[10px] text-slate-700 border-r border-slate-300">
                  Total Dispatched Quantity:
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-xs text-slate-900 border-r border-slate-300">
                  {totalQty}
                </td>
                <td className="py-1.5 px-2 text-center text-[10px] text-slate-700">
                  Items
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* NOTES (IF ANY) */}
        {challan.notes && (
          <div className="border border-slate-200 rounded p-2 mb-2 bg-slate-50 text-[10px] leading-relaxed">
            <strong className="text-slate-700">Special Instructions / Remarks:</strong> {challan.notes}
          </div>
        )}

        {/* STATUTORY DECLARATION UNDER RULE 55 */}
        <div className="border border-slate-200 rounded p-2 mb-3 bg-slate-50 text-[9.5px] text-slate-600 leading-snug">
          <strong className="text-slate-800">Statutory Declaration:</strong> Certified that the particulars given above are true and correct. The goods described above are being transported for reasons other than by way of supply (or on approval / delivery) in accordance with the provisions of <strong>Rule 55 of the CGST Rules, 2017</strong>.
        </div>

        {/* SIGNATURES ROW */}
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-300 text-[10px]">
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="text-slate-500 font-medium">Goods received in good condition & count:</div>
              <div className="h-10 border-b border-dashed border-slate-400 w-4/5"></div>
            </div>
            <div className="font-semibold text-slate-800">
              Receiver's / Driver's Signature & Stamp
            </div>
          </div>

          <div className="text-right space-y-6">
            <div className="space-y-1">
              <div className="font-semibold text-slate-800">For {orgName}</div>
              <div className="h-10 border-b border-dashed border-slate-400 w-4/5 ml-auto">
                {org?.signature_url && (
                  <img
                    src={org.signature_url}
                    alt="Signature"
                    className="h-9 ml-auto object-contain"
                  />
                )}
              </div>
            </div>
            <div className="font-semibold text-slate-800">
              Authorised Signatory
            </div>
          </div>
        </div>
      </div>
    );
  }
);

DeliveryChallanDocument.displayName = "DeliveryChallanDocument";
