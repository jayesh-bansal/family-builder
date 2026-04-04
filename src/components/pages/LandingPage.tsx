"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Users, Search } from "lucide-react";
import KutumbLogo from "@/components/ui/KutumbLogo";
import Button from "@/components/ui/Button";

export default function LandingPage() {
  const t = useTranslations("landing");

  const features = [
    {
      icon: <KutumbLogo className="h-8 w-8" />,
      title: t("features.build.title"),
      description: t("features.build.description"),
    },
    {
      icon: <Users className="h-8 w-8 text-secondary" />,
      title: t("features.connect.title"),
      description: t("features.connect.description"),
    },
    {
      icon: <Search className="h-8 w-8 text-primary" />,
      title: t("features.discover.title"),
      description: t("features.discover.description"),
    },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="mb-6">
          <KutumbLogo className="h-16 w-16 mx-auto mb-4" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary mb-4 leading-tight">
          {t("hero")}
        </h1>
        <p className="text-lg text-text-light max-w-2xl mx-auto mb-8">
          {t("subtitle")}
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/signup">
            <Button size="lg">{t("getStarted")}</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg">
              {t("login")}
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <div
              key={i}
              className="bg-surface rounded-2xl border border-border p-8 text-center hover:shadow-md transition-shadow"
            >
              <div className="flex justify-center mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-text mb-2">
                {feature.title}
              </h3>
              <p className="text-text-light">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
