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

export default function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [method, setMethod] = useState<AuthMethod>("email");

  // Email state
  const [email, setEmail] = useState("");

  // Phone state
  const [phone, setPhone] = useState("");

  // Shared
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();

    const credentials =
      method === "email"
        ? { email, password }
        : { phone: phone.trim(), password };

    const { error: authError } =
      await supabase.auth.signInWithPassword(credentials);

    if (authError) {
      setError(authError.message);
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
  };

  return (
    <Card className="w-full max-w-md">
      <div className="text-center mb-6">
        <BanyanLogo className="h-10 w-10 mx-auto mb-2" />
        <h1 className="text-2xl font-bold text-primary">{t("login")}</h1>
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

      <form onSubmit={handleLogin} className="space-y-4">
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
          required
        />

        {error && (
          <p className="text-sm text-error bg-error/10 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} className="w-full">
          {t("login")}
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
        {t("noAccount")}{" "}
        <Link href="/signup" className="text-accent font-medium hover:underline">
          {t("signup")}
        </Link>
      </p>
    </Card>
  );
}
