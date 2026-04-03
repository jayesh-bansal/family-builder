import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Persist auth session in cookies + localStorage for Capacitor WebView.
      // Without this, the session is lost when the app is closed on mobile.
      auth: {
        persistSession: true,
        storageKey: "banyan-auth",
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
      },
    }
  );
}
