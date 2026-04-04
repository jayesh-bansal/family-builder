"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { INVERSE_RELATIONSHIP } from "@/lib/types";
import type { RelationshipType } from "@/lib/types";
import { computeAutoLinks } from "@/lib/relationships";

interface AddMemberInput {
  fullName: string;
  email?: string;
  birthDate?: string;
  location?: string;
  gender: "male" | "female" | "other";
  relationshipType: RelationshipType;
  relatedTo: string;
  isPlaceholder: boolean;
  isPrimary: boolean;
}

interface ActionResult {
  success?: boolean;
  error?: string;
}

/**
 * Server action: Add a family member to the tree.
 * Uses admin client to bypass RLS — critical for placeholder profiles
 * which have UUIDs that don't exist in auth.users.
 */
export async function addFamilyMember(
  input: AddMemberInput
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    // Verify authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const {
      fullName,
      email,
      birthDate,
      location,
      gender,
      relationshipType,
      relatedTo,
      isPlaceholder,
      isPrimary,
    } = input;

    // Prevent self-referential relationships
    if (!isPlaceholder && relatedTo === user.id) {
      return { error: "Cannot create a relationship with yourself." };
    }

    if (isPlaceholder) {
      // Generate UUID for the placeholder profile
      const newMemberId = crypto.randomUUID();

      // Create placeholder profile via admin (bypasses RLS + FK constraint)
      const { error: profileError } = await admin.from("profiles").insert({
        id: newMemberId,
        full_name: fullName,
        email: email || null,
        birth_date: birthDate || null,
        location: location || null,
        gender,
        is_placeholder: true,
        created_by: user.id,
      });

      if (profileError) {
        console.error("Profile insert error:", profileError);
        return { error: "Failed to create member profile. " + profileError.message };
      }

      // Fetch existing relationships for auto-link computation
      const { data: existingRels } = await admin
        .from("relationships")
        .select("*")
        .or(`person_id.eq.${relatedTo},related_person_id.eq.${relatedTo}`);

      // Primary bidirectional relationships
      const allInserts: {
        person_id: string;
        related_person_id: string;
        relationship_type: RelationshipType;
        is_confirmed: boolean;
        is_primary: boolean;
        created_by: string;
      }[] = [
        {
          person_id: relatedTo,
          related_person_id: newMemberId,
          relationship_type: relationshipType,
          is_confirmed: true,
          is_primary: isPrimary,
          created_by: user.id,
        },
        {
          person_id: newMemberId,
          related_person_id: relatedTo,
          relationship_type: INVERSE_RELATIONSHIP[relationshipType],
          is_confirmed: true,
          is_primary: isPrimary,
          created_by: user.id,
        },
      ];

      // Auto-link relationships (e.g., parent → siblings, child → spouse)
      const autoLinks = computeAutoLinks(
        existingRels || [],
        relatedTo,
        newMemberId,
        relationshipType
      );
      for (const link of autoLinks) {
        allInserts.push({
          ...link,
          is_confirmed: true,
          is_primary: isPrimary,
          created_by: user.id,
        });
      }

      const { error: relError } = await admin
        .from("relationships")
        .insert(allInserts);

      if (relError) {
        console.error("Relationship insert error:", relError);
        // Clean up the profile we just created
        await admin.from("profiles").delete().eq("id", newMemberId);
        return { error: "Failed to create relationships. " + relError.message };
      }
    } else {
      // Non-placeholder: create relationship between existing members
      const allInserts = [
        {
          person_id: relatedTo,
          related_person_id: user.id,
          relationship_type: relationshipType,
          is_confirmed: false,
          is_primary: isPrimary,
          created_by: user.id,
        },
        {
          person_id: user.id,
          related_person_id: relatedTo,
          relationship_type: INVERSE_RELATIONSHIP[relationshipType],
          is_confirmed: false,
          is_primary: isPrimary,
          created_by: user.id,
        },
      ];

      const { error: relError } = await admin
        .from("relationships")
        .insert(allInserts);

      if (relError) {
        console.error("Relationship insert error:", relError);
        return { error: "Failed to create relationship. " + relError.message };
      }
    }

    return { success: true };
  } catch (err) {
    console.error("addFamilyMember error:", err);
    return { error: "Unexpected error occurred." };
  }
}

interface EditMemberInput {
  memberId: string;
  fullName: string;
  email?: string;
  birthDate?: string;
  location?: string;
  gender?: "male" | "female" | "other";
  avatarUrl?: string;
}

/**
 * Server action: Edit a placeholder member's details.
 * Only the creator (or any authenticated user for now) can edit placeholders.
 */
export async function editFamilyMember(
  input: EditMemberInput
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    // Verify the member exists and is a placeholder
    const { data: member } = await admin
      .from("profiles")
      .select("id, is_placeholder, created_by")
      .eq("id", input.memberId)
      .single();

    if (!member) return { error: "Member not found." };
    if (!member.is_placeholder) {
      return { error: "Can only edit placeholder members." };
    }

    const { error: updateError } = await admin
      .from("profiles")
      .update({
        full_name: input.fullName,
        email: input.email || null,
        birth_date: input.birthDate || null,
        location: input.location || null,
        gender: input.gender || null,
        avatar_url: input.avatarUrl || null,
      })
      .eq("id", input.memberId);

    if (updateError) {
      console.error("Edit member error:", updateError);
      return { error: "Failed to update member." };
    }

    return { success: true };
  } catch (err) {
    console.error("editFamilyMember error:", err);
    return { error: "Unexpected error occurred." };
  }
}

/**
 * Server action: Delete a placeholder member and all their relationships.
 */
export async function deleteFamilyMember(
  memberId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    // Verify placeholder
    const { data: member } = await admin
      .from("profiles")
      .select("id, is_placeholder, created_by")
      .eq("id", memberId)
      .single();

    if (!member) return { error: "Member not found." };
    if (!member.is_placeholder) {
      return { error: "Can only delete placeholder members." };
    }

    // Delete all relationships involving this member
    await admin
      .from("relationships")
      .delete()
      .or(`person_id.eq.${memberId},related_person_id.eq.${memberId}`);

    // Delete the profile
    const { error: deleteError } = await admin
      .from("profiles")
      .delete()
      .eq("id", memberId);

    if (deleteError) {
      console.error("Delete member error:", deleteError);
      return { error: "Failed to delete member." };
    }

    return { success: true };
  } catch (err) {
    console.error("deleteFamilyMember error:", err);
    return { error: "Unexpected error occurred." };
  }
}

/**
 * Server action: Upload avatar for a member (stores in Supabase Storage).
 */
export async function uploadMemberAvatar(
  memberId: string,
  formData: FormData
): Promise<{ success?: boolean; url?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const file = formData.get("avatar") as File;
    if (!file) return { error: "No file provided." };

    // Validate file
    if (file.size > 5 * 1024 * 1024) return { error: "File too large (max 5MB)." };
    if (!file.type.startsWith("image/")) return { error: "File must be an image." };

    const ext = file.name.split(".").pop() || "jpg";
    const path = `avatars/${memberId}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await admin.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return { error: "Failed to upload image." };
    }

    // Get public URL
    const { data: urlData } = admin.storage
      .from("avatars")
      .getPublicUrl(path);

    const publicUrl = urlData.publicUrl;

    // Update profile avatar_url
    await admin
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", memberId);

    return { success: true, url: publicUrl };
  } catch (err) {
    console.error("uploadMemberAvatar error:", err);
    return { error: "Unexpected error occurred." };
  }
}
