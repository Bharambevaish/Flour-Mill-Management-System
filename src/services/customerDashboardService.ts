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

export interface CustomerDashboardView {
  customer: {
    id: string;
    name: string;
    mobile: string;
    mustChangePin: boolean;
    lang: Lang;
  };
  outstandingTotal: number;
  activeOrderCount: number;
  orders: OrderView[];
  notifications: CustomerNotificationView[];
  unreadCount: number;
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
    .select("name mobile mustChangePin lang active")
    .lean();
  if (!customer || !customer.active) throw unauthorizedError("Not signed in");

  const [orders, notifications, unreadCount] = await Promise.all([
    getOrdersForCustomer(customerId),
    listNotificationsForCustomer(customerId as Types.ObjectId),
    unreadNotificationCount(customerId as Types.ObjectId),
  ]);

  return {
    customer: {
      id: String(customer._id),
      name: customer.name,
      mobile: customer.mobile,
      mustChangePin: customer.mustChangePin,
      lang: customer.lang,
    },
    outstandingTotal:
      Math.round(orders.reduce((s, o) => s + o.outstanding, 0) * 100) / 100,
    activeOrderCount: orders.filter((o) => o.status !== "collected").length,
    orders,
    notifications,
    unreadCount,
  };
}