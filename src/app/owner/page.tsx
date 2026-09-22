import { AdminModel } from "@/models/Admin";
import { connectDb } from "@/lib/db";
import { requirePageSession } from "@/lib/auth/requirePageSession";
import { listCustomers } from "@/services/customerService";
import { listOrders } from "@/services/orderService";
import { getLang, formatLang } from "@/lib/i18n/i18n";
import { DashboardQuickActions, DashboardAutoRefresh, CustomerStatusGrid, type CustomerStatusRow } from "@/components/owner/dashboard";

export const dynamic = "force-dynamic";

export default async function OwnerDashboard() {
  await connectDb();
  const adminId = (await requirePageSession("owner")).toString();
  const lang = await getLang();

  const [admin, customers, orders] = await Promise.all([
    AdminModel.findById(adminId).select("name email").lean(),
    listCustomers(),
    listOrders(),
  ]);

  /* Per-customer aggregation */
  type Agg = { totalCharges: number; paidAmount: number; orders: typeof orders };
  const byCustomer = new Map<string, Agg>();
  for (const order of orders) {
    if (!order.customer) continue;
    const agg = byCustomer.get(order.customer.id) ?? { totalCharges: 0, paidAmount: 0, orders: [] as typeof orders };
    agg.totalCharges += order.totalCharges;
    agg.paidAmount += order.paidAmount;
    agg.orders.push(order);
    byCustomer.set(order.customer.id, agg);
  }

  const rows: CustomerStatusRow[] = customers.map((c) => {
    const agg = byCustomer.get(c.id) ?? { totalCharges: 0, paidAmount: 0, orders: [] as typeof orders };
    const outstanding = Math.max(0, Math.round((agg.totalCharges - agg.paidAmount) * 100) / 100);
    const activeOrder =
      [...agg.orders].filter((o) => o.status !== "collected").sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0] ?? null;
    return { customer: c, orderCount: agg.orders.length, totalCharges: agg.totalCharges, paidAmount: agg.paidAmount, outstanding, activeOrder };
  });

  rows.sort((a, b) => {
    const aa = a.outstanding > 0 || a.activeOrder !== null;
    const bb = b.outstanding > 0 || b.activeOrder !== null;
    if (aa !== bb) return aa ? -1 : 1;
    if (a.outstanding !== b.outstanding) return b.outstanding - a.outstanding;
    return a.customer.name.localeCompare(b.customer.name, "en");
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const isToday = (t: string) => new Date(t).getTime() >= startOfToday.getTime();
  const newToday = orders.filter((o) => isToday(o.createdAt)).length;
  const collectedToday = orders
    .filter((o) => o.status === "collected" && isToday(o.updatedAt))
    .reduce((s, o) => s + o.totalCharges, 0);

  const stats = [
    {
      title: formatLang({ mr: "सक्रिय ग्राहक", en: "Active Customers" }, lang),
      value: String(customers.filter((c) => c.active).length),
    },
    {
      title: formatLang({ mr: "आजच्या नवीन ऑर्डर", en: "New Orders Today" }, lang),
      value: String(newToday),
    },
    {
      title: formatLang({ mr: "आजचा वसूल", en: "Collected Today" }, lang),
      value: `₹ ${collectedToday.toLocaleString("en-IN")}`,
    },
    {
      title: formatLang({ mr: "नवीन (सुरू झाल्या नाहीत)", en: "Not Started (Pending)" }, lang),
      value: String(orders.filter((o) => o.status === "pending").length),
    },
    {
      title: formatLang({ mr: "ऑर्डर चालू", en: "Processing" }, lang),
      value: String(orders.filter((o) => o.status === "processing").length),
    },
    {
      title: formatLang({ mr: "तयार ऑर्डर", en: "Ready to Collect" }, lang),
      value: String(orders.filter((o) => o.status === "completed").length),
    },
    {
      title: formatLang({ mr: "एकूण उधारी", en: "Total Outstanding" }, lang),
      value: `₹ ${rows.reduce((s, r) => s + r.outstanding, 0).toLocaleString("en-IN")}`,
    },
    {
      title: formatLang({ mr: "उधारी असलेले ग्राहक", en: "Customers with Dues" }, lang),
      value: String(rows.filter((r) => r.outstanding > 0).length),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {formatLang({ mr: `स्वागत आहे, ${admin?.name}`, en: `Welcome back, ${admin?.name}` }, lang)}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {formatLang({ mr: "आजचा व्यवसाय व ऑर्डर अपडेट्स", en: "Today's mill operations overview" }, lang)}
          </p>
        </div>
        <DashboardAutoRefresh />
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <section
            key={s.title}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{s.title}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{s.value}</p>
          </section>
        ))}
      </div>

      <DashboardQuickActions />

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              {formatLang({ mr: "ग्राहकांची स्थिती (लक्ष देणे आवश्यक)", en: "Customer Status (Attention Needed)" }, lang)}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {formatLang(
                { mr: "कुणाची ऑर्डर प्रलंबित किंवा उधारी बाकी आहे", en: "Customers with active orders or outstanding balances" },
                lang
              )}
            </p>
          </div>
        </div>
        <CustomerStatusGrid customers={rows} showAttentionOnly lang={lang} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
          {formatLang({ mr: "सर्व ग्राहक सूची", en: "All Customers Overview" }, lang)}
        </h2>
        <CustomerStatusGrid customers={rows} lang={lang} />
      </section>
    </div>
  );
}