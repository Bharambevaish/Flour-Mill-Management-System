import Link from "next/link";
import { CustomerLoginForm, LoginAlert } from "@/components/auth";

export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#faf5f7] p-6 font-sans selection:bg-rose-100 selection:text-rose-900 dark:bg-zinc-950">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[360px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-b from-rose-200/40 via-pink-100/30 to-transparent blur-3xl dark:hidden" />
      <div className="pointer-events-none absolute bottom-10 -right-20 h-80 w-80 rounded-full bg-amber-100/40 blur-3xl dark:hidden" />

      <div className="stitch-card relative z-10 w-full max-w-md overflow-hidden rounded-3xl p-8 sm:p-10 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* Top Hairline in Rose Gradient */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-pink-200 via-rose-500 to-amber-200" />

        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-pink-100 text-2xl text-rose-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-rose-400">
            🌾
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#4c0519] dark:text-zinc-100">
            ग्राहक लॉगिन
          </h1>
          <p className="mt-1 text-sm font-medium text-[#6b545a] dark:text-zinc-400">
            Feed and Flour Management — Customer Portal
          </p>
        </div>

        {error === "session_expired" && <LoginAlert />}
        <CustomerLoginForm />

        <p className="mt-6 text-center text-sm font-medium text-[#6b545a] dark:text-zinc-400">
          <Link
            href="/"
            className="text-rose-700 underline underline-offset-4 transition-colors hover:text-rose-900 dark:text-rose-400 dark:hover:text-rose-300"
          >
            ← मागे / Back to Home
          </Link>
        </p>
      </div>
    </main>
  );
}