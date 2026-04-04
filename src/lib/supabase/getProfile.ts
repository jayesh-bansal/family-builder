import { createClient } from "./server";
import { createAdminClient } from "./admin";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/types";

export async function getProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    const admin = createAdminClient();

    // Check if a profile already exists with this email (e.g., user signed up
    // with email/password, then logged in with Google using the same email).
    // If so, re-point the existing profile to this auth user so all providers
    // share one dashboard.
    if (user.email) {
      const { data: existingByEmail } = await admin
        .from("profiles")
        .select("*")
        .eq("email", user.email)
        .limit(1)
        .single();

      if (existingByEmail) {
        // Update the existing profile's id to this auth user's id.
        // First, re-point all relationships from old id → new id.
        const oldId = existingByEmail.id;
        const newId = user.id;

        if (oldId !== newId) {
          await Promise.all([
            admin
              .from("relationships")
              .update({ person_id: newId })
              .eq("person_id", oldId),
            admin
              .from("relationships")
              .update({ related_person_id: newId })
              .eq("related_person_id", oldId),
            admin
              .from("notifications")
              .update({ user_id: newId })
              .eq("user_id", oldId),
            admin
              .from("invitations")
              .update({ inviter_id: newId })
              .eq("inviter_id", oldId),
          ]);

          // Delete old profile, then create new one with same data
          await admin.from("profiles").delete().eq("id", oldId);
          const { data: merged } = await admin
            .from("profiles")
            .insert({
              ...existingByEmail,
              id: newId,
              email: user.email,
              phone: user.phone || existingByEmail.phone,
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();

          profile = merged;
        } else {
          profile = existingByEmail;
        }
      }
    }

    // If still no profile (truly new user), create one
    if (!profile) {
      const { data: newProfile } = await admin
        .from("profiles")
        .upsert({
          id: user.id,
          full_name:
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            user.phone ||
            "User",
          email: user.email || null,
          phone: user.phone || null,
        })
        .select()
        .single();

      profile = newProfile;
    }
  }

  if (!profile) {
    redirect("/login");
  }

  return profile as Profile;
}
