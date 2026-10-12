# Goal
Deliver the owner-side **payments module** (manual only — no UPI/PG integration,
just रोख cash / UPI with a typed transaction ID): an advance at order intake, a
Payments hub to record receipts on any order (including already-collected ones
settling their उधारी), an Outstanding/उधारी view, and dashboard shortcuts — all
DB-persisted in ONE atomic write and in sync across every tab. Keep the
automated DB round-trip test green (user: "keep making tests"). Since then:
owner Reports hub with CSV/print export and a printable customer पावती, then a
**secure read-only customer portal** (order tracking + payment statuses +
notifications inbox, owner targeted/all-customer messaging) with real PIN
login hardening (lockout, timing equalization, idle timeout, deactivation gate).

# Completed (all verified: lint clean, `next build` clean, DB round-trip test green (user: "keep making tests"))
- **Flour Mill rename + reminders + order details + landing** (`0.14.0`, on top
  of the `0.13.0` "chakki" redesign): app name is `APP_NAME` in
  `src/lib/brand.ts`; payment reminders via `reminderService` +
  `POST /api/owner/notifications/reminders` (6h cooldown, server-side amounts,
  `paymentReminder` type) shown on `/owner/outstanding`; order details at
  `/owner/orders/<order no.>`; landing reads rates/phone/address from Settings.
  Test section 25. Note: on FerretDB (used when MongoDB can't be downloaded) the
  two `logout:` audit assertions fail on the original code too.
- **Order status timeline** (`0.10.1`): customers now see the journey on each
  order card — an `OrderProgress` bar (रांगेत → दळण सुरू → तयार → घेतले, filled
  to the current step, live "Currently:" caption) with an expandable **View
  times** vertical timeline of every reached step's timestamp. Backed by durable
  `Order.statusHistory: {status, at}[]` written atomically: `[pending, now]` at
  intake (`createOrder` + each `createOrders` batch line), and the next step
  pushed inside the same single `doc.save()` as the transition (status + payment
  + balance + history can never disagree). Exposed via `OrderView.statusHistory`
  and `/api/my/overview`. Legacy rows migrated idempotently with
  `npm run backfill-status` → `[pending@createdAt, current@updatedAt]`, middle
  steps render as "वेळ माहित नाही / time n/a" (shared logic in
  `src/lib/order-status-history.ts`, filter-scoped so tests never touch live
  rows). Demo seed writes matching `statusHistory`. Status notifications per step
  already existed (section 20). Test section 21 (12 assertions) + self-cleanup.
  **Tests now 129/129 passing.**
- **Secure read-only customer portal** (`0.10.0`): `/my` (was Coming Soon) is
  now a real bilingual dashboard — greeting, `mustChangePin` temp-PIN banner,
  three stat cards (Total Outstanding Due / Active Orders / Unread) and two
  panels: **notifications inbox** (tap-to-mark-read, mark-all, live unread
  badge) and **order tracker** (token, status badge, grain·size·weight·rate,
  Total/Paid/Due, expandable Payment history reusing the owner's own
  `OrderView.outstanding` math). **No IDOR surface**: customer APIs
  (`GET /api/my/overview`, `PATCH /api/my/notifications/[id]/read`,
  `PATCH /api/my/notifications/read-all`) are 100% session-scoped (id never
  from URL/body); single-read is always 200 (no existence oracle) and only
  matches `{_id, customerId}`; read actions are CSRF'd + `customer-mutation:<ip>`
  rate-limited + audited. Backed by new `customerDashboardService.getCustomerDashboard`,
  `getOrdersForCustomer`, `listNotificationsForCustomer` /
  `markAllNotificationsRead` / `sendCustomersMessage`, `CustomerNotificationsPanel` +
  `CustomerOrdersPanel`. **Owner targeted messaging**: Notifications composer has an
  All-active / Specific-customers audience picker (multi-select, count badge);
  `POST /api/owner/notifications/broadcast` takes optional `customerIds` (24-hex,
  ≤200) → one *private* row per recipient, no cross-customer leaks; audit meta
  `{customers, lang, targeted, message}`. **Latent bug fixed**: `notif.*` keys
  were missing from the i18n dict (stored messages were raw keys) — added
  `notif.*` + `cust.*` so inbox rows read like sentences. **Pin/PIN login
  hardening**: progressive lockout (5 fails → 15-min base, doubling rounds;
  persisted `lockedUntil`, cleared on success, `429 ACCOUNT_LOCKED`), sale timing-equalized unknown-mobile verify (`verifyAgainstDummy`, Argon2) → uniform
  401 (no enumeration), `TRUST_PROXY` env flag gates `x-forwarded-for` trust for
  rate buckets, `SESSION_IDLE_TTL` (default 1800s) idle-timeout in
  `requireSession` (revoke → 401, lastUsedAt touched ≤ every 60s), and a
  **deactivation gate** that revokes a customer session on the very next request.
  Fixed `AppError` 4-arg→3-arg throw in lockout; `ObjectId` value import
  (`new Types.ObjectId`) in notificationService + broadcast route. `OrderActionModal`
  double-encoded body fix (`body: payload`; `apiFetch` already stringifies).
  Test section 20 (26 assertions) covers all of the above + cross-read no-op,
  unknown-mobile 401 + self-cleanup. **Tests at that point: 101/101 (see 0.10.1 → 113).**

*** IMPLEMENTATION NOTE (Jan-2026 parity): the sections under 0.9.0 and earlier
are version-tagged history; grep for a feature's path before trusting a tag. ***
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
  notification, single-write invariant, audit trail, cleanup. See the 0.10.0
  entry at the top for the current suite (sections 1–22, **129 assertions**).
- **CHANGELOG**: new `[0.5.0]` section (Payments module: receipts + उधारी hub).
- **Security & correctness hardening (`0.10.2`)** — 13 verified defects, no
  schema migration. (1) `GET /api/{orders,customers}`, `/api/owner/reports` and
  `/api/owner/reports/export` gained route-level `requireSession("owner")` —
  they only guarded inside the service layer; export now authenticates *before*
  `?section=` validation so an anonymous caller can't enumerate sections.
  (2) **CSV formula-injection guard** in `src/lib/csv.ts` (leading `= + - @` are
  prefixed with `'`; numbers untouched) — a customer name reached Excel as a
  live formula. (3) **Customer search no longer interpolates raw input into
  `$regex`** (`.*` matched every customer); input is escaped. (4) **Customer
  login got an IP-only bucket checked BEFORE the body is read** — the per-mobile
  bucket is keyed on client input, so a spray across many mobiles never touched a
  shared counter. (5) **Owner mutations are rate-limited per area**
  (`ownerMutationKey(area, ip)`: orders/payments/customers/settings/notifications)
  — one shared 120/hr bucket meant a busy queue locked the owner out of taking a
  payment. (6) **Logout audit carries the real actor** via new `peekSession` in
  `authService` (was always `actorId: null`); still idempotent (double logout
  = 200, `actorKind: "system"`). (7) **Removed the dead-end customer PIN banner**
  + `mustChangePin` from `/api/auth/me` and `/api/my/overview` (no customer
  PIN-change screen exists; the owner still issues/resets PINs, so the model
  field and owner temp-PIN indicator are KEPT). (8) `--border-subtle` was used in
  26 places across 13 files but **never defined** — every one of those borders
  silently fell back to the browser default; now `#f3d5dc` in `:root`.
  (9) **7 hydration mismatches** — `OrderActionModal`, `QueuePanel`,
  `CustomerForm`, `CustomersPanel`, `PaymentEntry`, `DashboardAutoRefresh`,
  `DashboardQuickActions` each had a private `useLang()` reading
  `document.cookie` in a `useState` initializer; all take a `lang` prop now,
  threaded from `getLang()`/`getEffectiveLang()` like `LanguageToggle` already
  did. (10) **Date formatting unified** — new
  `formatDateTime`/`formatDateTimeFull`/`localeOf` in `@/lib/i18n/i18n`; 15 call
  sites routed through them (CSV export hardcoded `en-IN`, the dashboard clock
  hardcoded `en-IN` in Marathi mode, the customer list showed no time).
  (11) **Stable React keys** in the multi-line intake form — rows were keyed by
  array index *and* removed by index, so deleting a row reused the wrong DOM and
  values appeared to shift bags. (12) **Test cleanup was a silent no-op** — two
  `deleteMany` filters used `"actor.actorId"` but the model stores `actorId` at
  the top level, so every run leaked audit rows; the suite is now verified
  self-cleaning (audit count identical before/after a run). (13) Docs reconciled
  to a single source of truth (`CHANGELOG.md` = `0.10.2`; `package.json` was
  stale at `0.1.0`, `README.md` at `0.9.0`, `PLAN.md` still claimed only
  auth+customers+orders were built). Dead code removed:
  `src/models/Payment.ts` (unreferenced, registered no collection, and declared a
  `settlement` payment method contradicting `Order.ts`'s `cash|upi`) and
  `src/components/common/ComingSoon.tsx` (no page uses it any more). `.gitignore`
  was ASCII + a UTF-16**BE** tail with a stray NUL (tooling read it as binary) —
  now plain UTF-8, rules verified intact. **Test section 22 (16 new assertions,
  129 total) + self-cleanup.**

# Blocked
- None. (Note: original `payments/page.tsx` was auto-conflicted — resolved with
  chip-customer win.)

# Next Move
None pending — security/correctness hardening pass verified end-to-end (129/129).
Remaining plan (when asked): PWA/web push, broadcast SMS/WhatsApp phase 2, and
(pre-launch) verify/fix the production CSP in `next.config.ts` (prod
`script-src 'self'` with no nonce may break Next hydration).

# Relevant Files
- **Hardening (`0.10.2`)**: `src/lib/csv.ts` (formula guard),
  `src/lib/rate-limit.ts` (`customerLoginIp`, `ownerMutationKey`,
  `OWNER_MUTATION_AREAS`), `src/services/customerService.ts` (`escapeRegExp`),
  `src/services/authService.ts` (`peekSession`),
  `src/app/api/auth/logout/route.ts` (actor attribution),
  `src/lib/i18n/format.ts` (`formatDateTime`/`formatDateTimeFull`/`localeOf` —
  split out of the server-only `i18n.ts` so client components can use it),
  `src/app/globals.css` (`--border-subtle`),
  `src/components/owner/orders/NewOrderForm.tsx` (stable line `id`)

- **Order status timeline (`0.10.1`)**: `src/components/customer/OrderProgress.tsx`,
  `src/lib/order-status-history.ts` (backfill, filter-scoped),
  `scripts/backfill-status-history.ts` (`npm run backfill-status`),
  `src/models/Order.ts` (`statusHistory`), `src/services/orderService.ts`
  (seeds/append + `OrderView.statusHistory`)
- **Customer portal (`0.10.0`)**: `src/app/my/page.tsx` (dashboard),
  `src/services/customerDashboardService.ts`, `src/components/customer/*
  ({CustomerNotificationsPanel,CustomerOrdersPanel}.tsx)`,
  `src/app/api/my/{overview, notifications/[id]/read, notifications/read-all}/route.ts`
- **Portal hardening**: `src/services/authService.ts` (lockout, dummy-verify,
  idle + deactivation gate), `src/models/{Customer,Session}.ts`,
  `src/lib/config/env.ts` (`SESSION_IDLE_TTL`, `TRUST_PROXY`),
  `src/lib/request-context.ts` (XFF gating)
- **Owner targeted messaging**: `src/app/api/owner/notifications/broadcast/route.ts`
  (`customerIds`), `src/lib/i18n/validation.ts` (`broadcastNotificationSchema`),
  `src/components/owner/notifications/NotificationsComposer.tsx` (audience picker),
  `src/app/owner/notifications/page.tsx`, `src/services/notificationService.ts`
  (`sendCustomersMessage`, `markAllNotificationsRead`, `listNotificationsForCustomer`,
  `unreadNotificationCount`)
- `src/lib/i18n/i18n.ts` (`notif.*` + `cust.*` keys)
- `src/services/reportService.ts` (`resolveRange`, `getReportSummary`),
  `src/lib/csv.ts` (`toCsv`/`downloadCsv`), `src/app/api/owner/reports/route.ts`,
  `src/app/api/owner/reports/export/route.ts`
- `src/app/owner/reports/page.tsx` + `src/components/owner/reports/*`
  (`ReportRangePicker`, `ReportActions`, `ReportsSummary`)
- `src/app/print/receipt/[id]/page.tsx` (printable पावती, `requirePageSession`),
  `src/components/common/PrintButton.tsx`, `src/app/globals.css` (`@media print`)
- `src/models/Order.ts` — PaymentMethod/PaymentEntry types + `payments[]`
- `src/lib/validation.ts` — recordPayment/createOrder/transition zod schemas
- `src/services/orderService.ts` — recordPayment, advance-on-create, single-write
  transition, OrderView.payments, `getOrder(id)`/`getOrderByNumber(n)`,
  `getOrdersForCustomer`
- `src/components/owner/payments/PaymentsPanel.tsx` — CSV/Print toolbar +
  per-row पावती link, `lang` prop (hydration-safe); `PaymentModal`/`PaymentEntry`
  take `lang` too
- `src/app/api/orders/[id]/payment/route.ts` + `src/app/api/orders/route.ts`
  + `src/app/api/orders/[id]/status/route.ts` — API layer
- `src/components/owner/PaymentEntry.tsx`, `src/app/owner/payments/page.tsx`,
  `src/app/owner/outstanding/page.tsx`, `src/components/owner/PaymentsHubPanel.tsx`,
  `src/app/owner/queue/OrderActionModal.tsx` (`next enum` mutated,
  double-encode bug fixed), `src/app/owner/CustomerStatusGrid.tsx` (chip→link),
  `NewOrderForm.tsx`
- `src/services/demoSeedService.ts` — seeded `payments[]`
- `scripts/test-db-roundtrip.ts` (sections 1–22, **129 assertions**),
  `src/lib/http.ts`/`audit.ts`/`notify.ts`
- `CHANGELOG.md` ([0.10.0], [0.5.0])

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
