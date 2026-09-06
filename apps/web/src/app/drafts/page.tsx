import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { MessageAction } from "@noyala/domain";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { listMessageHistoryForUser } from "@/server/messages/queries";
import { EmptyState } from "@/components/EmptyState";
import { formatDateTime } from "@/i18n/format";

export const metadata: Metadata = { title: "Drafts" };

const ACTION_LABEL: Record<MessageAction, string> = {
  copied: "Copied to clipboard",
  opened_in_app: "Opened in app — not confirmed sent",
  marked_sent: "Marked as sent",
};

export default async function DraftsPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const history = await listMessageHistoryForUser(supabase);

  return (
    <div>
      <h1 className="text-xl font-semibold">Message history</h1>
      <p className="text-ink-muted mt-1 text-sm">
        What you&rsquo;ve actually done with generated messages. &ldquo;Opened in app&rdquo; only
        means the app was launched with the text ready — it&rsquo;s never proof the message was
        delivered.
      </p>

      <div className="mt-6">
        {history.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description="Generate a message from a person's page to see it here."
          />
        ) : (
          <ul className="border-border divide-border divide-y rounded-lg border">
            {history.map((entry) => (
              <li key={entry.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-ink text-sm font-medium">
                    <Link href={`/people/${entry.personId}`} className="hover:underline">
                      {entry.personFirstName}
                    </Link>
                  </p>
                  <p className="text-ink-muted text-xs capitalize">
                    {entry.channel} · {ACTION_LABEL[entry.action]}
                  </p>
                </div>
                <p className="text-ink mt-2 line-clamp-2 text-sm">{entry.finalContent}</p>
                <p className="text-ink-muted mt-2 text-xs">
                  {formatDateTime(entry.actedAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
