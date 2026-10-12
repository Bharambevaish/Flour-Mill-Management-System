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
    <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
      <div>
        <label htmlFor="mobile" className="mb-1.5 block text-xs font-semibold text-muted dark:text-earth-300">
          मोबाईल क्रमांक / Mobile number
        </label>
        <input
          id="mobile"
          type="tel"
          required
          autoComplete="tel"
          inputMode="tel"
          placeholder="उदा. 98220XXXXX"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          className="stitch-input w-full"
          suppressHydrationWarning
        />
      </div>

      <div>
        <label htmlFor="customer-pin" className="mb-1.5 block text-xs font-semibold text-muted dark:text-earth-300">
          ४ अंकी पिन / 4-digit PIN
        </label>
        <input
          id="customer-pin"
          type="password"
          required
          inputMode="numeric"
          autoComplete="current-password"
          maxLength={4}
          placeholder="••••"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="stitch-input w-full text-center tracking-widest text-lg font-bold"
          suppressHydrationWarning
        />
      </div>

      {error && (
        <div className="rounded-xl border border-clay-200 bg-clay-50 p-3 text-xs font-semibold text-clay-800 dark:border-clay-900/50 dark:bg-clay-950/40 dark:text-clay-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="stitch-btn-primary mt-2 w-full py-3 text-base"
        suppressHydrationWarning
      >
        {pending ? "..." : "लॉगिन करा / Sign In"}
      </button>
    </form>
  );
}