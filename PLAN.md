# Flour Mill Management — Master Plan

> Living document. Updated as the build progresses. See `CHANGELOG.md` for the step-by-step history.

## Status: **v0.11.0 — every module in the owner IA is built and live**

Payments, Outstanding, Notifications, Reports, Settings and the customer portal
(`/my`) are all real, DB-backed features. Nothing renders "coming soon" any more.

## Navigation (owner side, Option A IA)
Dashboard (home: stats + quick actions) + persistent sidebar: Dashboard · Customers · New Order ·
Queue · Payments · Outstanding · Notifications · Reports · Settings. All of these are implemented.

## Ops: standard workflow

- Database: **user-space MongoDB** at `~/mongodb` (no Docker, no root). Port 27017.
- Start/stop DB: `npm run mongo` / `npm run mongo:stop`
- Dev server: `npm run dev`
- Seed owner: `npm run seed` (idempotent)
- **Convention**: after opencode/assistant verifies a build, ALL processes are stopped —
  the user runs `npm run mongo` then `npm run dev` themselves.

## 1. Business (from client requirement doc)

Feed/Flour Mill does **customer-owned-grain milling service**:
- Customer brings own grain (मका/wheat/other), weighed in KG, milled to required size
- Milling charges per KG, partial payments + credit (उधारी) common
- Main pain: phone-tag for "is my flour ready?", no visibility of pending/processing/completed
- Requirement doc saved as `requirements.txt` content: orders, 2 sides (admin + customer), payments/outstanding, notifications, isolation of customer data

## 2. Locked decisions

| Area | Decision |
|---|---|
| Stack | Next.js (App Router, TypeScript) full-stack + MongoDB (Mongoose) |
| Admin | **Single super-admin/owner**, email+password+**2FA/totp**, Argon2id, httpOnly session cookie |
| Customer accounts | **Admin creates every customer account** (name + mobile). No self-registration. |
| Customer login | **Mobile + 4-digit PIN**. Admin sets temp PIN → forced change on first login. No SMS-OTP needed for login. |
| Milling rate | Default rates per grain/size + **per-order override** |
| Language | **Marathi ⇄ English toggle**, persistent, corner switch + in Settings |
| Payments | Paid / Partial / Credit. Outstanding auto-calc = Σ(totalCharges) − Σ(payments) per customer. |
| Delivery vs pickup | Pickup by customer (order status → Collected). No delivery module. |
| Tokens | No physical token; auto internal `orderId`. |
| Order cancellation | **Soft cancel.** Nothing is ever deleted. A paid order can be cancelled: `outstanding` → 0 and the collected amount is shown as an informational `refundDue` (returning cash stays manual). `collected` orders cannot be cancelled. Shown in a Cancelled tab inside Queue. |
| UPI payment | One mill-wide **QR image + UPI ID** in Settings, shown to every customer in a pay panel opened from their due card. Stored and served **verbatim** — no resize, no re-encode. |
| Notifications | In-app tray (day-1) → Web Push (PWA) → SMS (MSG91) → WhatsApp (Meta). Same `notify()` service. |
| Customer isolation | **Hard IDOR rule**: every customer route verifies ownership server-side. |

## 3. Architecture

```
Next.js (App Router, TS) full-stack  ← proxy.ts is the route guard (src/proxy.ts)
├── src/app/
│   ├── page.tsx        → landing (both logins)
│   ├── login/          → owner login page + form
│   ├── my/login/       → customer PIN login page + form
│   ├── my/             → customer dashboard ("माझा माल")
│   ├── owner/          → admin dashboard (modules land next)
│   └── api/            → route handlers: health, csrf, auth/*, ...
├── src/lib/            → env, db, cookies, csrf, crypto, errors, http, rate-limit, audit, i18n, validation, client
├── src/models/         → Admin, Customer, Session, Order, Payment, Notification, AuditLog
├── src/services/       → authService, notificationService (order/payment land next)
├── src/proxy.ts        → optimistic route guard (cookie checks)
└── scripts/            → seed-admin.mjs (create owner)
```

## 4. Data model

```
Admin      { name, email(unique), passwordHash(argon2), totpSecret, totpEnabled }
Customer   { name, mobile(unique), pinHash(argon2), mustChangePin, active,
             lang("mr"|"en"), createdAt }
Order      { orderId(auto int, unique), customerId, grainType, weightKg, requiredSize,
             ratePerKg, totalCharges(auto), status[pending|processing|completed|collected],
             paidAmount, createdAt, updatedAt }
Payment    { orderId, customerId, amount, method[upi|cash|settlement], note, paidAt, createdBy }
Notification { customerId?, type[entry|processing|completed|collected|paymentReceived|paymentDue],
             message(localized), channels[], sentAt, readAt }
AuditLog   { adminId, action, meta, ip, ua, createdAt }
```

## 5. Order lifecycle & money

- Status flow: `pending → processing → completed → collected`
- Completed triggers customer notification ("तुमचा माल दळून तयार आहे. कृपया घेऊन जा.")
- Outstanding per customer = Σ order.totalCharges − Σ payments (per order & overall views)
- Payment received updates order.paidAmount & fires paymentReceived notification

## 6. Security checklist

- [x] Argon2id password/PIN hashing
- [x] Owner + customer httpOnly session cookies (Secure/SameSite=Lax; `__Host-` prefix in prod)
- [ ] Owner TOTP 2FA (otplib/qrcode installed; wiring next)
- [x] Customer PIN login — rate limited per mobile + IP
- [x] CSRF double-submit on state-changing routes
- [x] Zod validation on login inputs (all mutations land with the modules)
- [x] IDOR guard: ownership check on ALL customer routes (403) — DAL guard in `customerService` (owner) + `requireSession`; auth module proven here, orders/payments reuse the pattern
- [x] Rate limiting login (in-memory sliding window; Redis swap ready)
- [x] Security headers + CSP + HSTS (next.config.ts) — helmet not used (App Router native)
- [x] Audit log: logins (success/fail) recorded; orders/payments next
- [x] Secrets in `.env.local` (ignored) + `.env.example` committed
- [x] Proxy (middleware) optimistic guard + DB-backed DAL checks in route/service layer

## 7. Screens

Owner: Login · Dashboard (stubs for Customers/New Order/Queue/Payments/Outstanding/Notifications/Reports/Settings)
Customer: PIN login · Dashboard (outstanding + must-change-PIN banner) · Order/Payment history land next

## 8. Notification roadmap

1. In-app tray (day 1) — entry, processing, completed, paymentReceived, paymentDue
2. Web Push (free) — needs a PWA service worker. The manifest/icons half is
   already live (`0.12.0`); a service worker is deliberately NOT shipped yet, so
   nothing authenticated is cached on a shared phone. Add it with this step.
3. SMS (MSG91) — needs DLT/sender-ID (~1-2 days approval)
4. WhatsApp (Meta Cloud API / WATI) — templates required

## 9. Tech dependencies

`next` · `react` · `typescript` · `mongoose` · `argon2` · `zod` · `jose` · `otplib` · `qrcode` · `helmet`(if express route) · `express-rate-limit`(if express) · `cookie` · `sharp`(already vendored by Next — used by `npm run icons`)

PWA: the app is already installable via `app/manifest.ts` + `public/icons/*`
(shipped `0.12.0`). No `next-pwa` wrapper — installability needs only a valid
manifest and HTTPS, and a service worker is deliberately deferred to the web-push
step so authenticated content is never cached on a shared phone.

## 10. Build order (done so far marked)

- [x] PLAN.md + CHANGELOG.md created
- [x] Next.js + TS scaffold (16.3.5 — proxy.ts, async cookies noted)
- [x] Deps installed (mongoose, argon2, zod, otplib, qrcode, cookie)
- [x] env config (`lib/env.ts`, `.env.example`) + folder structure
- [x] Data models (Admin, Customer, Session, Order, Payment, Notification, AuditLog)
- [x] DB connection + `/api/health`
- [x] Auth core (owner email/pass + customer PIN, DB-backed sessions, CSRF, rate-limit, audit) + login pages + dashboards + seed script
- [x] Owner: customers CRUD (search, create w/ temp PIN, edit, PIN reset, activate/deactivate, session revoke)
- [x] Owner shell: dashboard home + persistent sidebar navigation (Option A IA)
- [x] Owner: new order + queue + status flow + notifications trigger
- [ ] Payments / partial / credit / outstanding
- [ ] Customer dashboard (bilingual, forced PIN change)
- [ ] Security test suite (isolation matrix, cookie flags, rate-limit, CSRF)
- [ ] Reports
- [ ] PWA installable + web push
- [ ] Owner TOTP 2FA
- [ ] Phase 2: MSG91 SMS, WhatsApp