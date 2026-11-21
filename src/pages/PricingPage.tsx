import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check, X, Zap, Shield, Smartphone, FileText, IndianRupee,
  MessageCircle, Star, ArrowRight, Sparkles, BarChart3, Package, Boxes, ClipboardList,
  Globe, PlayCircle, ShieldCheck, Building2, Quote, Timer, Users, Layers,
  Calculator, UserCheck, Megaphone, BrainCircuit, Link2,
  Gift, Crown, Bell, Target, MessageSquare, Clock,
  Plus, Minus, Bot, CheckSquare, Receipt,
} from "lucide-react";
import { usePlatformPricing } from "@/lib/platform-pricing";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { BookDemoDialog } from "@/components/public/BookDemoDialog";
import { AIChatWidget } from "@/components/public/AIChatWidget";
import { useToast } from "@/hooks/use-toast";

type Lang = "en" | "hi";

export default function PricingPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("satah-lang") as Lang) || "en");
  const [allowFreePlan, setAllowFreePlan] = useState(true);
  const [dbPlans, setDbPlans] = useState<any[]>([]);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [hrExtra, setHrExtra] = useState(0);
  const [crmExtra, setCrmExtra] = useState(0);
  const [taskExtra, setTaskExtra] = useState(0);
  const [expenseExtra, setExpenseExtra] = useState(0);
  const { pricing } = usePlatformPricing();
  const [isDemoDialogOpen, setIsDemoDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    supabase.from("platform_settings").select("*").in("key", ["allow_free_plan"]).then(({ data }) => {
      if (data) {
        const freePlan = data.find(d => d.key === "allow_free_plan");
        if (freePlan && freePlan.value === "false") setAllowFreePlan(false);
      }
    });

    supabase.from("plans").select("*").eq("is_active", true).order("sort_order").then(({ data }) => {
      if (data) {
        const seen = new Set<string>();
        const deduped = data.filter((p: any) => {
          if (p.name.startsWith("plan_")) return false;
          if (seen.has(p.name)) return false;
          seen.add(p.name);
          return true;
        });
        setDbPlans(deduped);
      }
    });
  }, []);

  const getPlanPrice = (baseMo: number, baseYr: number, hasHrAddon = false, hasCrmAddon = false, isHrOrSuite = false) => {
    const hrAddon = hasHrAddon ? hrExtra * (pricing.hrExtraEmployeePrice || 49) : 0;
    const crmAddon = hasCrmAddon ? crmExtra * (pricing.crmExtraMemberPrice || 99) : 0;
    const totalMo = baseMo + hrAddon + crmAddon;

    const hrAddonYr = hasHrAddon ? hrExtra * (pricing.hrExtraEmployeePrice || 49) * 12 : 0;
    const crmAddonYr = hasCrmAddon ? crmExtra * (pricing.crmExtraMemberPrice || 99) * 12 : 0;
    const totalYr = baseYr + hrAddonYr + crmAddonYr;

    if (billingCycle === "yearly") {
      const monthlyEquiv = Math.floor(totalYr / 12);
      return monthlyEquiv.toLocaleString("en-IN");
    }
    return totalMo.toLocaleString("en-IN");
  };

  const getPlanYearlyTotal = (baseYr: number, hasHrAddon = false, hasCrmAddon = false, isHrOrSuite = false) => {
    const hrAddonYr = hasHrAddon ? hrExtra * (pricing.hrExtraEmployeePrice || 49) * 12 : 0;
    const crmAddonYr = hasCrmAddon ? crmExtra * (pricing.crmExtraMemberPrice || 99) * 12 : 0;
    const totalYr = baseYr + hrAddonYr + crmAddonYr;
    return totalYr.toLocaleString("en-IN");
  };

  const togglePlan = (planName: string) => {
    setSelectedPlans(prev => 
      prev.includes(planName) ? prev.filter(n => n !== planName) : [...prev, planName]
    );
  };

  const isYearly = billingCycle === "yearly";
  const finalSelected = new Set(selectedPlans);

  let totalAmount = 0;
  if (finalSelected.has("suite")) {
    totalAmount = isYearly ? 20388 : 1999;
    if (crmExtra > 0) {
      totalAmount += crmExtra * (isYearly ? (pricing.crmExtraMemberPrice || 99) * 12 : (pricing.crmExtraMemberPrice || 99));
    }
  } else {
    if (finalSelected.has("accounting")) totalAmount += isYearly ? 5988 : 599;
    if (finalSelected.has("hr")) {
      totalAmount += isYearly ? 5988 : 599;
      if (hrExtra > 0) {
        totalAmount += hrExtra * (isYearly ? (pricing.hrExtraEmployeePrice || 49) * 12 : (pricing.hrExtraEmployeePrice || 49));
      }
    }
    if (finalSelected.has("crm")) {
      totalAmount += isYearly ? 5988 : 599;
      if (crmExtra > 0) {
        totalAmount += crmExtra * (isYearly ? (pricing.crmExtraMemberPrice || 99) * 12 : (pricing.crmExtraMemberPrice || 99));
      }
    }
    if (finalSelected.has("promotion")) totalAmount += isYearly ? 5988 : 599;
  }

  // Add Task Management & Expense Management Add-ons
  if (taskExtra > 0) {
    totalAmount += taskExtra * (isYearly ? (pricing.taskPriceYearly || pricing.taskPriceMonthly * 12) : pricing.taskPriceMonthly);
  }
  if (expenseExtra > 0) {
    totalAmount += expenseExtra * (isYearly ? (pricing.expensePriceYearly || pricing.expensePriceMonthly * 12) : pricing.expensePriceMonthly);
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-primary/30 selection:text-navy flex flex-col justify-between">
      {/* Header */}
      <PublicHeader />

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Banner Header */}
        <div className="bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#fafbfc] pt-12 pb-8 border-b border-slate-200/70">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-3">
              Simple, Transparent & Modular Pricing
            </h1>
            <p className="text-sm sm:text-base text-slate-500 max-w-2xl mx-auto">
              Select one or more plans for your business. Mix and match exactly what you need with zero hidden charges.
            </p>

            {/* Monthly / Yearly Billing Toggle */}
            <div className="mt-8 inline-flex items-center p-1.5 rounded-full bg-slate-100 border border-slate-200/80 shadow-inner">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 ${
                  billingCycle === "monthly"
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 ${
                  billingCycle === "yearly"
                    ? "bg-[#e77817] text-white shadow-md shadow-orange-500/25"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Yearly Billing</span>
                <span className={`text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full transition-colors ${
                  billingCycle === "yearly" ? "bg-white text-[#e77817]" : "bg-emerald-600 text-white"
                }`}>
                  Save up to 17%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <section id="pricing" className="py-12 bg-[#fafbfc] relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* 1. TOP BANNER: Free Plan */}
            {allowFreePlan && (
              <div
                onClick={() => togglePlan("free")}
                className={`mb-6 rounded-2xl bg-white border p-5 sm:p-6 transition-all duration-200 cursor-pointer shadow-xs ${
                  selectedPlans.includes("free")
                    ? "border-[#e77817] ring-2 ring-[#e77817]/20 shadow-md"
                    : "border-orange-200/90 hover:border-orange-300"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Left: Icon & Description */}
                  <div className="flex items-start gap-4 lg:w-[32%]">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-[#e77817] flex items-center justify-center text-white shrink-0 shadow-md shadow-orange-500/25">
                      <Gift className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Free Plan</h3>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                          Free for 6 Months
                        </span>
                        {selectedPlans.includes("free") && (
                          <span className="text-xs font-bold text-[#e77817] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">Selected</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-snug">
                        Basic invoicing & business features — 100% Free for 6 Months
                      </p>
                    </div>
                  </div>

                  {/* Middle: 2 Columns of Features */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 lg:border-l lg:border-slate-200 lg:pl-8 text-xs sm:text-[13px] flex-1">
                    <div className="flex items-center gap-2.5 text-slate-700 font-medium">
                      <div className="w-4 h-4 rounded-full bg-[#28166f] text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>100 Invoices Free</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-700 font-medium">
                      <div className="w-4 h-4 rounded-full bg-[#28166f] text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Festive Posts</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-700 font-medium">
                      <div className="w-4 h-4 rounded-full bg-[#28166f] text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>3 Employee Attendance</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-700 font-medium">
                      <div className="w-4 h-4 rounded-full bg-[#28166f] text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Up to 50 Leads</span>
                    </div>
                  </div>

                  {/* Right: Solid Action Button */}
                  <div className="flex items-center justify-end lg:border-l lg:border-slate-200 lg:pl-8">
                    <Link
                      to={`/register?plan=free&billing=${billingCycle}`}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-[#e77817] hover:bg-[#d46a0f] text-white font-bold px-6 py-3 rounded-xl shadow-md shadow-orange-500/25 flex items-center gap-2 transition-all duration-200 text-sm whitespace-nowrap"
                    >
                      <span>Get Started</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* 2. MIDDLE 6 CARDS (3x2 GRID) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {/* Card 1: Business Accounting */}
              {(() => {
                const isSelected = finalSelected.has("accounting");
                return (
                  <div
                    onClick={() => togglePlan("accounting")}
                    className={`rounded-2xl border bg-white p-6 shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between relative ${
                      isSelected
                        ? "border-[#e77817] ring-2 ring-[#e77817]/20 shadow-md"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      {/* Checkbox at top-left */}
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          isSelected ? "bg-[#e77817] border-[#e77817] text-white" : "border-slate-300 bg-white"
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>

                      {/* Header */}
                      <div className="flex items-start gap-3.5 mb-5">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-[#28166f] shadow-2xs">
                          <Calculator className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-slate-900 leading-snug">Business Accounting</h4>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            Full billing, sales, purchases & inventory management
                          </p>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mb-5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-slate-900">{`₹${getPlanPrice(599, 5988)}`}</span>
                          <span className="text-xs text-slate-500 font-semibold">/month</span>
                        </div>
                        {isYearly ? (
                          <div className="mt-1 flex flex-col gap-1">
                            <span className="text-xs font-semibold text-slate-500">
                              Billed annually at ₹{getPlanYearlyTotal(5988)}/year upfront
                            </span>
                            <span className="inline-block w-fit text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                              Save 17% (Pay upfront)
                            </span>
                          </div>
                        ) : (
                          <div className="mt-1.5 inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                            Save 17% yearly
                          </div>
                        )}
                      </div>

                      {/* Features */}
                      <div className="space-y-2.5 mb-6 text-xs sm:text-[13px] text-slate-600 font-medium">
                        <div className="flex items-center gap-2.5 font-semibold text-[#28166f]">
                          <Check className="w-4 h-4 text-[#e77817] shrink-0 stroke-[2.5]" />
                          <span>Everything in Free Plan</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                          <span>Unlimited Invoices</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                          <span>Unlimited Quotation & POS</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                          <span>Inventory Management</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                          <span>500 WhatsApp messages</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                          <span>GST Ready Output</span>
                        </div>
                        
                        <div className="flex items-center gap-2.5 text-slate-700 font-semibold pt-1">
                          <Users className="w-4 h-4 text-[#e77817] shrink-0" />
                          <span>Platform access up to 3 employees</span>
                        </div>

                      </div>
                    </div>

                    {/* Button */}
                    <div className="mt-auto pt-2 flex justify-end">
                      <Link
                        to={`/register?plan=accounting&billing=${billingCycle}`}
                        onClick={(e) => e.stopPropagation()}
                        className="border border-[#e77817] text-[#e77817] hover:bg-[#e77817] hover:text-white font-bold text-xs rounded-xl px-4 py-2 flex items-center gap-1 transition-all duration-200 shadow-2xs"
                      >
                        <span>Get Started</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })()}

              {/* Card 2: Business HR */}
              {(() => {
                const isSelected = finalSelected.has("hr");
                return (
                  <div
                    onClick={() => togglePlan("hr")}
                    className={`rounded-2xl border bg-white p-6 shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between relative ${
                      isSelected
                        ? "border-[#e77817] ring-2 ring-[#e77817]/20 shadow-md"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      {/* Checkbox at top-left */}
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          isSelected ? "bg-[#e77817] border-[#e77817] text-white" : "border-slate-300 bg-white"
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>

                      {/* Header */}
                      <div className="flex items-start gap-3.5 mb-5">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-[#e77817] shadow-2xs">
                          <Users className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-slate-900 leading-snug">Business HR</h4>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            Complete HR solution — attendance, payroll, leaves & shifts
                          </p>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mb-5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-slate-900">{`₹${getPlanPrice(599, 5988, true, false, true)}`}</span>
                          <span className="text-xs text-slate-500 font-semibold">/month</span>
                        </div>
                        {isYearly ? (
                          <div className="mt-1 flex flex-col gap-1">
                            <span className="text-xs font-semibold text-slate-500">
                              Billed annually at ₹{getPlanYearlyTotal(5988, true)}/year upfront
                            </span>
                            <span className="inline-block w-fit text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                              Save 17% (Pay upfront)
                            </span>
                          </div>
                        ) : (
                          <div className="mt-1.5 inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                            Save 17% yearly
                          </div>
                        )}
                      </div>

                      {/* Features */}
                      <div className="space-y-2.5 mb-6 text-xs sm:text-[13px] text-slate-600 font-medium">
                        <div className="flex items-center gap-2.5 font-semibold text-[#28166f]">
                          <Check className="w-4 h-4 text-[#e77817] shrink-0 stroke-[2.5]" />
                          <span>Everything in Free Plan</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                          <span>10 Employee Attendance</span>
                        </div>
                        
                        <div className="flex items-center justify-between w-full bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50 mt-1" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                             <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                             <span className="text-slate-700 font-semibold">
                               + Extra Employee (₹{pricing.hrExtraEmployeePrice || 49}/mo)
                             </span>
                          </div>
                          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-md px-1.5 py-1 shadow-sm">
                            <button onClick={(e) => { e.stopPropagation(); setHrExtra(Math.max(0, hrExtra - 1)); }} className="text-slate-400 hover:text-slate-700 transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                            <span className="font-bold text-sm w-5 text-center text-slate-800">{hrExtra}</span>
                            <button onClick={(e) => { e.stopPropagation(); setHrExtra(hrExtra + 1); }} className="text-slate-400 hover:text-slate-700 transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                          <span>Attendance & Payroll</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                          <span>Shifts & Leaves</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                          <span>500 WhatsApp messages</span>
                        </div>
                        
                        <div className="flex items-center gap-2.5 text-slate-700 font-semibold pt-1">
                          <Users className="w-4 h-4 text-[#e77817] shrink-0" />
                          <span>Platform access up to 3 employees</span>
                        </div>

                      </div>
                    </div>

                    {/* Button */}
                    <div className="mt-auto pt-2 flex justify-end">
                      <Link
                        to={`/register?plan=hr&billing=${billingCycle}${hrExtra > 0 ? `&hr=${hrExtra}` : ''}`}
                        onClick={(e) => e.stopPropagation()}
                        className="border border-[#e77817] text-[#e77817] hover:bg-[#e77817] hover:text-white font-bold text-xs rounded-xl px-4 py-2 flex items-center gap-1 transition-all duration-200 shadow-2xs"
                      >
                        <span>Get Started</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })()}

              {/* Card 3: Business CRM */}
              {(() => {
                const isSelected = finalSelected.has("crm");
                return (
                  <div
                    onClick={() => togglePlan("crm")}
                    className={`rounded-2xl border bg-white p-6 shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between relative ${
                      isSelected
                        ? "border-[#e77817] ring-2 ring-[#e77817]/20 shadow-md"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      {/* Checkbox at top-left */}
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          isSelected ? "bg-[#e77817] border-[#e77817] text-white" : "border-slate-300 bg-white"
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>

                      {/* Header */}
                      <div className="flex items-start gap-3.5 mb-5">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 text-rose-500 shadow-2xs">
                          <Target className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-slate-900 leading-snug">Business CRM</h4>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            Manage leads, deals, sales pipeline and customer relationships
                          </p>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mb-5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-slate-900">{`₹${getPlanPrice(599, 5988, false, true)}`}</span>
                          <span className="text-xs text-slate-500 font-semibold">/month</span>
                        </div>
                        {isYearly ? (
                          <div className="mt-1 flex flex-col gap-1">
                            <span className="text-xs font-semibold text-slate-500">
                              Billed annually at ₹{getPlanYearlyTotal(5988, false, true)}/year upfront
                            </span>
                            <span className="inline-block w-fit text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                              Save 17% (Pay upfront)
                            </span>
                          </div>
                        ) : (
                          <div className="mt-1.5 inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                            Save 17% yearly
                          </div>
                        )}
                      </div>

                      {/* Features */}
                      <div className="space-y-2.5 mb-6 text-xs sm:text-[13px] text-slate-600 font-medium">
                        <div className="flex items-center gap-2.5 font-semibold text-[#28166f]">
                          <Check className="w-4 h-4 text-[#e77817] shrink-0 stroke-[2.5]" />
                          <span>Everything in Free Plan</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                          <span>Unlimited Leads</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                          <span>API Integrations</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                          <span>Sales Pipeline</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                          <span>500 WhatsApp messages</span>
                        </div>

                        <div className="flex items-center gap-2.5 text-blue-700 font-semibold pt-0.5">
                          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 stroke-[2.5]" />
                          <span>CRM Portal: 2 Sales Team Logins</span>
                        </div>

                        {/* Additional CRM Member Counter */}
                        <div className="flex items-center justify-between w-full bg-blue-50/70 p-2 rounded-lg border border-blue-200/80 mt-1" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="text-slate-800 font-semibold text-xs sm:text-[13px]">
                              + Extra CRM Member (₹{pricing.crmExtraMemberPrice || 99}/mo)
                            </span>
                          </div>
                          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-md px-1.5 py-1 shadow-sm">
                            <button onClick={(e) => { e.stopPropagation(); setCrmExtra(Math.max(0, crmExtra - 1)); }} className="text-slate-400 hover:text-slate-700 transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                            <span className="font-bold text-sm w-5 text-center text-slate-800">{crmExtra}</span>
                            <button onClick={(e) => { e.stopPropagation(); setCrmExtra(crmExtra + 1); }} className="text-slate-400 hover:text-slate-700 transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2.5 text-slate-700 font-semibold pt-1">
                          <Users className="w-4 h-4 text-[#e77817] shrink-0" />
                          <span>Platform access up to 3 employees</span>
                        </div>

                      </div>
                    </div>

                    {/* Button */}
                    <div className="mt-auto pt-2 flex justify-end">
                      <Link
                        to={`/register?plan=crm&billing=${billingCycle}${crmExtra > 0 ? `&crm=${crmExtra}` : ''}`}
                        onClick={(e) => e.stopPropagation()}
                        className="border border-[#e77817] text-[#e77817] hover:bg-[#e77817] hover:text-white font-bold text-xs rounded-xl px-4 py-2 flex items-center gap-1 transition-all duration-200 shadow-2xs"
                      >
                        <span>Get Started</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })()}

              {/* Card 4: Business Promotion */}
              {(() => {
                const isSelected = finalSelected.has("promotion");
                return (
                  <div
                    onClick={() => togglePlan("promotion")}
                    className={`rounded-2xl border bg-white p-6 shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between relative ${
                      isSelected
                        ? "border-[#e77817] ring-2 ring-[#e77817]/20 shadow-md"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      {/* Checkbox at top-left */}
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          isSelected ? "bg-[#e77817] border-[#e77817] text-white" : "border-slate-300 bg-white"
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>

                      {/* Header */}
                      <div className="flex items-start gap-3.5 mb-5">
                        <div className="w-12 h-12 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center shrink-0 text-pink-500 shadow-2xs">
                          <Megaphone className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-slate-900 leading-snug">Business Promotion</h4>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            Festival posters, WhatsApp & broadcast marketing campaigns
                          </p>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mb-5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-slate-900">{`₹${getPlanPrice(599, 5988)}`}</span>
                          <span className="text-xs text-slate-500 font-semibold">/month</span>
                        </div>
                        {isYearly ? (
                          <div className="mt-1 flex flex-col gap-1">
                            <span className="text-xs font-semibold text-slate-500">
                              Billed annually at ₹{getPlanYearlyTotal(5988)}/year upfront
                            </span>
                            <span className="inline-block w-fit text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                              Save 17% (Pay upfront)
                            </span>
                          </div>
                        ) : (
                          <div className="mt-1.5 inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                            Save 17% yearly
                          </div>
                        )}
                      </div>

                      {/* Features */}
                      <div className="space-y-2.5 mb-6 text-xs sm:text-[13px] text-slate-600 font-medium">
                        <div className="flex items-center gap-2.5 font-semibold text-[#28166f]">
                          <Check className="w-4 h-4 text-[#e77817] shrink-0 stroke-[2.5]" />
                          <span>Everything in Free Plan</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                          <span>All Poster Categories</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                          <span>Email & WhatsApp Campaign</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                          <span>500 WhatsApp messages</span>
                        </div>
                        
                        <div className="flex items-center gap-2.5 text-slate-700 font-semibold pt-1">
                          <Users className="w-4 h-4 text-[#e77817] shrink-0" />
                          <span>Platform access up to 3 employees</span>
                        </div>

                      </div>
                    </div>

                    {/* Button */}
                    <div className="mt-auto pt-2 flex justify-end">
                      <Link
                        to={`/register?plan=promotion&billing=${billingCycle}`}
                        onClick={(e) => e.stopPropagation()}
                        className="border border-[#e77817] text-[#e77817] hover:bg-[#e77817] hover:text-white font-bold text-xs rounded-xl px-4 py-2 flex items-center gap-1 transition-all duration-200 shadow-2xs"
                      >
                        <span>Get Started</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })()}

              {/* Card 5: Feedback Management (Coming Soon) */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col justify-between relative">
                <div>
                  {/* Checkbox (inactive) */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-5 h-5 rounded border border-slate-200 bg-slate-50 cursor-not-allowed"></div>
                  </div>

                  {/* Header */}
                  <div className="flex items-start gap-3.5 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-[#28166f] shadow-2xs">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900 leading-snug">Feedback Management</h4>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        Collect, manage and analyze customer feedback easily
                      </p>
                    </div>
                  </div>

                  {/* Center Graphic Illustration */}
                  <div className="my-8 py-4 flex flex-col items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-blue-50/70 border border-blue-100/60 flex items-center justify-center relative mb-4 shadow-inner">
                      <div className="relative">
                        <div className="w-13 h-10 bg-[#28166f] rounded-lg shadow-md flex items-center justify-center p-2">
                          <div className="space-y-1 w-full">
                            <div className="h-1 bg-white rounded-full w-full"></div>
                            <div className="h-1 bg-white/70 rounded-full w-3/4"></div>
                            <div className="h-1 bg-white/50 rounded-full w-1/2"></div>
                          </div>
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white shadow-sm">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                    <div className="text-lg font-black text-slate-900">Coming Soon</div>
                    <p className="text-xs text-slate-500 text-center max-w-[210px] mt-1">
                      Be the first to know when this feature is available!
                    </p>
                  </div>
                </div>

                {/* Notify Me Button */}
                <div className="mt-auto pt-2">
                  <button
                    type="button"
                    onClick={() => toast({ title: "Notification Request Received", description: "We will alert you as soon as Feedback Management launches!" })}
                    className="w-full border border-orange-300 hover:border-orange-400 bg-white hover:bg-orange-50 text-[#e77817] font-bold text-xs rounded-xl py-2.5 flex items-center justify-center gap-2 transition-colors shadow-2xs"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Notify Me</span>
                  </button>
                </div>
              </div>

              {/* Card 6: Business Analysis (Coming Soon) */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col justify-between relative">
                <div>
                  {/* Checkbox (inactive) */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-5 h-5 rounded border border-slate-200 bg-slate-50 cursor-not-allowed"></div>
                  </div>

                  {/* Header */}
                  <div className="flex items-start gap-3.5 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 text-purple-600 shadow-2xs">
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900 leading-snug">Business Analysis</h4>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        Get actionable insights to grow your business
                      </p>
                    </div>
                  </div>

                  {/* Center Graphic Illustration */}
                  <div className="my-8 py-4 flex flex-col items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-purple-50/70 border border-purple-100/60 flex items-center justify-center relative mb-4 shadow-inner">
                      <div className="flex items-end gap-1.5 h-10 px-1">
                        <div className="w-2.5 bg-purple-300 rounded-t h-4"></div>
                        <div className="w-2.5 bg-purple-400 rounded-t h-7"></div>
                        <div className="w-2.5 bg-purple-600 rounded-t h-10"></div>
                        <div className="w-4 h-4 rounded-full bg-indigo-500 ml-1 mb-0.5 shadow-xs"></div>
                      </div>
                    </div>
                    <div className="text-lg font-black text-slate-900">Coming Soon</div>
                    <p className="text-xs text-slate-500 text-center max-w-[210px] mt-1">
                      Be the first to know when this feature is available!
                    </p>
                  </div>
                </div>

                {/* Notify Me Button */}
                <div className="mt-auto pt-2">
                  <button
                    type="button"
                    onClick={() => toast({ title: "Notification Request Received", description: "We will alert you as soon as Business Analysis launches!" })}
                    className="w-full border border-orange-300 hover:border-orange-400 bg-white hover:bg-orange-50 text-[#e77817] font-bold text-xs rounded-xl py-2.5 flex items-center justify-center gap-2 transition-colors shadow-2xs"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Notify Me</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Specialized Add-on Modules: Task & Expense Management */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Task Management Add-on Card */}
              <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                        <CheckSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-900">Task Management Module</h4>
                        <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded-full inline-block mt-0.5">
                          ₹{pricing.taskPriceMonthly}/employee/month
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Assign, schedule, and track employee work with live updates, team assignee clusters, and priority workflows.
                  </p>
                </div>

                <div className="pt-3 border-t border-amber-100 flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-700">
                    <span>Assigned Staff Slots:</span>
                    {taskExtra > 0 && (
                      <span className="ml-1 text-amber-800 font-bold">
                        (₹{(taskExtra * (isYearly ? pricing.taskPriceYearly : pricing.taskPriceMonthly)).toLocaleString('en-IN')}/{isYearly ? 'yr' : 'mo'})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setTaskExtra(Math.max(0, taskExtra - 1))}
                      className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-bold text-sm text-slate-800">{taskExtra}</span>
                    <button
                      type="button"
                      onClick={() => setTaskExtra(taskExtra + 1)}
                      className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expense Management Add-on Card */}
              <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/20 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-900">Expense & Travel Claims</h4>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 border border-emerald-200 px-2 py-0.5 rounded-full inline-block mt-0.5">
                          ₹{pricing.expensePriceMonthly}/employee/month
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Automate bike/car/cab KM rates, monthly travel cards, fuel bills, multi-stage approval, and disbursements.
                  </p>
                </div>

                <div className="pt-3 border-t border-emerald-100 flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-700">
                    <span>Claiming Staff Slots:</span>
                    {expenseExtra > 0 && (
                      <span className="ml-1 text-emerald-800 font-bold">
                        (₹{(expenseExtra * (isYearly ? pricing.expensePriceYearly : pricing.expensePriceMonthly)).toLocaleString('en-IN')}/{isYearly ? 'yr' : 'mo'})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setExpenseExtra(Math.max(0, expenseExtra - 1))}
                      className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-bold text-sm text-slate-800">{expenseExtra}</span>
                    <button
                      type="button"
                      onClick={() => setExpenseExtra(expenseExtra + 1)}
                      className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. BOTTOM BANNER: Business Suite */}
            {(() => {
              const isSelected = finalSelected.has("suite");
              return (
                <div
                  onClick={() => togglePlan("suite")}
                  className={`rounded-2xl border bg-white p-5 sm:p-6 transition-all duration-200 cursor-pointer shadow-xs ${
                    isSelected
                      ? "border-[#e77817] ring-2 ring-[#e77817]/20 shadow-md"
                      : "border-slate-200/90 hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Left: Checkbox + Icon + Details */}
                    <div className="flex items-start gap-4 lg:w-[36%]">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 mt-1 ${
                        isSelected ? "bg-[#e77817] border-[#e77817] text-white" : "border-slate-300 bg-white"
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-[#e77817] flex items-center justify-center text-white shrink-0 shadow-md shadow-orange-500/25">
                        <Crown className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-black text-slate-900 tracking-tight">Business Suite</h3>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-[#e77817] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">Selected</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                          Complete all-in-one business suite with full system access!
                        </p>
                        <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-[#e77817]">{isYearly ? "₹1,699" : "₹1,999"}</span>
                            <span className="text-xs text-slate-500 font-semibold">/month</span>
                          </div>
                          {isYearly ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-slate-500">
                                (Billed ₹20,388/year upfront)
                              </span>
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                                Save ₹3,600 (15% OFF)
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                              Save 15% yearly
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Feature Points */}
                    <div className="flex flex-col justify-center gap-2.5 lg:border-l lg:border-slate-200 lg:pl-8 text-xs sm:text-[13px] flex-1">
                      <div className="flex items-center gap-2.5 font-semibold text-[#28166f]">
                        <div className="w-4 h-4 rounded-full bg-[#e77817] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Everything in Free Plan + Business Accounting + Business HR + Business CRM + Business Promotion</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-blue-800 font-semibold">
                        <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>CRM Portal: 2 Sales Team Logins (Extra @ ₹{pricing.crmExtraMemberPrice || 99}/mo)</span>
                      </div>
                      <div className="flex items-center justify-between max-w-md bg-blue-50/50 p-2 rounded-lg border border-blue-100/50" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="text-slate-700 font-semibold text-xs sm:text-[13px]">
                            + Additional CRM Sales Team (₹{pricing.crmExtraMemberPrice || 99}/mo)
                          </span>
                        </div>
                        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-md px-1.5 py-1 shadow-sm">
                          <button onClick={(e) => { e.stopPropagation(); setCrmExtra(Math.max(0, crmExtra - 1)); }} className="text-slate-400 hover:text-slate-700 transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                          <span className="font-bold text-sm w-5 text-center text-slate-800">{crmExtra}</span>
                          <button onClick={(e) => { e.stopPropagation(); setCrmExtra(crmExtra + 1); }} className="text-slate-400 hover:text-slate-700 transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 text-slate-700 font-semibold">
                        <div className="w-4 h-4 rounded-full bg-[#28166f] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Platform Access up to 5 employees</span>
                      </div>

                    </div>

                    {/* Right: Solid Action Button */}
                    <div className="flex items-center justify-end lg:border-l lg:border-slate-200 lg:pl-8">
                      <Link
                        to={`/register?plan=suite&billing=${billingCycle}${crmExtra > 0 ? `&crm=${crmExtra}` : ''}`}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#e77817] hover:bg-[#d46a0f] text-white font-bold px-6 py-3 rounded-xl shadow-md shadow-orange-500/25 flex items-center gap-2 transition-all duration-200 text-sm whitespace-nowrap"
                      >
                        <span>Get Started</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Floating Checkout Bar */}
            {(finalSelected.size > 0 || taskExtra > 0 || expenseExtra > 0) && (
              <div className="sticky bottom-6 z-40 animate-in slide-in-from-bottom-10 fade-in duration-300 mx-4 md:mx-auto max-w-4xl mt-8">
                <div className="bg-navy/95 backdrop-blur-xl border border-white/10 rounded-3xl md:rounded-full shadow-2xl shadow-navy/50 p-4 md:p-3 md:pl-8 flex flex-col md:flex-row items-center justify-between gap-5 md:gap-6 w-full">
                  <div className="flex items-center gap-6">
                    <div className="bg-white/10 h-12 w-12 rounded-full flex items-center justify-center">
                      <span className="text-xl font-bold text-white">{finalSelected.size + (taskExtra > 0 ? 1 : 0) + (expenseExtra > 0 ? 1 : 0)}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-300 uppercase tracking-wider">Subtotal (+ 18% GST separate)</div>
                      <div className="text-3xl font-black text-white">
                        {isYearly ? (
                          <>
                            ₹{Math.floor(totalAmount / 12).toLocaleString('en-IN')}
                            <span className="text-lg font-medium text-slate-400">/mo</span>
                            <span className="text-xs text-slate-300 font-normal ml-2 block sm:inline">
                              (₹{totalAmount.toLocaleString('en-IN')}/yr upfront)
                            </span>
                          </>
                        ) : (
                          <>
                            ₹{totalAmount.toLocaleString('en-IN')}
                            <span className="text-lg font-medium text-slate-400">/mo</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button size="lg" className="w-full md:w-auto h-14 px-10 text-lg font-bold bg-[#e77817] hover:bg-[#d46a0f] text-white rounded-full shadow-[0_0_20px_rgba(231,120,23,0.4)]" asChild>
                    <Link to={`/register?plan=${Array.from(finalSelected).join(",")}&billing=${billingCycle}&hr=${hrExtra}${crmExtra > 0 ? `&crm=${crmExtra}` : ''}${taskExtra > 0 ? `&task=${taskExtra}` : ''}${expenseExtra > 0 ? `&expense=${expenseExtra}` : ''}`}>
                      Proceed to Checkout <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <PublicFooter />

      {/* Book a Demo Modal */}
      <BookDemoDialog open={isDemoDialogOpen} onOpenChange={setIsDemoDialogOpen} />

      {/* AI Chat Widget */}
      <AIChatWidget />
    </div>
  );
}
