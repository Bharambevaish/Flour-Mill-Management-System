import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">गिरणी व्यवस्थापन</h1>
        <p className="mt-1 text-zinc-500 dark:text-zinc-400">Flour Mill Management</p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-zinc-900 px-5 py-3 text-center font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          मालक लॉगिन / Owner Login
        </Link>
        <Link
          href="/my/login"
          className="rounded-lg border border-zinc-300 bg-white px-5 py-3 text-center font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          ग्राहक लॉगिन / Customer Login
        </Link>
      </div>
    </main>
  );
}