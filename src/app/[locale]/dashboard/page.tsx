import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import DashboardContent from "@/components/pages/DashboardContent";
import { getUnreadCount } from "@/lib/supabase/getUnreadCount";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userId = user.id;

  // Parallelize ALL DB queries — they only need userId which we already have
  const [profileResult, relationshipResult, inviteResult, familyResult] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase
        .from("relationships")
        .select("*", { count: "exact", head: true })
        .or(`person_id.eq.${userId},related_person_id.eq.${userId}`),
      supabase
        .from("invitations")
        .select("*", { count: "exact", head: true })
        .eq("inviter_id", userId)
        .eq("status", "pending"),
      // Fetch family members for birthday calendar
      supabase.rpc("get_tree_profiles", { root_user_id: userId }),
    ]);

  let profile = profileResult.data;

  if (!profile) {
    const { data: newProfile } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        full_name:
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "User",
        email: user.email,
      })
      .select()
      .single();
    profile = newProfile;
  }

  if (!profile) {
    redirect("/login");
  }

  // Family members for birthday calendar (fallback to just own profile)
  const familyMembers = familyResult.data || [profile];
  // Each relationship is stored bidirectionally (2 rows per pair)
  const relationshipCount = Math.floor((relationshipResult.count ?? 0) / 2);
  const treeMemberCount = familyMembers.length;
  const unreadCount = await getUnreadCount(userId);

  return (
    <AppShell user={profile} unreadCount={unreadCount}>
      <DashboardContent
        profile={profile}
        memberCount={treeMemberCount}
        connectionCount={relationshipCount}
        inviteCount={inviteResult.count ?? 0}
        familyMembers={familyMembers}
      />
    </AppShell>
  );
}
