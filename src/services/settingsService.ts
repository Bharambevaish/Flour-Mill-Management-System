import "server-only";

import { cookies } from "next/headers";
import { APP_NAME, LEGACY_APP_NAMES } from "@/lib/brand";

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
  /**
   * UPI payment details. `upiQr` deliberately carries METADATA ONLY — the image
   * bytes are never inlined into a settings/API payload, because that would put
   * up to ~1.3 MB of base64 on every dashboard load. Fetch the image from the
   * `upi-qr` routes instead.
   */
  upiId: string;
  upiQr: { contentType: string; uploadedAt: string } | null;
  updatedAt: string;
}

function defaultView(): SettingsView {
  return {
    millName: APP_NAME,
    phone: "",
    address: "",
    currency: "₹",
    defaultLanguage: "mr",
    rates: structuredClone(DEFAULT_RATES) as unknown as Record<
      string,
      Record<string, number>
    >,
    notifications: { inApp: true, webPush: true, sms: false, whatsapp: false },
    upiId: "",
    upiQr: null,
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
      typeof doc.millName === "string" && doc.millName.trim() && !LEGACY_APP_NAMES.includes(doc.millName.trim())
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
    upiId: typeof doc.upiId === "string" ? doc.upiId : "",
    upiQr: doc.upiQr
      ? {
          contentType: String(doc.upiQr.contentType ?? "image/png"),
          uploadedAt:
            doc.upiQr.uploadedAt instanceof Date
              ? doc.upiQr.uploadedAt.toISOString()
              : new Date().toISOString(),
        }
      : null,
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

/* ---- UPI QR ----------------------------------------------------------- */

/** Raster formats accepted for the mill's UPI QR. SVG is deliberately absent. */
export const UPI_QR_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

/** 1 MB. Bank QR screenshots are a few hundred KB at most. */
export const UPI_QR_MAX_BYTES = 1024 * 1024;

export interface UpiQrBytes {
  contentType: string;
  /** The exact bytes the owner uploaded — never re-encoded. */
  data: Buffer;
}

/** File extension for a stored QR, so a download isn't called `qr.bin`. */
const QR_EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * A safe, meaningful download filename: `<mill>-upi-qr.png`.
 *
 * The mill name is user-typed and may be in Marathi, contain spaces, slashes or
 * quotes, so it is reduced to `[a-z0-9-]` and everything else is dropped — a
 * `Content-Disposition` header is a header, and an unescaped quote or CR/LF in it
 * would be a response-splitting vector. Falls back to `mill` when the name
 * transliterates to nothing (e.g. a fully non-Latin name).
 */
export function upiQrDownloadName(
  millName: string | undefined,
  contentType: string,
): string {
  const slug = (millName ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  const ext = QR_EXTENSION[contentType] ?? "png";
  return `${slug || "mill"}-upi-qr.${ext}`;
}

/**
 * The stored QR, decoded back to raw bytes, or null when none is set.
 *
 * The DB holds a `data:<mime>;base64,…` string exactly as the owner uploaded it;
 * this just unwraps it so a route can serve it as a real image response. No
 * re-encoding happens on the way in or out.
 */
export async function getUpiQrBytes(): Promise<UpiQrBytes | null> {
  await connectDb();
  const doc = await SettingsModel.findOne().select("upiQr").lean();
  const qr = doc?.upiQr;
  if (!qr?.dataUrl) return null;
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(qr.dataUrl);
  if (!match) return null;
  return {
    contentType: qr.contentType || match[1],
    data: Buffer.from(match[2], "base64"),
  };
}

/** Store the owner's QR verbatim, replacing any previous one. */
export async function setUpiQr(
  dataUrl: string,
  contentType: string,
): Promise<void> {
  await connectDb();
  let settings = await SettingsModel.findOne();
  if (!settings) settings = new SettingsModel();
  settings.upiQr = { dataUrl, contentType, uploadedAt: new Date() };
  settings.updatedAt = new Date();
  await settings.save();
}

/** Remove the QR entirely. */
export async function clearUpiQr(): Promise<void> {
  await connectDb();
  const settings = await SettingsModel.findOne();
  if (!settings) return;
  settings.upiQr = null;
  settings.updatedAt = new Date();
  await settings.save();
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