# Flour Mill — project memory

Bilingual (Marathi + English) web app for a village flour mill (चक्की). Customers
bring grain, the mill grinds it, and money moves as cash, UPI or उधारी (credit).
Two sides: an owner console and a phone-first customer portal.

Current version: `0.15.1` (see `CHANGELOG.md` for the full history).

## Stack

Next.js 16 (App Router, `src/app`) · React 19 · TypeScript · Tailwind v4 ·
MongoDB via Mongoose · Argon2 for PIN/password hashing · PWA (installable).

Next 16 renamed `middleware` to `proxy` (`src/proxy.ts`); other APIs differ from
older versions too — see the generated note at the end of this file.

## Commands

```
npm run dev        # dev server (localhost:3000)
npm run build      # production build — do NOT run while dev is up, both write .next
npm run lint       # eslint
npm test           # DB round-trip suite, ~200 assertions, needs dev server + MongoDB
npm run seed       # create the owner account from .env.local
npm run seed:demo  # demo customers + orders
npm run icons      # regenerate PWA icons from the wheat-ear vector source
```

Before saying work is done: `npm run lint`, `npx tsc --noEmit -p .`, `npm run build`.

## Layout

- `src/app/owner/*` — owner pages: dashboard, customers, new-order, queue,
  payments, outstanding, notifications, reports, settings, `orders/[id]`
- `src/app/my/*` — customer portal
- `src/app/api/*` — route handlers (zod-validated, CSRF + rate-limited + audited)
- `src/services/*` — all business logic and DB access; routes stay thin
- `src/components/{owner,customer,common,auth,landing}/*`
- `src/lib/` — `brand.ts` (APP_NAME), `i18n/` (dict + formatting), `validation.ts`,
  `rate-limit.ts`, `csv.ts`, `millings.ts` (grains, sizes, default rates)
- `scripts/test-db-roundtrip.ts` — the test suite, self-cleaning (restores the DB)

## Domain rules that matter

- Order lifecycle: `pending → processing → completed → collected`, plus
  `cancelled` as a terminal off-ramp (never a step; shown in slate, never red).
  In Marathi: रांगेत → दळण सुरू → तयार → घेतले.
- `Order.statusHistory` records each step's timestamp; status + payment +
  balance + history are written in ONE `doc.save()` so they can never disagree.
- `paidAmount` must always equal the sum of `payments[]`. Over-payment and
  UPI-without-transaction-id are rejected with 400.
- A cancelled order reports `outstanding: 0`; its cash shows as `refundDue`.
- Payment reminders (`reminderService`) recompute amounts server-side and skip
  anyone reminded in the last 6 hours.
- Customer APIs are 100% session-scoped — an id never comes from the URL or body.

## Design

"Chakki" theme in `src/app/globals.css`: flour-cream ground, terracotta `clay`
brand, `haldi` (pending) / `neel` (milling) / `leaf` (ready, paid) / warm `earth`
neutrals. Fonts: Eczar for headings and rupee figures, Anek Devanagari for UI.
Flat — no gradients or glows. Dark mode is warm brown, not cold grey.

Rules: Marathi first, bilingual as `मराठी / English`. Money as `₹ 12,450`.
No emoji in the UI — use the drawn icons in `src/components/common/Icons.tsx`.
Component classes (`stitch-card`, `stitch-btn-primary`, `stitch-input`) live in
`@layer components` so utilities still win.

## Gotchas

- `npm test` exhausts the login rate bucket (10 per 15 min per IP); restart the
  dev server afterwards.
- The owner's DB must start a test run with 2FA OFF — the suite owns that cycle.
- Opening the dev server from a phone or another PC needs the host allowed in
  `allowedDevOrigins` (`next.config.ts` already covers LAN ranges and `*.local`;
  anything else goes in `DEV_ALLOWED_ORIGINS`). Without it the page loads but
  never hydrates, so every button does a native form submit and reloads the page.
- Never read `document.cookie` in a `useState` initializer — pass `lang` and
  `theme` down from the server instead, or you get a hydration mismatch.
- `public/landing/hero.{webm,mp4,jpg}` drives the landing hero; delete those
  files and the drawn animated chakki (`MillIllustration`) takes over.

## Still open

- Notifications are in-app only; SMS/WhatsApp are stubbed for a later phase.
- No web push (would need a service worker).
- The landing hero clip has English text baked into it, so its cards stay English
  even in Marathi mode; the page hides its own bilingual cards while a clip is used.

## Team

Built as a team project by Vaishnavi Bharambe, Nikhil Raghuwanshi, BroccoliSnivy
and Shital Kalekar.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
