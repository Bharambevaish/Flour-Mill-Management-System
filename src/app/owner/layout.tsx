import type { ReactNode } from "react";
import { OwnerSidebar } from "@/components/owner";
import { getLang } from "@/lib/i18n/i18n";
import { getSettingsOrDefault } from "@/services/settingsService";

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const [settings, lang] = await Promise.all([getSettingsOrDefault(), getLang()]);
  return (
    <div className="flex min-h-screen flex-col bg-[#faf5f7] font-sans md:flex-row dark:bg-zinc-950">
      <OwnerSidebar millName={settings.millName} lang={lang} />
      <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}