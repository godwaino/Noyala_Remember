import { NextResponse } from "next/server";
import { toCsv } from "@noyala/domain";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { listAllImportantDatesForUser } from "@/server/important-dates/queries";

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const dates = await listAllImportantDatesForUser(supabase);
  const csv = toCsv(
    ["person", "type", "label", "month", "day", "year", "recurs_annually", "timezone"],
    dates.map(({ date, personFirstName }) => [
      personFirstName,
      date.type,
      date.label,
      date.month,
      date.day,
      date.year,
      date.recursAnnually ? "yes" : "no",
      date.timezone,
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="noyala-important-dates.csv"',
    },
  });
}
