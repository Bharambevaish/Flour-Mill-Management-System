/**
 * Order status vocabulary, kept free of any mongoose import on purpose.
 *
 * Client components (the customer's status strip, the times list) need these
 * constants at runtime. Importing them from `src/models/Order.ts` would pull the
 * whole schema — and therefore mongoose — into the browser bundle, which the
 * Next build rejects. This module is the client-safe home; the model re-exports
 * it so server-side code can keep importing from where it always has.
 */

export type OrderStatus = "pending" | "processing" | "completed" | "collected" | "cancelled";

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "completed",
  "collected",
  "cancelled",
];

/**
 * The strict forward lifecycle, i.e. every status EXCEPT `cancelled`.
 *
 * `cancelled` is a terminal off-ramp rather than a step in the journey: it can be
 * reached from any non-collected status and is never advanced out of. Keeping it
 * out of this list is what stops the customer's progress strip and the status
 * backfill from treating a cancelled order as having a next step.
 */
export const ORDER_LIFECYCLE_STATUSES = [
  "pending",
  "processing",
  "completed",
  "collected",
] as const satisfies readonly OrderStatus[];

export type OrderLifecycleStatus = (typeof ORDER_LIFECYCLE_STATUSES)[number];
