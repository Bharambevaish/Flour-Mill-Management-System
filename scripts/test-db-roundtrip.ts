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
import { toCsv } from "../src/lib/csv.ts";

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

/**
 * Like `api`, but sends multipart/form-data — the transport the QR upload uses.
 * Built by hand (rather than reusing `api`) precisely so the test proves the
 * server parses a real browser-style multipart body, boundary and all.
 */
async function apiUpload(
  path: string,
  field: string,
  filename: string,
  contentType: string,
  bytes: Uint8Array,
  method = "POST",
): Promise<{ status: number; json: Record<string, unknown> }> {
  const boundary = `----fmtest${Math.random().toString(36).slice(2)}`;
  const head = new TextEncoder().encode(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${field}"; filename="${filename}"\r\n` +
      `Content-Type: ${contentType}\r\n\r\n`,
  );
  const tail = new TextEncoder().encode(`\r\n--${boundary}--\r\n`);
  const body = new Uint8Array(head.length + bytes.length + tail.length);
  body.set(head, 0);
  body.set(bytes, head.length);
  body.set(tail, head.length + bytes.length);

  const res = await fetch(BASE + path, {
    method,
    headers: {
      cookie: cookieHeader(),
      "content-type": `multipart/form-data; boundary=${boundary}`,
      "x-csrf-token": csrf,
    },
    body,
  });
  acceptSetCookie(res);
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, json };
}

/** A minimal but structurally valid 2x2 PNG, used for the byte-identity check. */
function tinyPng(): Uint8Array {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x02, 0x08, 0x02, 0x00, 0x00, 0x00, 0x28, 0xf6, 0x87,
    0x2a, 0x00, 0x00, 0x00, 0x18, 0x49, 0x44, 0x41, 0x54, 0x28, 0xcf, 0x63, 0xf8, 0xcf, 0xc0, 0xf0,
    0x1f, 0x00, 0x05, 0x00, 0x01, 0xff, 0x89, 0x99, 0x3d, 0x1d, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
    0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
}

async function freshCsrf(): Promise<void> {
  const r = await api<{ csrfToken?: string }>("/api/csrf", "GET");
  if (r.json.csrfToken) csrf = r.json.csrfToken;
}

/**
 * Like `api`, but sends NO session cookie and never touches the shared jar.
 * Used to prove a route rejects an anonymous caller at the ROUTE boundary
 * (not merely inside the service layer).
 */
async function apiAnon(path: string, method = "GET", body?: unknown): Promise<{ status: number }> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (method !== "GET") headers["x-csrf-token"] = csrf;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: res.status };
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
  await Aud.deleteMany({ actorId: { $in: [new mongoose.Types.ObjectId(aId), new mongoose.Types.ObjectId(bId)] } });
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
      { actorId: new mongoose.Types.ObjectId(hDid) },
    ],
  });
  await Customer.deleteOne({ _id: new mongoose.Types.ObjectId(hDid) });
  await Sessions.deleteMany({ refId: new mongoose.Types.ObjectId(hDid) });

  /* --------------------------------------------------------------------- */
  /* 22) Hardening: route-level auth, output injection, rate buckets        */
  /* --------------------------------------------------------------------- */

  // Every data GET must reject an anonymous caller AT THE ROUTE, not rely on a
  // service-layer guard that a refactor could quietly remove. These four carry
  // customer PII and (for the export) per-customer dues.
  for (const p of [
    "/api/orders",
    "/api/customers",
    "/api/owner/reports",
    "/api/owner/reports/export?section=receipts",
  ]) {
    const anon = await apiAnon(p);
    check(`harden: anonymous ${p.split("?")[0]} → 401`, anon.status === 401, `got ${anon.status}`);
  }

  // Guard order: an anonymous caller must not be able to tell a valid
  // ?section= from an invalid one (that would leak the section list).
  const anonBadSection = await apiAnon("/api/owner/reports/export?section=bogus");
  check("harden: anonymous bad export section → 401 (not 400)", anonBadSection.status === 401, `got ${anonBadSection.status}`);

  // CSV formula injection: a customer NAME beginning with '=' is free text the
  // owner typed in, and the export is opened in Excel. It must be neutralised.
  const evilName = "=cmd|' /c calc'!A1";
  const evilMobile = "9" + String(testStart + 424241).padStart(10, "0").slice(-9);
  await freshCsrf();
  const evil = await api<{ customer?: { id: string } }>("/api/customers", "POST", { name: evilName, mobile: evilMobile, pin: "4444" });
  const evilId = evil.json.customer?.id ?? "";
  check("harden: formula-named customer created", evil.status === 201 && !!evilId, `got ${evil.status}`);

  const csvCustomers = await apiText("/api/owner/reports/export?preset=today&section=customers");
  check(
    "harden: CSV neutralises a leading '=' name",
    csvCustomers.status === 200 && !csvCustomers.text.includes(`,${evilName},`) && csvCustomers.text.includes(`'${evilName}`),
    `status ${csvCustomers.status}`,
  );
  // A normal name must be byte-identical to before the guard (no stray quotes).
  const csv2 = await apiText("/api/owner/reports/export?preset=today&section=customers");
  const csvLines = csv2.text.replace(/^\uFEFF/, "").split("\r\n");
  const evilLine = csvLines.find((l) => l.includes("cmd|' /c calc'")) ?? "";
  const normalLine = csvLines.find((l) => l.startsWith(`${customer.name},`) || l.includes(`"${customer.name}"`)) ?? "";
  check(
    "harden: CSV leaves an ordinary customer name unprefixed",
    normalLine !== "" && !normalLine.startsWith("'") && evilLine !== "" && evilLine.includes(`'${evilName}`),
    `normal=${normalLine.slice(0, 40)} evil=${evilLine.slice(0, 40)}`,
  );

  // Customer search must treat regex metacharacters literally: '.*' used to
  // match every customer (unescaped $regex). Now it can only match a literal.
  await freshCsrf();
  const allCust = await api<{ customers?: unknown[] }>("/api/customers", "GET");
  const dotSearch = await api<{ customers?: { name?: string }[] }>("/api/customers?q=.%2A");
  check(
    "harden: search '.*' is literal, not a match-everything regex",
    dotSearch.status === 200 && (dotSearch.json.customers?.length ?? 0) < (allCust.json.customers?.length ?? 0),
    `matched ${dotSearch.json.customers?.length} of ${allCust.json.customers?.length}`,
  );

  // Owner mutations are bucketed per area, so a busy screen cannot starve the
  // rest. Prove the keys are actually namespaced apart.
  await freshCsrf();
  const custProbe = await api<{ customer?: { id: string } }>("/api/customers", "POST", { name: "Bucket Probe", mobile: "9" + String(testStart + 515151).padStart(10, "0").slice(-9), pin: "5555" });
  check("harden: 'customers' area bucket is live", custProbe.status === 201, `got ${custProbe.status}`);

  // Logout must attribute the audit row to the person who actually signed out
  // (the old code recorded actorId: null), and must stay idempotent so that
  // signing out twice is a 200, not a 401.
  const ownerDoc = await Admin.findOne({ email: OWNER_EMAIL });
  const ownerId = String(ownerDoc?._id ?? "");
  await freshCsrf();
  const out1 = await api("/api/auth/logout", "POST", {});
  const logoutAud = await Aud.find({ action: "logout", createdAt: { $gte: new Date(testStart) } })
    .sort({ createdAt: -1 }).limit(1).toArray();
  check("logout: first sign-out → 200", out1.status === 200, `got ${out1.status}`);
  check(
    "logout: audit row carries the real owner actorId",
    logoutAud.length === 1 && String(logoutAud[0].actorId ?? "") === ownerId && logoutAud[0].actorKind === "owner",
    JSON.stringify({ actorId: String(logoutAud[0]?.actorId ?? ""), actorKind: logoutAud[0]?.actorKind, ownerId }),
  );

  await freshCsrf();
  const out2 = await api("/api/auth/logout", "POST", {});
  const logoutAud2 = await Aud.find({ action: "logout", createdAt: { $gte: new Date(testStart) } })
    .sort({ createdAt: -1 }).limit(1).toArray();
  check("logout: signing out again is idempotent → 200", out2.status === 200, `got ${out2.status}`);
  check(
    "logout: no-session sign-out is audited as a system actor, not a bogus id",
    logoutAud2.length === 1 && (logoutAud2[0].actorId ?? null) === null && logoutAud2[0].actorKind === "system",
    JSON.stringify({ actorId: logoutAud2[0]?.actorId, actorKind: logoutAud2[0]?.actorKind }),
  );

  // The portal is behind this session now, so prove the revoke really happened.
  const afterOut = await apiAnon("/api/orders");
  check("logout: session really revoked → 401 on a protected GET", afterOut.status === 401, `got ${afterOut.status}`);

  // Re-establish the owner session: the section above proved a sign-out revokes
  // it, and section 23 needs to be authenticated. This is the suite's last login
  // (9 of the 10-per-15-min bucket), so do not add another one after this point
  // without raising RATE_LIMITS.login — the suite will 429 at the next step.
  await login();

  // cleanup this section
  await Customer.deleteOne({ _id: new mongoose.Types.ObjectId(evilId) });
  await Customer.deleteOne({ _id: new mongoose.Types.ObjectId(custProbe.json.customer?.id ?? "") });
  // A genuine negative NUMBER must stay numeric, while TEXT that merely starts
  // with a dangerous character is still prefixed. (All live money fields are
  // >= 0, so this pins the serializer's contract directly.)
  const negCsv = toCsv(["n", "note"], [[-5, "-5"], [12, "=1+1"]]);
  const negLines = negCsv.replace(/^\uFEFF/, "").split("\r\n");
  check(
    "harden: CSV guard spares real numbers but still quotes a formula string",
    negLines[1] === "-5,'-5" && negLines[2] === "12,'=1+1",
    JSON.stringify(negLines.slice(1, 3)),
  );

  /* --------------------------------------------------------------------- */
  /* 23) UPI QR storage + soft cancel with a retained payment trail          */
  /* --------------------------------------------------------------------- */

  /* --- 23a. UPI ID validation --- */
  await freshCsrf();
  const badUpi = await api("/api/owner/settings", "PATCH", { upiId: "not-a-upi-id" });
  check("upi: a UPI id without '@' → 400", badUpi.status === 400, `got ${badUpi.status}`);

  const goodUpi = await api("/api/owner/settings", "PATCH", { upiId: "ganeshmill@okaxis" });
  check("upi: a well-formed UPI id is accepted", goodUpi.status === 200, `got ${goodUpi.status}`);

  // Regression: the format regex must not make the field write-once. "" is the
  // model's own default, so a strict regex would strand a UPI id the owner can
  // no longer take down.
  const clearUpi = await api("/api/owner/settings", "PATCH", { upiId: "   " });
  check("upi: the UPI id can be cleared with blank", clearUpi.status === 200, `got ${clearUpi.status}`);
  const blankUpiRow = await SettingsC.findOne({});
  check("upi: blank really did clear the stored UPI id", blankUpiRow?.upiId === "", `"${blankUpiRow?.upiId}"`);
  const restoreUpi = await api("/api/owner/settings", "PATCH", { upiId: "ganeshmill@okaxis" });
  check("upi: and can be set again afterwards", restoreUpi.status === 200, `got ${restoreUpi.status}`);

  /* --- 23b. QR upload: type allowlist, size cap, byte identity --- */
  /*
   * ISOLATION. This section writes to the SINGLE global settings document, so it
   * must never assume it starts empty: the owner may have a real bank QR
   * configured, and overwriting it would destroy their live payment details.
   * Snapshot the three fields this section touches, clear them, and put the
   * owner's originals back in the cleanup block at the end of the suite.
   */
  const ownerQRSnapshot = (await SettingsC.findOne({}))?.upiQr ?? null;
  const ownerMillNameSnapshot = (await SettingsC.findOne({}))?.millName;
  const ownerUpiIdSnapshot = (await SettingsC.findOne({}))?.upiId;
  await freshCsrf();
  await api("/api/owner/settings/upi-qr", "DELETE");
  if (ownerMillNameSnapshot !== undefined) {
    await api("/api/owner/settings", "PATCH", { millName: ownerMillNameSnapshot });
  }
  if (ownerUpiIdSnapshot !== undefined) {
    await api("/api/owner/settings", "PATCH", { upiId: ownerUpiIdSnapshot });
  }
  check(
    "upi: the section starts from a known-empty QR (owner's real one is snapshotted)",
    (await SettingsC.findOne({}))?.upiQr === null || (await SettingsC.findOne({}))?.upiQr === undefined,
    "QR still present after the reset",
  );

  const anonQrGet = await apiAnon("/api/owner/settings/upi-qr");
  check("upi: anonymous QR fetch → 401", anonQrGet.status === 401, `got ${anonQrGet.status}`);

  const svgUpload = await apiUpload("/api/owner/settings/upi-qr", "file", "qr.svg", "image/svg+xml", tinyPng());
  check(
    "upi: an SVG is refused (scriptable format, never a bank QR)",
    svgUpload.status === 400,
    `got ${svgUpload.status}`,
  );

  // Over the 1 MB cap. Never a valid PNG is fine — the size check runs first.
  const tooBig = await apiUpload(
    "/api/owner/settings/upi-qr",
    "file",
    "huge.png",
    "image/png",
    new Uint8Array(1024 * 1024 + 1),
  );
  check("upi: an image over 1 MB → 413", tooBig.status === 413, `got ${tooBig.status}`);

  const beforeOk = await SettingsC.findOne({ upiQr: { $ne: null } });
  check("upi: a rejected upload left no QR behind", !beforeOk, `found ${JSON.stringify(beforeOk?.upiQr)}`);

  // The real thing: a valid PNG, then prove the stored bytes are the SAME bytes.
  const png = tinyPng();
  const up = await apiUpload("/api/owner/settings/upi-qr", "file", "qr.png", "image/png", png);
  check("upi: a valid PNG uploads", up.status === 200, `got ${up.status}`);

  const settingsRow = (await SettingsC.findOne({})) as
    | (Record<string, unknown> & { upiQr?: { dataUrl?: string; contentType?: string } | null })
    | null;
  const qrStored = settingsRow?.upiQr ?? null;
  const dataUrl = qrStored?.dataUrl ?? "";
  check(
    "upi: the QR is stored as a data: URL with the original mime",
    dataUrl.startsWith("data:image/png;base64,") && qrStored?.contentType === "image/png",
    `${dataUrl.slice(0, 32)} / ${qrStored?.contentType}`,
  );

  // Byte identity is the whole promise of this feature: no sharp, no resize,
  // no re-encode. Compare the decoded bytes, not the base64 text.
  const storedBytes = new Uint8Array(Buffer.from(dataUrl.split(",")[1] ?? "", "base64"));
  check(
    "upi: stored bytes are byte-identical to the upload (no re-encode)",
    storedBytes.length === png.length && storedBytes.every((b, i) => b === png[i]),
    `stored ${storedBytes.length}B vs uploaded ${png.length}B`,
  );
  check("upi: upiId and the QR coexist on the same settings doc", settingsRow?.upiId === "ganeshmill@okaxis", `${settingsRow?.upiId}`);

  // And the owner-facing serve route hands back those exact bytes.
  const served = await apiText("/api/owner/settings/upi-qr");
  check("upi: owner QR route serves 200 + the png mime", served.status === 200 && served.contentType === "image/png", `${served.status} ${served.contentType}`);
  check(
    "upi: the served bytes match the upload exactly",
    served.bytes.length === png.length && served.bytes.every((b, i) => b === png[i]),
    `served ${served.bytes.length}B vs uploaded ${png.length}B`,
  );

  // Replacing the QR must swap the bytes, not accumulate them.
  const png2 = tinyPng();
  png2[30] = 0x00; // differ in the pixel data, same length
  const up2 = await apiUpload("/api/owner/settings/upi-qr", "file", "qr2.png", "image/png", png2);
  const served2 = await apiText("/api/owner/settings/upi-qr");
  check(
    "upi: re-uploading replaces the stored image",
    up2.status === 200 && served2.bytes.every((b, i) => b === png2[i]),
    `got ${up2.status}`,
  );

  /* --- 23b2. The CUSTOMER's save-a-copy link ----------------------------- */
  // A customer should be able to keep the QR on the device and open it from the
  // gallery later, so `/api/my/payment-qr?download=1` must hand back the same
  // bytes with a Content-Disposition filename — and must stay just as
  // authenticated as the inline preview.
  //
  // Uses a SELF-CONTAINED cookie jar: the shared `jar` is holding the owner
  // session and the suite is on its last owner login, so logging a customer in
  // through it would both evict the owner and burn a scarce login.
  const custJar = new Map<string, string>();
  const custFetch = async (path: string, init: RequestInit = {}) => {
    const res = await fetch(BASE + path, {
      ...init,
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        ...(custJar.size ? { cookie: [...custJar].map(([k, v]) => `${k}=${v}`).join("; ") } : {}),
      },
    });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const pair = c.split(";")[0];
      const eq = pair.indexOf("=");
      if (eq > 0) custJar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
    return res;
  };

  const dlAnon = await fetch(`${BASE}/api/my/payment-qr?download=1`);
  check("upi: anonymous QR download → 401", dlAnon.status === 401, `got ${dlAnon.status}`);

  // A customer of its own: section 20 created and then DELETED its test
  // customers, so the portal fixtures are gone by now and borrowing one of them
  // would be testing against a 404 account.
  await freshCsrf();
  const dlMobile = "8" + String(testStart + 424242).padStart(10, "0").slice(-9);
  const dlCust = await api<{ customer?: { id?: string } }>("/api/customers", "POST", {
    name: "QR Download Test",
    mobile: dlMobile,
    pin: "7777",
  });
  const dlCustId = dlCust.json.customer?.id ?? "";

  // The double-submit token is the one in the RESPONSE BODY; the cookie holds a
  // signed form of it, and echoing that back is a 403.
  const dlCsrfRes = await custFetch("/api/csrf");
  const dlCsrf = ((await dlCsrfRes.json()) as { csrfToken?: string }).csrfToken ?? "";
  const dlLogin = await custFetch("/api/auth/customer/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrf-token": dlCsrf },
    body: JSON.stringify({ mobile: dlMobile, pin: "7777" }),
  });
  check("upi: customer can log in for the download flow", dlLogin.status === 200, `got ${dlLogin.status}`);

  // Snapshot rather than hardcode: an earlier section owns the mill name, and
  // this test must not depend on what that section happened to set.
  const millNameNow = String((await SettingsC.findOne({}))?.millName ?? "mill");
  const expectedSlug =
    millNameNow.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/g, "") ||
    "mill";

  const dl = await custFetch("/api/my/payment-qr?download=1");
  const dlBytes = new Uint8Array(await dl.arrayBuffer());
  const disposition = dl.headers.get("content-disposition") ?? "";
  check(
    "upi: customer download serves the same bytes as the preview",
    dl.status === 200 &&
      dlBytes.length === png2.length &&
      dlBytes.every((b, i) => b === png2[i]),
    `${dl.status} ${dlBytes.length}B vs ${png2.length}B`,
  );
  check(
    "upi: the download is named from the mill + the real extension",
    disposition === `inline; filename="${expectedSlug}-upi-qr.png"`,
    disposition || "(no content-disposition)",
  );
  // The plain preview URL must NOT be an attachment, or the <img> would break.
  const prev = await custFetch("/api/my/payment-qr");
  check(
    "upi: the inline preview stays inline (no attachment disposition)",
    prev.status === 200 && !(prev.headers.get("content-disposition") ?? "").includes("attachment"),
    prev.headers.get("content-disposition") || "(none)",
  );
  // Header-injection guard: the mill name is user-typed, so it must be reduced
  // to [a-z0-9-] before it lands in a response header. The property under test is
  // "nothing can break out of the quoted filename" — NOT "the words of the input
  // must vanish", since a slug like `mi-ll-x-evil-1` is inert and expected.
  await api("/api/owner/settings", "PATCH", { millName: 'Mi"ll\r\nX-Evil: 1' });
  const evilDisp = (await custFetch("/api/my/payment-qr?download=1")).headers.get("content-disposition") ?? "";
  check(
    "upi: a hostile mill name cannot inject header syntax into the filename",
    !/[\r\n]/.test(evilDisp) &&
      /^inline; filename="[a-z0-9-]*-upi-qr\.(png|jpg|webp)"$/.test(evilDisp),
    evilDisp || "(none)",
  );
  // The name itself must not have been able to close the quote and add a header.
  check(
    "upi: a quote in the mill name cannot break out of the filename",
    evilDisp.split('"').length === 3,
    `${evilDisp.split('"').length - 1} quotes in the header`,
  );
  await api("/api/owner/settings", "PATCH", { millName: millNameNow });

  /* --- 23c. Soft cancel: history + payments survive, dues go to zero --- */
  // Snapshot the ledger first: the test customer has pre-existing orders, so the
  // meaningful claim is "the refund appears, and what they owe did not change".
  const ledgerOf = async () => {
    const r = await api<{ report?: { customers?: { id: string; refundPending: number; outstanding: number }[] } }>(
      "/api/owner/reports?preset=30d",
    );
    return (r.json.report?.customers ?? []).find((c) => c.id === customerId) ?? { refundPending: 0, outstanding: 0 };
  };
  const ledgerBefore = await ledgerOf();
  await freshCsrf();
  const toCancel = await api<{ order?: { id: string; orderId: number; totalCharges: number } }>("/api/orders", "POST", {
    customerId,
    grainType: "jowar",
    requiredSize: "coarse",
    weightKg: 20,
    ratePerKg: 10,
    advanceAmount: 100, // partially paid → must produce a refund due
    advanceMethod: "cash",
  });
  const cancelId = toCancel.json.order?.id; // document id — what the route takes
  const cancelNo = toCancel.json.order?.orderId;
  const cancelTotal = toCancel.json.order?.totalCharges;
  check(
    "cancel: test order created with a 100 advance",
    toCancel.status === 201 && cancelTotal === 200 && !!cancelId,
    `got ${toCancel.status} total ${cancelTotal} ${JSON.stringify(toCancel.json)}`,
  );

  const badReason = await api(`/api/orders/${cancelId}/cancel`, "POST", { reason: "x".repeat(500) });
  check("cancel: an over-long reason → 400", badReason.status === 400, `got ${badReason.status}`);

  await freshCsrf();
  const cancelled = await api<{ order?: { status: string; refundDue: number; outstanding: number; paidAmount: number; payments: unknown[] } }>(
    `/api/orders/${cancelId}/cancel`,
    "POST",
    { reason: "test cancel" },
  );
  check("cancel: a paid order cancels successfully", cancelled.status === 200, `got ${cancelled.status}`);
  check(
    "cancel: refundDue = what was paid, outstanding forced to 0",
    cancelled.json.order?.refundDue === 100 && cancelled.json.order?.outstanding === 0 && cancelled.json.order?.paidAmount === 100,
    JSON.stringify(cancelled.json.order),
  );
  check("cancel: the payment trail is retained, not erased", (cancelled.json.order?.payments?.length ?? 0) === 1, `${cancelled.json.order?.payments?.length} receipts`);

  const cancelDoc = await Order.findOne({ orderId: cancelNo });
  const hist = (cancelDoc?.statusHistory ?? []) as { status: string }[];
  check(
    "cancel: status=cancelled persisted and appended to statusHistory",
    cancelDoc?.status === "cancelled" && hist[hist.length - 1]?.status === "cancelled",
    `${cancelDoc?.status} / ${hist.map((h) => h.status).join(">")}`,
  );
  check("cancel: cancelledAt + reason persisted", !!cancelDoc?.cancelledAt && cancelDoc?.cancelReason === "test cancel", JSON.stringify({ at: !!cancelDoc?.cancelledAt, why: cancelDoc?.cancelReason }));

  const cancelNotif = await Notif.find({ customerId: customer._id, type: "orderCancelled" }).toArray();
  check("cancel: the customer is notified", cancelNotif.length === 1, `found ${cancelNotif.length}`);
  const cancelAud = await Aud.find({ action: "order.cancel" }).toArray();
  check("cancel: order.cancel is audited", cancelAud.length === 1, `found ${cancelAud.length}`);

  /* --- 23d. A cancelled order is terminal and inert --- */
  await freshCsrf();
  const dupe = await api(`/api/orders/${cancelId}/cancel`, "POST", { reason: "again" });
  check("cancel: cancelling twice is rejected", dupe.status >= 400, `got ${dupe.status}`);

  await freshCsrf();
  const payCancelled = await api(`/api/orders/${cancelId}/payment`, "POST", { amount: 10, method: "cash" });
  check("cancel: no further payment can be taken", payCancelled.status >= 400, `got ${payCancelled.status}`);

  await freshCsrf();
  const moveOn = await api(`/api/orders/${cancelId}/status`, "PATCH", { status: "processing" });
  check("cancel: it cannot be advanced back into the queue", moveOn.status >= 400, `got ${moveOn.status}`);

  const afterInert = await Order.findOne({ orderId: cancelNo });
  check(
    "cancel: the rejected calls changed nothing",
    afterInert?.status === "cancelled" && afterInert?.paidAmount === 100,
    `${afterInert?.status} paid ${afterInert?.paidAmount}`,
  );

  /* --- 23e. Cancelled is excluded from money owed, not from the books --- */
  const liveQueue = await api<{ orders?: { orderId: number; status: string }[] }>("/api/orders?excludeCollected=1");
  check(
    "queue: a cancelled order is out of the live queue",
    !(liveQueue.json.orders ?? []).some((o) => o.orderId === cancelNo),
    `queue has ${(liveQueue.json.orders ?? []).length}`,
  );

  const cancelledList = await api<{ orders?: { orderId: number; refundDue: number; payments: unknown[] }[] }>(
    "/api/orders?status=cancelled",
  );
  const cancelledRow = (cancelledList.json.orders ?? []).find((o) => o.orderId === cancelNo);
  check(
    "queue: the Cancelled tab still lists it, payments intact",
    !!cancelledRow && cancelledRow.refundDue === 100 && cancelledRow.payments.length === 1,
    JSON.stringify(cancelledRow),
  );

  const ledgerAfter = await ledgerOf();
  check(
    "reports: the refund lands in refundPending, not in outstanding",
    ledgerAfter.refundPending === ledgerBefore.refundPending + 100 &&
      ledgerAfter.outstanding === ledgerBefore.outstanding,
    `before ${JSON.stringify(ledgerBefore)} after ${JSON.stringify(ledgerAfter)}`,
  );

  // A collected order has nothing left to cancel.
  const collected = await Order.findOne({ status: "collected", customerId: customer._id } as never);
  if (collected) {
    const noCancel = await api(`/api/orders/${String(collected._id)}/cancel`, "POST", {});
    check("cancel: a collected order cannot be cancelled", noCancel.status >= 400, `got ${noCancel.status}`);
  }

  /* --- 23f. Removing the QR is idempotent --- */
  await freshCsrf();
  const del1 = await api("/api/owner/settings/upi-qr", "DELETE");
  const del2 = await api("/api/owner/settings/upi-qr", "DELETE");
  const gone = await apiText("/api/owner/settings/upi-qr");
  check("upi: delete clears the QR, and is idempotent", del1.status === 200 && del2.status === 200 && gone.status === 404, `${del1.status}/${del2.status}/then ${gone.status}`);
  const clearedRow = await SettingsC.findOne({});
  check("upi: the data URL is gone from the document", !clearedRow?.upiQr, JSON.stringify(clearedRow?.upiQr));

  /* --- 23g. Put the owner's own payment details back --------------------- */
  // The delete test above necessarily leaves the mill with NO QR, which is
  // correct for the test but wrong for a real owner. Restore exactly what was
  // there before this section started, byte for byte, straight to the model —
  // not through the upload route, which would re-encode nothing but would also
  // log a misleading "uploaded by owner" audit row.
  if (ownerQRSnapshot) {
    await SettingsC.updateOne({}, { $set: { upiQr: ownerQRSnapshot } });
  }
  if (ownerMillNameSnapshot !== undefined) {
    await SettingsC.updateOne({}, { $set: { millName: ownerMillNameSnapshot } });
  }
  if (ownerUpiIdSnapshot !== undefined) {
    await SettingsC.updateOne({}, { $set: { upiId: ownerUpiIdSnapshot } });
  }
  const restoredRow = await SettingsC.findOne({});
  check(
    "upi: the owner's own QR is restored byte-for-byte after the section",
    !ownerQRSnapshot
      ? !restoredRow?.upiQr
      : String(restoredRow?.upiQr?.dataUrl ?? "") === String(ownerQRSnapshot.dataUrl ?? ""),
    ownerQRSnapshot ? `restored ${String(restoredRow?.upiQr?.dataUrl ?? "").length} chars` : "no QR to restore",
  );

  /* --- 24. Installable customer app: the web app manifest ------------------ */
  // Read-only section (GETs only), so it needs no cleanup and touches no DB.
  //
  // A manifest pointing at a missing or wrong-sized icon is the classic reason a
  // browser silently never offers "Install app" — no error, the prompt just
  // never appears. So every declared icon is fetched and its REAL pixel
  // dimensions parsed, rather than trusting the declared `sizes` string.
  const manifestGet = await fetch(`${BASE}/manifest.webmanifest`, {
    headers: { accept: "application/manifest+json" },
  });
  const manifestType = manifestGet.headers.get("content-type") ?? "";
  const manifestText = await manifestGet.text();

  // Fetched with NO session cookie on purpose. The browser asks for the manifest
  // before the customer has necessarily signed in, so gating it behind a session
  // would break installation with no visible symptom.
  check("pwa: the manifest is public (no session cookie needed)", manifestGet.status === 200, `got ${manifestGet.status}`);
  check("pwa: served as application/manifest+json", /application\/manifest\+json/.test(manifestType), manifestType);

  type ManifestIcon = { src: string; sizes: string; type: string; purpose?: string };
  let mf: {
    name?: string; short_name?: string; start_url?: string; scope?: string;
    display?: string; theme_color?: string; background_color?: string; icons?: ManifestIcon[];
  } = {};
  try {
    mf = JSON.parse(manifestText);
  } catch {
    /* left as {} so the assertions below report the real failure */
  }

  check("pwa: parses as JSON and names the app", !!mf.name && !!mf.short_name, JSON.stringify({ name: mf.name, short_name: mf.short_name }));
  check("pwa: short_name fits Android's ~12-char label budget", (mf.short_name ?? "").length <= 12, `"${mf.short_name}" = ${(mf.short_name ?? "").length} chars`);
  check("pwa: opens the customer portal, scoped to /my", mf.start_url === "/my" && mf.scope === "/my", `start_url=${mf.start_url} scope=${mf.scope}`);
  check("pwa: standalone display hides browser chrome", mf.display === "standalone", String(mf.display));
  check("pwa: theme + background colours are set", !!mf.theme_color && !!mf.background_color, `${mf.theme_color} / ${mf.background_color}`);

  // Chromium wants a 192 and a 512; maskable is what survives Android's mask.
  const declaredSizes = (mf.icons ?? []).map((i) => i.sizes);
  check("pwa: declares the 192x192 and 512x512 icons Chromium requires", declaredSizes.includes("192x192") && declaredSizes.includes("512x512"), declaredSizes.join(", ") || "none");
  check("pwa: declares a maskable icon for Android's adaptive mask", (mf.icons ?? []).some((i) => i.purpose === "maskable"), JSON.stringify((mf.icons ?? []).map((i) => i.purpose)));

  /** PNG width/height live in the IHDR chunk at bytes 16..23, big-endian. */
  function pngSize(bytes: Uint8Array): { w: number; h: number; png: boolean } {
    const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (bytes.length < 24 || !SIG.every((b, i) => bytes[i] === b)) return { w: 0, h: 0, png: false };
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { w: view.getUint32(16), h: view.getUint32(20), png: true };
  }

  for (const icon of mf.icons ?? []) {
    const res = await fetch(`${BASE}${icon.src}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    const dim = pngSize(bytes);
    const want = icon.sizes.split("x").map(Number);
    check(
      `pwa: ${icon.src} exists and really is ${icon.sizes}`,
      res.status === 200 && dim.png && dim.w === want[0] && dim.h === want[1] &&
        (res.headers.get("content-type") ?? "").includes("image/png"),
      `${res.status} ${res.headers.get("content-type")} ${dim.w}x${dim.h}, ${bytes.length} bytes`,
    );
  }

  // A manifest nobody links is invisible to the browser, so confirm the document
  // actually references it — this is what the framework emits for app/manifest.ts.
  const loginHtml = await (await fetch(`${BASE}/my/login`)).text();
  check("pwa: the portal links the manifest", /rel="manifest"/.test(loginHtml), /rel="manifest"/.test(loginHtml) ? "" : "no rel=\"manifest\" in /my/login HTML");
  check("pwa: the apple-touch-icon is declared (iOS home screen)", /apple-touch-icon/.test(loginHtml), /apple-touch-icon/.test(loginHtml) ? "" : "no apple-touch-icon in /my/login HTML");

  /* --- 25. Payment reminders (उधारी आठवण) + order details page ------------ */
  // Fresh owner session: earlier sections deliberately log out / rotate it.
  await login();

  // An order that certainly carries a balance: 10 kg × ₹5 = ₹50, nothing paid.
  await freshCsrf();
  const remOrder = await api<{ order?: { id: string; orderId: number } }>("/api/orders", "POST", {
    customerId, grainType: "jowar", requiredSize: "fine", weightKg: 10, ratePerKg: 5,
  });
  const remNo = remOrder.json.order?.orderId;
  check("remind: setup order created", remOrder.status === 201 && !!remNo, `got ${remOrder.status}`);

  // Real reminders this customer already got inside the cooldown window would
  // make the first send a (correct) skip. Park them and put them back after.
  const cooldownMs = 6 * 60 * 60 * 1000;
  const parkedReminders = await Notif.find({
    customerId: customer._id, type: "paymentReminder", sentAt: { $gte: new Date(Date.now() - cooldownMs) },
  }).toArray();
  if (parkedReminders.length) await Notif.deleteMany({ _id: { $in: parkedReminders.map((d) => d._id) } });

  const anonRem = await apiAnon("/api/owner/notifications/reminders", "POST", { customerIds: [customerId] });
  check("remind: anonymous caller is refused", anonRem.status === 401 || anonRem.status === 403, `got ${anonRem.status}`);

  await freshCsrf();
  const badRem = await api("/api/owner/notifications/reminders", "POST", { customerIds: ["not-an-id"] });
  check("remind: malformed customer id → 400", badRem.status === 400, `got ${badRem.status}`);

  type RemRes = { sent: number; skippedRecent: number; skippedNoDue: number; disabled: boolean };
  await freshCsrf();
  const rem1 = await api<RemRes>("/api/owner/notifications/reminders", "POST", { customerIds: [customerId] });
  check("remind: targeted send → 200, sent=1", rem1.status === 200 && rem1.json.sent === 1, JSON.stringify(rem1.json));

  // The amount must be the server's own figure: Σ outstanding of live orders.
  const liveOrders = await Order.find({ customerId: customer._id, status: { $ne: "cancelled" } }).toArray();
  const expectedDue = Math.round(
    liveOrders.reduce((sum, o) => sum + Math.max(0, Number(o.totalCharges) - Number(o.paidAmount)), 0) * 100,
  ) / 100;
  const remRows = await Notif.find({ customerId: customer._id, type: "paymentReminder", sentAt: { $gte: new Date(testStart) } }).toArray();
  const remMsg = String(remRows[0]?.message ?? "");
  check("remind: exactly one private reminder row for that customer", remRows.length === 1, `rows=${remRows.length}`);
  check("remind: message carries the customer's real total", remMsg.includes(`₹${expectedDue.toLocaleString("en-IN")}`), `${remMsg} (expected ₹${expectedDue})`);
  check("remind: message names the owing order number", remMsg.includes(`#${remNo}`), remMsg);

  await freshCsrf();
  const rem2 = await api<RemRes>("/api/owner/notifications/reminders", "POST", { customerIds: [customerId] });
  const remRows2 = await Notif.countDocuments({ customerId: customer._id, type: "paymentReminder", sentAt: { $gte: new Date(testStart) } });
  check("remind: immediate repeat is skipped (cooldown), no duplicate row", rem2.json.sent === 0 && rem2.json.skippedRecent === 1 && remRows2 === 1, JSON.stringify(rem2.json));

  await freshCsrf();
  const noDueId = new mongoose.Types.ObjectId().toString();
  const rem3 = await api<RemRes>("/api/owner/notifications/reminders", "POST", { customerIds: [noDueId] });
  check("remind: unknown / no-due customer is skipped, nothing sent", rem3.status === 200 && rem3.json.sent === 0 && rem3.json.skippedNoDue === 1, JSON.stringify(rem3.json));

  await new Promise((r) => setTimeout(r, 400)); // audit() is fire-and-forget
  const remAudit = await Aud.countDocuments({ action: "notifications.paymentReminder", createdAt: { $gte: new Date(testStart) } });
  check("remind: every send is audited", remAudit >= 3, `audits=${remAudit}`);

  // Order details page, addressed by order number.
  const detail = await apiText(`/owner/orders/${remNo}`);
  check("details: owner gets the page", detail.status === 200 && detail.text.includes(String(customer.name)), `got ${detail.status}`);
  const missing = await apiText(`/owner/orders/99999999`);
  check("details: unknown order number → 404", missing.status === 404, `got ${missing.status}`);
  const anonDetail = await fetch(`${BASE}/owner/orders/${remNo}`, { redirect: "manual" });
  check("details: anonymous visitor is sent to log in", anonDetail.status >= 300 && anonDetail.status < 400, `got ${anonDetail.status}`);

  if (remNo) await Order.deleteOne({ orderId: remNo });
  await Aud.deleteMany({ "meta.orderId": remNo });
  await Aud.deleteMany({ action: "notifications.paymentReminder", createdAt: { $gte: new Date(testStart) } });
  await Notif.deleteMany({ customerId: customer._id, type: "paymentReminder", sentAt: { $gte: new Date(testStart) } });
  if (parkedReminders.length) await Notif.insertMany(parkedReminders);

  await Aud.deleteMany({ createdAt: { $gte: new Date(testStart) }, action: { $in: ["customer.create", "logout"] } });
  /* ---------- cleanup: remove every trace the test created ---------- */
  // The customer minted for the QR-download checks.
  if (dlCustId) {
    const dlOid = new mongoose.Types.ObjectId(dlCustId);
    await Sessions.deleteMany({ refId: dlOid });
    await Notif.deleteMany({ customerId: dlOid });
    await Aud.deleteMany({ actorId: dlOid });
    await Aud.deleteMany({ "meta.customerId": dlOid });
    await Customer.deleteOne({ _id: dlOid });
  }
  await Order.deleteOne({ orderId });
  // section 23's cancelled order (and its notification/audit rows below)
  if (cancelNo) await Order.deleteOne({ orderId: cancelNo });
  await Notif.deleteMany({ customerId: customer._id, sentAt: { $gte: new Date(testStart) } });
  await Aud.deleteMany({ "meta.orderId": orderId });
  await Aud.deleteMany({ action: { $in: ["order.cancel", "settings.upiQr.upload", "settings.upiQr.remove"] } });
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