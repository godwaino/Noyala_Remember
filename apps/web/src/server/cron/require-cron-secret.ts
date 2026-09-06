import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getCronSecret } from "@/server/env";

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual throws on mismatched lengths rather than returning
  // false — the length check has to happen first regardless. Only a
  // length match reaches the constant-time byte comparison, so guessing
  // still can't be sped up one byte at a time.
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

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

  const header = request.headers.get("authorization") ?? "";
  if (!timingSafeStringEqual(header, `Bearer ${expected}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
