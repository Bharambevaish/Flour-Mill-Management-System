# Changelog

All notable changes to this project, in reverse chronological order. Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Next milestones (planned)
- Customer dashboard notifications inbox (bilingual, mark-read)
- PWA + web push
- Phase 2: SMS (MSG91) + WhatsApp (Meta)

## [0.9.0] - 2026-09-21 — Reports hub, CSV/PDF export & printable पावती

### Added
- **Reports hub** (`/owner/reports`, was Coming Soon): period business summary
  (orders, kg, charges, collected, dues on new orders), grain-wise breakdown,
  cash-vs-UPI split with UPI transaction list, customer dues ledger and the
  period's receipt rows. Range picker with `today` / `7d` / `30d` / custom
  from–to; the selection lives in the URL so links are shareable and the server
  re-runs the report. Bilingual (mr/en) throughout.
- **CSV export** (`GET /api/owner/reports/export?section=…`): one UTF-8 BOM'd
  download per section (`receipts`, `grain`, `customers`, `summary`) so Marathi
  and ₹ open correctly in Excel; unknown sections → 400. `src/lib/csv.ts`
  provides the quote/BOM serializer (`toCsv`, `downloadCsv`).
- **Print / Save-as-PDF** everywhere it matters: a shared `PrintButton`
  (`window.print()`) plus global `@media print` rules (`src/app/globals.css`)
  that hide `no-print` chrome (sidebar, mobile nav, theme switch, toolbars).
- **Printable customer पावती** (`/print/receipt/[orderId]`, opened in a new tab):
  mill profile from Settings, order line, payment history, totals and a
  signature line. Guarded by `requirePageSession("owner")`.
- CSV/Print toolbar and a per-row **पावती** link on the Payments & Outstanding
  lists (the CSV reflects the rows currently shown).

### Changed
- Reporting time semantics are deliberate: **activity/grain/collections are
  scoped to the selected range** (money is keyed by each receipt's `recordedAt`,
  so a late उधारी settlement counts on the day it came in), while the **dues
  ledger is a current snapshot** (a balance has no single date).
- `PaymentsPanel` / `PaymentModal` / `PaymentEntry` now take the active `lang`
  from the server page instead of reading `document.cookie` during render —
  removes a hydration mismatch in the payments flow.
- `orderService.getOrder(id)` exported and `getOrderByNumber(n)` added for the
  receipt page.

## [0.8.1] - 2026-09-21 — Session-expired UX + session hardening

### Changed
- **One clean "log in again" path for any expired session**: if a protected
  API call comes back `401 UNAUTHORIZED` while the user is inside `/owner` or
  `/my`, the app now redirects (once) to the matching login screen with the
  bilingual amber "session expired — please log in again" notice
  (`src/lib/http/client.ts`, `src/components/auth/LoginAlert.tsx`). No more
  scattered inline errors or raw browser errors when a session dies mid-use.
- The notice auto-cleans `?error=` from the URL after first paint, so a plain
  refresh doesn't keep re-showing it. Owner and customer login pages both use it.
- **Friendlier 429s**: when the login rate limiter (10 tries / 15 min / IP)
  trips, the form now says "खूप जास्त प्रयत्न — कृपया ~X मिनिटांनी पुन्हा करा /
  Too many attempts — try again in about X minutes" instead of a bare line.
- **Why "builds never logged you out"**: sessions are DB-backed and survive
  restarts; the only things that used to make them LOOK dead were the login
  rate bucket being exhausted, real 401s from already-open pages showing as
  inline errors, and the dev↔production cookie-name flip. That last one is gone:
  cookie name + `Secure`/`__Host-` flag now come from one rule —
  `AUTH_COOKIE_SECURE`, defaulting to Secure only when the app is a production
  build served over HTTPS — so `next dev` ↔ `next start` on http://localhost
  share the same cookie and never look like a sign-out.

### Fixed
- **The "session expired" loop at the owner login**: a revoked session used to
  leave a stale httpOnly `fm_owner` cookie in the browser. The proxy only
  checks cookie *presence*, so it kept bouncing `/login` back to `/owner`,
  whose DB check failed and redirected to `/login?error=session_expired`
  again — an unescapable banner loop (the owner login was affected; `/my/login`
  was already exempt). Three fixes:
  - `proxy.ts` no longer bounces a login page that carries `?error=…`.
  - `apiFetch` (on a real 401) and `LoginAlert` (on the login page) expire the
    stale auth cookies client-side, so the loop terminates after one visit.
  - `LoginAlert` first asks `/api/auth/me`; if the session is actually still
    valid it sends the user into their area instead of logging them out.

## [0.8.0] - 2026-09-20 — Multi-line order intake

### Added
- **One customer, many bags**: the New Order form is now a multi-line editor —
  pick the customer once, add up to 20 grain bags (grain / size / weight / rate
  auto-filled from settings), see a live batch summary (bags, total weight,
  total charges, balance), then create **all orders in one submit**.
  - `POST /api/orders` accepts a new `{ customerId, items[], advanceAmount }`
    payload (legacy single-line payload still works unchanged — the DB
    round-trip test's existing order sections are untouched)
  - `orderService.createOrders()`: consecutive orderIds (one counter bump),
    one `insertMany`, and the shared intake advance auto-allocated across the
    lines in order — fills line 1's balance, spills the remainder to the next —
    so every order's पावती/receipt stays honest
  - New Order form now takes `lang` server-side (`initialLang`) — no more
    `document.cookie` read in the client initializer (hydration-safe)

## [0.7.0] - 2026-09-20 — Owner notification broadcast (scaffold)

### Added
- **Owner → customer broadcasts**: the Notifications page (was "Coming Soon") is
  now a compose tab — write a message, pick language (mr/en), and send it to
  every active customer in one shot. Full-stack scaffold, in-app only (no
  WhatsApp/SMS yet).
  - `NotificationType` gained `broadcast` (free-text announcements)
  - `notificationService.broadcastToActiveCustomers()` fans the message out as
    one in-app `Notification` row per active customer (batch `insertMany`),
    honouring the master "in-app notifications" settings switch
  - new `POST /api/owner/notifications/broadcast` (zod, CSRF, rate-limited,
    audited `notifications.broadcast`)
  - page shows live active-customer count, recent broadcast history (grouped
    per send) and a warning when in-app notifications are switched off
- Demo seed fans out one bilingual broadcast to all active demo customers so
  the tab has history immediately.

## [0.6.0] - 2026-09-20 — Settings actually work + owner TOTP 2FA

### Fixed
- Expired/revoked owner or customer session no longer 500s with a raw error
  dump — protected pages redirect cleanly to their login screen and show a
  "session expired, please log in again" notice; a root error boundary turns
  any unexpected error into a bilingual retry/sign-in page.
- Change-password in Settings saved nothing (silent "Request failed"): the
  panel sent `POST` but the route only serves `PATCH` — now sends `PATCH`;
  every settings mutating action also surfaces unexpected errors instead of
  failing silently.
- Added show/hide (eye) toggles on the Current / New / Confirm password
  fields in the Settings Security tab.

### Added
- **TOTP 2FA for the owner** — full lifecycle from the Settings → Security tab:
  scan QR (with manual secret fallback) → verify 6-digit code → 2FA on. Login is
  now two-step in one request: correct password without a code returns
  `{ needTotp: true }` (no session), with the code it logs in. Disable requires
  the current code. Enabling 2FA or changing the password revokes every *other*
  live owner session.
- **Owner password change** (`PATCH /api/auth/owner/change-password`): verifies
  the current Argon2id hash, re-hashes, revokes the other sessions.
- **Harden `/api/owner/settings`**: zod `settingsPatchSchema` (bounded rates over
  the canonical GRAINS×SIZES grid, finite ≥ 0), CSRF, rate-limit, owner-only,
  audit `settings.update`.
- **Settings panel** (`SettingsPanel.tsx`): validation + one global Save with
  dirty tracking (the old control was double-stringifying its body — save always
  errored), mill-wide **default language** (mr/en) now saved and applied to the
  session, theme seeded from the server cookie, functional Security tab
  (password + 2FA with QR).

### Changed
- **Settings are consumed, not ornamental** — `getSettingsOrDefault()` in
  `src/services/settingsService.ts` is the single source:
  - **Milling rates flow** into the new-order form and queue edit form
    (`defaultRates` prop; DB `rates` merged over built-ins with stale keys
    dropped).
  - **Mill name** renders in the owner sidebar brand (`owner/layout.tsx`).
  - **Notification toggles**: `notifyCustomer` respects `notifications.inApp`
    (OFF skips the tray write).
  - **Default language**: page headers fall back to it via `getEffectiveLang()`
    when no `lang` cookie exists.

## [0.5.0] - 2026-09-19 — Payments module: उधारी hub + recorded receipts

### Added
- **Payments hub** (`/owner/payments` — was "Coming soon"): every order with its
  paid / due split, a full receipt trail per order (`payments[]`), and a
  "पैसे घ्या / Take payment" button that records a receipt (cash or UPI with a
  *required* UPI transaction ID) directly against any order — including
  **already-collected** orders where a customer settles their उधारी later.
- **Outstanding / उधारी page** (`/owner/outstanding`): same hub auto-filtered to
  dues-only with a live total of what's owed, plus a shortcut to the full hub.
- **Advance payment on order intake** (new-order form): cash/UPI with balance
  preview (आगाऊ रक्कम → एकूण किंमत → शिल्लक). Validated: upi requires a txn id,
  advance can never exceed the order total.
- **Full-settlement notification**: `paymentReceived` fires in the customer's
  language (mr/en) the moment an order's balance hits ₹0 — even via a standalone
  receipt on an already-collected order.
- Dashboard/customer chips now link straight to the payments hub for that
  customer (`?customer=…`); when a customer has exactly one open due the modal
  opens ready to record the settlement.

### Changed
- `Order` model: embedded `payments[]` (amount, method cash|upi, upi+txn id,
  recordedAt). `paidAmount` remains the cached running total (legacy rows keep
  it untouched). New `PaymentEntry` component shared by create / transition /
  record flows so receipts are always a single atomic `doc.save()`.
- New API: `PATCH /api/orders/[id]/payment` (zod `recordPaymentSchema`,
  rate-limited, CSRF, owner-only, audited as `order.payment.record`), and
  `POST /api/orders` now accepts the advance fields.
- Demo seed now records matching `payments[]` receipts so seeded उधारी look real.

### Tested
- `npm test` (DB round-trip, 29 assertions): advance stored atomically with the
  order, UPI-without-txn rejected, advance→total rejected without consuming an
  orderId, partial UPI receipts persisted, over-payment rejected leaving the doc
  untouched, receipt recorded on a collected order settles it, `paidAmount ==
  Σ payments` invariant, audit entries written. All pass against a live DB;
  test cleans up after itself.

## [0.4.6] - 2026-09-19 — Dashboard always in sync + DB round-trip test

### Added / Changed
- **`DashboardAutoRefresh`**: the dashboard now re-fetches its data from the DB on
  every visit (mount) and again whenever the tab becomes visible again — killing the
  Next.js client router-cache / back-forward staleness that made the dashboard look
  frozen after acting on the queue. Adds an explicit **"↻ ताजे करा / Refresh"** button
  and a "शेवटचे अपडेट hh:mm:ss / last updated" timestamp in the header.
- **Livier stats**: new "आजच्या नवीन ऑर्डर / New orders today" and "आजचा वसूल / Collected
  today (₹)" cards; `रांगेत ऑर्डर` renamed to "नवीन (सुरू झाल्या नाहीत) / Not started" so it
  can't be confused with the queue page count. All cards are computed from MongoDB on
  every render (`force-dynamic`) and were verified row-for-row against the live DB.
- **Automated DB round-trip test** (`npm test` → `scripts/test-db-roundtrip.ts`): logs in
  as the owner, creates an order via the HTTP API, then asserts the document actually
  lands in MongoDB — including the combined status+payment single-doc write, rejection
  of over-payment (400) and illegal skips (400 INVALID_TRANSITION) without side effects,
  the collected order leaving the queue, and the notification + audit side-effects.
  16 assertions, fully self-cleaning (order/notifications/audits deleted, sequence
  counter restored). Locks in "writes really persist" permanently.

## [0.4.5] - 2026-09-19 — Order update modal: status + payment in one write

### Added / Changed
- **Order action window (modal)**: the queue card's step button (दळण्यास सुरू करा / तयार
  झाले / घेतला) now opens a dialog instead of acting instantly. It shows the order summary,
  the strict next status (pending → processing → completed → collected), and a payment
  recorder — "पूर्ण घेतले / Paid in full", "आंशिक / Partial (enter amount received)",
  or "पैसे नाही / No payment", with a live "नवीन बाकी / New due" preview.
- **`transitionOrder(orderId, { status, paidAmount })`** replaces `advanceStatus`: status and
  payment are written to the **DB in one `doc.save()`** so they never fall out of sync.
  Validates the strict next step (no skipping/back) and `0 ≤ paidAmount ≤ totalCharges`
  (over-payment → 400). Notifications for the step still fire; collected orders leave the
  queue and any unpaid balance stays on the customer's account.
- **`PATCH /api/orders/[id]/status`** now accepts `{ status, paidAmount? }` (`orderTransitionSchema`);
  audit meta includes `paidAmount`.
- **Fixed the real gap**: `paidAmount` previously had **no mutation path at all** — only the
  demo seeder set it. The dashboard's बाकी/पैसे-pूर्ण numbers were frozen; now every payment
  is persisted and the dashboard recomputes outstanding live.
- Panel refactor: step buttons open the modal; error state cleaned up; build/lint clean.

## [0.4.4] - 2026-09-19 — Queue: dynamic token numbers (shift up on serve)

### Added / Changed
- Queue "रांग क्र. / No." is now a **live position (rank)**, not the stored id: order
  rows returned by `listOrders({ excludeCollected })` carry a computed `queueNo` = 1..N.
  When an order is **collected**, the rest automatically shift up — the former No. 2 becomes
  the new No. 1. Nothing is written to the DB; the token is the current rank at read time.
- The stored **ऑर्डर क्र. # (orderId)** remains permanent (record/receipt/invoice number —
  what notifications, audit, and the counter keep using). It's displayed subtly on each card
  next to the timestamp so history still cross-references.
- New orders are still appended at the bottom: their permanent id keeps incrementing via the
  atomic Sequence counter (unaffected by rank), and they get the next queue number.
- Ready (तयार) orders keep their queue slot until collected.
- Queue page subtitle updated: "ऑर्डर संपताच रांग क्रम आपोआप वर सरकतो".
- Also fixed a latent TS error on the `sort` literal typing introduced in 0.4.3.

## [0.4.3] - 2026-09-19 — Queue: order by queue number + label

### Changed
- Queue list now sorts by **`orderId` ascending** (`रांग क्र. 1 → 9`) instead of `createdAt`, so the
  owner sees a clean, sequential token order. (Previously demo seeds back-dated timestamps, making
  the numbers look scrambled.)
- Each queue card shows a **रांग क्र. / No. N** chip before the status badge, and the page subtitle
  states "लहान क्रमांक प्रथम / lowest first" — it now reads like a physical queue ticket system.

## [0.4.2] - 2026-09-19 — Seed demo button (in-app) + shared seeder

### Added
- **⚙ Seed demo button** — fixed top-right on all owner pages (`SeedDemoButton`, mounted in the owner
  layout). One click wipes orders/notifications and reseeds the 8-scenario demo spread, refreshing the
  dashboard immediately. Shows a transient toast (`Seeded 8 orders (next #9)`).
- **`POST /api/dev/seed-demo`** — owner-only, CSRF-protected, rate-limited, audit `demo.seed`;
  **refuses to run in production** (404 in production builds).
- **Shared seeder** (`src/services/demoSeedService.ts`): `runDemoSeed()` is the single source of truth
  used by both the CLI (`npm run seed:demo` → `scripts/seed-demo-orders.ts`, runs on Node 22 type
  stripping) and the in-app button. Enabled `allowImportingTsExtensions` for the script.

### Changed
- Seeder is now TypeScript and imported by the API route; CLI output preserved via `console.table`.

## [0.4.1] - 2026-09-19 — Demo-order seeder + accurate stat counts

### Added
- **`npm run seed:demo`** (`scripts/seed-demo-orders.mjs`) — idempotent demo seeder that
  wipes orders/notifications and seeds 8 orders across the demo customers (Test Customer,
  Sharad Bhau, Joy) covering every status and payment case: pending unpaid, processing
  partial, completed unpaid/paid, collected settled. Staggers `createdAt` so card ages show
  variety (मिनिटे/तास/दिवस) and the **newest active order per customer** lands on
  रांगेत / दळण्यात / तयार so all live badges are visible on the dashboard. Re-syncs the
  `orderId` counter so real orders keep counting from #9.

### Changed
- Stat cards now count **actual orders by status** (रांगेत/चालू/तयार) instead of one per
  customer, so numbers match the real queue.

## [0.4.0] - 2026-09-19 — Owner dashboard: customer status at a glance

### Added
- **Customer status grid** (`src/components/owner/CustomerStatusGrid.tsx`) on the dashboard —
  one card per customer with everything the owner needs at a glance:
  - Balance chip: **उधारी ₹X / Due** (red) when outstanding, **पैसे पूर्ण / Paid** (green) when settled.
  - Order tally: `N ऑर्डर / N orders · दिले ₹Y / paid ₹Z` (paid vs billed).
  - **Current order** (latest non-collected): `#orderId · grain·size · weight kg` with a status badge
    (रांगेत / In queue, दळण्यात / Processing, तयार / Ready), rate, charges and a relative age
    (आत्ताच / N min / N hr ago).
  - Two views: an **attention** grid (only customers with dues or an active order, sorted by
    outstanding) and an **all customers** grid. Inactive customers included.
- **Richer stat cards**: Active customers · In queue · Ready to collect · Processing · Total
  outstanding · Customers with dues (computed from real per-customer aggregation).
- **Shared `StatusBadge`** (`src/components/owner/StatusBadge.tsx`) + `grainLabel/sizeLabel`
  helpers in `millings.ts`; QueuePanel refactored to reuse them.

### Verified (live)
- Seeded 4 orders across 2 customers (1 pending, 1 processing, 1 ready/partial, 1 collected/paid):
  cards rendered with correct dues (₹460 test / ₹65 Sharad), paid ₹, status badges, grain·size·weight,
  rate, charges and relative age in SSR HTML — verified via live curl.

## [0.3.1] - 2026-09-19 — Edit order (fix an order that went wrong)

### Added
- **`updateOrder`** in `orderService` + `PATCH /api/orders/[id]` (CSRF, rate-limit, audit `order.update`):
  - Change customer, grain, grind size, weight, or rate on any non-collected order;
    `totalCharges` is recomputed from weight × rate. Switching customer validates the
    new one exists and is active.
  - **Collected orders are locked** (400 `ORDER_LOCKED`) — the edit must happen while
    the order is still in the queue.
- **Queue UI** — every row now has a **सुधारणा / Edit** button that opens an inline form
  (customer picker, grain/size selects with live rate re-default, weight, rate, live "नवीन किंमत"
  total, free-text grain name for Other). Save → `router.refresh()`.
- Queue page passes the active-customer list to the panel for the edit picker.

### Verified (live)
- Edit weight 50→45 re-computed total ₹300→₹270, customer populated in response.
- Bad input (negative weight, empty body) → 400; no CSRF → 403.
- Edit after advancing to `collected` → 400 `ORDER_LOCKED`; full pending→…→collected flow still works.

## [0.3.0] - 2026-09-19 — New order + queue + status flow + notification trigger

### Added
- **Milling rate defaults** (`src/lib/millings.ts`) — ₹/kg per grain (maize/wheat/jowar/bajra/rice/
  gram/other) × grind size (fine/medium/coarse). Pure constant module, editable per order; later
  the defaults move to Settings.
- **Order service** (`src/services/orderService.ts`):
  - Atomic human-friendly `orderId` (1, 2, 3…) via a `Sequence` counter (`findOneAndUpdate` upsert).
  - `createOrder` — computes `totalCharges = weight × rate`, starts as `pending`, rejects inactive
    customers, fires the **orderReceived** notification.
  - `listOrders` — FIFO queue (pending+processing+completed, oldest first) or full list; populates
    customer name+mobile; never serializes PINs.
  - `advanceStatus` — **strict forward-only flow** `pending → processing → completed → collected`
    (no skipping, no going back; 400 `INVALID_TRANSITION`). Each step fires the matching customer
    notification (`orderProcessing` / `orderCompleted` / `orderCollected`).
  - A notification failure can never block an order update.
- **Notification trigger**: `notifyCustomer(...)` writes in-app notifications; all 4 lifecycle keys
  (incl. new `notif.orderCollected`) exist in the bilingual i18n dict.
- **API routes** (owner-only, CSRF + rate-limit + audit):
  - `POST /api/orders`, `GET /api/orders?status=&excludeCollected=1`
  - `PATCH /api/orders/[id]/status`
- **UI**:
  - `/owner/new-order` — form: customer picker (active only), grain/size selects that auto-fill the
    rate, live ₹ total, overridable rate, "Other" grain with free-text name; success shows order #
    and links to the queue.
  - `/owner/queue` — pending orders oldest-first with status badge (रांगेत/Processing/Ready/
    Collected), charges + outstanding, and one-tap advance button ("Start / Mark ready / Collected").
  - Dashboard quick actions: **New order** and **Queue** are now live links.

### Verified (live)
- Unauthenticated `GET /api/orders` → 401; authed page `/owner/queue`, `/owner/new-order` → 200;
  unauth page → 307 redirect.
- Create order #1 (50kg maize @6 → ₹300) → 201; second order → orderId 2 (counter atomic, no dupes).
- `pending→processing→completed→collected` → 200 each; same-status and backward moves → 400.
- Queue excludes collected orders and populates customer name/mobile.
- 5 notification rows written for the two orders with correct Marathi messages for all 4 types.

## [0.2.1] - 2026-09-19 — Owner shell: sidebar navigation (IA change)

### Added
- **Persistent owner navigation** — `src/components/owner/OwnerSidebar.tsx`:
  - Desktop: fixed left sidebar with icon + bilingual labels, active-state highlight, logout at the bottom.
  - Mobile: top brand bar + horizontally scrollable module chips.
  - Every module one click away: Dashboard, Customers, New Order, Queue, Payments, Outstanding,
    Notifications, Reports, Settings.
- **Owner route-group layout** (`src/app/owner/layout.tsx`) wraps all `/owner/*` pages with the shell.
- **Dashboard is now a real home** (`/owner`):
  - Live stat cards: active customers, orders in queue (pending+processing), total outstanding
    (aggregated from orders).
  - Quick actions: **+ Add customer** (opens the shared form right on the dashboard) + New order (coming soon).
  - Recent customers list with active/inactive badges and a link to the full list.
- **Shared `CustomerForm`** (`src/components/owner/CustomerForm.tsx`) — one create/edit form reused by
  both the Customers page and the dashboard quick action; after saving it reappears anywhere via refresh.
- **Coming-soon pages** for the 7 not-yet-built modules so no sidebar link 404s.

### Changed
- Customers page slimmed down to the panel (shell now provides chrome).
- Old 8-card grid dashboard replaced by the home + sidebar layout (Option A IA).

### Verified (live)
- Owner dashboard 200 with sidebar, quick actions, stats, recent customers in SSR HTML.
- All 7 module placeholder pages return 200 via the sidebar.
- `/owner/customers` 200 with create button from the shared form.
- Guard intact: unauthenticated `/owner` → 307 `/login`.
- `npm run lint` + `npm run build` clean; all `/owner/*` routes registered.

## [0.2.0] - 2026-09-19 — Owner: customers CRUD

### Added
- **Customers module (owner-side, `/owner/customers`)**
  - Server page + interactive `CustomersPanel` (list, search, create, edit, activate/deactivate,
    bilingual Marathi/English, dark-mode ready).
  - Owner dashboard "ग्राहक" card now links to the module; other cards stay stubs.
- **`src/services/customerService.ts`** — owner-guarded at the data layer:
  - `listCustomers(search?)` — never returns `pinHash` (no PIN material leaves the server).
  - `createCustomer` — Argon2id-hashes temp PIN, `mustChangePin: true`, uniqueness on mobile.
  - `updateCustomer` — name/mobile/PIN-reset/active; PIN reset forces change-on-login;
    **deactivation revokes every live customer session immediately**.
- **API routes** (`/api/customers`, `/api/customers/[id]`):
  - GET list (owner only), POST create (201), PATCH update — all require an owner session.
  - Mutations: CSRF double-submit, per-IP rate limit, Zod validation, audit-logged as the owner.

### Verified (live, all passing)
- Security negatives: unauthenticated → 401; missing CSRF → 403; bad PIN body → 400;
  duplicate mobile → 409 `MOBILE_CONFLICT`.
- Lifecycle: create (201, mustChangePin) → customer login with temp PIN (200) →
  update name + reset PIN (mustChangePin stays) → deactivate → login blocked `403 ACCOUNT_INACTIVE`
  AND the already-open session killed instantly (me → 401) → reactivate → login again (200).
- No `pinHash` in any list response. Every change appears in `auditlogs` with the owner actor id.
- `npm run lint` + `npm run build` clean; all new routes registered (`ƒ`).

### Changed
- Security checklist (PLAN §6): "Owner TOTP 2FA" still pending; IDOR/ownership pattern (owner
  guard at DAL) now proven on a second module beyond auth.

## [0.1.1] - 2026-09-19 — Ops: managed mongo scripts

### Added
- **Dark theme (default) + corner light/dark switch**
  - Class-based dark mode via `@custom-variant dark` in `globals.css`; `.dark` toggled on `<html>`, default dark.
  - `src/components/ThemeToggle.tsx` — fixed bottom-right switch (sun/moon), self-contained so it can be re-homed
    into a Settings tab later without changes.
  - Root layout reads the `theme` cookie server-side and applies the class at SSR (no flash).
    Choice persists 1 year. `theme=light` restores light mode.
  - Every page/component converted: landing, owner + customer login (pages & forms), owner + customer
    dashboards, LogoutButton — full `dark:` coverage (bg/cards/borders/text/inputs/buttons/banners).
  - Verified: default `html` carries `dark`; `theme=light` cookie produces `light`; toggle present;
    Tailwind compiles `dark:` utilities; lint + build clean.

### Fixed
- **Customer login page never rendered — infinite redirect loop in `proxy.ts`.**
  The `/my` auth guard used `pathname.startsWith("/my")`, which matched `/my/login`
  itself: no session → redirect `/my/login` → `/my/login` → … forever. The browser
  RSC prefetch gave up ("Failed to fetch RSC payload … Falling back to browser navigation")
  and the page never displayed.
  - Guard now excludes the login page (`pathname !== "/my/login"`), so unauthenticated
    users can open it; authenticated customers still bounce `/my/login` → `/my`.
  - Verified: `/my/login` no session → 200; following the RSC redirect ends in 200 (1 hop);
    logged-in `/my` → 200; owner `/login` unaffected.
- `AuditLog` CastError on logout — the logout audit passed `actorId: "session"`,
  which Mongoose rejected as a non-ObjectId.
  - `src/lib/audit.ts` now sanitizes `actorId`: only valid ObjectIds are stored;
    anything else degrades to a system record (can never crash a request again).
  - `logout/route.ts` audits as `actor { actorId: null, actorKind: "system" }`.
  - Logged-in-wrong-id `"unknown"` actors are also neutralized by the same guard.
- Re-verified live: customer login (200) → `/my` page (200) → logout → `me` 401;
  audit logs record login/logout correctly, no exceptions.

### Added
- `scripts/mongo-start.sh` + `scripts/mongo-stop.sh`; `npm run mongo` / `npm run mongo:stop`
  - MongoDB runs user-space (`~/mongodb`), port 27017, no Docker/root
  - `mongo-stop.sh` waits for a clean exit, force-kills if needed

### Changed (working convention)
- **Dev-process rule**: after opencode finishes verifying a build, all processes are stopped.
  The user starts them separately: `npm run mongo` then `npm run dev`.
- Leftover mongod daemon (from earlier e2e verification) stopped.
- Added an ops marker to `PLAN.md` so the convention is documented in-repo.

## [0.1.0] - 2026-09-19 — Scaffolding

### Added
- `PLAN.md` — master plan (business, locked decisions, security checklist, build order)
- `CHANGELOG.md` — this file; append every future change here
- Next.js 16.3.5 + TypeScript scaffold (App Router, Tailwind, ESLint, Turbopack)
- Note: Next 16 renamed middleware → **proxy** (`src/proxy.ts`); `cookies()` is async.

### Security core
- Env validation via zod (`src/lib/env.ts`), `.env.example` committed, `.env.local` ignored
- Argon2id password/PIN hashing (`src/services/authService.ts`)
- DB-backed, revocable session model — random 256-bit token, **SHA-256 hashed at rest**, carried in `httpOnly` + `Secure` + `SameSite=Lax` cookies (`__Host-` prefix in prod)
- CSRF double-submit protection (`src/lib/csrf.ts`) with signed cookie + `x-csrf-token` header
- In-memory sliding-window rate limiting on logins (per mobile + IP)
- Request-context capture (IP/UA/device) + audit log on login success/failure
- Security headers + strict CSP + HSTS in `next.config.ts`
- Owner + customer session cookies; `proxy.ts` optimistic guard + DAL-level `requireSession()`

### Data models (Mongoose)
- `Admin`, `Customer`, `Session`, `Order`, `Payment`, `Notification`, `AuditLog`

### App routes (functional)
- `GET /api/health` — db + service health
- `GET /api/csrf` — issues CSRF cookie/token for the client
- `POST /api/auth/owner/login` — email + password (rate-limited, audited)
- `POST /api/auth/customer/login` — mobile + PIN (rate-limited per mobile/IP, audited)
- `POST /api/auth/logout` — revokes session server-side + clears cookie
- `GET /api/auth/me` — current actor (owner/customer), never leaks secrets

### UI (minimal but working)
- Landing page (Marathi/English) → owner login + customer login
- Owner and customer login forms (CSRF-aware client helper `src/lib/client.ts`)
- Protected dashboards (`/owner`, `/my`) with logout + placeholders for modules
- Language/file for notification strings: Marathi ⇄ English (`src/lib/i18n.ts`)

### Services
- `notificationService` — day-1 in-app notifications; phase-2 channels (push/SMS/WhatsApp) hook into the same `notifyCustomer()` entry point

### Ops
- `scripts/seed-admin.mjs` (`npm run seed`) — creates the super-admin from `.env.local`, idempotent
- `npm run build` + `npm run lint` pass clean

### Runtime verification (2026-09-19)
- MongoDB 8.0.4 installed locally (user-space, `~/mongodb`, no root) + running on 127.0.0.1:27017
- Owner seeded via `npm run seed`; e2e curl tests all pass:
  - `GET /api/health` → `{status:"ok", db:"connected"}`
  - Owner login: wrong password → 401; correct → 200 + session cookie + rotated `csrfToken`
  - `GET /api/auth/me` → owner; `/owner` dashboard → 200; logout → `{loggedOut:true}`; `me` → 401 after
  - Customer PIN login (test customer seeded): bad PIN → 401; correct → 200; `/my` → 200; logout → logged out
  - Proxy guard: unauthenticated `/owner` → 307 redirect to `/login`
  - CSRF: mutating request with no header → 403 `CSRF_MISSING`; mismatched token → 403 `CSRF_INVALID`
  - CSRF rotation fixed: login responses now return the fresh token and the client adopts it

### Known limitations (scaffolding)
- `Order`/`Payment`/`Customer` API routes not yet wired (only auth core is done)
- Admin "add customer" flow pending — test customer was inserted via a throwaway node script
- `mustChangePin` flagged on customer dashboard, but PIN-change endpoint pending
- TOTP 2FA dependencies installed, wiring pending