import { existsSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { BrandMark, IconArrowRight, IconBell, IconCheck, IconPhone, IconPrinter, IconClock } from "@/components/common";
import { getLang } from "@/lib/i18n/i18n";
import { GRAINS, SIZES, grainLabel, sizeLabel } from "@/lib/millings";
import { APP_NAME } from "@/lib/brand";
import { getSettingsOrDefault, type SettingsView } from "@/services/settingsService";
import { LandingNavLanguageToggle, CustomerTrackForm } from "@/components/landing/LandingClientComponents";
import { MillIllustration } from "@/components/landing/MillIllustration";

export const dynamic = "force-dynamic";

/**
 * Public landing page.
 *
 * Every claim here is something the app really does today, and the rates,
 * phone and address come straight from the owner's Settings — so the page is
 * always the mill's own, current information. Earlier copy advertised scale
 * sync, biometrics, SMS/WhatsApp alerts and OTP login, none of which exist;
 * keep it honest: when a feature ships, add it here, not before.
 */

type L = { mr: string; en: string };

const COPY = {
  tagline: { mr: "दळण · उधारी · पावती", en: "Milling · Dues · Receipts" },
  ownerLogin: { mr: "मालक लॉगिन", en: "Owner login" },
  customerLogin: { mr: "ग्राहक लॉगिन", en: "Customer login" },
  headline: { mr: "माझं दळण झालं का?", en: "Is my flour ready?" },
  headline2: { mr: "आता फोन करायची गरज नाही.", en: "No more calling to find out." },
  lead: {
    mr: "धान्याचं वजन, दळणाची स्थिती आणि किती पैसे बाकी आहेत — सगळं तुमच्या मोबाईलवर. माल तयार झाला की लगेच सूचना.",
    en: "Your grain's weight, where it is in the mill and what you still owe — all on your phone, with a notice the moment it's ready.",
  },
  trackLabel: { mr: "तुमचा मोबाईल नंबर टाका", en: "Enter your mobile number" },
  trackHint: { mr: "पुढच्या पानावर फक्त तुमचा ४ अंकी पिन टाका.", en: "Then just your 4-digit PIN on the next screen." },
  grainsTitle: { mr: "आम्ही दळतो", en: "We mill" },
  howTitle: { mr: "कसं चालतं", en: "How it works" },
  howSub: { mr: "तीन सोप्या पायऱ्या — गिरणीवर आणि तुमच्या फोनवर.", en: "Three simple steps — at the mill and on your phone." },
  phoneTitle: { mr: "तुमच्या फोनवर असं दिसतं", en: "What you see on your phone" },
  phoneSub: {
    mr: "ॲप उघडताच पहिली गोष्ट: तुमचा माल कुठे आहे आणि किती पैसे बाकी आहेत.",
    en: "The first thing you see: where your grain is, and what's left to pay.",
  },
  ratesTitle: { mr: "दळणाचे दर", en: "Milling rates" },
  ratesSub: { mr: "प्रति किलो, आकारानुसार. एकूण रक्कम आपोआप मोजली जाते.", en: "Per kg, by fineness. Your total is worked out for you." },
  ownerTitle: { mr: "गिरणी मालकांसाठी", en: "For the mill owner" },
  ownerBody: {
    mr: "नवीन ऑर्डर नोंदवा, दळण्याची रांग सांभाळा, रोख / UPI जमा नोंदवा, उधारीची आठवण पाठवा आणि रोजचा हिशोब एका नजरेत पहा.",
    en: "Take in orders, run the milling queue, record cash / UPI, send payment reminders and see the day's accounts at a glance.",
  },
  contactTitle: { mr: "गिरणीशी संपर्क", en: "Visit or call the mill" },
  call: { mr: "कॉल करा", en: "Call" },
  ctaTitle: { mr: "तुमचा माल कुठपर्यंत आला?", en: "Where's your grain right now?" },
  ctaBody: { mr: "मोबाईल नंबर आणि पिनने लॉगिन करा.", en: "Log in with your mobile number and PIN." },
} satisfies Record<string, L>;

const STEPS: { title: L; body: L; icon: "sack" | "mill" | "receipt" }[] = [
  {
    icon: "sack",
    title: { mr: "माल आणा", en: "Bring your grain" },
    body: {
      mr: "धान्याचं वजन (किलो), प्रकार आणि बारीक / मध्यम / खडबडीत — सगळं नोंदवलं जातं. तुम्हाला ऑर्डर क्रमांक मिळतो.",
      en: "Weight in kg, the grain and the fineness you want are recorded. You get an order number.",
    },
  },
  {
    icon: "mill",
    title: { mr: "स्थिती पहा", en: "Watch it move" },
    body: {
      mr: "रांगेत → दळण सुरू → तयार. प्रत्येक बदल फोनवर दिसतो; माल तयार झाला की सूचना येते.",
      en: "Queued → milling → ready. Every step shows on your phone, with a notice when it's ready.",
    },
  },
  {
    icon: "receipt",
    title: { mr: "हिशोब साफ", en: "Settle up" },
    body: {
      mr: "रोख किंवा UPI ने पैसे भरा. एकूण, जमा आणि बाकी उधारी — सगळं स्पष्ट, पावतीसह.",
      en: "Pay by cash or UPI. Total, paid and what's left — all clear, with a receipt.",
    },
  },
];

const PHONE_POINTS: L[] = [
  { mr: "एकूण उधारी सगळ्यात वर, मोठ्या अक्षरात", en: "Your total due, big, right at the top" },
  { mr: "माल तयार झाला की हिरवी सूचना", en: "A green notice the moment it's ready" },
  { mr: "प्रत्येक ऑर्डरची पावतीसारखी स्लिप", en: "A receipt-like slip for every order" },
  { mr: "UPI ने भरलं? एका टॅपमध्ये कळवा", en: "Paid by UPI? Tell the mill in one tap" },
];

export default async function Home() {
  const [lang, settings] = await Promise.all([getLang(), getSettingsOrDefault().catch(() => null)]);
  const tx = (l: L) => (lang === "mr" ? l.mr : l.en);
  const mr = lang === "mr";
  const millName = settings?.millName || APP_NAME;

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background text-foreground">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <BrandMark className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-display text-lg text-heading sm:text-xl">{APP_NAME}</span>
              <span className="block truncate text-xs text-muted">{tx(COPY.tagline)}</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <LandingNavLanguageToggle initialLang={lang} />
            <Link
              href="/login"
              className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-earth-700 transition-colors hover:bg-earth-100 hover:text-heading sm:inline-flex dark:text-earth-300 dark:hover:bg-earth-800"
            >
              {tx(COPY.ownerLogin)}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(var(--border-strong)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
          />
          <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-4 pb-12 pt-10 sm:px-6 md:grid-cols-[1.1fr_1fr] md:pb-20 md:pt-16 lg:gap-14">
            <div className="rise-in min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full border border-haldi-300 bg-haldi-50 px-3 py-1 text-sm font-semibold text-haldi-800 dark:border-haldi-800 dark:bg-haldi-950/60 dark:text-haldi-300">
                <span className="h-1.5 w-1.5 rounded-full bg-haldi-500" />
                {millName}
              </p>
              <h1 className="mt-4 text-[42px] leading-[1.06] text-heading sm:text-[54px] lg:text-[64px]">
                {tx(COPY.headline)}
                <span className="mt-1 block text-clay-700 dark:text-clay-400">{tx(COPY.headline2)}</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-earth-700 dark:text-earth-300">{tx(COPY.lead)}</p>

              <div className="mt-7 max-w-md rounded-2xl border border-[var(--border-subtle)] bg-surface p-4 shadow-soft">
                <label htmlFor="track-input" className="mb-2 block text-sm font-bold text-heading">
                  {tx(COPY.trackLabel)}
                </label>
                <CustomerTrackForm lang={lang} />
                <p className="mt-2 text-xs text-muted">{tx(COPY.trackHint)}</p>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <Link href="/my/login" className="inline-flex items-center gap-1.5 font-semibold text-clay-700 hover:underline dark:text-clay-400">
                  {tx(COPY.customerLogin)} <IconArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/login" className="inline-flex items-center gap-1.5 font-semibold text-earth-700 hover:underline dark:text-earth-300">
                  {tx(COPY.ownerLogin)} <IconArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[440px]">
              <HeroArt alt={mr ? "गिरणीत दळण सुरू आहे" : "Grain being milled at the mill"} />
              {/* floating "ready" toast, the moment the customer waits for */}
              <div className="float-bob absolute bottom-6 left-1 flex max-w-[230px] -rotate-2 items-start gap-2.5 rounded-xl border border-leaf-200 bg-surface p-3 shadow-elevated md:-left-6 dark:border-leaf-900">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-leaf-600 text-white">
                  <IconBell className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm leading-snug">
                  <span className="block font-bold text-leaf-800 dark:text-leaf-300">{mr ? "तुमचा माल तयार आहे" : "Your flour is ready"}</span>
                  <span className="text-xs text-muted">{mr ? "#12 · गहू · 25 kg" : "#12 · Wheat · 25 kg"}</span>
                </span>
              </div>
              <div style={{ animationDelay: "-2s" }} className="float-bob absolute right-1 top-8 rotate-3 rounded-xl border border-[var(--border-subtle)] bg-surface px-3 py-2 shadow-elevated md:-right-4">
                <span className="block text-[11px] font-semibold text-muted">{mr ? "शिल्लक बाकी" : "Balance due"}</span>
                <span className="font-display text-2xl leading-none text-clay-700 dark:text-clay-400">₹ 60</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Grain ribbon ── */}
        <section className="straw bg-clay-700 text-white dark:bg-clay-900">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 sm:px-6">
            <span className="text-sm font-semibold text-clay-100">{tx(COPY.grainsTitle)}</span>
            {GRAINS.filter((g) => g.key !== "other").map((g) => (
              <span key={g.key} className="inline-flex items-center gap-2 font-display text-xl">
                <WheatGlyph />
                {mr ? g.mr : g.en}
              </span>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <div className="max-w-xl">
            <h2 className="text-4xl text-heading">{tx(COPY.howTitle)}</h2>
            <p className="mt-2 text-lg text-earth-700 dark:text-earth-300">{tx(COPY.howSub)}</p>
          </div>
          <ol className="relative mt-10 grid gap-5 md:grid-cols-3">
            <span aria-hidden="true" className="absolute left-[16%] right-[16%] top-11 hidden border-t-2 border-dashed border-[var(--border-strong)] md:block" />
            {STEPS.map((s, i) => (
              <li key={i} className="relative rounded-2xl border border-[var(--border-subtle)] bg-surface p-6 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-clay-50 text-clay-700 ring-4 ring-background dark:bg-clay-950 dark:text-clay-400">
                    <StepIcon kind={s.icon} />
                  </span>
                  <span className="font-display text-5xl leading-none text-earth-200 dark:text-earth-800">
                    {mr ? ["१", "२", "३"][i] : i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-bold text-heading">{tx(s.title)}</h3>
                <p className="mt-2 leading-relaxed text-earth-700 dark:text-earth-300">{tx(s.body)}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Phone preview ── */}
        <section className="border-y border-[var(--border-subtle)] bg-surface">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1fr_1.1fr] md:py-20">
            <PhoneMock lang={lang} />
            <div>
              <h2 className="text-4xl text-heading">{tx(COPY.phoneTitle)}</h2>
              <p className="mt-2 text-lg text-earth-700 dark:text-earth-300">{tx(COPY.phoneSub)}</p>
              <ul className="mt-7 space-y-4">
                {PHONE_POINTS.map((p, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-leaf-600 text-white">
                      <IconCheck className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    <span className="text-[17px] font-semibold text-heading">{tx(p)}</span>
                  </li>
                ))}
              </ul>
              <Link href="/my/login" className="stitch-btn-primary mt-8 px-6 py-3 text-base">
                {tx(COPY.customerLogin)} <IconArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Rates (live from Settings) ── */}
        {settings && <RateCard settings={settings} lang={lang} title={tx(COPY.ratesTitle)} sub={tx(COPY.ratesSub)} />}

        {/* ── Owner ── */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 md:pb-20">
          <div className="straw grid grid-cols-1 items-center gap-8 overflow-hidden rounded-3xl bg-earth-900 p-6 text-white sm:p-10 md:grid-cols-[1fr_1.1fr] dark:bg-earth-800">
            <div>
              <h2 className="text-4xl">{tx(COPY.ownerTitle)}</h2>
              <p className="mt-3 text-lg leading-relaxed text-earth-200">{tx(COPY.ownerBody)}</p>
              <Link
                href="/login"
                className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-6 font-bold text-earth-900 transition-transform active:translate-y-px"
              >
                {tx(COPY.ownerLogin)} <IconArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <OwnerMock lang={lang} />
          </div>
        </section>

        {/* ── Contact + final CTA ── */}
        <section className={`mx-auto grid max-w-6xl gap-5 px-4 pb-16 sm:px-6 md:pb-20 ${settings?.phone || settings?.address ? "md:grid-cols-2" : ""}`}>
          {(settings?.phone || settings?.address) && (
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-surface p-6 sm:p-8">
            <h2 className="text-3xl text-heading">{tx(COPY.contactTitle)}</h2>
            <p className="mt-3 font-display text-2xl text-clay-700 dark:text-clay-400">{millName}</p>
            {settings?.address && <p className="mt-1 text-earth-700 dark:text-earth-300">{settings.address}</p>}
            {settings?.phone ? (
              <a href={`tel:${settings.phone}`} className="stitch-btn-secondary mt-5 px-5 py-2.5 text-base">
                <IconPhone className="h-4 w-4" />
                {tx(COPY.call)} · {settings.phone}
              </a>
            ) : null}
          </div>
          )}
          <div className="straw flex flex-col justify-between gap-6 rounded-2xl bg-clay-700 p-6 text-white sm:p-8 dark:bg-clay-900">
            <div>
              <h2 className="text-3xl">{tx(COPY.ctaTitle)}</h2>
              <p className="mt-2 text-clay-100">{tx(COPY.ctaBody)}</p>
            </div>
            <Link
              href="/my/login"
              className="inline-flex min-h-12 items-center gap-2 self-start rounded-xl bg-white px-6 font-bold text-clay-800 transition-transform active:translate-y-px"
            >
              {tx(COPY.customerLogin)} <IconArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border-subtle)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:flex-row sm:px-6">
          <span className="flex items-center gap-2">
            <BrandMark className="h-6 w-6" />
            <span className="font-semibold text-earth-700 dark:text-earth-300">{APP_NAME}</span>
          </span>
          <span className="flex items-center gap-4">
            <Link href="/my/login" className="hover:text-heading">{tx(COPY.customerLogin)}</Link>
            <Link href="/login" className="hover:text-heading">{tx(COPY.ownerLogin)}</Link>
            <span>© {new Date().getFullYear()}</span>
          </span>
        </div>
      </footer>
    </div>
  );
}

/* ───────────────────────── pieces ───────────────────────── */

/**
 * Hero artwork. Drop a real clip at `public/landing/hero.mp4` (optionally
 * `hero.webm` + a `hero.jpg` poster) — or a still at `public/landing/hero.webp`
 * / `hero.jpg` — and it replaces the drawn chakki automatically; nothing else
 * to change. Without one, the animated SVG mill is shown.
 */
const LANDING_DIR = path.join(process.cwd(), "public", "landing");
const has = (f: string) => existsSync(path.join(LANDING_DIR, f));

function HeroArt({ alt }: { alt: string }) {
  const mp4 = has("hero.mp4");
  const webm = has("hero.webm");
  const poster = has("hero.jpg") ? "/landing/hero.jpg" : has("hero.webp") ? "/landing/hero.webp" : undefined;

  if (mp4 || webm) {
    return (
      <div className="aspect-square overflow-hidden rounded-[2rem] border border-[var(--border-subtle)] bg-haldi-100 shadow-elevated dark:bg-earth-900">
        <video
          className="h-full w-full object-cover motion-reduce:hidden"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={poster}
          aria-label={alt}
        >
          {webm && <source src="/landing/hero.webm" type="video/webm" />}
          {mp4 && <source src="/landing/hero.mp4" type="video/mp4" />}
        </video>
        {/* reduced motion: the poster still, or the drawn mill */}
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt={alt} className="hidden h-full w-full object-cover motion-reduce:block" />
        ) : (
          <MillIllustration className="hidden w-full motion-reduce:block" />
        )}
      </div>
    );
  }
  if (poster) {
    return (
      <div className="aspect-square overflow-hidden rounded-[2rem] border border-[var(--border-subtle)] shadow-elevated">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={poster} alt={alt} className="h-full w-full object-cover" />
      </div>
    );
  }
  return <MillIllustration className="w-full" />;
}


function WheatGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-haldi-300" fill="currentColor" aria-hidden="true">
      <path d="M12 22V8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="9.2" cy="16" rx="2" ry="3.4" transform="rotate(-30 9.2 16)" />
      <ellipse cx="14.8" cy="16" rx="2" ry="3.4" transform="rotate(30 14.8 16)" />
      <ellipse cx="9.4" cy="11" rx="1.8" ry="3" transform="rotate(-30 9.4 11)" />
      <ellipse cx="14.6" cy="11" rx="1.8" ry="3" transform="rotate(30 14.6 11)" />
      <ellipse cx="12" cy="5" rx="1.6" ry="3" />
    </svg>
  );
}

function StepIcon({ kind }: { kind: "sack" | "mill" | "receipt" }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className: "h-6 w-6", "aria-hidden": true };
  if (kind === "sack")
    return (
      <svg {...common}>
        <path d="M8 4h8l-1.5 3c3 1.5 5 5 5 8.5C19.5 19 16.5 21 12 21s-7.5-2-7.5-5.5C4.5 12 6.5 8.5 9.5 7L8 4Z" />
        <path d="M9.5 7h5M10 14h4" />
      </svg>
    );
  if (kind === "mill")
    return (
      <svg {...common}>
        <ellipse cx="12" cy="9" rx="8" ry="2.6" />
        <path d="M4 9v3c0 1.4 3.6 2.6 8 2.6s8-1.2 8-2.6V9" />
        <path d="M12 3v3.4M17 15.5l2 3M12 14.6V21" />
      </svg>
    );
  return <IconPrinter className="h-6 w-6" />;
}

/** A phone showing the real customer screen's building blocks, labelled as an example. */
function PhoneMock({ lang }: { lang: "mr" | "en" }) {
  const mr = lang === "mr";
  return (
    <div className="relative mx-auto w-[290px]" aria-hidden="true">
      <div className="absolute -inset-6 -z-0 rounded-[48px] bg-haldi-100 dark:bg-earth-900" />
      <div className="relative rounded-[40px] border-[10px] border-earth-900 bg-background p-3 shadow-elevated dark:border-earth-700">
        <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-earth-300 dark:bg-earth-700" />
        <p className="text-[11px] text-muted">{mr ? "नमस्कार," : "Hello,"}</p>
        <p className="font-display text-lg leading-tight text-heading">{mr ? "सुरेश पाटील" : "Suresh Patil"}</p>

        <div className="straw mt-3 rounded-2xl bg-clay-700 p-3.5 text-white">
          <p className="text-[11px] font-semibold text-clay-100">{mr ? "तुमची उधारी" : "What you owe"}</p>
          <p className="font-display text-3xl leading-none">
            <span className="text-lg text-clay-200">₹</span> 160
          </p>
          <span className="mt-2.5 inline-flex rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-clay-800">{mr ? "पैसे भरा →" : "Pay now →"}</span>
        </div>

        <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-leaf-200 bg-leaf-50 p-2.5 dark:border-leaf-900 dark:bg-leaf-950/60">
          <span className="h-2 w-2 rounded-full bg-leaf-600" />
          <span className="text-[11px] font-bold text-leaf-800 dark:text-leaf-300">{mr ? "तुमचा माल दळून तयार आहे" : "Your flour is ready"}</span>
        </div>

        <div className="mt-2.5 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-surface">
          <div className="flex items-center gap-2.5 p-2.5">
            <span className="flex h-9 w-9 flex-col items-center justify-center rounded-lg border-2 border-dashed border-clay-300 text-clay-700 dark:border-clay-800 dark:text-clay-400">
              <span className="font-display text-base leading-none">12</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight text-heading">{mr ? "गहू" : "Wheat"}</p>
              <p className="text-[10px] text-muted">{mr ? "बारीक" : "Fine"} · 25 kg · ₹4/kg</p>
            </div>
            <span className="rounded-full border border-leaf-200 bg-leaf-50 px-2 py-0.5 text-[10px] font-semibold text-leaf-800 dark:border-leaf-800 dark:bg-leaf-950 dark:text-leaf-300">
              {mr ? "तयार" : "Ready"}
            </span>
          </div>
          <div className="flex items-center gap-1 px-3 pb-2.5">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="flex flex-1 items-center gap-1">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${i < 2 ? "bg-earth-600 dark:bg-earth-400" : i === 2 ? "bg-leaf-600 ring-2 ring-leaf-200 dark:ring-leaf-900" : "border-2 border-earth-300 dark:border-earth-700"}`} />
                {i < 3 && <span className={`h-0.5 flex-1 ${i < 2 ? "bg-earth-500" : "bg-earth-200 dark:bg-earth-700"}`} />}
              </span>
            ))}
          </div>
          <div className="slip-tear flex items-center justify-between px-3 py-2.5">
            <span className="text-[11px] text-muted">{mr ? "एकूण ₹100" : "Total ₹100"}</span>
            <span className="paid-stamp text-[11px] text-leaf-700 dark:text-leaf-400">{mr ? "पैसे पूर्ण भरले" : "Paid in full"}</span>
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted">{mr ? "उदाहरण" : "Example"}</p>
      </div>
    </div>
  );
}

/** Three panels echoing the owner dashboard, labelled as an example. */
function OwnerMock({ lang }: { lang: "mr" | "en" }) {
  const mr = lang === "mr";
  const rows = [
    { dot: "bg-haldi-400", label: mr ? "रांगेत" : "Queued", n: 4 },
    { dot: "bg-neel-400", label: mr ? "दळण सुरू" : "Milling", n: 2 },
    { dot: "bg-leaf-400", label: mr ? "तयार" : "Ready", n: 3 },
  ];
  return (
    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/15" aria-hidden="true">
      <div className="flex items-center justify-between text-xs text-earth-300">
        <span>{mr ? "आजचा आढावा" : "Today"}</span>
        <span>{mr ? "उदाहरण" : "Example"}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {rows.map((r) => (
          <div key={r.label} className="rounded-xl bg-white/10 p-3">
            <span className="flex items-center gap-1.5 text-[11px] text-earth-200">
              <span className={`h-2 w-2 rounded-full ${r.dot}`} />
              {r.label}
            </span>
            <span className="mt-1 block font-display text-3xl leading-none">{r.n}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between rounded-xl bg-white/10 p-3">
        <span>
          <span className="block text-[11px] text-earth-200">{mr ? "एकूण उधारी" : "Total outstanding"}</span>
          <span className="font-display text-3xl leading-none text-clay-300">₹ 4,820</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-earth-900">
          <IconBell className="h-3.5 w-3.5" />
          {mr ? "आठवण पाठवा" : "Remind all"}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2 rounded-xl bg-white/10 p-3 text-xs text-earth-200">
        <IconClock className="h-4 w-4 text-haldi-300" />
        {mr ? "#14 सविता शिंदे · ज्वारी 30 kg · दळण सुरू" : "#14 Savita Shinde · Jowar 30 kg · milling"}
      </div>
    </div>
  );
}

/** The owner's own per-kg rates, straight from Settings. */
function RateCard({ settings, lang, title, sub }: { settings: SettingsView; lang: "mr" | "en"; title: string; sub: string }) {
  const grains = GRAINS.filter((g) => settings.rates[g.key]);
  if (grains.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_1.6fr] md:items-start">
        <div>
          <h2 className="text-4xl text-heading">{title}</h2>
          <p className="mt-2 text-lg text-earth-700 dark:text-earth-300">{sub}</p>
          <p className="mt-4 inline-flex rounded-lg bg-haldi-50 px-3 py-2 text-sm text-haldi-800 dark:bg-haldi-950/60 dark:text-haldi-300">
            {lang === "mr" ? "उदा. 25 kg गहू × ₹" : "e.g. 25 kg wheat × ₹"}
            {settings.rates.wheat?.medium ?? 5}
            {lang === "mr" ? " = ₹" : " = ₹"}
            {(25 * (settings.rates.wheat?.medium ?? 5)).toLocaleString("en-IN")}
          </p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)] bg-surface shadow-soft">
          <table className="w-full min-w-[300px] text-left">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-sm text-muted">
                <th className="px-5 py-3 font-semibold">{lang === "mr" ? "धान्य" : "Grain"}</th>
                {SIZES.map((s) => (
                  <th key={s.key} className="px-4 py-3 text-right font-semibold">
                    {sizeLabel(s.key, lang)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed divide-[var(--border-subtle)]">
              {grains.map((g) => (
                <tr key={g.key}>
                  <td className="px-5 py-3 font-display text-lg text-heading">{grainLabel(g.key, lang)}</td>
                  {SIZES.map((s) => (
                    <td key={s.key} className="px-4 py-3 text-right font-semibold text-earth-800 dark:text-earth-200">
                      ₹{settings.rates[g.key]?.[s.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
