import { listOrders } from "@/services/orderService";
import { listActiveCustomers } from "@/services/customerService";
import { QueueTabs } from "@/components/owner/orders";
import { requirePageSession } from "@/lib/auth/requirePageSession";
import { formatLang } from "@/lib/i18n/i18n";
import { getEffectiveLang, getSettingsRates } from "@/services/settingsService";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const [session, liveOrders, cancelledOrders, customers, lang, defaultRates] = await Promise.all([
    requirePageSession("owner"),
    // excludeCollected already drops cancelled ones too; the second call is the
    // Cancelled tab's own dataset.
    listOrders({ excludeCollected: true }),
    listOrders({ status: "cancelled" }),
    listActiveCustomers(),
    getEffectiveLang(),
    getSettingsRates(),
  ]);
  void session;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-heading dark:text-earth-100">
          {formatLang({ mr: "दळण रांग (थेट ऑपरेशन्स)", en: "Live Milling Queue" }, lang)}
        </h1>
        <p className="mt-1 text-sm font-medium text-muted dark:text-earth-400">
          {formatLang(
            {
              mr: "रांग क्रमाने (लहान क्र. प्रथम). ऑर्डर पूर्ण होताच क्रम आपोआप वर सरकतो.",
              en: "In queue rank order. Token numbers shift up automatically as orders are processed.",
            },
            lang
          )}
        </p>
      </header>

      <QueueTabs
        liveOrders={liveOrders}
        cancelledOrders={cancelledOrders}
        customers={customers}
        defaultRates={defaultRates}
        lang={lang}
      />
    </div>
  );
}
