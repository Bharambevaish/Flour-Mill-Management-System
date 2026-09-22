# गिरणी व्यवस्थापन — Flour Mill Management

A bilingual (मराठी / English) order, payment and outstanding-dues manager for a
small flour mill. The owner runs the whole business from a single console, and
customers can log in with a PIN (their dashboard is still a stub — see below).

**Current version:** `0.9.0` (see [`CHANGELOG.md`](./CHANGELOG.md)) ·
**Master plan:** [`PLAN.md`](./PLAN.md)

---

## Features

**Owner console** (`/owner`)

- **Dashboard** — live business summary, उधारी shortcuts, grain breakdown
- **Customers** — create / edit, temporary PIN + forced reset, activate & deactivate
- **New Order** — multi-line intake (one customer, up to 20 grain bags) with an
  optional cash/UPI advance; one submit creates N orders with consecutive numbers
- **Queue** — `pending → processing → completed → collected`, strictly forward-only
- **Payments hub** — record receipts on *any* order (including already-collected
  ones settling their उधारी), per-order receipt history, CSV + Print/PDF export
- **Outstanding / उधारी** — who owes what, filtered per customer
- **Notifications** — broadcast an in-app message to every active customer
- **Reports** — period business summary, grain breakdown, cash-vs-UPI split,
  customer dues ledger, receipts. CSV download (Excel-safe UTF-8 BOM) and
  Print/Save-as-PDF
- **Printable पावती** — one-page customer receipt (`/print/receipt/<orderNo>`)
- **Settings** — mill profile, rate grid, notification preferences, security tab
  (password change + optional TOTP 2FA)

**Customer portal** (`/my`) — *basic stub for now*

- PIN login, bilingual header, language toggle, logout
- "Please set a new PIN" notice for fresh accounts (`mustChangePin`)
- Outstanding + order list placeholders — **not yet wired to real data**
  (planned: order/payment history and live balance)

**Security (implemented)**

- Argon2id password & PIN hashing
- DB-backed, revocable sessions (14-day absolute expiry) · httpOnly + Secure +
  `__Host-` + SameSite=Lax cookies
- Signed double-submit CSRF on every mutating route
- Zod validation on all inputs · 64 KB body cap · Mongoose ODM (no injection)
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
| Dev server crashes with an error overlay during/after a build | **Never run `npm run build` while `npm run dev` is up** — both write `.next`. Stop the dev server, build, then restart it. |
| `429 Too many attempts` at login | The in-memory rate bucket is full. Restart the dev server (`npm run dev`) to clear it. |
| Redirected to login with the "session expired" banner right after enabling 2FA or changing the password | Expected — both actions revoke your other sessions by design. Log in again. |
| `Error: connect ECONNREFUSED 127.0.0.1:27017` | Start MongoDB: `npm run mongo` |
| Blank page / CSP violations in a **production** build | The CSP in `next.config.ts` is production-only and currently lacks a nonce — see `CHANGELOG.md` / issues before going public. |
| Cookies keep you "signed out" between modes | Set `AUTH_COOKIE_SECURE` explicitly if you mix `next dev` and `next start` across different protocols. |

---

## Before going live

- [ ] Set a fresh strong `SESSION_SECRET` and `OWNER_PASSWORD`
- [ ] Point `MONGODB_URI` at a backed-up cloud database
- [ ] Set `NEXT_PUBLIC_APP_URL` to your `https://` domain
- [ ] Enable owner 2FA from **Settings → Security**
- [ ] Verify the production CSP doesn't block hydration (see Troubleshooting)
- [ ] Harden auth: customer PIN lockout, trusted-proxy IP, enforced PIN change

---

## Roadmap

See [`CHANGELOG.md`](./CHANGELOG.md) for what's shipped. Planned next:

- Customer dashboard with **real data** (orders, payments, live balance) +
  notifications **inbox** (mark-read API/UI already exist)
- PWA installable + web push
- SMS (MSG91) / WhatsApp (Meta) — phase 2
- Security hardening tier (see PLAN.md §6)

## License

Private / unlicensed — for the mill's own use.
