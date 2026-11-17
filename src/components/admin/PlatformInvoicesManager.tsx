import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Receipt,
  FileSpreadsheet,
  Search,
  RefreshCw,
  IndianRupee,
  Building2,
  Calendar,
  CheckCircle2,
  Copy,
  Check,
  Tag,
  ArrowUpDown,
  Filter,
  ExternalLink,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

export interface SubscriptionInvoiceRecord {
  id: string;
  subId: string;
  orderId: string;
  paymentId: string;
  paymentDate: string;
  orgId: string;
  companyName: string;
  gstin: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  billingAddress: string;
  billingState: string;
  planName: string;
  planKey: string;
  billingCycle: "monthly" | "yearly";
  baseAmount: number;
  gstAmount: number;
  totalAmount: number;
  couponCode: string;
  discountAmount: number;
  status: string;
  rawAuditNotes: any;
}

interface PlatformInvoicesManagerProps {
  initialOrganizations?: any[];
}

export function PlatformInvoicesManager({ initialOrganizations }: PlatformInvoicesManagerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<SubscriptionInvoiceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [cycleFilter, setCycleFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      // 1. Fetch all subscriptions
      const { data: subsData, error: subsErr } = await supabase
        .from("subscriptions")
        .select(`
          id,
          org_id,
          plan_id,
          billing_cycle,
          status,
          current_period_start,
          current_period_end,
          razorpay_order_id,
          razorpay_payment_id,
          coupon_id,
          admin_notes,
          created_at,
          updated_at
        `)
        .order("created_at", { ascending: false });

      if (subsErr) {
        console.error("Error fetching subscriptions:", subsErr);
      }

      // 2. Fetch plans
      const { data: plansData } = await supabase
        .from("plans")
        .select("id, name, display_name, price_monthly, price_yearly");

      const planMap = new Map<string, any>();
      (plansData || []).forEach((p: any) => {
        planMap.set(p.id, p);
        planMap.set(p.name?.toLowerCase(), p);
      });

      // 3. Fetch organizations (or fallback to initialOrganizations)
      let orgsList: any[] = initialOrganizations || [];
      if (!orgsList || orgsList.length === 0) {
        const { data: orgsData } = await supabase
          .from("organizations")
          .select("id, name, gst_number, tax_id, email, phone, address, created_at");
        if (orgsData) orgsList = orgsData;
      }

      const orgMap = new Map<string, any>();
      orgsList.forEach((o: any) => {
        orgMap.set(o.id, o);
      });

      // 4. Fetch coupons
      let couponMap = new Map<string, any>();
      try {
        const { data: couponsData } = await supabase.from("coupons").select("id, code, discount_type, discount_value");
        (couponsData || []).forEach((c: any) => {
          couponMap.set(c.id, c);
          if (c.code) couponMap.set(c.code.toUpperCase(), c);
        });
      } catch (cErr) {
        // coupons table may be restricted or optional
      }

      // 5. Parse and filter strictly for real purchases
      const records: SubscriptionInvoiceRecord[] = [];

      (subsData || []).forEach((s: any) => {
        // Parse admin_notes if present (CheckoutPage stores consentAuditLog here)
        let audit: any = null;
        try {
          if (typeof s.admin_notes === "string" && s.admin_notes.trim().startsWith("{")) {
            audit = JSON.parse(s.admin_notes);
          } else if (typeof s.admin_notes === "object" && s.admin_notes !== null) {
            audit = s.admin_notes;
          }
        } catch (e) {
          // not valid JSON
        }

        const org = orgMap.get(s.org_id);
        const plan = planMap.get(s.plan_id);

        const razorpayPaymentId = s.razorpay_payment_id || audit?.razorpay_payment_id || "";
        const razorpayOrderId = s.razorpay_order_id || audit?.razorpay_order_id || "";
        const couponId = s.coupon_id;
        const couponApplied = audit?.coupon_applied;

        // STRICT FILTER:
        // Must be an actual purchase via Razorpay (with payment ID / order ID) OR a coupon purchase.
        // Must NOT be a free plan or manual admin override where no payment or coupon was used.
        const isCouponCheckout = Boolean(
          couponId ||
          couponApplied ||
          razorpayPaymentId.startsWith("COUPON_FREE") ||
          razorpayOrderId.startsWith("COUPON_FREE")
        );

        const isRealRazorpay = Boolean(
          (razorpayPaymentId && razorpayPaymentId !== "FREE_PLAN" && !razorpayPaymentId.startsWith("ADMIN_")) ||
          (razorpayOrderId && razorpayOrderId !== "FREE_PLAN" && !razorpayOrderId.startsWith("ADMIN_")) ||
          audit?.event === "PURCHASE_CONSENT_LOGGED"
        );

        // Exclude if neither real Razorpay nor coupon checkout
        if (!isRealRazorpay && !isCouponCheckout) {
          return;
        }

        // Exclude if it's explicitly marked as free and has no transaction evidence
        if (s.plan_name === "free" && !razorpayPaymentId && !isCouponCheckout) {
          return;
        }

        // Resolve Company Name
        const companyName = audit?.company_name || org?.name || "Business (" + s.org_id.slice(0, 8) + ")";

        // Resolve GST Number:
        // Priority 1: GST from checkout consent / statutory notes
        // Priority 2: Fallback to organization profile gst_number or tax_id
        // Priority 3: "Unregistered / N/A"
        let resolvedGstin = "Unregistered / N/A";
        if (audit?.gstin && !audit.gstin.toLowerCase().includes("unregistered") && audit.gstin.trim() !== "") {
          resolvedGstin = audit.gstin.trim().toUpperCase();
        } else if (org?.gst_number && org.gst_number.trim() !== "") {
          resolvedGstin = org.gst_number.trim().toUpperCase();
        } else if (org?.tax_id && org.tax_id.trim() !== "") {
          resolvedGstin = org.tax_id.trim().toUpperCase();
        }

        // Resolve Customer Info
        const customerName = audit?.user_full_name || org?.owner?.name || org?.name || "-";
        const customerEmail = audit?.user_email || org?.email || org?.owner?.email || "-";
        const customerPhone = audit?.user_phone || org?.phone || "-";
        const billingAddress = audit?.billing_address || org?.address || "-";
        const billingState = audit?.state || (audit?.is_mp ? "Madhya Pradesh" : "-");

        // Resolve Plan Details
        const billingCycle: "monthly" | "yearly" = s.billing_cycle === "yearly" ? "yearly" : "monthly";
        const planDisplayName = plan?.display_name || audit?.plan_names?.[0] || s.plan_name || "Business Subscription";
        const planKey = (plan?.name || s.plan_name || "suite").toLowerCase();

        // Resolve Coupon Details
        let couponCodeStr = "None";
        if (couponApplied) {
          couponCodeStr = String(couponApplied).toUpperCase();
        } else if (isCouponCheckout) {
          couponCodeStr = "100% OFF COUPON";
        }
        const discountAmount = Number(audit?.discount_inr) || 0;

        // Resolve Amounts:
        // If audit log has total_amount_inr, use it.
        // If 100% coupon, total paid is 0.
        // Otherwise calculate from plan pricing + 18% GST.
        let totalPaid = 0;
        if (audit?.total_amount_inr !== undefined && audit?.total_amount_inr !== null) {
          totalPaid = Number(audit.total_amount_inr);
        } else if (isCouponCheckout && (razorpayPaymentId.startsWith("COUPON_FREE") || discountAmount > 0)) {
          totalPaid = 0;
        } else {
          const planMonthly = Number(plan?.price_monthly) || 599;
          const planYearly = Number(plan?.price_yearly) || (planMonthly * 12);
          const basePrice = billingCycle === "yearly" ? planYearly : planMonthly;
          totalPaid = Math.round(basePrice * 1.18);
        }

        // GST & Base calculation (standard 18% GST)
        let baseAmount = 0;
        let gstAmount = 0;
        if (totalPaid > 0) {
          baseAmount = Math.round(totalPaid / 1.18);
          gstAmount = totalPaid - baseAmount;
        }

        const paymentDate = audit?.consent_timestamp || audit?.verified_at || s.current_period_start || s.created_at;
        const displayOrderId = razorpayOrderId || audit?.razorpay_order_id || `SUB-ORD-${s.id.slice(0, 8).toUpperCase()}`;
        const displayPaymentId = razorpayPaymentId || audit?.razorpay_payment_id || (isCouponCheckout ? "COUPON_APPLIED" : "-");

        records.push({
          id: s.id,
          subId: s.id,
          orderId: displayOrderId,
          paymentId: displayPaymentId,
          paymentDate,
          orgId: s.org_id,
          companyName,
          gstin: resolvedGstin,
          customerName,
          customerEmail,
          customerPhone,
          billingAddress,
          billingState,
          planName: planDisplayName,
          planKey,
          billingCycle,
          baseAmount,
          gstAmount,
          totalAmount: totalPaid,
          couponCode: couponCodeStr,
          discountAmount,
          status: "Paid",
          rawAuditNotes: audit,
        });
      });

      // Sort by paymentDate descending
      records.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
      setInvoices(records);
    } catch (err: any) {
      console.error("Failed to load invoice records:", err);
      toast({
        title: "Error loading invoices",
        description: err.message || "Failed to load subscription invoice records.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [initialOrganizations]);

  // Filtered Records
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Plan filter
      if (planFilter !== "all" && !inv.planKey.includes(planFilter)) {
        return false;
      }
      // Cycle filter
      if (cycleFilter !== "all" && inv.billingCycle !== cycleFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCompany = inv.companyName.toLowerCase().includes(q);
        const matchesGstin = inv.gstin.toLowerCase().includes(q);
        const matchesOrderId = inv.orderId.toLowerCase().includes(q);
        const matchesPaymentId = inv.paymentId.toLowerCase().includes(q);
        const matchesEmail = inv.customerEmail.toLowerCase().includes(q);
        const matchesPlan = inv.planName.toLowerCase().includes(q);
        const matchesPhone = inv.customerPhone.toLowerCase().includes(q);
        return (
          matchesCompany ||
          matchesGstin ||
          matchesOrderId ||
          matchesPaymentId ||
          matchesEmail ||
          matchesPlan ||
          matchesPhone
        );
      }
      return true;
    });
  }, [invoices, searchQuery, planFilter, cycleFilter]);

  // Summary Metrics
  const totalRevenue = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  }, [filteredInvoices]);

  const totalGst = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + inv.gstAmount, 0);
  }, [filteredInvoices]);

  const totalBase = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + inv.baseAmount, 0);
  }, [filteredInvoices]);

  // Export to Excel function
  const handleExportToExcel = () => {
    if (filteredInvoices.length === 0) {
      toast({
        title: "No Invoices to Export",
        description: "There are no invoice records matching the current filters.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare clean formatted rows for Excel
      const excelData = filteredInvoices.map((inv, idx) => ({
        "S.No.": idx + 1,
        "Order / Invoice ID": inv.orderId,
        "Payment ID": inv.paymentId,
        "Payment Date": new Date(inv.paymentDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        "Company Name": inv.companyName,
        "GSTIN / Tax ID": inv.gstin,
        "Contact Person": inv.customerName,
        "Email Address": inv.customerEmail,
        "Mobile Number": inv.customerPhone,
        "Plan Purchased": inv.planName,
        "Billing Cycle": inv.billingCycle.toUpperCase(),
        "Taxable Amount (₹)": inv.baseAmount,
        "GST Paid (18%) (₹)": inv.gstAmount,
        "Total Amount Paid (₹)": inv.totalAmount,
        "Coupon Applied": inv.couponCode,
        "Discount (₹)": inv.discountAmount,
        "Billing State": inv.billingState,
        "Status": "PAID",
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Auto-fit column widths
      const colWidths = [
        { wch: 6 },  // S.No
        { wch: 24 }, // Order ID
        { wch: 24 }, // Payment ID
        { wch: 20 }, // Date
        { wch: 28 }, // Company Name
        { wch: 20 }, // GSTIN
        { wch: 20 }, // Contact Person
        { wch: 26 }, // Email
        { wch: 15 }, // Phone
        { wch: 22 }, // Plan
        { wch: 14 }, // Cycle
        { wch: 18 }, // Taxable
        { wch: 18 }, // GST
        { wch: 20 }, // Total Paid
        { wch: 16 }, // Coupon
        { wch: 14 }, // Discount
        { wch: 18 }, // State
        { wch: 10 }, // Status
      ];
      worksheet["!cols"] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Subscription Invoices");

      const todayStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `AassayBiz_Subscription_Invoices_${todayStr}.xlsx`);

      toast({
        title: "Excel Export Downloaded",
        description: `Successfully exported ${filteredInvoices.length} business invoice records to Excel.`,
      });
    } catch (exportErr: any) {
      console.error("Excel export error:", exportErr);
      toast({
        title: "Export Failed",
        description: exportErr.message || "Could not generate Excel spreadsheet.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copied", description: `${text} copied to clipboard.` });
  };

  return (
    <div className="space-y-6">
      {/* Header & Description */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Subscription Invoices & Statutory Orders
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Real customer purchases made through Razorpay & promotional coupon redemptions with statutory GST breakdown.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={fetchInvoices}
            variant="outline"
            size="sm"
            disabled={loading}
            className="h-10 px-3.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
            Refresh
          </Button>

          <Button
            onClick={handleExportToExcel}
            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export to Excel ({filteredInvoices.length})</span>
          </Button>
        </div>
      </div>

      {/* 4 Summary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Collected Revenue */}
        <Card className="border-slate-200 shadow-xs rounded-2xl bg-white overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Revenue Collected
                </p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1">
                  ₹{totalRevenue.toLocaleString("en-IN")}
                </h3>
                <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> From {filteredInvoices.length} paid transactions
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner">
                <IndianRupee className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total GST Collected */}
        <Card className="border-slate-200 shadow-xs rounded-2xl bg-white overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total GST Collected (18%)
                </p>
                <h3 className="text-2xl sm:text-3xl font-black text-purple-700 font-mono mt-1">
                  ₹{totalGst.toLocaleString("en-IN")}
                </h3>
                <p className="text-[11px] text-purple-600 font-medium mt-1">
                  Taxable Base: ₹{totalBase.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 shadow-inner">
                <Receipt className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Paid Purchases Count */}
        <Card className="border-slate-200 shadow-xs rounded-2xl bg-white overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Paid Purchases / Invoices
                </p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1">
                  {filteredInvoices.length}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  {invoices.length > filteredInvoices.length
                    ? `${invoices.length - filteredInvoices.length} filtered out`
                    : "Zero manual trial accounts"}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-inner">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Order Value */}
        <Card className="border-slate-200 shadow-xs rounded-2xl bg-white overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Average Order Value
                </p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1">
                  ₹
                  {filteredInvoices.length > 0
                    ? Math.round(totalRevenue / filteredInvoices.length).toLocaleString("en-IN")
                    : "0"}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Annual + Monthly Blended
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-inner">
                <Building2 className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 shadow-xs rounded-2xl bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search by company, GSTIN, payment ID, order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9.5 pr-4 h-10 rounded-xl border-slate-200 text-xs sm:text-sm bg-slate-50/50 focus:bg-white"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Plan Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Filter className="w-3.5 h-3.5" />
                <span>Plan:</span>
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 cursor-pointer focus:outline-none"
                >
                  <option value="all">All Plans</option>
                  <option value="suite">Business Suite</option>
                  <option value="accounting">Accounting</option>
                  <option value="hr">HR & Payroll</option>
                  <option value="crm">CRM</option>
                  <option value="promotion">Promotion</option>
                </select>
              </div>

              {/* Cycle Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <span>Cycle:</span>
                <select
                  value={cycleFilter}
                  onChange={(e) => setCycleFilter(e.target.value)}
                  className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 cursor-pointer focus:outline-none"
                >
                  <option value="all">All Cycles</option>
                  <option value="yearly">Yearly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {/* Clear Filters */}
              {(searchQuery || planFilter !== "all" || cycleFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setPlanFilter("all");
                    setCycleFilter("all");
                  }}
                  className="h-9 text-xs text-slate-500 hover:text-slate-800"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Invoices Table Card */}
      <Card className="border-slate-200 shadow-xs rounded-2xl bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-800">
              Purchased Invoices Records ({filteredInvoices.length})
            </span>
            <Badge variant="outline" className="text-[10px] bg-white border-slate-200 text-slate-600">
              Only Paid Accounts
            </Badge>
          </div>
          <span className="text-xs text-slate-500">
            Showing latest transactions
          </span>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-12 text-center text-xs font-bold text-slate-600">#</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Date & Order ID</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Company & GSTIN</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Customer Contact</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Plan & Cycle</TableHead>
                <TableHead className="text-right text-xs font-bold text-slate-600">Taxable (₹)</TableHead>
                <TableHead className="text-right text-xs font-bold text-slate-600">GST (18%) (₹)</TableHead>
                <TableHead className="text-right text-xs font-bold text-slate-600">Total Paid (₹)</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Payment ID / Coupon</TableHead>
                <TableHead className="text-center text-xs font-bold text-slate-600">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <p className="text-sm font-medium">Loading subscription invoices...</p>
                  </TableCell>
                </TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-16 text-center text-slate-500">
                    <Receipt className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-base font-bold text-slate-700">No Purchased Invoices Found</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      Only businesses that completed a plan purchase via Razorpay or promotional coupon are shown here. Free trial accounts and manual admin grants without payment are excluded.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((inv, idx) => {
                  const isCoupon = inv.couponCode && inv.couponCode !== "None";
                  return (
                    <TableRow key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* S.No */}
                      <TableCell className="text-center text-xs text-slate-400 font-mono">
                        {idx + 1}
                      </TableCell>

                      {/* Date & Order ID */}
                      <TableCell className="whitespace-nowrap">
                        <div className="font-mono text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{inv.orderId}</span>
                          <button
                            onClick={() => copyToClipboard(inv.orderId, `ord-${inv.id}`)}
                            className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                            title="Copy Order ID"
                          >
                            {copiedId === `ord-${inv.id}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(inv.paymentDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </TableCell>

                      {/* Company Name & GSTIN */}
                      <TableCell>
                        <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{inv.companyName}</span>
                        </div>
                        <div className="mt-1">
                          {inv.gstin && !inv.gstin.includes("Unregistered") ? (
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] bg-slate-50 text-slate-800 border-slate-300 font-semibold"
                            >
                              GST: {inv.gstin}
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-amber-600 font-medium">
                              Unregistered / No GST
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Customer Contact */}
                      <TableCell className="whitespace-nowrap">
                        <div className="text-xs font-medium text-slate-800">{inv.customerName}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{inv.customerEmail}</div>
                        {inv.customerPhone && inv.customerPhone !== "-" && (
                          <div className="text-[10px] text-slate-400">{inv.customerPhone}</div>
                        )}
                      </TableCell>

                      {/* Plan & Cycle */}
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Badge className="bg-[#1c0842] hover:bg-[#1c0842] text-white text-[10px] font-bold">
                            {inv.planName}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold uppercase ${
                              inv.billingCycle === "yearly"
                                ? "bg-amber-50 text-amber-700 border-amber-300"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                            }`}
                          >
                            {inv.billingCycle}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* Taxable Amount */}
                      <TableCell className="text-right font-mono text-xs text-slate-700">
                        ₹{inv.baseAmount.toLocaleString("en-IN")}
                      </TableCell>

                      {/* GST Amount */}
                      <TableCell className="text-right font-mono text-xs text-purple-700 font-semibold">
                        +₹{inv.gstAmount.toLocaleString("en-IN")}
                      </TableCell>

                      {/* Total Amount Paid */}
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="font-mono text-xs font-black text-emerald-700">
                          ₹{inv.totalAmount.toLocaleString("en-IN")}
                        </div>
                        {isCoupon && (
                          <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                            Coupon Applied
                          </div>
                        )}
                      </TableCell>

                      {/* Payment ID & Coupon */}
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-700">
                          <span className="truncate max-w-[130px]">{inv.paymentId}</span>
                          {inv.paymentId !== "-" && (
                            <button
                              onClick={() => copyToClipboard(inv.paymentId, `pay-${inv.id}`)}
                              className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                              title="Copy Payment ID"
                            >
                              {copiedId === `pay-${inv.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                        {isCoupon && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Tag className="w-3 h-3 text-amber-600" />
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                              {inv.couponCode}
                            </span>
                          </div>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center whitespace-nowrap">
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-[10px] font-bold">
                          ● {inv.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
