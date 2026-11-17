import React, { useState } from "react";
import { AassayBizBrand } from "@/components/shared/AassayBizBrand";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Sparkles,
  CheckCircle2,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  Loader2,
  ShieldCheck,
  Zap,
  ArrowRight,
  Clock,
} from "lucide-react";

interface BookDemoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ALL_TIME_SLOTS = [
  { id: "Morning (10:00 AM - 01:00 PM)", startHour: 10 },
  { id: "Afternoon (02:00 PM - 05:00 PM)", startHour: 14 },
  { id: "Evening (05:00 PM - 08:00 PM)", startHour: 17 },
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

const getAvailableSlots = (dateStr: string) => {
  const todayStr = getTodayStr();
  if (!dateStr || dateStr !== todayStr) {
    return ALL_TIME_SLOTS.map((s) => s.id);
  }
  const currentHour = new Date().getHours();
  // For today: only allow slots whose start hour has not arrived yet
  return ALL_TIME_SLOTS.filter((s) => currentHour < s.startHour).map((s) => s.id);
};

const getInitialDateAndSlot = () => {
  const todayStr = getTodayStr();
  const todaySlots = getAvailableSlots(todayStr);
  if (todaySlots.length > 0) {
    return {
      date: todayStr,
      slot: todaySlots[0],
    };
  }
  // If no slots remain today (e.g. past 5 PM / 17:00), default to tomorrow!
  return {
    date: getTomorrowStr(),
    slot: ALL_TIME_SLOTS[0].id,
  };
};

const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const todayStr = getTodayStr();
    const tomorrowStr = getTomorrowStr();
    const d = new Date(dateStr + "T00:00:00");
    const formatted = d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    if (dateStr === todayStr) return `Today (${formatted})`;
    if (dateStr === tomorrowStr) return `Tomorrow (${formatted})`;
    return formatted;
  } catch {
    return dateStr;
  }
};

export function BookDemoDialog({ open, onOpenChange }: BookDemoDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const initialSchedule = getInitialDateAndSlot();
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    company: "",
    city: "",
    preferred_date: initialSchedule.date,
    preferred_time: initialSchedule.slot,
    message: "",
  });

  const availableSlots = getAvailableSlots(formData.preferred_date);

  const handleDateChange = (newDate: string) => {
    const slots = getAvailableSlots(newDate);
    setFormData((prev) => ({
      ...prev,
      preferred_date: newDate,
      preferred_time: slots.includes(prev.preferred_time) ? prev.preferred_time : (slots[0] || ""),
    }));
  };

  const resetForm = () => {
    const sched = getInitialDateAndSlot();
    setFormData({
      name: "",
      mobile: "",
      email: "",
      company: "",
      city: "",
      preferred_date: sched.date,
      preferred_time: sched.slot,
      message: "",
    });
    setSubmitted(false);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setTimeout(() => {
        resetForm();
      }, 300);
    }
    onOpenChange(nextOpen);
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

    const cleanMobile = formData.mobile.replace(/\D/g, "");
    if (cleanMobile.length !== 10) {
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

    if (!formData.preferred_date) {
      toast({
        title: "Date Required",
        description: "Please select your preferred demo date.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.preferred_time) {
      toast({
        title: "Time Slot Required",
        description: "Please select an available time slot for your chosen date.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        mobile: cleanMobile,
        email: formData.email.trim().toLowerCase(),
        company: formData.company.trim(),
        city: formData.city.trim() || "Not specified",
        preferred_date: formData.preferred_date,
        preferred_time: formData.preferred_time,
        message: formData.message.trim() || "Standard live online demo requested",
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
        description: "Our product specialist will reach out to you shortly.",
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl bg-white border-slate-200 shadow-2xl z-[9999]">
        {submitted ? (
          <div className="p-8 sm:p-10 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                Demo Request Confirmed!
              </h3>
              <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
                Thank you, <span className="font-semibold text-slate-900">{formData.name}</span>!
                Our product expert will connect with you on{" "}
                <span className="font-semibold text-[#28166f]">+91 {formData.mobile}</span> on{" "}
                <span className="font-semibold text-slate-900">{formatDisplayDate(formData.preferred_date)}</span> during{" "}
                <span className="font-semibold text-[#e77817]">{formData.preferred_time}</span> for a personalized live online demo.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-500">Business:</span>
                <span className="font-semibold text-slate-800">{formData.company}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="font-semibold text-slate-800">{formData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Scheduled Date:</span>
                <span className="font-semibold text-slate-900 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#28166f]" />
                  {formatDisplayDate(formData.preferred_date)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Scheduled Time Slot:</span>
                <span className="font-semibold text-[#28166f] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#e77817]" />
                  {formData.preferred_time}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                className="w-full rounded-xl bg-[#28166f] hover:bg-[#e77817] text-white shadow-md shadow-[#28166f]/20 hover:shadow-orange-500/30 transition-all duration-300 font-bold"
                onClick={() => {
                  handleClose(false);
                  const el = document.getElementById("features");
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth" });
                  } else {
                    window.location.href = "/#features";
                  }
                }}
              >
                Explore Platform <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100"
                onClick={() => handleClose(false)}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {/* Modal Header matching logo colors */}
            <div className="bg-gradient-to-br from-[#28166f] via-[#1f1157] to-[#120b33] p-6 sm:p-7 text-white relative overflow-hidden rounded-t-2xl">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#e77817]/20 rounded-full blur-2xl" />
              <div className="relative z-10 space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e77817]/20 border border-[#e77817]/40 text-orange-200 text-xs font-semibold backdrop-blur-md">
                  <Sparkles className="w-3.5 h-3.5 text-[#e77817]" /> Free 1-on-1 Interactive Demo
                </div>
                <DialogTitle className="text-2xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2 flex-wrap">
                  <span>Experience</span>
                  <AassayBizBrand theme="dark" />
                  <span>in Action</span>
                </DialogTitle>
                <DialogDescription className="text-orange-100/90 text-xs sm:text-sm">
                  Get a personalized live online demo tailored to your business workflow with our product specialist.
                </DialogDescription>
              </div>

              {/* Quick Perks Pill */}
              <div className="mt-4 pt-3 border-t border-white/15 flex flex-wrap gap-3 text-[11px] text-orange-200/90">
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-[#e77817]" /> 15-Minute Tailored Session
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> No Credit Card & No Obligation
                </span>
              </div>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="demo-name" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Full Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="demo-name"
                    placeholder="e.g. Rajesh Kumar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="h-10 rounded-xl border-slate-200 focus-visible:ring-indigo-500"
                  />
                </div>

                {/* Mobile / WhatsApp */}
                <div className="space-y-1.5">
                  <Label htmlFor="demo-mobile" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> Mobile / WhatsApp <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      +91
                    </span>
                    <Input
                      id="demo-mobile"
                      type="tel"
                      maxLength={10}
                      placeholder="9876543210"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, "") })}
                      required
                      className="h-10 pl-11 rounded-xl border-slate-200 focus-visible:ring-indigo-500 font-mono text-sm"
                    />
                  </div>
                </div>

                {/* Work Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="demo-email" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> Work / Personal Email <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="demo-email"
                    type="email"
                    placeholder="rajesh@mycompany.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="h-10 rounded-xl border-slate-200 focus-visible:ring-indigo-500"
                  />
                </div>

                {/* Company Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="demo-company" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" /> Business / Company Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="demo-company"
                    placeholder="e.g. Kumar Traders Pvt Ltd"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    required
                    className="h-10 rounded-xl border-slate-200 focus-visible:ring-indigo-500"
                  />
                </div>

                {/* City & State */}
                <div className="space-y-1.5">
                  <Label htmlFor="demo-city" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> City & State
                  </Label>
                  <Input
                    id="demo-city"
                    placeholder="e.g. Indore, Madhya Pradesh"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="h-10 rounded-xl border-slate-200 focus-visible:ring-indigo-500"
                  />
                </div>

                {/* Preferred Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="demo-date" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Preferred Demo Date <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="demo-date"
                    type="date"
                    min={getTodayStr()}
                    value={formData.preferred_date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    required
                    className="h-10 rounded-xl border-slate-200 focus-visible:ring-indigo-500 text-sm font-medium"
                  />
                </div>
              </div>

              {/* Preferred Slot */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="demo-slot" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> Preferred Demo Time Slot <span className="text-rose-500">*</span>
                  </Label>
                  {formData.preferred_date === getTodayStr() && (
                    <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium border border-amber-200">
                      Showing remaining slots for today
                    </span>
                  )}
                </div>
                {availableSlots.length > 0 ? (
                  <Select
                    value={formData.preferred_time}
                    onValueChange={(val) => setFormData({ ...formData, preferred_time: val })}
                  >
                    <SelectTrigger id="demo-slot" className="h-10 rounded-xl border-slate-200">
                      <SelectValue placeholder="Select time slot" />
                    </SelectTrigger>
                    <SelectContent className="z-[10000]">
                      {availableSlots.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
                    <span>No slots remaining for today. Please select tomorrow or another future date.</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs bg-white text-amber-900 border-amber-300"
                      onClick={() => handleDateChange(getTomorrowStr())}
                    >
                      Pick Tomorrow
                    </Button>
                  </div>
                )}
              </div>

              {/* Specific Requirements / Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="demo-message" className="text-xs font-semibold text-slate-700">
                  What features are you most interested in? <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Textarea
                  id="demo-message"
                  rows={2}
                  placeholder="e.g. GST Invoicing, WhatsApp invoice dispatch, Employee attendance, Multi-branch stock..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="rounded-xl border-slate-200 focus-visible:ring-indigo-500 text-sm resize-none"
                />
              </div>

              {/* Submit Actions */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 text-base font-bold bg-[#28166f] hover:bg-[#e77817] text-white rounded-xl shadow-lg shadow-[#28166f]/25 hover:shadow-orange-500/30 transition-all duration-300 hover:scale-[1.01]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting Request...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 text-orange-200" /> Book My Free Demo
                    </>
                  )}
                </Button>
                <p className="text-[11px] text-center text-slate-400 mt-2">
                  🔒 We respect your privacy. No spam. You will only receive your demo coordination call/WhatsApp.
                </p>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
