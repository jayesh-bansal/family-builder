"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import KutumbLogo from "@/components/ui/KutumbLogo";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import type { Profile, Gender, FamilyVariant } from "@/lib/types";

interface SetupProfileContentProps {
  profile: Profile;
}

export default function SetupProfileContent({
  profile,
}: SetupProfileContentProps) {
  const locale = useLocale();
  const router = useRouter();

  const [fullName, setFullName] = useState(profile.full_name || "");
  const [gender, setGender] = useState<Gender | "">(profile.gender || "");
  const [birthDate, setBirthDate] = useState(profile.birth_date || "");
  const [familyVariant, setFamilyVariant] = useState<FamilyVariant>(
    (profile.family_variant as FamilyVariant) || "global"
  );
  const [phone, setPhone] = useState(profile.phone || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!gender) {
      setError("Please select your gender.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        gender,
        birth_date: birthDate || null,
        family_variant: familyVariant,
        phone: phone.trim() || null,
      })
      .eq("id", profile.id);

    if (updateError) {
      setError("Failed to save profile. Please try again.");
      setLoading(false);
      return;
    }

    router.push(`/${locale}/dashboard`);
    router.refresh();
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md !p-8">
        <div className="flex flex-col items-center mb-6">
          <KutumbLogo className="h-14 w-14" />
          <h1 className="text-2xl font-bold text-primary mt-3">
            Complete Your Profile
          </h1>
          <p className="text-sm text-text-light mt-1 text-center">
            Just a few details to get your family tree started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="fullName"
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Gender
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["male", "female", "other"] as Gender[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors cursor-pointer capitalize ${
                    gender === g
                      ? "bg-accent text-white border-accent"
                      : "bg-background border-border text-text-light hover:border-accent/40"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <Input
            id="birthDate"
            label="Date of Birth"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />

          <Input
            id="phone"
            label="Phone Number (optional)"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
          />

          {/* Family Variant */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Family Naming Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFamilyVariant("global")}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                  familyVariant === "global"
                    ? "bg-accent text-white border-accent"
                    : "bg-background border-border text-text-light hover:border-accent/40"
                }`}
              >
                Global
                <span className="block text-xs mt-0.5 opacity-80">
                  Father, Mother, Uncle...
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFamilyVariant("indian")}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                  familyVariant === "indian"
                    ? "bg-accent text-white border-accent"
                    : "bg-background border-border text-text-light hover:border-accent/40"
                }`}
              >
                Indian
                <span className="block text-xs mt-0.5 opacity-80">
                  Papa, Mummy, Chacha...
                </span>
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-error text-center">{error}</p>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            Get Started
          </Button>
        </form>
      </Card>
    </div>
  );
}
