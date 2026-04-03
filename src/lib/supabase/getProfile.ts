import { createClient } from "./server";
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

  // Auto-create profile if it doesn't exist
  if (!profile) {
    const { data: newProfile } = await supabase
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

  if (!profile) {
    redirect("/login");
  }

  return profile as Profile;
}
