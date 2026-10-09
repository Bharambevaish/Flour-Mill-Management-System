/**
 * Create or update an admin account with specified email & password.
 *
 * Usage:
 *   node scripts/set-admin.mjs "nikhilkadus1208@gmail.com" "Nikhil@#2108" "Nikhil Kadus"
 *
 * Or if run without arguments, it reads OWNER_EMAIL, OWNER_PASSWORD, OWNER_NAME from .env.local
 */
import { loadEnvFile } from "node:process";
try {
  loadEnvFile(".env.local");
} catch {
  // .env.local might not exist if env vars are provided directly via system environment
}

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

const argEmail = process.argv[2];
const argPassword = process.argv[3];
const argName = process.argv[4];

const email = (argEmail || process.env.OWNER_EMAIL || "").toLowerCase().trim();
const password = argPassword || process.env.OWNER_PASSWORD;
const name = argName || process.env.OWNER_NAME || "Admin Owner";
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error("❌ Error: MONGODB_URI is not set in environment or .env.local");
  process.exit(1);
}

if (!email || !password) {
  console.error("❌ Error: Please provide email and password.");
  console.log("Usage: node scripts/set-admin.mjs <email> <password> [name]");
  process.exit(1);
}

async function main() {
  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  const existing = await Admin.findOne({ email });

  if (existing) {
    existing.name = name;
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log(`✅ Updated existing admin password for: ${email}`);
  } else {
    await Admin.create({
      name,
      email,
      passwordHash,
      totpEnabled: false,
      totpSecret: null,
    });
    console.log(`✅ Created new admin: ${email} (${name})`);
  }

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch(async (err) => {
  console.error("❌ Failed to set admin:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
