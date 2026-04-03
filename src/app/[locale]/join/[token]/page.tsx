import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/layout/AppShell";
import JoinPageContent from "@/components/pages/JoinPageContent";
import { notFound } from "next/navigation";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Admin client bypasses RLS — anyone with the invite link can see the invitation
  const admin = createAdminClient();
  const supabase = await createClient();

  // Fetch invitation (admin) + auth status in parallel
  const [invitationResult, authResult] = await Promise.all([
    admin
      .from("invitations")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .single(),
    supabase.auth.getUser(),
  ]);

  const invitation = invitationResult.data;
  if (!invitation) {
    notFound();
  }

  const user = authResult.data.user;

  // Fetch inviter profile (admin — bypasses RLS regardless of tree_visibility)
  const { data: inviter } = await admin
    .from("profiles")
    .select("*")
    .eq("id", invitation.inviter_id)
    .single();

  // Fetch current user profile if logged in
  let currentProfile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    currentProfile = data;
  }

  return (
    <AppShell user={currentProfile}>
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] px-4">
        <JoinPageContent
          invitation={invitation}
          inviter={inviter}
          isLoggedIn={!!user}
          currentUserName={currentProfile?.full_name}
        />
      </div>
    </AppShell>
  );
}
