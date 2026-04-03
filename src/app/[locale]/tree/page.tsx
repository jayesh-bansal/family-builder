import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/getProfile";
import AppShell from "@/components/layout/AppShell";
import FamilyTreeView from "@/components/tree/FamilyTreeView";
import SetupBanner from "@/components/tree/SetupBanner";

export default async function TreePage() {
  const profile = await getProfile();
  const supabase = await createClient();

  // Try recursive traversal first (requires migration 002)
  // This traverses the FULL connected graph — your relatives' relatives too
  const { data: treeData, error: rpcError } = await supabase.rpc(
    "get_family_tree",
    { root_user_id: profile.id }
  );

  let relationships: any[] = [];
  let members: any[] = [];
  let migrationNeeded = false;

  if (!rpcError && treeData) {
    // RPC works — get all profiles in the tree
    relationships = treeData;

    const personIds = new Set<string>([profile.id]);
    treeData.forEach((r: any) => {
      personIds.add(r.person_id);
      personIds.add(r.related_person_id);
    });

    const { data: treeMembers } = await supabase
      .from("profiles")
      .select("*")
      .in("id", Array.from(personIds));

    members = treeMembers || [];
  } else {
    // Fallback: direct relationships only (migration not yet run)
    migrationNeeded = true;

    const [relsResult, membersResult] = await Promise.all([
      supabase
        .from("relationships")
        .select("*")
        .or(
          `person_id.eq.${profile.id},related_person_id.eq.${profile.id},created_by.eq.${profile.id}`
        ),
      supabase.from("profiles").select("*").eq("id", profile.id),
    ]);

    relationships = relsResult.data || [];

    const personIds = new Set<string>([profile.id]);
    relationships.forEach((r: any) => {
      personIds.add(r.person_id);
      personIds.add(r.related_person_id);
    });

    if (personIds.size > 1) {
      const { data: relatedMembers } = await supabase
        .from("profiles")
        .select("*")
        .in("id", Array.from(personIds));
      members = relatedMembers || [];
    } else {
      members = membersResult.data || [];
    }
  }

  return (
    <AppShell user={profile}>
      {migrationNeeded && <SetupBanner />}
      <FamilyTreeView
        currentUser={profile}
        members={members}
        relationships={relationships}
      />
    </AppShell>
  );
}
