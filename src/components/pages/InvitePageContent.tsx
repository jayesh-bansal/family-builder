"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Mail,
  Phone,
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
import { isNative } from "@/lib/platform";
import { createInvitation } from "@/lib/actions/invitation";
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

type ContactMethod = "email" | "phone";

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
  const [contactMethod, setContactMethod] = useState<ContactMethod>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState<RelationshipType>("parent");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newInvite, setNewInvite] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const contactValue = contactMethod === "email" ? email : phone;

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!contactValue.trim()) {
      setError(
        contactMethod === "email"
          ? "Please enter an email address."
          : "Please enter a phone number."
      );
      setLoading(false);
      return;
    }

    const result = await createInvitation({
      contactValue: contactValue.trim(),
      contactType: contactMethod,
      relationshipType: relationship,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.invitation) {
      setNewInvite(result.invitation);
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
    return `Hey ${name}! ${currentUser.full_name} has invited you to join their family tree on Kutumb as their ${relLabel}. Click here to accept: ${link}`;
  };

  const shareNative = async (token: string) => {
    if (isNative()) {
      const { Share } = await import("@capacitor/share");
      await Share.share({
        title: `${currentUser.full_name} invited you to Kutumb!`,
        text: getShareMessage(token),
        url: getInviteLink(token),
      });
    } else if (navigator.share) {
      await navigator.share({
        title: `${currentUser.full_name} invited you to Kutumb!`,
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

  const shareViaSMS = (token: string) => {
    const message = encodeURIComponent(getShareMessage(token));
    const smsUri = phone
      ? `sms:${phone}?body=${message}`
      : `sms:?body=${message}`;
    window.open(smsUri, "_blank");
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
    setPhone("");
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
                {recipientName || contactValue}
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
            {(typeof navigator !== "undefined" && !!navigator.share) ||
            isNative() ? (
              <button
                onClick={() => shareNative(newInvite.token)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent text-white font-semibold hover:bg-accent-light transition-colors cursor-pointer"
              >
                <Share2 className="h-5 w-5" />
                Share Invite
              </button>
            ) : null}

            <p className="text-sm font-medium text-text-light">Share via</p>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {/* WhatsApp */}
              <button
                onClick={() => shareViaWhatsApp(newInvite.token)}
                className="flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl bg-[#25D366]/10 text-[#25D366] text-sm font-semibold hover:bg-[#25D366]/20 transition-colors cursor-pointer"
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                WhatsApp
              </button>

              {/* Email */}
              <button
                onClick={() => shareViaEmail(newInvite.token)}
                className="flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors cursor-pointer"
              >
                <Mail className="h-4 w-4 shrink-0" />
                Email
              </button>

              {/* SMS */}
              <button
                onClick={() => shareViaSMS(newInvite.token)}
                className="flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl bg-secondary/10 text-secondary text-sm font-semibold hover:bg-secondary/20 transition-colors cursor-pointer"
              >
                <Phone className="h-4 w-4 shrink-0" />
                SMS
              </button>

              {/* Copy Link */}
              <button
                onClick={() =>
                  copyInviteLink(newInvite.token, newInvite.id)
                }
                className="flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl bg-accent/10 text-accent text-sm font-semibold hover:bg-accent/20 transition-colors cursor-pointer"
              >
                {copiedId === newInvite.id ? (
                  <>
                    <Check className="h-4 w-4 shrink-0" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 shrink-0" />
                    Copy
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
          WhatsApp, Email, SMS, or any messaging app.
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

          {/* Email / Phone toggle */}
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              Contact Method
            </label>
            <div className="flex rounded-xl border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setContactMethod("email")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                  contactMethod === "email"
                    ? "bg-primary text-white"
                    : "bg-surface text-text-light hover:bg-background"
                }`}
              >
                <Mail className="h-4 w-4" />
                Email
              </button>
              <button
                type="button"
                onClick={() => setContactMethod("phone")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                  contactMethod === "phone"
                    ? "bg-primary text-white"
                    : "bg-surface text-text-light hover:bg-background"
                }`}
              >
                <Phone className="h-4 w-4" />
                Phone
              </button>
            </div>
          </div>

          {contactMethod === "email" ? (
            <Input
              id="invite_email"
              label="Their Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="relative@example.com"
              required
            />
          ) : (
            <Input
              id="invite_phone"
              label="Their Phone Number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              required
            />
          )}

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

              // Display contact — could be email or phone
              const displayContact =
                inv.email || (inv as any).phone || "Unknown";
              const isPhoneDisplay = /^\+?\d/.test(displayContact);

              return (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-background border border-border"
                >
                  <div className="flex items-center gap-3">
                    {status.icon}
                    <div>
                      <p className="font-medium text-sm text-text flex items-center gap-1.5">
                        {isPhoneDisplay ? (
                          <Phone className="h-3.5 w-3.5 text-text-light" />
                        ) : (
                          <Mail className="h-3.5 w-3.5 text-text-light" />
                        )}
                        {displayContact}
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
