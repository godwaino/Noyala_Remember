import { NextResponse } from "next/server";
import { toCsv } from "@noyala/domain";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { listAllMemoriesForUser } from "@/server/memories/queries";

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const memories = await listAllMemoriesForUser(supabase);
  const csv = toCsv(
    ["person", "content", "category", "sensitivity", "occurred_on", "archived"],
    memories.map(({ memory, personFirstName }) => [
      personFirstName,
      memory.content,
      memory.category,
      memory.sensitivity,
      memory.occurredOn,
      memory.archivedAt ? "yes" : "no",
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="noyala-memories.csv"',
    },
  });
}
