"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Bell, LogOut, Menu, X } from "lucide-react";
import KutumbLogo from "@/components/ui/KutumbLogo";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/ui/Avatar";
import type { Profile } from "@/lib/types";

interface NavbarProps {
  user: Profile | null;
  unreadCount?: number;
}

export default function Navbar({ user, unreadCount = 0 }: NavbarProps) {
  const t = useTranslations();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="bg-surface border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
            <KutumbLogo className="h-7 w-7" />
            <span className="text-xl font-bold text-primary">
              {t("common.appName")}
            </span>
          </Link>

          {/* Desktop nav */}
          {user && (
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-text-light hover:text-primary transition-colors font-medium"
              >
                {t("dashboard.myTree")}
              </Link>
              <Link
                href="/tree"
                className="text-text-light hover:text-primary transition-colors font-medium"
              >
                {t("tree.title")}
              </Link>
              <Link
                href="/invite"
                className="text-text-light hover:text-primary transition-colors font-medium"
              >
                {t("dashboard.invitations")}
              </Link>
              <Link
                href="/notifications"
                className="text-text-light hover:text-accent transition-colors relative"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-error text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <Link href="/profile" className="flex items-center gap-2">
                <Avatar
                  src={user.avatar_url}
                  name={user.full_name}
                  size="sm"
                />
              </Link>
              <button
                onClick={handleLogout}
                className="text-text-light hover:text-error transition-colors cursor-pointer"
                title={t("auth.logout")}
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Mobile hamburger */}
          {user && (
            <button
              className="md:hidden text-text cursor-pointer"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          )}

          {/* Not logged in */}
          {!user && (
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Link
                href="/login"
                className="text-primary font-medium hover:text-primary-dark transition-colors text-sm px-3 py-2 rounded-xl border border-transparent hover:border-primary/20"
              >
                {t("auth.login")}
              </Link>
              <Link
                href="/signup"
                className="bg-primary text-white px-4 py-2 rounded-xl font-medium hover:bg-primary-dark transition-colors text-sm whitespace-nowrap"
              >
                {t("auth.signup")}
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu */}
        {user && menuOpen && (
          <div className="md:hidden border-t border-border py-4 space-y-3">
            <Link
              href="/dashboard"
              className="block text-text-light hover:text-primary font-medium py-2"
              onClick={() => setMenuOpen(false)}
            >
              {t("dashboard.myTree")}
            </Link>
            <Link
              href="/tree"
              className="block text-text-light hover:text-primary font-medium py-2"
              onClick={() => setMenuOpen(false)}
            >
              {t("tree.title")}
            </Link>
            <Link
              href="/invite"
              className="block text-text-light hover:text-primary font-medium py-2"
              onClick={() => setMenuOpen(false)}
            >
              {t("dashboard.invitations")}
            </Link>
            <Link
              href="/notifications"
              className="block text-text-light hover:text-primary font-medium py-2"
              onClick={() => setMenuOpen(false)}
            >
              {t("dashboard.notifications")}
            </Link>
            <Link
              href="/profile"
              className="block text-text-light hover:text-primary font-medium py-2"
              onClick={() => setMenuOpen(false)}
            >
              {t("profile.title")}
            </Link>
            <button
              onClick={handleLogout}
              className="block text-error font-medium py-2 cursor-pointer"
            >
              {t("auth.logout")}
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
