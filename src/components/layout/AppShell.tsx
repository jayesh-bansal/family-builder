"use client";

import Navbar from "./Navbar";
import PushNotificationManager from "@/components/mobile/PushNotificationManager";
import AppLifecycleManager from "@/components/mobile/AppLifecycleManager";
import type { Profile } from "@/lib/types";

interface AppShellProps {
  user: Profile | null;
  unreadCount?: number;
  children: React.ReactNode;
}

export default function AppShell({ user, unreadCount = 0, children }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar user={user} unreadCount={unreadCount} />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-6 text-center text-sm text-text-light">
        Kutumb &mdash; Your family, connected forever.
      </footer>
      <AppLifecycleManager />
      {user && <PushNotificationManager userId={user.id} />}
    </div>
  );
}
