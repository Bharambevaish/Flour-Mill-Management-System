import { LogoutButton, LanguageToggle } from "@/components/common";
import { CustomerNotificationsPanel, CustomerOrdersPanel } from "@/components/customer";
import { connectDb } from "@/lib/db";
import { requirePageSession } from "@/lib/auth/requirePageSession";
import { getLang } from "@/lib/i18n/i18n";
import { getCustomerDashboard } from "@/services/customerDashboardService";

export const dynamic = "force-dynamic";

export default async function CustomerDashboard() {
  await connectDb();
  const customerId = (await requirePageSession("customer")).toString();
  const lang = await getLang();
  const mr = lang === "mr";

  const dash = await getCustomerDashboard(customerId);
  const dueZero = dash.outstandingTotal <= 0;

  return (
    <main className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {mr ? `नमस्कार, ${dash.customer.name}` : `Hello, ${dash.customer.name}`}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {mr
              ? "तुमच्या दळण मालाची स्थिती पहा"
              : "Track the status of your grain orders"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle initialLang={lang} />
          <LogoutButton />
        </div>
      </header>

      {dash.customer.mustChangePin && (
        <section className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-400/10">
          <p className="font-medium text-amber-900 dark:text-amber-100">
            {mr ? "कृपया नवीन पिन सेट करा" : "Please set a new PIN"}
          </p>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {mr
              ? "तुमचा पहिला लॉगिन पिन तात्पुरता आहे. कृपया खात्याच्या सुरक्षेसाठी नवीन पिन सेट करा."
              : "Your first login PIN is temporary. Please update your PIN for account security."}
          </p>
        </section>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p
            className={`text-3xl font-bold ${
              dueZero ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
            }`}
          >
            ₹ {dash.outstandingTotal.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {mr ? "एकूण उधारी" : "Total Outstanding Due"}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            {dash.activeOrderCount}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {mr ? "सक्रिय दळण ऑर्डर" : "Active Orders"}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p
            className={`text-3xl font-bold ${
              dash.unreadCount > 0
                ? "text-rose-700 dark:text-rose-400"
                : "text-zinc-900 dark:text-zinc-100"
            }`}
          >
            {dash.unreadCount}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {mr ? "न वाचलेल्या सूचना" : "Unread Notifications"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <CustomerNotificationsPanel notifications={dash.notifications} lang={lang} />
        <CustomerOrdersPanel orders={dash.orders} lang={lang} />
      </div>
    </main>
  );
}