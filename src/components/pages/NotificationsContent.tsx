"use client";

import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Bell,
  Mail,
  Link2,
  UserPlus,
  Info,
  CheckCheck,
  ThumbsDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { Notification } from "@/lib/types";

interface NotificationsContentProps {
  notifications: Notification[];
}

const typeIcons: Record<string, React.ReactNode> = {
  invite: <Mail className="h-5 w-5 text-secondary" />,
  tree_linked: <Link2 className="h-5 w-5 text-accent" />,
  member_joined: <UserPlus className="h-5 w-5 text-success" />,
  info_updated: <Info className="h-5 w-5 text-primary" />,
  declined: <ThumbsDown className="h-5 w-5 text-error" />,
};

function getNotificationIcon(notification: Notification) {
  // Check data for declined invites
  if (notification.data && "declined_by" in notification.data) {
    return typeIcons.declined;
  }
  return typeIcons[notification.type] || <Bell className="h-5 w-5 text-text-light" />;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationsContent({
  notifications,
}: NotificationsContentProps) {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const router = useRouter();

  const markAsRead = async (id: string) => {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
    router.refresh();
  };

  const markAllRead = async () => {
    const supabase = createClient();
    const unreadIds = notifications
      .filter((n) => !n.is_read)
      .map((n) => n.id);
    if (unreadIds.length === 0) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);
    router.refresh();
  };

  const handleNotificationClick = (notification: Notification) => {
    // Navigate based on notification type
    if (notification.type === "tree_linked") {
      router.push(`/${locale}/tree`);
    } else if (notification.type === "invite") {
      router.push(`/${locale}/invite`);
    } else if (notification.type === "member_joined") {
      router.push(`/${locale}/tree`);
    }

    if (!notification.is_read) {
      markAsRead(notification.id);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <Bell className="h-6 w-6 text-accent" />
          {t("title")}
          {unreadCount > 0 && (
            <span className="bg-error text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" />
            {t("markAllRead")}
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card className="text-center py-12">
          <Bell className="h-12 w-12 text-border mx-auto mb-3" />
          <p className="text-text-light">{t("empty")}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`flex items-start gap-3 !p-4 transition-colors cursor-pointer hover:border-accent/30 ${
                !notification.is_read ? "bg-accent/5 border-accent/20" : ""
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="pt-0.5">{getNotificationIcon(notification)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-text">
                  {notification.title}
                </p>
                <p className="text-sm text-text-light mt-0.5">
                  {notification.message}
                </p>
                <p className="text-xs text-text-light/60 mt-1">
                  {timeAgo(notification.created_at)}
                </p>
              </div>
              {!notification.is_read && (
                <div className="h-2.5 w-2.5 rounded-full bg-accent shrink-0 mt-1.5" />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
