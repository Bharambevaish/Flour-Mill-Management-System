"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/http/client";

const MAX_LEN = 500;

export interface ComposerCustomer {
  id: string;
  name: string;
  mobile: string;
}

export function NotificationsComposer({
  customerCount,
  customers,
  inAppEnabled,
  initialLang,
}: {
  customerCount: number;
  customers: ComposerCustomer[];
  inAppEnabled: boolean;
  initialLang: "mr" | "en";
}) {
  const [message, setMessage] = useState("");
  const [lang, setLang] = useState<"mr" | "en">(initialLang);
  const [audience, setAudience] = useState<"all" | "specific">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);
  const [error, setError] = useState("");

  const trimmed = message.trim();
  const needTargets = audience === "specific";
  const canSend =
    trimmed.length > 0 &&
    trimmed.length <= MAX_LEN &&
    !busy &&
    inAppEnabled &&
    (!needTargets || selected.size > 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function send() {
    setError("");
    setSentCount(null);
    setBusy(true);
    const res = await apiFetch<{ count: number }>("/api/owner/notifications/broadcast", {
      method: "POST",
      body: {
        message: trimmed,
        lang,
        ...(needTargets ? { customerIds: [...selected] } : {}),
      },
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error?.message ?? "काहीतरी चुकले — प्रयत्न नंतर करा / Something went wrong, try again.");
      return;
    }
    setSentCount(res.data?.count ?? 0);
    setMessage("");
    setSelected(new Set());
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
          ग्राहकांना सूचना पाठवा / Send a notification to customers
        </h2>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {customerCount} सक्रिय ग्राहक — सगळ्यांना किंवा निवडलेल्या ग्राहकांनाच पाठवा.
          <br />
          {customerCount} active customer{customerCount === 1 ? "" : "s"} — message everyone or just the ones you pick.
        </p>
      </div>

      <div className="space-y-4 p-5">
        {!inAppEnabled && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-400/10 dark:text-amber-200">
            Settings मध्ये “इन-ॲप सूचना” बंद आहे — काहीही पाठवले जाणार नाही. / In-app notifications are switched off in Settings — nothing will be delivered.
          </p>
        )}

        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <span>{lang === "mr" ? "मराठी संदेश" : "English message"}</span>
            <label className="ml-auto flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                <input
                  type="radio"
                  name="notif-lang"
                  value="mr"
                  checked={lang === "mr"}
                  onChange={() => setLang("mr")}
                  className="mr-1"
                />
                मराठी
              </span>
              <span>
                <input
                  type="radio"
                  name="notif-lang"
                  value="en"
                  checked={lang === "en"}
                  onChange={() => setLang("en")}
                  className="mr-1"
                />
                English
              </span>
            </label>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={MAX_LEN}
            rows={4}
            placeholder={lang === "mr" ? "उदा: उद्या चक्की बंद राहील — कृपया गाठोजी आधीच संपवा" : "e.g. The mill will be closed tomorrow — please finish your grain today"}
            className="mt-2 w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <p className="mt-1 text-right text-xs text-zinc-400">
            {message.length}/{MAX_LEN}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {lang === "mr" ? "कोणाला पाठवायचे?" : "Who should receive it?"}
            </span>
            <label className="flex cursor-pointer items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="radio"
                name="audience"
                checked={audience === "all"}
                onChange={() => setAudience("all")}
                className="accent-emerald-600"
              />
              {lang === "mr" ? "सर्व सक्रिय ग्राहक" : "All active customers"}
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="radio"
                name="audience"
                checked={audience === "specific"}
                onChange={() => setAudience("specific")}
                className="accent-emerald-600"
              />
              {lang === "mr" ? "निवडलेले ग्राहक" : "Specific customers"}
              {audience === "specific" && selected.size > 0 && (
                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {selected.size}
                </span>
              )}
            </label>
          </div>

          {audience === "specific" && (
            <ul className="mt-3 max-h-48 divide-y divide-zinc-100 overflow-y-auto rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-700">
              {customers.map((c) => (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/60">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                      className="accent-emerald-600"
                    />
                    <span className="truncate font-medium">{c.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{c.mobile}</span>
                  </label>
                </li>
              ))}
              {customers.length === 0 && (
                <li className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {lang === "mr" ? "कोणतेही सक्रिय ग्राहक नाहीत." : "No active customers."}
                </li>
              )}
            </ul>
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </p>
        )}

        {sentCount !== null && (
          <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
            {sentCount > 0
              ? `पाठवले: ${sentCount} ग्राहकांना. / Sent to ${sentCount} customer${sentCount === 1 ? "" : "s"}.`
              : "कोणतेही सक्रिय ग्राहक नाहीत. / No active customers to notify."}
          </p>
        )}

        <button
          type="button"
          onClick={() => void send()}
          disabled={!canSend}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
        >
          {busy
            ? "पाठवत आहे… / Sending…"
            : needTargets
              ? "निवडलेल्या ग्राहकांना पाठवा / Send to selected customers"
              : "सर्व ग्राहकांना पाठवा / Send to all customers"}
        </button>
      </div>
    </section>
  );
}