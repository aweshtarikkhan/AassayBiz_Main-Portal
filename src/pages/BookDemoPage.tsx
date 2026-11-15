import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { AIChatWidget } from "@/components/public/AIChatWidget";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Mail,
  Building2,
  MapPin,
  Briefcase,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Check,
  Loader2,
  Star,
  Headphones,
  Lock,
} from "lucide-react";

const ALL_TIME_SLOTS = [
  { id: "Morning (10:00 AM - 01:00 PM)", label: "Morning · 10:00 AM - 01:00 PM" },
  { id: "Afternoon (02:00 PM - 05:00 PM)", label: "Afternoon · 02:00 PM - 05:00 PM" },
  { id: "Evening (05:00 PM - 08:00 PM)", label: "Evening · 05:00 PM - 08:00 PM" },
];

const INDUSTRIES = [
  "Retail & Shopkeeper",
  "Wholesale & Distribution",
  "Manufacturing & Production",
  "IT, Software & Agency",
  "Services & Consulting",
  "Healthcare & Clinic",
  "Construction & Real Estate",
  "Other Business",
];

const MODULE_OPTIONS = [
  { id: "invoicing", label: "GST Billing" },
  { id: "accounting", label: "Accounting & Stock" },
  { id: "hrms", label: "Staff & Payroll" },
  { id: "crm", label: "CRM & Leads" },
  { id: "marketing", label: "WhatsApp Marketing" },
];

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function BookDemoPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    company: "",
    city: "",
    industry: INDUSTRIES[0],
    preferred_date: getTomorrowStr(),
    preferred_time: ALL_TIME_SLOTS[0].id,
    selected_modules: ["invoicing", "accounting", "hrms"] as string[],
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const toggleModule = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      selected_modules: prev.selected_modules.includes(id)
        ? prev.selected_modules.filter((m) => m !== id)
        : [...prev.selected_modules, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your full name.",
        variant: "destructive",
      });
      return;
    }

    const cleanMobile = formData.mobile.replace(/[^0-9]/g, "");
    if (cleanMobile.length < 10) {
      toast({
        title: "Invalid Mobile Number",
        description: "Please enter a valid 10-digit mobile number.",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid work or personal email.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.company.trim()) {
      toast({
        title: "Company Required",
        description: "Please enter your business or company name.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Real database payload that automatically populates the Admin Panel "Demo Requests" table
      const payload = {
        name: formData.name.trim(),
        mobile: cleanMobile,
        phone: cleanMobile,
        email: formData.email.trim().toLowerCase(),
        company: formData.company.trim(),
        business: formData.company.trim(),
        city: formData.city.trim() || "Not specified",
        industry: formData.industry,
        modules: formData.selected_modules.join(", "),
        preferred_date: formData.preferred_date,
        preferred_time: formData.preferred_time,
        source: "Dedicated Book Demo Page (/book-demo)",
        message: `Demo requested for: ${formData.selected_modules.join(", ")}`,
      };

      const { error } = await supabase.from("feature_requests").insert({
        feature_name: "Book a Free Demo",
        request_type: "demo_request",
        user_email: formData.email.trim().toLowerCase(),
        message: JSON.stringify(payload),
        status: "pending",
      });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: "Demo Request Submitted!",
        description: "Your session has been logged in our Admin Panel. A product specialist will connect with you.",
        variant: "default",
      });
    } catch (err: any) {
      console.error("Demo submission error:", err);
      toast({
        title: "Submission Failed",
        description: err.message || "Failed to submit demo request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col justify-between">
      {/* Header */}
      <PublicHeader />

      {/* Main Container */}
      <main className="flex-1 py-10 lg:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Top Title Banner */}
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-3">
              Book a Free{" "}
              <span className="bg-gradient-to-r from-[#28166f] to-[#e77817] bg-clip-text text-transparent">
                1-on-1 Guided Demo
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Discover how Aassay Biz streamlines GST billing, multi-warehouse inventory, staff attendance, payroll, and CRM. Our product specialist will walk you through a customized session.
            </p>
          </div>

          {/* Balanced 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Benefits & Trust Proof (6 cols) */}
            <div className="lg:col-span-6 flex flex-col gap-6">
              
              {/* Feature Highlights Card */}
              <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-4">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#e77817]" />
                  What to expect in your guided walkthrough
                </h3>
                
                <div className="space-y-3.5">
                  <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <div className="w-9 h-9 rounded-xl bg-[#28166f]/10 text-[#28166f] flex items-center justify-center shrink-0">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">15-Min Tailored Tour</h4>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                        Customized specifically to your business workflow and pain points.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Easy Setup & Free Migration</h4>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                        Assistance with importing your existing customers, items, and Tally data.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Live Q&A with Certified Experts</h4>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                        Get direct, actionable answers for GST compliance, payroll, and stock management.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <div className="w-9 h-9 rounded-xl bg-[#e77817]/10 text-[#e77817] flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Zero Obligation · 100% Free</h4>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                        No credit card required. Explore everything risk-free before deciding.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4 Metric Badges Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                  <div className="text-center p-2 rounded-xl bg-slate-50">
                    <div className="text-sm font-black text-[#28166f]">100%</div>
                    <div className="text-[10px] text-slate-500 font-semibold">GST Ready</div>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-slate-50">
                    <div className="text-sm font-black text-[#e77817]">15 Min</div>
                    <div className="text-[10px] text-slate-500 font-semibold">Quick Setup</div>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-slate-50">
                    <div className="text-sm font-black text-emerald-600">Free</div>
                    <div className="text-[10px] text-slate-500 font-semibold">Data Import</div>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-slate-50">
                    <div className="text-sm font-black text-indigo-600">24/7</div>
                    <div className="text-[10px] text-slate-500 font-semibold">Live Support</div>
                  </div>
                </div>
              </div>

              {/* Verified Customer Testimonial Card */}
              <div className="rounded-3xl bg-gradient-to-r from-[#211559] via-[#28166f] to-[#1c1248] text-white p-5 sm:p-6 shadow-xl border border-white/10">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-400/20 px-2.5 py-0.5 rounded-full">
                    Verified Customer
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-3.5 italic">
                  "Aassay Biz reduced our monthly billing, payroll, and stock reconciliation from 4 days to just 30 minutes. The guided 1-on-1 demo showed us exactly how to set it up."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-white text-xs">
                    SK
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Suresh K.</div>
                    <div className="text-[11px] text-slate-300">Operations Director, Apex Retail</div>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Streamlined High-Converting Form (6 cols) */}
            <div className="lg:col-span-6">
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-7 relative">
                
                {submitted ? (
                  <div className="py-12 text-center animate-in fade-in duration-300">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">
                      Demo Request Received!
                    </h3>
                    <p className="text-sm text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
                      Thank you, <span className="font-bold text-slate-900">{formData.name}</span>. Your request has been logged in our Admin Panel. Our product specialist will connect with you on{" "}
                      <span className="font-bold text-[#28166f]">{formData.preferred_date}</span> during the{" "}
                      <span className="font-bold text-[#e77817]">{formData.preferred_time}</span> slot.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <Button
                        onClick={() => {
                          setSubmitted(false);
                          setFormData({
                            name: "",
                            mobile: "",
                            email: "",
                            company: "",
                            city: "",
                            industry: INDUSTRIES[0],
                            preferred_date: getTomorrowStr(),
                            preferred_time: ALL_TIME_SLOTS[0].id,
                            selected_modules: ["invoicing", "accounting", "hrms"],
                          });
                        }}
                        variant="outline"
                        className="rounded-full px-6 h-10 text-xs font-bold"
                      >
                        Book Another Demo
                      </Button>
                      <Button
                        asChild
                        className="rounded-full px-6 h-10 text-xs font-bold bg-[#28166f] hover:bg-[#1f1057] text-white"
                      >
                        <Link to="/">Back to Home</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        Schedule Your 1-on-1 Walkthrough
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Fill in your business details so we can tailor the session for you.
                      </p>
                    </div>

                    {/* Row 1: Name & Mobile */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <Label htmlFor="demo-name" className="text-xs font-bold text-slate-700">
                          Full Name *
                        </Label>
                        <div className="relative mt-1">
                          <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <Input
                            id="demo-name"
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Rahul Sharma"
                            className="pl-9 h-10 rounded-xl text-xs sm:text-sm border-slate-200"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="demo-mobile" className="text-xs font-bold text-slate-700">
                          Mobile Number *
                        </Label>
                        <div className="relative mt-1">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <Input
                            id="demo-mobile"
                            type="tel"
                            required
                            value={formData.mobile}
                            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                            placeholder="10-digit number"
                            className="pl-9 h-10 rounded-xl text-xs sm:text-sm border-slate-200"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Company & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <Label htmlFor="demo-company" className="text-xs font-bold text-slate-700">
                          Company / Business Name *
                        </Label>
                        <div className="relative mt-1">
                          <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <Input
                            id="demo-company"
                            type="text"
                            required
                            value={formData.company}
                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                            placeholder="e.g. Sharma Enterprises"
                            className="pl-9 h-10 rounded-xl text-xs sm:text-sm border-slate-200"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="demo-email" className="text-xs font-bold text-slate-700">
                          Work / Personal Email *
                        </Label>
                        <div className="relative mt-1">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <Input
                            id="demo-email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="rahul@company.com"
                            className="pl-9 h-10 rounded-xl text-xs sm:text-sm border-slate-200"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Row 3: City & Industry */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <Label htmlFor="demo-city" className="text-xs font-bold text-slate-700">
                          City / State
                        </Label>
                        <div className="relative mt-1">
                          <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <Input
                            id="demo-city"
                            type="text"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            placeholder="e.g. Mumbai, MH"
                            className="pl-9 h-10 rounded-xl text-xs sm:text-sm border-slate-200"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="demo-industry" className="text-xs font-bold text-slate-700">
                          Industry / Category
                        </Label>
                        <div className="relative mt-1">
                          <Select
                            value={formData.industry}
                            onValueChange={(val) => setFormData({ ...formData, industry: val })}
                          >
                            <SelectTrigger id="demo-industry" className="h-10 rounded-xl text-xs sm:text-sm border-slate-200">
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                            <SelectContent>
                              {INDUSTRIES.map((ind) => (
                                <SelectItem key={ind} value={ind}>
                                  {ind}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Row 4: Modules to Explore (Compact Pills) */}
                    <div>
                      <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
                        Modules to Explore
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {MODULE_OPTIONS.map((mod) => {
                          const isSelected = formData.selected_modules.includes(mod.id);
                          return (
                            <button
                              key={mod.id}
                              type="button"
                              onClick={() => toggleModule(mod.id)}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                                isSelected
                                  ? "bg-orange-50 border-[#e77817] text-[#e77817] shadow-2xs"
                                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              <div
                                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSelected ? "bg-[#e77817] border-[#e77817] text-white" : "border-slate-300 bg-white"
                                }`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                              <span>{mod.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Row 5: Preferred Date & Time Slot */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                      <div>
                        <Label htmlFor="demo-date" className="text-xs font-bold text-slate-700">
                          Preferred Date *
                        </Label>
                        <div className="relative mt-1">
                          <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <Input
                            id="demo-date"
                            type="date"
                            required
                            value={formData.preferred_date}
                            min={getTodayStr()}
                            onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                            className="pl-9 h-10 rounded-xl text-xs sm:text-sm border-slate-200"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="demo-time" className="text-xs font-bold text-slate-700">
                          Preferred Time Slot *
                        </Label>
                        <div className="relative mt-1">
                          <Select
                            value={formData.preferred_time}
                            onValueChange={(val) => setFormData({ ...formData, preferred_time: val })}
                          >
                            <SelectTrigger id="demo-time" className="h-10 rounded-xl text-xs sm:text-sm border-slate-200">
                              <SelectValue placeholder="Select a time slot" />
                            </SelectTrigger>
                            <SelectContent>
                              {ALL_TIME_SLOTS.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 rounded-xl text-sm sm:text-base font-bold bg-[#e77817] hover:bg-[#d46a0f] text-white shadow-lg shadow-orange-500/25 transition-all duration-200 mt-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Logging Demo Request...
                        </>
                      ) : (
                        <>
                          Confirm & Book My Free Demo <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>

                    <p className="text-[11px] text-center text-slate-400 mt-1">
                      🔒 Securely logged into Admin Panel for priority scheduling. No spam.
                    </p>
                  </form>
                )}

              </div>
            </div>

          </div>

        </div>
      </main>

      {/* Footer */}
      <PublicFooter />

      {/* AI Chat Widget */}
      <AIChatWidget />
    </div>
  );
}
