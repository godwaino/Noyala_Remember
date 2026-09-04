import { NextResponse } from "next/server";
import { ENV_VARS } from "@/server/env";

/**
 * Reveals no personal data — only which required config is present, never
 * its value, and no user/job content. Safe to expose without auth for
 * uptime monitoring.
 */
export function GET() {
  const missingRequired = ENV_VARS.filter(
    (v) => v.required && !process.env[v.name],
  ).map((v) => v.name);

  const status = missingRequired.length === 0 ? "ok" : "degraded";

  return NextResponse.json(
    { status, missingRequiredEnv: missingRequired },
    { status: status === "ok" ? 200 : 503 },
  );
}
