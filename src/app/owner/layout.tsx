import type { ReactNode } from "react";
import { OwnerSidebar } from "@/components/owner";
import { getLang } from "@/lib/i18n/i18n";
import { getSettingsOrDefault } from "@/services/settingsService";

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const [settings, lang] = await Promise.all([getSettingsOrDefault(), getLang()]);
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans md:flex-row dark:bg-earth-950">
      <OwnerSidebar millName={settings.millName} lang={lang} />
      <main className="min-w-0 flex-1 px-4 py-5 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}