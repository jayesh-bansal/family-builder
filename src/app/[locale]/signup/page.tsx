import AppShell from "@/components/layout/AppShell";
import SignupForm from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <AppShell user={null}>
      <div className="flex items-start md:items-center justify-center min-h-[calc(100dvh-10rem)] px-4 py-6 overflow-y-auto">
        <SignupForm />
      </div>
    </AppShell>
  );
}
