"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { INVERSE_RELATIONSHIP } from "@/lib/types";
import type { RelationshipType } from "@/lib/types";

interface ActionResult {
  success?: boolean;
  error?: string;
}

/**
 * Server action: Accept an invitation.
 * Uses the admin client to bypass RLS for all operations.
 */
export async function acceptInvitation(
  invitationId: string,
  token: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    // 1. Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "not_authenticated" };

    // 2. Fetch invitation (admin bypasses RLS)
    const { data: invitation } = await admin
      .from("invitations")
      .select("*")
      .eq("id", invitationId)
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (!invitation) return { error: "invalid_invitation" };

    // 3. Prevent self-acceptance
    if (invitation.inviter_id === user.id) {
      return { error: "cannot_accept_own_invitation" };
    }

    // 4. Ensure the accepting user has a profile
    let { data: accepterProfile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!accepterProfile) {
      const { data: newProfile } = await admin
        .from("profiles")
        .upsert({
          id: user.id,
          full_name:
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "User",
          email: user.email,
        })
        .select()
        .single();
      accepterProfile = newProfile;
    }

    const accepterName =
      accepterProfile?.full_name || user.email?.split("@")[0] || "Someone";

    // 5. Fetch inviter profile for notification message
    const { data: inviter } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", invitation.inviter_id)
      .single();

    // 6. Update invitation status to accepted
    const { error: updateError } = await admin
      .from("invitations")
      .update({ status: "accepted" })
      .eq("id", invitation.id);
    if (updateError) return { error: "failed_to_update_invitation" };

    // 7. Check if relationships already exist (prevent duplicates)
    const relType = invitation.relationship_type as RelationshipType;
    const inverseType = INVERSE_RELATIONSHIP[relType];

    const { data: existingRels } = await admin
      .from("relationships")
      .select("id, relationship_type")
      .or(
        `and(person_id.eq.${invitation.inviter_id},related_person_id.eq.${user.id}),` +
          `and(person_id.eq.${user.id},related_person_id.eq.${invitation.inviter_id})`
      );

    const existingTypes = new Set(
      (existingRels || []).map((r) => `${r.relationship_type}`)
    );

    // Check if this is the first relationship between this pair
    const isFirstRelationship = !existingRels || existingRels.length === 0;

    // 8. Create bidirectional relationships (only if they don't already exist)
    const inserts = [];

    if (!existingTypes.has(relType)) {
      inserts.push(
        admin.from("relationships").insert({
          person_id: invitation.inviter_id,
          related_person_id: user.id,
          relationship_type: relType,
          is_confirmed: true,
          is_primary: isFirstRelationship,
          created_by: user.id,
        })
      );
    }

    if (!existingTypes.has(inverseType)) {
      inserts.push(
        admin.from("relationships").insert({
          person_id: user.id,
          related_person_id: invitation.inviter_id,
          relationship_type: inverseType,
          is_confirmed: true,
          is_primary: isFirstRelationship,
          created_by: user.id,
        })
      );
    }

    if (inserts.length > 0) {
      const results = await Promise.all(inserts);
      const insertError = results.find((r) => r.error);
      if (insertError?.error) {
        console.error("Relationship insert error:", insertError.error);
        return { error: "failed_to_create_relationships" };
      }
    }

    // 9. Transfer placeholder relationships if present (with deduplication)
    if (invitation.placeholder_id) {
      const placeholderId = invitation.placeholder_id;

      // Fetch all placeholder relationships
      const { data: placeholderRels } = await admin
        .from("relationships")
        .select("*")
        .or(`person_id.eq.${placeholderId},related_person_id.eq.${placeholderId}`);

      // Fetch all existing relationships for the real user
      const { data: userRels } = await admin
        .from("relationships")
        .select("*")
        .or(`person_id.eq.${user.id},related_person_id.eq.${user.id}`);

      const userRelKeys = new Set(
        (userRels || []).map((r) => {
          const otherId = r.person_id === user.id ? r.related_person_id : r.person_id;
          return `${otherId}:${r.relationship_type}`;
        })
      );

      const toTransfer: string[] = [];
      const toDelete: string[] = [];

      for (const rel of placeholderRels || []) {
        const isSource = rel.person_id === placeholderId;
        const otherId = isSource ? rel.related_person_id : rel.person_id;

        // Skip self-referencing (placeholder linked to the real user directly —
        // these were already created in step 8)
        if (otherId === user.id) {
          toDelete.push(rel.id);
          continue;
        }

        // Check if real user already has this exact relationship type with this person
        const key = isSource
          ? `${otherId}:${rel.relationship_type}` // same direction: user → other
          : `${otherId}:${rel.relationship_type}`; // same direction: other → user

        if (userRelKeys.has(key)) {
          // Duplicate — delete the placeholder's version
          toDelete.push(rel.id);
        } else {
          // Safe to transfer
          toTransfer.push(rel.id);
          // Track it so subsequent checks in this loop see it
          userRelKeys.add(key);
        }
      }

      // Transfer non-conflicting relationships
      if (toTransfer.length > 0) {
        await Promise.all([
          admin
            .from("relationships")
            .update({ person_id: user.id })
            .eq("person_id", placeholderId)
            .in("id", toTransfer),
          admin
            .from("relationships")
            .update({ related_person_id: user.id })
            .eq("related_person_id", placeholderId)
            .in("id", toTransfer),
        ]);
      }

      // Delete duplicate/conflicting relationships
      if (toDelete.length > 0) {
        await admin
          .from("relationships")
          .delete()
          .in("id", toDelete);
      }

      // Delete the placeholder profile
      await admin
        .from("profiles")
        .delete()
        .eq("id", placeholderId);
    }

    // 10. Create notifications for both parties
    await Promise.all([
      admin.from("notifications").insert({
        user_id: invitation.inviter_id,
        type: "tree_linked",
        title: "Invitation Accepted!",
        message: `${accepterName} has accepted your invitation and your family trees are now connected!`,
        data: { invitation_id: invitation.id, accepted_by: user.id },
      }),
      admin.from("notifications").insert({
        user_id: user.id,
        type: "tree_linked",
        title: "Family Tree Connected!",
        message: `You are now connected to ${inviter?.full_name || "your family member"}'s family tree.`,
        data: {
          invitation_id: invitation.id,
          inviter_id: invitation.inviter_id,
        },
      }),
    ]);

    return { success: true };
  } catch (err) {
    console.error("acceptInvitation error:", err);
    return { error: "unexpected_error" };
  }
}

/**
 * Server action: Decline an invitation.
 * Uses the admin client to bypass RLS for all operations.
 */
export async function declineInvitation(
  invitationId: string,
  token: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    // 1. Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "not_authenticated" };

    // 2. Fetch invitation (admin bypasses RLS)
    const { data: invitation } = await admin
      .from("invitations")
      .select("*")
      .eq("id", invitationId)
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (!invitation) return { error: "invalid_invitation" };

    // 3. Get decliner's name
    const { data: declinerProfile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const declinerName =
      declinerProfile?.full_name || user.email?.split("@")[0] || "Someone";

    // 4. Update invitation status to declined
    const { error: updateError } = await admin
      .from("invitations")
      .update({ status: "declined" })
      .eq("id", invitation.id);
    if (updateError) return { error: "failed_to_update_invitation" };

    // 5. Notify the inviter
    await admin.from("notifications").insert({
      user_id: invitation.inviter_id,
      type: "invite",
      title: "Invitation Declined",
      message: `${declinerName} has declined your invitation.`,
      data: { invitation_id: invitation.id, declined_by: user.id },
    });

    return { success: true };
  } catch (err) {
    console.error("declineInvitation error:", err);
    return { error: "unexpected_error" };
  }
}
