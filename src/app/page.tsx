import Link from "next/link";
import { BrandMark, IconArrowRight, IconBell, IconCheck } from "@/components/common";
import { getLang } from "@/lib/i18n/i18n";
import { LandingNavLanguageToggle, CustomerTrackForm } from "@/components/landing/LandingClientComponents";

/**
 * Public landing page.
 *
 * Every claim on this page is something the app really does today. Earlier
 * copy advertised scale sync, biometrics, SMS/WhatsApp alerts and OTP login —
 * none of which exist — so a customer or the mill owner would have been
 * promised features they could not find. Keep it that way: when a feature
 * ships, add it here; not before.
 */

type L = { mr: string; en: string };

const COPY = {
  tagline: { mr: "गिरणी व्यवस्थापन", en: "Mill management" },
  ownerLogin: { mr: "मालक लॉगिन", en: "Owner login" },
  customerLogin: { mr: "ग्राहक लॉगिन", en: "Customer login" },
  eyebrow: { mr: "दळण · उधारी · पावती", en: "Milling · Dues · Receipts" },
  headline: { mr: "माझं दळण झालं का?", en: "Is my flour ready?" },
  headline2: { mr: "आता फोन करायची गरज नाही.", en: "No more phone calls to find out." },
  lead: {
    mr: "तुम्ही आणलेल्या धान्याचं वजन, दळणाची स्थिती, आणि किती पैसे बाकी आहेत — सगळं तुमच्या मोबाईलवर. माल तयार झाला की लगेच सूचना.",
    en: "Your grain's weight, where it is in the mill, and what you still owe — all on your phone. The moment it's ready, you get a notice.",
  },
  trackLabel: { mr: "तुमचा मोबाईल नंबर टाका", en: "Enter your mobile number" },
  sampleTag: { mr: "उदाहरण", en: "Example" },
  howTitle: { mr: "कसं चालतं", en: "How it works" },
  featuresTitle: { mr: "गिरणीत काय मिळतं", en: "What's in it" },
  ownerTitle: { mr: "गिरणी मालकांसाठी", en: "For the mill owner" },
  ownerBody: {
    mr: "नवीन ऑर्डर नोंदवा, दळण्याची रांग सांभाळा, रोख / UPI जमा नोंदवा आणि कोणाची किती उधारी आहे ते एका नजरेत पहा.",
    en: "Take in new orders, run the milling queue, record cash / UPI payments and see who owes what at a glance.",
  },
  footer: { mr: "दळण व्यवस्थापन प्रणाली", en: "Mill management system" },
} satisfies Record<string, L>;

const STEPS: { title: L; body: L }[] = [
  {
    title: { mr: "माल आणा", en: "Bring your grain" },
    body: {
      mr: "गिरणीवर धान्याचं वजन (किलो), प्रकार आणि बारीक / मध्यम / जाडसर — सगळं नोंदवलं जातं. तुम्हाला ऑर्डर क्रमांक मिळतो.",
      en: "The mill records the weight in kg, the grain and the size you want — fine, medium or coarse. You get an order number.",
    },
  },
  {
    title: { mr: "स्थिती पहा", en: "Watch it move" },
    body: {
      mr: "रांगेत → दळण सुरू → तयार. प्रत्येक बदल तुमच्या फोनवर दिसतो; माल तयार झाला की सूचना येते.",
      en: "Queued → milling → ready. Every step shows on your phone, with a notice when it's ready to collect.",
    },
  },
  {
    title: { mr: "हिशोब साफ", en: "Settle up" },
    body: {
      mr: "रोख किंवा UPI ने पैसे भरा. एकूण आकारणी, जमा रक्कम आणि बाकी उधारी — सगळं स्पष्ट, पावतीसह.",
      en: "Pay in cash or by UPI. Charges, what you've paid and what's left — all clear, with a receipt.",
    },
  },
];

const FEATURES: { title: L; body: L }[] = [
  {
    title: { mr: "ऑर्डरची थेट स्थिती", en: "Live order status" },
    body: { mr: "चालू आणि जुन्या सर्व ऑर्डर, वेळेसह.", en: "Current and past orders, with times." },
  },
  {
    title: { mr: "उधारी व पावती", en: "Dues & receipts" },
    body: { mr: "प्रत्येक जमा रक्कम नोंदवलेली, बाकी आपोआप मोजलेली.", en: "Every payment recorded, the balance worked out for you." },
  },
  {
    title: { mr: "ॲपमध्ये सूचना", en: "In-app notices" },
    body: { mr: "ऑर्डर मिळाली, दळण सुरू, तयार, पैसे मिळाले.", en: "Received, milling, ready, payment received." },
  },
  {
    title: { mr: "मराठी व English", en: "Marathi & English" },
    body: { mr: "एका टॅपमध्ये भाषा बदला. फोनवर ॲपसारखं इन्स्टॉल करा.", en: "Switch language in one tap. Install it on your phone like an app." },
  },
];

export default async function Home() {
  const lang = await getLang();
  const tx = (l: L) => (lang === "mr" ? l.mr : l.en);
  const mr = lang === "mr";

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <BrandMark className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[15px] font-bold text-heading sm:text-base">Feed &amp; Flour</span>
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
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-10 sm:px-6 md:grid-cols-[1.15fr_1fr] md:pt-16 lg:gap-16">
          <div>
            <p className="text-sm font-semibold text-haldi-700 dark:text-haldi-300">{tx(COPY.eyebrow)}</p>
            <h1 className="mt-3 text-[40px] leading-[1.08] text-heading sm:text-5xl lg:text-[58px]">
              {tx(COPY.headline)}
              <span className="mt-1 block text-clay-700 dark:text-clay-400">{tx(COPY.headline2)}</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-earth-700 sm:text-lg dark:text-earth-300">
              {tx(COPY.lead)}
            </p>

            <div className="mt-7 max-w-md">
              <label htmlFor="track-input" className="mb-1.5 block text-sm font-semibold text-heading">
                {tx(COPY.trackLabel)}
              </label>
              <CustomerTrackForm lang={lang} />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <Link href="/my/login" className="inline-flex items-center gap-1.5 font-semibold text-clay-700 hover:underline dark:text-clay-400">
                {tx(COPY.customerLogin)} <IconArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login" className="inline-flex items-center gap-1.5 font-semibold text-earth-700 hover:underline sm:hidden dark:text-earth-300">
                {tx(COPY.ownerLogin)} <IconArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <SampleSlip lang={lang} tag={tx(COPY.sampleTag)} />
        </section>

        {/* How it works */}
        <section className="border-y border-[var(--border-subtle)] bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-3xl text-heading">{tx(COPY.howTitle)}</h2>
            <ol className="mt-8 grid gap-8 md:grid-cols-3 md:gap-10">
              {STEPS.map((s, i) => (
                <li key={i} className="relative">
                  <span className="font-display text-5xl leading-none text-clay-300 dark:text-clay-800">
                    {mr ? ["१", "२", "३"][i] : i + 1}
                  </span>
                  <h3 className="mt-3 text-lg font-bold text-heading">{tx(s.title)}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-earth-700 dark:text-earth-300">{tx(s.body)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features + owner */}
        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="text-3xl text-heading">{tx(COPY.featuresTitle)}</h2>
            <ul className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {FEATURES.map((f, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-leaf-100 text-leaf-700 dark:bg-leaf-950 dark:text-leaf-400">
                    <IconCheck className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <span>
                    <span className="block font-bold text-heading">{tx(f.title)}</span>
                    <span className="mt-0.5 block text-[15px] text-earth-700 dark:text-earth-300">{tx(f.body)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="straw flex flex-col justify-between gap-6 rounded-2xl bg-earth-900 p-6 text-white sm:p-8 dark:bg-earth-800">
            <div>
              <h2 className="text-2xl">{tx(COPY.ownerTitle)}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-earth-200">{tx(COPY.ownerBody)}</p>
            </div>
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-white px-5 text-sm font-bold text-earth-900 transition-transform active:translate-y-px"
            >
              {tx(COPY.ownerLogin)} <IconArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border-subtle)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-sm text-muted sm:flex-row sm:px-6">
          <span>
            <span className="font-semibold text-earth-700 dark:text-earth-300">Feed &amp; Flour</span> · {tx(COPY.footer)}
          </span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}

/**
 * A static picture of what a customer sees — the same slip, stepper and money
 * line as the real portal, built from the same tokens. Labelled "Example" so
 * nobody mistakes it for live data.
 */
function SampleSlip({ lang, tag }: { lang: "mr" | "en"; tag: string }) {
  const mr = lang === "mr";
  const steps = mr ? ["रांगेत", "दळण सुरू", "तयार", "घेतले"] : ["Queued", "Milling", "Ready", "Collected"];
  return (
    <div className="relative mx-auto w-full max-w-sm" aria-hidden="true">
      {/* a second slip peeking out behind, like a stack on the counter */}
      <div className="absolute inset-x-6 -bottom-3 top-6 rotate-2 rounded-2xl border border-[var(--border-subtle)] bg-surface/70" />
      <div className="relative -rotate-1 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-surface shadow-elevated">
        <span className="absolute right-3 top-3 rounded-md bg-earth-100 px-2 py-0.5 text-[11px] font-semibold text-muted dark:bg-earth-800">
          {tag}
        </span>
        <div className="p-5">
          <div className="flex items-start gap-3.5">
            <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-dashed border-clay-300 text-clay-700 dark:border-clay-800 dark:text-clay-400">
              <span className="text-[10px] font-semibold leading-none opacity-80">{mr ? "क्र." : "No."}</span>
              <span className="font-display text-xl leading-none">12</span>
            </span>
            <div>
              <p className="text-lg font-bold leading-tight text-heading">{mr ? "गहू" : "Wheat"}</p>
              <p className="mt-0.5 text-sm text-muted">{mr ? "बारीक" : "Fine"} · 25 kg · ₹4/kg</p>
            </div>
          </div>
          <ol className="mt-5 grid grid-cols-4">
            {steps.map((s, i) => (
              <li key={s} className="relative flex flex-col items-center text-center">
                {i > 0 && (
                  <span className={`absolute right-1/2 top-[9px] h-0.5 w-full ${i <= 1 ? "bg-earth-500 dark:bg-earth-400" : "bg-earth-200 dark:bg-earth-700"}`} />
                )}
                <span
                  className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full ${
                    i === 0
                      ? "bg-earth-600 text-white dark:bg-earth-400 dark:text-earth-950"
                      : i === 1
                        ? "bg-neel-500 ring-4 ring-neel-200 dark:ring-neel-900"
                        : "border-2 border-earth-300 bg-surface dark:border-earth-700"
                  }`}
                >
                  {i === 0 && <IconCheck className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span
                  className={`mt-1.5 text-[13px] leading-tight ${
                    i === 1 ? "font-bold text-neel-600 dark:text-neel-300" : i === 0 ? "text-earth-600 dark:text-earth-300" : "text-earth-400 dark:text-earth-500"
                  }`}
                >
                  {s}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="slip-tear flex items-end justify-between gap-3 px-5 pb-5 pt-4">
          <div>
            <p className="text-xs font-semibold text-muted">{mr ? "शिल्लक बाकी" : "Balance due"}</p>
            <p className="font-display text-[28px] leading-none text-clay-700 dark:text-clay-400">₹ 60</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-leaf-50 px-2.5 py-1.5 text-xs font-semibold text-leaf-800 dark:bg-leaf-950 dark:text-leaf-300">
            <IconBell className="h-3.5 w-3.5" />
            {mr ? "तयार झाल्यावर सूचना" : "Notified when ready"}
          </span>
        </div>
      </div>
    </div>
  );
}
