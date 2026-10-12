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
    <main className="flex min-h-screen items-center justify-center bg-earth-50 p-6 font-sans dark:bg-earth-950">
      <div className="w-full max-w-md rounded-xl border border-earth-200 bg-white p-8 text-center shadow-sm dark:border-earth-800 dark:bg-earth-900">
        <p className="text-2xl">पान लोड करताना काहीतरी चूक झाली / Something went wrong</p>
        <p className="mt-2 text-sm text-earth-500 dark:text-earth-400">
          कृपया पुन्हा प्रयत्न करा; समस्या कायम राहिल्यास पुन्हा लॉगिन करा. / Please try again, or sign in again if the problem persists.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-haldi-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-haldi-700"
          >
            पुन्हा प्रयत्न करा / Try again
          </button>
          <Link
            href="/login"
            className="rounded-lg border border-earth-300 px-5 py-2.5 text-sm font-semibold text-earth-700 hover:bg-earth-100 dark:border-earth-700 dark:text-earth-300 dark:hover:bg-earth-800"
          >
            लॉगिन / Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}