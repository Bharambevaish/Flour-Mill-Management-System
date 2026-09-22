/**
 * Seed the super-admin (owner) account from .env.local
 *
 *   npm run seed
 *
 * Safe to run repeatedly — skips if the email already exists.
 */
import { loadEnvFile } from "node:process";
loadEnvFile(".env.local");

import mongoose from "mongoose";
import argon2 from "argon2";

const AdminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    totpSecret: { type: String, default: null },
    totpEnabled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const Admin = mongoose.models.Admin ?? mongoose.model("Admin", AdminSchema);

const { MONGODB_URI, OWNER_NAME, OWNER_EMAIL, OWNER_PASSWORD } = process.env;

if (!MONGODB_URI || !OWNER_EMAIL || !OWNER_PASSWORD) {
  console.error("Missing env: MONGODB_URI / OWNER_EMAIL / OWNER_PASSWORD (.env.local)");
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });

  const email = OWNER_EMAIL.toLowerCase().trim();
  const existing = await Admin.findOne({ email });
  if (existing) {
    console.log(`Owner already exists: ${email} (skipping)`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await argon2.hash(OWNER_PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  await Admin.create({ name: OWNER_NAME, email, passwordHash });
  console.log(`Owner created: ${email} (${OWNER_NAME})`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Seed failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});