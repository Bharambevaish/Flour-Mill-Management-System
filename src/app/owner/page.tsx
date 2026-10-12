import Link from "next/link";
import { IconBell } from "@/components/common";
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
          <h1 className="text-3xl leading-tight text-heading">
            {formatLang({ mr: `सस्नेह नमस्कार, ${admin?.name}`, en: `Welcome back, ${admin?.name}` }, lang)}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {formatLang({ mr: "आजचा व्यवसाय व थेट ऑपरेशन्स आढावा", en: "Today's mill at a glance" }, lang)}
          </p>
        </div>
        <DashboardAutoRefresh lang={lang} />
      </header>

      {pendingClaimsCount > 0 && (
        <Link
          href="/owner/payments"
          className="flex items-center justify-between gap-3 rounded-xl border border-haldi-300 bg-haldi-50 p-4 transition-colors hover:border-haldi-400 dark:border-haldi-700/60 dark:bg-earth-900"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-haldi-400/20 text-xl text-haldi-700 dark:text-haldi-300">
              <IconBell className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-earth-900 dark:text-earth-100">
                {formatLang(
                  {
                    mr: `${pendingClaimsCount} ग्राहकांनी QR/UPI द्वारे पेमेंट केले आहे — पडताळणी प्रलंबित!`,
                    en: `${pendingClaimsCount} customers reported UPI payments — Verification pending!`,
                  },
                  lang,
                )}
              </p>
              <p className="text-xs text-earth-500 dark:text-earth-400">
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
          <span className="rounded-full bg-haldi-500 px-3 py-1 text-xs font-black text-white shadow-xs">
            {pendingClaimsCount}
          </span>
        </Link>
      )}

      {/* Three panels instead of eight equal tiles: what happened today, what
          is physically in the mill, and what is still owed. */}
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1.2fr_1fr]">
        <section className="stitch-card p-5">
          <h2 className="text-lg text-heading">{formatLang({ mr: "आज", en: "Today" }, lang)}</h2>
          <dl className="mt-4 grid grid-cols-3 gap-3">
            {[stats[1], stats[2], stats[0]].map((s, i) => (
              <div key={s.title}>
                <dt className="text-xs font-medium leading-tight text-muted">{s.title}</dt>
                <dd className={`mt-1.5 font-display text-[26px] leading-none ${i === 1 ? "text-leaf-700 dark:text-leaf-400" : "text-heading"}`}>
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="stitch-card p-5">
          <h2 className="text-lg text-heading">{formatLang({ mr: "गिरणीत सध्या", en: "In the mill now" }, lang)}</h2>
          <ol className="mt-4 grid grid-cols-3 gap-2">
            {[
              { s: stats[3], dot: "bg-haldi-500", href: "/owner/queue" },
              { s: stats[4], dot: "bg-neel-500", href: "/owner/queue" },
              { s: stats[5], dot: "bg-leaf-600", href: "/owner/queue" },
            ].map(({ s, dot, href }) => (
              <li key={s.title}>
                <Link href={href} className="block rounded-lg border border-[var(--border-subtle)] px-3 py-2.5 transition-colors hover:border-[var(--border-strong)] hover:bg-earth-50 dark:hover:bg-earth-800/50">
                  <span className="flex items-center gap-1.5 text-xs font-medium leading-tight text-muted">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                    <span className="truncate">{s.title}</span>
                  </span>
                  <span className="mt-1.5 block font-display text-[26px] leading-none text-heading">{s.value}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="stitch-card flex flex-col justify-between p-5">
          <h2 className="text-lg text-heading">{formatLang({ mr: "उधारी", en: "Outstanding" }, lang)}</h2>
          <div className="mt-4">
            <p className="font-display text-[36px] leading-none text-clay-700 dark:text-clay-400">{stats[6].value}</p>
            <p className="mt-2 text-sm text-muted">
              {stats[7].value} · {stats[7].title}
            </p>
          </div>
          <Link href="/owner/outstanding" className="mt-3 text-sm font-semibold text-clay-700 hover:underline dark:text-clay-400">
            {formatLang({ mr: "उधारी यादी पहा →", en: "View dues →" }, lang)}
          </Link>
        </section>
      </div>

      <DashboardQuickActions lang={lang} />

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl text-heading">
              {formatLang({ mr: "ग्राहकांची स्थिती (लक्ष देणे आवश्यक)", en: "Customer Status (Attention Needed)" }, lang)}
            </h2>
            <p className="text-xs font-medium text-muted dark:text-earth-400">
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
        <h2 className="text-xl text-heading">
          {formatLang({ mr: "सर्व ग्राहक सूची", en: "All Customers Overview" }, lang)}
        </h2>
        <CustomerStatusGrid customers={rows} lang={lang} />
      </section>
    </div>
  );
}