import { cookies } from "next/headers";

import { SettingsPanel } from "@/components/owner/settings";
import { requirePageSession } from "@/lib/auth/requirePageSession";
import { getLang } from "@/lib/i18n/i18n";
import { isOwnerTotpEnabled } from "@/services/authService";
import { getSettingsOrDefault } from "@/services/settingsService";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const actorId = (await requirePageSession("owner")).toString();

  const [settings, twoFaEnabled, lang] = await Promise.all([
    getSettingsOrDefault(),
    isOwnerTotpEnabled(actorId),
    getLang(),
  ]);

  let initialTheme: "dark" | "light" = "dark";
  try {
    const store = await cookies();
    const theme = store.get("theme")?.value;
    if (theme === "dark" || theme === "light") initialTheme = theme;
  } catch {
    // fall through
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-earth-900 dark:text-earth-100 font-display">
          सेटिंग्स / Settings
        </h1>
        <p className="text-sm text-earth-500 dark:text-earth-400">
          भाषा, चक्की प्रोफाइल, दळणाचे दर आणि सूचनांचे व्यवस्थापन
        </p>
      </header>

      <SettingsPanel
        initialSettings={settings}
        initialTheme={initialTheme}
        initialTwoFaEnabled={twoFaEnabled}
        initialLang={lang}
      />
    </div>
  );
}