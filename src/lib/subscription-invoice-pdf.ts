import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { ASSAYBIZ_LOGO_BASE64 } from "@/assets/logo-base64";

export interface SubscriptionInvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  billingCycle: "monthly" | "yearly";
  planNames: string[];
  planDisplayName: string;
  periodStart: string;
  periodEnd: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  organizationName: string;
  customerGstin?: string;
  customerState?: string;
  billingAddress?: string;
  totalAmount: number; // Total amount paid in INR (inclusive of GST)
  subtotal?: number;   // Taxable amount before GST
  taxAmount?: number;  // 18% GST amount
  discount?: number;   // Coupon discount applied
  paymentMethod?: string;
  razorpayPaymentId: string;
  razorpayOrderId?: string;
  employeeCount?: number;
  extraPlatformEmployees?: number;
  extraCrmMembers?: number;
  addonBillingMonths?: number;
  isAddonOnly?: boolean;
}

// Helper to format currency (pure ASCII to avoid jsPDF unicode spacing bugs)
function formatINR(val: number): string {
  if (val === undefined || val === null) return "Rs. 0.00";
  const num = Number(val) || 0;
  const fixed = num.toFixed(2);
  const parts = fixed.split(".");
  let intPart = parts[0];
  const decPart = parts[1];
  
  let lastThree = intPart.substring(intPart.length - 3);
  const otherNumbers = intPart.substring(0, intPart.length - 3);
  if (otherNumbers !== '') {
      lastThree = ',' + lastThree;
  }
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
  
  return "Rs. " + formatted + "." + decPart;
}

// Convert amount in numbers to words (Indian numbering system)
function numberToWordsINR(amount: number): string {
  const totalNum = Number(amount) || 0;
  const rupees = Math.floor(totalNum);
  const paise = Math.round((totalNum - rupees) * 100);

  if (rupees === 0 && paise === 0) return "Zero Rupees Only";

  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function numToWords(n: number): string {
    if (n === 0) return "";
    if (n < 20) return a[n] + " ";
    if (n < 100) return b[Math.floor(n / 10)] + " " + a[n % 10] + " ";
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred " + numToWords(n % 100);
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + "Thousand " + numToWords(n % 1000);
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + "Lakh " + numToWords(n % 100000);
    return numToWords(Math.floor(n / 10000000)) + "Crore " + numToWords(n % 10000000);
  }

  let words = "";
  if (rupees > 0) {
    words += "Rupees " + numToWords(rupees).trim();
  }
  if (paise > 0) {
    if (words) words += " and ";
    words += numToWords(paise).trim() + " Paise";
  }
  return (words + " Only").replace(/\s+/g, " ");
}

/**
 * Builds the official Assay Biz GST Tax Invoice PDF.
 */
export function generateSubscriptionInvoicePDF(data: SubscriptionInvoiceData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Calculate Tax breakdown (GST 18% inclusive)
  const total = Number(data.totalAmount) || 0;
  const taxable = data.subtotal !== undefined ? data.subtotal : Math.round((total / 1.18) * 100) / 100;
  const totalGst = data.taxAmount !== undefined ? data.taxAmount : Math.round((total - taxable) * 100) / 100;
  const cgst = Math.round((totalGst / 2) * 100) / 100;
  const sgst = Math.round((totalGst - cgst) * 100) / 100;

  // Supplier is in Madhya Pradesh (Code 23). Inter-state supplies get IGST; Intra-state (MP) get CGST + SGST.
  const isCustomerMp = Boolean(
    (data.customerState && (data.customerState.toLowerCase().includes("madhya pradesh") || data.customerState.toLowerCase() === "mp")) ||
    (data.customerGstin && data.customerGstin.trim().startsWith("23")) ||
    (data.billingAddress && (data.billingAddress.toLowerCase().includes("madhya pradesh") || data.billingAddress.toLowerCase().includes("mp")))
  );

  // -------------------------------------------------------------
  // 1. TOP CORPORATE HEADER (Deep Navy Banner)
  // -------------------------------------------------------------
  doc.setFillColor(22, 14, 61); // #160e3d
  doc.rect(0, 0, pageWidth, 38, "F");

  // Accent Bottom Stripe
  doc.setFillColor(231, 120, 23); // #e77817
  doc.rect(0, 38, pageWidth, 2.5, "F");

  // Assay Biz Official Logo in Crisp White Box Container (matching website)
  const boxX = margin;
  const boxY = 6;
  const boxW = 50;
  const boxH = 15;
  doc.setFillColor(255, 255, 255); // White box
  doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, "F");

  // Logo Image centered inside white box (aspect ratio ~4.14:1)
  const logoW = 42;
  const logoH = 10.1;
  const logoX = boxX + (boxW - logoW) / 2;
  const logoY = boxY + (boxH - logoH) / 2;
  try {
    doc.addImage(ASSAYBIZ_LOGO_BASE64, "PNG", logoX, logoY, logoW, logoH);
  } catch (imgErr) {
    console.warn("Failed to embed logo image, falling back to wordmark:", imgErr);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(231, 120, 23); // Orange A
    doc.text("A", logoX + 2, logoY + 7);
    doc.setTextColor(40, 22, 111); // Blue assay
    doc.text("assay", logoX + 6.5, logoY + 7);
    doc.setTextColor(231, 120, 23); // Orange Biz
    doc.text("Biz", logoX + 24, logoY + 7);
  }

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225); // slate-300
  doc.setFontSize(7.0); doc.text("India's Smartest Business Operating & GST Billing Platform - Everything you need. One smart platform", margin, 27);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("Emerging Thoughts Pvt. Ltd. (CIN - U73200MP2025PTC074472)", margin, 33);

  // Right Header: TAX INVOICE & Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("TAX INVOICE", pageWidth - margin, 16, { align: "right" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(254, 215, 170); // orange-200
  doc.text("Original For Recipient • SaaS Subscription", pageWidth - margin, 22, { align: "right" });

  doc.setTextColor(226, 232, 240); // slate-200
  doc.text(`Invoice No: ${data.invoiceNumber}`, pageWidth - margin, 28, { align: "right" });

  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Date: ${data.invoiceDate || new Date().toLocaleDateString("en-IN")}`, pageWidth - margin, 33, { align: "right" });

  let y = 47;

  // -------------------------------------------------------------
  // 2. INVOICE META CARD (Quick Overview Grid)
  // -------------------------------------------------------------
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, y, contentWidth, 20, 2.5, 2.5, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("INVOICE DATE", margin + 6, y + 6);
  doc.text("PAYMENT STATUS", margin + 50, y + 6);
  doc.text("BILLING CYCLE", margin + 100, y + 6);
  doc.text("ACTIVE PERIOD", margin + 140, y + 6);

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(data.invoiceDate || new Date().toLocaleDateString("en-IN"), margin + 6, y + 14);

  // Paid badge
  doc.setTextColor(22, 163, 74); // green-600
  doc.text("PAID IN FULL", margin + 50, y + 14);

  doc.setTextColor(15, 23, 42);
  doc.text((data.billingCycle || "Monthly").toUpperCase(), margin + 100, y + 14);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(`${data.periodStart} to ${data.periodEnd}`, margin + 140, y + 14);

  y += 28;

  // -------------------------------------------------------------
  // 3. BILLED BY & BILLED TO COLUMNS
  // -------------------------------------------------------------
  const colWidth = (contentWidth - 6) / 2;

  // Column 1: Billed By (Assay Biz)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, colWidth, 48, 2, 2, "FD");

  // Col 1 Header Tab
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, colWidth, 7, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("BILLED BY (SUPPLIER)", margin + 4, y + 5);

  let byY = y + 12;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Emerging Thoughts Pvt. Ltd.", margin + 4, byY);
  byY += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("GSTIN - 23AAICE6101F1Z6", margin + 4, byY);
  byY += 4.5;
  doc.text("Phone - +91 78060 25875", margin + 4, byY);
  byY += 4.5;
  doc.text("Email - support@aassaybiz.com", margin + 4, byY);
  byY += 4.5;
  doc.text("Website - www.aassaybiz.com", margin + 4, byY);
  byY += 4.5;
  doc.text("State - Madhya Pradesh (Code: 23)", margin + 4, byY);
  byY += 4.5;
  doc.text("Address - Indore, Madhya Pradesh, India", margin + 4, byY);

  // Column 2: Billed To (Customer)
  const toX = margin + colWidth + 6;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(toX, y, colWidth, 48, 2, 2, "FD");

  // Col 2 Header Tab
  doc.setFillColor(241, 245, 249);
  doc.rect(toX, y, colWidth, 7, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("BILLED TO (CUSTOMER)", toX + 4, y + 5);

  let toY = y + 12;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  const custBusinessName = data.organizationName || "Subscribed Business";
  doc.text(custBusinessName.slice(0, 38), toX + 4, toY);
  toY += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);

  // Customer Contact Name (cleanly distinguish real human personal names vs duplicate/corporate company entity names)
  const isCorporateEntityName = (name: string): boolean => {
    if (!name) return false;
    return /\b(pvt|ltd|limited|private|llp|corp|corporation|inc|incorporated|tech|technologies|technology|infratech|infra|enterprises|enterprise|solutions|solution|services|service|co|company|holdings|agency|studio|industries|industry|firm)\b/i.test(name);
  };

  const rawCustName = (data.customerName || "").trim();
  const rawBizName = (custBusinessName || "").trim();
  const isCorporateOrDuplicate =
    !rawCustName ||
    rawCustName.toLowerCase() === rawBizName.toLowerCase() ||
    rawBizName.toLowerCase().includes(rawCustName.toLowerCase()) ||
    rawCustName.toLowerCase().includes(rawBizName.toLowerCase()) ||
    isCorporateEntityName(rawCustName);

  let contactLine = "";
  if (!isCorporateOrDuplicate) {
    contactLine = data.customerPhone 
      ? `Contact: ${rawCustName} (${data.customerPhone})` 
      : `Contact: ${rawCustName}`;
  } else if (data.customerPhone) {
    contactLine = `Contact / Mobile: ${data.customerPhone}`;
  }
  
  if (contactLine) {
    doc.text(contactLine.slice(0, 44), toX + 4, toY);
    toY += 4.5;
  }

  doc.text(`Email: ${data.customerEmail}`, toX + 4, toY);
  toY += 4.5;

  if (data.customerGstin) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`GSTIN: ${data.customerGstin}`, toX + 4, toY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    toY += 4.5;
    doc.text("Customer Type: Registered Business (B2B)", toX + 4, toY);
    toY += 4.5;
  } else {
    doc.text("Customer Type: Consumer / Unregistered Business", toX + 4, toY);
    toY += 4.5;
  }
  
  const customerAddressLine = data.billingAddress || (data.customerState ? `${data.customerState}, India` : "India");
  doc.text(`Address: ${customerAddressLine.slice(0, 48)}`, toX + 4, toY);

  y += 54;

  // -------------------------------------------------------------
  // 4. SUBSCRIPTION SERVICE ITEMS TABLE
  // -------------------------------------------------------------
  const tableRows: any[][] = [];

  // Line 1: Main Plan Subscription or Add-on Synchronization
  const serviceDetailLine = data.isAddonOnly
    ? `Add-on Expansion (Synchronized with active plan · ${data.addonBillingMonths || (data.billingCycle === "yearly" ? 12 : 1)} month${(data.addonBillingMonths || (data.billingCycle === "yearly" ? 12 : 1)) > 1 ? "s" : ""})`
    : "Includes GST Invoicing, Inventory, Analytics & Cloud Backup";

  tableRows.push([
    "1",
    `${data.planDisplayName}\n${serviceDetailLine}\nService Period: ${data.periodStart} to ${data.periodEnd}`,
    "998315",
    "1",
    formatINR(taxable),
    data.discount ? formatINR(data.discount) : formatINR(0),
    formatINR(taxable),
    "18%",
    formatINR(total),
  ]);

  let nextSr = 2;

  // If extra employee capacity was added
  if (data.employeeCount && data.employeeCount > 0) {
    tableRows.push([
      String(nextSr++),
      `HRMS Staff Capacity (${data.employeeCount} Total Employees Active)\nValid until ${data.periodEnd}`,
      "998315",
      "1",
      "Included",
      formatINR(0),
      "Included",
      "18%",
      "Included",
    ]);
  }

  if (data.extraPlatformEmployees && data.extraPlatformEmployees > 0) {
    tableRows.push([
      String(nextSr++),
      `Additional Platform Access (+${data.extraPlatformEmployees} Admin User Slot${data.extraPlatformEmployees > 1 ? "s" : ""})\nValid until ${data.periodEnd}`,
      "998315",
      String(data.extraPlatformEmployees),
      "Included",
      formatINR(0),
      "Included",
      "18%",
      "Included",
    ]);
  }

  if (data.extraCrmMembers && data.extraCrmMembers > 0) {
    tableRows.push([
      String(nextSr++),
      `Additional CRM Sales Team (+${data.extraCrmMembers} Executive Login${data.extraCrmMembers > 1 ? "s" : ""})\nValid until ${data.periodEnd}`,
      "998315",
      String(data.extraCrmMembers),
      "Included",
      formatINR(0),
      "Included",
      "18%",
      "Included",
    ]);
  }

  const autoTableFn = (autoTable as any).default || autoTable;
  autoTableFn(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [
      [
        "Sr.",
        "Description of Service",
        "SAC Code",
        "Qty",
        "Rate",
        "Disc",
        "Taxable",
        "GST",
        "Total",
      ],
    ],
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: [22, 14, 61], // Assay Biz Navy
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
      cellPadding: 3,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 9, fontSize: 8 },
      1: { cellWidth: 58, fontSize: 8 },
      2: { halign: "center", cellWidth: 14, fontSize: 8 },
      3: { halign: "center", cellWidth: 9, fontSize: 8 },
      4: { halign: "right", cellWidth: 19, fontSize: 8 },
      5: { halign: "right", cellWidth: 15, fontSize: 8 },
      6: { halign: "right", cellWidth: 20, fontSize: 8 },
      7: { halign: "center", cellWidth: 14, fontSize: 8 },
      8: { halign: "right", cellWidth: 24, fontSize: 8, fontStyle: "bold" },
    },
    styles: {
      textColor: [30, 41, 59],
      cellPadding: 3.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 6;
  y = finalY;

  // -------------------------------------------------------------
  // 5. TAX BREAKDOWN & TOTAL SUMMARY BOX
  // -------------------------------------------------------------
  const summaryWidth = 85;
  const summaryX = pageWidth - margin - summaryWidth;

  // Left Note Box: Amount in Words & Payment Reference
  const leftBoxWidth = contentWidth - summaryWidth - 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, leftBoxWidth, 44, 2, 2, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("AMOUNT IN WORDS", margin + 4, y + 6);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  const words = numberToWordsINR(total);
  doc.text(doc.splitTextToSize(words, leftBoxWidth - 8), margin + 4, y + 12);

  let payInfoY = y + 22;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("PAYMENT TRANSACTION DETAILS", margin + 4, payInfoY);

  payInfoY += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(`Payment Gateway: Razorpay Online (Instant UPI / Cards / NetBanking)`, margin + 4, payInfoY);
  payInfoY += 4.5;
  doc.text(`Payment ID: ${data.razorpayPaymentId}`, margin + 4, payInfoY);
  payInfoY += 4.5;
  if (data.razorpayOrderId) {
    doc.text(`Order ID: ${data.razorpayOrderId}`, margin + 4, payInfoY);
    payInfoY += 4.5;
  }
  doc.text(`Transaction Status: Settled & Confirmed (INR)`, margin + 4, payInfoY);

  // Right Totals Box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(summaryX, y, summaryWidth, 44, 2, 2, "FD");

  let sY = y + 6;
  const drawSummaryRow = (label: string, value: string, isBold = false, isHighlight = false) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(isHighlight ? 10 : 8.5);
    doc.setTextColor(isHighlight ? 231 : 71, isHighlight ? 120 : 85, isHighlight ? 23 : 105);
    doc.text(label, summaryX + 4, sY);
    doc.text(value, summaryX + summaryWidth - 4, sY, { align: "right" });
    sY += 5.5;
  };

  drawSummaryRow("Taxable Amount (Subtotal):", formatINR(taxable));
  if (data.discount) {
    drawSummaryRow("Coupon Discount:", `- ${formatINR(data.discount)}`);
  }
  if (isCustomerMp) {
    drawSummaryRow("CGST (9%):", formatINR(cgst));
    drawSummaryRow("SGST (9%):", formatINR(sgst));
  } else {
    drawSummaryRow("IGST (18%):", formatINR(totalGst));
  }

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.line(summaryX + 4, sY - 1, summaryX + summaryWidth - 4, sY - 1);
  sY += 2;

  // Grand Total Highlight
  doc.setFillColor(22, 14, 61);
  doc.roundedRect(summaryX + 2, sY - 4, summaryWidth - 4, 10, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL PAID:", summaryX + 6, sY + 2);
  doc.setTextColor(254, 215, 170);
  doc.text(formatINR(total), summaryX + summaryWidth - 6, sY + 2, { align: "right" });

  y += 50;

  // -------------------------------------------------------------
  // 6. GREEN VERIFIED 'PAID' WATERMARK / STAMP
  // -------------------------------------------------------------
  const stampX = margin + 12;
  const stampY = y;

  doc.setDrawColor(22, 163, 74);
  doc.setFillColor(240, 253, 244); // green-50
  doc.roundedRect(stampX, stampY, 55, 14, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(22, 163, 74);
  doc.text("PAYMENT RECEIVED", stampX + 27.5, stampY + 9, { align: "center" });

  // -------------------------------------------------------------
  // 7. AUTHORIZED SIGNATURE BLOCK
  // -------------------------------------------------------------
  const signX = pageWidth - margin - 60;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("For Emerging Thoughts Pvt. Ltd.", signX, y + 2);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Digitally Generated & Authenticated", signX, y + 9);
  doc.text("Authorized Signatory", signX, y + 14);

  // -------------------------------------------------------------
  // 8. LEGAL FOOTER
  // -------------------------------------------------------------
  const footY = pageHeight - 14;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footY - 3, pageWidth - margin, footY - 3);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    "Terms: This is a computer-generated tax invoice for software subscription services. SAC Code: 998315. No physical signature required.",
    margin,
    footY
  );
  doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(
      "Emerging Thoughts Pvt. Ltd. | www.aassaybiz.com | support@aassaybiz.com | +91 78060 25875",
      margin,
      footY + 4
    );

  return doc;
}

/**
 * Returns the generated PDF as a Base64 string for email attachment.
 */
export function getSubscriptionInvoiceBase64(data: SubscriptionInvoiceData): string {
  const doc = generateSubscriptionInvoicePDF(data);
  const dataUri = doc.output("datauristring");
  return dataUri.split(",")[1];
}

/**
 * Returns the generated PDF as a Blob.
 */
export function getSubscriptionInvoiceBlob(data: SubscriptionInvoiceData): Blob {
  const doc = generateSubscriptionInvoicePDF(data);
  return doc.output("blob");
}

/**
 * Triggers instant browser download of the subscription invoice.
 */
export function downloadSubscriptionInvoicePDF(data: SubscriptionInvoiceData): void {
  const doc = generateSubscriptionInvoicePDF(data);
  const cleanFilename = `AassayBiz_TaxInvoice_${data.invoiceNumber || "Subscription"}.pdf`;
  doc.save(cleanFilename);
}
