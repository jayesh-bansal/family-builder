import createMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Track refreshed cookies so we can forward them to the response
  let refreshedCookies: { name: string; value: string; options: any }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Update request cookies so server components see refreshed session
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          refreshedCookies = cookiesToSet;
        },
      },
    }
  );

  // Single auth call to refresh the session
  await supabase.auth.getUser();

  // Run intl middleware (request cookies already updated above)
  const intlResponse = intlMiddleware(request);

  // Forward refreshed auth cookies to the browser response
  refreshedCookies.forEach(({ name, value, options }) => {
    intlResponse.cookies.set(name, value, options);
  });

  return intlResponse;
}

export const config = {
  matcher: [
    "/",
    "/(en|es)/:path*",
    "/((?!_next|api|favicon\\.ico|.*\\..*).*)",
  ],
};
