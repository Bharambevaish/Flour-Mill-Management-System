"use client";

import Link from "next/link";

/**
 * Root App-Router error boundary. Catches any unhandled error thrown while
 * rendering a page so the owner never sees a raw stack dump — just a clean,
 * bilingual message with a retry / sign-in path. Errors are still logged
 * server-side by the framework.
 */
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-2xl">पान लोड करताना काहीतरी चूक झाली / Something went wrong</p>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          कृपया पुन्हा प्रयत्न करा; समस्या कायम राहिल्यास पुन्हा लॉगिन करा. / Please try again, or sign in again if the problem persists.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
          >
            पुन्हा प्रयत्न करा / Try again
          </button>
          <Link
            href="/login"
            className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            लॉगिन / Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}