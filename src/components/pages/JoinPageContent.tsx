"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Heart, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import BanyanLogo from "@/components/ui/BanyanLogo";
import {
  acceptInvitation,
  declineInvitation,
} from "@/lib/actions/invitation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import type { Invitation, Profile } from "@/lib/types";
import { RELATIONSHIP_LABELS } from "@/lib/types";

interface JoinPageContentProps {
  invitation: Invitation;
  inviter: Profile | null;
  isLoggedIn: boolean;
  currentUserName?: string;
}

export default function JoinPageContent({
  invitation,
  inviter,
  isLoggedIn,
  currentUserName,
}: JoinPageContentProps) {
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [result, setResult] = useState<"accepted" | "declined" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setLoading(true);
    setError(null);

    // Server action handles everything — auth check, relationships, notifications
    const res = await acceptInvitation(invitation.id, invitation.token);

    if (res.error === "not_authenticated") {
      router.push(
        `/${locale}/signup?redirect=/${locale}/join/${invitation.token}`
      );
      return;
    }

    if (res.error) {
      setError(
        res.error === "invalid_invitation"
          ? "This invitation is no longer valid."
          : res.error === "cannot_accept_own_invitation"
          ? "You cannot accept your own invitation."
          : "Something went wrong. Please try again."
      );
      setLoading(false);
      return;
    }

    setLoading(false);
    setResult("accepted");
  };

  const handleDecline = async () => {
    setDeclining(true);
    setError(null);

    const res = await declineInvitation(invitation.id, invitation.token);

    if (res.error === "not_authenticated") {
      router.push(
        `/${locale}/login?redirect=/${locale}/join/${invitation.token}`
      );
      return;
    }

    if (res.error) {
      setError("Something went wrong. Please try again.");
      setDeclining(false);
      return;
    }

    setDeclining(false);
    setResult("declined");
  };

  const relationshipLabel =
    RELATIONSHIP_LABELS[
      invitation.relationship_type as keyof typeof RELATIONSHIP_LABELS
    ] || invitation.relationship_type.replace("_", " ");

  // Success / decline result screen
  if (result) {
    return (
      <Card className="w-full max-w-md text-center">
        {result === "accepted" ? (
          <>
            <div className="h-16 w-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-primary mb-2">
              Trees Connected!
            </h1>
            <p className="text-secondary mb-6">
              You and{" "}
              <span className="font-semibold">
                {inviter?.full_name || "your family member"}
              </span>{" "}
              are now connected. Your family trees have been merged — you can
              see each other's relatives!
            </p>
          </>
        ) : (
          <>
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-text-light" />
            </div>
            <h1 className="text-2xl font-bold text-primary mb-2">
              Invitation Declined
            </h1>
            <p className="text-secondary mb-6">
              You've declined the invitation from{" "}
              <span className="font-semibold">
                {inviter?.full_name || "the inviter"}
              </span>
              . They've been notified.
            </p>
          </>
        )}
        <Button
          onClick={() => router.push(`/${locale}/dashboard`)}
          className="w-full"
        >
          Go to Dashboard
        </Button>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md text-center">
      <BanyanLogo className="h-12 w-12 mx-auto mb-3" />
      <h1 className="text-2xl font-bold text-primary mb-2">
        Family Tree Invitation
      </h1>

      {/* Inviter info — always visible thanks to admin client */}
      {inviter ? (
        <div className="flex flex-col items-center gap-2 mb-6">
          <Avatar src={inviter.avatar_url} name={inviter.full_name} size="lg" />
          <p className="text-text">
            <span className="font-semibold">{inviter.full_name}</span> invited
            you as their{" "}
            <span className="font-semibold text-accent">
              {relationshipLabel}
            </span>
          </p>
        </div>
      ) : (
        <p className="text-secondary mb-6">
          You've been invited to join a family tree as a{" "}
          <span className="font-semibold text-accent">{relationshipLabel}</span>
        </p>
      )}

      <div className="flex items-center justify-center gap-2 text-secondary mb-6">
        <Heart className="h-5 w-5" />
        <span className="text-sm">
          Accept to connect your family trees together
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-error/10 text-error rounded-xl px-4 py-3 mb-4 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {isLoggedIn ? (
        <div className="space-y-3">
          {currentUserName && (
            <p className="text-sm text-text-light mb-1">
              Joining as <span className="font-semibold">{currentUserName}</span>
            </p>
          )}
          <Button
            onClick={handleAccept}
            loading={loading}
            className="w-full"
          >
            <CheckCircle className="h-4 w-4" />
            Accept & Connect Trees
          </Button>
          <Button
            variant="outline"
            onClick={handleDecline}
            loading={declining}
            className="w-full"
          >
            <XCircle className="h-4 w-4" />
            Decline
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-text-light mb-2">
            Sign up or log in to accept this invitation
          </p>
          <Button
            onClick={() =>
              router.push(
                `/${locale}/signup?redirect=/${locale}/join/${invitation.token}`
              )
            }
            className="w-full"
          >
            Sign Up & Accept
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              router.push(
                `/${locale}/login?redirect=/${locale}/join/${invitation.token}`
              )
            }
            className="w-full"
          >
            Log In & Accept
          </Button>
        </div>
      )}
    </Card>
  );
}
