"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import KutumbLogo from "@/components/ui/KutumbLogo";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import type { Gender, FamilyVariant } from "@/lib/types";

type AuthMethod = "email" | "phone";

export default function SignupForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [method, setMethod] = useState<AuthMethod>("email");

  // Shared state
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [familyVariant, setFamilyVariant] = useState<FamilyVariant>("global");

  // Email state
  const [email, setEmail] = useState("");

  // Phone state
  const [phone, setPhone] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!gender) {
      setError("Please select your gender.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const meta = {
      full_name: fullName,
      gender,
      family_variant: familyVariant,
    };

    const credentials =
      method === "email"
        ? { email, password, options: { data: meta } }
        : { phone: phone.trim(), password, options: { data: meta } };

    const { data: signUpData, error: authError } =
      await supabase.auth.signUp(credentials);

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Also update the profile directly if user was created
    if (signUpData.user) {
      await supabase
        .from("profiles")
        .update({ gender, family_variant: familyVariant })
        .eq("id", signUpData.user.id);
    }

    router.push("/dashboard");
    router.refresh();
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/${locale}/auth/callback`,
      },
    });
  };

  const switchMethod = (m: AuthMethod) => {
    setMethod(m);
    setError("");
  };

  return (
    <Card className="w-full max-w-md">
      <div className="text-center mb-6">
        <KutumbLogo className="h-10 w-10 mx-auto mb-2" />
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

      <form onSubmit={handleSignup} className="space-y-4">
        <Input
          id="fullName"
          label={t("fullName")}
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="John Doe"
          required
        />

        {method === "email" ? (
          <Input
            id="email"
            label={t("email")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        ) : (
          <Input
            id="phone"
            label={t("phone")}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            required
          />
        )}

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

        {/* Gender selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text">
            Gender <span className="text-error">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "other", label: "Other" },
              ] as const
            ).map((opt) => (
              <label
                key={opt.value}
                className={`flex-1 min-w-[80px] flex items-center justify-center px-2 py-2 rounded-xl border-2 text-sm font-medium cursor-pointer transition-all ${
                  gender === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface text-text-light hover:border-primary/30"
                }`}
              >
                <input
                  type="radio"
                  name="signup_gender"
                  value={opt.value}
                  checked={gender === opt.value}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="sr-only"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* Family Naming Style */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text">
            Family Naming Style
          </label>
          <div className="flex gap-2">
            {(
              [
                { value: "global", label: "English", desc: "Father, Mother..." },
                { value: "indian", label: "Hindi", desc: "Papa, Mummy..." },
              ] as const
            ).map((opt) => (
              <label
                key={opt.value}
                className={`flex-1 flex flex-col items-center px-2 py-2 rounded-xl border-2 text-sm font-medium cursor-pointer transition-all text-center ${
                  familyVariant === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface text-text-light hover:border-primary/30"
                }`}
              >
                <input
                  type="radio"
                  name="signup_variant"
                  value={opt.value}
                  checked={familyVariant === opt.value}
                  onChange={(e) => setFamilyVariant(e.target.value as FamilyVariant)}
                  className="sr-only"
                />
                <span>{opt.label}</span>
                <span className="text-[10px] text-text-light/70 font-normal">{opt.desc}</span>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-error bg-error/10 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} className="w-full">
          {t("signup")}
        </Button>
      </form>

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
