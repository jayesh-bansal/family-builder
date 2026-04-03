"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Mail,
  Copy,
  Check,
  Clock,
  CheckCircle,
  XCircle,
  MessageCircle,
  Share2,
  Send,
  ThumbsDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isNative } from "@/lib/platform";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import type { Profile, Invitation, RelationshipType } from "@/lib/types";
import { RELATIONSHIP_LABELS } from "@/lib/types";

interface InvitePageContentProps {
  currentUser: Profile;
  invitations: Invitation[];
}

const relationshipOptions = [
  { value: "parent", label: "Parent" },
  { value: "child", label: "Child" },
  { value: "spouse", label: "Spouse" },
  { value: "sibling", label: "Sibling" },
  { value: "grandparent", label: "Grandparent" },
  { value: "grandchild", label: "Grandchild" },
  { value: "step_parent", label: "Step Parent" },
  { value: "step_child", label: "Step Child" },
  { value: "adopted_parent", label: "Adoptive Parent" },
  { value: "adopted_child", label: "Adopted Child" },
  { value: "half_sibling", label: "Half Sibling" },
  { value: "godparent", label: "Godparent" },
  { value: "godchild", label: "Godchild" },
  { value: "close_friend", label: "Close Friend" },
];

export default function InvitePageContent({
  currentUser,
  invitations,
}: InvitePageContentProps) {
  const t = useTranslations("invite");
  const locale = useLocale();
  const router = useRouter();
  const [recipientName, setRecipientName] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState<RelationshipType>("parent");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newInvite, setNewInvite] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: invitation, error: insertError } = await supabase
      .from("invitations")
      .insert({
        inviter_id: currentUser.id,
        email,
        relationship_type: relationship,
      })
      .select()
      .single();

    if (insertError) {
      setError("Failed to create invitation. Please try again.");
      setLoading(false);
      return;
    }

    if (invitation) {
      setNewInvite(invitation);
    }

    setLoading(false);
  };

  const getInviteLink = (token: string) => {
    return `${window.location.origin}/${locale}/join/${token}`;
  };

  const getShareMessage = (token: string) => {
    const link = getInviteLink(token);
    const name = recipientName || "there";
    const relLabel =
      RELATIONSHIP_LABELS[relationship] || relationship.replace("_", " ");
    return `Hey ${name}! ${currentUser.full_name} has invited you to join their family tree on Family Builder as their ${relLabel}. Click here to accept: ${link}`;
  };

  const shareNative = async (token: string) => {
    if (isNative()) {
      const { Share } = await import("@capacitor/share");
      await Share.share({
        title: `${currentUser.full_name} invited you to Family Builder!`,
        text: getShareMessage(token),
        url: getInviteLink(token),
      });
    } else if (navigator.share) {
      await navigator.share({
        title: `${currentUser.full_name} invited you to Family Builder!`,
        text: getShareMessage(token),
        url: getInviteLink(token),
      });
    }
  };

  const shareViaWhatsApp = (token: string) => {
    const message = encodeURIComponent(getShareMessage(token));
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  const shareViaEmail = (token: string) => {
    const subject = encodeURIComponent(
      `${currentUser.full_name} invited you to their Family Tree!`
    );
    const body = encodeURIComponent(getShareMessage(token));
    const mailto = email
      ? `mailto:${email}?subject=${subject}&body=${body}`
      : `mailto:?subject=${subject}&body=${body}`;
    window.open(mailto, "_blank");
  };

  const copyInviteLink = (token: string, id: string) => {
    const link = getInviteLink(token);
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDone = () => {
    setNewInvite(null);
    setRecipientName("");
    setEmail("");
    router.refresh();
  };

  const statusConfig = {
    pending: {
      icon: <Clock className="h-4 w-4 text-warning" />,
      label: "Pending",
      color: "text-warning",
    },
    accepted: {
      icon: <CheckCircle className="h-4 w-4 text-success" />,
      label: "Accepted",
      color: "text-success",
    },
    declined: {
      icon: <ThumbsDown className="h-4 w-4 text-error" />,
      label: "Declined",
      color: "text-error",
    },
    expired: {
      icon: <XCircle className="h-4 w-4 text-text-light" />,
      label: "Expired",
      color: "text-text-light",
    },
  };

  // After creating invite — show share options
  if (newInvite) {
    const link = getInviteLink(newInvite.token);
    const relLabel =
      RELATIONSHIP_LABELS[relationship] || relationship.replace("_", " ");

    return (
      <div className="space-y-6">
        <Card className="text-center">
          <div className="mb-4">
            <div className="h-16 w-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-primary">
              Invitation Created!
            </h1>
            <p className="text-secondary mt-1">
              Share this link with{" "}
              <span className="font-semibold">
                {recipientName || email}
              </span>{" "}
              to invite them as your{" "}
              <span className="font-semibold text-accent">{relLabel}</span>
            </p>
          </div>

          {/* Invite link display */}
          <div className="bg-background rounded-xl border border-border p-3 mb-5 flex items-center gap-2">
            <input
              readOnly
              value={link}
              className="flex-1 bg-transparent text-sm text-text truncate outline-none"
            />
            <button
              onClick={() => copyInviteLink(newInvite.token, newInvite.id)}
              className="shrink-0 text-accent hover:text-accent-light transition-colors cursor-pointer"
            >
              {copiedId === newInvite.id ? (
                <Check className="h-5 w-5" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Share buttons */}
          <div className="space-y-3">
            {/* Native / Web Share API button */}
            {(typeof navigator !== "undefined" && !!navigator.share) || isNative() ? (
              <button
                onClick={() => shareNative(newInvite.token)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent text-white font-semibold hover:bg-accent-light transition-colors cursor-pointer"
              >
                <Share2 className="h-5 w-5" />
                Share Invite
              </button>
            ) : null}

            <p className="text-sm font-medium text-text-light">
              Share via
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* WhatsApp */}
              <button
                onClick={() => shareViaWhatsApp(newInvite.token)}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#25D366]/10 text-[#25D366] font-semibold hover:bg-[#25D366]/20 transition-colors cursor-pointer"
              >
                <MessageCircle className="h-5 w-5" />
                WhatsApp
              </button>

              {/* Email */}
              <button
                onClick={() => shareViaEmail(newInvite.token)}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors cursor-pointer"
              >
                <Mail className="h-5 w-5" />
                Email
              </button>

              {/* Copy Link */}
              <button
                onClick={() =>
                  copyInviteLink(newInvite.token, newInvite.id)
                }
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent/10 text-accent font-semibold hover:bg-accent/20 transition-colors cursor-pointer"
              >
                {copiedId === newInvite.id ? (
                  <>
                    <Check className="h-5 w-5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" />
                    Copy Link
                  </>
                )}
              </button>
            </div>
          </div>

          <Button onClick={handleDone} variant="outline" className="w-full mt-6">
            Done
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create invite form */}
      <Card>
        <h1 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
          <Send className="h-6 w-6 text-accent" />
          {t("title")}
        </h1>
        <p className="text-secondary text-sm mb-5">
          Create an invitation link to share with your family member via
          WhatsApp, Email, or any messaging app.
        </p>
        <form onSubmit={handleCreateInvite} className="space-y-4">
          <Input
            id="invite_name"
            label="Their Name"
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="e.g. Dad, Priya, Uncle Raj"
          />
          <Input
            id="invite_email"
            label="Their Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="relative@example.com"
            required
          />
          <Select
            id="invite_relationship"
            label="They are your..."
            value={relationship}
            onChange={(e) =>
              setRelationship(e.target.value as RelationshipType)
            }
            options={relationshipOptions}
          />
          {error && (
            <p className="text-sm text-error bg-error/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
          <Button type="submit" loading={loading} className="w-full">
            <Share2 className="h-4 w-4" />
            Create Invitation Link
          </Button>
        </form>
      </Card>

      {/* Existing invitations */}
      {invitations.length > 0 && (
        <Card>
          <h2 className="text-lg font-bold text-primary mb-4">
            Your Invitations
          </h2>
          <div className="space-y-3">
            {invitations.map((inv) => {
              const status =
                statusConfig[inv.status as keyof typeof statusConfig] ||
                statusConfig.pending;

              return (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-background border border-border"
                >
                  <div className="flex items-center gap-3">
                    {status.icon}
                    <div>
                      <p className="font-medium text-sm text-text">
                        {inv.email}
                      </p>
                      <p className="text-xs text-text-light">
                        {(
                          RELATIONSHIP_LABELS[
                            inv.relationship_type as keyof typeof RELATIONSHIP_LABELS
                          ] || inv.relationship_type
                        ).replace("_", " ")}{" "}
                        &bull;{" "}
                        <span className={status.color}>{status.label}</span>
                      </p>
                    </div>
                  </div>

                  {inv.status === "pending" && (
                    <div className="flex items-center gap-2">
                      {/* Share buttons for pending invites */}
                      <button
                        onClick={() => shareViaWhatsApp(inv.token)}
                        className="p-1.5 text-[#25D366] hover:bg-[#25D366]/10 rounded-lg transition-colors cursor-pointer"
                        title="Share via WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => shareViaEmail(inv.token)}
                        className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                        title="Share via Email"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => copyInviteLink(inv.token, inv.id)}
                        className="p-1.5 text-accent hover:bg-accent/10 rounded-lg transition-colors cursor-pointer"
                        title="Copy Link"
                      >
                        {copiedId === inv.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
