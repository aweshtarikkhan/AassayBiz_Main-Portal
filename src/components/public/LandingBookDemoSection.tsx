import React, { useState } from "react";
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
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Mail,
  Building2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  Loader2,
  Check,
} from "lucide-react";

interface LandingBookDemoSectionProps {
  onOpenDialog?: () => void;
}

const ALL_TIME_SLOTS = [
  { id: "Morning (10:00 AM - 01:00 PM)", label: "Morning · 10:00 AM - 01:00 PM", startHour: 10 },
  { id: "Afternoon (02:00 PM - 05:00 PM)", label: "Afternoon · 02:00 PM - 05:00 PM", startHour: 14 },
  { id: "Evening (05:00 PM - 08:00 PM)", label: "Evening · 05:00 PM - 08:00 PM", startHour: 17 },
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

const getDayAfterStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function LandingBookDemoSection({ onOpenDialog }: LandingBookDemoSectionProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    company: "",
    preferred_date: getTomorrowStr(),
    preferred_time: ALL_TIME_SLOTS[0].id,
  });

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
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.company.trim()) {
      toast({
        title: "Business Name Required",
        description: "Please enter your company or business name.",
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
        city: "Landing Page Booking",
        preferred_date: formData.preferred_date,
        preferred_time: formData.preferred_time,
        source: "Landing Page Book Demo Section",
        message: "Live guided demo requested from home page",
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
        description: "Your session has been logged in our system. A product specialist will connect with you shortly.",
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
    <section id="demo" className="py-20 sm:py-24 bg-gradient-to-br from-[#160e3d] via-[#211559] to-[#0f0826] text-white relative overflow-hidden border-t border-b border-white/10 shadow-2xl">
      {/* Background ambient lighting and soft glows */}
      <div className="absolute top-0 left-1/4 -translate-y-1/2 w-96 h-96 bg-[#28166f]/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 translate-y-1/2 w-96 h-96 bg-[#e77817]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          
          {/* Left Column: Value Proposition & Highlights */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black tracking-tight text-white leading-tight mb-4">
              Experience Aassay Biz{" "}
              <span className="bg-gradient-to-r from-[#ffaa47] to-[#e77817] bg-clip-text text-transparent">
                in Live Action
              </span>
            </h2>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-8">
              Schedule a personalized 1-on-1 live online demo with our product specialist. See firsthand how Aassay Biz simplifies GST billing, automated inventory, staff attendance, payroll, and CRM for Indian businesses.
            </p>

            {/* 4 Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {/* Card 1: 15-Min Live Online Demo */}
              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-sm hover:bg-white/[0.14] transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#28166f] border border-white/20 text-[#ffaa47] flex items-center justify-center shrink-0 shadow-inner">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">15-Min Tailored Tour</h4>
                  <p className="text-xs text-slate-300 mt-0.5 leading-snug">Customized to your exact business workflow</p>
                </div>
              </div>

              {/* Card 2: Easy Setup & Migration (Updated per user request) */}
              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-sm hover:bg-white/[0.14] transition-all">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Easy Setup & Migration</h4>
                  <p className="text-xs text-slate-300 mt-0.5 leading-snug">Assistance with data import and templates</p>
                </div>
              </div>

              {/* Card 3: Live Q&A with Experts */}
              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-sm hover:bg-white/[0.14] transition-all">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0 shadow-inner">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Live Q&A with Experts</h4>
                  <p className="text-xs text-slate-300 mt-0.5 leading-snug">Instant answers for GST, billing & accounts</p>
                </div>
              </div>

              {/* Card 4: Smart CRM & Staff HRMS (Updated per user request) */}
              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-sm hover:bg-white/[0.14] transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#e77817]/25 border border-[#e77817]/40 text-[#ff8522] flex items-center justify-center shrink-0 shadow-inner">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Smart CRM & Staff HRMS</h4>
                  <p className="text-xs text-slate-300 mt-0.5 leading-snug">Automate leads, staff attendance & payroll</p>
                </div>
              </div>
            </div>

            {/* Trust points bar */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[#ffaa47] stroke-[3]" /> Trusted by 100+ Growing Businesses
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[#ffaa47] stroke-[3]" /> Zero Obligation Guided Tour
              </span>
            </div>
          </div>

          {/* Right Column: High-Contrast White Interactive Booking Card */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-3xl border border-white/20 shadow-2xl shadow-black/40 p-6 sm:p-8 relative text-slate-900">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Book Your Free Demo
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Select your preferred date & time slot for your live online demo
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#e77817]/10 text-[#e77817] flex items-center justify-center shrink-0 shadow-2xs">
                  <CalendarIcon className="w-6 h-6" />
                </div>
              </div>

              {submitted ? (
                <div className="py-10 text-center animate-in fade-in duration-300">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
                  </div>
                  <h4 className="text-2xl font-black text-slate-900 mb-2">Demo Request Confirmed!</h4>
                  <p className="text-sm text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
                    Thank you, <span className="font-bold text-slate-900">{formData.name}</span>! Your demo booking has been successfully registered in our admin panel. Our product specialist will connect with you on{" "}
                    <span className="font-bold text-[#28166f]">{formData.preferred_date}</span> during the{" "}
                    <span className="font-bold text-[#e77817]">{formData.preferred_time}</span> slot.
                  </p>
                  <Button
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({
                        name: "",
                        mobile: "",
                        email: "",
                        company: "",
                        preferred_date: getTomorrowStr(),
                        preferred_time: ALL_TIME_SLOTS[0].id,
                      });
                    }}
                    variant="outline"
                    className="rounded-full px-6 text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Book Another Slot
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Row 1: Name & Mobile */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          className="pl-9 h-11 rounded-xl text-sm border-slate-200 focus-visible:ring-[#28166f]"
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
                          className="pl-9 h-11 rounded-xl text-sm border-slate-200 focus-visible:ring-[#28166f]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Company & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          className="pl-9 h-11 rounded-xl text-sm border-slate-200 focus-visible:ring-[#28166f]"
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
                          className="pl-9 h-11 rounded-xl text-sm border-slate-200 focus-visible:ring-[#28166f]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Date & Quick Selectors */}
                  <div>
                    <Label htmlFor="demo-date" className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Preferred Date *</span>
                      <span className="text-[11px] text-slate-400 font-normal">Choose suitable date</span>
                    </Label>
                    <div className="grid grid-cols-3 gap-2 mt-1 mb-2">
                      {[
                        { label: "Today", val: getTodayStr() },
                        { label: "Tomorrow", val: getTomorrowStr() },
                        { label: "Day After", val: getDayAfterStr() },
                      ].map((d) => (
                        <button
                          key={d.val}
                          type="button"
                          onClick={() => setFormData({ ...formData, preferred_date: d.val })}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                            formData.preferred_date === d.val
                              ? "bg-[#28166f] text-white border-[#28166f] shadow-xs"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        id="demo-date"
                        type="date"
                        required
                        value={formData.preferred_date}
                        min={getTodayStr()}
                        onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                        className="pl-9 h-11 rounded-xl text-sm border-slate-200 focus-visible:ring-[#28166f]"
                      />
                    </div>
                  </div>

                  {/* Row 4: Time Slot */}
                  <div>
                    <Label htmlFor="demo-time" className="text-xs font-bold text-slate-700">
                      Preferred Time Slot *
                    </Label>
                    <div className="relative mt-1">
                      <Select
                        value={formData.preferred_time}
                        onValueChange={(val) => setFormData({ ...formData, preferred_time: val })}
                      >
                        <SelectTrigger id="demo-time" className="h-11 rounded-xl text-sm border-slate-200 focus:ring-[#28166f]">
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

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl text-base font-bold bg-[#e77817] hover:bg-[#d46a0f] text-white shadow-lg shadow-orange-500/25 transition-all duration-200 mt-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Logging Demo Request...
                      </>
                    ) : (
                      <>
                        Book My Free Demo Now <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>

                  <p className="text-[11px] text-center text-slate-400 mt-2">
                    🔒 Logged instantly to Platform Admin for priority scheduling. No spam.
                  </p>
                </form>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
