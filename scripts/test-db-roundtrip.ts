/**
 * DB round-trip integration test.
 *
 *   npm test
 *
 * Requires the dev server (http://localhost:3000) and MongoDB to be running —
 * both already are in day-to-day development. Proves that every order action
 * REALLY persists: it creates an order over the HTTP API with an advance
 * payment, asserts the document + receipts landed in MongoDB (through mongoose),
 * records payments on it (cash & UPI with txn id), transitions it with a
 * payment, rejects over-payment / missing UPI ids / illegal skips without
 * changing the doc, then cleans up everything it created so the demo data stays
 * untouched. Also covers the multi-line intake (one customer, several grain
 * bags → one order per bag with a shared advance auto-allocated in order) and
 * the reports/CSV-export endpoint (range aggregation + BOM'd download).
 */
import { loadEnvFile } from "node:process";
loadEnvFile(".env.local");

import mongoose from "mongoose";
import { backfillStatusHistory } from "../src/lib/order-status-history.ts";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const MONGODB_URI = process.env.MONGODB_URI;
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? "owner@example.com";
const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? "change-me-strong-password";
const TEST_PASSWORD = "roundtrip-test-newpass-2026";

/* ---------- tiny cookie-aware API client (mirrors browser behavior) ---------- */

const jar = new Map<string, string>();
let csrf = "";

function acceptSetCookie(res: Response) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const c of raw.length ? raw : res.headers.get("set-cookie") ? [res.headers.get("set-cookie")!] : []) {
    const pair = c.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

function cookieHeader(): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function api<T>(path: string, method = "GET", body?: unknown): Promise<{ status: number; json: T }> {
  const headers: Record<string, string> = {};
  if (jar.size) headers.cookie = cookieHeader();
  if (body !== undefined) headers["content-type"] = "application/json";
  if (method !== "GET") headers["x-csrf-token"] = csrf;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  acceptSetCookie(res);
  const json = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, json };
}

/** Like `api`, but for non-JSON responses (CSV downloads). */
async function apiText(path: string): Promise<{ status: number; contentType: string; bytes: Uint8Array; text: string }> {
  const headers: Record<string, string> = {};
  if (jar.size) headers.cookie = cookieHeader();
  const res = await fetch(BASE + path, { headers });
  acceptSetCookie(res);
  const bytes = new Uint8Array(await res.arrayBuffer());
  return {
    status: res.status,
    contentType: res.headers.get("content-type") ?? "",
    bytes,
    text: new TextDecoder("utf-8").decode(bytes),
  };
}

async function freshCsrf(): Promise<void> {
  const r = await api<{ csrfToken?: string }>("/api/csrf", "GET");
  if (r.json.csrfToken) csrf = r.json.csrfToken;
}

async function login(): Promise<void> {
  await freshCsrf();
  const r = await api("/api/auth/owner/login", "POST", { email: OWNER_EMAIL, password: OWNER_PASSWORD });
  if (r.status !== 200) throw new Error(`Login failed (${r.status}): ${JSON.stringify(r.json)}`);
  await freshCsrf(); // login rotates the CSRF token
}

/* ---------- assertions ---------- */

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail = ""): void {
  if (cond) {
    passed++;
    console.log(`  ✔ ${name}`);
  } else {
    failed++;
    console.error(`  ✘ ${name} ${detail}`);
  }
}

async function main() {
  if (!MONGODB_URI) throw new Error("Missing MONGODB_URI (.env.local)");
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const Order = mongoose.connection.collection("orders");
  const Seq = mongoose.connection.collection("sequences");
  const Notif = mongoose.connection.collection("notifications");
  const Aud = mongoose.connection.collection("auditlogs");
  const Customer = mongoose.connection.collection("customers");
  const Sessions = mongoose.connection.collection("sessions");
  const SettingsC = mongoose.connection.collection("settings");
  const Admin = mongoose.connection.collection("admins");

  const testStart = Date.now();
  await login();

  // A real (active) customer to attach the order to.
  const customer = await Customer.findOne({ active: true });
  if (!customer) throw new Error("No active customer found to attach the test order");
  const customerId = String(customer._id);

  const seqBefore = (await Seq.findOne({ name: "orderId" }))?.value ?? 0;

  // 1) Create over the API with an ADVANCE payment ----------
  const created = await api<{ order?: { id: string; orderId: number; status: string; paidAmount: number } }>(
    "/api/orders",
    "POST",
    {
      customerId,
      grainType: "wheat",
      requiredSize: "medium",
      weightKg: 12,
      ratePerKg: 8,
      advanceAmount: 30,
      advanceMethod: "cash",
    },
  );
  const orderId = created.json.order?.orderId;
  const orderDocId = created.json.order?.id;
  check("POST /api/orders returns the new order", created.status === 201 && !!orderId, `got ${created.status}`);
  check("advance payment reflected on creation", created.json.order?.paidAmount === 30, `paid ${created.json.order?.paidAmount}`);
  check("orderId follows the atomic counter", orderId === seqBefore + 1, `expected ${seqBefore + 1}, got ${orderId}`);

  // 2) Advance persisted in MongoDB ----------
  const doc0 = await Order.findOne({ orderId });
  const payments0 = (doc0?.payments ?? []) as { amount: number; method: string; upiTxnId?: string }[];
  check("row exists in MongoDB", !!doc0);
  check("initial status=pending paid=30 total=96", doc0?.status === "pending" && doc0?.paidAmount === 30 && doc0?.totalCharges === 96);
  check("advance stored as a cash receipt", payments0.length === 1 && payments0[0]?.amount === 30 && payments0[0]?.method === "cash");

  // 3) Advance above the total is rejected without consuming the counter ----------
  await freshCsrf();
  const overAdvance = await api<{ error?: { code?: string } }>("/api/orders", "POST", {
    customerId, grainType: "wheat", requiredSize: "medium", weightKg: 12, ratePerKg: 8,
    advanceAmount: 500, advanceMethod: "cash",
  });
  check("advance > total → 400", overAdvance.status === 400, `got ${overAdvance.status}`);
  check("rejected advance did not consume orderId", (await Seq.findOne({ name: "orderId" }))?.value === seqBefore + 1);

  // 4) UPI advance requires a transaction ID ----------
  await freshCsrf();
  const upiAdv = await api("/api/orders", "POST", {
    customerId, grainType: "wheat", requiredSize: "medium", weightKg: 12, ratePerKg: 8,
    advanceAmount: 20, advanceMethod: "upi",
  });
  check("UPI advance without txn id → 400", upiAdv.status === 400, `got ${upiAdv.status}`);

  // 5) Record a payment on the (pending) order via the payment route ----------
  await freshCsrf();
  const p1 = await api<{ order?: { paidAmount: number } }>(`/api/orders/${orderDocId}/payment`, "PATCH", { amount: 20, method: "upi", upiTxnId: "TESTUPI4381" });
  check("recordPayment partial UPI → 200, paid=50", p1.status === 200 && p1.json.order?.paidAmount === 50, `got ${p1.status}`);
  const doc1 = await Order.findOne({ orderId });
  const payments1 = (doc1?.payments ?? []) as { amount: number; method: string; upiTxnId?: string }[];
  check("DB paid=50 with 2 receipt entries", doc1?.paidAmount === 50 && payments1.length === 2);
  check("UPI txn id persisted", payments1[1]?.method === "upi" && payments1[1]?.upiTxnId === "TESTUPI4381");
  check("paidAmount == sum(payments)", payments1.reduce((s, p) => s + p.amount, 0) === doc1?.paidAmount);

  // 6) UPI payment without txn id → validation error ----------
  await freshCsrf();
  const upiBad = await api(`/api/orders/${orderDocId}/payment`, "PATCH", { amount: 10, method: "upi" });
  check("recordPayment UPI without txn id → 400", upiBad.status === 400, `got ${upiBad.status}`);

  // 7) Over-payment rejected, doc untouched ----------
  await freshCsrf();
  const over = await api<{ error?: { code?: string } }>(`/api/orders/${orderDocId}/payment`, "PATCH", { amount: 99999, method: "cash" });
  check("over-payment → 400", over.status === 400, `got ${over.status}`);
  const docOver = await Order.findOne({ orderId });
  check("DB unchanged after rejection", docOver?.paidAmount === 50 && (docOver?.payments ?? []).length === 2);

  // 8) Transition + payment = one DB write ----------
  await freshCsrf();
  const t1 = await api<{ order?: { status: string; paidAmount: number } }>(
    `/api/orders/${orderDocId}/status`,
    "PATCH",
    { status: "processing", payment: { amount: 20, method: "cash" } },
  );
  check("PATCH → processing + paid 20 (200, paid=70)", t1.status === 200 && t1.json.order?.status === "processing" && t1.json.order?.paidAmount === 70, `got ${t1.status}`);
  const docT1 = await Order.findOne({ orderId });
  check("DB row now processing AND paid=70 (single write)", docT1?.status === "processing" && docT1?.paidAmount === 70, JSON.stringify({ s: docT1?.status, p: docT1?.paidAmount }));

  // 9) Illegal skip rejected ----------
  await freshCsrf();
  const skip = await api<{ error?: { code?: string } }>(`/api/orders/${orderDocId}/status`, "PATCH", { status: "collected" });
  check("skip processing→collected → 400 INVALID_TRANSITION", skip.status === 400 && skip.json.error?.code === "INVALID_TRANSITION", `got ${skip.status}`);
  const docSkip = await Order.findOne({ orderId });
  check("DB still processing after rejection", docSkip?.status === "processing");

  // 10) Mark ready with the last UPI payment (full settlement) + collect ----------
  await freshCsrf();
  const t2 = await api(`/api/orders/${orderDocId}/status`, "PATCH", { status: "completed", payment: { amount: 26, method: "upi", upiTxnId: "TESTSETTLE99" } });
  check("PATCH → completed, fully paid (200)", t2.status === 200, `got ${t2.status}`);
  await freshCsrf();
  const t3 = await api(`/api/orders/${orderDocId}/status`, "PATCH", { status: "collected" });
  check("PATCH → collected (200)", t3.status === 200, `got ${t3.status}`);
  const doc2 = await Order.findOne({ orderId });
  check("DB row status=collected, fully paid, 4 receipts", doc2?.status === "collected" && doc2?.paidAmount === 96 && (doc2?.payments ?? []).length === 4);

  // 11) Cannot record more on a settled order ----------
  await freshCsrf();
  const again = await api(`/api/orders/${orderDocId}/payment`, "PATCH", { amount: 1, method: "cash" });
  check("record on fully-paid order → 400", again.status === 400, `got ${again.status}`);

  // 12) Leaves the owner queue ----------
  const queue = await api<{ orders?: { orderId: number }[] }>("/api/orders?excludeCollected=1", "GET");
  check("collected order no longer in queue", !(queue.json.orders ?? []).some((o) => o.orderId === orderId));

  // 13) Notification + audit side-effects persisted ----------
  const notifN = await Notif.countDocuments({ customerId: customer._id, type: "orderCollected", sentAt: { $gte: new Date(testStart) } });
  check("orderCollected notification written", notifN >= 1, `found ${notifN}`);
  const payNotif = await Notif.countDocuments({ customerId: customer._id, type: "paymentReceived", sentAt: { $gte: new Date(testStart) } });
  check("paymentReceived notification on full settlement", payNotif >= 1, `found ${payNotif}`);
  const auditN = await Aud.countDocuments({ "meta.orderId": orderId });
  check("audit trail written for the lifecycle", auditN >= 1, `found ${auditN}`);
  const payAudit = await Aud.countDocuments({ action: "order.payment.record", "meta.orderId": orderId });
  check("order.payment.record audit written", payAudit >= 1, `found ${payAudit}`);

  /* --------------------------------------------------------------------- */
  /* 14) Settings round-trip: PATCH persists, invalid rate rejected        */
  /* --------------------------------------------------------------------- */
  const settingsBefore = await SettingsC.findOne({}) as (Record<string, unknown> & { _id: unknown }) | null;
  const settingsExisted = !!settingsBefore;

  await freshCsrf();
  const sPatch = await api<{ settings?: { millName?: string; currency?: string; rates?: Record<string, Record<string, number>> } }>(
    "/api/owner/settings",
    "PATCH",
    { millName: "Test Flour Mill 2FA (roundtrip)", currency: "Rs", rates: { maize: { fine: 3.5, medium: 2.25, coarse: 2 } } },
  );
  check("PATCH /api/owner/settings → 200", sPatch.status === 200, `got ${sPatch.status}`);
  check("PATCH response echoes new name+rate", sPatch.json.settings?.millName === "Test Flour Mill 2FA (roundtrip)" && sPatch.json.settings?.rates?.maize?.medium === 2.25, JSON.stringify(sPatch.json.settings?.millName));

  const sDoc = await SettingsC.findOne({});
  check("settings persisted in DB (name,currency,rate)", (sDoc?.millName === "Test Flour Mill 2FA (roundtrip)" && sDoc?.currency === "Rs" && (sDoc?.rates as Record<string, Record<string, number>>)?.maize?.medium === 2.25), JSON.stringify({ m: sDoc?.millName, r: (sDoc?.rates as Record<string, Record<string, number>>)?.maize?.medium }));

  await freshCsrf();
  const sBad = await api<{ error?: { code?: string } }>("/api/owner/settings", "PATCH", { rates: { maize: { fine: -1 } } });
  check("negative rate → 400", sBad.status === 400, `got ${sBad.status}`);
  const sDoc2 = await SettingsC.findOne({});
  check("DB unchanged after invalid rate", sDoc2?.millName === "Test Flour Mill 2FA (roundtrip)" && (sDoc2?.rates as Record<string, Record<string, number>>)?.maize?.fine === 3.5);

  const sGet = await api<{ settings?: { millName?: string } }>("/api/owner/settings", "GET");
  check("GET settings reflects the PATCH", sGet.json.settings?.millName === "Test Flour Mill 2FA (roundtrip)");

  /* --------------------------------------------------------------------- */
  /* 15) Owner password change + restore                                   */
  /* --------------------------------------------------------------------- */
  let passwordChanged = false;
  if (TEST_PASSWORD === OWNER_PASSWORD) throw new Error("TEST_PASSWORD must differ from OWNER_PASSWORD");
  try {
    await freshCsrf();
    const wrongPw = await api("/api/auth/owner/change-password", "PATCH", { currentPassword: "totally-wrong", newPassword: TEST_PASSWORD });
    check("change-password with wrong current → 400", wrongPw.status === 400, `got ${wrongPw.status}`);

    await freshCsrf();
    const changeOk = await api("/api/auth/owner/change-password", "PATCH", { currentPassword: OWNER_PASSWORD, newPassword: TEST_PASSWORD });
    check("change-password → 200", changeOk.status === 200, `got ${changeOk.status}`);
    passwordChanged = true;

    await freshCsrf();
    const oldLogin = await api("/api/auth/owner/login", "POST", { email: OWNER_EMAIL, password: OWNER_PASSWORD });
    check("old password now rejected (401)", oldLogin.status === 401, `got ${oldLogin.status}`);

    await freshCsrf();
    const newLogin = await api("/api/auth/owner/login", "POST", { email: OWNER_EMAIL, password: TEST_PASSWORD });
    check("login with new password → 200", newLogin.status === 200, `got ${newLogin.status}`);
    await freshCsrf();
  } finally {
    // Hard requirement: never leave the owner locked out, even on failure.
    if (passwordChanged) {
      await freshCsrf().catch(() => {});
      await api("/api/auth/owner/change-password", "PATCH", { currentPassword: TEST_PASSWORD, newPassword: OWNER_PASSWORD }).catch(() => {});
      passwordChanged = false;
      await freshCsrf().catch(() => {});
    }
  }

  /* --------------------------------------------------------------------- */
  /* 16) TOTP 2FA lifecycle: setup → wrong code → enable → login 2FA →      */
  /*     disable → normal login                                             */
  /* --------------------------------------------------------------------- */
  const { generate } = await import("otplib");
  async function totp(secret: string): Promise<string> {
    return generate({ secret, digits: 6, period: 30 });
  }

  let totpSecret = "";
  let totpEnabled = false;
  try {
    await freshCsrf();
    const setup = await api<{ secret?: string; qrDataUrl?: string; otpauthUrl?: string }>("/api/auth/owner/2fa/setup", "POST");
    check("2FA setup → 200 with secret + QR", setup.status === 200 && !!setup.json.secret && !!setup.json.qrDataUrl, `got ${setup.status}`);
    totpSecret = setup.json.secret ?? "";
    check("otpauth URI is a TOTP URL", (setup.json.otpauthUrl ?? "").startsWith("otpauth://totp/"), setup.json.otpauthUrl);

    const codeValid = totpSecret ? await totp(totpSecret) : "";
    const codeWrong = codeValid === "000000" ? "000001" : "000000";

    await freshCsrf();
    const badVerify = await api("/api/auth/owner/2fa/verify", "POST", { code: codeWrong });
    check("wrong verify code → 400", badVerify.status === 400, `got ${badVerify.status}`);

    await freshCsrf();
    const verify = await api("/api/auth/owner/2fa/verify", "POST", { code: codeValid });
    check("correct code enables 2FA → 200", verify.status === 200, `got ${verify.status}`);
    totpEnabled = true;

    const adminDoc = await Admin.findOne({ email: OWNER_EMAIL.toLowerCase() });
    check("admin.totpEnabled true in DB", (adminDoc as Record<string, unknown>)?.totpEnabled === true, JSON.stringify({ totpEnabled: (adminDoc as Record<string, unknown>)?.totpEnabled }));

    await freshCsrf();
    const noTotp = await api<{ needTotp?: boolean }>("/api/auth/owner/login", "POST", { email: OWNER_EMAIL, password: OWNER_PASSWORD });
    check("login without code → needTotp (200, no session)", noTotp.status === 200 && noTotp.json.needTotp === true, `got ${noTotp.status}`);

    await freshCsrf();
    const badTotp = await api("/api/auth/owner/login", "POST", { email: OWNER_EMAIL, password: OWNER_PASSWORD, totpCode: codeWrong });
    check("login with wrong TOTP → 401", badTotp.status === 401, `got ${badTotp.status}`);

    await freshCsrf();
    const withTotp = await api("/api/auth/owner/login", "POST", { email: OWNER_EMAIL, password: OWNER_PASSWORD, totpCode: codeValid });
    check("login with valid TOTP → 200", withTotp.status === 200, `got ${withTotp.status}`);
    await freshCsrf();
  } finally {
    // Never leave 2FA forced-on for the owner.
    if (totpEnabled && totpSecret) {
      const code = await totp(totpSecret);
      await freshCsrf().catch(() => {});
      await api("/api/auth/owner/2fa/disable", "POST", { code }).catch(() => {});
      totpEnabled = false;
      await freshCsrf().catch(() => {});
    }
  }

  await freshCsrf();
  const backToNormal = await api<{ needTotp?: boolean }>("/api/auth/owner/login", "POST", { email: OWNER_EMAIL, password: OWNER_PASSWORD });
  check("login back to normal after disable → 200", backToNormal.status === 200 && backToNormal.json.needTotp !== true, `got ${backToNormal.status}`);
  await freshCsrf();

  /* --------------------------------------------------------------------- */
  /* 17) Owner broadcast: fan-out to every active customer                 */
  /* --------------------------------------------------------------------- */
  const activeCount = await Customer.countDocuments({ active: true });
  const broadcastMsg = `Roundtrip broadcast ${testStart}`;
  await freshCsrf();
  const bcast = await api<{ count?: number }>("/api/owner/notifications/broadcast", "POST", {
    message: broadcastMsg,
    lang: "mr",
  });
  check("broadcast → 200, one row per active customer returned", bcast.status === 200 && bcast.json.count === activeCount, `status ${bcast.status} count ${bcast.json.count} active ${activeCount}`);
  const bcastRows = await Notif.find({ type: "broadcast", message: broadcastMsg }).toArray();
  check("DB has one broadcast notification per active customer", bcastRows.length === activeCount, `found ${bcastRows.length}`);
  check("every row carries its customerId + message + lang", bcastRows.every((r) => !!r.customerId && r.message === broadcastMsg && r.lang === "mr"));
  const bcastAudit = await Aud.countDocuments({ action: "notifications.broadcast", "meta.message": broadcastMsg });
  check("notifications.broadcast audit written", bcastAudit >= 1, `found ${bcastAudit}`);
  // cleanup this section's fan-out rows (only the _customer's are caught below)
  await Notif.deleteMany({ message: broadcastMsg });

  /* --------------------------------------------------------------------- */
  /* 18) Multi-line intake: one customer + several bags → N orders          */
  /* --------------------------------------------------------------------- */
  const seqForBatch = (await Seq.findOne({ name: "orderId" }))?.value ?? 0;
  await freshCsrf();
  const batch = await api<{
    orders?: { orderId: number; grainType: string; paidAmount: number; totalCharges: number; outstanding: number }[];
  }>("/api/orders", "POST", {
    customerId,
    items: [
      { grainType: "wheat", requiredSize: "fine", weightKg: 10, ratePerKg: 8 },    // ₹80
      { grainType: "jowar", requiredSize: "coarse", weightKg: 20, ratePerKg: 5 },  // ₹100
    ],
    advanceAmount: 95,
    advanceMethod: "cash",
  });
  const bIds = (batch.json.orders ?? []).map((o) => o.orderId);
  check("batch intake → 201 with two orders", batch.status === 201 && bIds.length === 2, `got ${batch.status}`);
  check("batch orderIds are consecutive", bIds.length === 2 && bIds[0] === seqForBatch + 1 && bIds[1] === seqForBatch + 2, JSON.stringify({ bIds, seqForBatch }));
  check("advance fills first line (₹80) and spills ₹15 to second", batch.json.orders?.[0]?.paidAmount === 80 && batch.json.orders?.[1]?.paidAmount === 15, JSON.stringify({ p0: batch.json.orders?.[0]?.paidAmount, p1: batch.json.orders?.[1]?.paidAmount }));
  check("per-order balance stays honest", batch.json.orders?.[0]?.outstanding === 0 && batch.json.orders?.[1]?.outstanding === 85, JSON.stringify({ o0: batch.json.orders?.[0]?.outstanding, o1: batch.json.orders?.[1]?.outstanding }));

  const bDoc1 = await Order.findOne({ orderId: bIds[0] });
  const bDoc2 = await Order.findOne({ orderId: bIds[1] });
  check("both DB rows exist with correct grain + paid split", bDoc1?.grainType === "wheat" && bDoc1?.paidAmount === 80 && bDoc2?.grainType === "jowar" && bDoc2?.paidAmount === 15, JSON.stringify({ g1: bDoc1?.grainType, p1: bDoc1?.paidAmount, g2: bDoc2?.grainType, p2: bDoc2?.paidAmount }));
  check("each line carries a receipt for its advance share", (bDoc1?.payments ?? []).length === 1 && (bDoc1?.payments ?? [])[0]?.amount === 80 && (bDoc2?.payments ?? []).length === 1 && (bDoc2?.payments ?? [])[0]?.amount === 15, JSON.stringify({ p1: (bDoc1?.payments ?? []).map((p: { amount: number }) => p.amount), p2: (bDoc2?.payments ?? []).map((p: { amount: number }) => p.amount) }));

  await freshCsrf();
  const overBatch = await api<{ error?: { code?: string } }>("/api/orders", "POST", {
    customerId, items: [{ grainType: "wheat", requiredSize: "fine", weightKg: 10, ratePerKg: 8 }],
    advanceAmount: 500, advanceMethod: "cash",
  });
  check("advance > batch total → 400", overBatch.status === 400, `got ${overBatch.status}`);
  check("rejected batch did not consume orderId", (await Seq.findOne({ name: "orderId" }))?.value === seqForBatch + 2);

  const batchAudit = await Aud.countDocuments({ action: "order.create", "meta.orderIds": bIds });
  check("batch audit written with both order ids", batchAudit >= 1, `found ${batchAudit}`);

  // cleanup this section (order + audit rows; notifications are caught below)
  await Order.deleteMany({ orderId: { $in: bIds } });
  await Aud.deleteMany({ "meta.orderIds": bIds });

  /* --------------------------------------------------------------------- */
  /* 19) Reports: range aggregation + CSV export                           */
  /* --------------------------------------------------------------------- */
  type ReportResp = {
    report?: {
      range: { preset: string; from: string; to: string };
      activity: { ordersCreated: number; weightKg: number; totalCharges: number; collected: number; outstandingOnNewOrders: number };
      byGrain: { grainType: string; orders: number; weightKg: number; totalCharges: number }[];
      byMethod: { cash: number; upi: number };
      upiReceipts: { orderId: number; amount: number; upiTxnId?: string; recordedAt: string }[];
      customers: { id: string; outstanding: number; collectedInPeriod: number }[];
      receipts: { orderId: number; amount: number; method: string; upiTxnId?: string; recordedAt: string }[];
    };
  };

  // A future window is deterministic: nothing was created or collected there.
  const emptyRep = await api<ReportResp>("/api/owner/reports?preset=custom&from=2099-01-01&to=2099-01-31");
  check("reports: empty future range → 0 orders, 0 collected", emptyRep.status === 200 && emptyRep.json.report?.activity.ordersCreated === 0 && emptyRep.json.report?.activity.collected === 0, `got ${emptyRep.status}`);

  const beforeRep = await api<ReportResp>("/api/owner/reports?preset=today");
  const ordersBefore = beforeRep.json.report?.activity.ordersCreated ?? -1;
  check("reports: today range resolves with a report body", beforeRep.status === 200 && !!beforeRep.json.report && ordersBefore >= 0, `got ${beforeRep.status}`);

  const rptTxn = `RPTUPI${testStart}`;
  await freshCsrf();
  const rptOrder = await api<{ order?: { orderId: number; id: string } }>("/api/orders", "POST", {
    customerId, grainType: "wheat", requiredSize: "medium", weightKg: 12, ratePerKg: 8,
    advanceAmount: 13, advanceMethod: "upi", advanceUpiTxnId: rptTxn,
  });
  const rptId = rptOrder.json.order?.orderId;
  check("reports: seed order created with a UPI advance", rptOrder.status === 201 && !!rptId, `got ${rptOrder.status}`);

  const afterRep = await api<ReportResp>("/api/owner/reports?preset=today");
  const report = afterRep.json.report;
  check("reports: activity counts the new order", report?.range.preset === "today" && report?.activity.ordersCreated === ordersBefore + 1, JSON.stringify({ before: ordersBefore, after: report?.activity.ordersCreated }));

  const receipt = report?.receipts.find((r) => r.upiTxnId === rptTxn);
  check("reports: receipt row present with amount+method+order", receipt?.amount === 13 && receipt?.method === "upi" && receipt?.orderId === rptId, JSON.stringify(receipt));
  const upiRow = report?.upiReceipts.find((r) => r.upiTxnId === rptTxn);
  check("reports: UPI receipts ledger includes the txn", upiRow?.amount === 13 && upiRow?.orderId === rptId);
  check("reports: byMethod.upi includes the receipt", (report?.byMethod.upi ?? 0) >= 13, `upi ${report?.byMethod.upi}`);
  check("reports: activity.collected includes the receipt", (report?.activity.collected ?? 0) >= 13, `collected ${report?.activity.collected}`);

  const grainRow = report?.byGrain.find((g) => g.grainType === "wheat");
  check("reports: grain breakdown has the wheat line", (grainRow?.orders ?? 0) >= 1 && (grainRow?.totalCharges ?? 0) >= 96, JSON.stringify(grainRow));
  const custRow = report?.customers.find((c) => c.id === customerId);
  check("reports: dues ledger has the customer with this period's collection", !!custRow && custRow.outstanding >= 83 && custRow.collectedInPeriod >= 13, JSON.stringify(custRow));

  const csv = await apiText("/api/owner/reports/export?preset=today&section=receipts");
  check("reports: CSV export → 200 text/csv", csv.status === 200 && csv.contentType.includes("text/csv"), `got ${csv.status} ${csv.contentType}`);
  check("reports: CSV starts with a UTF-8 BOM", csv.bytes[0] === 0xef && csv.bytes[1] === 0xbb && csv.bytes[2] === 0xbf, `bytes ${csv.bytes[0]} ${csv.bytes[1]} ${csv.bytes[2]}`);
  check("reports: CSV contains the new receipt txn + method", csv.text.includes(rptTxn) && csv.text.includes("UPI"));

  const badSection = await api("/api/owner/reports/export?section=bogus");
  check("reports: unknown export section → 400", badSection.status === 400, `got ${badSection.status}`);

  // cleanup this section
  await Order.deleteOne({ orderId: rptId });
  await Aud.deleteMany({ "meta.orderId": rptId });

  /* --------------------------------------------------------------------- */
  /* 20) Customer portal: own-scope reads + hardening                       */
  /*     (overview scoping, notification read one/all, targeted broadcast,  */
  /*      cross-customer tamper no-op, PIN lockout, deactivation gate,      */
  /*      idle-timeout revocation)                                          */
  /* --------------------------------------------------------------------- */

  // Two fresh, unique test customers — A is the target, B is the "other"
  // account that must never see A's data (no IDOR). Mobiles are 10 digits.
  const mobileA = "9" + String(testStart).padStart(10, "0").slice(-9);
  const mobileB = "9" + String(testStart + 977771).padStart(10, "0").slice(-9);
  const pinA = "1111";
  const pinB = "2222";

  await freshCsrf();
  const cA = await api<{ customer?: { id?: string } }>("/api/customers", "POST", { name: "Portal Test A", mobile: mobileA, pin: pinA });
  const cB = await api<{ customer?: { id?: string } }>("/api/customers", "POST", { name: "Portal Test B", mobile: mobileB, pin: pinB });
  const aId = cA.json.customer?.id ?? "";
  const bId = cB.json.customer?.id ?? "";
  check("portal: two test customers created", cA.status === 201 && cB.status === 201 && !!aId && !!bId, `A ${cA.status} B ${cB.status}`);

  const po = await api<{ order?: { orderId: number; id: string; paidAmount: number; outstanding: number } }>(
    "/api/orders", "POST",
    { customerId: aId, grainType: "wheat", requiredSize: "fine", weightKg: 12, ratePerKg: 8, advanceAmount: 10, advanceMethod: "cash" },
  );
  const poNum = po.json.order?.orderId;
  const poDoc = po.json.order?.id;
  check("portal: order for A created (₹10 paid, ₹86 due)", po.status === 201 && po.json.order?.paidAmount === 10 && po.json.order?.outstanding === 86, `got ${po.status}`);

  await freshCsrf();
  const poT = await api(`/api/orders/${poDoc}/status`, "PATCH", { status: "processing" });
  check("portal: owner transitions A's order → processing", poT.status === 200, `got ${poT.status}`);

  // Targeted broadcast to ONLY A.
  const portalMsg = `Portal-specific note ${testStart}`;
  await freshCsrf();
  const tgt = await api<{ count?: number }>("/api/owner/notifications/broadcast", "POST", { message: portalMsg, lang: "en", customerIds: [aId] });
  check("portal: targeted broadcast → count 1", tgt.status === 200 && tgt.json.count === 1, `got ${tgt.status} count ${tgt.json.count}`);
  const tgtAudit = await Aud.countDocuments({ action: "notifications.broadcast", "meta.customers": 1, "meta.message": portalMsg });
  check("portal: targeted broadcast audited with recipient count", tgtAudit >= 1, `found ${tgtAudit}`);

  type Dash = { dashboard?: { orders?: { orderId: number }[]; outstandingTotal?: number; unreadCount?: number; notifications?: { id: string; type: string; message: string; read: boolean }[] } };

  // A logs in — own-scope overview.
  await freshCsrf();
  const la = await api<{ user?: { id?: string }; csrfToken?: string }>("/api/auth/customer/login", "POST", { mobile: mobileA, pin: pinA });
  check("portal: A logs in with mobile + PIN", la.status === 200 && !!la.json.user?.id, `got ${la.status}`);
  await freshCsrf();
  const ov = await api<Dash>("/api/my/overview", "GET");
  const notifs = ov.json.dashboard?.notifications ?? [];
  const unread = ov.json.dashboard?.unreadCount ?? -1;
  const oneId = notifs.find((n) => !n.read)?.id ?? notifs[0]?.id ?? "";
  check("portal: A overview shows own order + ₹86 due", ov.status === 200 && (ov.json.dashboard?.orders ?? []).some((o) => o.orderId === poNum) && ov.json.dashboard?.outstandingTotal === 86, `got ${ov.status}`);
  check("portal: A has unread orderReceived + orderProcessing + broadcast", unread >= 3, `unread ${unread}`);
  check("portal: messages are translated, not raw 'notif.*' keys", notifs.every((n) => !n.message.startsWith("notif.")), JSON.stringify(notifs.map((n) => n.message)));

  // B logs in — must see none of A's data.
  await freshCsrf();
  const lb = await api("/api/auth/customer/login", "POST", { mobile: mobileB, pin: pinB });
  check("portal: B logs in", lb.status === 200, `got ${lb.status}`);
  await freshCsrf();
  const ovB = await api<Dash>("/api/my/overview", "GET");
  check("portal: B cannot see A's order", ovB.status === 200 && !(ovB.json.dashboard?.orders ?? []).some((o) => o.orderId === poNum), `got ${ovB.status}`);
  check("portal: B has zero unread (no leaked notifications)", (ovB.json.dashboard?.unreadCount ?? -1) === 0, `unread ${ovB.json.dashboard?.unreadCount}`);
  check("portal: targeted broadcast did NOT reach B", !(ovB.json.dashboard?.notifications ?? []).some((n) => n.message === portalMsg));

  // B pokes A's UNREAD notification id → must be a silent no-op (200, DB untouched).
  await freshCsrf();
  const cross = await api<{ marked?: number }>(`/api/my/notifications/${oneId}/read`, "PATCH", {});
  check("portal: cross-customer read → 200 (no existence oracle)", cross.status === 200, `got ${cross.status}`);
  const notifDoc = await Notif.findOne({ _id: new mongoose.Types.ObjectId(oneId) });
  const readAtAfterTamper = (notifDoc as unknown as { readAt?: Date | null } | null)?.readAt ?? null;
  check("portal: A's notification still unread after B's tamper", readAtAfterTamper == null, `readAt ${String(readAtAfterTamper)}`);

  // Back to A: mark one read, then read-all.
  await freshCsrf();
  const la2 = await api("/api/auth/customer/login", "POST", { mobile: mobileA, pin: pinA });
  check("portal: A re-logs in", la2.status === 200, `got ${la2.status}`);
  await freshCsrf();
  const r1 = await api<{ marked?: number }>(`/api/my/notifications/${oneId}/read`, "PATCH", {});
  check("portal: A marks one notification read → 200", r1.status === 200, `got ${r1.status}`);
  const unreadAfterOne = (await api<Dash>("/api/my/overview", "GET")).json.dashboard?.unreadCount ?? -1;
  check("portal: unread drops by one after single read", unreadAfterOne === unread - 1, `was ${unread}, now ${unreadAfterOne}`);
  await freshCsrf();
  const rAll = await api<{ marked?: number }>("/api/my/notifications/read-all", "PATCH", {});
  check("portal: read-all → marks the rest", rAll.status === 200 && (rAll.json.marked ?? 0) >= 1, `got ${rAll.status} marked ${rAll.json.marked}`);
  const unreadAll = (await api<Dash>("/api/my/overview", "GET")).json.dashboard?.unreadCount ?? -1;
  check("portal: unread now 0 after read-all", unreadAll === 0, `unread ${unreadAll}`);

  // Unknown mobile → 401 (never reveals whether the account exists).
  await freshCsrf();
  const ghost = await api("/api/auth/customer/login", "POST", { mobile: `${Number(mobileA) === 9999888800 ? 9999888801 : 9999888800}`, pin: pinA });
  check("portal: unknown mobile → 401 (no enumeration)", ghost.status === 401, `got ${ghost.status}`);

  // PIN lockout: 5 wrong attempts lock the account, then even the right PIN → 429.
  const wrongPin = "0000"; // 4 digits, differs from pinA/pinB
  for (let i = 0; i < 5; i++) {
    await freshCsrf();
    await api("/api/auth/customer/login", "POST", { mobile: mobileB, pin: wrongPin });
  }
  await freshCsrf();
  const locked = await api<{ error?: { code?: string } }>("/api/auth/customer/login", "POST", { mobile: mobileB, pin: pinB });
  check("portal: correct PIN during lockout → 429 ACCOUNT_LOCKED", locked.status === 429 && locked.json.error?.code === "ACCOUNT_LOCKED", `got ${locked.status} ${locked.json.error?.code}`);
  const bDoc = await Customer.findOne({ _id: new mongoose.Types.ObjectId(bId) });
  check("portal: B lockedUntil persisted in DB", !!bDoc?.lockedUntil && bDoc.lockedUntil.getTime() > Date.now(), JSON.stringify({ lockedUntil: bDoc?.lockedUntil }));
  await Customer.updateOne({ _id: new mongoose.Types.ObjectId(bId) }, { $set: { lockedUntil: null, failedPinAttempts: 0 } });
  await freshCsrf();
  const lb2 = await api<{ user?: { id?: string } }>("/api/auth/customer/login", "POST", { mobile: mobileB, pin: pinB });
  check("portal: B logs in again after clearing the lock", lb2.status === 200 && !!lb2.json.user?.id, `got ${lb2.status}`);
  await freshCsrf();

  // Idle timeout: push B's latest session's lastUsedAt back past the TTL → 401.
  const bSesh = await Sessions.find({ kind: "customer", refId: new mongoose.Types.ObjectId(bId), revokedAt: null }).sort({ createdAt: -1 }).limit(1).next();
  await Sessions.updateOne({ _id: bSesh?._id }, { $set: { lastUsedAt: new Date(0) } });
  const idle = await api("/api/my/overview", "GET");
  check("portal: idle session past SESSION_IDLE_TTL → 401", idle.status === 401, `got ${idle.status}`);

  // Deactivation gate: flipping A inactive kills the session on the next request.
  await Customer.updateOne({ _id: new mongoose.Types.ObjectId(aId) }, { $set: { active: false } });
  const inactive = await api<{ error?: { code?: string } }>("/api/my/overview", "GET");
  check("portal: deactivated customer loses access instantly (401)", inactive.status === 401 && inactive.json.error?.code === "UNAUTHORIZED", `got ${inactive.status} ${inactive.json.error?.code}`);
  await Customer.updateOne({ _id: new mongoose.Types.ObjectId(aId) }, { $set: { active: true } });

  // cleanup this section
  await Order.deleteOne({ orderId: poNum });
  await Notif.deleteMany({ message: portalMsg });
  await Notif.deleteMany({ customerId: { $in: [new mongoose.Types.ObjectId(aId), new mongoose.Types.ObjectId(bId)] } });
  await Aud.deleteMany({ "meta.message": portalMsg });
  await Aud.deleteMany({ "actor.actorId": { $in: [aId, bId] } });
  await Sessions.deleteMany({ refId: { $in: [new mongoose.Types.ObjectId(aId), new mongoose.Types.ObjectId(bId)] } });
  await Customer.deleteMany({ _id: { $in: [new mongoose.Types.ObjectId(aId), new mongoose.Types.ObjectId(bId)] } });
  await Aud.deleteMany({ "meta.orderId": poNum });

  /* --------------------------------------------------------------------- */
  /* 21) Status history: per-step timestamps on the journey + backfill      */
  /* --------------------------------------------------------------------- */
  const hCustomer = await Customer.findOne({ active: true });
  if (!hCustomer) throw new Error("No active customer for the status-history test");
  const hCustomerId = String(hCustomer._id);

  // Single order: create → processing → completed (fully settled) → collected.
  const h1 = await api<{ order?: { id: string; orderId: number } }>("/api/orders", "POST", {
    customerId: hCustomerId, grainType: "wheat", requiredSize: "fine", weightKg: 12, ratePerKg: 8,
    advanceAmount: 10, advanceMethod: "cash",
  });
  const hDoc = h1.json.order?.id ?? "";
  const hNum = h1.json.order?.orderId;
  check("history: order created for lifecycle test", h1.status === 201 && !!hDoc, `got ${h1.status}`);

  let hRow = await Order.findOne({ _id: new mongoose.Types.ObjectId(hDoc) });
  const h0 = ((hRow?.statusHistory ?? []) as { status: string; at: Date }[]);
  check("history: seeded [{pending @ createdAt}] at intake", h0.length === 1 && h0[0]?.status === "pending" && Math.abs(h0[0].at.getTime() - (hRow?.createdAt as Date).getTime()) < 5000, JSON.stringify(h0));

  await freshCsrf();
  const hTa = await api(`/api/orders/${hDoc}/status`, "PATCH", { status: "processing" });
  await freshCsrf();
  const hTb = await api(`/api/orders/${hDoc}/status`, "PATCH", { status: "completed", payment: { amount: 86, method: "cash" } });
  await freshCsrf();
  const hTc = await api(`/api/orders/${hDoc}/status`, "PATCH", { status: "collected" });
  check("history: three transitions succeed", hTa.status === 200 && hTb.status === 200 && hTc.status === 200, `got ${hTa.status}/${hTb.status}/${hTc.status}`);

  hRow = await Order.findOne({ _id: new mongoose.Types.ObjectId(hDoc) });
  const hHist = ((hRow?.statusHistory ?? []) as { status: string; at: Date }[]);
  check("history: full lifecycle → pending/processing/completed/collected", hHist.length === 4 && hHist.map((x) => x.status).join() === "pending,processing,completed,collected", JSON.stringify(hHist.map((x) => x.status)));
  check("history: timestamps strictly non-decreasing", hHist.every((x, i) => i === 0 || hHist[i - 1].at.getTime() <= x.at.getTime()), JSON.stringify(hHist.map((x) => x.at.toISOString())));
  check("history: last step time == updatedAt (one atomic save)", Math.abs((hRow?.updatedAt as Date).getTime() - hHist[3].at.getTime()) < 5000);

  // Backfill a legacy-style row (no statusHistory) → pending@created + current@updated; idempotent.
  await Order.updateOne({ _id: new mongoose.Types.ObjectId(hDoc) }, { $unset: { statusHistory: "" } });
  const stripped = await Order.findOne({ _id: new mongoose.Types.ObjectId(hDoc) });
  check("history: stripped row has no statusHistory (legacy shape)", !stripped || (stripped as { statusHistory?: unknown }).statusHistory === undefined);
  const backfilled1 = await backfillStatusHistory(Order, { _id: new mongoose.Types.ObjectId(hDoc) });
  const bRow = await Order.findOne({ _id: new mongoose.Types.ObjectId(hDoc) });
  const bHist = ((bRow?.statusHistory ?? []) as { status: string; at: Date }[]);
  check("history: backfill builds [pending@created, collected@updated]", backfilled1 === 1 && bHist.length === 2 && bHist[0].status === "pending" && bHist[1].status === "collected" && Math.abs(bHist[0].at.getTime() - (bRow?.createdAt as Date).getTime()) < 5000 && Math.abs(bHist[1].at.getTime() - (bRow?.updatedAt as Date).getTime()) < 5000, JSON.stringify(bHist));
  const backfilled2 = await backfillStatusHistory(Order, { _id: new mongoose.Types.ObjectId(hDoc) });
  const bRow2 = await Order.findOne({ _id: new mongoose.Types.ObjectId(hDoc) });
  check("history: backfill is idempotent (re-run changes nothing)", backfilled2 === 0 && ((bRow2?.statusHistory ?? []) as unknown[]).length === 2, `modified ${backfilled2}`);

  // Batch intake: every line gets its own pending step.
  const h3 = await api<{ orders?: { orderId: number }[] }>("/api/orders", "POST", {
    customerId: hCustomerId,
    items: [
      { grainType: "maize", requiredSize: "medium", weightKg: 10, ratePerKg: 5 },
      { grainType: "jowar", requiredSize: "fine", weightKg: 8, ratePerKg: 4 },
    ],
  });
  const h3Nums = (h3.json.orders ?? []).map((o) => o.orderId);
  const h3rows = await Order.find({ orderId: { $in: h3Nums } }).toArray();
  check("history: every batch line starts with one pending step", h3.status === 201 && h3rows.length === 2 && h3rows.every((r) => { const h = (r as { statusHistory?: { status: string }[] }).statusHistory ?? []; return h.length === 1 && h[0].status === "pending"; }), `rows ${h3rows.length}`);

  // Customer sees the timeline in the portal (overview DTO carries statusHistory).
  const hMobile = "9" + String(testStart + 137331).padStart(10, "0").slice(-9);
  const hPin = "3333";
  await freshCsrf();
  const hC = await api<{ customer?: { id?: string } }>("/api/customers", "POST", { name: "History Test D", mobile: hMobile, pin: hPin });
  const hDid = hC.json.customer?.id ?? "";
  await freshCsrf();
  const h2 = await api<{ order?: { id: string; orderId: number } }>("/api/orders", "POST", {
    customerId: hDid, grainType: "rice", requiredSize: "coarse", weightKg: 10, ratePerKg: 4, advanceAmount: 5, advanceMethod: "cash",
  });
  await freshCsrf();
  const h2T = await api(`/api/orders/${h2.json.order?.id}/status`, "PATCH", { status: "processing" });
  await freshCsrf();
  const h2L = await api("/api/auth/customer/login", "POST", { mobile: hMobile, pin: hPin });
  check("history: D's journey + login ready", h2.status === 201 && h2T.status === 200 && h2L.status === 200, `got ${h2.status}/${h2T.status}/${h2L.status}`);
  await freshCsrf();
  const oHas = await api<{ dashboard?: { orders?: { orderId: number; statusHistory?: { status: string; at: string }[] }[] } }>("/api/my/overview", "GET");
  const mine = (oHas.json.dashboard?.orders ?? []).find((o) => o.orderId === h2.json.order?.orderId);
  check("history: overview exposes per-step times to the customer", (mine?.statusHistory?.length ?? 0) === 2 && mine?.statusHistory?.[0]?.status === "pending" && mine?.statusHistory?.[1]?.status === "processing" && !!mine?.statusHistory?.[1]?.at, JSON.stringify(mine?.statusHistory));

  // cleanup this section
  await Order.deleteOne({ _id: new mongoose.Types.ObjectId(hDoc) });
  await Order.deleteMany({ _id: { $in: h3rows.map((r) => r._id) } });
  await Order.deleteMany({ _id: new mongoose.Types.ObjectId(h2.json.order?.id ?? "") });
  await Notif.deleteMany({ customerId: hCustomer._id, sentAt: { $gte: new Date(testStart) } });
  await Aud.deleteMany({
    $or: [
      { "meta.orderId": { $in: [hNum, h2.json.order?.orderId].filter(Boolean) } },
      { "meta.orderIds": { $in: h3Nums } },
      { "actor.actorId": hDid },
    ],
  });
  await Customer.deleteOne({ _id: new mongoose.Types.ObjectId(hDid) });
  await Sessions.deleteMany({ refId: new mongoose.Types.ObjectId(hDid) });

  /* ---------- cleanup: remove every trace the test created ---------- */
  await Order.deleteOne({ orderId });
  await Notif.deleteMany({ customerId: customer._id, sentAt: { $gte: new Date(testStart) } });
  await Aud.deleteMany({ "meta.orderId": orderId });
  // settings + security audits created in sections 14–16
  await Aud.deleteMany({
    createdAt: { $gte: new Date(testStart) },
    action: { $in: ["settings.update", "owner.password.change", "owner.2fa.setup", "owner.2fa.enable", "owner.2fa.disable", "login", "login.failed", "login.pending2fa", "notifications.broadcast"] },
  });
  await Seq.updateOne({ name: "orderId" }, { $set: { value: seqBefore } });
  // restore settings document exactly as it was
  if (settingsExisted && settingsBefore) {
    await SettingsC.replaceOne(
      { _id: settingsBefore._id } as never,
      settingsBefore as never,
    );
  } else {
    await SettingsC.deleteMany({});
  }

  console.log(`\n${passed} passed, ${failed} failed (cleanup done, DB restored)`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error("DB round-trip test failed fatally:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});