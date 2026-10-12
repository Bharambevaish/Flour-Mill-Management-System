import { listActiveCustomers } from "@/services/customerService";
import { NewOrderForm } from "@/components/owner/orders";
import { requirePageSession } from "@/lib/auth/requirePageSession";
import { formatLang } from "@/lib/i18n/i18n";
import { getEffectiveLang, getSettingsRates } from "@/services/settingsService";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const [session, customers, lang, defaultRates] = await Promise.all([
    requirePageSession("owner"),
    listActiveCustomers(),
    getEffectiveLang(),
    getSettingsRates(),
  ]);
  void session;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-heading dark:text-earth-100">
          {formatLang({ mr: "नवीन दळण नोंद", en: "Create New Order" }, lang)}
        </h1>
        <p className="mt-1 text-sm font-medium text-muted dark:text-earth-400">
          {formatLang(
            { mr: "धान्य, वजन (किग्रॅ), आवश्यक बारीक/मध्यम साईज व दर नोंदवा", en: "Record grain type, weight (kg), grind size, and milling charges" },
            lang
          )}
        </p>
      </header>

      <section className="stitch-card p-6">
        <NewOrderForm customers={customers} defaultRates={defaultRates} initialLang={lang} />
      </section>
    </div>
  );
}