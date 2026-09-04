import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/server/supabase/server-client";

/**
 * Exchanges the magic-link code for a session, then routes into onboarding
 * (profile creation checks happen there, not here, to keep this handler
 * simple and side-effect-free beyond the auth exchange itself).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    try {
      const supabase = await getSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}/onboarding`);
      }
    } catch {
      // Falls through to the error redirect below.
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
