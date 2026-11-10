import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoImg from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlatformSocials, formatSocialUrl } from "@/hooks/use-platform-socials";
import { YoutubeIcon, FacebookIcon, InstagramIcon } from "@/components/shared/SocialMediaLinks";
import {
  Printer, ArrowLeft, ShieldCheck, CheckCircle2, Zap,
  FileText, Package, ShoppingCart, Landmark, Users, BarChart3,
  Share2, Sparkles, Phone, Mail, Globe, Check, Star,
  QrCode, Award, Layers, ArrowRight, Smartphone, Monitor,
  Plus, Minus, Download,
} from "lucide-react";
import { AassayBizBrand } from "@/components/shared/AassayBizBrand";

export default function PamphletPage() {
  const navigate = useNavigate();
  const { socials } = usePlatformSocials();
  const [pamphletFormat, setPamphletFormat] = useState<"double" | "single">("double");
  const [viewMode, setViewMode] = useState<"custom" | "interactive">(() => {
    return socials.custom_pamphlet_url ? "custom" : "interactive";
  });
  const pamphletRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (socials.custom_pamphlet_url) {
      setViewMode("custom");
    }
  }, [socials.custom_pamphlet_url]);

  const handlePrint = () => {
    window.print();
  };

  const youtubeUrl = formatSocialUrl("youtube", socials.youtube);
  const facebookUrl = formatSocialUrl("facebook", socials.facebook);
  const instagramUrl = formatSocialUrl("instagram", socials.instagram);

  const isPdf = socials.custom_pamphlet_url?.toLowerCase().endsWith(".pdf");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Top Floating Control Bar (Hidden during Print) */}
      <header className="print:hidden sticky top-0 z-50 backdrop-blur-xl bg-slate-900/85 border-b border-slate-800 px-6 py-4 shadow-xl">
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
            <div>
              <span className="font-bold text-white text-sm flex items-center gap-1.5">Official <AassayBizBrand theme="dark" /> Pamphlet / Handout</span>
              <span className="text-[11px] text-indigo-400 hidden sm:inline">Printable promotional flyer for client outreach & events</span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {socials.custom_pamphlet_url && (
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
                  Interactive Web Flyer
                </button>
              </div>
            )}

            {/* Format Switcher (Only in interactive mode) */}
            {(!socials.custom_pamphlet_url || viewMode === "interactive") && (
              <div className="flex bg-slate-800/90 rounded-lg p-1 border border-slate-700/80 text-xs">
                <button
                  onClick={() => setPamphletFormat("double")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                    pamphletFormat === "double"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Double-Sided Flyer
                </button>
                <button
                  onClick={() => setPamphletFormat("single")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                    pamphletFormat === "single"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Single-Page Handout
                </button>
              </div>
            )}

            {socials.custom_pamphlet_url && viewMode === "custom" ? (
              <Button
                asChild
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 text-xs font-semibold px-4 py-2"
              >
                <a href={socials.custom_pamphlet_url} target="_blank" rel="noopener noreferrer" download>
                  Download Uploaded File
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

            <Button variant="outline" size="sm" asChild className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs hidden md:inline-flex">
              <Link to="/">Visit Website</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Print CSS Styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .pamphlet-sheet {
            width: 210mm !important;
            min-height: 297mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 14mm 16mm !important;
            page-break-after: always !important;
            box-shadow: none !important;
            background: white !important;
            color: #0f172a !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>

      {/* Custom Uploaded Pamphlet View */}
      {socials.custom_pamphlet_url && viewMode === "custom" ? (
        <div className="max-w-5xl mx-auto mt-6 px-4 space-y-4">
          <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-md">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Official Custom Pamphlet / Flyer</h4>
                <p className="text-xs text-slate-400">Directly uploaded by management. View inline below or download.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" asChild className="border-slate-700 text-slate-200 hover:bg-slate-800 text-xs">
                <a href={socials.custom_pamphlet_url} target="_blank" rel="noopener noreferrer">
                  Open in New Tab
                </a>
              </Button>
              <Button size="sm" asChild className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                <a href={socials.custom_pamphlet_url} target="_blank" rel="noopener noreferrer" download>
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Download
                </a>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-2 shadow-2xl overflow-hidden min-h-[75vh]">
            {isPdf ? (
              <iframe
                src={socials.custom_pamphlet_url}
                className="w-full h-[82vh] rounded-xl border-0 bg-white"
                title="Official AassayBiz Pamphlet"
              />
            ) : (
              <div className="flex justify-center p-4">
                <img
                  src={socials.custom_pamphlet_url}
                  alt="Official AassayBiz Pamphlet"
                  className="max-w-full max-h-[82vh] object-contain rounded-xl shadow-lg"
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Main Container */
        <div ref={pamphletRef} className="max-w-[210mm] mx-auto mt-8 space-y-10 print:mt-0 print:space-y-0">
        
        {/* ========================================================================= */}
        {/* FORMAT 1: DOUBLE-SIDED FLYER (SIDE A & SIDE B) */}
        {/* ========================================================================= */}
        {pamphletFormat === "double" && (
          <>
            {/* ------------------------------------------------------------- */}
            {/* SIDE A: FRONT / HOOK & CORE CAPABILITIES */}
            {/* ------------------------------------------------------------- */}
            <section className="pamphlet-sheet bg-white text-slate-900 rounded-xl shadow-2xl p-8 flex flex-col justify-between border border-slate-200/80 relative overflow-hidden">
              {/* Vibrant Decorative Corner Accents */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent rounded-bl-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-amber-400/10 via-orange-400/10 to-transparent rounded-tr-full pointer-events-none" />

              <div className="relative z-10">
                {/* Header Strip */}
                <div className="flex items-center justify-between border-b-2 border-indigo-600 pb-4 mb-6">
                  <div className="flex items-center gap-3">
                    <img src={logoImg} alt="Aassay Biz Logo" className="h-12 w-auto object-contain" />
                    <div>
                      <AassayBizBrand className="text-2xl leading-none" />
                      <p className="text-[11px] font-bold tracking-wider text-indigo-600 uppercase mt-1">Enterprise Business Operating System</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 100% GST Ready
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">ISO 27001 Certified Security</span>
                  </div>
                </div>

                {/* Hero Punchy Headline */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-6 mb-6 shadow-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-full bg-indigo-500/10 transform skew-x-12 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-2">
                      <Sparkles className="w-3 h-3 text-amber-400" /> UPGRADE YOUR BUSINESS TODAY
                    </div>
                    <h2 className="text-2xl font-black tracking-tight leading-tight mb-2">
                      Stop Managing Your Business With 5 Disconnected Apps.
                    </h2>
                    <p className="text-slate-300 text-xs leading-relaxed max-w-xl">
                      Switch to <AassayBizBrand theme="dark" />: The all-in-one software trusted by 500+ Indian businesses for fast GST billing, live multi-warehouse inventory, staff biometric attendance, automated banking, and WhatsApp client promotion.
                    </p>
                  </div>
                </div>

                {/* 6 Core Highlights Grid */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" /> Everything You Need Under One Roof
                    </h3>
                    <span className="text-[11px] text-indigo-600 font-bold">Fast · Simple · Powerful</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Item 1 */}
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 flex gap-3">
                      <div className="w-9 h-9 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">30-Second GST Invoicing</h4>
                        <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                          Professional GST tax invoices, delivery challans, quotations, and dynamic UPI payment QR codes.
                        </p>
                      </div>
                    </div>

                    {/* Item 2 */}
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 flex gap-3">
                      <div className="w-9 h-9 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Live Stock & Warehouses</h4>
                        <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                          Multi-godown inventory, barcode scanning, batch expiry tracking, and low-stock WhatsApp alerts.
                        </p>
                      </div>
                    </div>

                    {/* Item 3 */}
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 flex gap-3">
                      <div className="w-9 h-9 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Banking & Cash Flow</h4>
                        <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                          Bank reconciliation, automated overdue payment reminders, cash flow reports, and GST return prep.
                        </p>
                      </div>
                    </div>

                    {/* Item 4 */}
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 flex gap-3">
                      <div className="w-9 h-9 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Staff Biometric HR & Payroll</h4>
                        <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                          Selfie/GPS employee punches, leave tracking, monthly shift grid, and 1-click salary slip generation.
                        </p>
                      </div>
                    </div>

                    {/* Item 5 */}
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 flex gap-3">
                      <div className="w-9 h-9 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Business CRM & Leads</h4>
                        <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                          Auto-capture leads from IndiaMART & Meta, follow-up calls pipeline, and visual deal conversions.
                        </p>
                      </div>
                    </div>

                    {/* Item 6 */}
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 flex gap-3">
                      <div className="w-9 h-9 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                        <Share2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Promotion & Festival Posts</h4>
                        <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                          Instant branded festival greetings with your logo & phone number, plus bulk WhatsApp campaign broadcasts.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trust & Comparison Strip */}
                <div className="border border-indigo-100 bg-indigo-50/60 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1">Why 500+ Indian Businesses Choose <AassayBizBrand />:</span>
                      <span className="text-[10px] text-slate-600">Replaces Vyapar, Tally, Zoho, and spreadsheets into one unified cloud app.</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-indigo-900">
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ₹0 Hidden Fees</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Mobile + PC</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Free Setup</span>
                  </div>
                </div>
              </div>

              {/* Bottom Footer Callout for Side A */}
              <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[11px] text-slate-500 font-semibold relative z-10">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1"><AassayBizBrand /> Promotional Handout</span>
                  <span>•</span>
                  <span>See Back for Pricing & Free Trial QR</span>
                </div>
                <div className="text-indigo-600 font-bold flex items-center gap-1">
                  Side A (Overview) <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </section>

            {/* ------------------------------------------------------------- */}
            {/* SIDE B: BACK / PACKAGES, PRICING, OFFER & DEMO QR */}
            {/* ------------------------------------------------------------- */}
            <section className="pamphlet-sheet bg-white text-slate-900 rounded-xl shadow-2xl p-8 flex flex-col justify-between border border-slate-200/80 relative overflow-hidden">
              {/* Background Accent */}
              <div className="absolute top-0 left-0 w-80 h-80 bg-gradient-to-br from-indigo-500/10 via-blue-500/10 to-transparent rounded-br-full pointer-events-none" />

              <div className="relative z-10">
                {/* Header Strip */}
                <div className="flex items-center justify-between border-b-2 border-indigo-600 pb-4 mb-5">
                  <div className="flex items-center gap-3">
                    <img src={logoImg} alt="Aassay Biz Logo" className="h-10 w-auto object-contain" />
                    <div>
                      <h2 className="text-lg font-black tracking-tight text-slate-900 leading-none">Transparent, Modular Pricing</h2>
                      <p className="text-[10px] font-bold text-indigo-600 uppercase mt-0.5">Pay Only For What Your Business Needs</p>
                    </div>
                  </div>
                  <Badge className="bg-indigo-600 text-white font-bold text-[10px] px-3 py-1">
                    Annual Billing: 20% Discount
                  </Badge>
                </div>

                {/* 3 Main Plans Row */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {/* Plan 1: Free */}
                  <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/60 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Starter</span>
                      <h3 className="text-sm font-black text-slate-900 mt-0.5">Free Plan</h3>
                      <div className="mt-2 mb-3">
                        <span className="text-2xl font-black text-slate-900">₹0</span>
                        <span className="text-[10px] text-slate-500"> / forever</span>
                      </div>
                      <ul className="space-y-1.5 text-[11px] text-slate-700">
                        <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Up to 5 invoices / mo</li>
                        <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Up to 5 clients & items</li>
                        <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Dynamic UPI QR Code</li>
                        <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Standard GST format</li>
                      </ul>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-200 text-center text-[10px] font-bold text-slate-500">
                      Best for micro businesses
                    </div>
                  </div>

                  {/* Business Accounting */}
                  <div className="border-2 border-slate-300 rounded-lg p-3.5 bg-white shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Core Billing</span>
                      <h3 className="text-sm font-black text-slate-900 mt-0.5">Business Accounting</h3>
                      <div className="mt-2 mb-3">
                        <span className="text-2xl font-black text-slate-900">₹599</span>
                        <span className="text-[10px] text-slate-500"> / mo</span>
                        <p className="text-[10px] font-bold text-emerald-600">₹5,999/yr (Save ₹1,189)</p>
                      </div>
                      <ul className="space-y-1.5 text-[11px] text-slate-700">
                        <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Everything in free plan</li>
                        <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Unlimited Invoice</li>
                        <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Unlimited Quotation & POS</li>
                        <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Inventory Management</li>
                        <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 500 WhatsApp messages</li>
                        <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> GST Ready Output</li>
                        <li className="flex items-center gap-1.5 text-indigo-700 font-semibold"><Users className="w-3.5 h-3.5 shrink-0" /> Platform access up to 3 employees</li>
                        <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> +₹99 / Extra platform employee</li>
                      </ul>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-200 text-center text-[10px] font-bold text-indigo-700">
                      Ideal for traders & shops
                    </div>
                  </div>

                  {/* Business Suite */}
                  <div className="border-2 border-indigo-600 rounded-lg p-3.5 bg-gradient-to-b from-indigo-50/80 to-white shadow-md flex flex-col justify-between relative">
                    <div className="absolute -top-2.5 right-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                      Flagship
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">All-In-One</span>
                      <h3 className="text-sm font-black text-slate-900 mt-0.5">Business Suite</h3>
                      <div className="mt-2 mb-3">
                        <span className="text-2xl font-black text-indigo-600">₹1,499</span>
                        <span className="text-[10px] text-slate-500"> / mo</span>
                        <p className="text-[10px] font-bold text-emerald-600">₹14,999/yr (Save ₹2,989)</p>
                      </div>
                      <ul className="space-y-1.5 text-[11px] text-slate-800 font-medium">
                        <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> Full Sales & Multi-Warehouse</li>
                        <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> Purchases, POs & Payables</li>
                        <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> Banking, Journal & P&L</li>
                        <li className="flex items-center gap-1.5 font-bold text-emerald-700"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Free CRM & Promotion Inc.</li>
                      </ul>
                    </div>
                    <div className="mt-3 pt-2 border-t border-indigo-100 text-center text-[10px] font-black text-indigo-900">
                      Most complete solution
                    </div>
                  </div>
                </div>

                {/* Modular Add-ons Strip */}
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 mb-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-2">
                    Need Specific Power Modules? Pick What You Need:
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div className="bg-white border border-slate-200 rounded p-2 text-center">
                      <span className="font-bold text-slate-800 block">Business HR</span>
                      <span className="text-indigo-600 font-extrabold text-xs">₹599/mo</span>
                      <span className="text-[10px] text-slate-500 block">10 Staff included (+₹49/extra)</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded p-2 text-center">
                      <span className="font-bold text-slate-800 block">Business CRM</span>
                      <span className="text-indigo-600 font-extrabold text-xs">₹599/mo</span>
                      <span className="text-[10px] text-slate-500 block">Leads, pipelines & follow-ups</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded p-2 text-center">
                      <span className="font-bold text-slate-800 block">Business Promotion</span>
                      <span className="text-indigo-600 font-extrabold text-xs">₹599/mo</span>
                      <span className="text-[10px] text-slate-500 block">Festival studio & WhatsApp</span>
                    </div>
                  </div>
                </div>

                {/* Special Launch Offer Banner */}
                <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-xl p-3.5 mb-5 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-6 h-6 text-amber-200 shrink-0" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wide">Special Onboarding Launch Offer:</h4>
                      <p className="text-[11px] text-amber-100 font-medium">
                        Get 20% OFF on all annual plans + Free 1-on-1 Data Import & Onboarding Support!
                      </p>
                    </div>
                  </div>
                  <span className="bg-white text-orange-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-md shadow-sm shrink-0">
                    Use Code: LAUNCH20
                  </span>
                </div>

                {/* Demo QR Code & Contact Details Box */}
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 bg-slate-50/80 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* QR Code Graphic Box */}
                    <div className="w-20 h-20 bg-white border-2 border-slate-900 rounded-lg p-1.5 flex flex-col items-center justify-center shadow-sm shrink-0">
                      <QrCode className="w-14 h-14 text-slate-900" />
                      <span className="text-[8px] font-black uppercase tracking-tighter text-indigo-700">Scan For Demo</span>
                    </div>
                    <div>
                      <span className="bg-indigo-100 text-indigo-700 font-bold text-[10px] px-2 py-0.5 rounded">Instant Access</span>
                      <h4 className="text-sm font-black text-slate-900 mt-1">Scan QR Code or Call Us For a Live Demo</h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Set up in 5 minutes with your GSTIN. No credit card required.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 text-right shrink-0 border-l border-slate-200 pl-4">
                    <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-slate-900">
                      <Phone className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{socials.contact_mobile || "+91 9876543210"}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 text-[11px] text-slate-600">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>support@aassaybiz.com</span>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 text-[11px] font-bold text-indigo-600">
                      <Globe className="w-3.5 h-3.5 text-indigo-500" />
                      <span>www.aassaybiz.com</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Footer Callout for Side B */}
              <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[11px] relative z-10">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-700">Official Social Handles:</span>
                  <div className="flex items-center gap-2">
                    <a href={youtubeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-slate-700 hover:text-red-600 font-medium">
                      <YoutubeIcon className="w-3.5 h-3.5 text-red-600" /> YouTube
                    </a>
                    <span>•</span>
                    <a href={facebookUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-slate-700 hover:text-blue-600 font-medium">
                      <FacebookIcon className="w-3.5 h-3.5 text-blue-600" /> Facebook
                    </a>
                    <span>•</span>
                    <a href={instagramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-slate-700 hover:text-pink-600 font-medium">
                      <InstagramIcon className="w-3.5 h-3.5 text-pink-600" /> Instagram
                    </a>
                  </div>
                </div>
                <div className="text-slate-500 font-semibold text-[10px] flex items-center gap-1">
                  Side B (Pricing & Contact) · © 2026 <AassayBizBrand className="text-[10px]" /> Technologies
                </div>
              </div>
            </section>
          </>
        )}

        {/* ========================================================================= */}
        {/* FORMAT 2: SINGLE-PAGE CONDENSED HANDOUT (A4) */}
        {/* ========================================================================= */}
        {pamphletFormat === "single" && (
          <section className="pamphlet-sheet bg-white text-slate-900 rounded-xl shadow-2xl p-8 flex flex-col justify-between border border-slate-200/80 relative overflow-hidden">
            {/* Top Header */}
            <div>
              <div className="flex items-center justify-between border-b-2 border-indigo-600 pb-3 mb-4">
                <div className="flex items-center gap-3">
                  <img src={logoImg} alt="Aassay Biz Logo" className="h-11 w-auto object-contain" />
                  <div>
                    <AassayBizBrand className="text-xl leading-none" />
                    <p className="text-[10px] font-bold tracking-wider text-indigo-600 uppercase mt-0.5">Enterprise Business Operating System</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> 100% GST Ready
                  </span>
                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    Cloud + Mobile App
                  </span>
                </div>
              </div>

              {/* Condensed Hero Headline */}
              <div className="bg-slate-900 text-white rounded-lg p-4 mb-4">
                <h2 className="text-lg font-black tracking-tight leading-snug">
                  Smart Invoicing, Inventory, Banking & Staff HR in One Powerful Software.
                </h2>
                <p className="text-slate-300 text-[11px] mt-1">
                  Replaces multiple expensive subscriptions with one unified, intuitive platform designed specifically for Indian SMEs.
                </p>
              </div>

              {/* 4 Feature Columns Strip */}
              <div className="grid grid-cols-4 gap-2.5 mb-4 text-center">
                <div className="p-2.5 border border-slate-200 rounded-lg bg-slate-50">
                  <div className="w-7 h-7 mx-auto rounded bg-indigo-100 text-indigo-700 flex items-center justify-center mb-1.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h4 className="text-[11px] font-bold text-slate-900">GST Invoicing</h4>
                  <p className="text-[9px] text-slate-500 mt-0.5">30s invoices & dynamic UPI QR</p>
                </div>
                <div className="p-2.5 border border-slate-200 rounded-lg bg-slate-50">
                  <div className="w-7 h-7 mx-auto rounded bg-blue-100 text-blue-700 flex items-center justify-center mb-1.5">
                    <Package className="w-4 h-4" />
                  </div>
                  <h4 className="text-[11px] font-bold text-slate-900">Live Inventory</h4>
                  <p className="text-[9px] text-slate-500 mt-0.5">Multi-godown & low stock alerts</p>
                </div>
                <div className="p-2.5 border border-slate-200 rounded-lg bg-slate-50">
                  <div className="w-7 h-7 mx-auto rounded bg-purple-100 text-purple-700 flex items-center justify-center mb-1.5">
                    <Users className="w-4 h-4" />
                  </div>
                  <h4 className="text-[11px] font-bold text-slate-900">Biometric HR</h4>
                  <p className="text-[9px] text-slate-500 mt-0.5">Selfie punches & payslips</p>
                </div>
                <div className="p-2.5 border border-slate-200 rounded-lg bg-slate-50">
                  <div className="w-7 h-7 mx-auto rounded bg-rose-100 text-rose-700 flex items-center justify-center mb-1.5">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-[11px] font-bold text-slate-900">Promotion</h4>
                  <p className="text-[9px] text-slate-500 mt-0.5">Branded festival posters</p>
                </div>
              </div>

              {/* Condensed Plans Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
                <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">Updated Package Pricing:</span>
                  <span className="text-[10px] font-bold text-emerald-700">Save 20% on Annual Plans</span>
                </div>
                <div className="divide-y divide-slate-100 text-[11px]">
                  <div className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <span className="font-bold text-slate-900">Free Plan</span>
                      <span className="text-slate-500 text-[10px] ml-2">Up to 5 invoices/mo, 5 clients, dynamic UPI QR</span>
                    </div>
                    <span className="font-black text-slate-900">₹0 / mo</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between hover:bg-slate-50 bg-indigo-50/30">
                    <div>
                      <span className="font-bold text-slate-900">Business Accounting</span>
                      <span className="text-slate-500 text-[10px] ml-2">Unlimited Invoices, Challans, Multi-Warehouse, Barcode</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900">₹599 / mo</span>
                      <span className="text-[9px] text-emerald-600 block font-bold">₹5,999/yr</span>
                    </div>
                  </div>
                  <div className="p-2.5 flex items-center justify-between bg-indigo-50/70 border-l-4 border-indigo-600">
                    <div>
                      <span className="font-black text-indigo-900">Business Suite (Flagship)</span>
                      <span className="text-slate-600 text-[10px] ml-2">Sales + Inventory + Banking + Purchases + Free CRM & Promotion</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-indigo-700 text-xs">₹1,499 / mo</span>
                      <span className="text-[9px] text-emerald-600 block font-bold">₹14,999/yr</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Add-ons mini strip */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-4 flex items-center justify-between text-[10px]">
                <span className="font-bold text-slate-700">Modular Add-ons:</span>
                <span className="text-slate-600"><strong>Business HR:</strong> ₹599/mo (10 staff)</span>
                <span>•</span>
                <span className="text-slate-600"><strong>Business CRM:</strong> ₹599/mo</span>
                <span>•</span>
                <span className="text-slate-600"><strong>Business Promotion:</strong> ₹599/mo</span>
              </div>
            </div>

            {/* Bottom Demo & Contacts */}
            <div>
              <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-white border border-slate-900 rounded p-1 flex items-center justify-center shrink-0">
                    <QrCode className="w-11 h-11 text-slate-900" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Scan QR Code to Start 14-Day Free Trial</h4>
                    <p className="text-[10px] text-slate-600">No credit card required. Full access to all features.</p>
                    <p className="text-[10px] font-bold text-indigo-600 mt-0.5">Use Code: LAUNCH20 for 20% OFF</p>
                  </div>
                </div>
                <div className="text-right text-[11px] border-l border-slate-200 pl-3">
                  <p className="font-bold text-slate-900 flex items-center justify-end gap-1">
                    <Phone className="w-3 h-3 text-indigo-600" /> {socials.contact_mobile || "+91 9876543210"}
                  </p>
                  <p className="text-slate-600 text-[10px]">support@aassaybiz.com</p>
                  <p className="font-semibold text-indigo-600 text-[10px]">www.aassaybiz.com</p>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Connect:</span>
                  <span className="text-red-600 font-bold">YouTube @assaybiz</span>
                  <span>•</span>
                  <span className="text-blue-600 font-bold">Facebook @assaybiz</span>
                  <span>•</span>
                  <span className="text-pink-600 font-bold">Instagram @assaybiz</span>
                </div>
                <span className="flex items-center gap-1"><AassayBizBrand className="text-[10px]" /> Enterprise Suite · Single Sheet Edition</span>
              </div>
            </div>
          </section>
        )}

      </div>
      )}
    </div>
  );
}
