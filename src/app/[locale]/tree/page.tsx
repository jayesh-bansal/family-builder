import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/getProfile";
import { getUnreadCount } from "@/lib/supabase/getUnreadCount";
import AppShell from "@/components/layout/AppShell";
import FamilyTreeView from "@/components/tree/FamilyTreeView";
import SetupBanner from "@/components/tree/SetupBanner";

/**
 * Server-side BFS traversal of the full family tree.
 * Uses admin client to bypass RLS so we can traverse the entire connected graph,
 * not just the current user's direct relationships.
 */
async function getFullTreeBFS(rootUserId: string) {
  const admin = createAdminClient();
  const visited = new Set<string>([rootUserId]);
  const allRels: any[] = [];
  const relIds = new Set<string>();
  let frontier = [rootUserId];

  // Traverse up to 10 hops (covers most family trees)
  for (let depth = 0; depth < 10 && frontier.length > 0; depth++) {
    // Build OR clause for frontier members
    const orClauses = [
      ...frontier.map((id) => `person_id.eq.${id}`),
      ...frontier.map((id) => `related_person_id.eq.${id}`),
    ].join(",");

    const { data: rels } = await admin
      .from("relationships")
      .select("*")
      .or(orClauses);

    const newFrontier: string[] = [];
    for (const rel of rels || []) {
      if (!relIds.has(rel.id)) {
        relIds.add(rel.id);
        allRels.push(rel);
      }
      for (const id of [rel.person_id, rel.related_person_id]) {
        if (!visited.has(id)) {
          visited.add(id);
          newFrontier.push(id);
        }
      }
    }
    frontier = newFrontier;
  }

  return { relationships: allRels, memberIds: Array.from(visited) };
}

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
    // Fallback: server-side BFS traversal using admin client
    // This ensures we get the FULL connected tree, not just direct relationships
    migrationNeeded = true;

    try {
      const { relationships: bfsRels, memberIds } = await getFullTreeBFS(
        profile.id
      );
      relationships = bfsRels;

      if (memberIds.length > 0) {
        const admin = createAdminClient();
        const { data: treeMembers } = await admin
          .from("profiles")
          .select("*")
          .in("id", memberIds);
        members = treeMembers || [];
      } else {
        members = [profile];
      }
    } catch (err) {
      console.error("BFS fallback error:", err);
      // Ultimate fallback: just show the current user
      members = [profile];
      relationships = [];
    }
  }

  const unreadCount = await getUnreadCount(profile.id);

  return (
    <AppShell user={profile} unreadCount={unreadCount}>
      {migrationNeeded && <SetupBanner />}
      <FamilyTreeView
        currentUser={profile}
        members={members}
        relationships={relationships}
      />
    </AppShell>
  );
}
