import { cookies } from "next/headers";

export type Lang = "mr" | "en";

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

/**
 * Helper to select the text for the current language.
 * Default is English ('en').
 */
export function formatLang(
  text: { mr: string; en: string },
  lang: Lang = "en"
): string {
  return lang === "mr" ? text.mr : text.en;
}

const dict: Record<string, { mr: string; en: string }> = {
  // Navigation & Headers
  "nav.dashboard": { mr: "डॅशबोर्ड", en: "Dashboard" },
  "nav.customers": { mr: "ग्राहक", en: "Customers" },
  "nav.newOrder": { mr: "नवीन ऑर्डर", en: "New Order" },
  "nav.queue": { mr: "दळण्याची यादी", en: "Queue" },
  "nav.payments": { mr: "पेमेंट्स", en: "Payments" },
  "nav.outstanding": { mr: "उधारी", en: "Outstanding" },
  "nav.notifications": { mr: "सूचना", en: "Notifications" },
  "nav.reports": { mr: "अहवाल", en: "Reports" },
  "nav.settings": { mr: "सेटिंग्स", en: "Settings" },

  // Order Statuses
  "status.pending": { mr: "प्रलंबित", en: "Pending" },
  "status.processing": { mr: "प्रक्रियेत", en: "Processing" },
  "status.completed": { mr: "तयार", en: "Ready" },
  "status.collected": { mr: "घेतला", en: "Collected" },

  // Common UI
  welcome: { mr: "स्वागत आहे", en: "Welcome" },
  todayOverview: { mr: "आजचा व्यवसाय", en: "Today's overview" },
  logout: { mr: "लॉगआउट", en: "Logout" },
  login: { mr: "लॉगिन", en: "Login" },
  back: { mr: "मागे", en: "Back" },
  refresh: { mr: "ताजे करा", en: "Refresh" },
  lastUpdated: { mr: "शेवटचे अपडेट", en: "Last updated" },
  save: { mr: "सेव्ह करा", en: "Save" },
  cancel: { mr: "रद्द करा", en: "Cancel" },
  search: { mr: "शोधा", en: "Search" },
  total: { mr: "एकूण", en: "Total" },
  due: { mr: "बाकी", en: "Due" },
  paid: { mr: "भरलेले", en: "Paid" },
};

export function t(key: string, lang: Lang = "en"): string {
  const entry = dict[key];
  if (!entry) return key;
  return entry[lang] || entry.en;
}