import Link from "next/link";
import { getLang } from "@/lib/i18n/i18n";
import { LandingNavLanguageToggle, CustomerTrackForm } from "@/components/landing/LandingClientComponents";

export default async function Home() {
  const lang = await getLang();

  return (
    <div className="min-h-screen bg-warmporcelain text-slate-800 font-sans antialiased selection:bg-berry-100 selection:text-berry-900 bg-radial-glow flex flex-col dark:bg-zinc-950 dark:text-zinc-100">
      {/* BEGIN: TopNavigationBar */}
      <header className="w-full border-b border-rose-100/70 bg-white/70 backdrop-blur-md sticky top-0 z-50 dark:bg-zinc-900/80 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-3">
          {/* Brand Logo & Identity */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 xl:w-11 xl:h-11 shrink-0 rounded-xl bg-gradient-to-br from-berry-600 to-berry-800 flex items-center justify-center text-white shadow-md shadow-berry-600/25 ring-2 ring-white dark:ring-zinc-800 transition-transform group-hover:scale-105">
              {/* Traditional Mill Wheel / Grain Symbol */}
              <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9"></circle>
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 3v6"></path>
                <path d="M12 15v6"></path>
                <path d="M3 12h6"></path>
                <path d="M15 12h6"></path>
                <path d="m5.6 5.6 4.3 4.3"></path>
                <path d="m14.1 14.1 4.3 4.3"></path>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base xl:text-lg font-bold tracking-tight text-slate-900 font-display dark:text-zinc-100 whitespace-nowrap">
                  Feed and Flour Management
                </span>
                <span className="hidden xl:inline-flex items-center px-2 py-0.5 text-[9px] font-semibold tracking-wide uppercase bg-berry-50 text-berry-700 rounded-full border border-berry-200/60 dark:bg-zinc-800 dark:text-rose-400 dark:border-zinc-700 whitespace-nowrap shrink-0">
                  Enterprise Mill OS
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium tracking-tight dark:text-zinc-400 whitespace-nowrap">
                Operations &amp; Customer Portal
              </p>
            </div>
          </Link>

          {/* Center Status Bar (Operational Indicator) */}
          <div className="hidden lg:flex items-center gap-3.5 xl:gap-5 text-[11px] xl:text-xs text-slate-600 bg-white/85 border border-slate-200/80 px-3.5 xl:px-4 py-1.5 rounded-full shadow-xs whitespace-nowrap shrink-0 dark:bg-zinc-900/80 dark:border-zinc-800 dark:text-zinc-300">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium text-slate-700 dark:text-zinc-200 whitespace-nowrap">
                Milling System Active <span className="text-emerald-600 font-semibold dark:text-emerald-400">• 100% Online</span>
              </span>
            </div>
            <div className="w-px h-3.5 bg-slate-200 dark:bg-zinc-700 shrink-0"></div>
            <div className="flex items-center gap-1.5 font-medium text-slate-500 dark:text-zinc-400 whitespace-nowrap">
              <svg className="w-3.5 h-3.5 text-berry-600 dark:text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span id="live-time-indicator" className="whitespace-nowrap">Today&apos;s Shift: 8:00 AM – 9:00 PM</span>
            </div>
          </div>

          {/* Quick Actions / Language & Help */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 whitespace-nowrap">
            {/* Language Switcher Pill */}
            <LandingNavLanguageToggle initialLang={lang} />

            {/* Help Link */}
            <a
              className="text-[11px] sm:text-xs font-medium text-slate-600 hover:text-berry-700 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors whitespace-nowrap shrink-0 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
              href="#support"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-berry-600 dark:text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" x2="12.01" y1="17" y2="17"></line>
              </svg>
              <span>Help &amp; Support</span>
            </a>
          </div>
        </div>
      </header>
      {/* END: TopNavigationBar */}

      {/* BEGIN: MainContent */}
      <main className="flex-grow flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="w-full max-w-6xl mx-auto space-y-6 sm:space-y-8 lg:space-y-10">
          {/* BEGIN: HeroHeadlineSection */}
          <div className="text-center max-w-4xl mx-auto space-y-2.5 sm:space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 sm:px-4 sm:py-1.5 rounded-full gold-amber-pill shadow-xs transition-all">
              <span className="text-xs sm:text-sm">🌾</span>
              <span className="text-[11px] sm:text-xs font-semibold text-amber-900 tracking-wide font-display dark:text-amber-200">
                Grain &amp; Animal Feed Milling Platform
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span className="text-[10px] sm:text-[11px] font-medium text-amber-800 dark:text-amber-300">Digital Scale &amp; Ledger</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-[40px] lg:text-[46px] font-extrabold text-slate-900 tracking-tight font-display dark:text-zinc-100 leading-[1.15]">
              <span className="bg-gradient-to-r from-berry-800 via-berry-700 to-rose-600 bg-clip-text text-transparent dark:from-rose-400 dark:via-pink-300 dark:to-rose-200">
                Feed and Flour Management
              </span>
            </h1>

            <p className="text-xs sm:text-sm md:text-[15px] text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed dark:text-zinc-400">
              Unified management for cattle feed, poultry feed, and grain flour milling. Direct digital scale sync, instant customer receipts, and seamless ledger balancing.
            </p>
          </div>
          {/* END: HeroHeadlineSection */}

          {/* BEGIN: GatewayPortals */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8 items-stretch">
            {/* PORTAL 1: Owner Portal */}
            <div
              className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-7 lg:p-8 border border-rose-200/80 shadow-lg shadow-berry-900/5 flex flex-col justify-between hover-lift relative overflow-hidden dark:bg-zinc-900 dark:border-zinc-800"
              data-purpose="owner-portal-card"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 sm:h-2 bg-gradient-to-r from-berry-600 via-berry-700 to-rose-500"></div>
              <div className="space-y-4 sm:space-y-5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-berry-800 border border-rose-200 dark:bg-zinc-800 dark:text-rose-300 dark:border-zinc-700">
                    <svg className="w-3.5 h-3.5 text-berry-600 dark:text-rose-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    Owner &amp; Admin Desk
                  </span>
                  <span className="text-xs text-slate-400 font-medium dark:text-zinc-500">Operator Access</span>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1.5 dark:text-zinc-100">Owner Portal</h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed dark:text-zinc-400">
                    Complete command center for grain grinding and commercial feed production. Manage batch queues, inventory, and automated khata accounting.
                  </p>
                </div>
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 dark:bg-zinc-800/60 dark:border-zinc-800">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-berry-100 flex items-center justify-center text-berry-700 shrink-0 dark:bg-rose-950/60 dark:text-rose-300">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      </svg>
                    </div>
                    <div className="text-xs">
                      <span className="font-semibold text-slate-800 block dark:text-zinc-200">Digital Scale &amp; Batch Logging</span>
                      <span className="text-slate-500 dark:text-zinc-400">Auto-capture weights for grain flour, cattle feed, and poultry mash with zero manual entry.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 dark:bg-zinc-800/60 dark:border-zinc-800">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      </svg>
                    </div>
                    <div className="text-xs">
                      <span className="font-semibold text-slate-800 block dark:text-zinc-200">Khata Ledger &amp; Instant UPI</span>
                      <span className="text-slate-500 dark:text-zinc-400">Automated billing ledger, dues tracking, and dynamic UPI payment reconciliation.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-5 sm:pt-6">
                <Link
                  className="w-full flex items-center justify-center gap-2 hero-crimson-gradient text-white py-3.5 px-5 sm:px-6 rounded-2xl font-semibold text-sm sm:text-base shadow-md shadow-berry-700/25 hover:brightness-110 active:scale-[0.99] transition-all group"
                  href="/login"
                >
                  <span>Owner Login</span>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <line x1="5" x2="19" y1="12" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </Link>
                <div className="flex items-center justify-center gap-3 mt-2.5 text-[11px] text-slate-400 dark:text-zinc-500">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path clipRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fillRule="evenodd"></path>
                    </svg>
                    Biometric &amp; PIN Authentication
                  </span>
                  <span>•</span>
                  <span>Offline Sync Protected</span>
                </div>
              </div>
            </div>

            {/* PORTAL 2: Customer Portal */}
            <div
              className="lg:col-span-6 bg-white/90 rounded-3xl p-6 sm:p-7 lg:p-8 border border-rose-200/80 shadow-lg shadow-berry-900/5 flex flex-col justify-between hover-lift relative overflow-hidden backdrop-blur-sm dark:bg-zinc-900 dark:border-zinc-800"
              data-purpose="customer-portal-card"
            >
              <div className="space-y-4 sm:space-y-5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 dark:bg-zinc-800 dark:text-amber-300 dark:border-zinc-700">
                    <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    Customer Self-Service
                  </span>
                  <span className="text-xs text-slate-400 font-medium dark:text-zinc-500">Order Tracking &amp; Receipts</span>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1.5 dark:text-zinc-100">Customer Desk &amp; Status</h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed dark:text-zinc-400">
                    Track grain milling or feed preparation status in real time. Check weight receipts and ready-for-pickup notifications.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-rose-50/60 to-warmporcelain p-3.5 sm:p-4 rounded-2xl border border-rose-100 dark:from-zinc-800/80 dark:to-zinc-850 dark:border-zinc-700">
                  <label className="block text-xs font-semibold text-berry-900 mb-1.5 dark:text-rose-300" htmlFor="track-input">
                    Instant Milling / Feed Order Status
                  </label>
                  <CustomerTrackForm />
                  <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 dark:text-zinc-500">Lookup wheat, jowar, bajra, cattle mash, or custom mix orders</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white border border-rose-100/80 dark:bg-zinc-800 dark:border-zinc-700">
                    <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[9px] sm:text-[10px] font-bold dark:bg-emerald-950 dark:text-emerald-400">✓</span>
                    <span className="font-medium text-slate-700 dark:text-zinc-300 text-[11px] sm:text-xs">SMS Pickup Alerts</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white border border-rose-100/80 dark:bg-zinc-800 dark:border-zinc-700">
                    <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[9px] sm:text-[10px] font-bold dark:bg-emerald-950 dark:text-emerald-400">✓</span>
                    <span className="font-medium text-slate-700 dark:text-zinc-300 text-[11px] sm:text-xs">Digital Weight Slip</span>
                  </div>
                </div>
              </div>

              <div className="pt-5 sm:pt-6">
                <Link
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-rose-50/70 text-berry-800 border-2 border-rose-200 hover:border-berry-300 py-3.5 px-5 sm:px-6 rounded-2xl font-semibold text-sm sm:text-base transition-all group shadow-xs dark:bg-zinc-800 dark:border-zinc-700 dark:text-rose-300 dark:hover:bg-zinc-750"
                  href="/my/login"
                >
                  <span>Customer Login</span>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 text-berry-700 transition-transform dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <line x1="5" x2="19" y1="12" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </Link>
                <div className="flex items-center justify-center gap-2 mt-2.5 text-[11px] text-slate-400 dark:text-zinc-500">
                  <span>Quick OTP sign-in &amp; password-free access</span>
                </div>
              </div>
            </div>
          </div>
          {/* END: GatewayPortals */}

          {/* BEGIN: FeatureTrustGrid */}
          <section className="pt-5 sm:pt-6 border-t border-rose-200/60 dark:border-zinc-800" data-purpose="features-trust-grid">
            <div className="text-center mb-4 sm:mb-5">
              <p className="text-[11px] sm:text-xs uppercase tracking-widest font-bold text-berry-800/80 dark:text-rose-400">
                Key Features of Modern Mill Management
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {/* Feature 1: Digital Precision Scale */}
              <div className="glass-panel p-4 sm:p-4.5 rounded-2xl border border-rose-100/80 shadow-xs flex items-start gap-3.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-berry-50 text-berry-700 flex items-center justify-center shrink-0 border border-berry-100 dark:bg-zinc-800 dark:text-rose-300 dark:border-zinc-700">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 mb-0.5 dark:text-zinc-100">99.9% Scale Accuracy</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 leading-snug dark:text-zinc-400">Direct computerized scale sync. Zero human error in weight records.</p>
                </div>
              </div>

              {/* Feature 2: SMS & WhatsApp Alerts */}
              <div className="glass-panel p-4 sm:p-4.5 rounded-2xl border border-rose-100/80 shadow-xs flex items-start gap-3.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100 dark:bg-zinc-800 dark:text-emerald-400 dark:border-zinc-700">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 mb-0.5 dark:text-zinc-100">SMS &amp; WhatsApp Alerts</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 leading-snug dark:text-zinc-400">Automated pickup messages, token codes, and status updates to mobile.</p>
                </div>
              </div>

              {/* Feature 3: Khata Ledger */}
              <div className="glass-panel p-4 sm:p-4.5 rounded-2xl border border-rose-100/80 shadow-xs flex items-start gap-3.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100 dark:bg-zinc-800 dark:text-amber-400 dark:border-zinc-700">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 mb-0.5 dark:text-zinc-100">Customer Credit Ledger</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 leading-snug dark:text-zinc-400">Effortless management of monthly bills, pending balances, and records.</p>
                </div>
              </div>

              {/* Feature 4: Bilingual Local Support */}
              <div className="glass-panel p-4 sm:p-4.5 rounded-2xl border border-rose-100/80 shadow-xs flex items-start gap-3.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100 dark:bg-zinc-800 dark:text-purple-400 dark:border-zinc-700">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 mb-0.5 dark:text-zinc-100">Bilingual Support</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 leading-snug dark:text-zinc-400">Seamless Marathi &amp; English interface, easy for operators and patrons alike.</p>
                </div>
              </div>
            </div>
          </section>
          {/* END: FeatureTrustGrid */}
        </div>
      </main>
      {/* END: MainContent */}

      {/* BEGIN: MinimalFooter */}
      <footer className="w-full border-t border-rose-100/80 bg-white/70 py-4 sm:py-5 text-xs text-slate-500 dark:bg-zinc-950/80 dark:border-zinc-800 dark:text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-zinc-200">Feed and Flour Management Platform</span>
            <span>•</span>
            <span>All Rights Reserved © 2025</span>
          </div>
          <div className="flex items-center gap-6 text-slate-500 dark:text-zinc-400">
            <a className="hover:text-berry-700 transition dark:hover:text-rose-400" href="#security">Data Security</a>
            <a className="hover:text-berry-700 transition dark:hover:text-rose-400" href="#terms">Terms &amp; Conditions</a>
            <a id="support" className="hover:text-berry-700 transition dark:hover:text-rose-400 scroll-mt-24" href="#support">Technical Support: 1800-270-XXXX</a>
          </div>
        </div>
      </footer>
      {/* END: MinimalFooter */}
    </div>
  );
}