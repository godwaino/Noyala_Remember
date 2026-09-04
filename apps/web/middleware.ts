import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "@/server/env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Refreshes the Supabase auth session cookie on every request, per the
 * @supabase/ssr recommended pattern. If Supabase isn't configured yet in
 * this environment, requests pass through unchanged rather than 500ing.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  let publicEnv;
  try {
    publicEnv = getSupabasePublicEnv();
  } catch {
    return response;
  }

  const supabase = createServerClient(publicEnv.url, publicEnv.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refresh the session if it exists. Result intentionally unused here —
  // route-level checks decide access; this just keeps cookies current.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
