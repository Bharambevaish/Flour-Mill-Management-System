import type { ReactNode } from "react";
import { OwnerSidebar, SeedDemoButton } from "@/components/owner";
import { getLang } from "@/lib/i18n/i18n";
import { getSettingsOrDefault } from "@/services/settingsService";

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const [settings, lang] = await Promise.all([getSettingsOrDefault(), getLang()]);
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans md:flex-row dark:bg-zinc-950">
      <OwnerSidebar millName={settings.millName} lang={lang} />
      <SeedDemoButton />
      <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}