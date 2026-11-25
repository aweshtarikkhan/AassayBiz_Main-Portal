import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { postPaymentJournal } from "@/lib/accounting";
import { useAppStore } from "@/store/app-store";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { formatSequenceNumber } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { ArrowLeft, CreditCard, IndianRupee, AlertCircle, CheckCircle2, Plus, Sparkles, Search, ArrowUp, ArrowDown, Building2, Wallet } from "lucide-react";
import { AddClientDialog } from "@/components/shared/AddClientDialog";
import { recordPaymentBankingTransaction, getOrCreateCashAccount } from "@/lib/banking-sync";

const PAYMENT_MODES = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "credit_card", label: "Credit Card" },
  { value: "upi", label: "UPI" },
  { value: "paypal", label: "PayPal" },
  { value: "other", label: "Other" },
];

interface OutstandingInvoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total: number;
  balance_due: number;
  status: string;
  selected: boolean;
  payment: number;
}

function allocateAmountAcrossInvoices(
  invList: OutstandingInvoice[],
  totalAmount: number
): OutstandingInvoice[] {
  let remaining = Math.max(0, totalAmount);
  return invList.map((inv) => {
    if (!inv.selected) {
      return { ...inv, payment: 0 };
    }
    const pay = Math.min(remaining, inv.balance_due);
    remaining = Math.max(0, remaining - pay);
    return { ...inv, payment: Math.round(pay * 100) / 100 };
  });
}

interface ClientAdvance {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  usedAmount: number;
  availableAmount: number;
}

export default function RecordPaymentPage() {
  const org = useAppStore((s) => s.organization);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClientId = searchParams.get("client_id");
  const queryInvoiceId = searchParams.get("invoice_id");
  const queryAmount = searchParams.get("amount");

  const { toast } = useToast();
  const { user } = useAuth();

  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState(queryClientId || "");
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMode, setPaymentMode] = useState("bank_transfer");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [amountReceived, setAmountReceived] = useState(queryAmount || "");
  const [invoices, setInvoices] = useState<OutstandingInvoice[]>([]);
  const [clientAdvances, setClientAdvances] = useState<ClientAdvance[]>([]);
  const [totalAvailableAdvance, setTotalAvailableAdvance] = useState(0);
  const [applyAdvanceCredit, setApplyAdvanceCredit] = useState(false);
  const [advanceAmountToApply, setAdvanceAmountToApply] = useState(0);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [saving, setSaving] = useState(false);

  const [invoiceSearch, setInvoiceSearch] = useState("");
  type SortKey = "invoice_number" | "issue_date" | "due_date" | "status" | "total" | "balance_due" | "payment";
  const [sortKey, setSortKey] = useState<SortKey>("issue_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };
  const SortArrow = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === "asc" ? <ArrowUp className="inline h-3 w-3 ml-1" /> : <ArrowDown className="inline h-3 w-3 ml-1" />
    ) : null;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

  const getAccountDisplayName = (a: any) => {
    if (a.account_type === "cash") {
      return a.name || "Cash in Hand";
    }
    let bankTitle = a.bank_name?.trim();
    if (!bankTitle && a.notes) {
      try {
        const parsed = typeof a.notes === "string" ? JSON.parse(a.notes) : a.notes;
        if (parsed.bank_name?.trim()) {
          bankTitle = parsed.bank_name.trim();
        }
      } catch {}
    }
    if (!bankTitle) {
      bankTitle = a.name || "Bank Account";
    }
    const accNum = a.account_number ? String(a.account_number).trim() : "";
    const last4 = accNum ? accNum.slice(-4) : "";
    return last4 ? `${bankTitle} (${last4})` : bankTitle;
  };

  // Load clients
  useEffect(() => {
    if (!org?.id) return;
    supabase.from("clients").select("id, display_name").eq("org_id", org.id).eq("status", "active").order("display_name").then(({ data }) => {
      setClients(data || []);
      if (!clientId && queryClientId) {
        setClientId(queryClientId);
      }
    });
  }, [org?.id]);

  // Load bank and cash accounts
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
      if (list.length > 0) {
        const defaultAcct = list.find((a: any) => paymentMode === "cash" ? a.account_type === "cash" : a.account_type !== "cash") || list[0];
        if (defaultAcct) setSelectedBankAccountId(defaultAcct.id);
      }
    })();
  }, [org?.id]);

  const selectedAccount = useMemo(() => {
    return bankAccounts.find((b) => b.id === selectedBankAccountId);
  }, [bankAccounts, selectedBankAccountId]);

  const handlePaymentModeChange = async (mode: string) => {
    setPaymentMode(mode);
    if (mode === "cash") {
      let cashAcc = bankAccounts.find((a) => a.account_type === "cash");
      if (!cashAcc && org?.id) {
        cashAcc = await getOrCreateCashAccount(org.id, org.currency_code || "INR");
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

  // Load outstanding invoices and unallocated advance credits when client changes
  useEffect(() => {
    if (!clientId || !org?.id) {
      setInvoices([]);
      setClientAdvances([]);
      setTotalAvailableAdvance(0);
      setApplyAdvanceCredit(false);
      setAdvanceAmountToApply(0);
      return;
    }

    setLoadingInvoices(true);
    (async () => {
      try {
        const [invRes, advRes, appliedRes] = await Promise.all([
          supabase
            .from("invoices")
            .select("id, invoice_number, issue_date, due_date, total, balance_due, status")
            .eq("org_id", org.id)
            .eq("client_id", clientId)
            .gt("balance_due", 0)
            .in("status", ["sent", "viewed", "partial", "overdue"])
            .order("due_date", { ascending: true }),
          supabase
            .from("payments")
            .select("*")
            .eq("org_id", org.id)
            .eq("client_id", clientId)
            .is("invoice_id", null)
            .order("payment_date", { ascending: true }),
          supabase
            .from("payments")
            .select("amount, reference_number")
            .eq("org_id", org.id)
            .eq("client_id", clientId)
            .eq("payment_mode", "advance_credit"),
        ]);

        // Calculate usage per advance payment
        const usedMap: Record<string, number> = {};
        (appliedRes.data || []).forEach((p: any) => {
          if (p.reference_number) {
            const ref = p.reference_number.trim();
            usedMap[ref] = (usedMap[ref] || 0) + Number(p.amount);
          }
        });

        const advList: ClientAdvance[] = [];
        let totalAdv = 0;
        (advRes.data || []).forEach((adv: any) => {
          const ref = (adv.payment_number || "").trim();
          const used = usedMap[ref] || 0;
          const remaining = Math.max(0, Number(adv.amount) - used);
          if (remaining > 0.001) {
            advList.push({
              id: adv.id,
              payment_number: adv.payment_number,
              payment_date: adv.payment_date,
              amount: Number(adv.amount),
              usedAmount: used,
              availableAmount: remaining,
            });
            totalAdv += remaining;
          }
        });

        setClientAdvances(advList);
        setTotalAvailableAdvance(totalAdv);

        const rawList = invRes.data || [];
        const initialInvoices: OutstandingInvoice[] = rawList.map((inv) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          issue_date: inv.issue_date,
          due_date: inv.due_date,
          total: Number(inv.total),
          balance_due: Number(inv.balance_due),
          status: inv.status,
          selected: queryInvoiceId ? inv.id === queryInvoiceId : true,
          payment: 0,
        }));

        const totalOut = initialInvoices.reduce((s, i) => s + i.balance_due, 0);

        // Auto-enable advance credit if available and invoices exist
        const shouldApply = totalAdv > 0.001 && initialInvoices.length > 0;
        const advToUse = shouldApply ? Math.min(totalAdv, totalOut) : 0;
        setApplyAdvanceCredit(shouldApply);
        setAdvanceAmountToApply(advToUse);

        const freshAmt = parseFloat(amountReceived) || 0;
        const initialPool = (shouldApply ? advToUse : 0) + freshAmt;

        if (initialPool > 0) {
          setInvoices(allocateAmountAcrossInvoices(initialInvoices, initialPool));
        } else if (queryInvoiceId) {
          const target = initialInvoices.find((i) => i.id === queryInvoiceId);
          if (target) {
            setAmountReceived(String(target.balance_due));
            setInvoices(allocateAmountAcrossInvoices(initialInvoices, target.balance_due));
          } else {
            setInvoices(initialInvoices);
          }
        } else {
          setInvoices(initialInvoices);
        }
      } catch (err) {
        console.error("Error loading client invoices/advances:", err);
      } finally {
        setLoadingInvoices(false);
      }
    })();
  }, [clientId, queryInvoiceId, org?.id]);

  const totalOutstanding = invoices.reduce((s, i) => s + i.balance_due, 0);
  const totalApplied = invoices.reduce((s, i) => s + (i.selected ? i.payment : 0), 0);
  const freshAmountNum = parseFloat(amountReceived) || 0;

  // Effective advance amount that is actually consumed by invoices
  const effectiveAdvanceToUse = applyAdvanceCredit
    ? Math.min(advanceAmountToApply, totalApplied)
    : 0;

  // Fresh cash that is consumed by invoices
  const freshAmountApplied = Math.max(0, totalApplied - effectiveAdvanceToUse);

  // Any excess fresh payment that is recorded as a new advance credit
  const excessAmount = Math.max(0, freshAmountNum - freshAmountApplied);

  // Remaining unused advance credit after this payment
  const remainingAdvanceCredit = Math.max(0, totalAvailableAdvance - effectiveAdvanceToUse);

  const recalculateAllocations = (
    baseInvoices: OutstandingInvoice[],
    freshStr: string,
    useAdvance: boolean,
    advAmt: number
  ) => {
    const fresh = parseFloat(freshStr) || 0;
    const adv = useAdvance ? advAmt : 0;
    const totalPool = fresh + adv;
    return allocateAmountAcrossInvoices(baseInvoices, totalPool);
  };

  // Auto-distribute amount across selected invoices
  const handleAmountChange = (value: string) => {
    setAmountReceived(value);
    setInvoices((prev) => {
      const hasSelected = prev.some((i) => i.selected);
      const base = hasSelected ? prev : prev.map((i) => ({ ...i, selected: true }));
      return recalculateAllocations(base, value, applyAdvanceCredit, advanceAmountToApply);
    });
  };

  const handleToggleApplyAdvance = (checked: boolean) => {
    setApplyAdvanceCredit(checked);
    const advAmt = checked ? Math.min(totalAvailableAdvance, totalOutstanding) : 0;
    setAdvanceAmountToApply(advAmt);
    setInvoices((prev) => {
      const hasSelected = prev.some((i) => i.selected);
      const base = hasSelected ? prev : prev.map((i) => ({ ...i, selected: true }));
      return recalculateAllocations(base, amountReceived, checked, advAmt);
    });
  };

  const handleAdvanceAmountChange = (val: number) => {
    const clamped = Math.max(0, Math.min(val, totalAvailableAdvance));
    setAdvanceAmountToApply(clamped);
    if (applyAdvanceCredit) {
      setInvoices((prev) => {
        const hasSelected = prev.some((i) => i.selected);
        const base = hasSelected ? prev : prev.map((i) => ({ ...i, selected: true }));
        return recalculateAllocations(base, amountReceived, true, clamped);
      });
    }
  };

  const handleSelectInvoice = (id: string, checked: boolean) => {
    setInvoices((prev) => {
      const updated = prev.map((inv) =>
        inv.id === id ? { ...inv, selected: checked } : inv
      );
      return recalculateAllocations(updated, amountReceived, applyAdvanceCredit, advanceAmountToApply);
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setInvoices((prev) => {
      const updated = prev.map((inv) => ({ ...inv, selected: checked }));
      return recalculateAllocations(updated, amountReceived, applyAdvanceCredit, advanceAmountToApply);
    });
  };

  const handlePaymentEdit = (id: string, value: number) => {
    setInvoices((prev) => {
      const updated = prev.map((inv) => {
        if (inv.id === id) {
          const clamped = Math.max(0, Math.min(value, inv.balance_due));
          return { ...inv, payment: clamped, selected: clamped > 0 };
        }
        return inv;
      });
      const newTotal = updated.reduce((s, i) => s + (i.selected ? i.payment : 0), 0);
      const advUsed = applyAdvanceCredit ? Math.min(advanceAmountToApply, newTotal) : 0;
      const freshNeeded = newTotal - advUsed;
      setAmountReceived(freshNeeded > 0 ? String(freshNeeded) : "");
      return updated;
    });
  };

  const handleFillTotal = () => {
    const advUsed = applyAdvanceCredit ? Math.min(advanceAmountToApply, totalOutstanding) : 0;
    const freshNeeded = Math.max(0, totalOutstanding - advUsed);
    setAmountReceived(freshNeeded > 0 ? String(freshNeeded) : "");
    setInvoices((prev) =>
      allocateAmountAcrossInvoices(
        prev.map((i) => ({ ...i, selected: true })),
        totalOutstanding
      )
    );
  };

  const processedInvoices = useMemo(() => {
    let arr = [...invoices];
    if (invoiceSearch) {
      const q = invoiceSearch.toLowerCase();
      arr = arr.filter(i => 
        [i.invoice_number, i.status]
          .filter(Boolean)
          .some(f => f.toLowerCase().includes(q))
      );
    }
    arr.sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case "issue_date":
        case "due_date":
          av = a[sortKey] ? new Date(a[sortKey]).getTime() : 0;
          bv = b[sortKey] ? new Date(b[sortKey]).getTime() : 0;
          break;
        case "total":
        case "balance_due":
        case "payment":
          av = Number(a[sortKey] || 0); bv = Number(b[sortKey] || 0); break;
        case "invoice_number":
          av = a.invoice_number || ""; bv = b.invoice_number || ""; break;
        case "status":
          av = a.status || ""; bv = b.status || ""; break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [invoices, invoiceSearch, sortKey, sortDir]);

  // Handle direct advance payment when client has no invoices or user wants to record unallocated advance
  const handleSaveAdvanceOnly = async () => {
    if (!org || !clientId) return;
    if (freshAmountNum <= 0) {
      toast({ title: "Enter amount", description: "Please enter an advance payment amount.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const prefix = org.payment_prefix || "PAY";
      const { data: latestPayments } = await supabase
        .from("payments")
        .select("payment_number")
        .eq("org_id", org.id)
        .order("created_at", { ascending: false })
        .limit(50);

      let maxSeq = 0;
      for (const p of latestPayments || []) {
        if (!p.payment_number) continue;
        const matches = p.payment_number.match(/\d+/g);
        if (matches && matches.length > 0) {
          const n = parseInt(matches[matches.length - 1], 10);
          if (!isNaN(n) && n > maxSeq) maxSeq = n;
        }
      }
      maxSeq++;
      const advancePayNum = formatSequenceNumber(prefix, maxSeq, "PAY");
      const clientObj = clients.find((c) => c.id === clientId);

      const { data: insertedAdvance, error } = await supabase.from("payments").insert({
        org_id: org.id,
        client_id: clientId,
        invoice_id: null,
        payment_number: advancePayNum,
        amount: freshAmountNum,
        payment_date: paymentDate,
        payment_mode: paymentMode,
        bank_account_id: selectedBankAccountId || null,
        reference_number: referenceNumber || null,
        notes: notes || "Customer Advance Payment (Pre-billing)",
        currency_code: org.currency_code,
      }).select().single();

      if (error) throw error;

      if (selectedBankAccountId && insertedAdvance) {
        await recordPaymentBankingTransaction({
          orgId: org.id,
          bankAccountId: selectedBankAccountId,
          amount: freshAmountNum,
          paymentDate,
          invoiceNumber: "Advance Credit",
          clientName: clientObj?.display_name,
          referenceNumber,
          paymentId: insertedAdvance.id,
          paymentNumber: advancePayNum,
          notes: notes || "Customer Advance Payment (Pre-billing)",
        });
      }

      await logAudit({
        orgId: org.id,
        userId: user?.id || "",
        action: "payment_advance",
        entityType: "payment",
        description: `Customer advance of ${fmt(freshAmountNum)} recorded for ${clientObj?.display_name || clientId}`,
      });

      toast({
        title: "Advance Payment Recorded!",
        description: `Successfully recorded ${fmt(freshAmountNum)} as advance credit for ${clientObj?.display_name || "client"}.`,
      });
      navigate("/payments");
    } catch (err: any) {
      toast({ title: "Error saving advance", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!org || !clientId) return;

    const selectedInvoices = invoices.filter((i) => i.selected && i.payment > 0);
    const totalFundsToApply = effectiveAdvanceToUse + freshAmountNum;

    if (totalFundsToApply <= 0.001) {
      toast({
        title: "No payment amount",
        description: "Please enter an amount received or apply advance credit.",
        variant: "destructive",
      });
      return;
    }

    if (selectedInvoices.length === 0) {
      toast({
        title: "Select invoices",
        description: "Select at least one invoice to apply payment to.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      // Find the highest existing payment number
      const prefix = org.payment_prefix || "PAY";
      const { data: latestPayments } = await supabase
        .from("payments")
        .select("payment_number")
        .eq("org_id", org.id)
        .order("created_at", { ascending: false })
        .limit(100);

      let maxSeq = 0;
      for (const p of latestPayments || []) {
        if (!p.payment_number) continue;
        const matches = p.payment_number.match(/\d+/g);
        if (matches && matches.length > 0) {
          const n = parseInt(matches[matches.length - 1], 10);
          if (!isNaN(n) && n > maxSeq) maxSeq = n;
        }
      }
      if (maxSeq === 0) {
        const { count } = await supabase
          .from("payments")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org.id);
        maxSeq = count || 0;
      }

      let hasError = false;
      const errorMessages: string[] = [];

      // FIFO advance credit queue from client's available advances
      const advanceQueue: { paymentNumber: string; remaining: number }[] = clientAdvances
        .filter((a) => a.availableAmount > 0.001)
        .map((a) => ({ paymentNumber: a.payment_number, remaining: a.availableAmount }));

      let remainingAdvancePoolForInvoices = effectiveAdvanceToUse;

      for (let i = 0; i < selectedInvoices.length; i++) {
        const inv = selectedInvoices[i];
        const invAdvancePortion = Math.min(remainingAdvancePoolForInvoices, inv.payment);
        remainingAdvancePoolForInvoices -= invAdvancePortion;
        const invFreshPortion = Math.max(0, inv.payment - invAdvancePortion);

        // 1. If this invoice gets advance credit, record advance_credit payment(s)
        if (invAdvancePortion > 0.001) {
          let portionLeft = invAdvancePortion;
          while (portionLeft > 0.001 && advanceQueue.length > 0) {
            const currentAdv = advanceQueue[0];
            const take = Math.min(currentAdv.remaining, portionLeft);
            currentAdv.remaining -= take;
            portionLeft -= take;
            if (currentAdv.remaining <= 0.001) {
              advanceQueue.shift();
            }

            maxSeq++;
            const payNum = formatSequenceNumber(prefix, maxSeq, "PAY");
            const { error: advPayErr } = await supabase.from("payments").insert({
              org_id: org.id,
              client_id: clientId,
              invoice_id: inv.id,
              payment_number: payNum,
              amount: take,
              payment_date: paymentDate,
              payment_mode: "advance_credit",
              bank_account_id: null,
              reference_number: currentAdv.paymentNumber,
              notes: `Adjusted from Advance Payment ${currentAdv.paymentNumber} for invoice ${inv.invoice_number}`,
              currency_code: org.currency_code,
            });

            if (advPayErr) {
              console.error(`Error recording advance adjustment for ${inv.invoice_number}:`, advPayErr);
              errorMessages.push(`Advance credit for ${inv.invoice_number}: ${advPayErr.message}`);
              hasError = true;
            } else {
              await logAudit({
                orgId: org.id,
                userId: user?.id || "",
                action: "payment_advance_adjusted",
                entityType: "payment",
                entityId: inv.id,
                description: `Adjusted ${fmt(take)} from Advance ${currentAdv.paymentNumber} against invoice ${inv.invoice_number}`,
              });
            }
          }
        }

        // 2. If this invoice gets fresh cash/bank payment, record regular payment & sync banking
        if (invFreshPortion > 0.001) {
          maxSeq++;
          const payNum = formatSequenceNumber(prefix, maxSeq, "PAY");
          const { data: insertedPayment, error: freshPayErr } = await supabase.from("payments").insert({
            org_id: org.id,
            client_id: clientId,
            invoice_id: inv.id,
            payment_number: payNum,
            amount: invFreshPortion,
            payment_date: paymentDate,
            payment_mode: paymentMode,
            bank_account_id: selectedBankAccountId || null,
            reference_number: referenceNumber || null,
            notes: notes || null,
            currency_code: org.currency_code,
          }).select().single();

          if (freshPayErr) {
            console.error(`Error recording fresh payment for ${inv.invoice_number}:`, freshPayErr);
            errorMessages.push(`${inv.invoice_number}: ${freshPayErr.message}`);
            hasError = true;
          } else {
            // Record banking transaction & update bank balance
            if (selectedBankAccountId && insertedPayment) {
              const clientObj = clients.find((c) => c.id === clientId);
              await recordPaymentBankingTransaction({
                orgId: org.id,
                bankAccountId: selectedBankAccountId,
                amount: invFreshPortion,
                paymentDate,
                invoiceNumber: inv.invoice_number,
                clientName: clientObj?.display_name,
                referenceNumber,
                paymentId: insertedPayment.id,
                paymentNumber: payNum,
                notes,
              });
            }

            await logAudit({
              orgId: org.id,
              userId: user?.id || "",
              action: "payment_received",
              entityType: "payment",
              entityId: inv.id,
              description: `Payment ${payNum} of ${fmt(invFreshPortion)} received for ${inv.invoice_number}`,
            });
          }
        }

        // 3. Update invoice balance and status
        const newBalance = Math.max(0, Number(inv.balance_due) - Number(inv.payment));
        const newPaid = Number(inv.total) - newBalance;
        const newStatus = newBalance <= 0.001 ? "paid" : "partial";
        await supabase.from("invoices").update({
          balance_due: newBalance,
          amount_paid: newPaid,
          status: newStatus,
          ...(newBalance <= 0.001 ? { paid_at: new Date().toISOString() } : {}),
        }).eq("id", inv.id);
      }

      // 4. Record any excess payment from fresh cash as new unallocated advance credit
      if (excessAmount > 0.001) {
        maxSeq++;
        const advancePayNum = formatSequenceNumber(prefix, maxSeq, "PAY");
        const clientObj = clients.find((c) => c.id === clientId);

        const { data: insertedAdvance } = await supabase.from("payments").insert({
          org_id: org.id,
          client_id: clientId,
          invoice_id: null, // Unallocated customer advance
          payment_number: advancePayNum,
          amount: excessAmount,
          payment_date: paymentDate,
          payment_mode: paymentMode,
          bank_account_id: selectedBankAccountId || null,
          reference_number: referenceNumber || null,
          notes: `Customer Advance Credit / Excess payment over invoices (Total received: ${fmt(freshAmountNum)}, Invoices applied: ${fmt(freshAmountApplied)}, Advance credit: ${fmt(excessAmount)})`,
          currency_code: org.currency_code,
        }).select().single();

        if (selectedBankAccountId && insertedAdvance) {
          await recordPaymentBankingTransaction({
            orgId: org.id,
            bankAccountId: selectedBankAccountId,
            amount: excessAmount,
            paymentDate,
            invoiceNumber: "Advance Credit",
            clientName: clientObj?.display_name,
            referenceNumber,
            paymentId: insertedAdvance.id,
            paymentNumber: advancePayNum,
            notes: "Excess payment recorded as customer advance credit",
          });
        }

        await logAudit({
          orgId: org.id,
          userId: user?.id || "",
          action: "payment_advance",
          entityType: "payment",
          description: `Customer advance credit of ${fmt(excessAmount)} recorded for client ${clientObj?.display_name || clientId}`,
        });
      }

      setSaving(false);
      if (hasError) {
        toast({
          title: "Partial error",
          description: errorMessages.join(", ") || "Some payments could not be recorded.",
          variant: "destructive",
        });
      } else {
        const msgs: string[] = [];
        if (effectiveAdvanceToUse > 0.001) {
          msgs.push(`Applied ${fmt(effectiveAdvanceToUse)} from client's advance credit`);
        }
        if (freshAmountApplied > 0.001) {
          msgs.push(`Recorded ${fmt(freshAmountApplied)} payment`);
        }
        if (excessAmount > 0.001) {
          msgs.push(`Saved ${fmt(excessAmount)} as new advance credit`);
        }

        toast({
          title: "Payment processed successfully!",
          description: msgs.join(". ") || "Payment applied to invoices.",
        });
        navigate("/payments");
      }
    } catch (err: any) {
      setSaving(false);
      toast({
        title: "Error saving payment",
        description: err?.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 pb-16">
      <PageHeader title="Record Payment Received" description="Record a payment from a client against outstanding invoices">
        <Button variant="outline" size="sm" onClick={() => navigate("/payments")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      </PageHeader>

      {/* Payment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Client *</Label>
            <div className="flex gap-2">
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Select a client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="icon" onClick={() => setAddClientOpen(true)} title="Add New Client">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <AddClientDialog open={addClientOpen} onOpenChange={setAddClientOpen} onClientAdded={(c) => { setClients(prev => [...prev, c]); setClientId(c.id); }} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Amount Received *</Label>
              {totalOutstanding > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-primary hover:text-primary px-1.5"
                  onClick={handleFillTotal}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {applyAdvanceCredit && advanceAmountToApply > 0
                    ? `Pay Net (${fmt(Math.max(0, totalOutstanding - Math.min(advanceAmountToApply, totalOutstanding)))})`
                    : `Pay Full (${fmt(totalOutstanding)})`}
                </Button>
              )}
            </div>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder={applyAdvanceCredit && advanceAmountToApply >= totalOutstanding ? "0.00 (Fully covered by advance)" : "0.00"}
                className="pl-9"
                value={amountReceived}
                onChange={(e) => handleAmountChange(e.target.value)}
              />
            </div>
            {applyAdvanceCredit && advanceAmountToApply > 0.001 && (
              <p className="text-[11px] text-[#e77817] dark:text-orange-400 font-medium flex items-center gap-1">
                <Wallet className="h-3 w-3 shrink-0" />
                <span>
                  Advance Applied: <strong>{fmt(effectiveAdvanceToUse)}</strong>
                  {totalOutstanding > effectiveAdvanceToUse && (
                    <> &bull; Fresh cash/bank needed: <strong>{fmt(Math.max(0, totalOutstanding - effectiveAdvanceToUse))}</strong></>
                  )}
                  {totalOutstanding <= effectiveAdvanceToUse && (
                    <> &bull; Fully settled by advance credit (No fresh cash needed)</>
                  )}
                </span>
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Payment Date</Label>
            <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Payment Mode</Label>
            <Select value={paymentMode} onValueChange={handlePaymentModeChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span>Deposit To Account *</span>
              {selectedAccount && (
                <span className="text-xs text-muted-foreground font-normal">
                  Bal: {fmt(Number(selectedAccount.current_balance || 0))}
                </span>
              )}
            </Label>
            <Select value={selectedBankAccountId} onValueChange={setSelectedBankAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select Bank / Account" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    <div className="flex items-center justify-between gap-3 w-full">
                      <div className="flex items-center gap-2">
                        {b.account_type === "cash" ? (
                          <Wallet className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        ) : (
                          <Building2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        )}
                        <span className="font-medium">{getAccountDisplayName(b)}</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        ({fmt(Number(b.current_balance || 0))})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reference #</Label>
            <Input placeholder="e.g. Transaction ID / UTR" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea placeholder="Internal notes..." rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Available Advance Credit Alert Banner */}
      {clientId && totalAvailableAdvance > 0.001 && (
        <Card className="border-2 border-[#e77817]/40 dark:border-[#e77817]/50 bg-gradient-to-r from-orange-50/80 via-amber-50/40 to-blue-50/70 dark:from-orange-950/20 dark:via-slate-900/40 dark:to-blue-950/30 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-[#e77817]/15 dark:bg-[#e77817]/25 text-[#e77817] border border-[#e77817]/30 mt-0.5">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-base text-slate-900 dark:text-slate-100">
                      Available Advance Payment: <span className="text-[#e77817]">{fmt(totalAvailableAdvance)}</span>
                    </span>
                    <Badge className="bg-[#0d2346] text-white border border-[#e77817]/30 text-[11px] font-semibold">Unused Credit</Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    This client has unallocated advance balance available ({clientAdvances.map(a => `${a.payment_number}: ${fmt(a.availableAmount)}`).join(", ")}).
                    You can apply this advance balance to settle the outstanding invoices below.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="apply-advance-toggle"
                    checked={applyAdvanceCredit}
                    onCheckedChange={(c) => handleToggleApplyAdvance(!!c)}
                    className="data-[state=checked]:bg-[#e77817] data-[state=checked]:border-[#e77817]"
                  />
                  <Label htmlFor="apply-advance-toggle" className="text-sm font-semibold cursor-pointer text-slate-900 dark:text-slate-100">
                    Apply Advance Credit
                  </Label>
                </div>
                {applyAdvanceCredit && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Adjust:</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max={totalAvailableAdvance}
                      className="w-28 h-8 text-sm bg-background font-medium border-[#e77817]/50 focus-visible:ring-[#e77817]"
                      value={advanceAmountToApply || ""}
                      onChange={(e) => handleAdvanceAmountChange(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Outstanding Invoices */}
      {clientId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Outstanding Invoices</CardTitle>
              {invoices.length > 0 && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">
                    Total Outstanding: <span className="font-semibold text-foreground">{fmt(totalOutstanding)}</span>
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingInvoices ? (
              <div className="p-8 text-center text-muted-foreground">Loading invoices...</div>
            ) : invoices.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <div>
                  <p className="font-medium text-foreground">No outstanding invoices for this client.</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    If the client has made an advance payment, you can record it directly as advance credit.
                  </p>
                </div>
                {freshAmountNum > 0 && (
                  <Button onClick={handleSaveAdvanceOnly} disabled={saving} className="bg-[#e77817] hover:bg-[#d66d13] text-white mt-1 shadow-sm">
                    {saving ? "Saving..." : `Record ${fmt(freshAmountNum)} as Customer Advance Payment`}
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="p-4 border-b flex justify-between items-center bg-muted/20">
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search invoices..." className="pl-9 h-9" value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} />
                  </div>
                </div>
                {processedInvoices.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No invoices match your search.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={processedInvoices.length > 0 && processedInvoices.every((i) => i.selected)}
                        onCheckedChange={(v) => {
                          const checked = !!v;
                          setInvoices((prev) => {
                            const updated = prev.map((inv) => processedInvoices.some(pi => pi.id === inv.id) ? { ...inv, selected: checked } : inv);
                            return recalculateAllocations(updated, amountReceived, applyAdvanceCredit, advanceAmountToApply);
                          });
                        }}
                      />
                    </TableHead>
                    <TableHead onClick={() => toggleSort("invoice_number")} className="cursor-pointer select-none hover:text-foreground">Invoice #<SortArrow k="invoice_number" /></TableHead>
                    <TableHead onClick={() => toggleSort("issue_date")} className="cursor-pointer select-none hover:text-foreground">Date<SortArrow k="issue_date" /></TableHead>
                    <TableHead onClick={() => toggleSort("due_date")} className="cursor-pointer select-none hover:text-foreground">Due Date<SortArrow k="due_date" /></TableHead>
                    <TableHead onClick={() => toggleSort("status")} className="cursor-pointer select-none hover:text-foreground">Status<SortArrow k="status" /></TableHead>
                    <TableHead onClick={() => toggleSort("total")} className="cursor-pointer select-none hover:text-foreground text-right">Invoice Amount<SortArrow k="total" /></TableHead>
                    <TableHead onClick={() => toggleSort("balance_due")} className="cursor-pointer select-none hover:text-foreground text-right">Balance Due<SortArrow k="balance_due" /></TableHead>
                    <TableHead onClick={() => toggleSort("payment")} className="cursor-pointer select-none hover:text-foreground text-right w-44">Payment<SortArrow k="payment" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedInvoices.map((inv) => (
                    <TableRow key={inv.id} className={inv.selected ? "bg-primary/5" : ""}>
                      <TableCell>
                        <Checkbox checked={inv.selected} onCheckedChange={(v) => handleSelectInvoice(inv.id, !!v)} />
                      </TableCell>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{inv.issue_date}</TableCell>
                      <TableCell>{inv.due_date}</TableCell>
                      <TableCell>
                        <Badge variant={inv.status === "overdue" ? "destructive" : "outline"} className="capitalize text-xs">
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{fmt(inv.total)}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(inv.balance_due)}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={inv.balance_due}
                          className="w-32 ml-auto text-right h-8"
                          value={inv.payment || ""}
                          onChange={(e) => handlePaymentEdit(inv.id, parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Footer */}
      {clientId && (totalApplied > 0 || freshAmountNum > 0) && (
        <Card className="border-t-2 border-t-primary shadow-md">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 text-sm">
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 items-center">
                  {applyAdvanceCredit && effectiveAdvanceToUse > 0.001 && (
                    <span className="text-[#e77817] dark:text-orange-400 font-medium flex items-center gap-1">
                      <Wallet className="h-3.5 w-3.5" />
                      Advance Used: <span className="font-semibold">{fmt(effectiveAdvanceToUse)}</span>
                    </span>
                  )}
                  {freshAmountNum > 0 && (
                    <span className="text-muted-foreground">
                      Fresh Payment: <span className="font-semibold text-foreground">{fmt(freshAmountNum)}</span>
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    Total Applied: <span className="font-semibold text-primary">{fmt(totalApplied)}</span>
                  </span>
                  {excessAmount > 0.01 && (
                    <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      New Advance Credit: {fmt(excessAmount)}
                    </span>
                  )}
                  {totalAvailableAdvance > 0 && (
                    <span className="text-xs text-muted-foreground">
                      (Remaining Advance: {fmt(remainingAdvanceCredit)})
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {invoices.length === 0 && freshAmountNum > 0 ? (
                  <Button onClick={handleSaveAdvanceOnly} disabled={saving} size="lg" className="bg-[#e77817] hover:bg-[#d66d13] text-white shadow-sm">
                    {saving ? "Saving..." : `Record Advance (${fmt(freshAmountNum)})`}
                  </Button>
                ) : (
                  <Button
                    onClick={handleSave}
                    disabled={saving || (totalApplied <= 0 && freshAmountNum <= 0)}
                    size="lg"
                  >
                    {saving ? "Saving..." : (
                      applyAdvanceCredit && freshAmountNum <= 0.001
                        ? `Apply Advance & Settle (${fmt(totalApplied)})`
                        : "Record Payment"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simple cancel for no invoices */}
      {clientId && invoices.length === 0 && !loadingInvoices && freshAmountNum <= 0 && (
        <div className="flex justify-end">
          <Button onClick={() => navigate("/payments")} variant="outline">Back to Payments</Button>
        </div>
      )}
    </div>
  );
}

