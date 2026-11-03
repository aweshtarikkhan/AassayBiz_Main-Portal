import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Fingerprint, Check, X, Zap, Shield, Smartphone, FileText, IndianRupee,
  MessageCircle, Star, ArrowRight, Sparkles, BarChart3, Package, Boxes, ClipboardList,
  Globe, PlayCircle, ShieldCheck, Building2, Quote, Timer, Users, Layers,
  Calculator, UserCheck, Megaphone, BrainCircuit, Link2,
  Gift, Crown, Bell, Target, MessageSquare, Clock,
  Plus, Minus, Bot,
} from "lucide-react";
import logoImg from "@/assets/logo.png";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { HeroDashboardMockup } from "@/components/public/HeroDashboardMockup";
import { BookDemoDialog } from "@/components/public/BookDemoDialog";
import { AIChatWidget } from "@/components/public/AIChatWidget";
import { SocialMediaLinks } from "@/components/shared/SocialMediaLinks";
import { usePlatformSocials, formatSocialUrl } from "@/hooks/use-platform-socials";
import { useToast } from "@/hooks/use-toast";

type Lang = "en" | "hi";

const t = {
  en: {
    nav_features: "Features", nav_pricing: "Pricing", nav_compare: "Compare", nav_login: "Sign in",
    hero_eyebrow: "Built for Indian SMBs · 100% GST Ready",
    hero_title: "Send GST invoices in 30 seconds.",
    hero_sub: "Aassay Biz is the fastest GST-compliant billing software for shopkeepers, freelancers and growing businesses. Create, share and get paid — all in one place",
    cta_primary: "Create your first invoice — Free",
    cta_secondary: "Watch 60-sec demo",
    trust_users: "Businesses Trust Us",
    trust_invoices: "Total Invoiced",
    trust_rating: "Rating on Aassay",
    trust_uptime: "System Uptime",
    speed_claim: "Invoice ready in 60 seconds",
    no_card_badge: "No credit card needed",
    badges_title: "Built for India. Verified for GST.",
    feat_title: "Everything you need to run your business",
    feat_sub: "Invoicing, inventory, GST returns, payments — no spreadsheets required",
    wa_eyebrow: "Instant Sharing",
    wa_title: "Send invoices instantly. Get paid 2x faster.",
    wa_sub: "One tap to share a polished PDF with a UPI QR. Your customers pay instantly — no app downloads, no logins",
    wa_bullets: ["1-tap share with PDF + UPI QR", "Auto payment reminders for overdue invoices", "Customer portal — pay without sign-up"],
    cmp_title: "Why teams switch to Aassay Biz",
    cmp_sub: "Honest comparison with the tools you're probably using today",
    test_title: "our business made more then 12,000 invoices",
    pricing_title: "Simple pricing. No surprises.",
    pricing_sub: "Start free forever. Upgrade only when you grow",
    pricing_cta_free: "Start Free",
  },
  hi: {
    nav_features: "फीचर्स", nav_pricing: "प्राइसिंग", nav_compare: "तुलना", nav_login: "साइन इन",
    hero_eyebrow: "भारतीय व्यापारियों के लिए · 100% GST रेडी",
    hero_title: "30 सेकंड में GST बिल भेजें।",
    hero_sub: "Aassay Biz भारत का सबसे तेज़ GST बिलिंग सॉफ़्टवेयर है — दुकानदार, फ्रीलांसर और बढ़ते बिज़नेस के लिए। बिल बनाओ, भेजो, पेमेंट लो — एक ही जगह",
    cta_primary: "अभी मुफ़्त बिल बनाएं",
    cta_secondary: "60-सेकंड डेमो देखें",
    trust_users: "बिज़नेस का भरोसा",
    trust_invoices: "कुल इनवॉइसिंग",
    trust_rating: "रेटिंग Aassay पर",
    trust_uptime: "सिस्टम अपटाइम",
    speed_claim: "60 सेकंड में इनवॉइस तैयार",
    no_card_badge: "कोई क्रेडिट कार्ड नहीं चाहिए",
    badges_title: "भारत के लिए बना। GST के लिए वेरिफ़ाइड।",
    feat_title: "आपके बिज़नेस के लिए सब कुछ — एक ही जगह",
    feat_sub: "बिलिंग, स्टॉक, GST रिटर्न, पेमेंट — कोई एक्सेल नहीं चाहिए",
    wa_eyebrow: "इंस्टेंट शेयर",
    wa_title: "बिल भेजें। 2x तेज़ पेमेंट पाएं।",
    wa_sub: "एक टैप में PDF + UPI QR के साथ बिल भेजें। कस्टमर तुरंत पेमेंट करें — कोई ऐप या लॉगिन नहीं",
    wa_bullets: ["1-टैप शेयर — PDF + UPI QR के साथ", "ओवरड्यू बिल के लिए ऑटो रिमाइंडर", "कस्टमर पोर्टल — बिना साइन-अप पेमेंट"],
    cmp_title: "लोग Aassay Biz क्यों चुनते हैं",
    cmp_sub: "जो टूल्स आप आज इस्तेमाल कर रहे हैं उनसे ईमानदार तुलना",
    test_title: "our business made more then 12,000 invoices",
    pricing_title: "सीधी प्राइसिंग। कोई छुपा शुल्क नहीं।",
    pricing_sub: "हमेशा के लिए मुफ़्त शुरू करें। बढ़ने पर ही अपग्रेड करें",
    pricing_cta_free: "मुफ़्त शुरू करें",
  },
};


const hrBadges = [
  "GPS Attendance",
  "Employee Self-Service Portal",
  "1-Click Payroll & Payslips",
  "Internal Team Chat",
  "Track Overtime",
  "Multi-Shift & Leave Roster",
];
const hrEmployees = [
  { name: "Rahul Sharma",     role: "Store Manager",  status: "P",  time: "09:02", color: "bg-[#28166f]" },
  { name: "Priya Verma",      role: "Sales Executive", status: "P",  time: "09:14", color: "bg-[#28166f]" },
  { name: "Ankita Patel",     role: "Accountant",      status: "HD", time: "10:30", color: "bg-slate-400" },
  { name: "Deepak Singh",     role: "Delivery Staff",  status: "A",  time: "—",     color: "bg-[#e77817]" },
];
// hrMonths and hrDays removed

const crmBadges = [
  "Multi-Source Lead Capture",
  "Visual Kanban Deal Stages",
  "Lead to Client Conversion",
  "IndiaMART & Justdial Sync",
  "Call Logs & Reminders",
  "CRM Reports & Analytics",
];
const crmPipeline = [
  { stage: "New Leads",    count: 12, color: "bg-[#28166f]",    leads: [
    { name: "Rajesh Ent.", val: "₹1.8L", hot: true },
    { name: "Sharma Traders", val: "₹75K", hot: false },
  ]},
  { stage: "In Discussion", count: 8, color: "bg-[#e77817]",  leads: [
    { name: "Patel & Sons", val: "₹3.2L", hot: true },
    { name: "Krishna Corp", val: "₹90K", hot: false },
  ]},
  { stage: "Quote Sent",  count: 5,  color: "bg-slate-700",  leads: [
    { name: "Mehta Bros", val: "₹2.1L", hot: false },
    { name: "Gupta Retail", val: "₹1.4L", hot: true },
  ]},
  { stage: "Won 🏆",       count: 3,  color: "bg-[#28166f]", leads: [
    { name: "Singh Infra", val: "₹5.6L", hot: false },
    { name: "Jain Exports", val: "₹3.8L", hot: false },
  ]},
];
const crmUpcoming = [
  { time: "10:30 AM", name: "Rajesh Enterprises", type: "Follow-up Call", tag: "High Priority", color: "border-[#e77817] bg-[#e77817]/10" },
  { time: "12:00 PM", name: "Patel & Sons",        type: "Demo Presentation", tag: "Scheduled",   color: "border-[#28166f] bg-[#28166f]/10" },
  { time: "03:00 PM", name: "Mehta Bros",           type: "Quotation Review", tag: "Pending",     color: "border-slate-300 bg-slate-50" },
];

const mktBadges = [
  "Automated Customer Journey",
  "Pre-Approved Message Templates",
  "Logo & QR Branded Creatives",
  "Promotion Reports & Analytics",
  "Inactive Client Retargeting",
  "Multi-Channel WhatsApp & Email Campaigns",
];
const mktCampaigns = [
  { name: "Diwali Sale 2026",   sent: 1250, opened: 1156, orders: 87, revenue: "₹1,42,800", status: "Live",     badge: "bg-[#28166f]" },
  { name: "Flash Weekend Offer", sent: 840,  opened: 772,  orders: 54, revenue: "₹68,400",  status: "Completed",badge: "bg-[#e77817]" },
  { name: "New Arrivals Aug",    sent: 620,  opened: 544,  orders: 38, revenue: "₹41,200",  status: "Completed",badge: "bg-slate-500" },
];
const mktPosterColors = [
  "from-[#28166f] to-[#1e1055]",
  "from-[#e77817] to-[#d56b10]",
  "from-[#28166f] to-[#e77817]",
];
const mktPosterTitles = ["Diwali Offer 🪔", "New Stock In! 📦", "Year End Sale 🎉"];
const mktPosterDisc   = ["FLAT 30% OFF", "Exclusive Deals", "Upto 50% OFF"];
const complianceBadges = [
  { icon: ShieldCheck, label: "GST Ready" },
  { icon: ClipboardList, label: "Create Purchase Order" },
  { icon: Boxes, label: "Inventory Management" },
  { icon: IndianRupee, label: "UPI / QR Payments" },
  { icon: BarChart3, label: "GSTR-1 & 3B Export" },
  { icon: Building2, label: "Tally CSV Export" },
];

const growthFeatures = [
  {
    icon: FileText,
    title: "Invoicing",
    desc: "Create, send and track invoices easily",
    cardBg: "bg-blue-50/50 border-blue-100 hover:bg-blue-600 hover:border-blue-600",
    iconBg: "bg-blue-100/80 text-[#28166f] group-hover:bg-white group-hover:text-[#28166f]",
  },
  {
    icon: Calculator,
    title: "Accounting",
    desc: "Manage your finances with confidence",
    cardBg: "bg-emerald-50/40 border-emerald-100 hover:bg-emerald-600 hover:border-emerald-600",
    iconBg: "bg-emerald-100/80 text-[#e77817] group-hover:bg-white group-hover:text-[#e77817]",
  },
  {
    icon: Users,
    title: "CRM",
    desc: "Build stronger customer relationships",
    cardBg: "bg-orange-50/50 border-orange-100 hover:bg-[#e77817] hover:border-[#e77817]",
    iconBg: "bg-orange-100/80 text-[#e77817] group-hover:bg-white group-hover:text-[#e77817]",
    route: "/crm",
  },
  {
    icon: UserCheck,
    title: "HRMS",
    desc: "Manage your team, attendance and payroll with ease",
    cardBg: "bg-purple-50/40 border-purple-100 hover:bg-purple-600 hover:border-purple-600",
    iconBg: "bg-purple-100/80 text-purple-600 group-hover:bg-white group-hover:text-purple-600",
    route: "/hr",
  },
  {
    icon: Megaphone,
    title: "Promotion",
    desc: "Grow your brand with built-in marketing tools",
    cardBg: "bg-rose-50/40 border-rose-100 hover:bg-rose-500 hover:border-rose-500",
    iconBg: "bg-rose-100/80 text-rose-500 group-hover:bg-white group-hover:text-rose-500",
    route: "/marketing",
  },
  {
    icon: Star,
    title: "Business Feedback",
    desc: "Listen, analyze and improve with customer feedback",
    cardBg: "bg-amber-50/40 border-amber-100 hover:bg-amber-600 hover:border-amber-600",
    iconBg: "bg-amber-100/80 text-amber-600 group-hover:bg-white group-hover:text-amber-600",
  },
  {
    icon: BrainCircuit,
    title: "AI Analysis",
    desc: "Get smart insights and predictions with AI",
    cardBg: "bg-cyan-50/40 border-cyan-100 hover:bg-cyan-600 hover:border-cyan-600",
    iconBg: "bg-cyan-100/80 text-cyan-600 group-hover:bg-white group-hover:text-cyan-600",
  },
  {
    icon: Link2,
    title: "Integrations",
    desc: "Connect with Email, WhatsApp and other tools seamlessly",
    cardBg: "bg-teal-50/40 border-teal-100 hover:bg-teal-600 hover:border-teal-600",
    iconBg: "bg-teal-100/80 text-teal-600 group-hover:bg-white group-hover:text-teal-600",
  },
];

const features = [
  { icon: Zap, title: "30-second invoicing", desc: "Pre-filled GST rates, HSN lookup, auto-numbering. Done before your chai gets cold" },
  { icon: MessageCircle, title: "Share + UPI QR", desc: "Send a polished PDF with a UPI QR. Customers pay in one tap" },
  { icon: Package, title: "Inventory with stock ledger", desc: "Auto-deduct stock on sales, restock on credit notes. Negative-stock warnings" },
  { icon: FileText, title: "GSTR-1, GSTR-3B, HSN summary", desc: "Generate filing-ready JSON and CSV. Tally export included" },
  { icon: BarChart3, title: "P&L, receivables, aging", desc: "Know who owes you, what's overdue, and what you actually earned" },
  { icon: Smartphone, title: "Works offline, installs as app", desc: "PWA — install on phone or laptop. Use it even on a weak network" },
];



export default function LandingPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("satah-lang") as Lang) || "en");
  const [allowFreePlan, setAllowFreePlan] = useState(true);
  const [dbPlans, setDbPlans] = useState<any[]>([]);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [hrExtra, setHrExtra] = useState(0);
  const [crmExtra, setCrmExtra] = useState(0);

  const getPlanPrice = (baseMo: number, baseYr: number, hasHrAddon = false, hasCrmAddon = false) => {
    const platAddon = platformExtra * 99;
    const hrAddon = hasHrAddon ? hrExtra * 29 : 0;
    const crmAddon = hasCrmAddon ? crmExtra * 999 : 0;
    const totalMo = baseMo + platAddon + hrAddon + crmAddon;
    // Yearly 17% discount roughly
    const platAddonYr = Math.round(platformExtra * 99 * 12 * 0.83);
    const hrAddonYr = hasHrAddon ? Math.round(hrExtra * 29 * 12 * 0.83) : 0;
    const crmAddonYr = hasCrmAddon ? Math.round(crmExtra * 999 * 12 * 0.83) : 0;
    const totalYr = baseYr + platAddonYr + hrAddonYr + crmAddonYr;
    if (billingCycle === "yearly") {
      const monthlyEquiv = Math.floor(totalYr / 12);
      return monthlyEquiv.toLocaleString("en-IN");
    }
    return totalMo.toLocaleString("en-IN");
  };

  const getPlanYearlyTotal = (baseYr: number, hasHrAddon = false, hasCrmAddon = false) => {
    const platAddonYr = Math.round(platformExtra * 99 * 12 * 0.83);
    const hrAddonYr = hasHrAddon ? Math.round(hrExtra * 29 * 12 * 0.83) : 0;
    const crmAddonYr = hasCrmAddon ? Math.round(crmExtra * 999 * 12 * 0.83) : 0;
    const totalYr = baseYr + platAddonYr + hrAddonYr + crmAddonYr;
    return totalYr.toLocaleString("en-IN");
  };
  const [platformExtra, setPlatformExtra] = useState(0);
  const [customReviews, setCustomReviews] = useState<any[] | null>(null);
  const [isDemoDialogOpen, setIsDemoDialogOpen] = useState(false);
  const { toast } = useToast();
  const { socials } = usePlatformSocials();
  const L = t[lang];

  useEffect(() => {
    localStorage.setItem("satah-lang", lang);
  }, [lang]);

  // Allow browsing landing page and pricing freely without forced redirect

  useEffect(() => {
    // Fetch global settings
    supabase.from("platform_settings").select("*").in("key", ["allow_free_plan", "landing_page_reviews"]).then(({ data }) => {
      if (data) {
        const freePlan = data.find(d => d.key === "allow_free_plan");
        if (freePlan && freePlan.value === "false") setAllowFreePlan(false);

        const reviews = data.find(d => d.key === "landing_page_reviews");
        if (reviews && reviews.value) {
          try {
            const parsed = JSON.parse(reviews.value);
            if (Array.isArray(parsed) && parsed.length > 0) setCustomReviews(parsed);
          } catch (e) {
            console.error("Failed to parse landing page reviews", e);
          }
        }
      }
    });
    
    // Fetch active plans
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-primary/30 selection:text-navy">
      {/* Nav */}
      <PublicHeader />

      {/* Modern SaaS Hero Section matching user screenshot */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#f8fafc] via-[#f5f7fb] to-white pt-12 pb-20 lg:pt-18 lg:pb-28 border-b border-slate-200/70">
        {/* Subtle gradient background orbs matching logo colors */}
        <div className="absolute top-0 right-1/4 -translate-y-12 w-[600px] h-[600px] bg-[#28166f]/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/4 w-[500px] h-[500px] bg-[#e77817]/10 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="mx-auto max-w-7xl px-6 relative z-10 grid lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* Left Column: Headline, Copy & CTAs */}
          <div className="lg:col-span-6 text-left flex flex-col justify-center items-start">
            
            {/* Pill Eyebrow */}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-slate-100/90 border border-slate-200 text-[#28166f] text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-3 sm:mb-5 shadow-xs whitespace-nowrap">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#e77817] shrink-0" />
              <span>SIMPLIFY YOUR BUSINESS &bull; AMPLIFY YOUR GROWTH</span>
            </div>

            {/* Main Headline: Fluid dynamic responsive font sizing by screen size, exactly 2 lines with balanced line gap */}
            <h1 className="flex flex-col gap-[3px] lg:gap-[22px] text-3xl sm:text-4xl md:text-[44px] lg:text-[42px] xl:text-[50px] 2xl:text-[56px] font-black tracking-tight leading-snug text-slate-900 mb-3 sm:mb-5">
              <span className="block sm:whitespace-nowrap">
                Everything you{" "}
                <span className="bg-gradient-to-r from-[#28166f] via-[#7b2cbf] to-[#e77817] bg-clip-text text-transparent">
                  need.
                </span>
              </span>
              <span className="block sm:whitespace-nowrap">
                One smart{" "}
                <span className="bg-gradient-to-r from-[#28166f] via-[#7b2cbf] to-[#e77817] bg-clip-text text-transparent">
                  platform.
                </span>
              </span>
            </h1>

            {/* Subtitle description */}
            <p className="text-sm sm:text-lg lg:text-xl text-slate-600 leading-snug sm:leading-relaxed mb-5 sm:mb-8 max-w-xl font-normal">
              Invoicing, Accounting, CRM, HRMS, Marketing, Feedback, AI Analysis — everything your business need
            </p>

            {/* Enlarged Prominent CTA Button */}
            <div className="flex flex-col sm:flex-row items-center justify-start gap-4 mb-8 w-full sm:w-auto">
              <Button
                size="lg"
                className="h-14 sm:h-15 px-8 sm:px-9 text-base sm:text-lg font-black bg-[#28166f] hover:bg-[#e77817] text-white shadow-xl shadow-[#28166f]/25 hover:shadow-[#e77817]/35 rounded-2xl w-full sm:w-auto transition-all duration-300 hover:scale-[1.03] cursor-pointer"
                asChild
              >
                <a href="#pricing">
                  Start Free <ArrowRight className="ml-2.5 h-5 w-5 stroke-[2.5]" />
                </a>
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-start gap-x-5 gap-y-2 text-xs sm:text-sm font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[#e77817] stroke-[2.5]" /> No Credit Card Required
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[#e77817] stroke-[2.5]" /> Easy Setup
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[#e77817] stroke-[2.5]" /> Trusted by Growing Businesses
              </span>
            </div>

          </div>

          {/* Right Column: Interactive SaaS Software Dashboard Mockup */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end w-full mt-4 lg:mt-0 overflow-hidden sm:overflow-visible px-1 sm:px-0">
            <HeroDashboardMockup />
          </div>

        </div>
      </section>

      {/* Stats / Trust Section */}
      <section className="relative -mt-10 sm:-mt-12 z-20 mx-4 sm:mx-8 lg:mx-auto max-w-6xl">
        <div className="rounded-3xl bg-gradient-to-r from-[#211559] via-[#28166f] to-[#1c1248] border border-white/15 shadow-2xl overflow-hidden relative py-7 px-6">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-80 h-80 bg-[#e77817]/20 rounded-full blur-3xl pointer-events-none" />

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 md:gap-y-0 text-center md:divide-x divide-white/10 relative z-10">
            {[
              { v: "100+", l: L.trust_users, c: "text-[#ffaa47]" },
              { v: "₹23 Cr+", l: L.trust_invoices, c: "text-[#e77817]" },
              { v: "4.8 ★", l: L.trust_rating, c: "text-amber-400" },
              { v: "99.99%", l: L.trust_uptime, c: "text-blue-400" },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center justify-center px-3">
                <div className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight mb-1 ${s.c}`}>{s.v}</div>
                <div className="text-[11px] sm:text-xs font-semibold text-slate-300 uppercase tracking-wider">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features - Everything You Need to Grow */}
      <section id="features" className="pt-20 pb-10 bg-slate-50/40 border-t border-slate-100 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-[#28166f]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-[#e77817]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-7xl px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#28166f] bg-[#28166f]/10 border border-[#28166f]/20 px-4 py-1.5 rounded-full mb-4">
              POWERFUL FEATURES
            </span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 mb-4">
              Everything You Need to Grow
            </h2>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              All essential business tools together, so you can save time, reduce complexity and focus on what matters most — your growth
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {growthFeatures.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  onClick={() => {
                    if (f.route) {
                      navigate(f.route);
                    }
                  }}
                  className={`p-4 sm:p-5 rounded-2xl border ${f.cardBg} transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex items-center gap-4 group cursor-pointer`}
                >
                  <div className={`w-12 h-12 rounded-full ${f.iconBg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-all duration-300 shadow-2xs`}>
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-slate-900 mb-0.5 group-hover:text-white transition-colors duration-300">
                      {f.title}
                    </h3>
                    <p className="text-xs sm:text-[13px] text-slate-500 group-hover:text-white/95 leading-snug transition-colors duration-300">
                      {f.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* WhatsApp & Compliance highlight */}
      <section className="py-14 sm:py-16 bg-navy relative overflow-hidden text-white">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#e77817]/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="mx-auto max-w-6xl px-6 grid md:grid-cols-2 gap-10 lg:gap-14 items-center relative z-10">
          <div>
            <h2 className="text-[1.35rem] sm:text-3xl md:text-[1.85rem] lg:text-[2.15rem] xl:text-[2.45rem] font-black tracking-tight text-white !text-white mb-5 leading-snug">
              {lang === "hi" ? (
                <>
                  <span className="whitespace-nowrap inline-block">बिल भेजें।</span>
                  <br />
                  <span className="whitespace-nowrap inline-block pt-[3px] lg:pt-[22px] text-[#ff9438]">2x तेज़ पेमेंट पाएं।</span>
                </>
              ) : (
                <>
                  <span className="whitespace-nowrap inline-block">Send invoices instantly.</span>
                  <br />
                  <span className="whitespace-nowrap inline-block pt-[3px] lg:pt-[22px] text-[#ff9438]">Get paid 2x faster.</span>
                </>
              )}
            </h2>
            <p className="text-base sm:text-lg text-slate-200 leading-[1.7] mb-6 font-normal">{L.wa_sub}</p>
            
            {/* 6 Compliance & GST Points with increased font size */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
              {complianceBadges.map((b, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 hover:border-[#e77817]/40 hover:bg-white/10 transition-all duration-200">
                  <div className="h-5 w-5 rounded-full bg-[#e77817]/20 border border-[#e77817]/30 text-[#e77817] grid place-items-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span className="text-white font-semibold text-sm sm:text-[15px] leading-snug">{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Real WhatsApp-style mobile mockup - 20% compact height */}
          <div className="relative mx-auto w-full max-w-[225px] sm:max-w-[235px]">
            <div className="rounded-[1.75rem] border-[7px] border-slate-900 bg-slate-900 overflow-hidden shadow-2xl shadow-black/60 relative" style={{aspectRatio: '9/16'}}>
              {/* Notch */}
              <div className="absolute top-0 inset-x-0 h-4 bg-slate-900 z-30 flex items-end justify-center pb-0.5">
                <div className="w-16 h-2 bg-slate-900 rounded-b-lg"></div>
              </div>
              {/* WhatsApp wallpaper bg */}
              <div className="absolute inset-0 bg-[#e5ddd5]">
                <div className="absolute inset-0 opacity-[0.06]" style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Ccircle cx='40' cy='40' r='30' fill='none' stroke='%23000' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: '40px'}}></div>
              </div>

              <div className="absolute inset-0 flex flex-col">
                {/* Status bar */}
                <div className="bg-[#28166f] pt-3.5 pb-0 z-20">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5">
                    <div className="h-6 w-6 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
                      <span className="text-white font-black text-[10px]">A</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-[10.5px] leading-none">Aassay Biz</div>
                      <div className="text-[8px] text-white/80 mt-0.5">online</div>
                    </div>
                    <div className="flex gap-1.5 text-white/80">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    </div>
                  </div>
                </div>

                {/* Chat area — scrollable */}
                <div className="flex-1 overflow-y-auto px-1.5 py-1.5 flex flex-col justify-end gap-1">
                  {/* Date badge */}
                  <div className="flex justify-center mb-0.5">
                    <span className="bg-white/70 text-slate-500 text-[7px] px-1.5 py-0.5 rounded-full">TODAY</span>
                  </div>

                  {/* Incoming: greeting */}
                  <div className="flex items-end gap-1 max-w-[84%]">
                    <div className="bg-white rounded-lg rounded-tl-none shadow-sm px-1.5 py-1 text-[8.5px] text-slate-800 relative leading-snug">
                      Hi! Mera invoice ready hai kya? 🙏
                      <span className="text-[7px] text-slate-400 ml-1 float-right mt-0.5">10:30</span>
                    </div>
                  </div>

                  {/* Outgoing: yes sharing now */}
                  <div className="flex justify-end">
                    <div className="bg-[#e77817]/15 rounded-lg rounded-tr-none shadow-sm px-1.5 py-1 text-[8.5px] text-slate-800 max-w-[84%] leading-snug">
                      Ji bilkul! Abhi bhejta hoon 👇
                      <div className="flex justify-end items-center gap-0.5 mt-0.5">
                        <span className="text-[7px] text-slate-400">10:31</span>
                        <svg className="h-2 w-2 text-blue-500" viewBox="0 0 16 11" fill="currentColor"><path d="M11.071.653a.75.75 0 010 1.06L4.5 8.284 1.449 5.233a.75.75 0 00-1.06 1.06l3.64 3.641a.75.75 0 001.06 0l7.102-7.22a.75.75 0 000-1.061.75.75 0 00-1.12 0z"/><path d="M15.071.653a.75.75 0 010 1.06L8.5 8.284l-.53-.53 6.04-6.041a.75.75 0 011.06-.06z"/></svg>
                      </div>
                    </div>
                  </div>

                  {/* Outgoing: PDF invoice card */}
                  <div className="flex justify-end">
                    <div className="bg-[#e77817]/15 rounded-lg rounded-tr-none shadow-sm text-[8.5px] max-w-[90%] overflow-hidden">
                      <div className="bg-white/60 px-1.5 py-1 flex items-center gap-1">
                        <div className="bg-[#e77817] p-0.5 rounded shrink-0"><FileText className="h-2.5 w-2.5 text-white" /></div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-700 text-[8px] truncate">INV-2026-0184.pdf</div>
                          <div className="text-[7px] text-slate-400">2 Pages · 245 KB</div>
                        </div>
                      </div>
                      <div className="px-1.5 py-1">
                        <div className="font-black text-slate-800 text-[10.5px]">₹24,750</div>
                        <div className="bg-[#e77817] text-white text-[7.5px] font-bold text-center py-0.5 rounded mt-0.5">Pay via UPI ➜</div>
                      </div>
                      <div className="flex justify-end px-1.5 pb-0.5">
                        <span className="text-[7px] text-slate-400">10:31</span>
                      </div>
                    </div>
                  </div>

                  {/* Incoming: payment done */}
                  <div className="flex items-end gap-1 max-w-[84%]">
                    <div className="bg-white rounded-lg rounded-tl-none shadow-sm px-1.5 py-1 text-[8.5px] text-slate-800 leading-snug">
                      Payment kar diya! Thanks ✅
                      <span className="text-[7px] text-slate-400 ml-1 float-right mt-0.5">10:42</span>
                    </div>
                  </div>
                </div>

                {/* WhatsApp input bar */}
                <div className="bg-[#f0f0f0] flex items-center gap-1 px-1.5 py-1 z-20">
                  <div className="flex-1 bg-white rounded-full px-2.5 py-0.5 text-[8px] text-slate-400 flex items-center">
                    Type a message
                  </div>
                  <div className="h-5 w-5 rounded-full bg-[#e77817] flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      
      
      {/* ── HR SECTION ── */}
      <section className="w-full py-14 sm:py-16 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 grid md:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* LEFT: Attendance Portal UI Illustration */}
          <div className="order-2 md:order-1 flex items-center justify-center">
            <div className="w-full max-w-[520px] bg-white rounded-[1.75rem] shadow-2xl overflow-hidden border border-slate-200/30">
              <div className="bg-[#28166f] px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="text-white font-black text-base tracking-tight">Mark Your Attendance</div>
                  <div className="text-blue-200 text-xs mt-0.5">Today · Tuesday, 16 Sep 2026</div>
                </div>
                <div className="flex items-center gap-2 bg-[#e77817]/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-[#ffaa47] animate-pulse" />
                  Live Tracking
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <div className="grid grid-cols-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">
                  <span>Employee</span>
                  <span className="text-center">Status</span>
                  <span className="text-center">In Time</span>
                  <span className="text-right">Method</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {hrEmployees.map((emp, i) => (
                    <div key={i} className="grid grid-cols-4 items-center bg-white rounded-lg px-3 py-2.5 shadow-sm border border-slate-100">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 text-xs truncate">{emp.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{emp.role}</div>
                      </div>
                      <div className="flex justify-center">
                        <span className={"text-[10px] font-black text-white px-2 py-0.5 rounded-md " + emp.color}>{emp.status}</span>
                      </div>
                      <div className="text-center text-xs font-mono text-slate-600 font-semibold">{emp.time}</div>
                      <div className="flex justify-end">
                        {emp.status !== "A" ? (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Fingerprint className="w-3 h-3 text-[#28166f]" /> GPS
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#e77817] font-semibold">Absent</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-slate-100 bg-white">
                <div className="px-4 py-3 text-center">
                  <div className="text-lg font-black text-[#e77817]">24</div>
                  <div className="text-[10px] text-slate-500 font-semibold">Present Days</div>
                </div>
                <div className="px-4 py-3 text-center">
                  <div className="text-lg font-black text-[#28166f]">₹42,500</div>
                  <div className="text-[10px] text-slate-500 font-semibold">Net Salary</div>
                </div>
                <div className="px-4 py-3 text-center">
                  <div className="text-lg font-black text-[#e77817]">3</div>
                  <div className="text-[10px] text-slate-500 font-semibold">Leaves Left</div>
                </div>
              </div>
            </div>
          </div>
          {/* RIGHT: Copy */}
          <div className="order-1 md:order-2 flex flex-col justify-center">
            <h2 className="text-[1.35rem] sm:text-3xl md:text-[1.85rem] lg:text-[2.15rem] xl:text-[2.45rem] font-black tracking-tight text-slate-900 mb-5 leading-snug">
              <span className="whitespace-nowrap inline-block">Track Attendance.</span>
              <br />
              <span className="whitespace-nowrap inline-block pt-[3px] lg:pt-[22px] text-[#28166f]">Run Payroll in 60 Seconds.</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-600 leading-[1.7] mb-6 font-normal">
              Manage real-time GPS attendance, shift schedules,
              leave approvals, smart payroll, and instant WhatsApp payslips
              — all in one place
            </p>
            {/* 6 Capability Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5 mb-8">
              {hrBadges.map((b, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-100/80 border border-slate-200 hover:border-[#28166f]/40 hover:bg-[#28166f]/5 transition-all duration-200 group">
                  <div className="h-5 w-5 rounded-full bg-[#28166f]/15 border border-[#28166f]/30 text-[#28166f] grid place-items-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span className="text-slate-800 font-semibold text-sm sm:text-[15px] leading-snug">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CRM SECTION ── */}
      <section className="w-full py-14 sm:py-16 bg-[#0f0b2e]">
        <div className="mx-auto max-w-6xl px-6 grid md:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* LEFT: Copy */}
          <div className="flex flex-col justify-center">
            <h2 className="text-[1.35rem] sm:text-3xl md:text-[1.85rem] lg:text-[2.15rem] xl:text-[2.45rem] font-black tracking-tight text-white !text-white mb-5 leading-snug">
              <span className="whitespace-nowrap inline-block">Capture Every Lead.</span>
              <br />
              <span className="whitespace-nowrap inline-block pt-[3px] lg:pt-[22px] text-[#ff9438]">Close Deals 3x Faster.</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-200 leading-[1.7] mb-6 font-normal">
              From lead capture to deal close — manage your entire sales funnel with
              visual Kanban pipelines, automated WhatsApp follow-ups, and
              real-time deal stage tracking
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5 mb-8">
              {crmBadges.map((b, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 hover:border-[#e77817]/40 hover:bg-white/10 transition-all duration-200 group">
                  <div className="h-5 w-5 rounded-full bg-[#e77817]/20 border border-[#e77817]/30 text-[#e77817] grid place-items-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span className="text-white font-semibold text-sm sm:text-[15px] leading-snug">{b}</span>
                </div>
              ))}
            </div>
          </div>
          {/* RIGHT: CRM Pipeline Illustration */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-[520px] bg-white rounded-[1.75rem] shadow-2xl overflow-hidden border border-slate-200">
              <div className="bg-[#e77817] px-5 py-3.5 flex items-center justify-between">
                <div>
                  <div className="text-white font-black text-base tracking-tight">Sales Pipeline</div>
                  <div className="text-orange-100 text-xs mt-0.5">28 Active Deals · ₹24.8L in Pipeline</div>
                </div>
                <div className="text-right">
                  <div className="text-white/70 text-[10px] font-semibold">This Month</div>
                  <div className="text-white font-black text-base">₹9.4L Closed</div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-0 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50">
                {crmPipeline.map((col, ci) => (
                  <div key={ci} className="flex flex-col">
                    <div className="px-2.5 py-2 border-b border-slate-100 bg-white flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-700 leading-tight">{col.stage}</span>
                      <span className={"text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full " + col.color}>{col.count}</span>
                    </div>
                    <div className="p-1.5 flex flex-col gap-1.5 bg-slate-50 min-h-[100px]">
                      {col.leads.map((lead, li) => (
                        <div key={li} className={"bg-white rounded-lg px-2 py-1.5 shadow-sm border " + (lead.hot ? "border-orange-300" : "border-slate-100")}>
                          <div className="text-[9.5px] font-bold text-slate-800 leading-tight truncate">{lead.name}</div>
                          <div className="text-[9px] text-slate-500 font-semibold">{lead.val}</div>
                          {lead.hot && <div className="text-[8px] text-orange-500 font-bold mt-0.5">🔥 Hot</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-white">
                <div className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2.5">Today's Meetings & Follow-ups</div>
                <div className="flex flex-col gap-2">
                  {crmUpcoming.map((item, i) => (
                    <div key={i} className={"flex items-center gap-3 rounded-xl px-3 py-2 border-l-4 " + item.color}>
                      <div className="shrink-0 text-center">
                        <div className="text-[10px] font-black text-slate-700">{item.time}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">{item.name}</div>
                        <div className="text-[10px] text-slate-500">{item.type}</div>
                      </div>
                      <span className="text-[9px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full shrink-0">{item.tag}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50 border-t border-slate-100">
                <div className="px-3 py-2.5 text-center">
                  <div className="text-sm font-black text-[#28166f]">28</div>
                  <div className="text-[9px] text-slate-500 font-semibold">Active Leads</div>
                </div>
                <div className="px-3 py-2.5 text-center">
                  <div className="text-sm font-black text-[#e77817]">3x</div>
                  <div className="text-[9px] text-slate-500 font-semibold">Faster Closing</div>
                </div>
                <div className="px-3 py-2.5 text-center">
                  <div className="text-sm font-black text-[#e77817]">0%</div>
                  <div className="text-[9px] text-slate-500 font-semibold">Missed Follow-ups</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARKETING SECTION ── */}
      <section className="w-full py-14 sm:py-16 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 grid md:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* LEFT: Marketing Studio UI Illustration */}
          <div className="order-2 md:order-1 flex items-center justify-center">
            <div className="w-full max-w-[520px] bg-white rounded-[1.75rem] shadow-2xl overflow-hidden border border-slate-200/30">
              <div className="bg-gradient-to-r from-[#28166f] to-[#e77817] px-5 py-3.5 flex items-center justify-between">
                <div>
                  <div className="text-white font-black text-base tracking-tight">Promotion Studio</div>
                  <div className="text-white/70 text-xs mt-0.5">1,250 customers · Last sent 2 hrs ago</div>
                </div>
                <div className="flex items-center gap-1.5 bg-white/20 border border-white/30 text-white text-xs font-bold px-3 py-1 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Active
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-b border-slate-100">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">Festive Poster Templates</div>
                <div className="grid grid-cols-3 gap-2.5">
                  {mktPosterColors.map((grad, i) => (
                    <div key={i} className={"rounded-xl overflow-hidden bg-gradient-to-br " + grad + " p-3 text-center relative cursor-pointer hover:scale-105 transition-transform shadow-md"}>
                      <div className="text-[9px] font-black uppercase text-white/80 tracking-wider">
                        {i === 0 ? "Sharma Electronics" : i === 1 ? "Fashion Hub" : "Kapoor Textiles"}
                      </div>
                      <div className="text-sm font-black text-white mt-0.5 leading-tight">{mktPosterTitles[i]}</div>
                      <div className="text-[10px] font-black text-white/90 mt-1 bg-black/20 rounded px-1.5 py-0.5">{mktPosterDisc[i]}</div>
                      {i === 0 && (
                        <div className="absolute top-1 right-1 bg-white/20 border border-white/40 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">Live</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-4 pt-3 pb-2 bg-white">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">Recent Campaigns</div>
                <div className="flex flex-col gap-1.5">
                  {mktCampaigns.map((c, i) => (
                    <div key={i} className="grid grid-cols-5 items-center gap-1 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100 text-[10px]">
                      <div className="col-span-2 min-w-0">
                        <div className="font-bold text-slate-800 truncate">{c.name}</div>
                        <div className="text-slate-400 truncate">{c.sent} sent</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-slate-700">{Math.round(c.opened / c.sent * 100)}%</div>
                        <div className="text-slate-400">Open</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-[#e77817]">{c.revenue}</div>
                        <div className="text-slate-400">Revenue</div>
                      </div>
                      <div className="flex justify-end">
                        <span className={"text-white text-[8px] font-bold px-2 py-0.5 rounded-full " + c.badge}>{c.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50 border-t border-slate-100">
                <div className="px-3 py-2.5 text-center">
                  <div className="text-sm font-black text-[#e77817]">98%</div>
                  <div className="text-[9px] text-slate-500 font-semibold">Open Rate</div>
                </div>
                <div className="px-3 py-2.5 text-center">
                  <div className="text-sm font-black text-[#e77817]">40%+</div>
                  <div className="text-[9px] text-slate-500 font-semibold">Repeat Orders</div>
                </div>
                <div className="px-3 py-2.5 text-center">
                  <div className="text-sm font-black text-[#28166f]">100+</div>
                  <div className="text-[9px] text-slate-500 font-semibold">Poster Templates</div>
                </div>
              </div>
            </div>
          </div>
          {/* RIGHT: Copy */}
          <div className="order-1 md:order-2 flex flex-col justify-center">
            <h2 className="text-[1.35rem] sm:text-3xl md:text-[1.85rem] lg:text-[2.15rem] xl:text-[2.45rem] font-black tracking-tight text-slate-900 mb-5 leading-snug">
              <span className="whitespace-nowrap inline-block">Reach 10,000+ Customers.</span>
              <br />
              <span className="whitespace-nowrap inline-block pt-[3px] lg:pt-[22px] text-[#28166f]">Boost Repeat Sales by 40%.</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-600 leading-[1.7] mb-6 font-normal">
              Turn your customer list into a revenue machine. Create branded
              WhatsApp campaigns, auto-generate festive posters with your logo,
              and launch promotional campaigns — no designer needed
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5 mb-8">
              {mktBadges.map((b, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-100/80 border border-slate-200 hover:border-[#28166f]/40 hover:bg-[#28166f]/5 transition-all duration-200 group">
                  <div className="h-5 w-5 rounded-full bg-[#28166f]/15 border border-[#28166f]/30 text-[#28166f] grid place-items-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span className="text-slate-800 font-semibold text-sm sm:text-[15px] leading-snug">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

{/* Pricing */}
      <section id="pricing" className="pt-24 pb-6 bg-[#fafbfc] relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 gap-2 py-1.5 px-4 bg-primary/10 text-primary hover:bg-primary/20 border-0 rounded-full font-bold shadow-xs inline-flex">
              <Zap className="h-4 w-4" /> CHOOSE YOUR PLANS
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 mb-3">{L.pricing_title}</h2>
            <p className="text-sm sm:text-base text-slate-500 max-w-2xl mx-auto">
              Select one or more plans for your business. Mix and match exactly what you need
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

          {(() => {
            const togglePlan = (planName: string) => {
              setSelectedPlans(prev => 
                prev.includes(planName) ? prev.filter(n => n !== planName) : [...prev, planName]
              );
            };

            const isYearly = billingCycle === "yearly";
            const isSuiteSelected = selectedPlans.includes("suite");
            const finalSelected = new Set(selectedPlans);

            // Calculate total based on fixed UI plan prices
            let totalAmount = 0;
            if (finalSelected.has("suite")) {
              totalAmount = isYearly ? 20388 : 1999;
              if (platformExtra > 0) {
                totalAmount += platformExtra * (isYearly ? Math.round(99 * 12 * 0.83) : 99);
              }
              if (crmExtra > 0) {
                totalAmount += crmExtra * (isYearly ? Math.round(999 * 12 * 0.83) : 999);
              }
            } else {
              if (finalSelected.has("accounting")) totalAmount += isYearly ? 5988 : 599;
              if (finalSelected.has("hr")) totalAmount += isYearly ? 5988 : 599;
              if (finalSelected.has("crm")) totalAmount += isYearly ? 5988 : 599;
              if (finalSelected.has("promotion")) totalAmount += isYearly ? 5988 : 599;
              if (finalSelected.size > 0 && platformExtra > 0) {
                totalAmount += platformExtra * (isYearly ? Math.round(99 * 12 * 0.83) : 99);
              }
              if (finalSelected.has("hr") && hrExtra > 0) {
                totalAmount += hrExtra * (isYearly ? Math.round(29 * 12 * 0.83) : 29);
              }
              if (finalSelected.has("crm") && crmExtra > 0) {
                totalAmount += crmExtra * (isYearly ? Math.round(999 * 12 * 0.83) : 999);
              }
            }

            return (
              <>
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
                            <div className="flex items-center justify-between w-full bg-orange-50/50 p-2 rounded-lg border border-orange-100/50 mt-2" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-[#e77817] shrink-0" />
                                <span className="text-slate-700 font-semibold">+ Additional Platform Access (₹99/mo)</span>
                              </div>
                              <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-md px-1.5 py-1 shadow-sm">
                                <button onClick={(e) => { e.stopPropagation(); setPlatformExtra(Math.max(0, platformExtra - 1)); }} className="text-slate-400 hover:text-slate-700 transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                                <span className="font-bold text-sm w-5 text-center text-slate-800">{platformExtra}</span>
                                <button onClick={(e) => { e.stopPropagation(); setPlatformExtra(platformExtra + 1); }} className="text-slate-400 hover:text-slate-700 transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Button */}
                        <div className="mt-auto pt-2 flex justify-end">
                          <Link
                            to={`/register?plan=accounting&billing=${billingCycle}&hr=${hrExtra}&plat=${platformExtra}`}
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
                              <span className="text-3xl font-black text-slate-900">{`₹${getPlanPrice(599, 5988, true)}`}</span>
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
                              <span>25 Employee Attendance</span>
                            </div>
                            
                            <div className="flex items-center justify-between w-full bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50 mt-1" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                 <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                                 <span className="text-slate-700 font-semibold">+ Extra Employee (₹29/mo)</span>
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
                            <div className="flex items-center justify-between w-full bg-orange-50/50 p-2 rounded-lg border border-orange-100/50 mt-2" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-[#e77817] shrink-0" />
                                <span className="text-slate-700 font-semibold">+ Additional Platform Access (₹99/mo)</span>
                              </div>
                              <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-md px-1.5 py-1 shadow-sm">
                                <button onClick={(e) => { e.stopPropagation(); setPlatformExtra(Math.max(0, platformExtra - 1)); }} className="text-slate-400 hover:text-slate-700 transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                                <span className="font-bold text-sm w-5 text-center text-slate-800">{platformExtra}</span>
                                <button onClick={(e) => { e.stopPropagation(); setPlatformExtra(platformExtra + 1); }} className="text-slate-400 hover:text-slate-700 transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Button */}
                        <div className="mt-auto pt-2 flex justify-end">
                          <Link
                            to={`/register?plan=hr&billing=${billingCycle}`}
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
                                <span className="text-slate-800 font-semibold text-xs sm:text-[13px]">+ Extra CRM Member (₹999/mo)</span>
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
                            <div className="flex items-center justify-between w-full bg-orange-50/50 p-2 rounded-lg border border-orange-100/50 mt-1" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-[#e77817] shrink-0" />
                                <span className="text-slate-700 font-semibold text-xs sm:text-[13px]">+ Additional Platform Access (₹99/mo)</span>
                              </div>
                              <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-md px-1.5 py-1 shadow-sm">
                                <button onClick={(e) => { e.stopPropagation(); setPlatformExtra(Math.max(0, platformExtra - 1)); }} className="text-slate-400 hover:text-slate-700 transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                                <span className="font-bold text-sm w-5 text-center text-slate-800">{platformExtra}</span>
                                <button onClick={(e) => { e.stopPropagation(); setPlatformExtra(platformExtra + 1); }} className="text-slate-400 hover:text-slate-700 transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Button */}
                        <div className="mt-auto pt-2 flex justify-end">
                          <Link
                            to={`/register?plan=crm&billing=${billingCycle}${platformExtra > 0 ? `&plat=${platformExtra}` : ''}${crmExtra > 0 ? `&crm=${crmExtra}` : ''}`}
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
                            <div className="flex items-center justify-between w-full bg-orange-50/50 p-2 rounded-lg border border-orange-100/50 mt-2" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-[#e77817] shrink-0" />
                                <span className="text-slate-700 font-semibold">+ Additional Platform Access (₹99/mo)</span>
                              </div>
                              <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-md px-1.5 py-1 shadow-sm">
                                <button onClick={(e) => { e.stopPropagation(); setPlatformExtra(Math.max(0, platformExtra - 1)); }} className="text-slate-400 hover:text-slate-700 transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                                <span className="font-bold text-sm w-5 text-center text-slate-800">{platformExtra}</span>
                                <button onClick={(e) => { e.stopPropagation(); setPlatformExtra(platformExtra + 1); }} className="text-slate-400 hover:text-slate-700 transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                              </div>
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

                        {/* Middle: 3 Feature Points */}
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
                            <span>CRM Portal: 2 Sales Team Logins (Extra @ ₹999/mo)</span>
                          </div>
                          <div className="flex items-center justify-between max-w-md bg-blue-50/50 p-2 rounded-lg border border-blue-100/50" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-blue-600 shrink-0" />
                              <span className="text-slate-700 font-semibold text-xs sm:text-[13px]">+ Additional CRM Sales Team (₹999/mo)</span>
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
                          <div className="flex items-center justify-between max-w-md bg-orange-50/50 p-2 rounded-lg border border-orange-100/50" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-[#e77817] shrink-0" />
                              <span className="text-slate-700 font-semibold text-xs sm:text-[13px]">+ Additional Platform Access (₹99/mo)</span>
                            </div>
                            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-md px-1.5 py-1 shadow-sm">
                              <button onClick={(e) => { e.stopPropagation(); setPlatformExtra(Math.max(0, platformExtra - 1)); }} className="text-slate-400 hover:text-slate-700 transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                              <span className="font-bold text-sm w-5 text-center text-slate-800">{platformExtra}</span>
                              <button onClick={(e) => { e.stopPropagation(); setPlatformExtra(platformExtra + 1); }} className="text-slate-400 hover:text-slate-700 transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        </div>

                        {/* Right: Solid Action Button */}
                        <div className="flex items-center justify-end lg:border-l lg:border-slate-200 lg:pl-8">
                          <Link
                            to={`/register?plan=suite&billing=${billingCycle}${platformExtra > 0 ? `&plat=${platformExtra}` : ''}${crmExtra > 0 ? `&crm=${crmExtra}` : ''}`}
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
                {finalSelected.size > 0 && (
                  <div className="sticky bottom-6 z-40 animate-in slide-in-from-bottom-10 fade-in duration-300 mx-4 md:mx-auto max-w-4xl mt-8">
                    <div className="bg-navy/95 backdrop-blur-xl border border-white/10 rounded-3xl md:rounded-full shadow-2xl shadow-navy/50 p-4 md:p-3 md:pl-8 flex flex-col md:flex-row items-center justify-between gap-5 md:gap-6 w-full">
                      <div className="flex items-center gap-6">
                        <div className="bg-white/10 h-12 w-12 rounded-full flex items-center justify-center">
                          <span className="text-xl font-bold text-white">{finalSelected.size}</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-300 uppercase tracking-wider">Total Selected</div>
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
                        <Link to={`/register?plan=${Array.from(finalSelected).join(",")}&billing=${billingCycle}&hr=${hrExtra}&plat=${platformExtra}${crmExtra > 0 ? `&crm=${crmExtra}` : ''}`}>
                          Proceed to Checkout <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </section>

      {/* Optimize Your Business with Us - Banner Box (Slim & Compact 50% Height) */}
      <section className="pt-0 pb-6 sm:pb-8 bg-[#fafbfc] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-r from-[#1c0d58] via-[#4a1460] to-[#e77817] px-5 py-2.5 sm:px-8 sm:py-3 lg:px-10 lg:py-3 shadow-lg border border-white/10 flex flex-col lg:flex-row items-center justify-between gap-3 lg:gap-6">
            
            {/* Ambient background curves & glowing rings */}
            <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full border border-white/10 pointer-events-none" />
            <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full border border-white/15 pointer-events-none" />
            <div className="absolute right-6 top-4 w-40 h-40 rounded-full border border-white/20 pointer-events-none" />
            <div className="absolute top-1/2 right-20 -translate-y-1/2 w-48 h-48 bg-[#ff781f]/25 rounded-full blur-[50px] pointer-events-none" />

            {/* Left Content: Title + Feature Badges (Matched Width Edge-to-Edge) */}
            <div className="relative z-10 w-fit max-w-full">
              <h2 className="text-base sm:text-xl md:text-2xl lg:text-[28px] xl:text-[32px] font-black text-white leading-none tracking-normal mb-2.5 sm:mb-3 text-center lg:text-left whitespace-nowrap">
                Optimize your business <span className="text-[#ff8522]">with us</span>
              </h2>

              {/* Feature Icon Badges Row (stretches to exact width of the headline) */}
              <div className="w-full flex items-center justify-between">
                {/* 1. Invoicing */}
                <div className="flex flex-col items-center gap-1 text-center shrink-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-sky-500 to-cyan-400 p-[1.5px] shadow-sm flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-sky-500 flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-medium text-white/95">Invoicing</span>
                </div>

                <div className="h-4 sm:h-5 w-px bg-white/25 hidden sm:block shrink-0" />

                {/* 2. Accounting */}
                <div className="flex flex-col items-center gap-1 text-center shrink-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-purple-600 to-fuchsia-400 p-[1.5px] shadow-sm flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-purple-600 flex items-center justify-center">
                      <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-medium text-white/95">Accounting</span>
                </div>

                <div className="h-4 sm:h-5 w-px bg-white/25 hidden sm:block shrink-0" />

                {/* 3. CRM */}
                <div className="flex flex-col items-center gap-1 text-center shrink-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-pink-600 to-rose-400 p-[1.5px] shadow-sm flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-pink-600 flex items-center justify-center">
                      <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-medium text-white/95">CRM</span>
                </div>

                <div className="h-4 sm:h-5 w-px bg-white/25 hidden sm:block shrink-0" />

                {/* 4. HRMS */}
                <div className="flex flex-col items-center gap-1 text-center shrink-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 p-[1.5px] shadow-sm flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-emerald-600 flex items-center justify-center">
                      <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-medium text-white/95">HRMS</span>
                </div>

                <div className="h-4 sm:h-5 w-px bg-white/25 hidden sm:block shrink-0" />

                {/* 5. Marketing */}
                <div className="flex flex-col items-center gap-1 text-center shrink-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-orange-600 to-amber-400 p-[1.5px] shadow-sm flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-orange-600 flex items-center justify-center">
                      <Megaphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-medium text-white/95">Marketing</span>
                </div>

                <div className="h-4 sm:h-5 w-px bg-white/25 hidden sm:block shrink-0" />

                {/* 6. Feedback */}
                <div className="flex flex-col items-center gap-1 text-center shrink-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 p-[1.5px] shadow-sm flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-amber-500 flex items-center justify-center">
                      <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white fill-white" />
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-medium text-white/95">Feedback</span>
                </div>

                <div className="h-4 sm:h-5 w-px bg-white/25 hidden sm:block shrink-0" />

                {/* 7. AI Analysis */}
                <div className="flex flex-col items-center gap-1 text-center shrink-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-400 p-[1.5px] shadow-sm flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-indigo-500 flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-medium text-white/95">AI Analysis</span>
                </div>
              </div>
            </div>

            {/* Right Content: Stretched Pill Contact Us CTA Button */}
            <div className="relative z-10 shrink-0 lg:mr-6 xl:mr-10">
              <Link
                to="/contact"
                className="group flex items-center justify-between w-[210px] sm:w-[240px] lg:w-[260px] bg-white hover:bg-slate-50 text-[#1b0d59] font-black text-xs sm:text-sm lg:text-base pl-5 sm:pl-6 pr-2 py-2 sm:py-2.5 rounded-full shadow-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all duration-300 hover:scale-[1.02]"
              >
                <span>Contact Us</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-[#e77817] to-[#ff8522] flex items-center justify-center text-white shadow-xs group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-[2.5]" />
                </div>
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter />

      {/* Book a Demo Modal */}
      <BookDemoDialog open={isDemoDialogOpen} onOpenChange={setIsDemoDialogOpen} />
      
      {/* AI Chatbot Widget */}
      <AIChatWidget />
    </div>
  );
}
