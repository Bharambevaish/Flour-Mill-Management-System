# Goal
Deliver the owner-side **payments module** (manual only — no UPI/PG integration,
just रोख cash / UPI with a typed transaction ID): an advance at order intake, a
Payments hub to record receipts on any order (including already-collected ones
settling their उधारी), an Outstanding/उधारी view, and dashboard shortcuts — all
DB-persisted in ONE atomic write and in sync across every tab. Keep the
automated DB round-trip test green (user: "keep making tests"). Since then:
owner Reports hub with CSV/print export and a printable customer पावती.

# Completed (all verified: lint clean, `next build` clean, DB round-trip test green (user: "keep making tests"))
- **Reports hub + CSV/PDF export + printable पावती** (`0.9.0`): `/owner/reports`
  (was Coming Soon) shows a range-scoped business summary (orders, kg, charges,
  collected, dues on new orders), grain breakdown, cash-vs-UPI split + UPI txn
  list, customer dues ledger and the period's receipts. Range picker
  `today|7d|30d|custom` (URL-driven, server re-runs). `GET /api/owner/reports`
  (JSON) + `GET /api/owner/reports/export?section=receipts|grain|customers|summary`
  (UTF-8 BOM CSV via new `src/lib/csv.ts`; unknown section → 400). Shared
  `PrintButton` + global `@media print` rules (`.no-print` hides sidebar/mobile
  nav/theme switch/toolbars) → browser Save-as-PDF. New `/print/receipt/[orderId]`
  (outside `/owner`, `requirePageSession`-guarded): mill profile + order line +
  payments + totals + signature line. Payments/Outstanding lists gained a
  CSV/Print toolbar and a per-row पावती link. Time semantics: activity/grain/
  collections scoped by range (money keyed by `payments[].recordedAt`), dues
  ledger is a current snapshot. `orderService.getOrder(id)` exported +
  `getOrderByNumber(n)`. Payments flow now takes `lang` from the server page
  (dropped `document.cookie` useLang → hydration-safe).
- **Session-expiry UX + session hardening** (`0.8.1`): any 401 `UNAUTHORIZED`
  on a protected endpoint while the user is inside `/owner` or `/my` now
  redirects (once) to the login page with the bilingual "session expired —
  please log in again" banner (`apiFetch` in `src/lib/http/client.ts`,
  `LoginAlert` component) — no more scattered inline errors/raw browser errors.
  Login forms show a friendly "too many attempts, try again in ~X min" instead
  of a bare 429 line. Cookie name + Secure flag now derive from one rule
  (  `AUTH_COOKIE_SECURE`; default = Secure only in prod-over-HTTPS), so
  switching `next dev` ↔ `next start` on http://localhost does NOT change the
  cookie name and never looks like a sign-out. Root cause of the recurring
  "session expired AT the owner login": a revoked session left a stale httpOnly
  `fm_owner` cookie in the browser, and `proxy.ts` bounced every `/login`
  (cookie present) back to `/owner`, which failed the DB check and redirected to
  `/login?error=session_expired` again — an endless banner loop (owner only;
  `/my/login` was exempt). Fixed three ways: proxy no longer bounces a login
  page carrying `?error=…`; `apiFetch` + `LoginAlert` expire the stale auth
  cookies client-side (httpOnly cookies can be evicted by a same name/path
  expired Set-Cookie); `LoginAlert` first checks `/api/auth/me` and, if the
  session is actually valid, sends the user in instead of logging them out.
  Ops notes: (1) don't run `next build` while the dev server is up — both write
  `.next`, dev can crash with an error overlay; (2) `npm test` exhausts the
  login rate bucket (10/15min/IP) — restart dev afterwards to clear it and warn
  the owner; (3) enabling 2FA / changing password (`revokeOtherSessions`) kills
  the live session by design — expect a session_expired redirect.
- **Since 0.5.0 (payments, below)**:
  - **Settings + owner TOTP 2FA** (`0.6.0`): SettingsPanel fully wired (mill
    profile, rates, notifications prefs, security tab with show/hide eye
    toggles), change-password fixed to use `PATCH` (was silently POST→405),
    TOTP lifecycle (setup→verify→enable→login `needTotp`→disable) + auth
    `requirePageSession` redirects to `/login?error=session_expired` instead of
    raw 500s + root error boundary. Hydration bug fixed: sidebar/toggle now get
    `lang` server-side from `getLang()` (no `document.cookie` in client
    initializers); SSR verified mr/en per cookie.
  - **Owner → customer broadcast** (`0.7.0`): Notifications page (was Coming
    Soon) is a compose tab — message + mr/en toggle + live active-customer
    count + recent-broadcast history. `NotificationType` gained `broadcast`;
    `broadcastToActiveCustomers()` fans one in-app row per ACTIVE customer
    (batch insertMany, honours the master in-app settings switch);
    `POST /api/owner/notifications/broadcast` (zod, CSRF, rate-limited, audit
    `notifications.broadcast`). Demo seed fans out a bilingual broadcast so the
    tab has history. No WhatsApp/SMS — in-app only (channels stubbed for later).
  - **Multi-line order intake** (`0.8.0`): New Order form is a line-item editor —
    one customer + up to 20 grain bags, one submit creates N orders with
    consecutive orderIds (`nextOrderIds` = single counter bump) via
    `createOrders()` (one `insertMany`). Shared intake advance auto-allocated
    across lines IN ORDER (fills line 1's balance, spills remainder onward), so
    every order's receipt is honest (`paidAmount = Σ its receipts` per line).
    `POST /api/orders` accepts `{ customerId, items[], advanceAmount }`; legacy
    single-line payload still works (round-trip reruns the old sections
    unchanged). Form now takes `initialLang` server-side (hydration-safe —
    dropped its old `document.cookie` useLang).
  - **Test/ops**: `npm test` now 75/75 self-cleaning. Careful notes: dev-server
    restarts clear the in-memory login rate-limit buckets; the owner's DB state
    must start a test run with 2FA OFF (the harness owns the 2FA lifecycle);
    owner password is `spartan1234` (matches `.env.local` OWNER_PASSWORD);
    `createTotpSetup` only stores the secret — `confirmTotpSetup` enables.
- **Model** (`Order.ts`): `PaymentMethod` (`cash|upi`), `PaymentEntry`
  (amount / method / upiTxnId / recordedAt), embedded `payments[]`. `paidAmount`
  stays the cached running total. **Advance on intake** (createOrder): optional
  cash/UPI via `advanceAmount` — validated ≤ totalCharges, zod-refined
  (upi ⇒ upiTxnId required), persisted atomically as payments[0] (DB row
  verified: paid=30 total=96 with 1 receipt after create).
- **Service** (`orderService.ts`): `recordPayment(orderId, …)` — works on ANY
  status incl. already-collected; add-only receipts; `paidAmount = Σ payments`
  invariant checked in test; over-payment 400 & UPI-without-txn 400 (test-polled:
  both rejected with doc untouched, and the over-pay case does NOT burn an
  orderId). `transitionOrder` now takes an optional inline `payment` so status +
  receipt + balance is one `doc.save()` (test asserts a single transition write
  keeps paid + payments consistent). Full settlement on any path → bilingual
  `paymentReceived` notification (existing type, no enum/i18n change).
- **API**: `POST /api/orders` accepts `advanceAmount/advanceMethod/advanceUpiTxnId`;
  `PATCH /api/orders/[id]/status` accepts nested `payment`; **new**
  `PATCH /api/orders/[id]/payment` (recordPayment) — all zod-validated,
  CSRF+rate-limited, audit `order.payment.record` (test asserts audit + cleanup).
- **UI**: shared `PaymentEntry` (amount+method toggle+conditional UPI id) used by
  the new-order form, `OrderActionModal` (record payment during a step AND
  standalone through the new modal) via a new `PaymentsHubPanel` + new
  `/owner/payments` (was Coming Soon) and `/owner/outstanding` pages; payments
  history per order with receipts; `?customer=` filter + "auto-open if exactly
  one due" (used by the dashboard chip). Dashboard उधारी chips now `Link` to
  `/owner/payments?customer=<id>` instead of being a static badge.
- **Demo seed** (`demoSeedService.ts`): writes matching `payments[]` for every
  scenario so seeded rows show the receipt trail; normalizes `paidAmount` per
  scenario. Idempotent + increments the counter (demo-reseed test 💥 fixed — it
  now re-syncs the counter instead of chaining into new orderIds).
- **Tests** (`scripts/test-db-roundtrip.ts`, self-cleaning, restores DB): covers
  advance-on-create, UPI validation, over-pay rejection + no counter burn,
  recordPayment on pending/processing AND on already-collected, full-payment
  notification, single-write invariant, audit trail, cleanup, and section 19
  reports (range aggregation + BOM'd CSV export + unknown-section 400).
  **75 assertions, all passing** against the live stack (leaf-verified for both
  login flows).
- **CHANGELOG**: new `[0.5.0]` section (Payments module: receipts + उधारी hub).

# Blocked
- None. (Note: original `payments/page.tsx` was auto-conflicted — resolved with
  chip-customer win.)

# Next Move
None pending — reports feature verified end-to-end (75/75). Remaining plan
(when asked): customer notifications **inbox** UI (`markNotificationRead` exists,
no API/UI yet), PWA/web push, broadcast SMS/WhatsApp phase 2.

# Relevant Files
- `src/services/reportService.ts` (`resolveRange`, `getReportSummary`),
  `src/lib/csv.ts` (`toCsv`/`downloadCsv`), `src/app/api/owner/reports/route.ts`,
  `src/app/api/owner/reports/export/route.ts`
- `src/app/owner/reports/page.tsx` + `src/components/owner/reports/*`
  (`ReportRangePicker`, `ReportActions`, `ReportsSummary`)
- `src/app/print/receipt/[id]/page.tsx` (printable पावती, `requirePageSession`),
  `src/components/common/PrintButton.tsx`, `src/app/globals.css` (`@media print`)
- `src/models/Notification.ts` (`broadcast` type), `src/lib/i18n/validation.ts`
  (`broadcastNotificationSchema`)
- `src/services/notificationService.ts` — `broadcastToActiveCustomers` +
  `markNotificationRead` (unwired)
- `src/app/api/owner/notifications/broadcast/route.ts` (new),
  `src/components/owner/notifications/NotificationsComposer.tsx`,
  `src/app/owner/notifications/page.tsx`, `src/services/demoSeedService.ts`
- `src/models/Order.ts` — PaymentMethod/PaymentEntry types + `payments[]`
- `src/lib/validation.ts` — recordPayment/createOrder/transition zod schemas
- `src/services/orderService.ts` — recordPayment, advance-on-create, single-write
  transition, OrderView.payments, `getOrder(id)`/`getOrderByNumber(n)`
- `src/components/owner/payments/PaymentsPanel.tsx` — CSV/Print toolbar +
  per-row पावती link, `lang` prop (hydration-safe); `PaymentModal`/`PaymentEntry`
  take `lang` too
- `src/app/api/orders/[id]/payment/route.ts` (new) + `src/app/api/orders/route.ts`
  + `src/app/api/orders/[id]/status/route.ts` — API layer
- `src/components/owner/PaymentEntry.tsx`, `src/app/owner/payments/page.tsx`,
  `src/app/owner/outstanding/page.tsx`, `src/components/owner/PaymentsHubPanel.tsx`,
  `src/app/owner/queue/OrderActionModal.tsx` (`next enum` mutated), 
  `src/app/owner/CustomerStatusGrid.tsx` (chip→link), `NewOrderForm.tsx`
- `src/services/demoSeedService.ts` — seeded `payments[]`
- `scripts/test-db-roundtrip.ts`, `src/lib/http.ts`/`audit.ts`/`notify.ts`
- `CHANGELOG.md` ([0.5.0])
