/**
 * Env var access is deliberately lazy (read on first use, not at module
 * import time) so `next build` never fails just because a real Supabase
 * project hasn't been provisioned yet in this environment. Deployment
 * pipelines should still run `pnpm --filter @noyala/web validate-env`
 * (scripts/validate-env.ts) before promoting a build, which eagerly checks
 * every required variable and exits non-zero if any are missing.
 */

export class MissingEnvError extends Error {
  constructor(public readonly missing: string[]) {
    super(
      `Missing required environment variable(s): ${missing.join(", ")}. See .env.example.`,
    );
    this.name = "MissingEnvError";
  }
}

export interface SupabasePublicEnv {
  url: string;
  anonKey: string;
}

/** Throws MissingEnvError if the browser-safe Supabase config isn't set. */
export function getSupabasePublicEnv(): SupabasePublicEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (missing.length > 0) throw new MissingEnvError(missing);
  return { url, anonKey } as SupabasePublicEnv;
}

/** Server-only. Bypasses Row Level Security — never expose to the browser. */
export function getSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new MissingEnvError(["SUPABASE_SERVICE_ROLE_KEY"]);
  return key;
}

/**
 * Every environment variable the running app can depend on, and whether
 * it's required for a production deployment. Used by both this module and
 * scripts/validate-env.ts so the two never drift apart.
 */
export const ENV_VARS = [
  { name: "NEXT_PUBLIC_SUPABASE_URL", required: true },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", required: true },
  { name: "SUPABASE_SERVICE_ROLE_KEY", required: true },
  { name: "NEXT_PUBLIC_APP_URL", required: true },
  { name: "EMAIL_PROVIDER_API_KEY", required: false },
  { name: "EMAIL_FROM_ADDRESS", required: false },
  { name: "VAPID_PUBLIC_KEY", required: false },
  { name: "VAPID_PRIVATE_KEY", required: false },
  { name: "VAPID_SUBJECT", required: false },
  { name: "NEXT_PUBLIC_VAPID_PUBLIC_KEY", required: false },
  { name: "CRON_SECRET", required: true },
  { name: "AI_PROVIDER_API_KEY", required: false },
  { name: "ERROR_MONITORING_DSN", required: false },
] as const;

/**
 * Server-only. The scheduled reminder-discovery/outbox-processing routes
 * refuse to run without this — see apps/web/src/server/cron/require-cron-secret.ts.
 */
export function getCronSecret(): string {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new MissingEnvError(["CRON_SECRET"]);
  return secret;
}
