import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/shared/SEO";
import { Eye, EyeOff } from "lucide-react";
import logoImg from "@/assets/logo.png";


export default function RegisterPage() {
  const [email, setEmail] = useState(() => sessionStorage.getItem("reg_email") || "");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get("plan");
    if (plan) {
      sessionStorage.setItem("onboarding_plan", plan);
      const hr = params.get("hr");
      if (hr) sessionStorage.setItem("onboarding_hr", hr);
      const plat = params.get("plat");
      if (plat) sessionStorage.setItem("onboarding_plat", plat);
      const crm = params.get("crm");
      if (crm) sessionStorage.setItem("onboarding_crm", crm);
    }
    const billing = params.get("billing");
    if (billing) {
      sessionStorage.setItem("onboarding_billing", billing);
    }
  }, []);
  
  const [mobile, setMobile] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(() => sessionStorage.getItem("reg_otpSent") === "true");
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });
      if (error) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { first_name: firstName, last_name: lastName, phone: mobile.replace(/\D/g, ""), mobile: mobile.replace(/\D/g, "") },
            emailRedirectTo: window.location.origin,
          },
        });
        if (signUpError) throw signUpError;
      }
      toast({ title: "OTP Resent", description: "A fresh 6-digit verification code has been sent to your email." });
      setResendCooldown(30);
    } catch (err: any) {
      toast({ title: "Failed to resend OTP", description: err.message, variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  const [emailExistsDialog, setEmailExistsDialog] = useState(false);
  const [existingEmail, setExistingEmail] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    const cleanMobile = mobile.replace(/\D/g, "");
    if (!cleanMobile || cleanMobile.length !== 10) {
      toast({ title: "Invalid Mobile No.", description: "Please enter a valid 10-digit mobile number.", variant: "destructive" });
      return;
    }

    if (password.length < 8) {
      toast({ title: "Password too short", description: "Minimum 8 characters", variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
      // Clean up any stale unconfirmed registration attempt so user can re-register without error
      const { data: prepStatus } = await (supabase as any).rpc("prepare_email_for_signup", {
        p_email: cleanEmail,
      });

      if (prepStatus === "already_confirmed") {
        setLoading(false);
        setExistingEmail(cleanEmail);
        setEmailExistsDialog(true);
        return;
      }
    } catch (e) {
      console.warn("prepare_email_for_signup warning:", e);
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName, phone: cleanMobile, mobile: cleanMobile },
        emailRedirectTo: window.location.origin,
      },
    });

    if (authError) {
      setLoading(false);
      const msg = authError.message?.toLowerCase() || "";
      if (
        msg.includes("already registered") ||
        msg.includes("already exists") ||
        msg.includes("user already")
      ) {
        setExistingEmail(email);
        setEmailExistsDialog(true);
        return;
      }
      toast({ title: "Registration failed", description: authError.message, variant: "destructive" });
      return;
    }

    if (authData.user) {
      // Handle Supabase email enumeration protection returning empty identities for existing users
      if (authData.user.identities && authData.user.identities.length === 0) {
        setLoading(false);
        setExistingEmail(email);
        setEmailExistsDialog(true);
        return;
      }

      if (authData.session) {
        toast({ title: "Account created!", description: "Welcome to Aassay Biz Invoices" });
        navigate("/dashboard", { replace: true });
      } else {
        toast({ title: "OTP Sent", description: "Please enter the 6-digit OTP sent to your email." });
        setOtpSent(true);
        sessionStorage.setItem("reg_email", email);
        sessionStorage.setItem("reg_otpSent", "true");
      }
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "signup",
    });

    setLoading(false);

    if (error) {
      toast({ title: "Verification failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account verified!", description: "Welcome to Aassay Biz Invoices" });
      sessionStorage.removeItem("reg_email");
      sessionStorage.removeItem("reg_otpSent");
      navigate("/dashboard", { replace: true });
    }
  };

  const handleBack = () => {
    setOtpSent(false);
    sessionStorage.removeItem("reg_otpSent");
  };

  const loginUrl = `/login?email=${encodeURIComponent(existingEmail)}`;
  const forgotUrl = `/forgot-password?email=${encodeURIComponent(existingEmail)}`;

  return (
    <>
      <SEO title="Create Account" description="Create your free Aassay Biz Invoices account and start sending professional GST invoices in minutes." path="/register" />
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        {emailExistsDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 mx-auto">
                <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-gray-900">Email Already Registered</h2>
                <p className="text-sm text-gray-500">
                  An account with{" "}
                  <span className="font-semibold text-gray-800 break-all">{existingEmail}</span>{" "}
                  already exists.
                </p>
              </div>
              <div className="space-y-3">
                <Link
                  to={loginUrl}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors"
                  onClick={() => setEmailExistsDialog(false)}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                  Login with your Password
                </Link>
                <Link
                  to={forgotUrl}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-gray-100 text-gray-800 font-semibold text-sm hover:bg-gray-200 transition-colors border border-gray-200"
                  onClick={() => setEmailExistsDialog(false)}
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Forgot Password? Reset it
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400 font-medium">or</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
              <button
                onClick={() => {
                  setEmailExistsDialog(false);
                  setEmail("");
                }}
                className="w-full text-sm text-primary hover:underline font-medium text-center"
              >
                Use a different email address
              </button>
            </div>
          </div>
        )}
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={logoImg} alt="Aassay Biz Invoices" className="mx-auto mb-2 h-20 w-20 object-contain" />
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>Everything you need. One smart platform</CardDescription>
        </CardHeader>
        {!otpSent ? (
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="regEmail">Email *</Label>
                <Input id="regEmail" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <p className="text-xs text-muted-foreground">Verification email may take a few minutes to arrive due to high traffic. Please also check your spam folder.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="regMobile">Mobile No. *</Label>
                <Input 
                  id="regMobile" 
                  type="tel" 
                  placeholder="10-digit mobile number" 
                  maxLength={10} 
                  value={mobile} 
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))} 
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="regPassword">Password</Label>
                <div className="relative">
                  <Input id="regPassword" type={showPassword ? "text" : "password"} placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Checking..." : "Create Account"}
              </Button>
              
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline">Sign in</Link>
              </p>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  className="text-center text-lg tracking-widest font-mono font-bold"
                  autoFocus
                />
                <p className="text-xs text-center text-muted-foreground">
                  We sent a verification code to <span className="font-semibold text-foreground">{email}</span>.
                  <br />
                  Code is valid for <strong className="text-foreground">5 minutes</strong>.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Verify Account"}
              </Button>
              <div className="flex items-center justify-between w-full text-xs pt-1 px-1">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || resending}
                  className="text-primary hover:underline font-semibold disabled:opacity-50 disabled:no-underline"
                >
                  {resending ? "Sending..." : resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : "Resend OTP"}
                </button>
                <button type="button" onClick={handleBack} className="text-muted-foreground hover:underline">
                  Back to registration
                </button>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
      </>
  );
}
