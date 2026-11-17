import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
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

  const additionalHours = FEATURE_TOGGLES.reduce((acc, feat) => {
    return acc + (enabledFeatures[feat.id] ? feat.hoursAdded : 0);
  }, 0);
  const totalHoursSaved = Math.round(currentPreset.baseHoursSaved * (efficiencyScore / 100));

  return (
    <section className="py-18 sm:py-22 bg-gradient-to-b from-[#120a33] via-[#1a0f44] to-[#120a33] text-white relative overflow-hidden border-t border-b border-white/10 shadow-2xl">
      {/* Dynamic ambient lighting accents */}
      <div className="absolute top-0 left-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-[#e77817]/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 translate-y-1/2 w-[550px] h-[550px] bg-[#6366f1]/20 rounded-full blur-[140px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-amber-300 uppercase tracking-widest mb-3.5 shadow-sm backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Interactive Business Simulator
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black tracking-tight text-white leading-tight mb-3.5">
            See how much time & money{" "}
            <span className="bg-gradient-to-r from-[#ffaa47] via-[#ff8522] to-[#e77817] bg-clip-text text-transparent">
              Aassay Biz saves your business
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
            Choose your business type and toggle our core automation engines to see your live efficiency score and time savings in action.
          </p>
        </div>

        {/* 1. Business Type Selector (Single Line Cohesive Segmented Switcher) */}
        <div className="max-w-2xl mx-auto mb-8 sm:mb-10 p-1.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md flex flex-col sm:flex-row gap-1.5 shadow-inner">
          {BUSINESS_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isSelected = preset.id === selectedPresetId;
            return (
              <button
                key={preset.id}
                onClick={() => setSelectedPresetId(preset.id)}
                className={`flex-1 flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? "bg-gradient-to-r from-[#e77817] to-[#ff9438] text-white shadow-md shadow-orange-500/30 scale-[1.01]"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{preset.name}</span>
              </button>
            );
          })}
        </div>

        {/* 2. Unified Interactive Experience Card (Single Cohesive 2-Column Dashboard) */}
        <div className="rounded-3xl bg-white/[0.06] border border-white/15 backdrop-blur-xl shadow-2xl p-6 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            
            {/* Left Column: Interactive Automation Switches (6 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                  <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                    Toggle Automation Engines:
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {activeCount} of {FEATURE_TOGGLES.length} Active
                </span>
              </div>

              {/* Toggles List */}
              <div className="space-y-3">
                {FEATURE_TOGGLES.map((feat) => {
                  const isEnabled = !!enabledFeatures[feat.id];
                  const Icon = feat.icon;
                  return (
                    <div
                      key={feat.id}
                      onClick={() => toggleFeature(feat.id)}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center justify-between gap-3 group ${
                        isEnabled
                          ? "bg-white/10 border-amber-400/50 shadow-md shadow-orange-500/10"
                          : "bg-white/5 border-white/10 hover:border-white/20 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3 sm:gap-3.5">
                        <div
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isEnabled
                              ? "bg-gradient-to-br from-[#e77817] to-[#ff9438] text-white shadow-sm"
                              : "bg-white/10 text-slate-400"
                          }`}
                        >
                          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-200 transition-colors">
                            {feat.title}
                          </div>
                          <div className="text-[11px] sm:text-xs text-slate-300 mt-0.5 line-clamp-1">
                            {feat.subtitle}
                          </div>
                        </div>
                      </div>

                      {/* Interactive iOS-style Toggle Pill */}
                      <div
                        className={`w-11 h-6 rounded-full transition-colors flex items-center p-0.5 shrink-0 ${
                          isEnabled ? "bg-[#e77817] justify-end" : "bg-white/20 justify-start"
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center">
                          {isEnabled ? (
                            <Check className="w-3 h-3 text-[#e77817] stroke-[3]" />
                          ) : (
                            <X className="w-3 h-3 text-slate-400 stroke-[3]" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Preset Note */}
              <div className="text-xs text-slate-400 pt-1 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Tailored for {currentPreset.name}: {currentPreset.sampleCustomer}
                </span>
              </div>
            </div>

            {/* Right Column: Live Calculated Business Impact Card (5 cols) */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-gradient-to-br from-[#1b0f47] via-[#24135e] to-[#160c38] border border-white/20 p-6 sm:p-7 shadow-2xl relative overflow-hidden">
                
                {/* Background soft glow */}
                <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#ff8522]/30 rounded-full blur-2xl pointer-events-none" />

                {/* Score Header */}
                <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/10 relative z-10">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Business Efficiency Score
                    </span>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-mono text-xs font-black">
                    {efficiencyScore}% Optimized
                  </div>
                </div>

                {/* Main Dynamic Metric Callouts */}
                <div className="space-y-4 mb-6 relative z-10">
                  {/* Metric 1: Monthly Hours Saved */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-300">Time Saved Every Month</div>
                      <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono mt-0.5">
                        ~{totalHoursSaved} Hours
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Free up 1.5 workdays every single week
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                      <Clock className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Metric 2: Faster Cash Inflow */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-300">Payment Collection Speed</div>
                      <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono mt-0.5">
                        {enabledFeatures.whatsapp_upi ? currentPreset.cashFlowSpeedup : "1.0x"} Faster
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Customers pay instantly via 1-click UPI QR
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Audit & Compliance Trust Points */}
                <div className="space-y-2 mb-6 pt-2 border-t border-white/10 text-xs text-slate-300 relative z-10">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Zero manual Excel data entry & ledger errors</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>100% GST & Statutory Audit compliance ready</span>
                  </div>
                </div>

                {/* Direct Action CTA Buttons */}
                <div className="flex flex-col gap-2.5 relative z-10">
                  <Button
                    size="lg"
                    className="w-full h-12 bg-gradient-to-r from-[#e77817] to-[#ff8522] hover:from-[#d46a0f] hover:to-[#ea7617] text-white font-black text-sm rounded-xl shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
                    asChild
                  >
                    <Link to="/book-demo">
                      <span>Experience Free Live Online Demo</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-10 border-white/20 text-white hover:bg-white/10 text-xs font-semibold rounded-xl cursor-pointer"
                    asChild
                  >
                    <Link to="/pricing">Explore Pricing & Plans</Link>
                  </Button>
                </div>

              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
