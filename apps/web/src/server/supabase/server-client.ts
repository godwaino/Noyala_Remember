import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabasePublicEnv } from "@/server/env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * RLS-respecting Supabase client for use in Server Components, server
 * actions and route handlers. Reads/writes only what the signed-in user's
 * policies allow — never use this for background-worker access, which
 * needs the service-role client instead.
 *
 * `cookies()` is called first (before touching env vars) so that, during
 * Next.js's static-generation attempt at build time, the framework's
 * dynamic-API bail-out fires before any missing-config error would.
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabasePublicEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render, where cookies can't be
          // written. Safe to ignore as long as middleware.ts is also
          // refreshing the session on the request/response cycle.
        }
      },
    },
  });
}
