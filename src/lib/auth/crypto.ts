import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type HashAlgorithm = "sha256";

/** Generate a cryptographically strong random token (base64url, no padding chars). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** SHA-256 digest of a string — used to store session/token hashes at rest. */
export function sha256(value: string, algorithm: HashAlgorithm = "sha256"): string {
  return createHash(algorithm).update(value).digest("hex");
}

/** Constant-time comparison of two strings (hash + existing). */
export function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Opaque, revocable session token: raw value for the cookie, hash for the DB. */
export function issueSessionToken(): { raw: string; hash: string } {
  const raw = randomToken(32);
  return { raw, hash: sha256(raw) };
}

export function hashSessionToken(raw: string): string {
  return sha256(raw);
}