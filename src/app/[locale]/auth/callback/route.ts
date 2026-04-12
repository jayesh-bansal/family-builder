import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = await createClient();

  if (code) {
    // OAuth or PKCE flow — exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Auth callback error:", error.message);
      return NextResponse.redirect(
        `${origin}/${locale}/login?error=${encodeURIComponent(error.message)}`
      );
    }
  } else if (token_hash && type) {
    // Email verification via token hash (magic link / email confirm)
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "signup" | "email" | "recovery",
    });
    if (error) {
      console.error("OTP verify error:", error.message);
      return NextResponse.redirect(
        `${origin}/${locale}/login?error=${encodeURIComponent(error.message)}`
      );
    }
  } else {
    // No code or token — redirect to login
    return NextResponse.redirect(`${origin}/${locale}/login`);
  }

  // Check if profile needs setup (OAuth users may lack gender/variant)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("gender, family_variant")
      .eq("id", user.id)
      .single();

    if (!profile?.gender || !profile?.family_variant) {
      return NextResponse.redirect(`${origin}/${locale}/setup`);
    }
  }

  return NextResponse.redirect(`${origin}/${locale}/dashboard`);
}
