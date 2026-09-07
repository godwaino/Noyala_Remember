import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "destructive";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-marketing-action text-white border border-transparent",
  secondary: "bg-marketing-paper text-marketing-ink border border-marketing-border",
  destructive: "bg-marketing-paper text-marketing-red border border-marketing-destructive-border",
};

const BASE = "inline-flex min-h-12 items-center justify-center rounded-[11px] px-5 text-[15px] font-semibold no-underline disabled:cursor-default disabled:border-transparent disabled:bg-marketing-disabled disabled:text-white";

export function MarketingLinkButton({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`${BASE} ${VARIANT_CLASSES[variant]} ${className}`}>
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
