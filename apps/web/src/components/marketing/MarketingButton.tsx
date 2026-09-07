import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "destructive";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-marketing-action text-white border border-transparent hover:bg-marketing-action-hover",
  secondary:
    "bg-marketing-paper text-marketing-ink border border-marketing-border hover:border-marketing-clay hover:text-marketing-clay-text",
  destructive:
    "bg-marketing-paper text-marketing-red border border-marketing-destructive-border hover:border-marketing-red",
};

/**
 * Shared shape for both the link and the button. Interaction states are
 * deliberately restrained — a colour shift, a 1px lift and a soft shadow —
 * so the site answers the pointer without bouncing. `motion-reduce:` opts
 * out of the movement, and globals.css already neutralises transition
 * durations under `prefers-reduced-motion`.
 */
const BASE = [
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-[11px] px-5 text-[15px] font-semibold no-underline",
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out",
  "hover:-translate-y-px hover:shadow-[0_6px_16px_-8px_rgba(37,34,41,0.45)] motion-reduce:hover:translate-y-0",
  "active:translate-y-0 active:shadow-none",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marketing-clay",
  "disabled:cursor-default disabled:border-transparent disabled:bg-marketing-disabled disabled:text-white",
  "disabled:hover:translate-y-0 disabled:hover:shadow-none",
].join(" ");

export function MarketingLinkButton({
  href,
  variant = "primary",
  className = "",
  children,
  ...rest
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link href={href} className={`${BASE} ${VARIANT_CLASSES[variant]} ${className}`} {...rest}>
      {children}
    </Link>
  );
}

export function MarketingButton({
  variant = "primary",
  className = "",
  children,
  ...rest
}: { variant?: Variant; className?: string; children: React.ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`${BASE} ${VARIANT_CLASSES[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
