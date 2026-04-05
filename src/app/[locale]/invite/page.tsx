import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/getProfile";
import { getUnreadCount } from "@/lib/supabase/getUnreadCount";
import AppShell from "@/components/layout/AppShell";
import InvitePageContent from "@/components/pages/InvitePageContent";

export default async function InvitePage() {
  // getProfile() and invitation fetch share the same supabase client context
  // but getProfile needs to finish first since we need profile.id
  const profile = await getProfile();
  const supabase = await createClient();

  const { data: invitations } = await supabase
    .from("invitations")
    .select("*")
    .eq("inviter_id", profile.id)
    .order("created_at", { ascending: false });

  const unreadCount = await getUnreadCount(profile.id);

  return (
    <AppShell user={profile} unreadCount={unreadCount}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <InvitePageContent
          currentUser={profile}
          invitations={invitations || []}
        />
      </div>
    </AppShell>
  );
}
