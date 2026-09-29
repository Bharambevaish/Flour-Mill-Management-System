/**
 * Pure, isomorphic i18n helpers.
 *
 * Deliberately separate from `./i18n`, which imports `next/headers` and is
 * therefore server-only. Client components (the owner panels and the customer
 * portal) need date/locale formatting, so that logic lives here where it can be
 * imported from both sides without dragging `next/headers` into the browser
 * bundle. `./i18n` re-exports everything, so server code may import from either.
 */

export type Lang = "mr" | "en";

/**
 * Locale for a language. Kept in one place so a date can never be rendered
 * with a hardcoded "en-IN" while the surrounding UI is Marathi.
 */
export function localeOf(lang: Lang = "en"): string {
  return lang === "mr" ? "mr-IN" : "en-IN";
}

/**
 * THE date format for this app: `5 Sept, 14:30` (Marathi when `lang` is "mr").
 *
 * Every timestamp in the owner UI, the customer portal, the CSV exports and the
 * reports used to call `toLocaleString` inline with slightly different options,
 * and four of those passed no options at all — so the same receipt could show
 * as "5 Sept, 14:30" in one place and "09/05/2026, 02:30:00 PM" in another.
 * Route everything through here instead.
 */
export function formatDateTime(iso: string | number | Date, lang: Lang = "en"): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(localeOf(lang), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Same as {@link formatDateTime} but keeps the year — for places where a bare
 * date would be ambiguous (a printable पावती, a report's date column).
 */
export function formatDateTimeFull(iso: string | number | Date, lang: Lang = "en"): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(localeOf(lang), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Helper to select the text for the current language.
 * Default is English ('en').
 */
export function formatLang(text: { mr: string; en: string }, lang: Lang = "en"): string {
  return lang === "mr" ? text.mr : text.en;
}
