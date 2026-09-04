import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv, getSupabaseServiceRoleKey } from "@/server/env";

/**
 * Bypasses Row Level Security. For background workers and admin tooling
 * ONLY — never construct this in a code path reachable directly from user
 * input without an explicit authorization check first. See
 * docs/architecture.md ("Next.js server ↔ Postgres").
 */
export function getSupabaseServiceRoleClient() {
  const { url } = getSupabasePublicEnv();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
