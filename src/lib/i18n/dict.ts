/**
 * Pure, isomorphic translation dictionary + `t()`.
 *
 * Split out of `./i18n` (which imports `next/headers` and is server-only) so
 * `"use client"` components — the customer portal panels in particular — can
 * translate without pulling `next/headers` into the browser bundle. `./i18n`
 * re-exports this, so server code may import from either module.
 */

import type { Lang } from "./format";

/** Re-exported so a client component can take both from one import. */
export type { Lang };

export interface Entry {
  mr: string;
  en: string;
}

const dict: Record<string, Entry> = {
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
  "nav.cancelled": { mr: "रद्द", en: "Cancelled" },

  // Order Statuses
  "status.pending": { mr: "प्रलंबित", en: "Pending" },
  "status.processing": { mr: "प्रक्रियेत", en: "Processing" },
  "status.completed": { mr: "तयार", en: "Ready" },
  "status.collected": { mr: "घेतला", en: "Collected" },
  "status.cancelled": { mr: "रद्द", en: "Cancelled" },

  // Customer order-journey words (the single-line status strip)
  "step.queued": { mr: "रांगेत", en: "Queued" },
  "step.milling": { mr: "दळण सुरू", en: "Milling" },
  "step.ready": { mr: "तयार", en: "Ready" },
  "step.collected": { mr: "घेतले", en: "Collected" },
  "step.cancelled": { mr: "रद्द", en: "Cancelled" },
  "step.times": { mr: "वेळ", en: "Times" },
  "step.timeN/a": { mr: "वेळ माहित नाही", en: "time n/a" },

  // Customer notifications (stored verbatim at write-time)
  "notif.orderReceived": { mr: "तुमची दळण ऑर्डर मिळाली आहे आणि रांगेत आहे.", en: "Your milling order has been received and is in the queue." },
  "notif.orderProcessing": { mr: "तुमची दळण ऑर्डर दळण्यास सुरू झाली आहे.", en: "Your order is now being milled." },
  "notif.orderCompleted": { mr: "तुमची दळण ऑर्डर तयार आहे — घेऊन जा.", en: "Your order is ready on the counter — please collect it." },
  "notif.orderCollected": { mr: "तुमची दळण ऑर्डर घेतली गेली आहे. धन्यवाद!", en: "Your order has been collected. Thank you!" },
  "notif.orderCancelled": { mr: "तुमची दळण ऑर्डर रद्द करण्यात आली आहे. जर तुम्ही पैसे दिले असतील तर मीलकडून परत मिळतील.", en: "Your milling order has been cancelled. If you had already paid, the mill will refund you." },
  "notif.paymentReceived": { mr: "तुमच्या ऑर्डरचे पैसे पूर्ण जमा झाले आहेत.", en: "Your order has been fully paid. Thank you!" },
  "notif.paymentDue": { mr: "तुमच्या ऑर्डरवर उधारी शिल्लक आहे.", en: "You have an outstanding balance on your order." },

  // Customer dashboard
  "cust.hello": { mr: "नमस्कार", en: "Hello" },
  "cust.track": { mr: "तुमच्या दळण मालाची स्थिती पहा", en: "Track the status of your grain orders" },
  "cust.whatYouOwe": { mr: "तुमची उधारी", en: "What you owe" },
  "cust.tapToPay": { mr: "पैसे भरायचे असाल्यास यावर टॅप करा", en: "Tap here to pay" },
  "cust.totalDue": { mr: "एकूण उधारी", en: "Total Outstanding Due" },
  "cust.activeOrders": { mr: "चालू ऑर्डर", en: "Active Orders" },
  "cust.unread": { mr: "नवीन सूचना", en: "New Alerts" },
  "cust.myOrders": { mr: "माझ्या ऑर्डर्स", en: "My Milling Orders" },
  "cust.ordersEmpty": { mr: "अजून कोणतीही दळण ऑर्डर नाही.", en: "No milling orders yet." },
  "cust.orderCount": { mr: "ऑर्डर", en: "orders" },
  "cust.paidInFull": { mr: "पैसे पूर्ण भरले", en: "Paid in full" },
  "cust.paymentHistory": { mr: "जमा रकमेचा इतिहास", en: "Payment History" },
  "cust.noPayments": { mr: "अजून कोणतीही जमा रक्कम नाही.", en: "No payments recorded yet." },
  "cust.details": { mr: "तपशील", en: "Details" },
  "cust.notifications": { mr: "सूचना", en: "Notifications" },
  "cust.notificationsEmpty": { mr: "अजून कोणत्याही सूचना नाहीत.", en: "No notifications yet." },
  "cust.markAllRead": { mr: "सर्व वाचले म्हणून चिन्हांकित करा", en: "Mark all as read" },
  "cust.total": { mr: "एकूण आकारणी", en: "Total Charges" },
  "cust.paid": { mr: "जमा रक्कम", en: "Paid Amount" },
  "cust.due": { mr: "शिल्लक बाकी", en: "Balance Due" },
  "cust.receipt": { mr: "पावती", en: "Receipt" },
  "cust.cancelledOn": { mr: "रद्द केली", en: "Cancelled on" },
  "cust.cancelledReason": { mr: "कारण", en: "Reason" },
  "cust.readyTitle": { mr: "तुमचा माल दळून तयार आहे", en: "Your flour is ready" },
  "cust.readyBody": { mr: "कृपया गिरणीवर येऊन घेऊन जा.", en: "Please come to the mill to collect it." },
  "cust.allClear": { mr: "सर्व हिशोब पूर्ण", en: "All settled" },
  "cust.allClearBody": { mr: "तुमच्याकडे कोणतीही उधारी नाही. धन्यवाद!", en: "You owe nothing. Thank you!" },
  "cust.payNow": { mr: "पैसे भरा", en: "Pay now" },
  "cust.callMill": { mr: "गिरणीला कॉल", en: "Call mill" },
  "cust.currentOrders": { mr: "चालू ऑर्डर", en: "Current orders" },
  "cust.oldOrders": { mr: "जुन्या ऑर्डर", en: "Past orders" },
  "cust.noCurrent": { mr: "सध्या कोणतीही ऑर्डर चालू नाही.", en: "Nothing in the mill right now." },
  "cust.showAll": { mr: "सर्व पहा", en: "Show all" },
  "cust.showLess": { mr: "कमी दाखवा", en: "Show less" },
  "cust.paidQ": { mr: "पैसे भरले?", en: "Paid?" },
  "cust.verifying": { mr: "पडताळणी सुरू", en: "Being verified" },
  "cust.weight": { mr: "वजन", en: "Weight" },
  "cust.rate": { mr: "दर", en: "Rate" },
  "cust.refundNote": { mr: "पैसे परत मिळतील", en: "Amount to be refunded" },

  // Customer payment (UPI) panel
  "cust.payTitle": { mr: "पैसे भरा", en: "Pay your due" },
  "cust.payQrAlt": { mr: "UPI QR कोड", en: "UPI QR code" },
  "cust.payQrMissing": { mr: "QR कोड अजून जोडलेला नाही. मीलश्रीने संपर्क साधावा.", en: "The QR code has not been set up yet. Please contact the mill." },
  "cust.upiId": { mr: "UPI आयडी", en: "UPI ID" },
  "cust.copy": { mr: "कॉपी करा", en: "Copy" },
  "cust.copied": { mr: "कॉपी झाले", en: "Copied" },
  "cust.payHelp": {
    mr: "वर दिलेला QR कोड किंवा UPI आयडी वापरून पैसे पाठवा. मीलनेकडून पैसे मिळाल्यानंतर तुमची उधारी अपडेट केली जाईल.",
    en: "Pay using the QR code or the UPI ID above. Once the mill confirms your payment, your outstanding balance will be updated.",
  },
  "cust.payClose": { mr: "बंद करा", en: "Close" },
  "cust.payDownload": { mr: "QR डाउनलोड करा", en: "Download QR" },
  "cust.payDownloadHint": {
    mr: "फोनमध्ये जतन करा, नंतर पेमेंट करण्यासाठी गॅलरीतून उघडा.",
    en: "Save it on your phone, then open it from your gallery to pay.",
  },

  // Owner: cancellation
  "order.cancel": { mr: "ऑर्डर रद्द करा", en: "Cancel order" },
  "order.cancelTitle": { mr: "ऑर्डर रद्द करायचा आहे?", en: "Cancel this order?" },
  "order.cancelHelp": {
    mr: "ऑर्डर रांगेतून काढला जाईल. पैसे आणि इतिहात चुकणार नाहीत — सर्व काही 'रद्द' टॅबमध्ये दिसेल.",
    en: "The order will be removed from the queue. Its payments and history are kept and stay visible under the Cancelled tab.",
  },
  "order.cancelReasonLabel": { mr: "कारण (ऐच्छिक)", en: "Reason (optional)" },
  "order.cancelConfirm": { mr: "नक्की रद्द करा", en: "Yes, cancel it" },
  "order.cancelDone": { mr: "ऑर्डर रद्द केला", en: "Order cancelled" },
  "order.cancelledAt": { mr: "रद्द केली", en: "Cancelled" },
  "order.refundDue": { mr: "परत करायचे", en: "Refund due" },
  "order.refundHint": {
    mr: "या ऑर्डरवर पैसे दिले आहेत. ते पैसे ग्राहकाला परत करा.",
    en: "This order has payments on it — return that money to the customer.",
  },
  "order.noRefund": { mr: "पैसे दिलेले नाहीत", en: "No payments on this order" },
  "queue.liveTab": { mr: "चालू रांग", en: "Live queue" },
  "queue.cancelledTab": { mr: "रद्द ऑर्डर", en: "Cancelled" },
  "queue.cancelledEmpty": {
    mr: "अजून कोणतीही ऑर्डर रद्द केलेली नाही.",
    en: "No cancelled orders yet.",
  },
  "queue.cancelledIntro": {
    mr: "रद्द केलेल्या ऑर्डरचा आणि त्यांच्या पैशांचा संपूर्ण इतिहास इथे दिसतो.",
    en: "Full history of cancelled orders and the payments on them.",
  },

  // Owner: UPI settings
  "upi.section": { mr: "UPI पेमेंट", en: "UPI Payment" },
  "upi.qrLabel": { mr: "UPI QR कोड", en: "UPI QR code" },
  "upi.qrHelp": {
    mr: "बँक किंवा UPI अ‍ॅपमधून QR कोडाचा प्रतिमा (screenshot) निवडा. सर्व ग्राहकांना हा एकच QR दिसेल.",
    en: "Upload a screenshot of the QR code from your bank or UPI app. The same single QR will be shown to every customer.",
  },
  "upi.choose": { mr: "QR निवडा", en: "Choose QR image" },
  "upi.replace": { mr: "बदला", en: "Replace" },
  "upi.remove": { mr: "काढा", en: "Remove" },
  "upi.notSet": { mr: "QR सेट केलेला नाही", en: "No QR set" },
  "upi.set": { mr: "QR सेट केला आहे", en: "QR is set" },
  "upi.idLabel": { mr: "UPI आयडी", en: "UPI ID" },
  "upi.idHelp": { mr: "उदा. ganeshmill@okaxis", en: "e.g. ganeshmill@okaxis" },
  "upi.tooBig": { mr: "फाइल खूप मोठी आहे (कमाल 1 MB)", en: "File is too large (1 MB max)" },
  "upi.badType": { mr: "फक्त PNG, JPG किंवा WEBP फाइल निवडा", en: "Choose a PNG, JPG or WEBP file" },
  "upi.uploadFailed": { mr: "QR अपलोड होऊ शकला नाही", en: "Could not upload the QR" },

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

/** Look up a translation. An unknown key returns itself, so gaps are visible. */
export function t(key: string, lang: Lang = "en"): string {
  const entry = dict[key];
  if (!entry) return key;
  return entry[lang] || entry.en;
}
