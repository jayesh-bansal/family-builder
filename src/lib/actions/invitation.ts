"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { INVERSE_RELATIONSHIP, RELATIONSHIP_LABELS } from "@/lib/types";
import type { RelationshipType } from "@/lib/types";

interface ActionResult {
  success?: boolean;
  error?: string;
}

interface CreateInvitationInput {
  contactValue: string;
  contactType: "email" | "phone";
  relationshipType: RelationshipType;
}

interface CreateInvitationResult {
  success?: boolean;
  invitation?: any;
  error?: string;
}

/**
 * Server action: Create an invitation.
 * Uses admin client to:
 * 1. Create the invitation record
 * 2. Look up the recipient by email/phone
 * 3. If found, send them an in-app notification (Facebook-style)
 */
export async function createInvitation(
  input: CreateInvitationInput
): Promise<CreateInvitationResult> {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    // Verify authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    // Prevent self-invitation
    if (
      (input.contactType === "email" && user.email === input.contactValue.trim()) ||
      (input.contactType === "phone" && user.phone === input.contactValue.trim())
    ) {
      return { error: "You cannot invite yourself." };
    }

    // Check if this person is already in the user's tree
    const profileQuery = input.contactType === "email"
      ? admin.from("profiles").select("id").eq("email", input.contactValue.trim()).single()
      : admin.from("profiles").select("id").eq("phone", input.contactValue.trim()).single();
    const { data: existingProfile } = await profileQuery;

    if (existingProfile) {
      // Check if they're already connected via relationships
      const { data: existingRel } = await admin
        .from("relationships")
        .select("id")
        .or(`and(person_id.eq.${user.id},related_person_id.eq.${existingProfile.id}),and(person_id.eq.${existingProfile.id},related_person_id.eq.${user.id})`)
        .limit(1);

      if (existingRel && existingRel.length > 0) {
        return { error: "This person is already in your family tree." };
      }
    }

    // Build insert data
    const insertData: Record<string, unknown> = {
      inviter_id: user.id,
      relationship_type: input.relationshipType,
    };

    if (input.contactType === "email") {
      insertData.email = input.contactValue;
    } else {
      insertData.phone = input.contactValue;
    }

    // Create invitation via admin
    const { data: invitation, error: insertError } = await admin
      .from("invitations")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error("Invitation insert error:", insertError);
      return { error: "Failed to create invitation." };
    }

    // Look up the recipient to send them a notification
    let recipientUserId: string | null = null;

    if (input.contactType === "email") {
      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("email", input.contactValue)
        .single();
      recipientUserId = profile?.id || null;
    } else {
      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("phone", input.contactValue)
        .single();
      recipientUserId = profile?.id || null;
    }

    // If recipient exists on the platform, create a notification for them
    if (recipientUserId && recipientUserId !== user.id) {
      const { data: inviterProfile } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const inviterName = inviterProfile?.full_name || "Someone";
      const relLabel =
        RELATIONSHIP_LABELS[input.relationshipType] ||
        input.relationshipType.replace("_", " ");

      await admin.from("notifications").insert({
        user_id: recipientUserId,
        type: "invite",
        title: "Family Tree Invitation",
        message: `${inviterName} has invited you to join their family tree as their ${relLabel}.`,
        data: {
          invitation_id: invitation.id,
          token: invitation.token,
          inviter_id: user.id,
          inviter_name: inviterName,
          relationship_type: input.relationshipType,
          action: "received",
        },
      });
    }

    return { success: true, invitation };
  } catch (err) {
    console.error("createInvitation error:", err);
    return { error: "Unexpected error occurred." };
  }
}

/**
 * Server action: Accept an invitation.
 * Uses the admin client to bypass RLS for all operations.
 * Merges both users' complete family trees by creating the connecting relationship.
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

    // 2b. Check if invitation has expired
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      await admin
        .from("invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);
      return { error: "invitation_expired" };
    }

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
            user.phone ||
            "User",
          email: user.email,
          phone: user.phone,
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
        .or(
          `person_id.eq.${placeholderId},related_person_id.eq.${placeholderId}`
        );

      // Fetch all existing relationships for the real user
      const { data: userRels } = await admin
        .from("relationships")
        .select("*")
        .or(`person_id.eq.${user.id},related_person_id.eq.${user.id}`);

      const userRelKeys = new Set(
        (userRels || []).map((r) => {
          const otherId =
            r.person_id === user.id ? r.related_person_id : r.person_id;
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
        const key = `${otherId}:${rel.relationship_type}`;

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
        // Update relationships where placeholder is the person_id
        const transferAsSource = (placeholderRels || [])
          .filter(
            (r) => r.person_id === placeholderId && toTransfer.includes(r.id)
          )
          .map((r) => r.id);

        // Update relationships where placeholder is the related_person_id
        const transferAsTarget = (placeholderRels || [])
          .filter(
            (r) =>
              r.related_person_id === placeholderId &&
              toTransfer.includes(r.id)
          )
          .map((r) => r.id);

        const transferOps = [];
        if (transferAsSource.length > 0) {
          transferOps.push(
            admin
              .from("relationships")
              .update({ person_id: user.id })
              .in("id", transferAsSource)
          );
        }
        if (transferAsTarget.length > 0) {
          transferOps.push(
            admin
              .from("relationships")
              .update({ related_person_id: user.id })
              .in("id", transferAsTarget)
          );
        }
        if (transferOps.length > 0) {
          await Promise.all(transferOps);
        }
      }

      // Delete duplicate/conflicting relationships
      if (toDelete.length > 0) {
        await admin.from("relationships").delete().in("id", toDelete);
      }

      // Delete the placeholder profile
      await admin.from("profiles").delete().eq("id", placeholderId);
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
