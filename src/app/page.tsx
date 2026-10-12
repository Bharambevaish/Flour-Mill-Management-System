import Link from "next/link";
import { BrandMark } from "@/components/common";
import { getLang } from "@/lib/i18n/i18n";
import { LandingNavLanguageToggle, CustomerTrackForm } from "@/components/landing/LandingClientComponents";

export default async function Home() {
  const lang = await getLang();

  return (
    <div className="min-h-screen bg-background text-earth-800 font-sans antialiased selection:bg-clay-100 selection:text-clay-900 flex flex-col dark:bg-earth-950 dark:text-earth-100">
      {/* BEGIN: TopNavigationBar */}
      <header className="w-full border-b border-clay-100/70 bg-white/70 backdrop-blur-md sticky top-0 z-50 dark:bg-earth-900/80 dark:border-earth-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-3">
          {/* Brand Logo & Identity */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <BrandMark className="w-9 h-9 sm:w-10 sm:h-10 xl:w-11 xl:h-11 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base xl:text-lg font-bold tracking-tight text-earth-900 font-display dark:text-earth-100 whitespace-nowrap">
                  Feed and Flour Management
                </span>
                <span className="hidden xl:inline-flex items-center px-2 py-0.5 text-[9px] font-semibold tracking-wide uppercase bg-clay-50 text-clay-700 rounded-full border border-clay-200/60 dark:bg-earth-800 dark:text-clay-400 dark:border-earth-700 whitespace-nowrap shrink-0">
                  Enterprise Mill OS
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-earth-500 font-medium tracking-tight dark:text-earth-400 whitespace-nowrap">
                Operations &amp; Customer Portal
              </p>
            </div>
          </Link>

          {/* Center Status Bar (Operational Indicator) */}
          <div className="hidden lg:flex items-center gap-3.5 xl:gap-5 text-[11px] xl:text-xs text-earth-600 bg-white/85 border border-earth-200/80 px-3.5 xl:px-4 py-1.5 rounded-full shadow-xs whitespace-nowrap shrink-0 dark:bg-earth-900/80 dark:border-earth-800 dark:text-earth-300">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-leaf-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-leaf-500"></span>
              </span>
              <span className="font-medium text-earth-700 dark:text-earth-200 whitespace-nowrap">
                Milling System Active <span className="text-leaf-600 font-semibold dark:text-leaf-400">• 100% Online</span>
              </span>
            </div>
            <div className="w-px h-3.5 bg-earth-200 dark:bg-earth-700 shrink-0"></div>
            <div className="flex items-center gap-1.5 font-medium text-earth-500 dark:text-earth-400 whitespace-nowrap">
              <svg className="w-3.5 h-3.5 text-clay-600 dark:text-clay-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="text-[11px] sm:text-xs font-medium text-earth-600 hover:text-clay-700 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-clay-50 transition-colors whitespace-nowrap shrink-0 dark:text-earth-400 dark:hover:text-earth-100 dark:hover:bg-earth-800"
              href="#support"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-clay-600 dark:text-clay-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <span className="h-1.5 w-1.5 rounded-full bg-haldi-500" />
              <span className="text-[11px] sm:text-xs font-semibold text-haldi-900 tracking-wide font-display dark:text-haldi-200">
                Grain &amp; Animal Feed Milling Platform
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-haldi-500"></span>
              <span className="text-[10px] sm:text-[11px] font-medium text-haldi-800 dark:text-haldi-300">Digital Scale &amp; Ledger</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-[40px] lg:text-[46px] font-extrabold text-earth-900 tracking-tight font-display dark:text-earth-100 leading-[1.15]">
              <span className="text-clay-700 dark:text-clay-400">
                Feed and Flour Management
              </span>
            </h1>

            <p className="text-xs sm:text-sm md:text-[15px] text-earth-600 max-w-2xl mx-auto font-normal leading-relaxed dark:text-earth-400">
              Unified management for cattle feed, poultry feed, and grain flour milling. Direct digital scale sync, instant customer receipts, and seamless ledger balancing.
            </p>
          </div>
          {/* END: HeroHeadlineSection */}

          {/* BEGIN: GatewayPortals */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8 items-stretch">
            {/* PORTAL 1: Owner Portal */}
            <div
              className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-7 lg:p-8 border border-clay-200/80 shadow-lg shadow-clay-900/5 flex flex-col justify-between hover-lift relative overflow-hidden dark:bg-earth-900 dark:border-earth-800"
              data-purpose="owner-portal-card"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-clay-600"></div>
              <div className="space-y-4 sm:space-y-5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-clay-50 text-clay-800 border border-clay-200 dark:bg-earth-800 dark:text-clay-300 dark:border-earth-700">
                    <svg className="w-3.5 h-3.5 text-clay-600 dark:text-clay-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    Owner &amp; Admin Desk
                  </span>
                  <span className="text-xs text-earth-400 font-medium dark:text-earth-500">Operator Access</span>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-earth-900 mb-1.5 dark:text-earth-100">Owner Portal</h2>
                  <p className="text-xs sm:text-sm text-earth-600 leading-relaxed dark:text-earth-400">
                    Complete command center for grain grinding and commercial feed production. Manage batch queues, inventory, and automated khata accounting.
                  </p>
                </div>
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-earth-50 border border-earth-100 dark:bg-earth-800/60 dark:border-earth-800">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-clay-100 flex items-center justify-center text-clay-700 shrink-0 dark:bg-clay-950/60 dark:text-clay-300">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      </svg>
                    </div>
                    <div className="text-xs">
                      <span className="font-semibold text-earth-800 block dark:text-earth-200">Digital Scale &amp; Batch Logging</span>
                      <span className="text-earth-500 dark:text-earth-400">Auto-capture weights for grain flour, cattle feed, and poultry mash with zero manual entry.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-earth-50 border border-earth-100 dark:bg-earth-800/60 dark:border-earth-800">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-leaf-100 flex items-center justify-center text-leaf-700 shrink-0 dark:bg-leaf-950/60 dark:text-leaf-300">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      </svg>
                    </div>
                    <div className="text-xs">
                      <span className="font-semibold text-earth-800 block dark:text-earth-200">Khata Ledger &amp; Instant UPI</span>
                      <span className="text-earth-500 dark:text-earth-400">Automated billing ledger, dues tracking, and dynamic UPI payment reconciliation.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-5 sm:pt-6">
                <Link
                  className="w-full flex items-center justify-center gap-2 bg-clay-600 hover:bg-clay-700 text-white py-3.5 px-5 sm:px-6 rounded-2xl font-semibold text-sm sm:text-base shadow-md shadow-clay-700/25 hover:brightness-110 active:scale-[0.99] transition-all group"
                  href="/login"
                >
                  <span>Owner Login</span>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <line x1="5" x2="19" y1="12" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </Link>
                <div className="flex items-center justify-center gap-3 mt-2.5 text-[11px] text-earth-400 dark:text-earth-500">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-leaf-500" fill="currentColor" viewBox="0 0 20 20">
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
              className="lg:col-span-6 bg-white/90 rounded-3xl p-6 sm:p-7 lg:p-8 border border-clay-200/80 shadow-lg shadow-clay-900/5 flex flex-col justify-between hover-lift relative overflow-hidden backdrop-blur-sm dark:bg-earth-900 dark:border-earth-800"
              data-purpose="customer-portal-card"
            >
              <div className="space-y-4 sm:space-y-5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-haldi-50 text-haldi-900 border border-haldi-200 dark:bg-earth-800 dark:text-haldi-300 dark:border-earth-700">
                    <svg className="w-3.5 h-3.5 text-haldi-600 dark:text-haldi-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    Customer Self-Service
                  </span>
                  <span className="text-xs text-earth-400 font-medium dark:text-earth-500">Order Tracking &amp; Receipts</span>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-earth-900 mb-1.5 dark:text-earth-100">Customer Desk &amp; Status</h2>
                  <p className="text-xs sm:text-sm text-earth-600 leading-relaxed dark:text-earth-400">
                    Track grain milling or feed preparation status in real time. Check weight receipts and ready-for-pickup notifications.
                  </p>
                </div>

                <div className="bg-clay-50/60 p-3.5 sm:p-4 rounded-2xl border border-clay-100 dark:bg-earth-800/80 dark:border-earth-700">
                  <label className="block text-xs font-semibold text-clay-900 mb-1.5 dark:text-clay-300" htmlFor="track-input">
                    Instant Milling / Feed Order Status
                  </label>
                  <CustomerTrackForm />
                  <p className="text-[10px] sm:text-[11px] text-earth-400 mt-1.5 dark:text-earth-500">Lookup wheat, jowar, bajra, cattle mash, or custom mix orders</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-earth-600 dark:text-earth-400">
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white border border-clay-100/80 dark:bg-earth-800 dark:border-earth-700">
                    <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-leaf-50 text-leaf-600 flex items-center justify-center text-[9px] sm:text-[10px] font-bold dark:bg-leaf-950 dark:text-leaf-400">✓</span>
                    <span className="font-medium text-earth-700 dark:text-earth-300 text-[11px] sm:text-xs">SMS Pickup Alerts</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white border border-clay-100/80 dark:bg-earth-800 dark:border-earth-700">
                    <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-leaf-50 text-leaf-600 flex items-center justify-center text-[9px] sm:text-[10px] font-bold dark:bg-leaf-950 dark:text-leaf-400">✓</span>
                    <span className="font-medium text-earth-700 dark:text-earth-300 text-[11px] sm:text-xs">Digital Weight Slip</span>
                  </div>
                </div>
              </div>

              <div className="pt-5 sm:pt-6">
                <Link
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-clay-50/70 text-clay-800 border-2 border-clay-200 hover:border-clay-300 py-3.5 px-5 sm:px-6 rounded-2xl font-semibold text-sm sm:text-base transition-all group shadow-xs dark:bg-earth-800 dark:border-earth-700 dark:text-clay-300 dark:hover:bg-earth-750"
                  href="/my/login"
                >
                  <span>Customer Login</span>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 text-clay-700 transition-transform dark:text-clay-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <line x1="5" x2="19" y1="12" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </Link>
                <div className="flex items-center justify-center gap-2 mt-2.5 text-[11px] text-earth-400 dark:text-earth-500">
                  <span>Quick OTP sign-in &amp; password-free access</span>
                </div>
              </div>
            </div>
          </div>
          {/* END: GatewayPortals */}

          {/* BEGIN: FeatureTrustGrid */}
          <section className="pt-5 sm:pt-6 border-t border-clay-200/60 dark:border-earth-800" data-purpose="features-trust-grid">
            <div className="text-center mb-4 sm:mb-5">
              <p className="text-[11px] sm:text-xs uppercase tracking-widest font-bold text-clay-800/80 dark:text-clay-400">
                Key Features of Modern Mill Management
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {/* Feature 1: Digital Precision Scale */}
              <div className="glass-panel p-4 sm:p-4.5 rounded-2xl border border-clay-100/80 shadow-xs flex items-start gap-3.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-clay-50 text-clay-700 flex items-center justify-center shrink-0 border border-clay-100 dark:bg-earth-800 dark:text-clay-300 dark:border-earth-700">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-earth-800 mb-0.5 dark:text-earth-100">99.9% Scale Accuracy</h3>
                  <p className="text-[11px] sm:text-xs text-earth-500 leading-snug dark:text-earth-400">Direct computerized scale sync. Zero human error in weight records.</p>
                </div>
              </div>

              {/* Feature 2: SMS & WhatsApp Alerts */}
              <div className="glass-panel p-4 sm:p-4.5 rounded-2xl border border-clay-100/80 shadow-xs flex items-start gap-3.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-leaf-50 text-leaf-700 flex items-center justify-center shrink-0 border border-leaf-100 dark:bg-earth-800 dark:text-leaf-400 dark:border-earth-700">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-earth-800 mb-0.5 dark:text-earth-100">SMS &amp; WhatsApp Alerts</h3>
                  <p className="text-[11px] sm:text-xs text-earth-500 leading-snug dark:text-earth-400">Automated pickup messages, token codes, and status updates to mobile.</p>
                </div>
              </div>

              {/* Feature 3: Khata Ledger */}
              <div className="glass-panel p-4 sm:p-4.5 rounded-2xl border border-clay-100/80 shadow-xs flex items-start gap-3.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-haldi-50 text-haldi-700 flex items-center justify-center shrink-0 border border-haldi-100 dark:bg-earth-800 dark:text-haldi-400 dark:border-earth-700">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-earth-800 mb-0.5 dark:text-earth-100">Customer Credit Ledger</h3>
                  <p className="text-[11px] sm:text-xs text-earth-500 leading-snug dark:text-earth-400">Effortless management of monthly bills, pending balances, and records.</p>
                </div>
              </div>

              {/* Feature 4: Bilingual Local Support */}
              <div className="glass-panel p-4 sm:p-4.5 rounded-2xl border border-clay-100/80 shadow-xs flex items-start gap-3.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-neel-50 text-neel-700 flex items-center justify-center shrink-0 border border-neel-100 dark:bg-earth-800 dark:text-neel-400 dark:border-earth-700">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-earth-800 mb-0.5 dark:text-earth-100">Bilingual Support</h3>
                  <p className="text-[11px] sm:text-xs text-earth-500 leading-snug dark:text-earth-400">Seamless Marathi &amp; English interface, easy for operators and patrons alike.</p>
                </div>
              </div>
            </div>
          </section>
          {/* END: FeatureTrustGrid */}
        </div>
      </main>
      {/* END: MainContent */}

      {/* BEGIN: MinimalFooter */}
      <footer className="w-full border-t border-clay-100/80 bg-white/70 py-4 sm:py-5 text-xs text-earth-500 dark:bg-earth-950/80 dark:border-earth-800 dark:text-earth-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-earth-700 dark:text-earth-200">Feed and Flour Management Platform</span>
            <span>•</span>
            <span>All Rights Reserved © 2025</span>
          </div>
          <div className="flex items-center gap-6 text-earth-500 dark:text-earth-400">
            <a className="hover:text-clay-700 transition dark:hover:text-clay-400" href="#security">Data Security</a>
            <a className="hover:text-clay-700 transition dark:hover:text-clay-400" href="#terms">Terms &amp; Conditions</a>
            <a id="support" className="hover:text-clay-700 transition dark:hover:text-clay-400 scroll-mt-24" href="#support">Technical Support: 1800-270-XXXX</a>
          </div>
        </div>
      </footer>
      {/* END: MinimalFooter */}
    </div>
  );
}