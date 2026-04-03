import AppShell from "@/components/layout/AppShell";
import SignupForm from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <AppShell user={null}>
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] px-4">
        <SignupForm />
      </div>
    </AppShell>
  );
}
