import "server-only";

import type { Types } from "mongoose";

import { connectDb } from "@/lib/db";
import { unauthorizedError } from "@/lib/errors";
import type { Lang } from "@/lib/i18n";
import { CustomerModel } from "@/models/Customer";
import {
  getOrdersForCustomer,
  type OrderView,
} from "@/services/orderService";
import {
  listNotificationsForCustomer,
  unreadNotificationCount,
  type CustomerNotificationView,
} from "@/services/notificationService";
import { getSettingsOrDefault } from "@/services/settingsService";
import {
  listPaymentClaimsForCustomer,
  type PaymentClaimView,
} from "@/services/paymentClaimService";

export interface CustomerDashboardView {
  customer: {
    id: string;
    name: string;
    mobile: string;
    lang: Lang;
  };
  outstandingTotal: number;
  activeOrderCount: number;
  orders: OrderView[];
  notifications: CustomerNotificationView[];
  pendingClaims: PaymentClaimView[];
  unreadCount: number;
  /**
   * How to pay. `hasUpiQr` is a flag rather than the image itself so the
   * dashboard payload stays small — the QR is fetched on demand from
   * `GET /api/my/payment-qr` only once the customer opens the pay panel.
   */
  payment: {
    hasUpiQr: boolean;
    upiId: string;
    millPhone: string;
  };
}

/**
 * Single source of truth for the customer dashboard. Every query is keyed off
 * the given customerId (never a client-supplied id), reuses the exact same
 * `OrderView.outstanding` math as the owner side, so the customer sees exactly
 * what the owner sees. Used by the /my page, GET /api/my/overview and tests.
 */
export async function getCustomerDashboard(
  customerId: Types.ObjectId | string,
): Promise<CustomerDashboardView> {
  await connectDb();

  const customer = await CustomerModel.findById(customerId)
    .select("name mobile lang active")
    .lean();
  if (!customer || !customer.active) throw unauthorizedError("Not signed in");

  const [orders, notifications, unreadCount, settings, pendingClaims] = await Promise.all([
    getOrdersForCustomer(customerId),
    listNotificationsForCustomer(customerId as Types.ObjectId),
    unreadNotificationCount(customerId as Types.ObjectId),
    getSettingsOrDefault(),
    listPaymentClaimsForCustomer(customerId as Types.ObjectId),
  ]);

  return {
    customer: {
      id: String(customer._id),
      name: customer.name,
      mobile: customer.mobile,
      lang: customer.lang,
    },
    outstandingTotal:
      Math.round(orders.reduce((s, o) => s + o.outstanding, 0) * 100) / 100,
    // Cancelled orders are void, so they are neither active work nor something
    // the customer still owes. They stay in `orders` (with a Cancelled badge) so
    // the record is visible, but they don't inflate this count.
    activeOrderCount: orders.filter((o) => o.status !== "collected" && o.status !== "cancelled")
      .length,
    orders,
    notifications,
    pendingClaims,
    unreadCount,
    payment: {
      hasUpiQr: settings.upiQr !== null,
      upiId: settings.upiId,
      millPhone: settings.phone || "",
    },
  };
}