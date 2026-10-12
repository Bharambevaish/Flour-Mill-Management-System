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
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-white shadow-soft dark:border-earth-800 dark:bg-earth-900">
      <div className="border-b border-clay-50 px-6 py-5 dark:border-earth-800">
        <h2 className="text-lg font-bold text-earth-900 dark:text-earth-100 font-display">
          ग्राहकांना सूचना पाठवा / Send a notification to customers
        </h2>
        <p className="mt-1 text-sm text-earth-500 dark:text-earth-400">
          {customerCount} सक्रिय ग्राहक — सगळ्यांना किंवा निवडलेल्या ग्राहकांनाच पाठवा.
          <br />
          {customerCount} active customer{customerCount === 1 ? "" : "s"} — message everyone or just the ones you pick.
        </p>
      </div>

      <div className="space-y-5 p-6">
        {!inAppEnabled && (
          <p className="rounded-xl border border-haldi-300 bg-haldi-50 px-4 py-2.5 text-sm text-haldi-800 dark:border-haldi-500/40 dark:bg-haldi-400/10 dark:text-haldi-200">
            Settings मध्ये “इन-ॲप सूचना” बंद आहे — काहीही पाठवले जाणार नाही. / In-app notifications are switched off in Settings — nothing will be delivered.
          </p>
        )}

        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-earth-700 dark:text-earth-300">
            <span>{lang === "mr" ? "मराठी संदेश" : "English message"}</span>
            <label className="ml-auto flex items-center gap-3 text-xs text-earth-500 dark:text-earth-400">
              <span className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="notif-lang"
                  value="mr"
                  checked={lang === "mr"}
                  onChange={() => setLang("mr")}
                  className="accent-clay-700"
                />
                मराठी
              </span>
              <span className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="notif-lang"
                  value="en"
                  checked={lang === "en"}
                  onChange={() => setLang("en")}
                  className="accent-clay-700"
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
            className="stitch-input mt-2 text-sm"
          />
          <p className="mt-1 text-right text-xs text-earth-400">
            {message.length}/{MAX_LEN}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-clay-50/20 p-5 dark:border-earth-800 dark:bg-earth-900/40">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-semibold text-earth-800 dark:text-earth-200">
              {lang === "mr" ? "कोणाला पाठवायचे?" : "Who should receive it?"}
            </span>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-earth-700 dark:text-earth-300">
              <input
                type="radio"
                name="audience"
                checked={audience === "all"}
                onChange={() => setAudience("all")}
                className="accent-clay-700"
              />
              {lang === "mr" ? "सर्व सक्रिय ग्राहक" : "All active customers"}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-earth-700 dark:text-earth-300">
              <input
                type="radio"
                name="audience"
                checked={audience === "specific"}
                onChange={() => setAudience("specific")}
                className="accent-clay-700"
              />
              {lang === "mr" ? "निवडलेले ग्राहक" : "Specific customers"}
              {audience === "specific" && selected.size > 0 && (
                <span className="rounded-full bg-clay-100 border border-clay-200 px-2 py-0.5 text-xs font-semibold text-clay-800 dark:bg-clay-900/40 dark:text-clay-300 dark:border-clay-700">
                  {selected.size}
                </span>
              )}
            </label>
          </div>

          {audience === "specific" && (
            <ul className="mt-3 max-h-48 divide-y divide-clay-50 overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-white dark:divide-earth-800 dark:border-earth-700 dark:bg-earth-900">
              {customers.map((c) => (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-earth-800 hover:bg-clay-50/40 dark:text-earth-200 dark:hover:bg-earth-800/60">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                      className="accent-clay-700"
                    />
                    <span className="truncate font-medium">{c.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-earth-500 dark:text-earth-400">{c.mobile}</span>
                  </label>
                </li>
              ))}
              {customers.length === 0 && (
                <li className="px-3 py-2 text-sm text-earth-500 dark:text-earth-400">
                  {lang === "mr" ? "कोणतेही सक्रिय ग्राहक नाहीत." : "No active customers."}
                </li>
              )}
            </ul>
          )}
        </div>

        {error && (
          <p className="rounded-xl border border-clay-300 bg-clay-50 px-4 py-2.5 text-sm font-medium text-clay-800 dark:border-clay-500/40 dark:bg-clay-500/10 dark:text-clay-200">
            {error}
          </p>
        )}

        {sentCount !== null && (
          <p className="rounded-xl border border-leaf-300 bg-leaf-50 px-4 py-2.5 text-sm font-medium text-leaf-800 dark:border-leaf-500/40 dark:bg-leaf-500/10 dark:text-leaf-200">
            {sentCount > 0
              ? `पाठवले: ${sentCount} ग्राहकांना. / Sent to ${sentCount} customer${sentCount === 1 ? "" : "s"}.`
              : "कोणतेही सक्रिय ग्राहक नाहीत. / No active customers to notify."}
          </p>
        )}

        <button
          type="button"
          onClick={() => void send()}
          disabled={!canSend}
          className="stitch-btn-primary text-sm"
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