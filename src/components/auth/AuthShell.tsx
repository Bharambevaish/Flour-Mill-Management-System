import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/common/Icons";

/**
 * Shared frame for both login screens: a terracotta band with the mill's mark
 * and one line of welcome, the form on a paper card beneath. On a phone the
 * band is a short header; from `md` it becomes a side panel.
 */
export function AuthShell({
  title,
  subtitle,
  tagline,
  children,
}: {
  title: string;
  subtitle: string;
  tagline: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col bg-background md:flex-row">
      <aside className="straw relative flex flex-col justify-between gap-6 bg-clay-700 px-6 py-7 text-white md:w-[42%] md:px-12 md:py-12 dark:bg-clay-900">
        <Link href="/" className="flex items-center gap-3">
          <BrandMark className="h-11 w-11 rounded-xl ring-2 ring-white/25" />
          <span className="text-base font-bold leading-tight">
            Flour Mill
            <span className="block text-xs font-medium text-clay-100">गिरणी व्यवस्थापन</span>
          </span>
        </Link>
        <p className="hidden max-w-sm font-display text-3xl leading-snug md:block">{tagline}</p>
        <p className="hidden text-xs text-clay-200 md:block">दळण · उधारी · पावती — एकाच ठिकाणी</p>
      </aside>

      <section className="flex flex-1 items-start justify-center px-5 py-8 md:items-center md:px-10">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl leading-tight text-heading">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
          <div className="mt-6">{children}</div>
          <p className="mt-8 text-sm">
            <Link href="/" className="font-medium text-clay-700 underline-offset-4 hover:underline dark:text-clay-400">
              ← मागे / Back to Home
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
