import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { postBillPaymentJournal } from "@/lib/accounting";
import { useAppStore } from "@/store/app-store";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
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
import { ArrowLeft, CreditCard, AlertCircle, CheckCircle2, Sparkles, Building2, Wallet } from "lucide-react";
import { recordVendorPaymentBankingTransaction, getOrCreateCashAccount } from "@/lib/banking-sync";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

const PAYMENT_MODES = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check / Cheque" },
  { value: "credit_card", label: "Credit Card" },
  { value: "upi", label: "UPI" },
  { value: "other", label: "Other" },
];

interface OutstandingBill {
  id: string;
  bill_number: string;
  vendor_bill_number?: string;
  bill_date: string;
  due_date: string;
  total: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  branch_id?: string | null;
  selected: boolean;
  payment: number;
}

function allocateAmountAcrossBills(
  billList: OutstandingBill[],
  totalAmount: number
): OutstandingBill[] {
  let remaining = Math.max(0, totalAmount);
  return billList.map((bill) => {
    if (!bill.selected) {
      return { ...bill, payment: 0 };
    }
    const pay = Math.min(remaining, bill.balance_due);
    remaining = Math.max(0, remaining - pay);
    return { ...bill, payment: Math.round(pay * 100) / 100 };
  });
}

export default function RecordVendorPaymentPage() {
  const org = useAppStore((s) => s.organization);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryVendorId = searchParams.get("vendor_id");
  const queryBillId = searchParams.get("bill_id");
  const queryAmount = searchParams.get("amount");

  const { toast } = useToast();
  const { user } = useAuth();
  const currency = (org as any)?.currency || "INR";

  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorId, setVendorId] = useState(queryVendorId || "");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMode, setPaymentMode] = useState("bank_transfer");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [amountPaid, setAmountPaid] = useState(queryAmount || "");
  const [bills, setBills] = useState<OutstandingBill[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [saving, setSaving] = useState(false);

  // Bank & Cash Accounts
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");

  const fmt = (n: number) => formatCurrency(n || 0, currency);

  // Load vendors and calculate dynamic due from unpaid bills
  useEffect(() => {
    if (!org?.id) return;
    (async () => {
      const [{ data: vData }, { data: bData }] = await Promise.all([
        supabase
          .from("vendors")
          .select("id, name, display_name, balance_due, opening_balance")
          .eq("org_id", org.id)
          .order("name"),
        supabase
          .from("bills")
          .select("vendor_id, total, balance_due, status")
          .eq("org_id", org.id)
          .not("status", "in", '("draft","cancelled")'),
      ]);

      const billsMap: Record<string, number> = {};
      (bData || []).forEach((b: any) => {
        billsMap[b.vendor_id] = (billsMap[b.vendor_id] || 0) + Number(b.balance_due || 0);
      });

      const mapped = (vData || []).map((v: any) => {
        const billsDue = billsMap[v.id];
        const dynamicDue = billsDue !== undefined ? billsDue : Number(v.balance_due || v.opening_balance || 0);
        return {
          ...v,
          balance_due: dynamicDue,
        };
      });

      setVendors(mapped);
      if (!vendorId && queryVendorId) {
        setVendorId(queryVendorId);
      }
    })();
  }, [org?.id]);

  // Load bank accounts
  useEffect(() => {
    if (!org?.id) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("bank_accounts")
        .select("*")
        .eq("org_id", org.id)
        .order("name");

      let accts = data || [];
      if (!accts.some((a: any) => a.account_type === "cash")) {
        const cashAcct = await getOrCreateCashAccount(org.id, currency);
        if (cashAcct) {
          accts = [cashAcct, ...accts];
        }
      }

      setBankAccounts(accts);

      if (accts.length > 0 && !selectedBankAccountId) {
        if (paymentMode === "cash") {
          const cash = accts.find((a: any) => a.account_type === "cash");
          setSelectedBankAccountId(cash?.id || accts[0].id);
        } else {
          const bank = accts.find((a: any) => a.account_type !== "cash");
          setSelectedBankAccountId(bank?.id || accts[0].id);
        }
      }
    })();
  }, [org?.id, paymentMode]);

  // Switch default account on payment mode change
  useEffect(() => {
    if (!bankAccounts.length) return;
    if (paymentMode === "cash") {
      const cash = bankAccounts.find((a: any) => a.account_type === "cash");
      if (cash) setSelectedBankAccountId(cash.id);
    } else {
      const bank = bankAccounts.find((a: any) => a.account_type !== "cash");
      if (bank && selectedBankAccountId === bankAccounts.find((a: any) => a.account_type === "cash")?.id) {
        setSelectedBankAccountId(bank.id);
      }
    }
  }, [paymentMode]);

  // Load bills for selected vendor
  useEffect(() => {
    if (!org?.id || !vendorId) {
      setBills([]);
      return;
    }
    setLoadingBills(true);

    supabase
      .from("bills")
      .select("id, bill_number, vendor_bill_number, bill_date, due_date, total, amount_paid, balance_due, status, branch_id")
      .eq("org_id", org.id)
      .eq("vendor_id", vendorId)
      .not("status", "in", '("draft","cancelled")')
      .gt("balance_due", 0)
      .order("bill_date", { ascending: true })
      .then(({ data, error }) => {
        setLoadingBills(false);
        if (error) {
          console.error("Failed to load bills:", error);
          toast({ title: "Failed to load unpaid bills", variant: "destructive" });
          return;
        }

        const mapped: OutstandingBill[] = (data || []).map((b: any) => {
          const isTarget = queryBillId ? b.id === queryBillId : true;
          return {
            id: b.id,
            bill_number: b.bill_number,
            vendor_bill_number: b.vendor_bill_number,
            bill_date: b.bill_date,
            due_date: b.due_date,
            total: Number(b.total || 0),
            amount_paid: Number(b.amount_paid || 0),
            balance_due: Number(b.balance_due || 0),
            status: b.status,
            branch_id: b.branch_id,
            selected: isTarget,
            payment: 0,
          };
        });

        const initialAmount = Number(amountPaid) || 0;
        if (initialAmount > 0) {
          setBills(allocateAmountAcrossBills(mapped, initialAmount));
        } else {
          setBills(mapped);
        }
      });
  }, [org?.id, vendorId]);

  // Handle amount input change & auto allocate
  const handleAmountChange = (val: string) => {
    setAmountPaid(val);
    const num = Number(val) || 0;
    setBills((prev) => allocateAmountAcrossBills(prev, num));
  };

  // Toggle single bill selection
  const handleToggleBill = (billIdToToggle: string) => {
    setBills((prev) => {
      const next = prev.map((b) =>
        b.id === billIdToToggle ? { ...b, selected: !b.selected } : b
      );
      const num = Number(amountPaid) || 0;
      return allocateAmountAcrossBills(next, num);
    });
  };

  // Toggle select all
  const handleToggleAll = (checked: boolean) => {
    setBills((prev) => {
      const next = prev.map((b) => ({ ...b, selected: checked }));
      const num = Number(amountPaid) || 0;
      return allocateAmountAcrossBills(next, num);
    });
  };

  // Manual payment change for a specific bill
  const handleBillPaymentChange = (billIdToChange: string, val: string) => {
    const pmt = Math.max(0, Number(val) || 0);
    setBills((prev) => {
      const updated = prev.map((b) => {
        if (b.id !== billIdToChange) return b;
        const capped = Math.min(pmt, b.balance_due);
        return { ...b, payment: capped, selected: capped > 0 ? true : b.selected };
      });
      const newTotal = updated.reduce((sum, b) => sum + (b.payment || 0), 0);
      setAmountPaid(newTotal > 0 ? String(newTotal) : "");
      return updated;
    });
  };

  // Auto-allocate button
  const handleAutoAllocate = () => {
    const num = Number(amountPaid) || 0;
    if (num <= 0) {
      toast({ title: "Please enter an amount to allocate", variant: "destructive" });
      return;
    }
    const withSelected = bills.map((b) => ({ ...b, selected: true }));
    setBills(allocateAmountAcrossBills(withSelected, num));
    toast({ title: "Amount allocated across unpaid bills" });
  };

  const selectedVendor = useMemo(() => {
    return vendors.find((v) => v.id === vendorId);
  }, [vendors, vendorId]);

  const totalOutstandingDue = useMemo(() => {
    return bills.reduce((sum, b) => sum + b.balance_due, 0);
  }, [bills]);

  const currentVendorDue = useMemo(() => {
    if (!selectedVendor) return 0;
    if (bills.length > 0) {
      return totalOutstandingDue;
    }
    return Number(selectedVendor.balance_due || 0);
  }, [selectedVendor, bills, totalOutstandingDue]);

  const selectedBankAccount = useMemo(() => {
    return bankAccounts.find((a) => a.id === selectedBankAccountId);
  }, [bankAccounts, selectedBankAccountId]);

  const totalAllocated = useMemo(() => {
    return bills.reduce((sum, b) => sum + (b.payment || 0), 0);
  }, [bills]);

  const numAmountPaid = Number(amountPaid) || 0;
  const unallocatedAmount = Math.max(0, numAmountPaid - totalAllocated);

  const allSelected = bills.length > 0 && bills.every((b) => b.selected);
  const someSelected = bills.some((b) => b.selected);

  // Submit payment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org?.id || !vendorId) {
      toast({ title: "Please select a vendor", variant: "destructive" });
      return;
    }

    if (numAmountPaid <= 0) {
      toast({ title: "Please enter a valid payment amount", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const vendorName = selectedVendor?.display_name || selectedVendor?.name || "Vendor";
      const billsWithPayments = bills.filter((b) => (b.payment || 0) > 0);

      // Determine the bank/cash account to debit
      let bankAcctId = selectedBankAccountId;
      if (!bankAcctId && bankAccounts.length > 0) {
        if (paymentMode === "cash") {
          const cash = bankAccounts.find((a) => a.account_type === "cash");
          bankAcctId = cash?.id || bankAccounts[0].id;
        } else {
          const bank = bankAccounts.find((a) => a.account_type !== "cash");
          bankAcctId = bank?.id || bankAccounts[0].id;
        }
      }

      if (!bankAcctId && bankAccounts.length > 0) {
        bankAcctId = bankAccounts[0].id;
      }

      // If bills are allocated
      if (billsWithPayments.length > 0) {
        for (const bill of billsWithPayments) {
          const payAmt = Number(bill.payment);
          const bpPayload = {
            org_id: org.id,
            vendor_id: vendorId,
            bill_id: bill.id,
            payment_date: paymentDate,
            amount: payAmt,
            payment_method: paymentMode,
            reference: referenceNumber.trim() || null,
            notes: notes.trim() || null,
            branch_id: bill.branch_id || null,
          };

          const { data: bp, error: bpErr } = await (supabase as any)
            .from("bill_payments")
            .insert(bpPayload)
            .select()
            .single();

          if (bpErr) throw bpErr;

          // 1. Update bill amount_paid, balance_due, and status
          const newPaid = Number(bill.amount_paid || 0) + payAmt;
          const newBalanceDue = Math.max(0, Number(bill.total || 0) - newPaid);
          const newStatus = newBalanceDue <= 0 ? "paid" : "partial";

          await (supabase as any)
            .from("bills")
            .update({
              amount_paid: newPaid,
              balance_due: newBalanceDue,
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", bill.id);

          // 2. Bank sync debit transaction
          if (bankAcctId && bp) {
            await recordVendorPaymentBankingTransaction({
              orgId: org.id,
              bankAccountId: bankAcctId,
              amount: payAmt,
              paymentDate,
              billNumber: bill.vendor_bill_number || bill.bill_number,
              vendorName,
              reference: referenceNumber.trim() || undefined,
              paymentId: bp.id,
              notes: notes.trim() || undefined,
            });
          }

          // 3. Post double-entry journal entry
          if (bp) {
            await postBillPaymentJournal(
              org.id,
              bp.id,
              paymentDate,
              bill.vendor_bill_number || bill.bill_number,
              vendorId,
              payAmt,
              paymentMode,
              bill.branch_id || null
            );
          }
        }
      }

      // If there is unallocated/on-account payment
      if (unallocatedAmount > 0) {
        const bpPayload = {
          org_id: org.id,
          vendor_id: vendorId,
          bill_id: null,
          payment_date: paymentDate,
          amount: unallocatedAmount,
          payment_method: paymentMode,
          reference: referenceNumber.trim() || null,
          notes: notes.trim() ? `${notes.trim()} (On-Account / Advance)` : "On-Account Advance Payment",
        };

        const { data: bp, error: bpErr } = await (supabase as any)
          .from("bill_payments")
          .insert(bpPayload)
          .select()
          .single();

        if (bpErr) throw bpErr;

        if (bankAcctId && bp) {
          await recordVendorPaymentBankingTransaction({
            orgId: org.id,
            bankAccountId: bankAcctId,
            amount: unallocatedAmount,
            paymentDate,
            vendorName,
            reference: referenceNumber.trim() || undefined,
            paymentId: bp.id,
            notes: "On-Account Vendor Payment",
          });

          await postBillPaymentJournal(
            org.id,
            bp.id,
            paymentDate,
            "On-Account Advance",
            vendorId,
            unallocatedAmount,
            paymentMode,
            null
          );
        }
      }

      // Recalculate vendor's balance due
      const { data: remainingBills } = await (supabase as any)
        .from("bills")
        .select("balance_due, status")
        .eq("vendor_id", vendorId)
        .not("status", "in", '("draft","cancelled")');

      const totalVendorDue = (remainingBills || []).reduce(
        (sum: number, b: any) => sum + Number(b.balance_due || 0),
        0
      );

      await (supabase as any)
        .from("vendors")
        .update({
          balance_due: Math.max(0, totalVendorDue - unallocatedAmount),
          updated_at: new Date().toISOString(),
        })
        .eq("id", vendorId);

      toast({
        title: "Vendor Payment Recorded",
        description: `Successfully paid ${fmt(numAmountPaid)} to ${vendorName}.`,
      });

      navigate("/vendor-payments");
    } catch (err: any) {
      console.error("Error saving vendor payment:", err);
      toast({
        title: "Failed to record payment",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-16">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/vendor-payments")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Record Vendor Payment</h1>
          <p className="text-sm text-muted-foreground">
            Make payment against purchase bills or pay on-account to vendor
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Header Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vendor">Select Vendor *</Label>
                <Select value={vendorId} onValueChange={(val) => setVendorId(val)}>
                  <SelectTrigger id="vendor" className="mt-1">
                    <SelectValue placeholder="Choose a vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span className="truncate">{v.display_name || v.name}</span>
                          {Number(v.balance_due) > 0 ? (
                            <span className="text-xs font-semibold text-destructive shrink-0">
                              Due: {fmt(Number(v.balance_due))}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground shrink-0">
                              Due: {fmt(0)}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedVendor && (
                  <div className="mt-2.5 p-3 rounded-lg border bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Total Due:
                        </span>
                        <span
                          className={cn(
                            "text-base font-extrabold tracking-tight",
                            currentVendorDue > 0 ? "text-destructive" : "text-emerald-600"
                          )}
                        >
                          {loadingBills ? "Calculating..." : fmt(currentVendorDue)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {loadingBills
                          ? "Loading pending bills..."
                          : bills.length > 0
                          ? `${bills.length} unpaid bill${bills.length > 1 ? "s" : ""} pending`
                          : "No unpaid bills. Advance payment will be recorded on-account."}
                      </p>
                    </div>

                    {currentVendorDue > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="h-8 text-xs font-semibold shrink-0 self-start sm:self-center"
                        onClick={() => handleAmountChange(String(currentVendorDue))}
                      >
                        Pay Full Due ({fmt(currentVendorDue)})
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="paymentDate">Payment Date *</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="amountPaid">Amount Paid ({currency}) *</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amountPaid}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="mt-1 font-semibold text-lg"
                  required
                />
              </div>

              <div>
                <Label htmlFor="paymentMode">Payment Mode *</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger id="paymentMode" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="bankAccount">Paid From Account *</Label>
                <Select
                  value={selectedBankAccountId}
                  onValueChange={setSelectedBankAccountId}
                  required
                >
                  <SelectTrigger id="bankAccount" className="mt-1">
                    <SelectValue placeholder="Select Bank/Cash Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        <div className="flex items-center gap-2">
                          {a.account_type === "cash" ? (
                            <Wallet className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          ) : (
                            <Building2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          )}
                          <span className="font-medium">{a.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            ({fmt(Number(a.current_balance || 0))})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedBankAccount && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <span>Available Balance:</span>
                    <span className="font-semibold text-foreground font-mono">
                      {fmt(Number(selectedBankAccount.current_balance || 0))}
                    </span>
                    {Number(selectedBankAccount.current_balance || 0) < numAmountPaid && numAmountPaid > 0 && (
                      <span className="text-amber-600 font-medium text-xs ml-1">
                        (Note: Balance will go negative)
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="reference">Reference / UTR / Check #</Label>
                <Input
                  id="reference"
                  placeholder="e.g. UTR-982348234"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="notes">Notes / Remarks</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any internal payment note..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 resize-none"
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Outstanding Bills Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Unpaid Purchase Bills</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Allocate payment towards outstanding bills for this vendor
              </p>
            </div>
            {bills.length > 0 && numAmountPaid > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoAllocate}
                className="gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Auto Allocate
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {loadingBills ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Loading unpaid bills...
              </div>
            ) : !vendorId ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Please select a vendor above to view unpaid bills.
              </div>
            ) : bills.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No unpaid bills found for this vendor. Payment will be treated as On-Account / Advance.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
                        onCheckedChange={handleToggleAll}
                      />
                    </TableHead>
                    <TableHead>Bill #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Bill Total</TableHead>
                    <TableHead className="text-right">Balance Due</TableHead>
                    <TableHead className="text-right w-40">Payment Applied</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((b) => (
                    <TableRow key={b.id} className={b.selected ? "bg-muted/30" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={b.selected}
                          onCheckedChange={() => handleToggleBill(b.id)}
                        />
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        {b.vendor_bill_number || b.bill_number}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {b.bill_date}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {b.due_date || "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {fmt(b.total)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-destructive">
                        {fmt(b.balance_due)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={b.balance_due}
                          className="h-8 text-right font-mono"
                          value={b.payment || ""}
                          placeholder="0.00"
                          onChange={(e) => handleBillPaymentChange(b.id, e.target.value)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Summary Ribbon */}
        <Card className="bg-muted/40 border-primary/20">
          <CardContent className="py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Total Vendor Due</p>
                <p className="text-lg font-bold text-foreground mt-0.5">
                  {fmt(totalOutstandingDue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Amount Paid</p>
                <p className="text-lg font-bold text-primary mt-0.5">
                  {fmt(numAmountPaid)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Allocated to Bills</p>
                <p className="text-lg font-bold text-emerald-600 mt-0.5">
                  {fmt(totalAllocated)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">On-Account / Advance</p>
                <p className={`text-lg font-bold mt-0.5 ${unallocatedAmount > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                  {fmt(unallocatedAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/vendor-payments")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving || numAmountPaid <= 0 || !vendorId}>
            {saving ? "Recording Payment..." : "Record Payment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
