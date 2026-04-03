import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/getProfile";
import AppShell from "@/components/layout/AppShell";
import NotificationsContent from "@/components/pages/NotificationsContent";

export default async function NotificationsPage() {
  const profile = await getProfile();
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <AppShell user={profile}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <NotificationsContent notifications={notifications || []} />
      </div>
    </AppShell>
  );
}
