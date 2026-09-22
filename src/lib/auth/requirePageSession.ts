import "server-only";

import { redirect } from "next/navigation";

import { requireSession } from "@/services/authService";

/**
 * Server-component session gate.
 *
 * Pages must use this instead of the raw `requireSession` DAL call: an
 * expired/revoked/missing session then surfaces as a clean 307 to the right
 * login screen (with a "session expired" notice) instead of an unhandled 500
 * that dumps the raw AppError stack in the browser.
 *
 * API routes keep using `requireSession` directly — they return JSON errors
 * and must never redirect.
 */
export async function requirePageSession(kind: "owner" | "customer") {
  try {
    return await requireSession(kind);
  } catch {
    if (kind === "owner") {
      redirect("/login?error=session_expired");
    }
    redirect("/my/login?error=session_expired");
  }
}