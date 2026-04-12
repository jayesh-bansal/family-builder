"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Users, Mail, Link2 } from "lucide-react";
import KutumbLogo from "@/components/ui/KutumbLogo";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import BirthdayCalendar from "@/components/ui/BirthdayCalendar";
import type { Profile } from "@/lib/types";
import { cacheDashboardData, cacheProfile } from "@/lib/offlineCache";
import { useEffect } from "react";

interface DashboardContentProps {
  profile: Profile;
  memberCount: number;
  connectionCount: number;
  inviteCount: number;
  familyMembers?: Profile[];
}

export default function DashboardContent({
  profile,
  memberCount,
  connectionCount,
  inviteCount,
  familyMembers = [],
}: DashboardContentProps) {
  const t = useTranslations("dashboard");

  // Cache dashboard data and profile for offline access
  useEffect(() => {
    cacheProfile(profile);
    cacheDashboardData({ memberCount, connectionCount, inviteCount, familyMembers });
  }, [profile, memberCount, connectionCount, inviteCount, familyMembers]);

  const stats = [
    {
      icon: <Users className="h-6 w-6 text-accent" />,
      label: t("quickStats.totalMembers"),
      value: memberCount,
    },
    {
      icon: <Link2 className="h-6 w-6 text-primary" />,
      label: t("quickStats.connections"),
      value: connectionCount,
    },
    {
      icon: <Mail className="h-6 w-6 text-secondary" />,
      label: t("quickStats.pendingInvites"),
      value: inviteCount,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Welcome */}
      <div className="flex items-center gap-4 mb-8">
        <Avatar src={profile.avatar_url} name={profile.full_name} size="xl" />
        <div>
          <h1 className="text-2xl font-bold text-primary">
            {t("welcome", { name: profile.full_name })}
          </h1>
          <p className="text-text-light">
            {profile.bio || "Start building your family tree today!"}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((stat, i) => (
          <Card key={i} className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-background">{stat.icon}</div>
            <div>
              <p className="text-2xl font-bold text-text">{stat.value}</p>
              <p className="text-sm text-text-light">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions + Birthday Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quick Actions */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="flex flex-col items-center text-center gap-3">
            <KutumbLogo className="h-10 w-10" />
            <h3 className="font-bold text-lg">{t("viewTree")}</h3>
            <Link href="/tree">
              <Button>{t("viewTree")}</Button>
            </Link>
          </Card>

          <Card className="flex flex-col items-center text-center gap-3">
            <Users className="h-10 w-10 text-secondary" />
            <h3 className="font-bold text-lg">{t("addMember")}</h3>
            <Link href="/tree?add=true">
              <Button variant="secondary">{t("addMember")}</Button>
            </Link>
          </Card>

          <Card className="flex flex-col items-center text-center gap-3">
            <Mail className="h-10 w-10 text-primary" />
            <h3 className="font-bold text-lg">{t("invitations")}</h3>
            <Link href="/invite">
              <Button variant="outline">{t("invitations")}</Button>
            </Link>
          </Card>
        </div>

        {/* Right: Birthday Calendar */}
        <div>
          <BirthdayCalendar members={familyMembers} />
        </div>
      </div>
    </div>
  );
}
