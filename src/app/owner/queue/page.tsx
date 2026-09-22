import { listOrders } from "@/services/orderService";
import { listActiveCustomers } from "@/services/customerService";
import { QueuePanel } from "@/components/owner/orders";
import { requirePageSession } from "@/lib/auth/requirePageSession";
import { formatLang } from "@/lib/i18n/i18n";
import { getEffectiveLang, getSettingsRates } from "@/services/settingsService";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const [session, orders, customers, lang, defaultRates] = await Promise.all([
    requirePageSession("owner"),
    listOrders({ excludeCollected: true }),
    listActiveCustomers(),
    getEffectiveLang(),
    getSettingsRates(),
  ]);
  void session;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {formatLang({ mr: "दळण्याची थेट यादी", en: "Live Milling Queue" }, lang)}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {formatLang(
            {
              mr: "रांग क्रमाने (लहान क्र. प्रथम). ऑर्डर पूर्ण होताच क्रम आपोआप वर सरकतो.",
              en: "In queue rank order. Token numbers shift up automatically as orders are processed.",
            },
            lang
          )}
        </p>
      </header>

      <QueuePanel orders={orders} customers={customers} defaultRates={defaultRates} />
    </div>
  );
}