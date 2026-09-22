import "server-only";

import { cookies } from "next/headers";

import { connectDb } from "@/lib/db";
import type { Lang } from "@/lib/i18n";
import { DEFAULT_RATES } from "@/lib/millings";
import { SettingsModel } from "@/models/Settings";

export interface NotificationsPrefs {
  inApp: boolean;
  webPush: boolean;
  sms: boolean;
  whatsapp: boolean;
}

/** Complete, app-ready settings view (every field present, safe fallbacks). */
export interface SettingsView {
  millName: string;
  phone: string;
  address: string;
  currency: string;
  defaultLanguage: Lang;
  rates: Record<string, Record<string, number>>;
  notifications: NotificationsPrefs;
  updatedAt: string;
}

function defaultView(): SettingsView {
  return {
    millName: "श्री गणेश फिड मील (Flour Mill)",
    phone: "",
    address: "",
    currency: "₹",
    defaultLanguage: "mr",
    rates: structuredClone(DEFAULT_RATES) as unknown as Record<
      string,
      Record<string, number>
    >,
    notifications: { inApp: true, webPush: true, sms: false, whatsapp: false },
    updatedAt: new Date().toISOString(),
  };
}

/** Mongoose stores `rates` as a Map — normalize to a plain object either way. */
function toRatesMap(value: unknown): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  if (!value) return out;
  const source: Record<string, unknown> =
    value instanceof Map
      ? Object.fromEntries(value)
      : typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)
        : {};
  for (const [grain, sizes] of Object.entries(source)) {
    const inner: Record<string, number> = {};
    if (sizes && typeof sizes === "object") {
      const sizesObj: Record<string, unknown> =
        sizes instanceof Map
          ? Object.fromEntries(sizes)
          : (sizes as Record<string, unknown>);
      for (const [size, num] of Object.entries(sizesObj)) {
        const n = Number(num);
        if (Number.isFinite(n)) inner[size] = n;
      }
    }
    out[grain] = inner;
  }
  return out;
}

/**
 * Merge stored rates over the built-in defaults so every grain×size cell is
 * always present (stale/unknown keys from old docs are dropped).
 */
function mergeRates(
  stored: Record<string, Record<string, number>>,
  fallback: Record<string, Record<string, number>>,
): Record<string, Record<string, number>> {
  const out = structuredClone(fallback) as Record<string, Record<string, number>>;
  for (const [grain, sizes] of Object.entries(stored)) {
    if (!out[grain]) continue;
    for (const [size, n] of Object.entries(sizes)) {
      if (size in out[grain] && Number.isFinite(n)) out[grain][size] = n;
    }
  }
  return out;
}

/**
 * Single source of truth for app settings. Owner-guarded callers wrap this in
 * `requireSession` themselves; this function NEVER enforces auth so the
 * notification/order services can read it during business flows.
 */
export async function getSettingsOrDefault(): Promise<SettingsView> {
  await connectDb();
  const doc = await SettingsModel.findOne().lean();
  if (!doc) return defaultView();

  const rates = mergeRates(toRatesMap(doc.rates as unknown), DEFAULT_RATES);
  const notifications = doc.notifications ?? {};
  const fallback = defaultView();

  return {
    millName:
      typeof doc.millName === "string" && doc.millName.trim()
        ? doc.millName
        : fallback.millName,
    phone: typeof doc.phone === "string" ? doc.phone : "",
    address: typeof doc.address === "string" ? doc.address : "",
    currency:
      typeof doc.currency === "string" && doc.currency.trim()
        ? doc.currency
        : fallback.currency,
    defaultLanguage: doc.defaultLanguage === "en" ? "en" : "mr",
    rates,
    notifications: {
      inApp: notifications.inApp ?? true,
      webPush: notifications.webPush ?? true,
      sms: notifications.sms ?? false,
      whatsapp: notifications.whatsapp ?? false,
    },
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : fallback.updatedAt,
  };
}

/** Default ₹/kg map (merged with stored overrides) — for order forms. */
export async function getSettingsRates(): Promise<
  Record<string, Record<string, number>>
> {
  const settings = await getSettingsOrDefault();
  return settings.rates;
}

/**
 * Language for the current request: the user's `lang` cookie wins; when absent
 * fall back to the mill's default language from Settings. (Cookies are
 * optional here so non-request contexts degrade to the settings default.)
 */
export async function getEffectiveLang(): Promise<Lang> {
  try {
    const store = await cookies();
    const lang = store.get("lang")?.value;
    if (lang === "mr" || lang === "en") return lang;
  } catch {
    // Outside a request context (script/test) — fall through to default.
  }
  const settings = await getSettingsOrDefault();
  return settings.defaultLanguage;
}