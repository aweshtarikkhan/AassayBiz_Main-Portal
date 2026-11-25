import { isRetailOrg } from "@/lib/business-category";
import React, { useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { numberToWords } from "@/lib/number-to-words";
import { format, parseISO } from "date-fns";
import { resolveLineTaxRate, computeDocumentTotals, computeLineFinancials } from "@/lib/invoiceCalculations";
import { InvoiceTotalsTable } from "./InvoiceTotalsTable";
import { getAdaptiveCompanyNameStyle, splitCompanyNameIntoTwoLines } from "@/lib/document-templates";

export interface InvoiceTemplateProps {
  org: any;
  invoice: any;
  lines: any[];
  fmt: (n: number) => string;
  type?: "invoice" | "estimate" | "bill" | "po";
  taxBreakdown?: { name: string; amount: number; rate?: number }[];
  isInterstate?: boolean;
  showSignature?: boolean;
}

function formatAmountInWords(num: number): string {
  const rounded = Math.round(num * 100) / 100;
  const integerPart = Math.floor(Math.abs(rounded));
  const decimalPart = Math.round((Math.abs(rounded) - integerPart) * 100);
  let words = numberToWords(integerPart) + " Rupees";
  if (decimalPart > 0) {
    words += " and " + numberToWords(decimalPart) + " Paise";
  }
  return words + " Only";
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  try {
    return format(parseISO(dateStr), "dd MMM yyyy");
  } catch (e) {
    return dateStr;
  }
}

export function ModernTealInvoiceTemplate({
  org,
  invoice,
  lines,
  fmt,
  type = "invoice",
  taxBreakdown = [],
  isInterstate = false,
  showSignature = true,
}: InvoiceTemplateProps) {
  const primary = (org?.template_accent_color as string) || "#0f766e";
  const accent = "#14b8a6";
  const snapshot = (invoice?.metadata as any) || {};
  const hasGst = snapshot.has_gst !== undefined
    ? Boolean(snapshot.has_gst)
    : Boolean((org?.gst_number || org?.tax_number)?.trim() && org?.gst_enabled !== false);

  const cl = invoice?.clients || invoice?.client;
  const isRetailDoc = Boolean((invoice?.metadata as any)?.is_retail || isRetailOrg(org));
  const referredBy = (invoice?.metadata as any)?.referred_by;
  const referredByLabel = (invoice?.metadata as any)?.referred_by_label || "Referred By";
  const billToName = cl?.company_name || cl?.display_name || cl?.name || invoice?.client_name || "";
  const billToGst = cl?.tax_number || cl?.gst_number || cl?.gstin || invoice?.client_gst || "";
  const billToEmail = cl?.email || invoice?.client_email || "";
  const billToPhone = cl?.phone || cl?.mobile || invoice?.client_phone || "";

  // Parse billing address
  const getAddressString = (addr: any) => {
    if (!addr) return "";
    if (typeof addr === "string") return addr;
    const parts = [addr.street, addr.city, addr.state, addr.zip, addr.country].filter(Boolean);
    return parts.join(", ");
  };
  const billToAddress = getAddressString(invoice?.billing_address || cl?.billing_address || cl?.address);
  
  // Parse shipping address
  let shipToName = billToName;
  let shipToAddress = billToAddress;
  let shipToContact = billToPhone;
  let shipToGst = billToGst;
  const sAddr = invoice?.shipping_address || ((invoice?.metadata as any)?.shipping_same_as_billing ? (invoice?.billing_address || invoice?.clients?.billing_address) : invoice?.clients?.shipping_address);
  if (sAddr) {
    const s = typeof sAddr === "string" ? JSON.parse(sAddr) : sAddr;
    if (s?.name) shipToName = s.name;
    shipToAddress = getAddressString(s) || (typeof s === "string" ? s : shipToAddress);
    if (s?.phone || s?.contact) shipToContact = s.phone || s.contact;
    if (s?.gstin || s?.tax_number) shipToGst = s.gstin || s.tax_number;
  }

  const customFields = org?.custom_fields || [];

  const getTitleText = () => {
    if (type === "estimate") return "QUOTATION";
    if (type === "po") return "PURCHASE ORDER";
    if (type === "bill") return "PURCHASE INVOICE";
    return hasGst ? "TAX INVOICE" : "INVOICE";
  };

  const hasIGST = isInterstate;
  const totalTax = taxBreakdown.reduce((sum, t) => sum + t.amount, 0);

  const poNumber = invoice?.po_number || invoice?.reference_number;
  const ewayBill = invoice?.eway_bill_no;
  const vehicleNo = invoice?.vehicle_number || invoice?.eway_vehicle_no;

  const extractCity = (addr: any) => {
    if (!addr) return "";
    if (typeof addr === "object") return addr.city || addr.state || "";
    if (typeof addr === "string") {
      try {
        const parsed = JSON.parse(addr);
        if (parsed && typeof parsed === "object") return parsed.city || parsed.state || "";
      } catch {
        const parts = addr.split(",").map((p: string) => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const secondOrThird = parts[1];
          if (secondOrThird && isNaN(Number(secondOrThird))) return secondOrThird;
        }
        return parts[0] || "";
      }
    }
    return "";
  };

  const clientCity = extractCity(invoice?.shipping_address) || extractCity(invoice?.billing_address) || extractCity(invoice?.clients?.billing_address) || (typeof invoice?.clients?.city === "string" ? invoice.clients.city : "") || "";
  const resolvedPlaceOfSupply = clientCity || invoice?.place_of_supply || (invoice?.clients as any)?.state || org?.address?.state || "";

  // Bank Info resolution
  const invBank = invoice?.bank_details ? (typeof invoice.bank_details === "string" ? (() => { try { return JSON.parse(invoice.bank_details); } catch { return null; } })() : invoice.bank_details) : null;
  const orgBank = org?.bank_details ? (typeof org.bank_details === "string" ? (() => { try { return JSON.parse(org.bank_details); } catch { return null; } })() : org.bank_details) : null;

  const resolvedBankName = invBank?.bank_name || orgBank?.bank_name || org?.bank_name || org?.template_bank_name || "";
  const resolvedAccountHolder = invBank?.account_holder_name || invBank?.account_name || orgBank?.account_holder_name || org?.bank_account_name || org?.name || "";
  const resolvedAccountNumber = invBank?.bank_account_number || invBank?.account_number || invBank?.account_no || orgBank?.bank_account_number || orgBank?.account_no || orgBank?.acc_no || org?.bank_account_number || org?.bank_account_no || org?.bank_acc_number || org?.template_bank_account_no || "";
  const resolvedIfsc = invBank?.bank_ifsc || invBank?.ifsc || orgBank?.bank_ifsc || orgBank?.ifsc || org?.bank_ifsc || org?.template_bank_ifsc || "";
  const resolvedBranch = invBank?.bank_branch || invBank?.branch || orgBank?.bank_branch || org?.bank_branch || "";
  const upiId = invBank?.bank_upi_id || invBank?.upi_id || orgBank?.bank_upi_id || org?.upi_id || org?.upi_number || "";
  const upiName = org?.name || org?.company_name || org?.business_name || "Merchant";
  const showBankDetails = invoice?.metadata?.show_bank_details !== false;
  const showTerms = invoice?.metadata?.show_terms !== false;
  const showNotes = invoice?.metadata?.show_notes !== false;
  
  const orgName = org?.name || org?.business_name || "";
  const companyStyle = getAdaptiveCompanyNameStyle(orgName);
  const { line1: orgLine1, line2: orgLine2 } = splitCompanyNameIntoTwoLines(orgName);

  const upiString = upiId ? "upi://pay?pa=" + upiId + "&pn=" + encodeURIComponent(upiName) + "&am=" + (invoice?.total || 0) + "&cu=INR" : "";

  return (
    <div className="w-full h-full bg-white text-black p-5 sm:p-6 font-sans" style={{ fontSize: "11px", color: "#333" }}>
      {/* HEADER SECTION */}
      
      <div className="flex justify-between items-start mb-3.5">
        <div className="flex-1 min-w-0 pr-3 sm:pr-4">
          <div className="inline-block px-3 py-1 text-white font-bold text-sm mb-2 rounded-r-lg" style={{backgroundColor: primary}}>
            {getTitleText()}
          </div>
          <div className="flex items-start mt-1.5">
            {org?.logo_url && <img src={org.logo_url} className="h-10 max-w-[110px] object-contain mr-3 shrink-0 self-start mt-0.5" alt="Logo" />}
            <div className="min-w-0 flex-1">
              <h2 className={companyStyle.className} style={{color: primary, fontSize: companyStyle.fontSize, lineHeight: companyStyle.lineHeight}}>
                <span className="block">{orgLine1}</span>
                {orgLine2 && <span className="block">{orgLine2}</span>}
              </h2>
              <p className="whitespace-pre-wrap mt-0.5 text-[10px] text-gray-600 leading-tight">{org?.address?.street || ""}</p>
              <p className="text-[10px] text-gray-600 leading-tight">{[org?.address?.city, org?.address?.state, org?.address?.zip].filter(Boolean).join(", ")}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-gray-600">
            {org?.gst_number && <p><strong>GSTIN:</strong> {org.gst_number}</p>}
            {org?.email && <p><strong>Email:</strong> {org.email}</p>}
            {org?.phone && <p><strong>Mobile:</strong> {org.phone}</p>}
          </div>
        </div>
        
        <div className="shrink-0 flex justify-end">
          <div className="grid grid-cols-3 gap-2 border rounded-xl p-2.5 border-gray-200 bg-gray-50">
              <div className="p-1.5 bg-white rounded-lg border border-gray-100 shadow-sm text-center min-w-[76px]">
                <p className="text-[8.5px] text-gray-500 font-bold uppercase">{type === "estimate" ? "Quotation No." : (type === "po" ? "PO No." : "Invoice No.")}</p>
                <p className="font-bold">{type === "estimate" ? invoice?.estimate_number : (type === "po" ? invoice?.po_number : invoice?.invoice_number)}</p>
              </div>
              <div className="p-1.5 bg-white rounded-lg border border-gray-100 shadow-sm text-center min-w-[76px]">
                <p className="text-[8.5px] text-gray-500 font-bold uppercase">{type === "estimate" ? "Quotation Date" : (type === "po" ? "PO Date" : "Invoice Date")}</p>
                <p className="font-bold">{formatDate(invoice?.issue_date)}</p>
              </div>
              <div className="p-1.5 bg-white rounded-lg border border-gray-100 shadow-sm text-center min-w-[76px]">
                <p className="text-[8.5px] text-gray-500 font-bold uppercase">{type === "estimate" ? "Valid Till" : "Due Date"}</p>
                <p className="font-bold">{formatDate(type === "estimate" ? invoice?.expiry_date : invoice?.due_date)}</p>
              </div>
             
             {poNumber && (
               <div className="p-1.5 bg-white rounded-lg border border-gray-100 shadow-sm text-center min-w-[76px]">
                 <p className="text-[8.5px] text-gray-500 font-bold uppercase">P.O. No.</p>
                 <p className="font-bold">{poNumber}</p>
               </div>
             )}
             {type !== "po" && ewayBill && (
                <div className="p-1.5 bg-white rounded-lg border border-gray-100 shadow-sm text-center min-w-[76px]">
                  <p className="text-[8.5px] text-gray-500 font-bold uppercase">E-Way Bill No.</p>
                  <p className="font-bold">{ewayBill}</p>
                </div>
              )}
              {type !== "po" && vehicleNo && (
                <div className="p-1.5 bg-white rounded-lg border border-gray-100 shadow-sm text-center min-w-[76px]">
                  <p className="text-[8.5px] text-gray-500 font-bold uppercase">Vehicle No.</p>
                  <p className="font-bold">{vehicleNo}</p>
                </div>
              )}
             
             {customFields.slice(0, 3).map((cf: any, idx: number) => (
               <div key={idx} className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm text-center">
                 <p className="text-[8.5px] text-gray-500 font-bold uppercase">{cf.name}</p>
                 <p className="font-bold">{cf.value}</p>
               </div>
             ))}
          </div>
        </div>
      </div>
      

      {/* BILL TO / SHIP TO */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="text-white font-bold px-3 py-1 text-xs" style={{backgroundColor: primary}}>BILL TO</div>
          <div className="p-2.5">
            <h3 className="font-bold text-xs mb-0.5">{billToName}</h3>
            <p className="whitespace-pre-wrap leading-tight text-[10px] text-gray-600">{billToAddress}</p>
            {billToGst && <p className="mt-2"><strong>GSTIN:</strong> {billToGst}</p>}
            <p className="mt-1">
              {billToEmail && <span><strong>Email:</strong> {billToEmail}  </span>}
              {billToPhone && <span><strong>Mobile:</strong> {billToPhone}</span>}
            </p>
          </div>
        </div>
        
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="text-white font-bold px-3 py-1 text-xs" style={{backgroundColor: primary}}>{referredBy ? referredByLabel.toUpperCase() : "SHIP TO"}</div>
          <div className="p-2.5">
            {referredBy ? (
              <h3 className="font-bold text-xs mb-0.5">{referredBy}</h3>
            ) : (!isRetailDoc && (
              <h3 className="font-bold text-xs mb-0.5">{shipToName}</h3>
            ))}
            <p className="whitespace-pre-wrap leading-tight text-[10px] text-gray-600">{shipToAddress}</p>
            {shipToGst && <p className="mt-2"><strong>GSTIN:</strong> {shipToGst}</p>}
            <p className="mt-1">
              {shipToContact && <span><strong>Contact:</strong> {shipToContact}</span>}
            </p>
            {resolvedPlaceOfSupply && <p className=\"mt-1\"><strong>Place of Supply:</strong> {resolvedPlaceOfSupply}</p>}
          </div>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <div className="w-full mb-3 rounded-xl overflow-hidden border border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-white text-[10px]" style={{backgroundColor: primary}}>
              <th className="py-1.5 px-2 text-center w-8">S.No.</th>
              <th className="py-1.5 px-2">Description of Goods / Services</th>
              {hasGst && <th className="py-1.5 px-2 text-center">HSN / SAC</th>}
              <th className="py-1.5 px-2 text-center">Qty</th>
              <th className="py-1.5 px-2 text-center">Unit</th>
              <th className="py-1.5 px-2 text-right">Rate (₹)</th>
              <th className="py-1.5 px-2 text-right" style={{backgroundColor: accent}}>Subtotal (₹)</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => {
              const dRatio = invoice?.subtotal > 0 && invoice?.discount > 0 ? (Number(invoice.discount) / Number(invoice.subtotal)) : 0;
              const { qty, rate, taxableAmt, taxRate, taxAmt, lineTotal } = computeLineFinancials(line, dRatio);
              const itemName = line.name || line.items?.name || line.item?.name || line.item_name || (line.description ? String(line.description).split("\n")[0] : "") || "Item";
              const itemDesc = (line.name || line.items?.name || line.item?.name || line.item_name)
                ? (line.description && line.description !== itemName ? line.description : "")
                : (line.description && String(line.description).includes("\n") ? String(line.description).split("\n").slice(1).join("\n") : "");

              return (
              <tr key={idx} className="border-b border-gray-200">
                <td className="py-1.5 px-2 text-center border-r border-gray-200">{idx + 1}</td>
                <td className="py-1.5 px-2 border-r border-gray-200">
                  <div className="font-semibold text-[10.5px] leading-tight">{itemName}</div>
                  {itemDesc ? (
                    <div className="text-[8.5px] text-gray-500 mt-0.5 whitespace-pre-wrap opacity-75">{itemDesc}</div>
                  ) : null}
                </td>
                {hasGst && <td className="py-1.5 px-2 text-center border-r border-gray-200">{line.item?.hsn_code || line.hsn_code || line.hsn || line.hsn_sac || line.items?.hsn_code || "-"}</td>}
                <td className="py-1.5 px-2 text-center border-r border-gray-200">{qty}</td>
                <td className="py-1.5 px-2 text-center border-r border-gray-200">{line.item?.unit || line.unit || line.items?.unit || "PCS"}</td>
                <td className="py-1.5 px-2 text-right border-r border-gray-200">{fmt(rate).replace('₹', '').trim()}</td>
                <td className="py-1.5 px-2 text-right font-bold" style={{color: primary}}>
                  {fmt(lineTotal).replace('₹', '').trim()}
                </td>
              </tr>
            );})}
            {(!lines || lines.length === 0) && (
              <tr className="border-b border-gray-200">
                <td colSpan={hasGst ? 7 : 4} className="py-6 text-center text-gray-400 italic">No items added to this document</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER GRID */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* LEFT COLUMN */}
        <div>
           {/* BANK & PAYMENT DETAILS (WITH SCAN & PAY QR NESTED) */}
           {type !== "po" && (showBankDetails || upiId) && (
             <div className="border mb-2.5 border-gray-200 rounded-xl overflow-hidden shadow-sm">
               <div className="text-white font-bold px-3 py-1 text-xs flex justify-between items-center" style={{backgroundColor: primary}}>
                 <span>BANK &amp; PAYMENT DETAILS</span>
                 {upiId && <span className="text-[9px] opacity-90 font-normal">Instant UPI Payment</span>}
               </div>
               <div className="p-2.5 flex items-center justify-between gap-2.5">
                 <div className="grid grid-cols-[95px_1fr] gap-x-2 gap-y-0.5 text-[9.5px] flex-1">
                    {resolvedBankName && <><div className="font-semibold text-gray-600">Bank Name :</div><div className="font-medium text-gray-900">{resolvedBankName}</div></>}
                    {resolvedAccountHolder && <><div className="font-semibold text-gray-600">A/C Holder :</div><div className="font-medium text-gray-900">{resolvedAccountHolder}</div></>}
                    {resolvedAccountNumber && <><div className="font-semibold text-gray-600">Account No :</div><div className="font-mono font-bold text-gray-900 tracking-wider">{resolvedAccountNumber}</div></>}
                    {resolvedIfsc && <><div className="font-semibold text-gray-600">IFSC Code :</div><div className="font-mono font-bold text-gray-900">{resolvedIfsc}</div></>}
                    {resolvedBranch && <><div className="font-semibold text-gray-600">Branch :</div><div className="text-gray-900">{resolvedBranch}</div></>}
                    {upiId && <><div className="font-semibold text-gray-600">UPI ID :</div><div className="font-mono font-semibold text-emerald-700">{upiId}</div></>}
                  </div><div className="font-mono font-semibold text-emerald-700">{upiId}</div></>}
                 </div>
                 {upiString && (
                   <div className="flex flex-col items-center justify-center p-2 bg-gray-50 border border-gray-200 rounded-lg shrink-0">
                     <QRCodeSVG value={upiString} size={62} />
                     <span className="text-[8.5px] font-bold text-gray-700 mt-1 tracking-tight">Scan &amp; Pay</span>
                   </div>
                 )}
               </div>
             </div>
           )}

           {/* TERMS */}
           {showTerms && <div className="border mb-2.5 border-gray-200 rounded-xl overflow-hidden">
             <div className="text-white font-bold px-3 py-1 text-xs" style={{backgroundColor: primary}}>TERMS &amp; CONDITIONS</div>
             <div className="p-2.5 text-[8.5px] leading-tight whitespace-pre-wrap">
               {invoice?.terms_conditions || org?.default_terms || "1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is delayed."}
             </div>
           </div>}
           
           {/* NOTES */}
           {showNotes && invoice?.notes && (
             <div className="border mb-2.5 border-gray-200 rounded-xl overflow-hidden">
               <div className="text-white font-bold px-3 py-1 text-xs" style={{backgroundColor: primary}}>NOTES</div>
               <div className="p-3 text-[9px] whitespace-pre-wrap">
                 {invoice.notes}
               </div>
             </div>
           )}
        </div>

        {/* RIGHT COLUMN */}
        <div>
           {/* TOTALS */}
           <InvoiceTotalsTable
             invoice={invoice}
             lines={lines}
             taxBreakdown={taxBreakdown}
             hasGst={hasGst}
             fmt={fmt}
             primaryColor={primary}
             accentColor={accent}
             type={type}
             isInterstate={isInterstate}
           />

           <div className="flex justify-end items-end mt-4">
              <div className="text-center min-w-[180px]">
                 {showSignature && org?.address?.signature_type && org?.address?.signature_type !== 'none' ? (
                   <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', height: 38, marginBottom: 3 }}>
                     {org.address.signature_type === 'image' && org.address.signature_image_url ? (
                       <img src={org.address.signature_image_url} alt="Signature" style={{ maxHeight: 38, mixBlendMode: 'multiply', objectFit: 'contain' }} />
                     ) : org.address.signature_type === 'font' && org.address.signature_name ? (
                       <div style={{ fontFamily: org.address.signature_font || 'Caveat', fontSize: 24, lineHeight: 1, color: '#1e293b' }}>
                         {org.address.signature_name}
                       </div>
                     ) : null}
                   </div>
                 ) : (
                   <div className="h-8"></div>
                 )}
                 <div className="border-b border-gray-400 w-full mb-1.5"></div>
                 <div className="font-bold text-[10px] text-gray-800">Authorized Signatory</div>
                 <div className="text-[9px] text-gray-500">{org?.name || ""}</div>
              </div>
           </div>
        </div>

      </div>

      <div className="mt-4 text-center text-[9px] flex justify-center items-center gap-1 font-semibold border-t border-gray-200 pt-2.5">
         Powered by <img src="/logo.png" alt="Aassay Biz" style={{ height: "14px", objectFit: "contain", display: "inline-block", marginLeft: "4px" }} />
      </div>
    </div>
  );
}

