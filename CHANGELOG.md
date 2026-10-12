# Changelog

All notable changes to this project, in reverse chronological order. Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Next milestones (planned)
- Web push (needs a service worker — see the PWA note in `0.12.0`)
- Phase 2: SMS (MSG91) + WhatsApp (Meta)

## [0.13.0] - 2026-10-12 — "Chakki" visual redesign

UI only — no API, schema or business-logic change (only new `cust.*` i18n keys).

### New theme
- Flat, warm palette in `globals.css`: flour-cream paper ground, terracotta
  `clay` brand, `haldi` (pending), `neel` (milling), `leaf` (ready / paid) and
  warm `earth` neutrals. Every rose/pink/zinc/slate/emerald/amber/sky utility
  was renamed to these ramps; gradients, pink glows and the Material token set
  were removed. Dark mode is now warm brown instead of cold zinc.
- Fonts: Mukta (Marathi + Latin at matching weight) for UI, Tiro Devanagari
  Marathi serif for headings and rupee figures (replaces Plus Jakarta / Geist).
- Component classes (`stitch-*`) moved into `@layer components` and given
  default padding — several Receipt / Collect / CSV buttons previously
  rendered with no padding at all.
- Emoji (🌾 📞 ✅ 🔔 🖨 💳 📸 ❌ ⚠️) replaced by drawn stroke icons
  (`src/components/common/Icons.tsx`) and a `BrandMark` wheat-ear logo; PWA
  icons regenerated in the new colours (`npm run icons`).

### Customer portal
- New top bar, serif greeting, and a terracotta "what you owe" card with Pay /
  Call buttons — or a green "All settled" card when nothing is due.
- "Your flour is ready" banner whenever an order is in तयार.
- Orders are paper slips (token stub, perforated tear line, a crooked
  "Paid in full" stamp) split into Current / Past orders.
- Order progress is a 4-stop stepper with readable 13px words and ticks.
- Notifications open on the newest 5 with "Show all".

### Landing page
- Rebuilt in the new theme and fully bilingual (follows the `lang` cookie).
- Removed claims the app does not support: scale sync / "99.9% accuracy",
  biometric login, offline sync, SMS / WhatsApp alerts, OTP login and a
  placeholder support number. Only real features are listed now.
- Hero shows a labelled example order slip; a "How it works" (3 steps),
  features and owner panel follow.
- The mobile-number box now really carries over: `/my/login?mobile=…`
  pre-fills the customer login (digits only, max 10).

### Owner
- Shared `AuthShell` login layout for both logins.
- Sidebar: ink-coloured active item, wheat-ear brand; content capped at 6xl.
- Dashboard: eight equal tiles replaced by three panels — Today, In the mill
  now (links to the queue), Outstanding.

## [0.12.0] - 2026-09-30 — Installable customer app (PWA manifest) & production CSP fix

### Installable Android app
- New `src/app/manifest.ts` (root of `app/`, served at `/manifest.webmanifest`,
  prerendered **static** — no DB read). Customers can now "Add to home screen" /
  "Install app" the portal and get a standalone app window instead of a browser
  tab. `name` `गिरणी व्यवस्थापन | Flour Mill`, `short_name` **Girani** (kept
  short and Latin — Android prints this under the icon and truncates past ~12
  chars), `display: standalone`, `orientation: portrait`,
  `theme_color`/`background_color` `#faf5f7` to match the portal surface.
- **Scoped to the customer portal only**: `start_url`/`scope` are `/my`, and
  `id: "/my"` so a reinstall updates the existing app instead of adding a second
  copy. `/my` contains `/my/login`, so a customer whose session expires gets the
  login screen *inside* the app rather than being ejected to a browser tab. The
  owner console is untouched.
- **No service worker, deliberately.** Next 16's PWA guide gives Chrome's install
  criteria as just a valid manifest + HTTPS, so there is nothing to gain from
  caching — and a cache is a liability on a shared family phone, where stale
  content could show one customer's orders to another.
- New `scripts/generate-icons.mjs` + `npm run icons`: a wheat-ear mark on the
  mill's rose ramp (`#f43f5e`→`#be123c`), rasterised via the `sharp` that Next
  already vendors, into `public/icons/` — `icon-192.png`, `icon-512.png`,
  `icon-maskable-512.png` (glyph at 0.66 so Android's launcher mask cannot clip
  it) and `apple-touch-icon.png`. Idempotent; PNGs are committed so no build
  step needs `sharp`.
- `layout.tsx` gains `appleWebApp` (iOS "Add to Home Screen" gets the app name
  and drops Safari chrome) and `icons` pointing at the same files. No
  `metadata.manifest` field — the file convention always overrides it.
- **`src/app/favicon.ico` deleted.** It was Next.js's stock logo, so customers
  saw the Next.js logo in their browser tab; it is now the mill's mark.
- Test **section 24** (14 assertions). It asserts the manifest is served
  anonymously, as `application/manifest+json`, that `scope`/`start_url`/`display`
  are right, that the required 192 + 512 icons and a maskable one are declared —
  and it **fetches each icon and parses its real PNG IHDR dimensions**. A
  manifest pointing at a missing or wrong-sized icon is the classic reason a
  browser silently never offers "Install app" (no error, the prompt just never
  appears), and that failure is invisible until someone tries on a real phone.
  Suite: **187 assertions, all passing**.

### Fixed: production CSP blocked hydration (app-breaking)
- The production policy was `script-src 'self'` with no `'unsafe-inline'`, but
  Next ships the RSC payload as inline `<script>` blocks **with no nonce**. Every
  one of them was blocked, the payload never arrived, and pages rendered as dead
  HTML with zero interactivity. Confirmed in the build output, not assumed.
- Now `script-src 'self' 'unsafe-inline'`, matching the no-nonce pattern in the
  bundled Next 16 CSP guide, plus an explicit `manifest-src 'self'`. The
  hardened alternative is a per-request nonce, which costs all static rendering;
  noted in the config so the trade-off is explicit rather than accidental.
- Verified by booting the production server, reading the emitted policy, and
  matching it against the actual inline scripts in the served HTML.

### Deployment note
- Android only offers "Install app" over **HTTPS**. `localhost` is exempt, so it
  works in Chrome on the dev machine, but a customer's phone on a LAN `http://`
  address will never see the prompt. Test with a tunnel
  (`cloudflared tunnel --url http://localhost:3000`) or a real HTTPS deploy.

## [0.11.0] - 2026-09-29 — Customer portal redesign, UPI QR payments & order cancellation

### Customer portal (mobile-first)
- `/my` rebuilt for a phone held in one hand: a single **Total Outstanding Due**
  card the customer can tap, the two secondary counts (active orders, unread)
  side by side instead of three equal-weight cards, orders ABOVE notifications,
  and generous touch targets. The root layout now exports an explicit
  `Viewport` (zoom is still allowed).
- `OrderProgress` (a dot-and-bar tracker) is replaced by **`OrderStatusLine`**:
  a single line of coloured words — `रांगेत · दळण सुरू · तयार · घेतले` — with the
  reached step bold. The per-step timestamps moved into the existing **Details**
  expander as `OrderStatusTimes`, so the status and its history can no longer
  disagree about what happened when.
- `LogoutButton` takes a `lang` prop; the portal and the owner sidebar pass it
  from the server so no client initializer reads `document.cookie`.

### UPI QR payments
- One mill-wide UPI **QR image + UPI ID** in Settings → new "५. UPI पेमेंट" tab.
  The owner uploads a PNG/JPEG/WEBP up to 1 MB; the file is stored **verbatim**
  as a `data:` URL and served back byte-for-byte. No `sharp`, no resize, no
  re-encode, no filesystem upload — the test asserts byte identity on both the
  stored document and the served response.
- SVG is rejected (scriptable document format, never a bank QR). The size cap
  lives in the `upi-qr` route because the app's `readBody` 64 KB JSON limit is
  useless for a photo, so that route parses `formData()` directly.
- `GET/POST/DELETE /api/owner/settings/upi-qr` (owner) and
  `GET /api/my/payment-qr` (customer, session-scoped). Both serve **bytes**;
  the dashboard JSON only carries `{ hasUpiQr, upiId }` so a page load on mobile
  data is not carrying ~1.3 MB of base64.
- New `PaySlideOver`, opened from the due card only, shows the QR plus a
  copyable UPI ID and the "the mill will update your balance" note.
- A **Download QR** button sits under the image, so a customer can keep the
  code on the phone and open it from Photos/Gallery later instead of
  screenshotting it. It is a plain link to `/api/my/payment-qr?download=1` — the
  same bytes and the same session check as the preview, plus a
  `Content-Disposition` filename of `<mill>-upi-qr.<ext>`. The mill name is
  user-typed, so it is slugged to `[a-z0-9-]` before it reaches a header (an
  unescaped quote or CRLF there would be response splitting). The plain preview
  URL deliberately stays `inline` so the `<img>` keeps working.
- `upiId` is format-checked (`name@bank`) — the customer copies it straight into
  their UPI app, so a typo becomes a failed payment at the counter.
- `apiFetch` learned to send `FormData` raw (it previously forced
  `Content-Type: application/json` and stringified the body).

### Order cancellation (soft)
- `cancelled` is a new **terminal** status. Nothing is ever deleted: the order,
  its payments and its full status history all stay. Reached from any
  non-collected status via `POST /api/orders/[id]/cancel` (a POST, not a
  DELETE — "delete" is the mental model that makes people expect a row to
  vanish).
- Money semantics: `outstanding` is forced to `0` and any amount already
  collected is surfaced as **`refundDue`** (informational only — returning cash
  stays a manual step the mill handles offline). Tracked in reports as
  `refundPending`, deliberately outside `outstanding` so a voided order can
  never inflate what a customer supposedly owes.
- A paid order **can** be cancelled; a `collected` one cannot. Duplicate cancels,
  further payments, edits, and forward transitions are all rejected, and the
  customer is notified (`orderCancelled`) with an `order.cancel` audit row.
- **Cancelled tab inside `/owner/queue`** (not a new nav item): these are not
  work to be done but they ARE the mill's record of cash it is holding, so it
  reuses `PaymentsPanel` with a new `cancelledOnly` mode — retained receipt
  trail, refund figure, cancellation time and reason, CSV/print, and no
  "Collect Payment" button. The tab header shows the total refund pending.
- Cancelled orders drop out of the live queue, the dashboard's "new today" and
  the report's charge/activity figures, but stay in the customer portal (badge,
  reason, refund note) and on the printed पावती (CANCELLED banner + Refund Due).
- Demo seed gains a fully-paid cancelled order so the refund path is visible in
  demo data.

### Fixes found while testing
- `Settings.upiQr` was declared as a nested sub-schema, which made assigning
  `null` fail validation and **broke every settings save** once the field
  existed. It is now `Schema.Types.Mixed` (opaque base64 + metadata, nothing to
  validate).
- Client components imported `OrderStatus`/`ORDER_LIFECYCLE_STATUSES` from
  `src/models/Order.ts`, dragging mongoose into the **browser bundle** and
  failing the production build. The vocabulary now lives in a mongoose-free
  `src/lib/order-status.ts`, re-exported by the model.
- `cancelOrderSchema.reason` capped at 200 while the dialog's textarea allowed
  280 — the UI would accept a reason the API then rejected. Both are 280.
- **The test suite destroyed the owner's live UPI QR.** Section 23 wrote to the
  single global settings document and asserted "a rejected upload left nothing
  behind", which silently assumed the mill started with no QR configured. With a
  real bank QR in place the suite overwrote it with its 2×2 test PNG and then
  deleted it. The section now snapshots `upiQr` / `upiId` / `millName` first,
  runs from a known-empty slate, and restores the owner's originals byte for
  byte at the end — with an assertion that the restore actually happened.

### Tests
- `scripts/test-db-roundtrip.ts` section 23 (32 assertions): UPI id validation,
  the anonymous-QR 401, SVG refusal, the 1 MB 413, "a rejected upload left
  nothing behind", upload → byte identity of the stored `data:` URL and of the
  served response, re-upload replaces, idempotent delete; and for cancellation:
  a paid order cancels, `refundDue = paidAmount` with `outstanding = 0`, the
  payment trail retained, `status` + `cancelledAt` + reason + a `cancelled`
  `statusHistory` entry, the customer notified, the audit row written, duplicate
  cancel / further payment / forward transition all rejected with the document
  untouched, exclusion from the live queue, presence in the Cancelled list with
  payments intact, the reports ledger delta, and a collected order refusing to
  cancel.
- **161 passed, 0 failed** (was 129). Self-cleaning verified independently: no
  leaked `order.cancel` / `settings.upiQr.*` audits, no leaked orders or
  notifications, settings document restored, orderId counter re-synced.
- Ops note: the suite uses 9 of the 10 owner logins per 15 min per IP, so
  restart the dev server between runs.

## [0.10.2] - 2026-09-27 — Security & correctness hardening pass

Thirteen verified defects fixed across auth, output handling, UI consistency and
repo hygiene. No schema migration, no data rewrite — every change is additive
or a pure refactor.

### Security
- **Route-level auth on the data GETs.** `GET /api/orders`, `GET /api/customers`,
  `GET /api/owner/reports` and `GET /api/owner/reports/export` authenticated only
  inside the service layer. They now call `requireSession("owner")` at the route
  boundary, so a refactor that drops a service guard cannot silently open them.
- **Export authenticates before validating.** `/api/owner/reports/export` checked
  `?section=` first, so an anonymous caller could distinguish a valid section from
  an invalid one and enumerate the section list. Guard now runs first.
- **CSV formula-injection guard** (`src/lib/csv.ts`). A customer name or note
  beginning with `= + - @` is exported verbatim and opened in Excel, where it
  executes. Such cells are now prefixed with `'`. Numbers are passed through
  untouched.
- **Customer search no longer interpolates raw input into `$regex`.** A query of
  `.*` matched every customer (and a crafted pattern could throw or be slow).
  Input is now regex-escaped.
- **Customer login gets an IP-only bucket checked *before* the body is read.** The
  per-`mobile` bucket is keyed on client-supplied input, so a spray across many
  mobiles never touched a shared counter. New `customerLoginIp` limit (40 / 15 min
  per IP) bounds total attempts from one source.
- **Owner mutations are rate-limited per area.** A single `owner-mutation:<ip>`
  counter (120/hr) meant a busy queue could exhaust the whole budget and lock the
  owner out of unrelated screens — e.g. unable to take a payment. Split into
  `orders` / `payments` / `customers` / `settings` / `notifications` via
  `ownerMutationKey(area, ip)`.
- **Logout is audited with the real actor.** The audit row always recorded
  `actorId: null`. Logout now peeks the live session first (new `peekSession`) and
  records the owner/customer id, or `actorKind: "system"` when there was no
  session. Logout stays idempotent — signing out twice is still a 200.

### Removed
- **Dead-end customer PIN prompt.** The portal showed "Please set a new PIN" but no
  customer-facing PIN-change endpoint exists, so the banner could never be
  dismissed. Removed the banner and dropped `mustChangePin` from the customer DTOs
  (`/api/auth/me`, `/api/my/overview`). The model field and the owner's temp-PIN
  indicator are **kept** — the owner still issues and resets PINs; this only stops
  promising the customer an action the app does not support.

### Fixed
- **`--border-subtle` was never defined.** 26 elements across 13 files used
  `border-[var(--border-subtle)]`; with no definition the declaration was invalid
  and the border silently fell back to the browser default. Defined in `:root`
  (`#f3d5dc`, matching the existing hairline); dark mode already overrode per-usage.
- **7 hydration mismatches.** `OrderActionModal`, `QueuePanel`, `CustomerForm`,
  `CustomersPanel`, `PaymentEntry`, `DashboardAutoRefresh` and
  `DashboardQuickActions` each carried a private copy of a `useLang()` helper that
  read `document.cookie` in a `useState` initializer, so SSR (always `en`) and the
  first client render could disagree. All seven now take `lang` as a prop,
  threaded from the server's `getLang()` / `getEffectiveLang()` — matching the
  pattern `LanguageToggle` and `NewOrderForm` already used.
- **Inconsistent date rendering.** The same timestamp appeared as `5 Sept, 14:30`
  in one screen and `09/05/2026, 02:30:00 PM` in another, the CSV export hardcoded
  `en-IN` regardless of language, the dashboard clock hardcoded `en-IN` even in
  Marathi, and the customer list showed a date with no time. Added
  `formatDateTime` / `formatDateTimeFull` / `localeOf` to `@/lib/i18n/format`
  (split out of the server-only `i18n.ts`, which imports `next/headers` and
  therefore cannot be pulled into a client component) and routed all 15 call
  sites through them.
- **React list keys.** The multi-line intake form keyed its bag rows by array
  index while adding and removing rows by index, so deleting a row made React
  reuse the previous row's DOM and the field values appeared to shift into the
  wrong bag. Rows now carry a stable `id`.
- **Test cleanup silently did nothing.** Two `deleteMany` filters targeted a
  non-existent nested path (`"actor.actorId"`) while the model stores `actorId` as
  a top-level field, so every test run leaked audit rows. Fixed, and the suite is
  now verified self-cleaning (audit count identical before and after a run).

### Changed
- `src/models/Payment.ts` deleted. It was unreferenced, registered no collection
  (none exists in the DB), and declared a `PaymentMethod` of `upi | cash |
  settlement` that contradicted the real embedded `cash | upi` in `Order.ts` —
  a live footgun for anyone who imported it.
- `src/components/common/ComingSoon.tsx` deleted along with its barrel export;
  every page that used it now has a real implementation.
- `.gitignore` was a mix of ASCII and a UTF-16BE tail (with a stray NUL), which
  tooling read as binary. Now plain UTF-8; all rules verified intact.

### Tests
`scripts/test-db-roundtrip.ts` gains section 22 (**129 assertions, up from 113**):
route-level 401s for all four data GETs, guard ordering on the export,
formula-injection neutralisation in real CSV output (plus the number-vs-text
contract), literal `.*` search, and logout actor attribution/idempotency/revocation.

## [0.10.1] - 2026-09-22 — Order status timeline for customers

### Added
- **Progress tracker on every customer order card** (`OrderProgress`): a thin
  4-step bar — रांगेत → दळण सुरू → तयार → घेतले — filled up to the current
  step, the current one highlighted, and a live "Currently: …" caption. Tapping
  **View times** expands a vertical timeline showing the timestamp of every
  reached step (or "वेळ माहित नाही / time n/a" when a step was provably reached
  but has no stored time).
- **Durable per-step timestamps**: `Order.statusHistory: {status, at}[]` written
  atomically — `[pending, now]` at intake (`createOrder` + every `createOrders`
  batch line) and the next step appended inside the same single `doc.save()` as
  the transition, so status, payment, balance and history can never disagree.
  Exposed to the customer via `OrderView.statusHistory` / `/api/my/overview`.
- **Migration** `npm run backfill-status`: idempotent backfill for orders placed
  before this shipped. Synthesizes the provable timeline — `pending@createdAt` +
  current status @ `updatedAt` — and skips rows that already have history
  (`src/lib/order-status-history.ts`, shared by the script and the test).
- Demo seed scenarios now carry matching `statusHistory` so sampled orders show a
  complete timeline.

### Tests
- Section 21 (12 assertions): pending step seeded at intake (+ per batch line),
  strict ascending steps across a full lifecycle, last step == `updatedAt`
  (single atomic write), legacy-row stripping + backfill → `[pending@created,
  current@updated]`, re-run is a no-op, and the customer overview DTO exposing
  per-step times. **Now 113/113 passing.**

## [0.10.0] - 2026-09-22 — Secure read-only customer portal

### Added
- **Customer dashboard** (`/my`, was the Coming Soon stub): a real page now —
  greeting with the customer's name, `mustChangePin` temp-PIN banner, three stat
  cards (Total Outstanding Due / Active Orders / Unread Notifications) and two
  panels: the **notifications inbox** and the **order tracker**. Fully bilingual
  (mr/en) via server-side `getLang()`.
- **Notifications inbox**: every row shows its type label + translated message;
  tapping a row marks it read; a **Mark all as read** button clears the rest.
  Unread count is a live badge in the panel and the stat card.
- **Order tracker**: per-order cards with token number, status badge, grain ·
  size · weight · rate, Total / Paid / Due, and an expandable **Payment history**
  (cash/UPI, txn id, date) — no re-entering his उधारी figure, it's the same
  `OrderView.outstanding` math the owner side shows.
- **Targeted owner messaging**: the Notifications composer gained an audience
  picker — **All active customers** (fan-out) or **Specific customers**
  (multi-select from the active list). Each recipient gets one *private* row;
  no customer ever sees who else was messaged or any balances.
  `sendCustomersMessage()` (dedupe, honours the in-app switch),
  `broadcastNotificationSchema` accepts optional `customerIds` (max 200,
  24-hex), the broadcast route audits `{customers: count, lang, targeted,
  message}`, and `/owner/notifications` now pages the active customer list to
  the composer.
- **Customer APIs** (all session-scoped — the customer id NEVER comes from the
  URL or body, so there is **no IDOR surface**): `GET /api/my/overview`
  (`getCustomerDashboard`), `PATCH /api/my/notifications/[id]/read` and
  `PATCH /api/my/notifications/read-all`. The single-notification route always
  answers 200 (no existence oracle) and only ever touches a row whose
  `customerId` matches the session; read actions are CSRF'd + rate-limited on a
  `customer-mutation:<ip>` bucket + audited (`notification.read`,
  `notification.read.noop`, `notification.readAll`).
- **Login hardening for PIN customers**:
  - **Progressive lockout**: 5 wrong PINs lock the account (15-minute base,
    doubling per round); the lock is persisted (`lockedUntil`), cleared on a
    correct PIN, and enforced before verification → `429 ACCOUNT_LOCKED`.
    Attempts are counted in `failedPinAttempts` on the Customer doc.
  - **Timing equalization**: unknown mobiles verify against a real Argon2 dummy
    hash (`verifyAgainstDummy`) so response time never reveals whether an
    account exists; status codes stay uniform `401 INVALID_CREDENTIALS`.
  - **`TRUST_PROXY` env flag**: `clientIp` only trusts `x-forwarded-for` when
    the app runs behind a trusted proxy (default `false`), so a directly-exposed
    app can't have its rate buckets spoofed.
  - **Idle timeout**: sessions die after `SESSION_IDLE_TTL` seconds of
    inactivity (default 1800, `0` disables) — `Session.lastUsedAt` is tracked and
    only written at most every 60s; an idle session is revoked → 401.
  - **Deactivation gate**: flipping a customer inactive revokes their session on
    the very next request (checked in `requireSession`, not just at login) and
    the same check runs at login → `403 ACCOUNT_INACTIVE`.

### Changed
- **Latent i18n bug fixed**: stored notification messages were often raw
  `notif.*` keys because those keys were missing from the dictionary. Added
  bilingual `notif.*` + new `cust.*` entries, so inbox rows are real sentences
  in the customer's language (test asserts no message starts with `notif.`).
- `AppError` fix: constructor is 3 args (status, message, code); a lockout throw
  was passing a 4th arg and would have been `500 INTERNAL`.
- `sendCustomersMessage` / `notifyCustomer` now build recipient ObjectIds via
  `new Types.ObjectId(s)` (value import fix — was `ObjectId` type-only).
- Owner `OrderActionModal` double-encoding fixed (`body: payload`, `apiFetch`
  already JSON-stringifies) — status transitions were silently failing with
  `400 Invalid input`.

### Tests
- `scripts/test-db-roundtrip.ts` grew a **section 20 — customer portal +
  hardening** (26 new assertions): own-scope overview, translated-notification
  check, target-only broadcast + recipient isolation, cross-customer read no-op,
  mark-one/read-all unread math, unknown-mobile 401, PIN lockout (5 fails →
  `429 ACCOUNT_LOCKED` + persisted `lockedUntil`), idle-timeout 401, and
  deactivation 401. Full self-cleanup of customers, sessions, orders,
  notifications and audits. **Now 101/101 passing.**

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