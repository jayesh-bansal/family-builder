import AppShell from "@/components/layout/AppShell";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <AppShell user={null}>
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] px-4">
        <LoginForm />
      </div>
    </AppShell>
  );
}
