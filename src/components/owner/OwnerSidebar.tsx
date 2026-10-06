"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton, LanguageToggle } from "@/components/common";

const NAV_ITEMS = [
  { href: "/owner", mr: "डॅशबोर्ड", en: "Dashboard", Icon: IconGrid },
  { href: "/owner/customers", mr: "ग्राहक", en: "Customers", Icon: IconUsers },
  { href: "/owner/new-order", mr: "नवीन ऑर्डर", en: "New Order", Icon: IconPlus },
  { href: "/owner/queue", mr: "दळण्याची यादी", en: "Queue", Icon: IconList },
  { href: "/owner/payments", mr: "पेमेंट्स", en: "Payments", Icon: IconRupee },
  { href: "/owner/outstanding", mr: "उधारी", en: "Outstanding", Icon: IconWallet },
  { href: "/owner/notifications", mr: "सूचना", en: "Notifications", Icon: IconBell },
  { href: "/owner/reports", mr: "अहवाल", en: "Reports", Icon: IconChart },
  { href: "/owner/settings", mr: "सेटिंग्स", en: "Settings", Icon: IconCog },
] as const;

export function OwnerSidebar({ millName, lang = "en" }: { millName?: string; lang?: "mr" | "en" }) {
  const pathname = usePathname();

  function isActive(item: (typeof NAV_ITEMS)[number]): boolean {
    if (item.href === "/owner") return pathname === "/owner";
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return (
    <>
      <aside className="no-print hidden w-64 shrink-0 flex-col border-r border-[#f4e6e9] bg-white shadow-[2px_0_16px_rgba(157,23,77,0.03)] md:flex dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
        <Brand millName={millName} />
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3.5 py-4">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.href} item={item} active={isActive(item)} lang={lang} />
          ))}
        </nav>
        <div className="flex flex-col gap-2.5 border-t border-[#faedf0] p-3.5 dark:border-zinc-800">
          <div className="flex justify-center">
            <LanguageToggle initialLang={lang} />
          </div>
          <LogoutButton lang={lang} />
        </div>
      </aside>

      {/* Mobile: top brand bar + horizontal nav */}
      <header className="no-print sticky top-0 z-40 flex items-center justify-between border-b border-[#f4e6e9] bg-white/95 px-4 py-3 backdrop-blur-md md:hidden dark:border-zinc-800 dark:bg-zinc-900/95">
        <Brand compact millName={millName} />
        <LogoutButton lang={lang} />
      </header>
      <nav className="no-print flex gap-2 overflow-x-auto border-b border-[#f4e6e9] bg-[#faf5f7] px-4 py-2.5 md:hidden dark:border-zinc-800 dark:bg-zinc-950">
        {NAV_ITEMS.map((item) => (
          <MobileChip key={item.href} item={item} active={isActive(item)} lang={lang} />
        ))}
      </nav>
    </>
  );
}

function Brand({
  compact = false,
}: {
  compact?: boolean;
  millName?: string;
}) {
  return (
    <div className={`flex items-center gap-3 border-b border-[#faedf0] dark:border-zinc-800 ${compact ? "border-b-0 py-1" : "px-5 py-4"}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-600 via-rose-500 to-amber-400 text-lg font-bold text-white shadow-glow-pink">
        🌾
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] sm:text-sm font-extrabold leading-tight text-[#9d174d] dark:text-zinc-100">
          Feed and Flour Management
        </p>
        <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wider text-rose-800/70 dark:text-zinc-400">
          ENTERPRISE MILL OS
        </p>
      </div>
    </div>
  );
}

function SidebarLink({
  item,
  active,
  lang,
}: {
  item: (typeof NAV_ITEMS)[number];
  active: boolean;
  lang: "mr" | "en";
}) {
  const Icon = item.Icon;
  const label = lang === "mr" ? item.mr : item.en;
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
        active
          ? "border border-rose-200/90 bg-gradient-to-r from-rose-100/90 to-pink-50 text-rose-800 shadow-xs dark:border-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
          : "text-[#684a53] hover:bg-rose-50/70 hover:text-rose-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      }`}
    >
      <Icon className={`h-5 w-5 shrink-0 transition-transform ${active ? "text-rose-700 dark:text-zinc-900" : "text-[#936b76] dark:text-zinc-400"}`} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function MobileChip({
  item,
  active,
  lang,
}: {
  item: (typeof NAV_ITEMS)[number];
  active: boolean;
  lang: "mr" | "en";
}) {
  const Icon = item.Icon;
  const label = lang === "mr" ? item.mr : item.en;
  return (
    <Link
      href={item.href}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
        active
          ? "border-rose-300 bg-gradient-to-r from-rose-100 to-pink-50 text-rose-800 shadow-xs dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
          : "border-rose-200/80 bg-white text-[#684a53] hover:bg-rose-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}

/* ---------- inline icons (stroke, consistent with the app) ---------- */

function Icon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

function IconGrid({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </Icon>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Icon>
  );
}

function IconPlus({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

function IconList({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </Icon>
  );
}

function IconRupee({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M6 3h12M6 8h12M6 8c6 0 8 2 8 7M6 8h8M9 21l8-9" />
    </Icon>
  );
}

function IconWallet({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </Icon>
  );
}

function IconBell({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Icon>
  );
}

function IconChart({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M3 3v18h18" />
      <path d="M7 15l4-5 3 3 5-7" />
    </Icon>
  );
}

function IconCog({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Icon>
  );
}