import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

/**
 * Mirrors apps/web/src/server/supabase/browser-client.ts: an
 * RLS-respecting client using only the public anon key. Session storage
 * uses AsyncStorage (the RN equivalent of the browser's cookie jar the web
 * app relies on) so a signed-in session survives an app restart.
 *
 * Reads EXPO_PUBLIC_* env vars only — never a service-role key, which has
 * no business being in a mobile app bundle at all.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

/**
 * Safe to construct even when unconfigured (empty strings) — every screen
 * that touches data checks `isSupabaseConfigured` first and shows an
 * honest "sign-in isn't configured yet" state instead, matching the web
 * app's degrade-lenient behaviour (see apps/web `GET /api/health`).
 */
export const supabase = createClient(supabaseUrl || "https://placeholder.invalid", supabaseAnonKey || "placeholder", {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

/** Bearer-token-authenticated calls to the mobile-facing routes in
 * apps/web (see apps/web/src/app/api/mobile/) — used only for the two
 * operations that need a server-side secret: AI message generation and
 * voice transcription. Everything else in this app talks to Supabase
 * directly under RLS. */
export async function callMobileApi<T>(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in.");

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: init.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  const json = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | { error: string }
    | null;

  if (!response.ok) {
    const message = (json && "error" in json && json.error) || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return json as T;
}
