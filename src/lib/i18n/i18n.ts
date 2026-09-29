import { cookies } from "next/headers";

import type { Lang } from "./format";

/**
 * The pure, isomorphic helpers live in sibling modules so client components can
 * import them without pulling `next/headers` into the browser bundle:
 *
 * - `./format` — `Lang`, `localeOf`, `formatLang`, `formatDateTime(Full)`
 * - `./dict`   — the translation dictionary and `t()`
 *
 * Both are re-exported here for convenience, so server code may import from
 * either this module or the specific one. Only `getLang` needs the server.
 */
export * from "./format";
export * from "./dict";

/**
 * Get active language on server side from cookies (Default: "en").
 */
export async function getLang(): Promise<Lang> {
  try {
    const cookieStore = await cookies();
    const lang = cookieStore.get("lang")?.value;
    if (lang === "mr" || lang === "en") return lang;
  } catch {
    // Client side or outside server context fallback
  }
  return "en";
}
