import { connectDb } from "@/lib/db";
import { requirePageSession } from "@/lib/auth/requirePageSession";
import { getLang } from "@/lib/i18n/i18n";
import { CustomerPortal } from "@/components/customer";
import { getCustomerDashboard } from "@/services/customerDashboardService";

export const dynamic = "force-dynamic";

export default async function MyOrdersPage() {
  await connectDb();
  const customerId = (await requirePageSession("customer")).toString();
  const lang = await getLang();

  const dash = await getCustomerDashboard(customerId);

  return <CustomerPortal dash={dash} lang={lang} />;
}
