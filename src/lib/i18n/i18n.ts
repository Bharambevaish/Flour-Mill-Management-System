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

  // Customer notifications (stored verbatim at write-time)
  "notif.orderReceived": { mr: "तुमची दळण ऑर्डर मिळाली आहे आणि रांगेत आहे.", en: "Your milling order has been received and is in the queue." },
  "notif.orderProcessing": { mr: "तुमची दळण ऑर्डर दळण्यास सुरू झाली आहे.", en: "Your order is now being milled." },
  "notif.orderCompleted": { mr: "तुमची दळण ऑर्डर तयार आहे — घेऊन जा.", en: "Your order is ready on the counter — please collect it." },
  "notif.orderCollected": { mr: "तुमची दळण ऑर्डर घेतली गेली आहे. धन्यवाद!", en: "Your order has been collected. Thank you!" },
  "notif.paymentReceived": { mr: "तुमच्या ऑर्डरचे पैसे पूर्ण जमा झाले आहेत.", en: "Your order has been fully paid. Thank you!" },
  "notif.paymentDue": { mr: "तुमच्या ऑर्डरवर उधारी शिल्लक आहे.", en: "You have an outstanding balance on your order." },

  // Customer dashboard
  "cust.hello": { mr: "नमस्कार", en: "Hello" },
  "cust.track": { mr: "तुमच्या दळण मालाची स्थिती पहा", en: "Track the status of your grain orders" },
  "cust.totalDue": { mr: "एकूण उधारी", en: "Total Outstanding Due" },
  "cust.activeOrders": { mr: "सक्रिय दळण ऑर्डर", en: "Active Orders" },
  "cust.unread": { mr: "न वाचलेल्या सूचना", en: "Unread Notifications" },
  "cust.myOrders": { mr: "माझ्या ऑर्डर्स", en: "My Milling Orders" },
  "cust.ordersEmpty": { mr: "अजून कोणतीही दळण ऑर्डर नाही.", en: "No milling orders yet." },
  "cust.paymentHistory": { mr: "जमा रकमेचा इतिहास", en: "Payment History" },
  "cust.noPayments": { mr: "अजून कोणतीही जमा रक्कम नाही.", en: "No payments recorded yet." },
  "cust.notifications": { mr: "सूचना", en: "Notifications" },
  "cust.notificationsEmpty": { mr: "अजून कोणत्याही सूचना नाहीत.", en: "No notifications yet." },
  "cust.markAllRead": { mr: "सर्व वाचले म्हणून चिन्हांकित करा", en: "Mark all as read" },
  "cust.total": { mr: "एकूण आकारणी", en: "Total Charges" },
  "cust.paid": { mr: "जमा रक्कम", en: "Paid Amount" },
  "cust.due": { mr: "शिल्लक बाकी", en: "Balance Due" },
  "cust.receipt": { mr: "पावती", en: "Receipt" },

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