import type { Metadata } from "next";
import { brand } from "@noyala/brand";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Sign in to {brand.name}</h1>
      <p className="text-ink-muted mt-1 text-sm">
        We&apos;ll email you a link — no password to remember.
      </p>
      <LoginForm />
    </div>
  );
}
