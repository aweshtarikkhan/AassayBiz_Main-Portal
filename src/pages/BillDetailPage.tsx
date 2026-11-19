import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, ArrowLeft, Plus, Copy, MessageCircle, RotateCcw, Printer, Download, Mail, Loader2, Lock } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { postBillPaymentJournal } from "@/lib/accounting";
import { getOrCreateCashAccount } from "@/lib/banking-sync";
import { StyledInvoiceTemplate } from "@/components/invoice/StyledInvoiceTemplate";
import { resolveLineTaxRate } from "@/lib/invoiceCalculations";
import { calculateTaxBreakdown, stateCodeFromGstin } from "@/lib/gst";
import { getDocumentPreviewClass } from "@/lib/document-templates";
import { getWhatsappTemplate, compileWhatsappMessage, openWhatsappShare } from "@/lib/whatsapp";
import { useAutoEmailPDF } from "@/hooks/useAutoEmailPDF";
import { buildBrandedEmailHtml } from "@/lib/brand-email-template";
import { useCallback } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useSubscription } from "@/hooks/use-subscription";
import { canSendDirectEmailOrWhatsApp, normalizePlanKey } from "@/lib/subscription";
import { PlanSelectorModal } from "@/components/shared/PlanSelectorModal";

export default function BillDetailPage() {
  const org = useAppStore((s) => s.organization);
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [bill, setBill] = useState<any>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [vendor, setVendor] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [payOpen, setPayOpen] = useState(false);
  const [payAmt, setPayAmt] = useState("");
  const [payDate, setPayDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [payMethod, setPayMethod] = useState("bank_transfer");
  const [payRef, setPayRef] = useState("");
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");

  useEffect(() => {
    if (!org?.id) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("bank_accounts")
        .select("*")
        .eq("org_id", org.id)
        .eq("is_active", true)
        .order("name");
      const list = data || [];
      setBankAccounts(list);
      if (list.length > 0 && !selectedBankAccountId) {
        const defaultAcct = list.find((a: any) => payMethod === "cash" ? a.account_type === "cash" : a.account_type !== "cash") || list[0];
        if (defaultAcct) setSelectedBankAccountId(defaultAcct.id);
      }
    })();
  }, [org?.id]);

  const selectedAccount = useMemo(() => {
    return bankAccounts.find((b) => b.id === selectedBankAccountId);
  }, [bankAccounts, selectedBankAccountId]);

  const handlePayMethodChange = async (method: string) => {
    setPayMethod(method);
    if (method === "cash") {
      let cashAcc = bankAccounts.find((a) => a.account_type === "cash");
      if (!cashAcc && org?.id) {
        cashAcc = await getOrCreateCashAccount(org.id, (org as any)?.currency || "INR");
        if (cashAcc) {
          setBankAccounts((prev) => [cashAcc, ...prev.filter((a) => a.id !== cashAcc.id)]);
        }
      }
      if (cashAcc) {
        setSelectedBankAccountId(cashAcc.id);
      }
    } else {
      const current = bankAccounts.find((a) => a.id === selectedBankAccountId);
      if (current?.account_type === "cash") {
        const bankAcc = bankAccounts.find((a) => a.account_type !== "cash");
        if (bankAcc) {
          setSelectedBankAccountId(bankAcc.id);
        }
      }
    }
  };

  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const { subscriptionPlan } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [activeOrgPlans, setActiveOrgPlans] = useState<string[]>([]);
  const plan = normalizePlanKey(subscriptionPlan);
  const canSend = canSendDirectEmailOrWhatsApp(plan, activeOrgPlans);

  useEffect(() => {
    if (!org?.id) return;
    const fetchOrgSub = async () => {
      try {
        const { data: subData } = await supabase.rpc("get_my_org_subscription", { p_org_id: org.id });
        if (subData?.all_plans && Array.isArray(subData.all_plans)) {
          setActiveOrgPlans(subData.all_plans);
        }
      } catch (e) {
        console.error("Error fetching sub in bill detail:", e);
      }
    };
    fetchOrgSub();
  }, [org?.id]);

  const load = async () => {
    const { data: b } = await (supabase as any).from("bills").select("*").eq("id", id).maybeSingle();
    if (!b) { toast({ title: "Error", description: "Bill not found", variant: "destructive" }); navigate("/purchase-invoices"); return; }
    setBill(b);
    setPayAmt(String(b.balance_due));
    const [linesRes, { data: v }, { data: p }] = await Promise.all([
      (supabase as any)
        .from("bill_lines")
        .select("*, items(name, sku, unit, hsn_code)")
        .eq("bill_id", id)
        .order("sort_order"),
      (supabase as any).from("vendors").select("*").eq("id", b.vendor_id).maybeSingle(),
      (supabase as any).from("bill_payments").select("*").eq("bill_id", id).order("payment_date", { ascending: false }),
    ]);

    let loadedLines = linesRes?.data;
    if (linesRes?.error || !loadedLines || loadedLines.length === 0) {
      const { data: fallbackLines } = await (supabase as any)
        .from("bill_lines")
        .select("*")
        .eq("bill_id", id)
        .order("sort_order");
      if (fallbackLines && fallbackLines.length > 0) {
        loadedLines = fallbackLines;
      }
    }
    setLines(loadedLines || []); setVendor(v); setPayments(p || []);
  };
  useEffect(() => { load(); }, [id]);

  const recordPayment = async () => {
    const amt = Number(payAmt);
    if (!amt || amt <= 0) { toast({ title: "Enter amount", variant: "destructive" }); return; }
    if (!org?.id || !bill) return;
    const payload: any = {
      org_id: org.id, vendor_id: bill.vendor_id, bill_id: bill.id,
      payment_date: payDate, amount: amt, payment_method: payMethod, reference: payRef || null,
      branch_id: bill.branch_id,
      bank_account_id: selectedBankAccountId || null,
    };
    const { data: pmt, error } = await (supabase as any).from("bill_payments").insert(payload).select().single();
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }

    // Record debit transaction in bank_transactions & update bank account balance
    if (selectedBankAccountId && pmt) {
      try {
        const { data: account } = await (supabase as any)
          .from("bank_accounts")
          .select("current_balance")
          .eq("id", selectedBankAccountId)
          .single();
        const prevBal = Number(account?.current_balance || 0);
        const newBal = prevBal - amt;

        await (supabase as any).from("bank_transactions").insert({
          org_id: org.id,
          bank_account_id: selectedBankAccountId,
          txn_date: payDate,
          amount: amt,
          direction: "debit",
          description: `Payment for Bill ${bill.vendor_bill_number || bill.bill_number} to ${vendor?.name || 'Vendor'}`,
          reference: payRef || null,
          counterparty: vendor?.name || null,
          balance_after: newBal,
          source: "bill_payment",
          reconciled: true,
          reconciled_at: new Date().toISOString(),
          matched_type: "bill_payment",
          matched_id: pmt.id,
        });

        await (supabase as any).from("bank_accounts").update({
          current_balance: newBal,
          updated_at: new Date().toISOString(),
        }).eq("id", selectedBankAccountId);
      } catch (err) {
        console.error("Error updating bank for bill payment:", err);
      }
    }

    const newPaid = Number(bill.amount_paid) + amt;
    const newDue = Math.max(0, Number(bill.total) - newPaid);
    const status = newDue <= 0 ? "paid" : "partial";
    await (supabase as any).from("bills").update({ amount_paid: newPaid, balance_due: newDue, status }).eq("id", bill.id);
    await postBillPaymentJournal(org.id, pmt.id, payDate, bill.bill_number, bill.vendor_id, amt, payMethod, bill.branch_id);

    // Update vendor balance due
    const { data: vBills } = await (supabase as any)
      .from("bills")
      .select("balance_due")
      .eq("vendor_id", bill.vendor_id)
      .not("status", "in", '("draft","cancelled")');
    const computedVendorDue = (vBills || []).reduce((sum: number, b: any) => sum + Number(b.balance_due || 0), 0);
    await (supabase as any).from("vendors").update({
      balance_due: Math.max(0, computedVendorDue),
      updated_at: new Date().toISOString(),
    }).eq("id", bill.vendor_id);
    toast({ title: "Payment recorded" });
    setPayOpen(false); setPayRef(""); load();
  };

  const statusColor: Record<string, string> = {
    draft: "bg-muted", received: "bg-blue-100 text-blue-700",
    partial: "bg-amber-100 text-amber-700", paid: "bg-emerald-100 text-emerald-700",
  };
  const invoiceRef = useRef<HTMLDivElement>(null);

  const { mappedBillForTemplate, billShowSignature } = useMemo(() => {
    if (!bill) return { mappedBillForTemplate: null, billShowSignature: true };
    const vendorName = vendor?.display_name || vendor?.name || (bill as any)?.vendor_name || "Vendor";
    
    let baseNotes = bill.notes || "";
    let extraData: any = {};
    if (baseNotes.includes("---EXTRA_DATA---")) {
      const parts = baseNotes.split("---EXTRA_DATA---");
      baseNotes = parts[0].trim();
      try {
        extraData = JSON.parse(parts[1].trim());
      } catch (e) {
        console.error("Failed to parse extra data", e);
      }
    }
    const meta = bill.metadata && typeof bill.metadata === 'object' ? bill.metadata : {};
    const billPref = (org?.invoice_preferences as any) || {};

    const showTerms = extraData.showTerms ?? meta.showTerms ?? (billPref.bill_pdf_show_terms !== false);
    const showNotes = extraData.showNotes ?? meta.showNotes ?? (billPref.bill_pdf_show_notes !== false);
    const showBank = extraData.includeBankDetails ?? meta.includeBankDetails ?? (billPref.bill_pdf_show_bank_details !== false);
    const showSig = extraData.showSignature ?? meta.showSignature ?? (billPref.bill_pdf_show_signature !== false);

    const mapped = {
      ...bill,
      notes: baseNotes,
      invoice_number: bill.vendor_bill_number || bill.bill_number,
      issue_date: bill.bill_date,
      total_tax: bill.tax_total || 0,
      total_discount: bill.discount_total || 0,
      adjustment: Number(bill.adjustment || 0),
      adjustment_name: bill.adjustment_name || "Adjustment",
      shipping_charge: Number(bill.shipping_charge || 0),
      expenses: Number((bill as any).expenses || 0),
      tds_tcs_applicable: Boolean((bill as any).tds_tcs_applicable),
      tds_tcs_type: (bill as any).tds_tcs_type || "tds",
      tds_tcs_rate: Number((bill as any).tds_tcs_rate || 0),
      tds_tcs_amount: Number((bill as any).tds_tcs_amount || 0),
      metadata: {
        ...meta,
        show_terms: showTerms,
        show_notes: showNotes,
        include_bank_details: showBank,
        show_bank_details: showBank,
      },
      clients: {
        display_name: vendorName,
        tax_number: vendor?.gstin || (bill as any)?.vendor_gstin,
        billing_address: vendor?.billing_address || (bill as any)?.vendor_address,
        email: vendor?.email,
        phone: vendor?.phone
      }
    };

    return { mappedBillForTemplate: mapped, billShowSignature: showSig };
  }, [bill, vendor, org]);

  const isInterstate = useMemo(() => {
    if (!bill || !org) return false;
    const orgState = org.gst_number ? stateCodeFromGstin(org.gst_number) : null;
    let clientState = null;
    const vendorGstin = vendor?.gstin || (bill as any)?.vendor_gstin;
    if (vendorGstin) clientState = stateCodeFromGstin(vendorGstin);
    return Boolean(orgState && clientState && orgState !== clientState);
  }, [bill, org, vendor]);

  const enhancedLines = useMemo(() => {
    return (lines || []).map((l: any) => {
      const desc = l.description || "";
      const splitDesc = desc.split("\n");
      const itemName = l.items?.name || l.name || splitDesc[0] || "Item";
      const itemDesc = l.items?.name ? desc : (splitDesc.slice(1).join("\n") || "");
      const q = Number(l.quantity) || 1;
      const r = Number(l.rate) || 0;
      const tr = Number(l.tax_rate) !== undefined && !isNaN(Number(l.tax_rate)) ? Number(l.tax_rate) : resolveLineTaxRate(l);
      const tax_amount = Number(l.tax_amount) || (q * r * (tr / 100));
      const amount = Number(l.amount) || (q * r + tax_amount);
      return {
        ...l,
        name: itemName,
        description: itemDesc,
        hsn_code: l.hsn || l.hsn_code || l.items?.hsn_code || "",
        unit: l.unit || l.items?.unit || "pcs",
        quantity: q,
        rate: r,
        tax_rate: tr,
        tax_rates: l.tax_rates || { rate: tr, name: `${tr}%` },
        tax_amount,
        amount,
      };
    });
  }, [lines]);

  const taxBreakdown = useMemo(() => {
    if (!bill || !org || !enhancedLines.length) return [];
    
    let breakdown = calculateTaxBreakdown(enhancedLines, [], isInterstate);
    
    // Fallback if breakdown is empty but total tax > 0
    if (breakdown.length === 0 && bill.tax_total > 0) {
      const totalTax = Number(bill.tax_total || 0);
      const subtotal = Number(bill.subtotal || 0);
      const assumedRate = subtotal > 0 ? Math.round((totalTax / subtotal) * 100) : 0;
      
      if (isInterstate) {
        breakdown = [{ id: `IGST_${assumedRate}`, name: assumedRate > 0 ? `IGST @ ${assumedRate}%` : 'IGST', rate: assumedRate, amount: totalTax }];
      } else {
        const halfRate = assumedRate / 2;
        breakdown = [
          { id: `CGST_${halfRate}`, name: halfRate > 0 ? `CGST @ ${halfRate}%` : 'CGST', rate: halfRate, amount: totalTax / 2 },
          { id: `SGST_${halfRate}`, name: halfRate > 0 ? `SGST @ ${halfRate}%` : 'SGST', rate: halfRate, amount: totalTax / 2 }
        ];
      }
    }
    
    return breakdown;
  }, [bill, enhancedLines, org, isInterstate]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: (org as any)?.currency || "INR" }).format(n);


  const generatePDFBlob = useCallback(async (): Promise<Blob | null> => {
    if (!org || !bill) return null;
    const target = invoiceRef.current?.firstElementChild as HTMLElement || invoiceRef.current;
    if (!target) return null;

    const paperSizes: Record<string, [number, number]> = {
      a4: [210, 297], letter: [215.9, 279.4], legal: [215.9, 355.6], a5: [148, 210], a6: [105, 148], pos80: [80, 297],
    };
    const paperKey = (org as any).template_paper_size || "a4";
    const [pW, pH] = paperSizes[paperKey] || paperSizes.a4;
    const targetPxWidth = Math.round(pW * 3.779528);
    
    const canvas = await html2canvas(target, {
      scale: 1,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: targetPxWidth,
      onclone: (clonedDoc) => {
        const el = (clonedDoc.querySelector('.print\\:m-0')?.firstElementChild as HTMLElement) || (clonedDoc.body.firstElementChild as HTMLElement);
        if (el) {
          el.style.width = `${targetPxWidth}px`;
          el.style.maxWidth = `${targetPxWidth}px`;
          el.style.minWidth = `${targetPxWidth}px`;
          el.style.boxShadow = "none";
          el.style.border = "none";
          el.style.borderRadius = "0";
          el.style.margin = "0";
        }
      },
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.7);
    const imgWmm = pW;
    const imgHmm = (canvas.height * imgWmm) / canvas.width;

    if (paperKey === "pos80") {
      const pageH = imgHmm + 4;
      const pdf = new jsPDF("p", "mm", [pW, pageH]);
      pdf.addImage(imgData, "JPEG", 0, 2, pW, imgHmm);
      return pdf.output('blob');
    }

    const pdf = new jsPDF("p", "mm", [pW, pH]);
    if (imgHmm <= pH + 3) {
      pdf.addImage(imgData, "JPEG", 0, 0, pW, Math.min(imgHmm, pH));
    } else {
      let heightLeft = imgHmm;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, pW, imgHmm);
      heightLeft -= pH;
      while (heightLeft > 0) {
        position -= pH;
        pdf.addPage([pW, pH]);
        pdf.addImage(imgData, "JPEG", 0, position, pW, imgHmm);
        heightLeft -= pH;
      }
    }
    return pdf.output('blob');
  }, [bill, org]);

  const fullBillData = useMemo(() => {
    return bill && vendor ? { ...bill, vendors: vendor } : null;
  }, [bill, vendor]);

  useAutoEmailPDF({ entityType: "bill", entityData: fullBillData, lines: enhancedLines, generatePDFBlob });

  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleSendEmail = async () => {
    if (!canSend) {
      toast({
        title: "Feature Locked 🔒",
        description: "Direct document emailing is a premium feature. Please upgrade to Business Suite or Business Integration to send directly via Email.",
        variant: "destructive"
      });
      setShowUpgradeModal(true);
      return;
    }
    if (!bill || !org || !vendor) return;
    const recipientEmail = vendor.email;
    if (!recipientEmail) {
      toast({
        title: "No email address",
        description: "This vendor does not have an email address specified.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);
    toast({ title: "Generating Purchase Invoice PDF for email..." });

    try {
      const pdfBlob = await generatePDFBlob();
      if (!pdfBlob) throw new Error("Could not generate Purchase Invoice PDF");

      const base64data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(pdfBlob);
        reader.onloadend = () => {
          resolve((reader.result as string).split(",")[1]);
        };
      });

      const subject = `Purchase Invoice #${bill.bill_number} from ${org.name || "Aassay Biz"}`;
      const details = [
        { label: "Bill Number", value: bill.bill_number },
        { label: "Bill Date", value: bill.bill_date || bill.date || new Date().toISOString().split("T")[0] },
      ];
      if (bill.due_date) {
        details.push({ label: "Due Date", value: bill.due_date, isHighlight: true });
      }

      const html = buildBrandedEmailHtml({
        logoUrl: org.logo_url || "https://aassaybiz.com/logo.png",
        companyName: org.name || "Aassay Biz",
        companyEmail: org.email || "support@aassaybiz.com",
        badgeText: "PURCHASE INVOICE",
        title: `Purchase Invoice #${bill.bill_number}`,
        subtitle: `Vendor Bill for ${org.name || "Aassay Biz"}`,
        recipientName: vendor.display_name || vendor.name || "Vendor Partner",
        introText: `Please find attached our recorded Purchase Invoice / Bill from <strong>${org.name || "Aassay Biz"}</strong>:`,
        amountLabel: "Total Bill Amount",
        amountValue: fmt(Number(bill.total)),
        details,
        attachmentNote: `Purchase Invoice PDF (${bill.bill_number}.pdf) is attached to this email for your accounts and payment reconciliation.`,
      });

      const { data, error } = await supabase.functions.invoke("send-custom-email", {
        body: {
          to: recipientEmail,
          subject,
          html,
          orgId: org.id,
          attachments: [
            {
              filename: `${bill.bill_number}.pdf`,
              content: base64data,
              content_type: "application/pdf",
            },
          ],
        },
      });

      if (error || data?.error) throw new Error(error?.message || data?.error || "Failed to dispatch email");

      toast({
        title: "Email Sent Successfully! ✉️",
        description: `Purchase Invoice PDF was successfully emailed to ${recipientEmail}.`,
      });
    } catch (err: any) {
      console.error("Error emailing bill:", err);
      
      // If it's the specific Edge Function timeout error, it means the request timed out on the client,
      // but the backend is still processing it and will likely send it successfully.
      if (err.message?.includes("Failed to send a request to the Edge Function")) {
        toast({
          title: "Email Queued ✉️",
          description: `Purchase Invoice is being processed and will be delivered to ${recipientEmail} shortly.`,
        });
        return;
      }

      toast({
        title: "Failed to send email",
        description: err.message || "An error occurred while emailing bill.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (!bill) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/purchase-invoices")}><ArrowLeft className="h-4 w-4 mr-1" /> Purchase Invoices</Button>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleSendEmail} disabled={isSendingEmail} className="text-blue-600 hover:text-blue-700">
            {isSendingEmail ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />}
            {isSendingEmail ? "Sending..." : "Email Bill"}
            {!canSend && <Lock className="ml-1 h-3.5 w-3.5 text-amber-500" />}
          </Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print</Button>
          <Button variant="outline" onClick={async () => {
            const blob = await generatePDFBlob();
            if (blob) {
               const url = URL.createObjectURL(blob);
               const a = document.createElement("a");
               a.href = url;
               a.download = `${bill.bill_number || "purchase-invoice"}.pdf`;
               a.click();
               URL.revokeObjectURL(url);
            }
          }}><Download className="h-4 w-4 mr-1" /> Download PDF</Button>
          <Button variant="outline" disabled={!(useAppStore.getState().userRole === 'admin' || useAppStore.getState().userRole === 'owner' || useAppStore.getState().userPermissions.includes('whatsapp_access'))} onClick={async () => {
            if (!canSend) {
              toast({
                title: "Feature Locked 🔒",
                description: "Sending documents via WhatsApp is a premium feature. Please upgrade to Business Suite or Business Integration to send directly via WhatsApp.",
                variant: "destructive"
              });
              setShowUpgradeModal(true);
              return;
            }
            if (!org || !bill) return;
            const vendorName = vendor?.display_name || vendor?.name || "Vendor";
            const template = await getWhatsappTemplate(org.id, "bill");
            const txt = compileWhatsappMessage(template, {
              client_name: vendorName,
              document_no: bill.bill_number,
              total: fmt(Number(bill.total)),
              due_date: bill.due_date || bill.bill_date || "",
              subtotal: fmt(Number(bill.subtotal)),
              tax: fmt(Number(bill.tax_total)),
              discount: fmt(Number(bill.discount_total)),
              tds: bill.tds_amount ? fmt(Number(bill.tds_amount)) : "0.00",
              adjustment: bill.adjustment ? fmt(Number(bill.adjustment)) : "0.00",
              items: enhancedLines.map(l => `- ${l.name || 'Item'} x${l.quantity}`).join('\n'),
              portal_link: "",
              org_name: org.name
            });

            await openWhatsappShare({
              phone: vendor?.phone,
              message: txt,
              orgId: org.id
            });
          }}>
            <MessageCircle className="h-4 w-4 mr-1 text-emerald-600" /> WhatsApp
            {!canSend && <Lock className="ml-1 h-3.5 w-3.5 text-amber-500" />}
          </Button>
          <Button variant="outline" onClick={() => setDuplicateDialogOpen(true)}><Copy className="h-4 w-4 mr-1" /> Duplicate</Button>
          <Button variant="outline" onClick={() => navigate(`/debit-notes/new?vendor_id=${bill.vendor_id}&bill_id=${bill.id}`)}><RotateCcw className="h-4 w-4 mr-1 text-rose-500" /> Return Items</Button>
          <Button variant="outline" onClick={() => navigate(`/purchase-invoices/${id}/edit`)}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
          {bill.balance_due > 0 && <Button onClick={() => setPayOpen(true)}><Plus className="h-4 w-4 mr-1" /> Record Payment</Button>}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Badge className={statusColor[bill.status]}>{bill.status}</Badge>
        <span className="text-sm text-muted-foreground">
          {vendor?.display_name || vendor?.name || "Vendor"} • Purchase Invoice Date {bill.bill_date ? format(new Date(bill.bill_date), "dd MMM yyyy") : ""}
        </span>
      </div>

      <div ref={invoiceRef}>
          {mappedBillForTemplate && (
            <div className={getDocumentPreviewClass(org?.template_style, org?.template_paper_size)}>
              <StyledInvoiceTemplate org={org} invoice={mappedBillForTemplate} lines={enhancedLines} fmt={fmt} type="bill" taxBreakdown={taxBreakdown} isInterstate={isInterstate} showSignature={billShowSignature} />
            </div>
          )}
      </div>

      {payments.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Method</TableHead><TableHead>Reference</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {payments.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{format(new Date(p.payment_date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="capitalize">{p.payment_method.replace("_", " ")}</TableCell>
                    <TableCell>{p.reference || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(p.amount), (org as any)?.currency || "INR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Amount</Label><Input type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)} /></div>
            <div><Label>Date</Label><Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} /></div>
            <div>
              <Label>Method</Label>
              <Select value={payMethod} onValueChange={handlePayMethodChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="flex items-center justify-between">
                <span>Paid From Account *</span>
                {selectedAccount && (
                  <span className="text-xs text-muted-foreground font-normal">
                    Bal: {formatCurrency(Number(selectedAccount.current_balance || 0), (org as any)?.currency || "INR")}
                  </span>
                )}
              </Label>
              <Select value={selectedBankAccountId} onValueChange={setSelectedBankAccountId}>
                <SelectTrigger><SelectValue placeholder="Select Bank / Account" /></SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      <div className="flex items-center justify-between gap-3 w-full">
                        <span>{b.bank_name ? `${b.bank_name} ${b.account_number ? `(..${b.account_number.slice(-4)})` : ''}` : b.name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase px-1 py-0.5 rounded bg-muted/60">{b.account_type || 'Bank'}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Reference</Label><Input value={payRef} onChange={e => setPayRef(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button onClick={recordPayment}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Purchase Invoice?</DialogTitle>
            <DialogDescription>
              This will create a new copy of this purchase invoice using today's date. You can review and edit it before saving.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setDuplicateDialogOpen(false); navigate(`/purchase-invoices/new?duplicate=${id}`); }}>Create Duplicate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PlanSelectorModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        orgId={org?.id}
      />
    </div>
  );
}


