"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import BanyanLogo from "@/components/ui/BanyanLogo";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

type AuthMethod = "email" | "phone";
type PhoneStep = "enter" | "verify";

export default function SignupForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [method, setMethod] = useState<AuthMethod>("email");

  // Shared state
  const [fullName, setFullName] = useState("");

  // Email state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Phone state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("enter");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError(t("nameRequired"));
      return;
    }
    if (!phone.trim()) {
      setError(t("phoneRequired"));
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: phone.trim(),
      options: {
        shouldCreateUser: true,
        data: { full_name: fullName },
      },
    });

    if (otpError) {
      setError(otpError.message);
      setLoading(false);
      return;
    }

    setPhoneStep("verify");
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otp.trim()) {
      setError(t("otpRequired"));
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: phone.trim(),
      token: otp.trim(),
      type: "sms",
    });

    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const switchMethod = (m: AuthMethod) => {
    setMethod(m);
    setError("");
    setPhoneStep("enter");
    setOtp("");
  };

  return (
    <Card className="w-full max-w-md">
      <div className="text-center mb-6">
        <BanyanLogo className="h-10 w-10 mx-auto mb-2" />
        <h1 className="text-2xl font-bold text-primary">{t("signup")}</h1>
      </div>

      {/* Method Toggle */}
      <div className="flex rounded-xl border border-border overflow-hidden mb-5">
        <button
          type="button"
          onClick={() => switchMethod("email")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
            method === "email"
              ? "bg-primary text-white"
              : "bg-surface text-text-light hover:bg-muted/50"
          }`}
        >
          {t("email")}
        </button>
        <button
          type="button"
          onClick={() => switchMethod("phone")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
            method === "phone"
              ? "bg-primary text-white"
              : "bg-surface text-text-light hover:bg-muted/50"
          }`}
        >
          {t("phone")}
        </button>
      </div>

      {/* Email Signup */}
      {method === "email" && (
        <form onSubmit={handleEmailSignup} className="space-y-4">
          <Input
            id="fullName"
            label={t("fullName")}
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            required
          />
          <Input
            id="email"
            label={t("email")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <Input
            id="password"
            label={t("password")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={6}
            required
          />

          {error && (
            <p className="text-sm text-error bg-error/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full">
            {t("signup")}
          </Button>
        </form>
      )}

      {/* Phone Signup — Enter Phone */}
      {method === "phone" && phoneStep === "enter" && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <Input
            id="fullName"
            label={t("fullName")}
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            required
          />
          <Input
            id="phone"
            label={t("phone")}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 234 567 8900"
            required
          />
          <p className="text-xs text-text-light">{t("otpHint")}</p>

          {error && (
            <p className="text-sm text-error bg-error/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full">
            {t("sendOtp")}
          </Button>
        </form>
      )}

      {/* Phone Signup — Verify OTP */}
      {method === "phone" && phoneStep === "verify" && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <p className="text-sm text-text-light text-center">
            {t("otpSentTo")} <span className="font-medium text-text">{phone}</span>
          </p>
          <Input
            id="otp"
            label={t("otpCode")}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            maxLength={6}
            required
          />

          {error && (
            <p className="text-sm text-error bg-error/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full">
            {t("verifyOtp")}
          </Button>

          <button
            type="button"
            onClick={() => {
              setPhoneStep("enter");
              setOtp("");
              setError("");
            }}
            className="w-full text-sm text-accent hover:underline cursor-pointer"
          >
            {t("changePhone")}
          </button>
        </form>
      )}

      <div className="my-4 flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-sm text-text-light">{t("or")}</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={handleGoogleLogin}
      >
        {t("loginWithGoogle")}
      </Button>

      <p className="text-center text-sm text-text-light mt-4">
        {t("hasAccount")}{" "}
        <Link href="/login" className="text-accent font-medium hover:underline">
          {t("login")}
        </Link>
      </p>
    </Card>
  );
}
