import "server-only";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/server/env";

/**
 * apps/mobile has no cookies to carry a session the way apps/web's
 * `@supabase/ssr` client does — it sends the signed-in user's access
 * token as a bearer header instead (see apps/mobile/src/data/client.ts's
 * `callMobileApi`). This still authenticates as that user and is
 * RLS-scoped exactly like the cookie-based client; it just reads the
 * token from a header instead of a cookie jar. Never uses the
 * service-role key.
 */
export function getSupabaseBearerClient(accessToken: string): SupabaseClient {
  const { url, anonKey } = getSupabasePublicEnv();
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface MobileAuthContext {
  client: SupabaseClient;
  user: User;
}

/** Returns null (never throws) when the request isn't authenticated, so
 * route handlers can respond with a plain 401 instead of a 500. */
export async function authenticateMobileRequest(request: Request): Promise<MobileAuthContext | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  const client = getSupabaseBearerClient(token);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;

  return { client, user };
}
