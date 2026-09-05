import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { getCronSecret } from "@/server/env";

/**
 * Guards a scheduled route: requires `Authorization: Bearer <CRON_SECRET>`.
 * Returns a 401 response to send back immediately, or null if the request
 * is authorized. Vercel Cron sends this header automatically when
 * `CRON_SECRET` is set on the project — see vercel.json and
 * https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs.
 */
export function requireCronSecret(request: NextRequest): NextResponse | null {
  let expected: string;
  try {
    expected = getCronSecret();
  } catch {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  const header = request.headers.get("authorization");
  if (header !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
