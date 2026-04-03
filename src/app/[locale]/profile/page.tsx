import { getProfile } from "@/lib/supabase/getProfile";
import AppShell from "@/components/layout/AppShell";
import ProfileForm from "@/components/pages/ProfileForm";

export default async function ProfilePage() {
  const profile = await getProfile();

  return (
    <AppShell user={profile}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <ProfileForm profile={profile} />
      </div>
    </AppShell>
  );
}
