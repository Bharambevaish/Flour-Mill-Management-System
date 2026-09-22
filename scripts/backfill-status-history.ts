/**
 * One-off migration: give legacy orders a statusHistory so the customer portal's
 * progress timeline works for orders placed before that feature shipped.
 *
 *   npm run backfill-status
 *
 * Idempotent — safe to run more than once. Orders that already have history are
 * untouched. See src/lib/order-status-history.ts for the synthesis rule.
 */
import { loadEnvFile } from "node:process";
loadEnvFile(".env.local");

import mongoose from "mongoose";
import { backfillStatusHistory } from "../src/lib/order-status-history.ts";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI (.env.local)");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

  const orders = mongoose.connection.collection("orders");
  const before = await orders.countDocuments({});
  const backfilled = await backfillStatusHistory(orders);

  console.log(`Orders: ${before} total, ${backfilled} backfilled with statusHistory.`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("backfill failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});