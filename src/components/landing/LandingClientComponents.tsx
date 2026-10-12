"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { IconArrowRight } from "@/components/common/Icons";

/** Same segmented switch the rest of the app uses. */
export function LandingNavLanguageToggle({ initialLang = "en" }: { initialLang?: "mr" | "en" }) {
  return <LanguageToggle initialLang={initialLang} />;
}

/**
 * Mobile-number shortcut into the customer login: the number is carried over
 * as `/my/login?mobile=…`, where the form arrives pre-filled and the customer
 * only types their PIN. It does not look anything up by itself — every order
 * stays behind the PIN.
 */
export function CustomerTrackForm({ lang = "en" }: { lang?: "mr" | "en" }) {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const mr = lang === "mr";

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const digits = mobile.replace(/\D/g, "");
    router.push(digits ? `/my/login?mobile=${digits}` : "/my/login");
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        id="track-input"
        suppressHydrationWarning
        value={mobile}
        onChange={(e) => setMobile(e.target.value)}
        className="stitch-input min-w-0 flex-1 text-base"
        placeholder={mr ? "उदा. 98220XXXXX" : "e.g. 98220XXXXX"}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        maxLength={14}
      />
      <button type="submit" suppressHydrationWarning className="stitch-btn-primary shrink-0 px-5">
        {mr ? "पुढे" : "Next"}
        <IconArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}
