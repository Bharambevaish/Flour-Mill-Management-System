import { CustomerModel } from "@/models/Customer";
import { LogoutButton, LanguageToggle } from "@/components/common";
import { connectDb } from "@/lib/db";
import { requirePageSession } from "@/lib/auth/requirePageSession";
import { getLang, formatLang } from "@/lib/i18n/i18n";

export const dynamic = "force-dynamic";

export default async function CustomerDashboard() {
  await connectDb();
  const customerId = (await requirePageSession("customer")).toString();
  const lang = await getLang();

  const customer = await CustomerModel.findById(customerId)
    .select("name mobile lang mustChangePin")
    .lean();

  return (
    <main className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {formatLang({ mr: `नमस्कार, ${customer?.name}`, en: `Hello, ${customer?.name}` }, lang)}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {formatLang({ mr: "तुमच्या दळण मालाची स्थिती पहा", en: "Track the status of your grain orders" }, lang)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle initialLang={lang} />
          <LogoutButton />
        </div>
      </header>

      {customer?.mustChangePin && (
        <section className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-400/10">
          <p className="font-medium text-amber-900 dark:text-amber-100">
            {formatLang({ mr: "कृपया नवीन पिन सेट करा", en: "Please set a new PIN" }, lang)}
          </p>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {formatLang(
              { mr: "तुमचा पहिला लॉगिन पिन तात्पुरता आहे. कृपया खात्याच्या सुरक्षेसाठी नवीन पिन सेट करा.", en: "Your first login PIN is temporary. Please update your PIN for account security." },
              lang
            )}
          </p>
        </section>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-4xl font-bold text-emerald-700 dark:text-emerald-400">₹ 0.00</p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {formatLang({ mr: "एकूण उधारी", en: "Total Outstanding Due" }, lang)}
        </p>
      </div>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-100">
          {formatLang({ mr: "माझ्या ऑर्डर्स", en: "My Milling Orders" }, lang)}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {formatLang({ mr: "कोणतीही सक्रिय दळण ऑर्डर नाही.", en: "No active milling orders found." }, lang)}
        </p>
      </section>
    </main>
  );
}