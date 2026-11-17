import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Zap,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  Store,
  Building2,
  Briefcase,
  SlidersHorizontal,
  FileText,
  Users,
  QrCode,
  BellRing,
  Check,
  X,
  Gauge,
  Percent,
  IndianRupee,
} from "lucide-react";

interface BusinessPreset {
  id: string;
  name: string;
  icon: React.ElementType;
  tagline: string;
  monthlyInvoices: number;
  teamSize: number;
  baseHoursSaved: number;
  cashFlowSpeedup: string;
  sampleCustomer: string;
}

const BUSINESS_PRESETS: BusinessPreset[] = [
  {
    id: "retail",
    name: "Retail & Trader",
    icon: Store,
    tagline: "Shops, Showrooms & Distribution Counters",
    monthlyInvoices: 350,
    teamSize: 6,
    baseHoursSaved: 38,
    cashFlowSpeedup: "2.4x",
    sampleCustomer: "Daily counter sales, barcode stock & UPI payments",
  },
  {
    id: "wholesale",
    name: "Wholesale & Stockist",
    icon: Building2,
    tagline: "Multi-Godown Inventory & Bulk B2B Billing",
    monthlyInvoices: 800,
    teamSize: 14,
    baseHoursSaved: 62,
    cashFlowSpeedup: "2.8x",
    sampleCustomer: "Party ledgers, credit limits & bulk WhatsApp dispatches",
  },
  {
    id: "services",
    name: "Services & Agencies",
    icon: Briefcase,
    tagline: "Consulting, IT, Logistics & Professional Firms",
    monthlyInvoices: 180,
    teamSize: 10,
    baseHoursSaved: 46,
    cashFlowSpeedup: "2.1x",
    sampleCustomer: "Client quotations, staff payroll & monthly travel claims",
  },
];

interface FeatureToggle {
  id: string;
  title: string;
  subtitle: string;
  impactScore: number;
  hoursAdded: number;
  icon: React.ElementType;
}

const FEATURE_TOGGLES: FeatureToggle[] = [
  {
    id: "whatsapp_upi",
    title: "1-Tap WhatsApp Invoicing with UPI QR",
    subtitle: "Customers pay directly on PhonePe / GPay / Paytm without login",
    impactScore: 25,
    hoursAdded: 16,
    icon: QrCode,
  },
  {
    id: "gps_attendance",
    title: "Selfie + GPS Geofenced Attendance",
    subtitle: "Zero hardware cost; accurate work hours & automated payroll",
    impactScore: 22,
    hoursAdded: 14,
    icon: Users,
  },
  {
    id: "auto_reminders",
    title: "Automated Overdue Payment Reminders",
    subtitle: "Gentle WhatsApp reminders sent automatically before due date",
    impactScore: 24,
    hoursAdded: 12,
    icon: BellRing,
  },
  {
    id: "auto_gst",
    title: "Auto-Calculated GST & Party Ledgers",
    subtitle: "Instant GSTR-1 / GSTR-3B Excel & JSON ready for your CA",
    impactScore: 25,
    hoursAdded: 18,
    icon: FileText,
  },
];

export function LandingInteractiveShowcase() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("retail");
  const [enabledFeatures, setEnabledFeatures] = useState<Record<string, boolean>>({
    whatsapp_upi: true,
    gps_attendance: true,
    auto_reminders: true,
    auto_gst: true,
  });

  const currentPreset =
    BUSINESS_PRESETS.find((p) => p.id === selectedPresetId) || BUSINESS_PRESETS[0];

  const toggleFeature = (id: string) => {
    setEnabledFeatures((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Compute live interactive efficiency and time savings
  const activeCount = Object.values(enabledFeatures).filter(Boolean).length;
  const totalScore = FEATURE_TOGGLES.reduce((acc, feat) => {
    return acc + (enabledFeatures[feat.id] ? feat.impactScore : 0);
  }, 0);
  const efficiencyScore = Math.min(99, Math.max(35, totalScore));

  const totalHoursSaved = Math.round(currentPreset.baseHoursSaved * (efficiencyScore / 100));

  return (
    <section className="py-8 sm:py-10 bg-gradient-to-b from-[#120a33] via-[#1a0f44] to-[#120a33] text-white relative overflow-hidden border-t border-b border-white/10 shadow-2xl">
      {/* Dynamic ambient lighting accents */}
      <div className="absolute top-0 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-[#e77817]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 translate-y-1/2 w-[450px] h-[450px] bg-[#6366f1]/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header (Compact & Clean - Badge Removed) */}
        <div className="text-center max-w-3xl mx-auto mb-5 sm:mb-6">
          <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-black tracking-tight text-white leading-tight mb-2">
            See how much time & money{" "}
            <span className="bg-gradient-to-r from-[#ffaa47] via-[#ff8522] to-[#e77817] bg-clip-text text-transparent">
              Aassay Biz saves your business
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Choose your business type and toggle our core automation engines to see your live efficiency score and time savings in action.
          </p>
        </div>

        {/* 1. Business Type Selector (Compact Segmented Switcher) */}
        <div className="max-w-xl mx-auto mb-5 p-1 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md flex flex-col sm:flex-row gap-1 shadow-inner">
          {BUSINESS_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isSelected = preset.id === selectedPresetId;
            return (
              <button
                key={preset.id}
                onClick={() => setSelectedPresetId(preset.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-gradient-to-r from-[#e77817] to-[#ff9438] text-white shadow-md shadow-orange-500/30 scale-[1.01]"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{preset.name}</span>
              </button>
            );
          })}
        </div>

        {/* 2. Unified Interactive Experience Card (Compact 2-Column Dashboard) */}
        <div className="rounded-2xl sm:rounded-3xl bg-white/[0.06] border border-white/15 backdrop-blur-xl shadow-2xl p-4 sm:p-5 lg:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-center">
            
            {/* Left Column: Interactive Automation Switches (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-wider">
                    Toggle Automation Engines:
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  {activeCount} of {FEATURE_TOGGLES.length} Active
                </span>
              </div>

              {/* Toggles List (Compact Spacing) */}
              <div className="space-y-2">
                {FEATURE_TOGGLES.map((feat) => {
                  const isEnabled = !!enabledFeatures[feat.id];
                  const Icon = feat.icon;
                  return (
                    <div
                      key={feat.id}
                      onClick={() => toggleFeature(feat.id)}
                      className={`p-2.5 sm:p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 group ${
                        isEnabled
                          ? "bg-white/10 border-amber-400/50 shadow-sm shadow-orange-500/10"
                          : "bg-white/5 border-white/10 hover:border-white/20 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isEnabled
                              ? "bg-gradient-to-br from-[#e77817] to-[#ff9438] text-white shadow-sm"
                              : "bg-white/10 text-slate-400"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-200 transition-colors">
                            {feat.title}
                          </div>
                          <div className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
                            {feat.subtitle}
                          </div>
                        </div>
                      </div>

                      {/* Interactive iOS-style Toggle Pill */}
                      <div
                        className={`w-10 h-5.5 rounded-full transition-colors flex items-center p-0.5 shrink-0 ${
                          isEnabled ? "bg-[#e77817] justify-end" : "bg-white/20 justify-start"
                        }`}
                      >
                        <div className="w-4.5 h-4.5 rounded-full bg-white shadow-sm flex items-center justify-center">
                          {isEnabled ? (
                            <Check className="w-2.5 h-2.5 text-[#e77817] stroke-[3]" />
                          ) : (
                            <X className="w-2.5 h-2.5 text-slate-400 stroke-[3]" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Preset Note */}
              <div className="text-[11px] text-slate-400 pt-0.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  Tailored for {currentPreset.name}: {currentPreset.sampleCustomer}
                </span>
              </div>
            </div>

            {/* Right Column: Live Calculated Business Impact Card (5 cols) */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-gradient-to-br from-[#1b0f47] via-[#24135e] to-[#160c38] border border-white/20 p-4 sm:p-5 shadow-2xl relative overflow-hidden">
                
                {/* Background soft glow */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#ff8522]/25 rounded-full blur-2xl pointer-events-none" />

                {/* Score Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 relative z-10">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Efficiency Score
                    </span>
                  </div>
                  <div className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-mono text-xs font-black">
                    {efficiencyScore}% Optimized
                  </div>
                </div>

                {/* Main Dynamic Metric Callouts (2-Column Compact Grid) */}
                <div className="grid grid-cols-2 gap-2.5 mb-3 relative z-10">
                  {/* Metric 1: Monthly Hours Saved */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-slate-300 font-medium">Time Saved</span>
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                        ~{totalHoursSaved}h/mo
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        ~1.5 workdays / wk
                      </div>
                    </div>
                  </div>

                  {/* Metric 2: Faster Cash Inflow */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-slate-300 font-medium">Cash Inflow</span>
                      <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                        {enabledFeatures.whatsapp_upi ? currentPreset.cashFlowSpeedup : "1.0x"} Faster
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        1-Click UPI QR
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audit & Compliance Trust Points */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-3 pt-2 border-t border-white/10 text-[11px] text-slate-300 relative z-10">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Zero manual Excel ledger errors</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>100% GST & Audit ready</span>
                  </div>
                </div>

                {/* Direct Action CTA Buttons - 100% Visible & Prominent Side-by-Side */}
                <div className="flex flex-col sm:flex-row gap-2.5 relative z-10">
                  <Link
                    to="/book-demo"
                    className="flex-1 h-11 bg-gradient-to-r from-[#e77817] to-[#ff8522] hover:from-[#d46a0f] hover:to-[#ea7617] text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01] active:scale-[0.99] text-center"
                  >
                    <span>Book Free Live Demo</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </Link>

                  <Link
                    to="/pricing"
                    className="flex-1 h-11 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center transition-all text-center"
                  >
                    <span>Explore Plans & Pricing</span>
                  </Link>
                </div>

              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
