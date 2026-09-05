import { NextResponse } from "next/server";
import { toCsv } from "@noyala/domain";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { listPeople } from "@/server/people/queries";

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const people = await listPeople(supabase, user.id, { includeArchived: true });
  const csv = toCsv(
    ["first_name", "last_name", "nickname", "relationship_type", "phone", "email", "pronouns", "notes", "archived"],
    people.map((p) => [
      p.firstName,
      p.lastName,
      p.nickname,
      p.relationshipType,
      p.phone,
      p.email,
      p.pronouns,
      p.notes,
      p.archivedAt ? "yes" : "no",
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="noyala-people.csv"',
    },
  });
}
