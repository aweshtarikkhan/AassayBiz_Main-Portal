import { Link } from "react-router-dom";
import logoImg from "@/assets/logo.png";
import { usePlatformSocials, formatSocialUrl } from "@/hooks/use-platform-socials";
import {
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  ArrowRight,
  ChevronRight,
  Headphones,
  Layers,
  Link2,
  Users,
  Monitor,
  Handshake,
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
} from "lucide-react";
import { AassayBizBrand } from "@/components/shared/AassayBizBrand";

export function PublicFooter() {
  const { socials } = usePlatformSocials();
  const phone = (socials?.phone ? socials.phone.replace(/[^0-9]/g, "") : "") || "917413802412";
  const formattedPhone = socials?.phone || "+91 7413802412";

  return (
    <>
      <footer className="relative bg-[#160e3d] text-slate-300 pt-16 pb-12 overflow-hidden border-t border-white/10">
        {/* Subtle background ambient glows matching logo colors */}
        <div className="absolute top-0 left-1/4 -translate-y-1/2 w-96 h-96 bg-[#28166f]/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 translate-y-1/2 w-96 h-96 bg-[#e77817]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-7xl px-6 relative z-10">
          
          {/* Main 4-Column Balanced Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-14 border-b border-white/10">
            
            {/* Column 1: Brand Logo, Trust Box & Social Links (3 cols) */}
            <div className="lg:col-span-3 flex flex-col items-start">
              <Link to="/" className="inline-block p-2.5 px-3.5 bg-white rounded-xl shadow-md mb-5 hover:opacity-95 transition-opacity">
                <img src={logoImg} alt="Aassay Biz" className="h-8 w-auto object-contain" />
              </Link>

              {/* Trust & Security Badge Card */}
              <div className="w-full p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3.5 text-xs mb-6 shadow-inner">
                <div className="flex items-start gap-2.5">
                  <span className="text-xl leading-none select-none">🇮🇳</span>
                  <div>
                    <div className="font-bold text-white text-xs">100% Made in India</div>
                    <div className="text-slate-400 text-[11px] leading-tight mt-0.5">Crafted for Indian business & GST compliance</div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white text-xs">Enterprise Cloud Security</div>
                    <div className="text-slate-400 text-[11px] leading-tight mt-0.5">256-bit SSL encryption & multi-tenant data protection</div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Headphones className="w-4 h-4 text-[#ff9438] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white text-xs">Priority Phone Support</div>
                    <div className="text-slate-400 text-[11px] leading-tight mt-0.5">Mon - Sat: 9:30 AM - 7:00 PM IST</div>
                  </div>
                </div>
              </div>

              {/* Social Channels */}
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  CONNECT WITH US
                </span>
                <div className="flex items-center gap-2.5">
                  <a
                    href={formatSocialUrl("facebook", socials?.facebook) || "https://www.facebook.com/assaybiz"}
                    target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-[#e77817] flex items-center justify-center border border-white/10 hover:border-transparent transition-all duration-300 hover:scale-110 shadow-sm"
                  >
                    <Facebook className="w-4.5 h-4.5 text-white" />
                  </a>
                  <a
                    href={formatSocialUrl("instagram", socials?.instagram) || "https://www.instagram.com/assaybiz"}
                    target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-[#e77817] flex items-center justify-center border border-white/10 hover:border-transparent transition-all duration-300 hover:scale-110 shadow-sm"
                  >
                    <Instagram className="w-4.5 h-4.5 text-white" />
                  </a>
                  <a
                    href={formatSocialUrl("youtube", socials?.youtube) || "https://www.youtube.com/@assaybiz"}
                    target="_blank" rel="noopener noreferrer" aria-label="YouTube"
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-[#e77817] flex items-center justify-center border border-white/10 hover:border-transparent transition-all duration-300 hover:scale-110 shadow-sm"
                  >
                    <Youtube className="w-4.5 h-4.5 text-white" />
                  </a>
                  <a
                    href={formatSocialUrl("linkedin", socials?.linkedin) || "https://www.linkedin.com/company/assaybiz"}
                    target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-[#e77817] flex items-center justify-center border border-white/10 hover:border-transparent transition-all duration-300 hover:scale-110 shadow-sm"
                  >
                    <Linkedin className="w-4.5 h-4.5 text-white" />
                  </a>
                </div>
              </div>
            </div>

            {/* Column 2: Platform Modules (Core Modules) */}
            <div className="lg:col-span-3 flex flex-col items-start">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4 text-[#ff9438]" />
                <h3 className="font-bold text-white text-base tracking-wide">Core Modules</h3>
              </div>
              <ul className="space-y-3.5 text-sm text-slate-300 flex flex-col items-start">
                <li>
                  <a href="/#features" className="group inline-flex items-center gap-2 hover:text-[#ff9438] transition-colors py-0.5">
                    <span>GST Invoicing & E-Way Bill</span>
                    <ChevronRight className="w-4 h-4 text-[#ff9438]/70 group-hover:text-[#ff9438] group-hover:translate-x-1 transition-all shrink-0" />
                  </a>
                </li>
                <li>
                  <a href="/#features" className="group inline-flex items-center gap-2 hover:text-[#ff9438] transition-colors py-0.5">
                    <span>Business Accounting & Ledger</span>
                    <ChevronRight className="w-4 h-4 text-[#ff9438]/70 group-hover:text-[#ff9438] group-hover:translate-x-1 transition-all shrink-0" />
                  </a>
                </li>
                <li>
                  <a href="/#features" className="group inline-flex items-center gap-2 hover:text-[#ff9438] transition-colors py-0.5">
                    <span>Multi-Warehouse Inventory</span>
                    <ChevronRight className="w-4 h-4 text-[#ff9438]/70 group-hover:text-[#ff9438] group-hover:translate-x-1 transition-all shrink-0" />
                  </a>
                </li>
                <li>
                  <a href="/#features" className="group inline-flex items-center gap-2 hover:text-[#ff9438] transition-colors py-0.5">
                    <span>Business HR & Staff Attendance</span>
                    <ChevronRight className="w-4 h-4 text-[#ff9438]/70 group-hover:text-[#ff9438] group-hover:translate-x-1 transition-all shrink-0" />
                  </a>
                </li>
                <li>
                  <a href="/#features" className="group inline-flex items-center gap-2 hover:text-[#ff9438] transition-colors py-0.5">
                    <span>Business CRM & Lead Pipeline</span>
                    <ChevronRight className="w-4 h-4 text-[#ff9438]/70 group-hover:text-[#ff9438] group-hover:translate-x-1 transition-all shrink-0" />
                  </a>
                </li>
                <li>
                  <a href="/#features" className="group inline-flex items-center gap-2 hover:text-[#ff9438] transition-colors py-0.5">
                    <span>Promotion & Festival Posters</span>
                    <ChevronRight className="w-4 h-4 text-[#ff9438]/70 group-hover:text-[#ff9438] group-hover:translate-x-1 transition-all shrink-0" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Quick Links */}
            <div className="lg:col-span-3 flex flex-col items-start">
              <div className="flex items-center gap-2 mb-4">
                <Link2 className="w-4 h-4 text-[#ff9438]" />
                <h3 className="font-bold text-white text-base tracking-wide">Quick Links</h3>
              </div>
              <ul className="space-y-3.5 text-sm text-slate-300 flex flex-col items-start">
                <li>
                  <a href="/#features" className="group inline-flex items-center gap-2 hover:text-[#ff9438] transition-colors py-0.5">
                    <span>Features</span>
                    <ChevronRight className="w-4 h-4 text-[#ff9438]/70 group-hover:text-[#ff9438] group-hover:translate-x-1 transition-all shrink-0" />
                  </a>
                </li>
                <li>
                  <Link to="/pricing" className="group inline-flex items-center gap-2 hover:text-[#ff9438] transition-colors py-0.5">
                    <span>Pricing & Plans</span>
                    <ChevronRight className="w-4 h-4 text-[#ff9438]/70 group-hover:text-[#ff9438] group-hover:translate-x-1 transition-all shrink-0" />
                  </Link>
                </li>
                <li>
                  {socials?.custom_brochure_url ? (
                    <a
                      href={socials.custom_brochure_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-2 hover:text-[#ff9438] transition-colors py-0.5"
                    >
                      <span>Product Brochure (PDF)</span>
                      <ChevronRight className="w-4 h-4 text-[#ff9438]/70 group-hover:text-[#ff9438] group-hover:translate-x-1 transition-all shrink-0" />
                    </a>
                  ) : (
                    <Link to="/brochure" className="group inline-flex items-center gap-2 hover:text-[#ff9438] transition-colors py-0.5">
                      <span>Product Brochure (PDF)</span>
                      <ChevronRight className="w-4 h-4 text-[#ff9438]/70 group-hover:text-[#ff9438] group-hover:translate-x-1 transition-all shrink-0" />
                    </Link>
                  )}
                </li>
                <li>
                  {socials?.custom_pamphlet_url ? (
                    <a
                      href={socials.custom_pamphlet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-2 hover:text-[#ff9438] transition-colors py-0.5"
                    >
                      <span>Marketing Pamphlet (PDF)</span>
                      <ChevronRight className="w-4 h-4 text-[#ff9438]/70 group-hover:text-[#ff9438] group-hover:translate-x-1 transition-all shrink-0" />
                    </a>
                  ) : (
                    <Link to="/pamphlet" className="group inline-flex items-center gap-2 hover:text-[#ff9438] transition-colors py-0.5">
                      <span>Marketing Pamphlet (PDF)</span>
                      <ChevronRight className="w-4 h-4 text-[#ff9438]/70 group-hover:text-[#ff9438] group-hover:translate-x-1 transition-all shrink-0" />
                    </Link>
                  )}
                </li>
                <li>
                  <Link to="/partner-with-us" className="group inline-flex items-center gap-2 hover:text-[#ff9438] transition-colors py-0.5">
                    <span>Partner With Us</span>
                    <ChevronRight className="w-4 h-4 text-[#ff9438]/70 group-hover:text-[#ff9438] group-hover:translate-x-1 transition-all shrink-0" />
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="group inline-flex items-center gap-2 hover:text-[#ff9438] transition-colors py-0.5">
                    <span>Contact Us</span>
                    <ChevronRight className="w-4 h-4 text-[#ff9438]/70 group-hover:text-[#ff9438] group-hover:translate-x-1 transition-all shrink-0" />
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Support & 3 Portal Buttons */}
            <div className="lg:col-span-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Headphones className="w-4 h-4 text-[#ff9438]" />
                  <h3 className="font-bold text-white text-base tracking-wide">Support</h3>
                </div>
                <ul className="space-y-3 text-sm mb-6">
                  <li>
                    <a href={`tel:${phone}`} className="flex items-center gap-3 text-slate-300 hover:text-[#ff9438] transition-colors">
                      <Phone className="w-4 h-4 text-[#ff9438] shrink-0" />
                      <span>{formattedPhone}</span>
                    </a>
                  </li>
                  <li>
                    <a href="mailto:support@aassaybiz.com" className="flex items-center gap-3 text-slate-300 hover:text-[#ff9438] transition-colors">
                      <Mail className="w-4 h-4 text-[#ff9438] shrink-0" />
                      <span>support@aassaybiz.com</span>
                    </a>
                  </li>
                  <li>
                    <div className="flex items-center gap-3 text-slate-300">
                      <MapPin className="w-4 h-4 text-[#ff9438] shrink-0" />
                      <span>Indore, India</span>
                    </div>
                  </li>
                </ul>
              </div>

              {/* 3 Portal & Partner Buttons (Identical dimensions, UI & styling) */}
              <div className="flex flex-col gap-2.5 w-full max-w-[260px]">
                {/* 1. Attendance Portal */}
                <a
                  href="https://attendance.aassaybiz.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-11 px-4 rounded-xl bg-gradient-to-r from-[#e77817] to-[#f28e2b] hover:from-[#d66a0f] hover:to-[#e27e1f] text-white text-xs sm:text-sm font-semibold shadow-md shadow-[#e77817]/25 flex items-center justify-between transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-white shrink-0" />
                    <span>Attendance Portal</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white shrink-0" />
                </a>

                {/* 2. CRM Portal */}
                <a
                  href="https://crm.aassaybiz.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-11 px-4 rounded-xl bg-gradient-to-r from-[#e77817] to-[#f28e2b] hover:from-[#d66a0f] hover:to-[#e27e1f] text-white text-xs sm:text-sm font-semibold shadow-md shadow-[#e77817]/25 flex items-center justify-between transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Monitor className="w-4 h-4 text-white shrink-0" />
                    <span>CRM Portal</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white shrink-0" />
                </a>

                {/* 3. Partner Login */}
                <Link
                  to="/partner-login"
                  className="w-full h-11 px-4 rounded-xl bg-gradient-to-r from-[#e77817] to-[#f28e2b] hover:from-[#d66a0f] hover:to-[#e27e1f] text-white text-xs sm:text-sm font-semibold shadow-md shadow-[#e77817]/25 flex items-center justify-between transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Handshake className="w-4 h-4 text-white shrink-0" />
                    <span>Partner Login</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white shrink-0" />
                </Link>
              </div>
            </div>

          </div>

          {/* Bottom Copyright & Legal Links Bar */}
          <div className="pt-8 flex flex-col xl:flex-row items-center justify-between gap-4 text-xs sm:text-sm">
            <p className="text-slate-400 text-center xl:text-left md:whitespace-nowrap flex items-center justify-center xl:justify-start gap-1 flex-wrap">
              <span>&copy; {new Date().getFullYear()}</span>
              <AassayBizBrand theme="dark" />
              <span>. All Rights Reserved Ensagile Transform Pvt. Ltd. | CIN - U72300MP2025PTC074472</span>
            </p>
            <div className="flex flex-wrap lg:flex-nowrap items-center justify-center gap-2 sm:gap-2.5">
              <Link 
                to="/privacy" 
                className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 hover:border-[#e77817]/50 text-xs font-medium transition-all whitespace-nowrap"
              >
                Privacy Policy
              </Link>
              <Link 
                to="/terms" 
                className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 hover:border-[#e77817]/50 text-xs font-medium transition-all whitespace-nowrap"
              >
                Terms of Service
              </Link>
              <Link 
                to="/refund-policy" 
                className="px-3.5 py-1.5 rounded-lg bg-[#e77817]/15 hover:bg-[#e77817]/30 text-[#ffaa47] hover:text-white border border-[#e77817]/40 text-xs font-semibold transition-all shadow-sm whitespace-nowrap"
              >
                Cancellation & Refund Policy
              </Link>
            </div>
          </div>

        </div>
      </footer>
    </>
  );
}
