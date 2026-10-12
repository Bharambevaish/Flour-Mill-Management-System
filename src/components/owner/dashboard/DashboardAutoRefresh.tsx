"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { localeOf, type Lang } from "@/lib/i18n/format";

export function DashboardAutoRefresh({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const refreshing = useRef(false);

  const refresh = useCallback(() => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      router.refresh();
      setLastUpdated(new Date());
    } finally {
      refreshing.current = false;
    }
  }, [router]);

  useEffect(() => {
    refresh();
    function onVisibility() {
      if (document.visibilityState === "visible") refresh();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refresh]);

  return (
    <div className="flex shrink-0 items-center gap-3">
      {lastUpdated && (
        <span className="text-xs text-earth-400 dark:text-earth-500">
          {lang === "mr"
            ? `शेवटचे अपडेट ${lastUpdated.toLocaleTimeString(localeOf(lang), { hour: "2-digit", minute: "2-digit" })}`
            : `Updated at ${lastUpdated.toLocaleTimeString(localeOf(lang), { hour: "2-digit", minute: "2-digit" })}`}
        </span>
      )}
      <button
        type="button"
        onClick={refresh}
        className="stitch-btn-secondary px-3.5 py-1.5 text-xs cursor-pointer"
      >
        {lang === "mr" ? "↻ ताजे करा" : "↻ Refresh"}
      </button>
    </div>
  );
}