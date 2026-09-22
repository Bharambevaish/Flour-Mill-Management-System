/**
 * Seed demo orders covering every dashboard status/payment case.
 *
 *   npm run seed:demo
 *
 * Idempotent: wipes existing orders + notifications, reseeds a fixed spread,
 * and re-syncs the orderId counter so real orders keep counting from there.
 */
import { loadEnvFile } from "node:process";
loadEnvFile(".env.local");

import mongoose from "mongoose";
import { runDemoSeed } from "../src/services/demoSeedService.ts";

const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  if (!MONGODB_URI) throw new Error("Missing MONGODB_URI (.env.local)");
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });

  const summary = await runDemoSeed();

  console.log(
    `Seeded ${summary.orders} orders + ${summary.notifications} notifications; next real order is #${summary.nextOrderId}`,
  );
  console.table(summary.seeded);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Seed failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});