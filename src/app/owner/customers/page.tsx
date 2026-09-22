import { listCustomers } from "@/services/customerService";
import { CustomersPanel } from "@/components/owner/customers";
import { requirePageSession } from "@/lib/auth/requirePageSession";
import { getLang, formatLang } from "@/lib/i18n/i18n";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const [session, customers, lang] = await Promise.all([
    requirePageSession("owner"),
    listCustomers(),
    getLang(),
  ]);
  void session;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {formatLang({ mr: "ग्राहक व्यवस्थापन", en: "Customer Management" }, lang)}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {formatLang({ mr: "सर्व नोंदणीकृत ग्राहक खाती", en: "All registered customer accounts and profiles" }, lang)}
        </p>
      </header>

      <CustomersPanel initialCustomers={customers} />
    </div>
  );
}