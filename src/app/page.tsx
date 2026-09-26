import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#faf5f7] p-6 font-sans selection:bg-rose-100 selection:text-rose-900 dark:bg-zinc-950">
      {/* Soft ambient background glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-pink-200/40 blur-3xl dark:hidden" />
      <div className="pointer-events-none absolute -left-20 bottom-10 h-80 w-80 rounded-full bg-rose-100/50 blur-3xl dark:hidden" />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        {/* Grain Badge */}
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-200/80 bg-rose-50/80 px-4 py-1.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-sm font-bold uppercase tracking-wider text-rose-800 dark:text-rose-400">
            🌾 अन्नपूर्णा स्मार्ट गिरणी कल्प
          </span>
        </div>

        <h1 className="bg-gradient-to-r from-[#970046] via-[#be185d] to-[#e11d48] bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl drop-shadow-[0_2px_12px_rgba(190,24,93,0.15)] dark:from-zinc-100 dark:to-zinc-300">
          गिरणी व्यवस्थापन
        </h1>
        <p className="mt-1 text-base font-semibold text-[#3b121e] dark:text-zinc-300">
          Flour Mill Management System
        </p>
        <p className="mt-1 text-sm text-[#6b545a] dark:text-zinc-400">
          स्थानिक धान्य गिरणी व ग्राहकांसाठी आधुनिक डिजिटल व्यासपीठ
        </p>

        <div className="mt-8 flex w-full flex-col gap-3.5">
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 px-5 py-3.5 text-center font-bold text-white shadow-[0_0_20px_-3px_rgba(190,24,93,0.25)] transition-all hover:scale-[1.01] hover:brightness-105 active:scale-[0.98] dark:shadow-none"
          >
            <span>मालक लॉगिन / Owner Login</span>
            <span>→</span>
          </Link>
          <Link
            href="/my/login"
            className="flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-5 py-3.5 text-center font-bold text-rose-900 shadow-sm transition-all hover:border-rose-300 hover:bg-rose-50 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <span>ग्राहक लॉगिन / Customer Login</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}