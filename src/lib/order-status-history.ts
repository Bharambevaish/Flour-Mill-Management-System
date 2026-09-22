import type {
  AnyBulkWriteOperation,
  Collection,
  Document,
  Filter,
  ObjectId,
} from "mongodb";

/** The strict forward order of the milling lifecycle (mirrors Order.ts). */
export const ORDER_STATUS_ORDER = [
  "pending",
  "processing",
  "completed",
  "collected",
] as const;

export type OrderStatusT = (typeof ORDER_STATUS_ORDER)[number];

export interface StatusHistoryRow {
  status: OrderStatusT;
  at: Date;
}

function isOrderStatus(v: string): v is OrderStatusT {
  return (ORDER_STATUS_ORDER as readonly string[]).includes(v);
}

/**
 * One-time, idempotent migration. Orders created before `statusHistory` existed
 * only carry createdAt/updatedAt, so the best provable timeline is:
 *   pending @ createdAt   (every order starts in the queue)
 *   current status @ updatedAt
 * Steps in between are provably reached (the lifecycle is strict, forward-only)
 * but their exact timestamp is unknowable — the UI renders those as "reached,
 * time n/a". Rows that already have history (or an empty one) are left alone.
 *
 * Works against a raw mongoose/driver collection so it can run both as a
 * standalone script (`npm run backfill-status`) and inside the DB round-trip
 * test (which deliberately avoids @/ imports).
 *
 * @returns number of orders backfilled.
 */
export async function backfillStatusHistory(
  orders: Pick<Collection<Document>, "find" | "bulkWrite">,
  filter: Filter<Document> = {},
): Promise<number> {
  const rows = await orders
    .find({
      ...filter,
      $or: [{ statusHistory: { $exists: false } }, { statusHistory: { $size: 0 } }],
    })
    .toArray();

  const writes: AnyBulkWriteOperation<Document>[] = [];

  for (const row of rows) {
    const statusValue = row.status;
    const createdAt: unknown = row.createdAt;
    const updatedAt: unknown = row.updatedAt;
    if (typeof statusValue !== "string" || !isOrderStatus(statusValue)) continue;
    const created = createdAt instanceof Date ? createdAt : new Date();
    const updated = updatedAt instanceof Date ? updatedAt : new Date();

    const history: StatusHistoryRow[] = [];
    if (statusValue !== "pending") history.push({ status: "pending", at: created });
    history.push({ status: statusValue, at: updated });

    writes.push({
      updateOne: {
        filter: { _id: row._id as ObjectId },
        update: { $set: { statusHistory: history } },
      },
    });
  }

  if (writes.length === 0) return 0;
  const res = await orders.bulkWrite(writes);
  return res.modifiedCount ?? writes.length;
}