import AppShell from "@/components/layout/AppShell";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <AppShell user={null}>
      <div className="flex items-start md:items-center justify-center min-h-[calc(100dvh-10rem)] px-4 py-6 overflow-y-auto">
        <LoginForm />
      </div>
    </AppShell>
  );
}
