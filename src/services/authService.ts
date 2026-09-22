import "server-only";

import argon2 from "argon2";
import type { Types } from "mongoose";
import { cookies } from "next/headers";
import QRCode from "qrcode";

import { COOKIES, cookieOptions, type SessionKind } from "@/lib/cookies";
import { hashSessionToken, issueSessionToken } from "@/lib/crypto";
import { connectDb } from "@/lib/db";
import { AppError, badRequestError, unauthorizedError } from "@/lib/errors";
import { getEnv } from "@/lib/env";
import { buildOtpauthUri, generateTotpSecret, verifyTotpCode } from "@/lib/totp";
import { AdminModel } from "@/models/Admin";
import { CustomerModel } from "@/models/Customer";
import { SessionModel } from "@/models/Session";

export interface LoginContext {
  ip?: string;
  userAgent?: string;
  device?: string;
}

/** Argon2id constants. `type: 2` = argon2id (the type field is a numeric enum). */
const ARGON2_OPTIONS = {
  type: 2 as const,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
};

/* ------------------------------------------------------------------ */
/* Hashing                                                            */
/* ------------------------------------------------------------------ */

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Owner (super admin) login                                          */
/* ------------------------------------------------------------------ */

export async function loginOwner(
  credentials: { email: string; password: string },
  ctx: LoginContext,
  totpCode?: string,
) {
  await connectDb();

  const admin = await AdminModel.findOne({ email: credentials.email.toLowerCase().trim() });
  if (!admin || !(await verifyPassword(credentials.password, admin.passwordHash))) {
    throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  // Two-step TOTP: correct credentials but no code yet → ask for the second
  // factor in the SAME request flow (no challenge token to replay).
  if (admin.totpEnabled) {
    if (!totpCode) return { admin, session: null, needTotp: true };
    if (!admin.totpSecret || !verifyTotpCode(totpCode, admin.totpSecret)) {
      throw new AppError(401, "Invalid two-factor code", "INVALID_2FA_CODE");
    }
  }

  const session = await createSession("owner", admin._id as Types.ObjectId, ctx);
  return { admin, session, needTotp: false };
}

/* ------------------------------------------------------------------ */
/* Customer PIN login                                                 */
/* ------------------------------------------------------------------ */

export async function loginCustomer(credentials: { mobile: string; pin: string }, ctx: LoginContext) {
  await connectDb();

  const mobile = credentials.mobile.replace(/\s+/g, "").trim();
  const customer = await CustomerModel.findOne({ mobile });
  if (!customer || !(await verifyPassword(credentials.pin, customer.pinHash))) {
    throw new AppError(401, "Invalid mobile or PIN", "INVALID_CREDENTIALS");
  }

  if (!customer.active) {
    throw new AppError(403, "Account is inactive", "ACCOUNT_INACTIVE");
  }

  const session = await createSession("customer", customer._id as Types.ObjectId, ctx);
  return { customer, session };
}

/* ------------------------------------------------------------------ */
/* Session lifecycle (DB-backed, revocable, hashed at rest)           */
/* ------------------------------------------------------------------ */

export async function createSession(
  kind: SessionKind,
  refId: Types.ObjectId,
  ctx: LoginContext,
): Promise<{ token: string }> {
  const { raw, hash } = issueSessionToken();
  const { SESSION_TTL } = getEnv();

  await SessionModel.create({
    tokenHash: hash,
    kind,
    refId,
    device: ctx.device ?? "unknown-device",
    ip: ctx.ip ?? null,
    userAgent: ctx.userAgent ?? null,
    expiresAt: new Date(Date.now() + SESSION_TTL * 1000),
    revokedAt: null,
  });

  return { token: raw };
}

/**
 * Resolve the session for a request. Throws 401 if missing/expired/revoked.
 * Secure check to run near the data source (DAL), not just in proxy.
 */
export async function requireSession(kind: SessionKind): Promise<Types.ObjectId | string> {
  const store = await cookies();
  const cookieName = kind === "owner" ? COOKIES.ownerSession : COOKIES.customerSession;
  const raw = store.get(cookieName)?.value;
  if (!raw) throw unauthorizedError("Not signed in");

  await connectDb();
  const session = await SessionModel.findOne({
    tokenHash: hashSessionToken(raw),
    kind,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!session) throw unauthorizedError("Session expired");

  return session.refId;
}

export async function revokeCurrentSession(kind: SessionKind): Promise<void> {
  const store = await cookies();
  const cookieName = kind === "owner" ? COOKIES.ownerSession : COOKIES.customerSession;
  const raw = store.get(cookieName)?.value;
  if (!raw) return;

  await connectDb();
  await SessionModel.updateOne(
    { tokenHash: hashSessionToken(raw), kind },
    { $set: { revokedAt: new Date() } },
  );
  store.delete(cookieName);
}

export async function revokeAllSessions(kind: SessionKind, refId: Types.ObjectId): Promise<void> {
  await connectDb();
  await SessionModel.updateMany(
    { kind, refId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

/** Revoke every live session of `kind` except the one holding `rawToken` (if any). */
export async function revokeOtherSessions(
  kind: SessionKind,
  refId: Types.ObjectId | string,
  rawToken?: string,
): Promise<void> {
  await connectDb();
  const filter: Record<string, unknown> = {
    kind,
    refId: refId as Types.ObjectId,
    revokedAt: null,
  };
  if (rawToken) {
    filter.tokenHash = { $ne: hashSessionToken(rawToken) };
  }
  await SessionModel.updateMany(filter, { $set: { revokedAt: new Date() } });
}

/* ------------------------------------------------------------------ */
/* Owner account security (password change + TOTP 2FA)                */
/* ------------------------------------------------------------------ */

async function getAdminOrThrow(adminId: Types.ObjectId | string) {
  await connectDb();
  const admin = await AdminModel.findById(adminId as Types.ObjectId);
  if (!admin) throw unauthorizedError("Not signed in");
  return admin;
}

export async function changeOwnerPassword(
  adminId: Types.ObjectId | string,
  currentPassword: string,
  newPassword: string,
  keepRawToken?: string,
): Promise<void> {
  const admin = await getAdminOrThrow(adminId);
  if (!(await verifyPassword(currentPassword, admin.passwordHash))) {
    throw badRequestError("Current password is incorrect");
  }
  admin.passwordHash = await hashPassword(newPassword);
  await admin.save();
  // Kill any other live owner sessions so a stolen session dies with the old password.
  await revokeOtherSessions("owner", admin._id, keepRawToken);
}

export interface TotpSetupResult {
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
}

export async function createTotpSetup(
  adminId: Types.ObjectId | string,
  issuer: string,
): Promise<TotpSetupResult> {
  const admin = await getAdminOrThrow(adminId);
  const secret = generateTotpSecret();
  const otpauthUrl = buildOtpauthUri(issuer, admin.email, secret);
  // Persist the secret first; 2FA only becomes active after confirmTotpSetup.
  admin.totpSecret = secret;
  await admin.save();
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
  return { secret, otpauthUrl, qrDataUrl };
}

export async function confirmTotpSetup(
  adminId: Types.ObjectId | string,
  code: string,
  keepRawToken?: string,
): Promise<void> {
  const admin = await getAdminOrThrow(adminId);
  if (!admin.totpSecret) throw badRequestError("Two-factor authentication is not set up");
  if (!verifyTotpCode(code, admin.totpSecret)) {
    throw badRequestError("Invalid verification code");
  }
  admin.totpEnabled = true;
  await admin.save();
  // Enabling 2FA invalidates every other live owner session.
  await revokeOtherSessions("owner", admin._id, keepRawToken);
}

export async function disableTotp(
  adminId: Types.ObjectId | string,
  code: string,
): Promise<void> {
  const admin = await getAdminOrThrow(adminId);
  if (!admin.totpEnabled || !admin.totpSecret) {
    throw badRequestError("Two-factor authentication is not enabled");
  }
  if (!verifyTotpCode(code, admin.totpSecret)) {
    throw badRequestError("Invalid verification code");
  }
  admin.totpEnabled = false;
  admin.totpSecret = null;
  await admin.save();
}

/** Whether the owner's account currently has TOTP 2FA enabled. */
export async function isOwnerTotpEnabled(adminId: Types.ObjectId | string): Promise<boolean> {
  const admin = await getAdminOrThrow(adminId);
  return !!admin.totpEnabled;
}

/** Write the session token into the httpOnly cookie (server side only). */
export async function persistSessionCookie(kind: SessionKind, rawToken: string): Promise<void> {
  const { SESSION_TTL } = getEnv();
  const store = await cookies();
  store.set(
    kind === "owner" ? COOKIES.ownerSession : COOKIES.customerSession,
    rawToken,
    { ...cookieOptions, maxAge: SESSION_TTL },
  );
}