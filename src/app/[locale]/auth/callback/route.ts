import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Auth callback error:", error.message);
      return NextResponse.redirect(
        `${origin}/${locale}/login?error=${encodeURIComponent(error.message)}`
      );
    }
  } else if (type === "signup" || type === "email") {
    // Email verification redirect — code already exchanged by Supabase
    return NextResponse.redirect(`${origin}/${locale}/dashboard`);
  } else {
    // No code provided — redirect to login
    return NextResponse.redirect(`${origin}/${locale}/login`);
  }

  return NextResponse.redirect(`${origin}/${locale}/dashboard`);
}
