"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";

interface SeedSummary {
  orders: number;
  notifications: number;
  nextOrderId: number;
}

export function SeedDemoButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function seed() {
    setPending(true);
    setMsg(null);
    try {
      const res = await apiFetch<{ summary: SeedSummary }>("/api/dev/seed-demo");
      if (!res.ok) {
        setMsg({ text: res.error?.message ?? "अयशस्वी / Failed", ok: false });
      } else {
        const s = res.data?.summary;
        setMsg({
          text: s
            ? `सेड केले: ${s.orders} ऑर्डर / Seeded ${s.orders} orders (next #${s.nextOrderId})`
            : "सेड केले / Seeded",
          ok: true,
        });
        router.refresh();
      }
    } finally {
      setPending(false);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setMsg(null), 4000);
    }
  }

  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-2">
      {msg && (
        <span
          className={
            msg.ok
              ? "rounded-full border border-emerald-300 bg-white/90 px-3 py-1 text-xs font-medium text-emerald-800 shadow-sm backdrop-blur dark:border-emerald-500/40 dark:bg-zinc-900/90 dark:text-emerald-300"
              : "rounded-full border border-rose-300 bg-white/90 px-3 py-1 text-xs font-medium text-rose-700 shadow-sm backdrop-blur dark:border-rose-500/40 dark:bg-zinc-900/90 dark:text-rose-300"
          }
        >
          {msg.text}
        </span>
      )}
      <button
        type="button"
        onClick={seed}
        disabled={pending}
        className="rounded-full border border-zinc-300 bg-white/90 px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-sm backdrop-blur transition-colors hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-zinc-800"
        title="परीक्षणासाठी डेमो डेटा तयार करा / Seed demo data for testing"
      >
        {pending ? "..." : "⚙ Seed demo"}
      </button>
    </div>
  );
}