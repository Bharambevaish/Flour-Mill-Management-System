import Link from "next/link";
import { AdminModel } from "@/models/Admin";
import { PaymentClaimModel } from "@/models/PaymentClaim";
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

  const [admin, customers, orders, pendingClaimsCount] = await Promise.all([
    AdminModel.findById(adminId).select("name email").lean(),
    listCustomers(),
    listOrders(),
    PaymentClaimModel.countDocuments({ status: "pending" }),
  ]);

  /* Per-customer aggregation.
   *
   * Sums each order's OWN `outstanding` rather than re-deriving
   * `charges - paid` from totals. That matters because `outstanding` is the
   * single source of truth for "what does this person owe": a CANCELLED order
   * reports 0 there and its cash shows as `refundDue`, so a voided order can
   * never inflate the dashboard's उधारी figure. */
  type Agg = { totalCharges: number; paidAmount: number; outstanding: number; refundDue: number; orders: typeof orders };
  const byCustomer = new Map<string, Agg>();
  for (const order of orders) {
    if (!order.customer) continue;
    const agg = byCustomer.get(order.customer.id) ?? {
      totalCharges: 0,
      paidAmount: 0,
      outstanding: 0,
      refundDue: 0,
      orders: [] as typeof orders,
    };
    agg.totalCharges += order.totalCharges;
    agg.paidAmount += order.paidAmount;
    agg.outstanding += order.outstanding;
    agg.refundDue += order.refundDue;
    agg.orders.push(order);
    byCustomer.set(order.customer.id, agg);
  }

  const rows: CustomerStatusRow[] = customers.map((c) => {
    const agg = byCustomer.get(c.id) ?? {
      totalCharges: 0,
      paidAmount: 0,
      outstanding: 0,
      refundDue: 0,
      orders: [] as typeof orders,
    };
    const outstanding = Math.round(agg.outstanding * 100) / 100;
    // Cancelled orders are not "active work" — only live queue orders are.
    const activeOrder =
      [...agg.orders].filter((o) => o.status !== "collected" && o.status !== "cancelled").sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0] ?? null;
    return {
      customer: c,
      orderCount: agg.orders.length,
      totalCharges: agg.totalCharges,
      paidAmount: agg.paidAmount,
      outstanding,
      refundDue: Math.round(agg.refundDue * 100) / 100,
      activeOrder,
    };
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
  // Cancelled orders are void, so they don't count as new business today.
  const newToday = orders.filter((o) => o.status !== "cancelled" && isToday(o.createdAt)).length;
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
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#4c0519] dark:text-zinc-100">
            {formatLang({ mr: `सस्नेह नमस्कार, ${admin?.name}`, en: `Welcome back, ${admin?.name}` }, lang)}
          </h1>
          <p className="mt-1 text-sm font-medium text-[#6b545a] dark:text-zinc-400">
            {formatLang({ mr: "आजचा व्यवसाय व थेट ऑपरेशन्स आढावा", en: "Today's mill operations overview & telemetry" }, lang)}
          </p>
        </div>
        <DashboardAutoRefresh lang={lang} />
      </header>

      {pendingClaimsCount > 0 && (
        <Link
          href="/owner/payments"
          className="flex items-center justify-between gap-3 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-rose-50 p-4 shadow-sm transition-all hover:border-amber-400 dark:border-amber-700/60 dark:bg-zinc-900"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-xl text-amber-700 dark:text-amber-300">
              🔔
            </span>
            <div>
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {formatLang(
                  {
                    mr: `${pendingClaimsCount} ग्राहकांनी QR/UPI द्वारे पेमेंट केले आहे — पडताळणी प्रलंबित!`,
                    en: `${pendingClaimsCount} customers reported UPI payments — Verification pending!`,
                  },
                  lang,
                )}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {formatLang(
                  {
                    mr: "खात्री करून जमा नोंदवण्यासाठी येथे क्लिक करा →",
                    en: "Click here to verify receipts and record payments →",
                  },
                  lang,
                )}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-white shadow-xs">
            {pendingClaimsCount}
          </span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, idx) => {
          const isOutstanding = idx === 6 || idx === 7;
          const isCollected = idx === 2;
          return (
            <section
              key={s.title}
              className="stitch-card p-5"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-[#805e68] dark:text-zinc-400">
                {s.title}
              </p>
              <p
                className={`mt-2 text-3xl font-extrabold ${
                  isOutstanding
                    ? "text-rose-700 dark:text-rose-400"
                    : isCollected
                      ? "text-emerald-800 dark:text-emerald-400"
                      : "text-gray-900 dark:text-zinc-100"
                }`}
              >
                {s.value}
              </p>
            </section>
          );
        })}
      </div>

      <DashboardQuickActions lang={lang} />

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#4c0519] dark:text-zinc-100">
              {formatLang({ mr: "ग्राहकांची स्थिती (लक्ष देणे आवश्यक)", en: "Customer Status (Attention Needed)" }, lang)}
            </h2>
            <p className="text-xs font-medium text-[#6b545a] dark:text-zinc-400">
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
        <h2 className="text-lg font-bold text-[#4c0519] dark:text-zinc-100">
          {formatLang({ mr: "सर्व ग्राहक सूची", en: "All Customers Overview" }, lang)}
        </h2>
        <CustomerStatusGrid customers={rows} lang={lang} />
      </section>
    </div>
  );
}