"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "@/server/env";

/**
 * RLS-respecting Supabase client for Client Components. Reads
 * NEXT_PUBLIC_* config only — never import the service-role key here.
 */
export function getSupabaseBrowserClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  return createBrowserClient(url, anonKey);
}
