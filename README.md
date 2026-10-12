# Flour Mill

A bilingual (मराठी / English) order, payment and outstanding-dues manager for a
small flour mill. The owner runs the whole business from a single console, and
customers log in with a PIN to a mobile-first portal that is **installable as an
app** on Android (and iOS) — see [Install as an app](#install-as-an-app).

**Current version:** `0.12.0` (see [`CHANGELOG.md`](./CHANGELOG.md)) ·
**Master plan:** [`PLAN.md`](./PLAN.md)

---

## Features

**Owner console** (`/owner`)

- **Dashboard** — live business summary, उधारी shortcuts, grain breakdown
- **Customers** — create / edit, temporary PIN + forced reset, activate & deactivate
- **New Order** — multi-line intake (one customer, up to 20 grain bags) with an
  optional cash/UPI advance; one submit creates N orders with consecutive numbers
- **Queue** — `pending → processing → completed → collected`, strictly
  forward-only, plus a **Cancelled tab** (soft-cancel history with the retained
  receipt trail and any refund due)
- **Payments hub** — record receipts on *any* order (including already-collected
  ones settling their उधारी), per-order receipt history, CSV + Print/PDF export
- **Outstanding / उधारी** — who owes what, filtered per customer
- **Notifications** — broadcast an in-app message to every active customer
- **Reports** — period business summary, grain breakdown, cash-vs-UPI split,
  customer dues ledger, receipts. CSV download (Excel-safe UTF-8 BOM) and
  Print/Save-as-PDF
- **Printable पावती** — one-page customer receipt (`/print/receipt/<orderNo>`)
- **Settings** — mill profile, rate grid, notification preferences, security tab
  (password change + optional TOTP 2FA), and **UPI payments**: one mill-wide QR
  image (PNG/JPEG/WEBP, ≤ 1 MB, stored and served byte-for-byte with no
  re-encoding) plus a format-checked UPI ID, shown to every customer

**Customer portal** (`/my`) — secure, read-only, fully wired

- PIN login (Argon2id) with progressive lockout, idle-timeout and a
  deactivation gate; unknown mobiles return an identical 401 so accounts
  cannot be enumerated
- Bilingual header, language toggle, logout
- Greeting, a **tappable "what you owe" card**, and two side-by-side counts
  (Active Orders / Unread) — laid out for a phone first
- **Pay panel** — opened from the due card: the mill's UPI QR and a copyable UPI
  ID, with a note that the mill confirms the payment
- **Notifications inbox** — tap-to-mark-read, mark-all, live unread badge
- **Order tracker** — token, grain · size · weight · rate, a single line of
  coloured status words (`रांगेत · दळण सुरू · तयार · घेतले`) with the reached step
  highlighted, and an expandable Details section holding the per-step timestamps
  and the payment history
- Cancelled orders stay visible here with their reason and any refund due
- Every customer endpoint is session-scoped — the customer id is never taken
  from the URL or body, so there is no IDOR surface
- PINs are issued and reset **by the owner**; the portal deliberately has no
  self-service PIN change (an earlier "Please set a new PIN" banner pointed at
  a screen that did not exist and has been removed)

**Security (implemented)**

- Argon2id password & PIN hashing
- DB-backed, revocable sessions (14-day absolute expiry + configurable idle
  timeout) · httpOnly + Secure + `__Host-` + SameSite=Lax cookies
- Route-level `requireSession` on every data endpoint, so an anonymous caller
  is rejected before any service code runs
- Signed double-submit CSRF on every mutating route
- Zod validation on all inputs · 64 KB body cap · Mongoose ODM (no injection)
- Regex-escaped search input; rate limits split per area (a busy screen can't
  lock the owner out of an unrelated one) and an IP-only ceiling on customer
  login applied before the request body is read
- CSV exports neutralise leading `= + - @` so a customer-supplied name can't
  execute as a spreadsheet formula

- Per-IP rate limiting (10 logins / 15 min, 120 mutations / hour)
- Security headers: CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer &
  Permissions Policy · `X-Powered-By` disabled
- Append-only audit log (logins, orders, payments, settings, 2FA, broadcasts)
- Optional owner TOTP 2FA

---

## Tech stack

Next.js 16 (App Router, `proxy.ts` middleware) · React 19 · TypeScript ·
Mongoose 9 / MongoDB · Zod · Argon2id · otplib (TOTP) · Tailwind CSS 4

---

## Prerequisites

- **Node.js 20+** (developed & tested on v22)
- **MongoDB 7+** running on `127.0.0.1:27017`
- npm (comes with Node)

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Environment
cp .env.example .env.local
#    then edit .env.local — at minimum set a strong OWNER_PASSWORD and SESSION_SECRET

# 3. Start MongoDB (assumes a user-space install at ~/mongodb — see scripts/mongo-start.sh)
npm run mongo

# 4. Create the owner account from .env.local (safe to re-run; skips if it exists)
npm run seed

# 5. Run the dev server
npm run dev
```

Open **http://localhost:3000** → landing page with **Owner Login** and
**Customer Login**.

### Development credentials

Owner login uses `OWNER_EMAIL` / `OWNER_PASSWORD` from `.env.local`:

```
owner@example.com  /  spartan1234      (local dev default — change it)
```

New customers are created by the owner in **Customers**; the temporary PIN is
`mustChangePin`-flagged and shown in the UI on first login.

---

## Environment variables

| Key | Required | Default | Purpose |
|---|---|---|---|
| `MONGODB_URI` | ✅ | — | e.g. `mongodb://127.0.0.1:27017/flour_mill_mgmt` |
| `SESSION_SECRET` | ✅ | — | Long random string; signs the CSRF token |
| `OWNER_EMAIL` | ✅ | `owner@example.com` | Owner login (used by `npm run seed`) |
| `OWNER_PASSWORD` | ✅ | — | Initial owner password (min 8 chars) |
| `OWNER_NAME` | — | `Mill Owner` | Display name |
| `SESSION_TTL` | — | `1209600` (14 days) | Session lifetime in seconds |
| `NEXT_PUBLIC_APP_URL` | — | `http://localhost:3000` | Canonical app URL |
| `AUTH_COOKIE_SECURE` | — | *(auto)* | `true`/`false` forces the cookie `Secure` + `__Host-` prefix. Unset = auto (Secure only when prod **and** the URL is `https:`) |

See [`.env.example`](./.env.example). `.env*` is git-ignored — never commit real values.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server on `:3000` |
| `npm run build` | Production build (requires the dev server to be **stopped**) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type-check |
| `npm test` | Full DB round-trip test (see notes below) |
| `npm run seed` | Create/refresh the owner account from `.env.local` |
| `npm run seed:demo` | Seed demo orders/customers |
| `npm run icons` | Regenerate the PWA icon set in `public/icons/` from `scripts/generate-icons.mjs` |
| `npm run mongo` / `npm run mongo:stop` | Start / stop the local MongoDB daemon |

---

## Testing

```bash
npm test
```

`scripts/test-db-roundtrip.ts` drives the **live stack over HTTP** and then
**restores the DB** (deletes everything it created). Current status: **75/75
assertions passing.**

Requirements before a run:

1. Dev server running on `http://localhost:3000`
2. MongoDB running on `27017`
3. Owner account has **2FA OFF** (the harness owns the whole 2FA lifecycle)
4. The login rate bucket must be clear — `npm test` uses ~8 logins; **restart the
   dev server** beforehand if you've logged in recently, otherwise you'll hit a
   429. Restarting the dev server also clears the in-memory rate limiter.

Covers: advance-on-create, UPI validation, over-payment rejection, payments on
live *and* collected orders, single-write transition invariant, multi-line batch
intake, settings/password/2FA lifecycle, broadcast fan-out, audit trail, and
reports/CSV export.

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                  Landing (owner / customer login links)
│   ├── owner/                    Owner console (console-gated)
│   │   ├── customers/ queue/ new-order/ payments/ outstanding/
│   │   ├── notifications/ reports/ settings/
│   │   └── page.tsx              Dashboard
│   ├── my/                       Customer portal
│   ├── print/receipt/[id]/       Printable पावती
│   └── api/
│       ├── auth/                 login, logout, me, 2FA, change-password
│       ├── orders/               orders + status/payment transitions
│       ├── customers/            owner CRUD
│       ├── owner/                settings, reports, broadcast, reports/export
│       ├── csrf/  health/
│       └── dev/seed-demo/        dev-only (404s in production)
├── components/
│   ├── owner/  common/  auth/
├── services/                     Business logic (authService, orderService, …)
├── models/                       Mongoose schemas
├── lib/                          env, db, http, csrf, rate-limit, audit,
│                                 validation, csv, i18n, auth/*
│   └── proxy.ts                  Middleware (optimistic cookie guard)
└── lib/http/client.ts            Client fetch wrapper (CSRF + session-expiry)
scripts/
├── seed-admin.mjs                Owner bootstrap
├── seed-demo-orders.ts           Demo data
├── test-db-roundtrip.ts          Integration test
└── mongo-start.sh / mongo-stop.sh
```

---

## URL map

| Path | Who | Notes |
|---|---|---|
| `/` | — | Landing |
| `/login` | Owner | Email + password (+ 6-digit TOTP if enabled) |
| `/owner/*` | Owner | Console (sidebar nav) |
| `/my/login` | Customer | Mobile + 4-digit PIN |
| `/my` | Customer | Their orders & balance |
| `/print/receipt/<orderNo>` | Owner | Printable receipt (session-guarded) |
| `/api/*` | — | JSON endpoints — all mutations require a valid CSRF token |

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Android never offers "Install app" | Android requires **HTTPS** (`localhost` is exempt). A phone on a LAN `http://` address will never see it — use `cloudflared tunnel --url http://localhost:3000` or a real HTTPS deploy. Also check `curl localhost:3000/manifest.webmanifest` returns JSON. |
| Dev server crashes with an error overlay during/after a build | **Never run `npm run build` while `npm run dev` is up** — both write `.next`. Stop the dev server, build, then restart it. |
| `429 Too many attempts` at login | The in-memory rate bucket is full. Restart the dev server (`npm run dev`) to clear it. |
| Redirected to login with the "session expired" banner right after enabling 2FA or changing the password | Expected — both actions revoke your other sessions by design. Log in again. |
| `Error: connect ECONNREFUSED 127.0.0.1:27017` | Start MongoDB: `npm run mongo` |
| Blank page / CSP violations in a **production** build | Fixed in `0.12.0` — the policy now allows the inline RSC bootstrap. Rebuild before debugging. |
| Cookies keep you "signed out" between modes | Set `AUTH_COOKIE_SECURE` explicitly if you mix `next dev` and `next start` across different protocols. |

---

## Before going live

- [ ] Set a fresh strong `SESSION_SECRET` and `OWNER_PASSWORD`
- [ ] Point `MONGODB_URI` at a backed-up cloud database
- [ ] Set `NEXT_PUBLIC_APP_URL` to your `https://` domain
- [ ] Enable owner 2FA from **Settings → Security**
- [x] Verify the production CSP doesn't block hydration (done in `0.12.0`)
- [ ] Confirm "Install app" appears on a real Android phone over HTTPS
- [ ] Harden auth: customer PIN lockout, trusted-proxy IP, enforced PIN change

---

## Install as an app

The customer portal is a web app manifest, so on **Android** a customer opens
`/my` in Chrome and uses the browser menu → **Install app** / **Add to home
screen**. It installs as a standalone window titled **Girani** with the mill's
wheat-ear icon — no browser address bar.

Scope is the customer portal only (`/my`, which includes `/my/login`). The owner
console is not part of the installed app.

Requirements and caveats:

- **HTTPS is mandatory** outside `localhost`. On a LAN `http://` address Android
  silently never shows the prompt.
- There is deliberately **no service worker**, so the app needs a connection.
  That is also what keeps one customer's data from being cached on a shared
  phone. Web push is the remaining piece that needs one.
- To test on a phone without deploying: `cloudflared tunnel --url http://localhost:3000`.
- iOS: Safari → Share → **Add to Home Screen**.

---

## Roadmap

See [`CHANGELOG.md`](./CHANGELOG.md) for what's shipped. Planned next:

- Customer dashboard with **real data** (orders, payments, live balance) +
  notifications **inbox** (mark-read API/UI already exist)
- **Web push** — the app is now installable (manifest + icons ship in `0.12.0`);
  push notifications need a service worker, which is the remaining piece
- SMS (MSG91) / WhatsApp (Meta) — phase 2

## License

Private / unlicensed — for the mill's own use.
