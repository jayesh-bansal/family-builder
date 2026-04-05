"use client";

import { useState } from "react";
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
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  acceptInvitation,
  declineInvitation,
} from "@/lib/actions/invitation";
import {
  acceptRelationRequest,
  declineRelationRequest,
} from "@/lib/actions/tree";
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
  relation_request: <UserPlus className="h-5 w-5 text-accent" />,
  declined: <ThumbsDown className="h-5 w-5 text-error" />,
};

function getNotificationIcon(notification: Notification) {
  // Check data for declined invites
  if (notification.data && "declined_by" in notification.data) {
    return typeIcons.declined;
  }
  // Invitation received — show mail icon
  if (notification.data && "token" in notification.data) {
    return <Mail className="h-5 w-5 text-accent" />;
  }
  return (
    typeIcons[notification.type] || (
      <Bell className="h-5 w-5 text-text-light" />
    )
  );
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

/**
 * Check if a notification is an actionable invitation (can accept/decline).
 * Distinguished from regular invite notifications by having a token in data.
 */
function isActionableInvite(notification: Notification): boolean {
  return (
    notification.type === "invite" &&
    !!notification.data &&
    "token" in notification.data &&
    "invitation_id" in notification.data &&
    !("declined_by" in notification.data) &&
    !("handled" in notification.data)
  );
}

/**
 * Check if a notification is an actionable relation request.
 */
function isActionableRelationRequest(notification: Notification): boolean {
  return (
    notification.type === "relation_request" &&
    !!notification.data &&
    "requester_id" in notification.data &&
    !("handled" in notification.data)
  );
}

export default function NotificationsContent({
  notifications,
}: NotificationsContentProps) {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const router = useRouter();

  // Track action state per notification
  const [actionStates, setActionStates] = useState<
    Record<string, "loading" | "accepted" | "declined" | "error" | null>
  >({});

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

  const handleAcceptInvite = async (notification: Notification) => {
    const invitationId = notification.data?.invitation_id as string;
    const token = notification.data?.token as string;

    if (!invitationId || !token) return;

    // Prevent double-click: if already processing, bail out
    if (actionStates[notification.id] === "loading") return;

    setActionStates((prev) => ({ ...prev, [notification.id]: "loading" }));

    const result = await acceptInvitation(invitationId, token);

    if (result.success) {
      setActionStates((prev) => ({ ...prev, [notification.id]: "accepted" }));
      // Mark as read and update data to remove actionable state
      const supabase = createClient();
      await supabase
        .from("notifications")
        .update({
          is_read: true,
          data: { ...notification.data, handled: "accepted" },
        })
        .eq("id", notification.id);
      // Refresh after a short delay to show the success state
      setTimeout(() => router.refresh(), 1500);
    } else {
      setActionStates((prev) => ({ ...prev, [notification.id]: "error" }));
      setTimeout(
        () =>
          setActionStates((prev) => ({ ...prev, [notification.id]: null })),
        3000
      );
    }
  };

  const handleDeclineInvite = async (notification: Notification) => {
    const invitationId = notification.data?.invitation_id as string;
    const token = notification.data?.token as string;

    if (!invitationId || !token) return;

    // Prevent double-click
    if (actionStates[notification.id] === "loading") return;

    setActionStates((prev) => ({ ...prev, [notification.id]: "loading" }));

    const result = await declineInvitation(invitationId, token);

    if (result.success) {
      setActionStates((prev) => ({ ...prev, [notification.id]: "declined" }));
      // Mark as read and update data to remove actionable state
      const supabase = createClient();
      await supabase
        .from("notifications")
        .update({
          is_read: true,
          data: { ...notification.data, handled: "declined" },
        })
        .eq("id", notification.id);
      setTimeout(() => router.refresh(), 1500);
    } else {
      setActionStates((prev) => ({ ...prev, [notification.id]: "error" }));
      setTimeout(
        () =>
          setActionStates((prev) => ({ ...prev, [notification.id]: null })),
        3000
      );
    }
  };

  const handleAcceptRelation = async (notification: Notification) => {
    const requesterId = notification.data?.requester_id as string;
    if (!requesterId) return;
    if (actionStates[notification.id] === "loading") return;

    setActionStates((prev) => ({ ...prev, [notification.id]: "loading" }));

    const result = await acceptRelationRequest(requesterId);

    if (result.success) {
      setActionStates((prev) => ({ ...prev, [notification.id]: "accepted" }));
      const supabase = createClient();
      await supabase
        .from("notifications")
        .update({
          is_read: true,
          data: { ...notification.data, handled: "accepted" },
        })
        .eq("id", notification.id);
      setTimeout(() => router.refresh(), 1500);
    } else {
      setActionStates((prev) => ({ ...prev, [notification.id]: "error" }));
      setTimeout(
        () => setActionStates((prev) => ({ ...prev, [notification.id]: null })),
        3000
      );
    }
  };

  const handleDeclineRelation = async (notification: Notification) => {
    const requesterId = notification.data?.requester_id as string;
    if (!requesterId) return;
    if (actionStates[notification.id] === "loading") return;

    setActionStates((prev) => ({ ...prev, [notification.id]: "loading" }));

    const result = await declineRelationRequest(requesterId);

    if (result.success) {
      setActionStates((prev) => ({ ...prev, [notification.id]: "declined" }));
      const supabase = createClient();
      await supabase
        .from("notifications")
        .update({
          is_read: true,
          data: { ...notification.data, handled: "declined" },
        })
        .eq("id", notification.id);
      setTimeout(() => router.refresh(), 1500);
    } else {
      setActionStates((prev) => ({ ...prev, [notification.id]: "error" }));
      setTimeout(
        () => setActionStates((prev) => ({ ...prev, [notification.id]: null })),
        3000
      );
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Don't navigate for actionable notifications (buttons handle the action)
    if (isActionableInvite(notification) || isActionableRelationRequest(notification)) {
      if (!notification.is_read) {
        markAsRead(notification.id);
      }
      return;
    }

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
          {notifications.map((notification) => {
            const actionable = isActionableInvite(notification) || isActionableRelationRequest(notification);
            const isRelRequest = isActionableRelationRequest(notification);
            const actionState = actionStates[notification.id];

            return (
              <Card
                key={notification.id}
                className={`flex flex-col !p-4 transition-colors ${
                  actionable ? "" : "cursor-pointer hover:border-accent/30"
                } ${
                  !notification.is_read ? "bg-accent/5 border-accent/20" : ""
                }`}
                onClick={() =>
                  !actionable && handleNotificationClick(notification)
                }
              >
                <div className="flex items-start gap-3">
                  <div className="pt-0.5">
                    {getNotificationIcon(notification)}
                  </div>
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
                  {!notification.is_read && !actionable && (
                    <div className="h-2.5 w-2.5 rounded-full bg-accent shrink-0 mt-1.5" />
                  )}
                </div>

                {/* Inline accept/decline buttons for actionable notifications */}
                {actionable && (
                  <div className="mt-3 ml-8">
                    {actionState === "loading" ? (
                      <div className="flex items-center gap-2 text-sm text-text-light">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </div>
                    ) : actionState === "accepted" ? (
                      <div className="flex items-center gap-2 text-sm text-success">
                        <CheckCircle className="h-4 w-4" />
                        {isRelRequest ? "Relation accepted!" : "Invitation accepted! Trees connected."}
                      </div>
                    ) : actionState === "declined" ? (
                      <div className="flex items-center gap-2 text-sm text-text-light">
                        <XCircle className="h-4 w-4" />
                        {isRelRequest ? "Relation declined." : "Invitation declined."}
                      </div>
                    ) : actionState === "error" ? (
                      <div className="flex items-center gap-2 text-sm text-error">
                        <XCircle className="h-4 w-4" />
                        Something went wrong. Try again.
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            isRelRequest
                              ? handleAcceptRelation(notification)
                              : handleAcceptInvite(notification);
                          }}
                          disabled={actionState === "loading"}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-light transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Accept
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            isRelRequest
                              ? handleDeclineRelation(notification)
                              : handleDeclineInvite(notification);
                          }}
                          disabled={actionState === "loading"}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-background border border-border text-text-light text-sm font-medium hover:bg-surface transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <XCircle className="h-4 w-4" />
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
