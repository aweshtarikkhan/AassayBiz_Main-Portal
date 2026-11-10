import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/app-store";
import { useFeatureStore } from "@/store/feature-store";
import { INDIAN_STATES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/shared/SEO";
import {
  SubscriptionInvoiceData,
  downloadSubscriptionInvoicePDF,
} from "@/lib/subscription-invoice-pdf";
import { sendSubscriptionInvoiceEmail } from "@/lib/subscription-email-service";
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowLeft,
  Download,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Receipt,
  Clock,
  Globe,
  Loader2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
  Tag,
  X
} from "lucide-react";

export interface CheckoutPayload {
  orgId: string;
  targetPlanNames: string[];
  planDisplayName?: string;
  billingCycle: "monthly" | "yearly";
  extraEmployeesToAdd: number;
  extraPlatformEmployeesToAdd: number;
  extraCrmMembersToAdd: number;
  totalEmployeesToSend: number;
  promoCode?: string;
  validCoupon?: any;
  subtotalRupees: number;
  gstRupees: number;
  finalAmountRupees: number;
  finalAmountPaise: number;
  isOnlyAddingExtraEmployees?: boolean;
}

const safeStr = (val: any): string => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    if (val.street || val.address || val.line1) {
      return [val.line1, val.street, val.address].filter(Boolean).join(", ");
    }
    return Object.values(val).filter(v => typeof v === "string").join(", ");
  }
  return String(val);
};

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentOrg, user } = useAppStore();

  // Load checkout payload from location.state or sessionStorage fallback
  const [checkoutData, setCheckoutData] = useState<CheckoutPayload | null>(() => {
    if (location.state && (location.state as CheckoutPayload).finalAmountRupees !== undefined) {
      return location.state as CheckoutPayload;
    }
    try {
      const saved = sessionStorage.getItem("assay_checkout_payload");
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  // Billing form state
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [gstin, setGstin] = useState<string>("");
  const [streetAddress, setStreetAddress] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [pincode, setPincode] = useState<string>("");

  // Coupon / Promo code state
  const [promoCodeInput, setPromoCodeInput] = useState<string>(() => checkoutData?.promoCode || "");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(() => checkoutData?.validCoupon || null);
  const [couponLoading, setCouponLoading] = useState<boolean>(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(() => checkoutData?.validCoupon ? "Coupon code applied" : null);

  // Audit & Consent state (MANDATORY: MUST NOT BE PRE-CHECKED)
  const [clientIp, setClientIp] = useState<string>("Detecting...");
  const [timestamp, setTimestamp] = useState<string>("");
  const [agreeTerms, setAgreeTerms] = useState<boolean>(false);
  const [agreeConsent, setAgreeConsent] = useState<boolean>(false);

  // Processing & Success State
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<SubscriptionInvoiceData | null>(null);

  // 1. Fetch Client IP Address and set Timestamp
  useEffect(() => {
    setTimestamp(new Date().toISOString());

    const fetchIp = async () => {
      try {
        const res = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(4000) });
        const json = await res.json();
        if (json?.ip) {
          setClientIp(String(json.ip));
          return;
        }
      } catch {}

      try {
        const res2 = await fetch("https://icanhazip.com", { signal: AbortSignal.timeout(3000) });
        const text = await res2.text();
        if (text) {
          setClientIp(String(text).trim());
          return;
        }
      } catch {}

      setClientIp("127.0.0.1 (Local / Direct)");
    };

    fetchIp();
  }, []);

  // 2. Prefill user & organization billing info from DB
  useEffect(() => {
    async function prefillBillingData() {
      setLoadingInitial(true);
      try {
        const { data: authUser } = await supabase.auth.getUser();
        const activeUser = authUser?.user || user;

        let profileData: any = null;
        if (activeUser?.id) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", activeUser.id)
            .maybeSingle();
          profileData = prof;
        }

        // Target organization
        const orgIdToLoad = checkoutData?.orgId || currentOrg?.id;
        let orgData = currentOrg;
        if (orgIdToLoad && (!orgData || orgData.id !== orgIdToLoad)) {
          const { data: dbOrg } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", orgIdToLoad)
            .maybeSingle();
          if (dbOrg) orgData = dbOrg;
        }

        // Prefill Company Name (Business / Registered Legal Name)
        const resolvedCompName = orgData?.name || (orgData as any)?.company_name || (orgData as any)?.legal_name || profileData?.company_name || "";
        setCompanyName(safeStr(resolvedCompName));

        // Prefill Full Name (Customer Personal Name - strictly NOT the company name)
        const profileFirstLast = [profileData?.first_name, profileData?.last_name].filter(Boolean).join(" ").trim();
        const metaFirstLast = [activeUser?.user_metadata?.first_name, activeUser?.user_metadata?.last_name].filter(Boolean).join(" ").trim();

        let resolvedName = profileFirstLast ||
                           metaFirstLast ||
                           profileData?.full_name ||
                           profileData?.name ||
                           activeUser?.user_metadata?.full_name ||
                           activeUser?.user_metadata?.name ||
                           "";

        if (!resolvedName && (activeUser?.id || activeUser?.email)) {
          try {
            const { data: emp } = await supabase
              .from("employees")
              .select("name")
              .or(`auth_user_id.eq.${activeUser.id},email.eq.${activeUser.email}`)
              .maybeSingle();
            if (emp?.name) resolvedName = emp.name;
          } catch {}
        }

        // STRICT GUARD: If resolvedName is identical to company name or has corporate tokens, do not use it as personal name
        const compLower = resolvedCompName.trim().toLowerCase();
        const isCorporateToken = (str: string) =>
          /\b(pvt|ltd|limited|private|llp|corp|corporation|inc|incorporated|tech|technologies|technology|infratech|infra|enterprises|enterprise|solutions|solution|services|service|co|company|holdings|agency|studio|industries|industry|firm)\b/i.test(str);

        if (
          resolvedName &&
          (
            (compLower && (
              resolvedName.trim().toLowerCase() === compLower ||
              compLower.includes(resolvedName.trim().toLowerCase()) ||
              resolvedName.trim().toLowerCase().includes(compLower)
            )) ||
            isCorporateToken(resolvedName)
          )
        ) {
          resolvedName = "";
        }

        setFullName(safeStr(resolvedName));

        // Prefill Email
        const resolvedEmail = activeUser?.email || profileData?.email || orgData?.email || "";
        setEmail(safeStr(resolvedEmail));

        // Prefill Phone
        const resolvedPhone = profileData?.phone || activeUser?.phone || orgData?.phone || "";
        setPhone(safeStr(resolvedPhone));

        // Prefill GSTIN
        const resolvedGstin = safeStr((orgData as any)?.tax_number || (orgData as any)?.gst_number || "").toUpperCase();
        setGstin(resolvedGstin);

        // Prefill Address components
        const rawAddr = (orgData as any)?.address || (orgData as any)?.billing_address || "";
        if (rawAddr) {
          setStreetAddress(safeStr(rawAddr));
        }

        if ((orgData as any)?.city) {
          setCity(safeStr((orgData as any).city));
        }

        // Auto-select State from GSTIN first if present
        if (resolvedGstin && resolvedGstin.length >= 2) {
          const stateCode = resolvedGstin.substring(0, 2);
          const matched = INDIAN_STATES.find(s => s.code === stateCode);
          if (matched) {
            setState(matched.name);
          } else if ((orgData as any)?.state) {
            setState(safeStr((orgData as any).state));
          }
        } else if ((orgData as any)?.state) {
          setState(safeStr((orgData as any).state));
        }

        if ((orgData as any)?.pincode) {
          setPincode(safeStr((orgData as any).pincode));
        }
      } catch (err) {
        console.warn("Could not prefill billing details:", err);
      } finally {
        setLoadingInitial(false);
      }
    }

    prefillBillingData();
  }, [currentOrg, user, checkoutData?.orgId]);

  // Safe string sanitization
  const cleanFullName = safeStr(fullName).trim();
  const cleanEmail = safeStr(email).trim();
  const cleanPhone = safeStr(phone).trim();
  const cleanCompanyName = safeStr(companyName).trim();
  const cleanGstin = safeStr(gstin).trim().toUpperCase();
  const cleanStreetAddress = safeStr(streetAddress).trim();
  const cleanCity = safeStr(city).trim();
  const cleanState = safeStr(state).trim();
  const cleanPincode = safeStr(pincode).trim();

  // GSTIN State Auto-Detection & Lock Rule
  const matchedGstinState = cleanGstin.length >= 2 ? INDIAN_STATES.find(s => s.code === cleanGstin.substring(0, 2)) : null;
  const isStateLockedByGstin = Boolean(matchedGstinState);

  const handleGstinChange = (val: string) => {
    const formatted = val.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15);
    setGstin(formatted);
    if (formatted.length >= 2) {
      const code = formatted.substring(0, 2);
      const matched = INDIAN_STATES.find(s => s.code === code);
      if (matched) {
        setState(matched.name);
      }
    }
  };

  // State-Specific GST Tax Evaluation (Supplier is Madhya Pradesh, Code 23)
  const isMadhyaPradesh = Boolean(
    cleanState.toLowerCase().includes("madhya pradesh") ||
    cleanState.toLowerCase() === "mp" ||
    cleanGstin.startsWith("23")
  );

  // Dynamic Pricing Calculation (Supports applied coupon codes)
  const baseSubtotalRupees = checkoutData ? checkoutData.subtotalRupees : 0;
  let discountAmountRupees = 0;
  if (appliedCoupon && baseSubtotalRupees > 0) {
    if (appliedCoupon.type === "percentage") {
      discountAmountRupees = Math.round(((baseSubtotalRupees * Number(appliedCoupon.amount)) / 100) * 100) / 100;
    } else {
      discountAmountRupees = Math.min(baseSubtotalRupees, Number(appliedCoupon.amount) || 0);
    }
  }

  const effectiveTaxableRupees = Math.max(0, baseSubtotalRupees - discountAmountRupees);
  const effectiveGstRupees = Number((effectiveTaxableRupees * 0.18).toFixed(2));
  const effectiveFinalAmountRupees = Number((effectiveTaxableRupees + effectiveGstRupees).toFixed(2));
  const effectiveFinalAmountPaise = Math.round(effectiveFinalAmountRupees * 100);

  // Coupon code handlers
  const handleApplyCoupon = async () => {
    const trimmed = promoCodeInput.trim().toUpperCase();
    if (!trimmed) {
      setPromoError("Please enter a promo code");
      return;
    }
    setCouponLoading(true);
    setPromoError(null);
    setPromoSuccess(null);
    try {
      const { data, error } = await supabase.rpc("validate_coupon", {
        p_code: trimmed,
        p_billing_cycle: checkoutData?.billingCycle || "monthly"
      });
      if (error) throw error;
      if (data?.valid) {
        const newCoupon = {
          id: data.coupon_id,
          type: data.discount_type,
          amount: data.discount_value,
          description: data.description || "Promo code applied successfully!"
        };
        setAppliedCoupon(newCoupon);
        setPromoSuccess(data.description || "Promo code applied successfully!");
        setPromoError(null);
        toast({ title: "Coupon Applied! 🎉", description: data.description || `${trimmed} applied successfully` });
      } else {
        setAppliedCoupon(null);
        setPromoError(data?.error || "Invalid promo code");
      }
    } catch (err: any) {
      setAppliedCoupon(null);
      setPromoError(err.message || "Failed to validate promo code");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setPromoCodeInput("");
    setPromoSuccess(null);
    setPromoError(null);
    toast({ title: "Coupon Removed", description: "Standard pricing restored." });
  };

  // Validation
  const isGstinValid = !cleanGstin || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(cleanGstin);
  const isPhoneValid = cleanPhone.replace(/\D/g, "").length >= 10;
  const isPincodeValid = /^[1-9][0-9]{5}$/.test(cleanPincode);

  const isFormValid =
    cleanFullName.length > 0 &&
    cleanEmail.length > 0 &&
    isPhoneValid &&
    cleanCompanyName.length > 0 &&
    cleanStreetAddress.length > 0 &&
    cleanCity.length > 0 &&
    cleanState.length > 0 &&
    isPincodeValid &&
    isGstinValid &&
    agreeTerms &&
    agreeConsent;

  // Handle Payment Initiation
  const handleProceedToPayment = async () => {
    if (!checkoutData) {
      toast({ title: "No Plan Selected", description: "Please choose a plan to proceed.", variant: "destructive" });
      navigate("/settings?tab=subscription");
      return;
    }

    if (!agreeTerms || !agreeConsent) {
      toast({
        title: "Consent Required",
        description: "Please manually review and accept both mandatory checkboxes to continue.",
        variant: "destructive"
      });
      return;
    }

    if (!isFormValid) {
      toast({
        title: "Incomplete Billing Information",
        description: "Please check that all mandatory billing fields and valid 6-digit Pincode are filled.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    const orgId = checkoutData.orgId || currentOrg?.id;

    try {
      // 1. Ensure Razorpay checkout script is loaded
      if (typeof (window as any).Razorpay === "undefined") {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.id = "razorpay-script";
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Unable to load Razorpay payment SDK. Please check your internet connection."));
          document.body.appendChild(script);
        });
      }

      // 2. Format complete billing address
      const fullFormattedAddress = `${cleanStreetAddress}, ${cleanCity}, ${cleanState} - ${cleanPincode}`;

      // 3. Create Razorpay order via Edge Function with effective discounted amount
      const amountInRupees = effectiveFinalAmountRupees;
      const amountInPaise = effectiveFinalAmountPaise;

      const { data: orderData, error: orderError } = await supabase.functions.invoke("create_razorpay_order", {
        body: {
          action: "create",
          org_id: orgId,
          plan_names: checkoutData.targetPlanNames,
          billing_cycle: checkoutData.billingCycle,
          coupon_code: appliedCoupon ? promoCodeInput.trim().toUpperCase() : undefined,
          hrms_employee_count: checkoutData.totalEmployeesToSend,
          total_amount: amountInRupees,
          amount_in_paise: amountInPaise
        }
      });

      if (orderError || !orderData || orderData.error) {
        throw new Error(orderError?.message || orderData?.error || "Failed to initialize payment gateway order.");
      }

      // 4. Open Razorpay Checkout Modal
      const options = {
        key: orderData.razorpay_key_id,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Aassay Biz",
        description: checkoutData.planDisplayName || "Software Subscription & Capacity Activation",
        order_id: orderData.order_id,
        prefill: {
          name: cleanFullName,
          email: cleanEmail,
          contact: cleanPhone
        },
        theme: {
          color: "#28166f"
        },
        handler: async function (response: any) {
          try {
            setSubmitting(true);

            // A. Verify HMAC signature on server
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke("create_razorpay_order", {
              body: {
                action: "verify",
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                org_id: orgId,
                plan_names: checkoutData.targetPlanNames,
                billing_cycle: checkoutData.billingCycle,
                employee_count: checkoutData.totalEmployeesToSend,
                customer_email: cleanEmail,
                customer_name: cleanFullName,
                total_amount: amountInRupees,
                coupon_code: appliedCoupon ? promoCodeInput.trim().toUpperCase() : undefined,
                discount_amount: discountAmountRupees
              }
            });

            if (verifyError || verifyData?.error) {
              throw new Error(verifyError?.message || verifyData?.error || "Payment verification failed.");
            }

            // B. Update organization billing details in DB so profile remains up-to-date
            try {
              await supabase.from("organizations").update({
                name: cleanCompanyName,
                phone: cleanPhone,
                email: cleanEmail,
                tax_number: cleanGstin || null,
                gst_number: cleanGstin || null,
                address: fullFormattedAddress,
              }).eq("id", orgId);
            } catch (orgUpdateErr) {
              console.warn("Organization billing update notice:", orgUpdateErr);
            }

            // C. Record user consent, client IP, and statutory timestamp in subscription notes
            const consentAuditLog = {
              event: "PURCHASE_CONSENT_LOGGED",
              client_ip: clientIp,
              consent_timestamp: timestamp,
              verified_at: new Date().toISOString(),
              legal_basis: "CGST Act 2017 Sec 31 & DPDP Act 2023 Explicit Consent",
              terms_agreed: true,
              data_processing_consent: true,
              user_full_name: cleanFullName,
              user_email: cleanEmail,
              user_phone: cleanPhone,
              company_name: cleanCompanyName,
              gstin: cleanGstin || "Unregistered / Consumer",
              billing_address: fullFormattedAddress,
              state: cleanState,
              is_mp: isMadhyaPradesh,
              tax_type: isMadhyaPradesh ? "CGST (9%) + SGST (9%)" : "IGST (18%)",
              coupon_applied: appliedCoupon ? promoCodeInput.trim().toUpperCase() : null,
              discount_inr: discountAmountRupees,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              total_amount_inr: amountInRupees
            };

            try {
              await supabase.from("subscriptions").update({
                admin_notes: JSON.stringify(consentAuditLog)
              }).eq("razorpay_order_id", response.razorpay_order_id);
            } catch (noteErr) {
              console.warn("Consent audit log notice:", noteErr);
            }

            // D. Refresh local features in state store
            if (verifyData?.result?.features && Array.isArray(verifyData.result.features)) {
              useFeatureStore.getState().setOrgFeatures(orgId, verifyData.result.features);
            }

            // E. Build official Tax Invoice Payload
            const now = new Date();
            const periodEnd = new Date(now);
            if (checkoutData.billingCycle === "yearly") {
              periodEnd.setFullYear(periodEnd.getFullYear() + 1);
            } else {
              periodEnd.setMonth(periodEnd.getMonth() + 1);
            }

            const formatDateStr = (d: Date) =>
              d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            
            const invoiceNumber =
              verifyData?.invoice_number ||
              `AB-SUB-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${Date.now().toString().slice(-4)}`;

            const invoicePayload: SubscriptionInvoiceData = {
              invoiceNumber,
              invoiceDate: formatDateStr(now),
              billingCycle: checkoutData.billingCycle,
              planNames: checkoutData.targetPlanNames,
              planDisplayName: checkoutData.planDisplayName || "Aassay Biz Software Subscription",
              periodStart: formatDateStr(now),
              periodEnd: formatDateStr(periodEnd),
              customerName: cleanFullName,
              customerEmail: cleanEmail,
              customerPhone: cleanPhone,
              organizationName: cleanCompanyName,
              customerGstin: cleanGstin || undefined,
              customerState: cleanState || undefined,
              billingAddress: fullFormattedAddress,
              totalAmount: amountInRupees,
              subtotal: effectiveTaxableRupees,
              taxAmount: effectiveGstRupees,
              discount: discountAmountRupees,
              paymentMethod: "Razorpay (Cards / UPI / NetBanking)",
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              employeeCount: checkoutData.totalEmployeesToSend
            };

            setCompletedInvoice(invoicePayload);
            sessionStorage.removeItem("assay_checkout_payload");

            // F. Email digital invoice automatically
            sendSubscriptionInvoiceEmail(invoicePayload, orgId).catch(err => {
              console.warn("Invoice email background notice:", err);
            });

            toast({
              title: "Payment Successful! 🎉",
              description: `Your subscription is active. Tax Invoice dispatched to ${cleanEmail}.`,
            });
          } catch (err: any) {
            console.error("Payment verification failure:", err);
            toast({
              title: "Verification Error",
              description: err.message || "Payment verification failed. Please contact support.",
              variant: "destructive"
            });
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: function () {
            setSubmitting(false);
            toast({
              title: "Payment Cancelled",
              description: "Transaction was not completed. You can re-attempt anytime.",
            });
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (resp: any) {
        setSubmitting(false);
        toast({
          title: "Payment Failed",
          description: resp.error?.description || "Transaction failed. Please try a different card or UPI ID.",
          variant: "destructive"
        });
      });
      rzp.open();

    } catch (err: any) {
      setSubmitting(false);
      console.error("Payment initiation error:", err);
      toast({
        title: "Checkout Error",
        description: err.message || "Failed to start checkout. Please try again.",
        variant: "destructive"
      });
    }
  };

  // If order was already successfully completed, display celebration confirmation
  if (completedInvoice) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <SEO title="Payment Confirmed • Aassay Biz" description="Subscription activated and invoice generated." />
        <div className="max-w-2xl mx-auto">
          <Card className="border-emerald-200 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-8 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <Badge className="bg-emerald-500/40 text-emerald-100 border border-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
                Order Completed • Verified
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Payment Received!</h1>
              <p className="text-emerald-100 text-sm mt-1">Your features are live and your official GST Tax Invoice has been generated.</p>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-5">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2.5 text-sm">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Invoice Number:</span>
                  <span className="font-mono font-bold text-slate-900">{completedInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Plan Activated:</span>
                  <span className="font-semibold text-slate-900">{completedInvoice.planDisplayName}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Billed Customer:</span>
                  <span className="font-semibold text-slate-900">{completedInvoice.customerName}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Company / Legal Name:</span>
                  <span className="font-semibold text-slate-900">{completedInvoice.organizationName}</span>
                </div>
                {completedInvoice.customerGstin && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>GSTIN:</span>
                    <span className="font-mono font-bold text-slate-900">{completedInvoice.customerGstin}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-slate-600">
                  <span>Tax Breakdown:</span>
                  <span className="font-semibold text-slate-800">{isMadhyaPradesh ? "CGST 9% + SGST 9%" : "IGST 18%"}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Total Amount Paid:</span>
                  <span className="font-bold text-emerald-700 text-base">₹{completedInvoice.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Payment Gateway Reference:</span>
                  <span className="font-mono text-xs text-slate-700">{completedInvoice.razorpayPaymentId}</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3.5 flex items-start gap-3 text-xs text-blue-900">
                <Mail className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Invoice Emailed:</span> A PDF copy of your GST Tax Invoice has been emailed to <span className="font-semibold">{completedInvoice.customerEmail}</span>.
                </div>
              </div>

              <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-semibold text-slate-700">Digital Audit Trail Recorded:</span>
                </div>
                <div>IP Address: <span className="font-mono font-medium">{clientIp}</span></div>
                <div>Verification Timestamp: <span className="font-mono font-medium">{completedInvoice.periodStart}</span></div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row gap-3 bg-slate-50/80 border-t border-slate-200 p-6">
              <Button
                variant="outline"
                className="w-full sm:w-1/2 flex items-center justify-center gap-2 border-slate-300 font-semibold"
                onClick={() => downloadSubscriptionInvoicePDF(completedInvoice)}
              >
                <Download className="w-4 h-4 text-slate-700" />
                Download Invoice PDF
              </Button>
              <Button
                className="w-full sm:w-1/2 bg-[#e77817] hover:bg-[#d06b12] text-white font-bold"
                onClick={() => navigate("/dashboard")}
              >
                Go to Dashboard
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // If no checkout payload is present, render clean redirection alert
  if (!checkoutData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6 border-slate-200 shadow-lg">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-800">No Pending Checkout Found</h2>
          <p className="text-sm text-slate-600 mt-2 mb-6">
            Please choose a plan or capacity upgrade from your subscription settings to proceed to billing.
          </p>
          <Button onClick={() => navigate("/settings?tab=subscription")} className="w-full bg-[#28166f] hover:bg-[#1f1157] text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Choose a Plan
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 pt-6">
      <SEO title="Checkout & Billing Information • Aassay Biz" description="Secure billing information and GST tax compliance." />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link to="/settings?tab=subscription" className="hover:text-slate-800 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Subscription Plans
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-800">Checkout & Billing Information</span>
        </div>

        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#28166f] tracking-tight">
            Checkout & Statutory Billing Details
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Review and confirm your official billing information for GST invoice generation and account activation.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Billing Information & Mandatory Consent */}
          <div className="lg:col-span-7 space-y-6">

            {/* BILLING INFORMATION FORM */}
            <Card className="border-slate-200/90 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#28166f]" />
                  Billing & Contact Information
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Pre-filled from your profile. You can edit any field before completing payment.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                
                {/* Full Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="fullName"
                      placeholder="e.g. Dilip Bachani"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-white border-slate-300 text-sm focus-visible:ring-[#28166f]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      Phone Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="phone"
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`bg-white border-slate-300 text-sm focus-visible:ring-[#28166f] ${
                        cleanPhone && !isPhoneValid ? "border-amber-400 focus-visible:ring-amber-400" : ""
                      }`}
                    />
                    {cleanPhone && !isPhoneValid && (
                      <p className="text-[11px] text-amber-600 font-medium">Please enter a valid 10-digit phone number.</p>
                    )}
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Email Address (For Tax Invoice Delivery) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g. accounts@mycompany.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white border-slate-300 text-sm focus-visible:ring-[#28166f]"
                  />
                </div>

                <Separator className="my-2" />

                {/* Company Name & GSTIN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="companyName" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      Company / Business Legal Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="companyName"
                      placeholder="e.g. Acme Innovations Pvt Ltd"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="bg-white border-slate-300 text-sm focus-visible:ring-[#28166f]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="gstin" className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Receipt className="w-3.5 h-3.5 text-slate-400" />
                        GSTIN (Optional)
                      </span>
                      <span className="text-[10px] text-slate-400">For 18% Input Tax Credit</span>
                    </Label>
                    <Input
                      id="gstin"
                      placeholder="e.g. 23AAAAA0000A1Z5"
                      value={gstin}
                      onChange={(e) => handleGstinChange(e.target.value)}
                      maxLength={15}
                      className={`bg-white border-slate-300 text-sm uppercase focus-visible:ring-[#28166f] ${
                        cleanGstin && !isGstinValid ? "border-red-400 focus-visible:ring-red-400" : ""
                      }`}
                    />
                    {cleanGstin && !isGstinValid && (
                      <p className="text-[11px] text-red-500 font-medium">Please enter a valid 15-character GSTIN format.</p>
                    )}
                  </div>
                </div>

                {/* Street Billing Address */}
                <div className="space-y-1.5">
                  <Label htmlFor="streetAddress" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Billing Address (Building, Street, Area) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="streetAddress"
                    placeholder="e.g. Suite 402, Business Park, M.G. Road"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    className="bg-white border-slate-300 text-sm focus-visible:ring-[#28166f]"
                  />
                </div>

                {/* City, State, Pincode */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-xs font-semibold text-slate-700">
                      City <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="city"
                      placeholder="e.g. Bhopal"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="bg-white border-slate-300 text-sm focus-visible:ring-[#28166f]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="state" className="text-xs font-semibold text-slate-700">
                        State <span className="text-red-500">*</span>
                      </Label>
                      {isStateLockedByGstin && (
                        <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> GST Linked
                        </span>
                      )}
                    </div>
                    <Select
                      value={state}
                      onValueChange={(val) => {
                        if (!isStateLockedByGstin) setState(val);
                      }}
                      disabled={isStateLockedByGstin}
                    >
                      <SelectTrigger className={`bg-white border-slate-300 text-sm ${isStateLockedByGstin ? "bg-slate-100/90 cursor-not-allowed opacity-90 font-medium" : ""}`}>
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {INDIAN_STATES.map((s) => (
                          <SelectItem key={s.code} value={s.name}>
                            {s.name} ({s.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isStateLockedByGstin && (
                      <p className="text-[10px] text-slate-500">
                        Auto-selected from GSTIN state code ({cleanGstin.substring(0, 2)}).
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pincode" className="text-xs font-semibold text-slate-700">
                      Pincode <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="pincode"
                      placeholder="e.g. 462001"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      className={`bg-white border-slate-300 text-sm focus-visible:ring-[#28166f] ${
                        cleanPincode && !isPincodeValid ? "border-amber-400" : ""
                      }`}
                    />
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* MANDATORY CONSENT & TERMS CHECKBOXES (NOT PRE-TICKED) */}
            <Card className="border-slate-200/90 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Statutory Consent & Legal Agreements
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Please review and manually check both items to proceed with the transaction.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                
                {/* Checkbox 1: Terms & Conditions */}
                <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 transition-colors">
                  <Checkbox
                    id="agreeTerms"
                    checked={agreeTerms}
                    onCheckedChange={(checked) => setAgreeTerms(!!checked)}
                    className="mt-0.5 border-slate-400 data-[state=checked]:bg-[#28166f] data-[state=checked]:border-[#28166f]"
                  />
                  <label htmlFor="agreeTerms" className="text-xs text-slate-700 leading-relaxed cursor-pointer select-none">
                    <span className="font-semibold text-slate-900">I have read and agree to the </span>
                    <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-[#e77817] font-bold underline hover:text-[#c9630c] inline-flex items-center gap-0.5">
                      Terms & Conditions <ExternalLink className="w-2.5 h-2.5 inline" />
                    </Link>
                    <span>, </span>
                    <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#e77817] font-bold underline hover:text-[#c9630c] inline-flex items-center gap-0.5">
                      Privacy Policy <ExternalLink className="w-2.5 h-2.5 inline" />
                    </Link>
                    <span>, and </span>
                    <Link to="/refund-policy" target="_blank" rel="noopener noreferrer" className="text-[#e77817] font-bold underline hover:text-[#c9630c] inline-flex items-center gap-0.5">
                      Cancellation & Refund Policy <ExternalLink className="w-2.5 h-2.5 inline" />
                    </Link>.
                  </label>
                </div>

                {/* Checkbox 2: Consent for Data & IP / Timestamp Audit */}
                <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 transition-colors">
                  <Checkbox
                    id="agreeConsent"
                    checked={agreeConsent}
                    onCheckedChange={(checked) => setAgreeConsent(!!checked)}
                    className="mt-0.5 border-slate-400 data-[state=checked]:bg-[#28166f] data-[state=checked]:border-[#28166f]"
                  />
                  <label htmlFor="agreeConsent" className="text-xs text-slate-700 leading-relaxed cursor-pointer select-none">
                    <span className="font-semibold text-slate-900">
                      I explicitly consent to the collection and processing of my billing details, transaction timestamp, and IP address
                    </span>{" "}
                    for the purpose of official GST tax invoice generation, customer communication, and fraud prevention as mandated under the CGST Act 2017 and DPDP Act 2023.
                  </label>
                </div>

                {/* Live Audit Snapshot */}
                <div className="bg-slate-100/70 border border-slate-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-500" />
                    <span>Origin IP: <span className="font-mono font-semibold text-slate-800">{clientIp}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Timestamp: <span className="font-mono font-semibold text-slate-800">{new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</span></span>
                  </div>
                  <div>
                    {agreeTerms && agreeConsent ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Consent Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <Info className="w-3 h-3" /> Awaiting Manual Check
                      </span>
                    )}
                  </div>
                </div>

              </CardContent>
            </Card>

          </div>

          {/* RIGHT COLUMN: Order Summary, Coupon Box, Payment Button & Statutory Notice */}
          <div className="lg:col-span-5 sticky top-6 space-y-5">
            
            <Card className="border-slate-200/90 shadow-md rounded-2xl overflow-hidden bg-white">
              <CardHeader className="bg-[#28166f] text-white p-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#e77817]" />
                    Order Summary
                  </CardTitle>
                  <Badge className="bg-[#e77817] text-white font-bold uppercase text-[10px] tracking-wide border-0">
                    {checkoutData.billingCycle === "yearly" ? "Annual Plan (Save 20%)" : "Monthly Plan"}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-indigo-200 mt-1">
                  AssayBiz Cloud Enterprise Subscription
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                
                {/* Plan Name & Scope */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {checkoutData.isOnlyAddingExtraEmployees ? "Capacity Add-on" : "Selected Plan"}
                  </div>
                  <div className="text-base font-extrabold text-[#28166f] mt-0.5">
                    {checkoutData.planDisplayName || checkoutData.targetPlanNames.join(" + ").toUpperCase()}
                  </div>
                  
                  {checkoutData.extraEmployeesToAdd > 0 && (
                    <div className="text-xs text-slate-600 mt-1 flex items-center gap-1.5 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Includes +{checkoutData.extraEmployeesToAdd} Extra Staff Attendance Slot(s)
                    </div>
                  )}

                  {checkoutData.extraPlatformEmployeesToAdd > 0 && (
                    <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-1.5 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      Includes +{checkoutData.extraPlatformEmployeesToAdd} Extra Admin Seat(s)
                    </div>
                  )}

                  {checkoutData.extraCrmMembersToAdd > 0 && (
                    <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-1.5 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      Includes +{checkoutData.extraCrmMembersToAdd} Extra CRM Sales Login(s)
                    </div>
                  )}
                </div>

                {/* Coupon / Promo Code Box */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-[#e77817]" />
                      Promo / Coupon Code
                    </span>
                    {appliedCoupon && (
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-[11px] font-semibold text-red-500 hover:text-red-700 flex items-center gap-0.5"
                      >
                        <X className="w-3 h-3" /> Remove
                      </button>
                    )}
                  </div>

                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <div>
                          <span className="font-bold">{promoCodeInput.toUpperCase()}</span>
                          <p className="text-[10px] text-emerald-600">{appliedCoupon.description || "Coupon discount applied"}</p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                        {appliedCoupon.type === "percentage" ? `${appliedCoupon.amount}% OFF` : `₹${appliedCoupon.amount} OFF`}
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter Promo Code"
                        value={promoCodeInput}
                        onChange={(e) => {
                          setPromoCodeInput(e.target.value.toUpperCase());
                          setPromoError(null);
                        }}
                        className="bg-white border-slate-300 text-xs uppercase h-9 focus-visible:ring-[#28166f]"
                      />
                      <Button
                        size="sm"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !promoCodeInput.trim()}
                        className="bg-[#28166f] hover:bg-[#1f1157] text-white text-xs font-bold px-4 h-9"
                      >
                        {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
                      </Button>
                    </div>
                  )}

                  {promoError && (
                    <p className="text-[11px] text-red-500 font-medium">{promoError}</p>
                  )}
                  {promoSuccess && !appliedCoupon && (
                    <p className="text-[11px] text-emerald-600 font-medium">{promoSuccess}</p>
                  )}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-2 text-sm pt-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-semibold text-slate-800">
                      ₹{baseSubtotalRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {discountAmountRupees > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Promo Discount ({promoCodeInput.toUpperCase()})</span>
                      <span>-₹{discountAmountRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span className="flex items-center gap-1">
                      <span>GST (18%)</span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {isMadhyaPradesh ? "(CGST 9% + SGST 9%)" : "(IGST 18%)"}
                      </span>
                    </span>
                    <span className="font-semibold text-slate-800">
                      ₹{effectiveGstRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <Separator className="my-2" />

                  <div className="flex justify-between items-baseline pt-1">
                    <div>
                      <div className="text-xs font-bold text-slate-900">Total Payable Amount</div>
                      <div className="text-[10px] text-slate-500 font-medium">Inclusive of all taxes</div>
                    </div>
                    <div className="text-2xl font-extrabold text-[#28166f]">
                      ₹{effectiveFinalAmountRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div className="bg-slate-50 rounded-lg p-2 text-center text-[10px] text-slate-600 font-medium border border-slate-100 flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-600" />
                    <span>256-bit SSL Encrypted</span>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 text-center text-[10px] text-slate-600 font-medium border border-slate-100 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-blue-600" />
                    <span>Razorpay Verified</span>
                  </div>
                </div>

                {/* Payment Button */}
                <Button
                  size="lg"
                  className="w-full bg-[#e77817] hover:bg-[#d06b12] text-white font-extrabold py-6 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
                  onClick={handleProceedToPayment}
                  disabled={submitting || !isFormValid}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Connecting Payment Gateway...
                    </>
                  ) : (
                    `Pay ₹${effectiveFinalAmountRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })} & Activate`
                  )}
                </Button>

                {!isFormValid && (
                  <p className="text-[11px] text-center text-slate-500 leading-snug">
                    {!agreeTerms || !agreeConsent ? (
                      <span className="text-amber-600 font-semibold">Please check both agreement checkboxes on the left to proceed.</span>
                    ) : (
                      "Please ensure all required billing details (address, city, state, 6-digit pincode) are complete."
                    )}
                  </p>
                )}

              </CardContent>
            </Card>

            {/* RELOCATED: STATUTORY DATA COLLECTION NOTICE (Directly Below Payment Card) */}
            <div className="bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/80 rounded-2xl border border-indigo-200/80 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl text-indigo-700 flex-shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    Why We Collect This Information
                    <Badge variant="outline" className="border-indigo-300 text-indigo-700 text-[9px] uppercase font-bold py-0">
                      Compliance
                    </Badge>
                  </h3>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Under Indian tax regulations and the Digital Personal Data Protection (DPDP) Act, 2023, data is gathered strictly for legitimate statutory & compliance purposes:
                  </p>
                  <ul className="text-[11px] text-slate-700 space-y-1 list-disc pl-4 font-medium">
                    <li>
                      <span className="font-semibold text-slate-900">GST Tax Invoicing (CGST Act 2017, Sec 31):</span> Your legal company name, billing address, and GSTIN are required to generate an official tax invoice so your business can claim Input Tax Credit (ITC).
                    </li>
                    <li>
                      <span className="font-semibold text-slate-900">Invoice PDF & Receipts:</span> Name, email, and phone are used to dispatch your digitally signed invoice and receipts.
                    </li>
                    <li>
                      <span className="font-semibold text-slate-900">Audit Trail & Fraud Prevention:</span> Timestamp and IP address are captured to prevent fraud and satisfy financial audit compliance.
                    </li>
                  </ul>
                  <div className="pt-0.5 text-[10px] text-slate-500 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-600" />
                    <span>256-bit SSL Encrypted • Never shared with unauthorized third parties.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Back Button */}
            <div className="text-center pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-500 hover:text-slate-800"
                onClick={() => navigate("/settings?tab=subscription")}
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Change Selected Plan or Add-ons
              </Button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
