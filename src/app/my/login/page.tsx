import Link from "next/link";
import { CustomerLoginForm, LoginAlert } from "@/components/auth";

export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">ग्राहक लॉगिन</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Customer login</p>
        {error === "session_expired" && <LoginAlert />}
        <CustomerLoginForm />
        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/" className="underline hover:text-zinc-800 dark:hover:text-zinc-200">
            मागे / Back
          </Link>
        </p>
      </div>
    </main>
  );
}