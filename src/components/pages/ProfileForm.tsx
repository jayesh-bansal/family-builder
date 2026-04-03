"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronUp,
  Globe,
  Mail,
  Phone,
  Shield,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import type { Profile, TreeVisibility, SocialLinks } from "@/lib/types";

interface ProfileFormProps {
  profile: Profile;
}

/** SVG social icons — lucide-react doesn't include brand logos */
function SocialIcon({ platform }: { platform: string }) {
  const cls = "h-4 w-4";
  switch (platform) {
    case "instagram":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="#E1306C">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      );
    case "facebook":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="#1877F2">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case "twitter":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="#000000">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="#0A66C2">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case "youtube":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="#FF0000">
          <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    default:
      return <Globe className={cls} style={{ color: "#FFFC00" }} />;
  }
}

const SOCIAL_FIELDS: {
  key: keyof SocialLinks;
  label: string;
  placeholder: string;
}[] = [
  { key: "instagram", label: "Instagram", placeholder: "username or URL" },
  { key: "facebook", label: "Facebook", placeholder: "username or URL" },
  { key: "twitter", label: "X / Twitter", placeholder: "username or URL" },
  { key: "linkedin", label: "LinkedIn", placeholder: "username or URL" },
  { key: "youtube", label: "YouTube", placeholder: "channel URL" },
  { key: "snapchat", label: "Snapchat", placeholder: "username" },
];

export default function ProfileForm({ profile }: ProfileFormProps) {
  const t = useTranslations("profile");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSocials, setShowSocials] = useState(false);
  const [showLoginMethods, setShowLoginMethods] = useState(false);
  const [form, setForm] = useState({
    full_name: profile.full_name,
    bio: profile.bio || "",
    birth_date: profile.birth_date || "",
    location: profile.location || "",
    phone: profile.phone || "",
    tree_visibility: profile.tree_visibility,
  });
  const [socials, setSocials] = useState<SocialLinks>(
    profile.social_links || {}
  );

  // Auth identity linking state
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authPhone, setAuthPhone] = useState<string | null>(null);
  const [linkEmail, setLinkEmail] = useState("");
  const [linkPhone, setLinkPhone] = useState("");
  const [linkOtp, setLinkOtp] = useState("");
  const [linkStep, setLinkStep] = useState<
    "idle" | "email_sent" | "phone_otp_sent"
  >("idle");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);

  // Fetch current auth identities on mount
  useEffect(() => {
    const fetchIdentities = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setAuthEmail(user.email || null);
        setAuthPhone(user.phone || null);
      }
    };
    fetchIdentities();
  }, []);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
    setError(null);
  };

  const updateSocial = (key: keyof SocialLinks, value: string) => {
    setSocials((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Clean up empty social links
    const cleanedSocials: SocialLinks = {};
    let hasSocials = false;
    for (const [key, value] of Object.entries(socials)) {
      if (value && value.trim()) {
        cleanedSocials[key as keyof SocialLinks] = value.trim();
        hasSocials = true;
      }
    }

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        bio: form.bio || null,
        birth_date: form.birth_date || null,
        location: form.location || null,
        phone: form.phone || null,
        tree_visibility: form.tree_visibility,
        social_links: hasSocials ? cleanedSocials : null,
      })
      .eq("id", profile.id);

    setLoading(false);
    if (updateError) {
      setError("Failed to update profile. Please try again.");
      return;
    }
    setError(null);
    setSuccess(true);
    router.refresh();
  };

  // --- Auth linking handlers ---

  const handleLinkEmail = async () => {
    setLinkError(null);
    setLinkSuccess(null);
    if (!linkEmail.trim()) {
      setLinkError(t("linkEmailRequired"));
      return;
    }
    setLinkLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      email: linkEmail.trim(),
    });

    setLinkLoading(false);
    if (updateError) {
      setLinkError(updateError.message);
      return;
    }

    setLinkStep("email_sent");
    setLinkSuccess(t("linkEmailSent"));
  };

  const handleLinkPhoneSendOtp = async () => {
    setLinkError(null);
    setLinkSuccess(null);
    if (!linkPhone.trim()) {
      setLinkError(t("linkPhoneRequired"));
      return;
    }
    setLinkLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      phone: linkPhone.trim(),
    });

    setLinkLoading(false);
    if (updateError) {
      setLinkError(updateError.message);
      return;
    }

    setLinkStep("phone_otp_sent");
  };

  const handleLinkPhoneVerify = async () => {
    setLinkError(null);
    setLinkSuccess(null);
    if (!linkOtp.trim()) {
      setLinkError(tAuth("otpRequired"));
      return;
    }
    setLinkLoading(true);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: linkPhone.trim(),
      token: linkOtp.trim(),
      type: "phone_change",
    });

    setLinkLoading(false);
    if (verifyError) {
      setLinkError(verifyError.message);
      return;
    }

    setAuthPhone(linkPhone.trim());
    setLinkPhone("");
    setLinkOtp("");
    setLinkStep("idle");
    setLinkSuccess(t("linkPhoneSuccess"));
  };

  const visibilityOptions = [
    { value: "public", label: t("visibilityOptions.public") },
    { value: "family_only", label: t("visibilityOptions.family_only") },
    { value: "private", label: t("visibilityOptions.private") },
  ];

  const filledSocialsCount = Object.values(socials).filter(
    (v) => v && v.trim()
  ).length;

  const linkedMethodsCount =
    (authEmail ? 1 : 0) + (authPhone ? 1 : 0);

  return (
    <Card>
      <div className="flex items-center gap-4 mb-6">
        <Avatar src={profile.avatar_url} name={profile.full_name} size="xl" />
        <div>
          <h1 className="text-2xl font-bold text-primary">
            {t("editProfile")}
          </h1>
          <p className="text-text-light">{authEmail || authPhone || ""}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="full_name"
          label={t("fullName")}
          value={form.full_name}
          onChange={(e) => updateField("full_name", e.target.value)}
          required
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bio" className="text-sm font-medium text-text">
            {t("bio")}
          </label>
          <textarea
            id="bio"
            value={form.bio}
            onChange={(e) => updateField("bio", e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-text placeholder:text-text-light/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
            placeholder="Tell your family about yourself..."
          />
        </div>
        <Input
          id="birth_date"
          label={t("birthDate")}
          type="date"
          value={form.birth_date}
          onChange={(e) => updateField("birth_date", e.target.value)}
        />
        <Input
          id="location"
          label={t("location")}
          value={form.location}
          onChange={(e) => updateField("location", e.target.value)}
          placeholder="City, Country"
        />
        <Input
          id="phone"
          label={t("phone")}
          type="tel"
          value={form.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          placeholder="+1 234 567 8900"
        />
        <Select
          id="tree_visibility"
          label={t("visibility")}
          value={form.tree_visibility}
          onChange={(e) =>
            updateField("tree_visibility", e.target.value as TreeVisibility)
          }
          options={visibilityOptions}
        />

        {/* Login Methods Section */}
        <div className="border border-border rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowLoginMethods(!showLoginMethods)}
            className="w-full px-4 py-3 flex items-center justify-between bg-background hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-text">
                {t("loginMethods")}
              </span>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {linkedMethodsCount} {t("linked")}
              </span>
            </div>
            {showLoginMethods ? (
              <ChevronUp className="h-4 w-4 text-text-light" />
            ) : (
              <ChevronDown className="h-4 w-4 text-text-light" />
            )}
          </button>

          {showLoginMethods && (
            <div className="px-4 py-3 space-y-4 border-t border-border">
              {/* Email identity */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-text-light" />
                  <span className="text-sm font-medium text-text">
                    {t("email")}
                  </span>
                </div>
                {authEmail ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 text-sm">
                    <Check className="h-3.5 w-3.5 text-success" />
                    <span className="text-text">{authEmail}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {linkStep === "email_sent" ? (
                      <p className="text-sm text-success bg-success/10 px-3 py-2 rounded-lg">
                        {linkSuccess}
                      </p>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={linkEmail}
                          onChange={(e) => {
                            setLinkEmail(e.target.value);
                            setLinkError(null);
                          }}
                          placeholder="you@example.com"
                          className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text placeholder:text-text-light/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        />
                        <button
                          type="button"
                          onClick={handleLinkEmail}
                          disabled={linkLoading}
                          className="px-3 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          {t("linkButton")}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Phone identity */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-text-light" />
                  <span className="text-sm font-medium text-text">
                    {t("phone")}
                  </span>
                </div>
                {authPhone ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 text-sm">
                    <Check className="h-3.5 w-3.5 text-success" />
                    <span className="text-text">{authPhone}</span>
                  </div>
                ) : linkStep === "phone_otp_sent" ? (
                  <div className="space-y-2">
                    <p className="text-xs text-text-light">
                      {tAuth("otpSentTo")}{" "}
                      <span className="font-medium text-text">{linkPhone}</span>
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={linkOtp}
                        onChange={(e) => {
                          setLinkOtp(
                            e.target.value.replace(/\D/g, "").slice(0, 6)
                          );
                          setLinkError(null);
                        }}
                        placeholder="123456"
                        maxLength={6}
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text placeholder:text-text-light/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                      <button
                        type="button"
                        onClick={handleLinkPhoneVerify}
                        disabled={linkLoading}
                        className="px-3 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        {tAuth("verifyOtp")}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLinkStep("idle");
                        setLinkOtp("");
                        setLinkError(null);
                      }}
                      className="text-xs text-accent hover:underline cursor-pointer"
                    >
                      {tAuth("changePhone")}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={linkPhone}
                      onChange={(e) => {
                        setLinkPhone(e.target.value);
                        setLinkError(null);
                      }}
                      placeholder="+1 234 567 8900"
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text placeholder:text-text-light/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleLinkPhoneSendOtp}
                      disabled={linkLoading}
                      className="px-3 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {t("linkButton")}
                    </button>
                  </div>
                )}
              </div>

              {linkError && (
                <p className="text-sm text-error bg-error/10 px-3 py-2 rounded-lg">
                  {linkError}
                </p>
              )}
              {linkSuccess && linkStep === "idle" && (
                <p className="text-sm text-success bg-success/10 px-3 py-2 rounded-lg">
                  {linkSuccess}
                </p>
              )}

              <p className="text-xs text-text-light">
                {t("loginMethodsHint")}
              </p>
            </div>
          )}
        </div>

        {/* Social Accounts Section */}
        <div className="border border-border rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSocials(!showSocials)}
            className="w-full px-4 py-3 flex items-center justify-between bg-background hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-text">
                Social Accounts
              </span>
              {filledSocialsCount > 0 && (
                <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                  {filledSocialsCount} linked
                </span>
              )}
            </div>
            {showSocials ? (
              <ChevronUp className="h-4 w-4 text-text-light" />
            ) : (
              <ChevronDown className="h-4 w-4 text-text-light" />
            )}
          </button>

          {showSocials && (
            <div className="px-4 py-3 space-y-3 border-t border-border">
              {SOCIAL_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-3">
                  <div className="shrink-0 w-8 flex justify-center">
                    <SocialIcon platform={field.key} />
                  </div>
                  <input
                    type="text"
                    value={socials[field.key] || ""}
                    onChange={(e) => updateSocial(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text placeholder:text-text-light/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              ))}
              <p className="text-xs text-text-light">
                Add a username or full URL. Family members can click to visit
                your profiles.
              </p>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-error bg-error/10 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-success bg-success/10 px-3 py-2 rounded-lg">
            {t("updated")}
          </p>
        )}

        <Button type="submit" loading={loading} className="w-full">
          {t("editProfile")}
        </Button>
      </form>
    </Card>
  );
}
