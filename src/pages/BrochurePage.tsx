import React, { useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoImg from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { usePlatformSocials, formatSocialUrl } from "@/hooks/use-platform-socials";
import { YoutubeIcon, FacebookIcon, InstagramIcon } from "@/components/shared/SocialMediaLinks";
import { AassayBizBrand } from "@/components/shared/AassayBizBrand";
import {
  Printer, ArrowLeft, Download, ShieldCheck, CheckCircle2, Zap,
  FileText, Package, ShoppingCart, Landmark, Users, BarChart3,
  Share2, Sparkles, Building2, Phone, Mail, Globe, Check, Star
} from "lucide-react";

export default function BrochurePage() {
  const navigate = useNavigate();
  const { socials } = usePlatformSocials();
  const brochureRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = React.useState<"custom" | "interactive">(() => {
    return socials.custom_brochure_url ? "custom" : "interactive";
  });

  React.useEffect(() => {
    if (socials.custom_brochure_url) {
      setViewMode("custom");
    }
  }, [socials.custom_brochure_url]);

  const handlePrint = () => {
    window.print();
  };

  const youtubeUrl = formatSocialUrl("youtube", socials.youtube);
  const facebookUrl = formatSocialUrl("facebook", socials.facebook);
  const instagramUrl = formatSocialUrl("instagram", socials.instagram);

  const isPdf = socials.custom_brochure_url?.toLowerCase().endsWith(".pdf");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Top Floating Action Bar (Hidden during Print) */}
      <header className="print:hidden sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-slate-800 px-6 py-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <div className="h-5 w-px bg-slate-700 mx-1 hidden sm:block" />
            <span className="font-semibold text-white text-sm flex items-center gap-1.5">
              Official <AassayBizBrand theme="dark" /> Brochure
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {socials.custom_brochure_url && (
              <div className="flex bg-slate-800/90 rounded-lg p-1 border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode("custom")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                    viewMode === "custom"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Uploaded Document
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("interactive")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                    viewMode === "interactive"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Interactive Web Edition
                </button>
              </div>
            )}

            {socials.custom_brochure_url && viewMode === "custom" ? (
              <Button
                asChild
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 text-xs font-semibold px-4 py-2"
              >
                <a href={socials.custom_brochure_url} target="_blank" rel="noopener noreferrer" download>
                  <Download className="w-4 h-4 mr-2" /> Download Uploaded File
                </a>
              </Button>
            ) : (
              <Button
                onClick={handlePrint}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 text-xs font-semibold px-4 py-2"
              >
                <Printer className="w-4 h-4 mr-2" /> Print / Save as PDF
              </Button>
            )}

            <Button variant="outline" size="sm" asChild className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs">
              <Link to="/">Visit Website</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Print CSS Styles */}
      <style>{'\
        @media print {\
          body { background: white !important; color: #0f172a !important; margin: 0 !important; padding: 0 !important; }\
          .print\\:hidden { display: none !important; }\
          .brochure-page {\
            width: 210mm !important;\
            min-height: 297mm !important;\
            height: 297mm !important;\
            margin: 0 !important;\
            padding: 16mm 18mm !important;\
            page-break-after: always !important;\
            box-shadow: none !important;\
            background: white !important;\
            color: #0f172a !important;\
            box-sizing: border-box !important;\
            overflow: hidden !important;\
          }\
          @page {\
            size: A4 portrait;\
            margin: 0;\
          }\
        }\
      '}</style>

      {/* Custom Uploaded Brochure View */}
      {socials.custom_brochure_url && viewMode === "custom" ? (
        <div className="max-w-5xl mx-auto mt-6 px-4 space-y-4">
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Official Custom Brochure</h4>
                <p className="text-xs text-slate-400">Directly uploaded by management. View inline below or download.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" asChild className="border-slate-700 text-slate-200 hover:bg-slate-800 text-xs">
                <a href={socials.custom_brochure_url} target="_blank" rel="noopener noreferrer">
                  Open in New Tab
                </a>
              </Button>
              <Button size="sm" asChild className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                <a href={socials.custom_brochure_url} target="_blank" rel="noopener noreferrer" download>
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Download
                </a>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-2 shadow-2xl overflow-hidden min-h-[75vh]">
            {isPdf ? (
              <iframe
                src={socials.custom_brochure_url}
                className="w-full h-[82vh] rounded-xl border-0 bg-white"
                title="Official AassayBiz Brochure"
              />
            ) : (
              <div className="flex justify-center p-4">
                <img
                  src={socials.custom_brochure_url}
                  alt="Official AassayBiz Brochure"
                  className="max-w-full max-h-[82vh] object-contain rounded-xl shadow-lg"
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Interactive Brochure Container */
        <div ref={brochureRef} className="max-w-[210mm] mx-auto mt-8 space-y-10 print:mt-0 print:space-y-0">
        
        {/* ============================================================== */}
        {/* PAGE 1: HERO, MODULES & CAPABILITIES */}
        {/* ============================================================== */}
        <section className="brochure-page bg-white text-slate-900 rounded-xl shadow-2xl p-10 flex flex-col justify-between border border-slate-200/80 relative overflow-hidden">
          {/* Subtle Background Accent */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-indigo-100/60 to-purple-100/40 rounded-bl-full -z-0 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-gradient-to-tr from-amber-50/60 to-orange-100/40 rounded-tr-full -z-0 pointer-events-none" />

          <div className="relative z-10">
            {/* Header Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-5 mb-8">
              <div className="flex items-center gap-3">
                <img src={logoImg} alt="Aassay Biz Logo" className="h-12 w-auto object-contain" />
                <div>
                  <h1 className="leading-none"><AassayBizBrand className="text-2xl" /></h1>
                  <p className="text-[11px] font-semibold tracking-wider text-indigo-600 uppercase mt-1">Enterprise Business Operating System</p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" /> 100% GST Ready
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Official Product Overview · 2026</p>
              </div>
            </div>

            {/* Hero Banner */}
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight mb-3">
                Run Your Entire Business <br />
                <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-800 bg-clip-text text-transparent">
                  Invoicing, Inventory, HR, Banking & Marketing
                </span>
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed max-w-2xl flex items-center gap-1 flex-wrap">
                <AassayBizBrand />
                <span>is India’s next-generation all-in-one business software engineered specifically for SMBs, wholesalers, manufacturers, and modern enterprises. Eliminate software fragmentation with a unified cloud platform.</span>
              </p>
            </div>

            {/* Key Metrics Strip */}
            <div className="grid grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 mb-8 text-center">
              <div>
                <div className="text-xl font-black text-indigo-600">500+</div>
                <div className="text-[11px] font-medium text-slate-600">Growing Enterprises</div>
              </div>
              <div>
                <div className="text-xl font-black text-emerald-600">₹820 Cr+</div>
                <div className="text-[11px] font-medium text-slate-600">Transactions Invoiced</div>
              </div>
              <div>
                <div className="text-xl font-black text-blue-600">30 Sec</div>
                <div className="text-[11px] font-medium text-slate-600">Invoice Generation</div>
              </div>
              <div>
                <div className="text-xl font-black text-amber-600">99.99%</div>
                <div className="text-[11px] font-medium text-slate-600">Cloud & Offline Uptime</div>
              </div>
            </div>

            {/* Core Product Modules Grid */}
            <div className="space-y-3">
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-500 mb-2">Core Product Modules</h3>
              <div className="grid grid-cols-2 gap-3.5">
                {/* 1. Sales */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="p-1 rounded bg-blue-100 text-blue-700">
                      <FileText className="w-3.5 h-3.5" />
                    </span>
                    <h4 className="font-bold text-xs text-slate-900">Sales & GST Invoicing</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Tax Invoices, Quotations, Delivery Challans, Credit Notes, and instant payment links with dynamic UPI QR code.
                  </p>
                </div>

                {/* 2. Catalog & Inventory */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="p-1 rounded bg-amber-100 text-amber-700">
                      <Package className="w-3.5 h-3.5" />
                    </span>
                    <h4 className="font-bold text-xs text-slate-900">Inventory Management</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Stock tracking, multi-warehouse transfers, barcode scanner, low-stock alerts, batch & expiry control.
                  </p>
                </div>

                {/* 3. Purchases */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="p-1 rounded bg-rose-100 text-rose-700">
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </span>
                    <h4 className="font-bold text-xs text-slate-900">Purchases & Payables</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Purchase Invoices (Bills), Purchase Orders, Goods Received Notes (GRN), Vendor ledger & expense management.
                  </p>
                </div>

                {/* 4. Banking */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="p-1 rounded bg-emerald-100 text-emerald-700">
                      <Landmark className="w-3.5 h-3.5" />
                    </span>
                    <h4 className="font-bold text-xs text-slate-900">Banking & Accounting</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Chart of accounts, Journal entries, Bank reconciliation, Cash Flow tracking, automated P&L statements & GST return exports.
                  </p>
                </div>

                {/* 5. Business HR */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="p-1 rounded bg-purple-100 text-purple-700">
                      <Users className="w-3.5 h-3.5" />
                    </span>
                    <h4 className="font-bold text-xs text-slate-900">Business HR & Attendance</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Selfie/biometric employee punch, monthly attendance matrix, leave balances & approval workflows, shifts, and salary slips.
                  </p>
                </div>

                {/* 6. Business CRM */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="p-1 rounded bg-cyan-100 text-cyan-700">
                      <BarChart3 className="w-3.5 h-3.5" />
                    </span>
                    <h4 className="font-bold text-xs text-slate-900">Business CRM</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Lead capturing from IndiaMART & Meta, customizable drag-and-drop pipeline stages, follow-up call & meeting logs.
                  </p>
                </div>

                {/* 7. Business Promotion */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="p-1 rounded bg-orange-100 text-orange-700">
                      <Sparkles className="w-3.5 h-3.5" />
                    </span>
                    <h4 className="font-bold text-xs text-slate-900">Business Promotion</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Branded Festival & Custom Post Studio, 1-click local poster branding, bulk WhatsApp campaigns & promotional reports.
                  </p>
                </div>

                {/* 8. Business Integration */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="p-1 rounded bg-teal-100 text-teal-700">
                      <Share2 className="w-3.5 h-3.5" />
                    </span>
                    <h4 className="font-bold text-xs text-slate-900">Business Integration</h4>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Instant WhatsApp document dispatch, live WhatsApp chat sync, and automated email reminders for overdue invoices.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Page 1 Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1"><AassayBizBrand className="text-[11px]" /> Comprehensive Enterprise Suite</span>
            <span>Page 1 of 2</span>
          </div>
        </section>

        {/* ============================================================== */}
        {/* PAGE 2: PACKAGES, PRICING & OFFICIAL CONTACT */}
        {/* ============================================================== */}
        <section className="brochure-page bg-white text-slate-900 rounded-xl shadow-2xl p-10 flex flex-col justify-between border border-slate-200/80 relative overflow-hidden">
          <div className="relative z-10">
            {/* Header Mini */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
              <div className="flex items-center gap-2.5">
                <img src={logoImg} alt="Aassay Biz" className="h-8 w-auto object-contain" />
                <span className="font-bold text-lg text-slate-900 flex items-center gap-1.5"><AassayBizBrand className="text-lg" /> Packages &amp; Pricing</span>
              </div>
              <span className="text-xs font-semibold text-indigo-600">Transparent & Affordable Plans</span>
            </div>

            {/* Base Plans Grid */}
            <div className="mb-6">
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-500 mb-3">Modular Base Plans</h3>
              <div className="grid grid-cols-3 gap-3.5">
                
                {/* Plan 1: Business Starter */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Starter</span>
                    <h4 className="text-lg font-bold text-slate-900 mt-0.5">Business Starter</h4>
                    <div className="mt-2 mb-3">
                      <span className="text-2xl font-black text-slate-900">₹0</span>
                      <span className="text-xs text-slate-500"> / forever</span>
                    </div>
                    <ul className="space-y-1.5 text-[11px] text-slate-600">
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 100 Invoices / Year</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 3 Employee Attendance</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Up to 50 Leads</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Festive Posts</li>
                    </ul>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200 text-[10px] text-slate-500 text-center font-medium">
                    Ideal for Micro Businesses
                  </div>
                </div>

                {/* Business Accounting */}
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">High Growth</span>
                    <h4 className="text-lg font-bold text-slate-900 mt-0.5">Business Accounting</h4>
                    <div className="mt-2 mb-3">
                      <span className="text-2xl font-black text-blue-700">₹599</span>
                      <span className="text-xs text-slate-500"> / mo</span>
                      <p className="text-[10px] text-blue-600 font-medium mt-0.5">₹5,999/year (Save 17%)</p>
                    </div>
                    <ul className="space-y-1.5 text-[11px] text-slate-600">
                      <li className="flex items-center gap-1.5 font-bold text-blue-900"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Everything in Free Plan</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <strong>Unlimited</strong> Invoices & Bills</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Quotations, POs & Delivery Challans</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Multi-Warehouse Inventory</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /> 500 WhatsApp Msgs / Mo</li>
                    </ul>
                  </div>
                  <div className="mt-4 pt-3 border-t border-blue-200 text-[10px] text-blue-700 text-center font-bold">
                    For Wholesalers & Retailers
                  </div>
                </div>

                {/* Business Suite */}
                <div className="p-4 rounded-xl border-2 border-indigo-500 bg-indigo-50/50 flex flex-col justify-between relative shadow-md">
                  <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider">
                    Recommended
                  </span>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">All-in-One ERP</span>
                    <h4 className="text-lg font-bold text-slate-900 mt-0.5">Business Suite</h4>
                    <div className="mt-2 mb-3">
                      <span className="text-2xl font-black text-indigo-700">₹1,499</span>
                      <span className="text-xs text-slate-500"> / mo</span>
                      <p className="text-[10px] text-indigo-600 font-medium mt-0.5">₹14,999/year (Save 17%)</p>
                    </div>
                    <ul className="space-y-1.5 text-[11px] text-slate-700">
                      <li className="flex items-center gap-1.5 font-bold text-indigo-900"><Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> Everything in Free Plan</li>
                      <li className="flex items-center gap-1.5 font-semibold"><Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> All Accounting & Invoicing</li>
                      <li className="flex items-center gap-1.5 font-semibold"><Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> Complete HR, Attendance & Payroll</li>
                      <li className="flex items-center gap-1.5 font-semibold"><Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> Complete CRM & Sales Pipeline</li>
                      <li className="flex items-center gap-1.5 font-semibold"><Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> Marketing Posters & Campaigns</li>
                      <li className="flex items-center gap-1.5 text-indigo-800 font-bold bg-indigo-100/70 px-1.5 py-0.5 rounded"><Sparkles className="w-3 h-3 text-indigo-600" /> Full Suite Access & Admin</li>
                    </ul>
                  </div>
                  <div className="mt-4 pt-3 border-t border-indigo-200 text-[10px] text-indigo-700 text-center font-bold">
                    Best Value for Growing SMEs
                  </div>
                </div>
              </div>
            </div>

            {/* Modular Add-ons Matrix */}
            <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50/60">
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-700 mb-2">Specialized Modular Plans</h3>
              <div className="grid grid-cols-3 gap-3 text-left">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">Business HR</span>
                    <span className="text-xs font-black text-purple-600">₹599/mo</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">10 staff included (+₹49/extra). Attendance, payroll runs, leaves & shifts.</p>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">Business CRM</span>
                    <span className="text-xs font-black text-cyan-600">₹599/mo</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Unlimited leads, IndiaMART & Meta API integrations, sales pipeline & deals.</p>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">Business Promotion</span>
                    <span className="text-xs font-black text-orange-600">₹599/mo</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">All festival & business categories, WhatsApp & email broadcast campaigns.</p>
                </div>
              </div>
            </div>

            {/* Contact & Social Handles Footer Card */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-md">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <span>Get Started with</span> <AassayBizBrand theme="dark" className="text-sm" /> <span>Today</span>
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Start your 14-day free trial. No credit card required. Call or connect on official channels.
                  </p>
                </div>
                {/* Official Social Media Badges */}
                <div className="flex items-center gap-2 shrink-0">
                  {youtubeUrl && (
                    <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 hover:scale-105 transition-all" title="YouTube">
                      <YoutubeIcon className="w-4 h-4" />
                    </a>
                  )}
                  {facebookUrl && (
                    <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:scale-105 transition-all" title="Facebook">
                      <FacebookIcon className="w-4 h-4" />
                    </a>
                  )}
                  {instagramUrl && (
                    <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-pink-600/20 text-pink-400 border border-pink-500/30 hover:scale-105 transition-all" title="Instagram">
                      <InstagramIcon className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Direct Contacts Bar */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>www.aassaybiz.com</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>support@aassaybiz.com</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{socials.phone || "+91 98765 43210"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Page 2 Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">© {new Date().getFullYear()} <AassayBizBrand className="text-[11px]" /> Technologies. All rights reserved.</span>
            <span>Page 2 of 2</span>
          </div>
        </section>

      </div>
      )}
    </div>
  );
}
