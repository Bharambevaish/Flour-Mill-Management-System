"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";

export function CustomerLoginForm() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await apiFetch("/api/auth/customer/login", {
        body: { mobile, pin },
      });
      if (res.ok) {
        router.push("/my");
        return;
      }

      if (res.status === 429) {
        const wait = Math.max(1, Math.ceil((res.error?.retryAfter ?? 60) / 60));
        setError(
          `खूप जास्त प्रयत्न — कृपया ~${wait} मिनिटांनी पुन्हा प्रयत्न करा. / Too many attempts — please try again in about ${wait} minute${wait > 1 ? "s" : ""}.`,
        );
        return;
      }

      setError(res.error?.message ?? "लॉगिन अयशस्वी / Login failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
      <div>
        <label htmlFor="mobile" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          मोबाईल क्रमांक / Mobile number
        </label>
        <input
          id="mobile"
          type="tel"
          required
          autoComplete="tel"
          inputMode="tel"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-400"
        />
      </div>

      <div>
        <label htmlFor="customer-pin" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          ४ अंकी पिन / 4-digit PIN
        </label>
        <input
          id="customer-pin"
          type="password"
          required
          inputMode="numeric"
          autoComplete="current-password"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-400"
        />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-700 px-5 py-2.5 font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500"
      >
        {pending ? "..." : "लॉगिन / Login"}
      </button>
    </form>
  );
}