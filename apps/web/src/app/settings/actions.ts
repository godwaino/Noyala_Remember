"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/server/supabase/server-client";

export async function signOut() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
