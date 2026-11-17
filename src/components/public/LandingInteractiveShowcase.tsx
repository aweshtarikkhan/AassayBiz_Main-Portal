import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  FileText,
  BarChart3,
  Package,
  Users,
  Target,
  Receipt,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap,
  ShieldCheck,
  Send,
  MapPin,
  Clock,
  Calendar,
  AlertTriangle,
  QrCode,
  DollarSign,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface ShowcaseTab {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  badge: string;
  badgeColor: string;
  icon: React.ElementType;
  headline: string;
  description: string;
  benefits: string[];
  impactMetric: { label: string; value: string };
}

const SHOWCASE_TABS: ShowcaseTab[] = [
  {
    id: "invoicing",
    name: "GST Invoicing & Billing",
    shortName: "Invoicing",
    tagline: "Ultra-fast billing with instant UPI payments",
    badge: "⚡ 30-SEC INVOICING ENGINE",
    badgeColor: "from-sky-500/20 to-blue-500/20 text-sky-400 border-sky-500/30",
    icon: FileText,
    headline: "Create, Send & Collect Payments in 30 Seconds",
    description:
      "Craft professional GST-compliant tax invoices, quotations, and bills. Share directly via WhatsApp with auto-generated dynamic UPI QR codes so customers pay you instantly without logging in.",
    benefits: [
      "1-Tap WhatsApp Share with Dynamic UPI Payment QR Code",
      "Automatic HSN/SAC code lookup & real-time GST tax calculation",
      "Thermal printer (2/3-inch) and full A4/A5 PDF formatting",
      "E-Way Bill & E-Invoice compliance ready out of the box",
    ],
    impactMetric: { label: "Payment Collection Speed", value: "2x Faster" },
  },
  {
    id: "accounting",
    name: "Business Accounting & Ledger",
    shortName: "Accounting",
    tagline: "Automated double-entry bookkeeping & P&L",
    badge: "📊 REAL-TIME FINANCIAL PULSE",
    badgeColor: "from-purple-500/20 to-fuchsia-500/20 text-purple-300 border-purple-500/30",
    icon: BarChart3,
    headline: "Complete Financial Clarity with Zero Spreadsheet Chaos",
    description:
      "Keep your business audit-ready every day. Automatically generate balance sheets, profit & loss statements, customer party ledgers, and GSTR-1 / GSTR-3B filings with bank reconciliation.",
    benefits: [
      "Auto-generated Profit & Loss, Balance Sheet & Cash Flow reports",
      "Multi-payment account tracking (UPI, Cash, Bank Accounts)",
      "Customer & Vendor party ledgers with 1-click WhatsApp statements",
      "One-click GSTR-1 & GSTR-3B Excel/JSON export for your CA",
    ],
    impactMetric: { label: "Hours Saved on Accounting", value: "14 hrs/wk" },
  },
  {
    id: "inventory",
    name: "Multi-Warehouse Inventory",
    shortName: "Inventory",
    tagline: "Live godown stock, reorder warnings & batches",
    badge: "📦 MULTI-LOCATION STOCK",
    badgeColor: "from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/30",
    icon: Package,
    headline: "Never Run Out of Stock or Lose Track Across Godowns",
    description:
      "Track inventory live across multiple godowns and retail counters. Set automated minimum stock threshold alerts, track expiry dates and batch numbers, and transfer stock seamlessly.",
    benefits: [
      "Centralized inventory tracking across multiple branches & godowns",
      "Instant low-stock alerts with automated purchase order generation",
      "Batch number & expiry date tracking with FIFO/FEFO accounting",
      "Barcode & QR scanner integration for rapid checkout & audit",
    ],
    impactMetric: { label: "Stock Discrepancy Reduction", value: "98.5%" },
  },
  {
    id: "hr",
    name: "Staff HR & GPS Attendance",
    shortName: "HR & Attendance",
    tagline: "Selfie punch, GPS geofencing & 1-click payroll",
    badge: "👥 AUTOMATED WORKFORCE OS",
    badgeColor: "from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30",
    icon: Users,
    headline: "Flawless Attendance & 1-Click Salary Calculation",
    description:
      "Eliminate biometric hardware costs and proxy attendance. Employees punch in using their smartphones with GPS geofencing and selfie verification. Generate salary slips and statutory deductions in minutes.",
    benefits: [
      "GPS Geofencing + Selfie verification stops attendance fraud",
      "1-Click payroll with automated PF, ESI, TDS & advances calculation",
      "Automated Leave management: Casual, Sick, Earned & Comp Off balances",
      "WhatsApp & PDF payslip delivery directly to employees",
    ],
    impactMetric: { label: "Payroll Processing Time", value: "< 5 Mins" },
  },
  {
    id: "crm",
    name: "Business CRM & Sales Pipeline",
    shortName: "CRM Pipeline",
    tagline: "Visual deal stages, WhatsApp outreach & team roles",
    badge: "🎯 REVENUE GROWTH ENGINE",
    badgeColor: "from-pink-500/20 to-rose-500/20 text-pink-300 border-pink-500/30",
    icon: Target,
    headline: "Turn Enquiries into Loyal Paying Customers",
    description:
      "Track every inquiry from WhatsApp, website, and phone calls through a visual Kanban pipeline. Assign leads to sales team members, schedule automated follow-up reminders, and close deals faster.",
    benefits: [
      "Visual Kanban deal stages from New Lead to Final Conversion",
      "Sales executive portal logins with assigned lead quotas",
      "Automated follow-up reminders via WhatsApp & Email notifications",
      "Client conversion tracking with direct 1-click invoice creation",
    ],
    impactMetric: { label: "Lead Conversion Rate", value: "+38%" },
  },
  {
    id: "expenses",
    name: "Employee Travel & Expense Claims",
    shortName: "Expense Claims",
    tagline: "Monthly cards, voucher uploads & 6-digit tracking",
    badge: "💳 STATUTORY EXPENSE AUDIT",
    badgeColor: "from-indigo-500/20 to-violet-500/20 text-indigo-300 border-indigo-500/30",
    icon: Receipt,
    headline: "Hassle-Free Monthly Business Travel & Reimbursements",
    description:
      "Replace paper bills and lost vouchers with structured monthly expense cards. Staff upload fuel, food, and hotel receipts on the go. HR reviews itemized claims with 6-digit tracking numbers and approves reimbursements with 1 click.",
    benefits: [
      "Single Monthly Local & Outstation claim cards with itemized sub-entries",
      "Camera receipt upload with category tagging & KM rate calculation",
      "Unique 6-digit claim tracking ID (1xxxxx Local / 9xxxxx Outstation)",
      "Multi-level approval workflow with direct accounting ledger sync",
    ],
    impactMetric: { label: "Expense Approval Speed", value: "3x Faster" },
  },
];

export function LandingInteractiveShowcase() {
  const [activeTabId, setActiveTabId] = useState<string>("invoicing");

  // Interactive Invoicing Demo State
  const [invoiceItem, setInvoiceItem] = useState<number>(0);
  const sampleItems = [
    { name: "ERP Software Annual License", qty: 1, rate: 12000, gst: 18 },
    { name: "Commercial Hardware & Supplies", qty: 4, rate: 3500, gst: 18 },
    { name: "Business Consulting & Strategy", qty: 2, rate: 7500, gst: 18 },
  ];
  const currentItem = sampleItems[invoiceItem];
  const subtotal = currentItem.qty * currentItem.rate;
  const gstAmount = Math.round((subtotal * currentItem.gst) / 100);
  const total = subtotal + gstAmount;

  // Interactive HR Demo State
  const [isPunchedIn, setIsPunchedIn] = useState<boolean>(true);

  // Interactive CRM Demo State
  const [crmStage, setCrmStage] = useState<"lead" | "quote" | "won">("quote");

  // Interactive Inventory Godown State
  const [selectedWarehouse, setSelectedWarehouse] = useState<"main" | "branch">("main");

  const activeTab = SHOWCASE_TABS.find((t) => t.id === activeTabId) || SHOWCASE_TABS[0];

  return (
    <section className="py-20 sm:py-24 bg-gradient-to-b from-[#120a33] via-[#1a0f44] to-[#120a33] text-white relative overflow-hidden border-t border-b border-white/10 shadow-2xl">
      {/* Dynamic ambient lighting accents */}
      <div className="absolute top-0 left-1/3 -translate-y-1/2 w-[550px] h-[550px] bg-[#e77817]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 translate-y-1/2 w-[500px] h-[500px] bg-[#6366f1]/20 rounded-full blur-[130px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-amber-300 uppercase tracking-widest mb-4 shadow-sm backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Interactive Product Sandbox
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.15] mb-4">
            Everything your business needs,{" "}
            <span className="bg-gradient-to-r from-[#ffaa47] via-[#ff8522] to-[#e77817] bg-clip-text text-transparent">
              built into one ecosystem.
            </span>
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-slate-300 leading-relaxed font-normal">
            Click any module below to experience how Aassay Biz eliminates disconnected software, spreadsheet confusion, and manual errors.
          </p>
        </div>

        {/* 6 Interactive Module Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mb-10">
          {SHOWCASE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex flex-col items-center justify-center text-center p-3 sm:p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer group ${
                  isActive
                    ? "bg-white/15 border-amber-400/80 shadow-lg shadow-orange-500/20 scale-[1.03] ring-1 ring-amber-400/50"
                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-slate-300"
                }`}
              >
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-2 transition-all ${
                    isActive
                      ? "bg-gradient-to-br from-[#e77817] to-[#ff9438] text-white shadow-md shadow-orange-500/30"
                      : "bg-white/10 text-slate-300 group-hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-xs sm:text-sm font-bold line-clamp-1 ${isActive ? "text-white" : "text-slate-300"}`}>
                  {tab.shortName}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 hidden sm:block line-clamp-1">
                  {tab.tagline.split(" ")[0]}...
                </span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Interactive Stage Card */}
        <div className="rounded-3xl bg-white/[0.07] border border-white/15 backdrop-blur-xl shadow-2xl p-6 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Column: Feature Highlights & Value Proof (6 cols) */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              {/* Pill Badge */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold w-fit mb-4 bg-gradient-to-r ${activeTab.badgeColor}`}>
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span>{activeTab.badge}</span>
              </div>

              {/* Title */}
              <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-3">
                {activeTab.headline}
              </h3>

              {/* Description */}
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-6 font-normal">
                {activeTab.description}
              </p>

              {/* Key Checkpoint Benefits */}
              <div className="space-y-3 mb-8">
                {activeTab.benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs sm:text-sm text-slate-200 font-medium leading-snug">
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>

              {/* Impact Metric & Quick Action Buttons */}
              <div className="pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl sm:text-3xl font-black text-amber-400 leading-none">
                    {activeTab.impactMetric.value}
                  </div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide leading-tight max-w-[120px]">
                    {activeTab.impactMetric.label}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    className="bg-[#e77817] hover:bg-[#d46a0f] text-white font-bold rounded-xl px-5 h-10 shadow-md shadow-orange-500/25 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
                    asChild
                  >
                    <Link to="/book-demo">
                      <span>Book Live Demo</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white hover:bg-white/10 font-semibold rounded-xl px-4 h-10 cursor-pointer"
                    asChild
                  >
                    <Link to="/pricing">View Plans</Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Column: Live Interactive Product Sandbox (6 cols) */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl bg-[#0c0721]/90 border border-white/15 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
                
                {/* Simulator Window Header */}
                <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/10 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                    <span className="text-[11px] font-mono text-slate-400 ml-1">
                      aassaybiz.com/{activeTab.id}-simulator
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                    ● Live Sandbox
                  </span>
                </div>

                {/* 1. Invoicing Simulator */}
                {activeTab.id === "invoicing" && (
                  <div className="space-y-4">
                    <div className="text-xs text-slate-300 flex items-center justify-between">
                      <span className="font-semibold text-slate-400">Select Sample Invoice Item:</span>
                      <span className="text-[11px] text-amber-400 font-mono">Invoice #INV-2026-084</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {sampleItems.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => setInvoiceItem(idx)}
                          className={`p-2 rounded-xl text-left border transition-all text-xs cursor-pointer ${
                            invoiceItem === idx
                              ? "bg-amber-500/20 border-amber-400 text-white"
                              : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                          }`}
                        >
                          <div className="font-bold truncate">{item.name.split(" ")[0]}</div>
                          <div className="text-[10px] text-slate-400">₹{item.rate.toLocaleString("en-IN")}</div>
                        </button>
                      ))}
                    </div>

                    {/* Mini Invoice Preview Card */}
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2.5">
                      <div className="flex justify-between items-center text-xs pb-2 border-b border-white/10">
                        <span className="text-slate-300 font-bold">{currentItem.name}</span>
                        <span className="text-white font-mono font-bold">Qty: {currentItem.qty}</span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-slate-400">
                          <span>Taxable Amount</span>
                          <span className="text-white font-mono">₹{subtotal.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>GST (18% CGST+SGST)</span>
                          <span className="text-emerald-400 font-mono">+₹{gstAmount.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between text-sm font-black pt-1.5 border-t border-white/10 text-white">
                          <span>Total Payable</span>
                          <span className="text-amber-400 font-mono">₹{total.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic UPI & WhatsApp Bar */}
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                          <QrCode className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-[11px]">Dynamic UPI QR Code Generated</div>
                          <div className="text-[10px] text-emerald-300">Customer pays via GPay, PhonePe, Paytm</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                        WhatsApp Ready
                      </span>
                    </div>
                  </div>
                )}

                {/* 2. Accounting Simulator */}
                {activeTab.id === "accounting" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-slate-400 text-[11px]">Monthly Revenue</div>
                        <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">₹18,45,200</div>
                        <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
                          <TrendingUp className="w-3 h-3" /> +24.6% vs last month
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-slate-400 text-[11px]">Net Margin (P&L)</div>
                        <div className="text-lg font-black text-amber-400 font-mono mt-0.5">₹4,82,300</div>
                        <div className="text-[10px] text-amber-300 flex items-center gap-1 mt-1">
                          <CheckCircle2 className="w-3 h-3" /> 26.1% profit margin
                        </div>
                      </div>
                    </div>

                    {/* Party Ledger Quick View */}
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs">
                      <div className="font-bold text-white text-xs pb-1.5 border-b border-white/10 flex justify-between">
                        <span>Party Outstanding Ledger</span>
                        <span className="text-[10px] text-slate-400">Live Sync</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span>Sharma Steels & Hardware</span>
                        <span className="text-amber-400 font-mono font-bold">₹42,500 (Dr)</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span>Patel Infotech Solutions</span>
                        <span className="text-emerald-400 font-mono font-bold">₹15,000 (Cr)</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 flex items-center justify-between">
                      <span>GSTR-1 & GSTR-3B Tax Filing:</span>
                      <span className="font-bold text-white bg-purple-500/30 px-2 py-0.5 rounded text-[10px]">
                        Auto-Computed & Ready
                      </span>
                    </div>
                  </div>
                )}

                {/* 3. Inventory Simulator */}
                {activeTab.id === "inventory" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => setSelectedWarehouse("main")}
                        className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                          selectedWarehouse === "main"
                            ? "bg-amber-500 text-slate-950 shadow-sm"
                            : "bg-white/10 text-slate-300"
                        }`}
                      >
                        Main Warehouse (Indore)
                      </button>
                      <button
                        onClick={() => setSelectedWarehouse("branch")}
                        className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                          selectedWarehouse === "branch"
                            ? "bg-amber-500 text-slate-950 shadow-sm"
                            : "bg-white/10 text-slate-300"
                        }`}
                      >
                        City Depot (Bhopal)
                      </button>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2.5 text-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-white/10">
                        <span className="font-bold text-white">SKU-882: Heavy Duty Brass Valves</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                          Batch #B24
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span>Available Units</span>
                        <span className="font-mono font-bold text-white">
                          {selectedWarehouse === "main" ? "1,240 Units" : "48 Units (Low Stock!)"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span>Reorder Threshold</span>
                        <span className="font-mono text-slate-400">100 Units</span>
                      </div>
                    </div>

                    {selectedWarehouse === "branch" ? (
                      <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-200 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> Stock below threshold
                        </span>
                        <span className="bg-red-500/30 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                          1-Click Stock Transfer
                        </span>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Healthy Inventory Level
                        </span>
                        <span className="text-[10px] text-slate-400">Next Stock Audit: 25 Nov</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Staff HR & Attendance Simulator */}
                {activeTab.id === "hr" && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-white">
                            RK
                          </div>
                          <div>
                            <div className="font-bold text-white">Rahul Kumar (Sales Manager)</div>
                            <div className="text-[10px] text-slate-400">Emp ID: EMP-104</div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                          Indore Office Perimeter
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-white/10">
                        <div className="text-slate-400">
                          GPS Location: <span className="text-white font-mono">22.7196° N, 75.8577° E</span>
                        </div>
                        <div className="text-slate-400 text-right">
                          Radius: <span className="text-emerald-400 font-bold">18m (Within 50m)</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                      <div>
                        <div className="text-xs font-bold text-white">Punch Status Simulation</div>
                        <div className="text-[11px] text-slate-400">
                          {isPunchedIn ? "Clocked in at 09:32 AM (On Time)" : "Clocked out at 06:45 PM"}
                        </div>
                      </div>
                      <button
                        onClick={() => setIsPunchedIn(!isPunchedIn)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isPunchedIn
                            ? "bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
                            : "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600"
                        }`}
                      >
                        {isPunchedIn ? "Simulate Punch Out" : "Simulate Punch In"}
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-400 text-center">
                      Auto-computes overtime, leave deductions, and net monthly salary automatically.
                    </div>
                  </div>
                )}

                {/* 5. CRM Pipeline Simulator */}
                {activeTab.id === "crm" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Deal: 50x Industrial Motors</span>
                      <span className="font-mono font-bold text-amber-400">Value: ₹3,75,000</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <button
                        onClick={() => setCrmStage("lead")}
                        className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                          crmStage === "lead"
                            ? "bg-blue-500/20 border-blue-400 text-white font-bold"
                            : "bg-white/5 border-white/10 text-slate-400"
                        }`}
                      >
                        1. New Inquiry
                      </button>
                      <button
                        onClick={() => setCrmStage("quote")}
                        className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                          crmStage === "quote"
                            ? "bg-amber-500/20 border-amber-400 text-white font-bold"
                            : "bg-white/5 border-white/10 text-slate-400"
                        }`}
                      >
                        2. Quote Sent
                      </button>
                      <button
                        onClick={() => setCrmStage("won")}
                        className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                          crmStage === "won"
                            ? "bg-emerald-500/20 border-emerald-400 text-white font-bold"
                            : "bg-white/5 border-white/10 text-slate-400"
                        }`}
                      >
                        3. Deal Won 🎉
                      </button>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Assigned Sales Executive:</span>
                        <span className="text-white font-bold">Amit Verma</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Next Action:</span>
                        <span className="text-amber-400 font-medium">
                          {crmStage === "lead" && "Send Product Catalog via WhatsApp"}
                          {crmStage === "quote" && "Schedule Price Negotiation Call"}
                          {crmStage === "won" && "Generate Advance GST Tax Invoice"}
                        </span>
                      </div>
                    </div>

                    {crmStage === "won" && (
                      <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-xs text-emerald-200 text-center font-bold">
                        Deal marked as Won! Invoice generated with 1 click.
                      </div>
                    )}
                  </div>
                )}

                {/* 6. Expenses Simulator */}
                {activeTab.id === "expenses" && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-white/10">
                        <span className="font-bold text-white">Monthly Outstation Tour (Indore ➔ Delhi)</span>
                        <span className="text-[11px] font-mono text-amber-400 font-bold">Claim #904812</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Train & Local Cab Vouchers (3 bills)</span>
                        <span className="font-mono text-white">₹4,250</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Hotel Stay (2 nights)</span>
                        <span className="font-mono text-white">₹5,000</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Daily Allowance (DA)</span>
                        <span className="font-mono text-white">₹1,500</span>
                      </div>
                      <div className="flex justify-between font-bold pt-2 border-t border-white/10 text-white">
                        <span>Total Claimed Amount</span>
                        <span className="text-amber-400 font-mono">₹10,750</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-400/30 text-xs text-indigo-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> Receipts Verified
                      </span>
                      <span className="bg-emerald-500 text-slate-950 font-bold px-2 py-0.5 rounded text-[10px]">
                        Approved for Reimbursement
                      </span>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
