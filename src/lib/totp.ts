import "server-only";

import { generateSecret, generateURI, verifySync } from "otplib";

/**
 * otplib v13 wrapper: sync TOTP helpers with Google-Authenticator-compatible
 * defaults (SHA1, 6 digits, 30s step, ±60s clock-skew tolerance).
 */

export function generateTotpSecret(): string {
  return generateSecret();
}

/** otpauth:// URI for QR encoding (label becomes `issuer:account`). */
export function buildOtpauthUri(issuer: string, account: string, secret: string): string {
  return generateURI({
    strategy: "totp",
    issuer,
    label: account,
    secret,
    digits: 6,
    period: 30,
  });
}

export function verifyTotpCode(code: string, secret: string): boolean {
  try {
    const result = verifySync({
      token: code,
      secret,
      digits: 6,
      period: 30,
      epochTolerance: 60,
    });
    return result?.valid === true;
  } catch {
    return false;
  }
}