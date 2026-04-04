import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/layout/AppShell";
import LandingPage from "@/components/pages/LandingPage";
import DashboardContent from "@/components/pages/DashboardContent";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AppShell user={null}>
        <LandingPage />
      </AppShell>
    );
  }

  const userId = user.id;

  // Parallelize ALL DB queries
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
    return (
      <AppShell user={null}>
        <LandingPage />
      </AppShell>
    );
  }

  const familyMembers = familyResult.data || [profile];
  const relationshipCount = relationshipResult.count ?? 0;
  const treeMemberCount = familyMembers.length;

  return (
    <AppShell user={profile}>
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
