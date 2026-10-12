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
    <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-muted dark:text-earth-300">
          ईमेल / Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="owner@example.com"
          className="stitch-input w-full"
          suppressHydrationWarning
        />
      </div>

      <div>
        <label htmlFor="owner-password" className="mb-1.5 block text-xs font-semibold text-muted dark:text-earth-300">
          पासवर्ड / Password
        </label>
        <input
          id="owner-password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••••"
          className="stitch-input w-full"
          suppressHydrationWarning
        />
      </div>

      {step === "totp" && (
        <div>
          <label htmlFor="totp-code" className="mb-1.5 block text-xs font-semibold text-muted dark:text-earth-300">
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
            className="stitch-input w-full text-center tracking-widest text-lg font-bold"
            suppressHydrationWarning
          />
          <p className="mt-1.5 text-xs text-muted dark:text-earth-400">
            आपल्या ऑथेंटिकेटर अ‍ॅपमधून 6-अंकी कोड टाका / Enter the 6-digit code from your authenticator app
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-clay-200 bg-clay-50 p-3 text-xs font-semibold text-clay-800 dark:border-clay-900/50 dark:bg-clay-950/40 dark:text-clay-300">
          {error}
        </div>
      )}

      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="stitch-btn-primary w-full py-3 text-base"
          suppressHydrationWarning
        >
          {pending ? "..." : step === "totp" ? "पडताळा / Verify" : "लॉगिन करा / Sign In"}
        </button>
        {step === "totp" && (
          <button
            type="button"
            disabled={pending}
            suppressHydrationWarning
            onClick={() => {
              setStep("credentials");
              setTotpCode("");
              setError(null);
            }}
            className="stitch-btn-secondary py-3.5 px-4"
          >
            मागे
          </button>
        )}
      </div>
    </form>
  );
}