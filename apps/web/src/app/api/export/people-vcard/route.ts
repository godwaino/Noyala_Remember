import { NextResponse } from "next/server";
import { toVCardCollection } from "@noyala/domain";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { listPeople } from "@/server/people/queries";

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const people = await listPeople(supabase, { includeArchived: true });
  const vcf = toVCardCollection(
    people.map((p) => ({
      firstName: p.firstName,
      lastName: p.lastName,
      nickname: p.nickname,
      phone: p.phone,
      email: p.email,
      notes: p.notes,
    })),
  );

  return new NextResponse(vcf, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="noyala-people.vcf"',
    },
  });
}
