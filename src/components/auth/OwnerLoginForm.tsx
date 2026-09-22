"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";

type LoginResponse = {
  needTotp?: boolean;
  csrfToken?: string;
  user?: { id: string; name: string; email: string };
};

export function OwnerLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [step, setStep] = useState<"credentials" | "totp">("credentials");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await apiFetch<LoginResponse>("/api/auth/owner/login", {
        body: step === "totp" ? { email, password, totpCode } : { email, password },
      });

      if (res.data?.needTotp) {
        setStep("totp");
        return;
      }

      if (res.ok) {
        router.push("/owner");
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
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          ईमेल / Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-400"
        />
      </div>

      <div>
        <label htmlFor="owner-password" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          पासवर्ड / Password
        </label>
        <input
          id="owner-password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-400"
        />
      </div>

      {step === "totp" && (
        <div>
          <label htmlFor="totp-code" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            ऑथेंटिकेटर कोड / 2FA Code
          </label>
          <input
            id="totp-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoComplete="one-time-code"
            placeholder="••••••"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-400"
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            आपल्या ऑथेंटिकेटर अ‍ॅपमधून 6-अंकी कोड टाका / Enter the 6-digit code from your authenticator app
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-5 py-2.5 font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "..." : step === "totp" ? "पडताळा / Verify" : "लॉगिन / Login"}
        </button>
        {step === "totp" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setStep("credentials");
              setTotpCode("");
              setError(null);
            }}
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            मागे / Back
          </button>
        )}
      </div>
    </form>
  );
}