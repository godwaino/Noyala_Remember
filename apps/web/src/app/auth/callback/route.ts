import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { logger } from "@/server/logger";

/**
 * Exchanges the magic-link code for a session, then routes into onboarding
 * (profile creation checks happen there, not here, to keep this handler
 * simple and side-effect-free beyond the auth exchange itself).
 *
 * The real failure reason is passed through as `?error=` rather than
 * swallowed, because the most common cause — the single-use link/code
 * already being consumed (an email client's link-scanner visiting it
 * before the user does, or the user re-clicking an old email) — is
 * something the user can actually act on (request a new link), and a
 * silent bounce back to a blank sign-in form looks indistinguishable from
 * sign-in being broken. See docs/decisions/0007-magic-link-error-surfacing.md.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Supabase's own /verify endpoint redirects here with its own
  // error/error_description instead of a code when the link itself was
  // already invalid (expired, already used, malformed) — that failure
  // never reaches exchangeCodeForSession at all.
  const upstreamError = searchParams.get("error_description") ?? searchParams.get("error");
  if (upstreamError) {
    logger.warn("Magic-link verification failed before reaching the callback", {
      message: upstreamError,
    });
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(upstreamError)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/onboarding`);
    }
    logger.warn("Magic-link code exchange failed", { message: error.message });
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  } catch (error) {
    logger.error("Magic-link callback threw unexpectedly", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.redirect(`${origin}/login?error=unexpected_error`);
  }
}
