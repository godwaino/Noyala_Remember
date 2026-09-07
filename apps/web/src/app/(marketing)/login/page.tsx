import type { Metadata } from "next";
import { brand } from "@noyala/brand";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

function friendlyCallbackError(raw: string): string {
  const lower = raw.toLowerCase();
  if (raw === "missing_code" || lower.includes("expired") || lower.includes("invalid") || lower.includes("not found")) {
    return "That sign-in link isn't valid — it may have expired or already been used. Request a new code below instead.";
  }
  if (raw === "unexpected_error") {
    return "Something went wrong completing sign-in. Please try again.";
  }
  return `Sign-in failed: ${raw}. Please request a new code below.`;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div>
      <h1 className="text-xl font-semibold">Sign in to {brand.name}</h1>
      <p className="text-ink-muted mt-1 text-sm">
        We&apos;ll email you a 6-digit code — no password to remember.
      </p>
      {error ? (
        <p role="alert" className="text-danger bg-primary-muted/20 mt-4 rounded-md p-3 text-sm">
          {friendlyCallbackError(error)}
        </p>
      ) : null}
      <LoginForm />
    </div>
  );
}
