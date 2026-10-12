"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/http/client";
import { formatDateTime } from "@/lib/i18n/format";
import { IconBell, IconCheck } from "@/components/common/Icons";
import type { CustomerDueRow } from "@/services/reminderService";

type Result = { sent: number; skippedRecent: number; skippedNoDue: number; disabled: boolean; customerIds: string[] };

const money = (n: number) => `₹ ${n.toLocaleString("en-IN")}`;

/**
 * Customer-wise dues with a "send reminder" button per row and one for
 * everyone. The server recomputes every amount and skips anyone reminded in
 * the last few hours (`remindedRecently`), so a double tap never nags twice.
 */
export function DueRemindersPanel({
  rows,
  lang,
}: {
  rows: CustomerDueRow[];
  lang: "mr" | "en";
}) {
  const router = useRouter();
  const mr = lang === "mr";
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);
  const [justSent, setJustSent] = useState<Set<string>>(new Set());

  const recent = (r: CustomerDueRow) => justSent.has(r.customerId) || r.remindedRecently;

  async function send(customerIds?: string[]) {
    const key = customerIds?.[0] ?? "all";
    setBusy(key);
    setNote(null);
    const res = await apiFetch<Result>("/api/owner/notifications/reminders", {
      method: "POST",
      body: customerIds ? { customerIds } : {},
    });
    setBusy(null);
    if (!res.ok || !res.data) {
      setNote({ tone: "warn", text: res.error?.message ?? (mr ? "पाठवता आले नाही, पुन्हा प्रयत्न करा" : "Could not send, try again") });
      return;
    }
    const d = res.data;
    if (d.disabled) {
      setNote({
        tone: "warn",
        text: mr
          ? "ॲपमधील सूचना सेटिंग्जमध्ये बंद आहेत — आधी त्या सुरू करा."
          : "In-app notifications are switched off in Settings — turn them on first.",
      });
      return;
    }
    setJustSent((prev) => new Set([...prev, ...d.customerIds]));
    const parts: string[] = [];
    parts.push(mr ? `${d.sent} ग्राहकांना आठवण पाठवली` : `Reminder sent to ${d.sent} customer${d.sent === 1 ? "" : "s"}`);
    if (d.skippedRecent > 0)
      parts.push(mr ? `${d.skippedRecent} जणांना नुकतीच पाठवली होती` : `${d.skippedRecent} already reminded recently`);
    setNote({ tone: d.sent > 0 ? "ok" : "warn", text: parts.join(" · ") });
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <section className="stitch-card flex items-center gap-3 p-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-leaf-100 text-leaf-700 dark:bg-leaf-950 dark:text-leaf-400">
          <IconCheck className="h-5 w-5" />
        </span>
        <p className="font-semibold text-heading">{mr ? "कोणाचीही उधारी बाकी नाही." : "Nobody owes anything right now."}</p>
      </section>
    );
  }

  const allRecent = rows.every(recent);

  return (
    <section className="stitch-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
        <div>
          <h2 className="text-xl text-heading">{mr ? "ग्राहकनिहाय उधारी" : "Dues by customer"}</h2>
          <p className="text-sm text-muted">
            {mr
              ? "आठवण ग्राहकाच्या ॲपमध्ये त्याच्या रकमेसह जाते."
              : "Each customer gets a private in-app reminder with their own amount."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy !== null || allRecent}
          className="stitch-btn-primary px-4"
        >
          <IconBell className="h-4 w-4" />
          {busy === "all" ? "…" : mr ? `सर्वांना आठवण पाठवा (${rows.length})` : `Remind everyone (${rows.length})`}
        </button>
      </div>

      {note && (
        <p
          role="status"
          className={`border-b border-[var(--border-subtle)] px-5 py-2.5 text-sm font-semibold ${
            note.tone === "ok" ? "bg-leaf-50 text-leaf-800 dark:bg-leaf-950/50 dark:text-leaf-300" : "bg-haldi-50 text-haldi-800 dark:bg-haldi-950/50 dark:text-haldi-300"
          }`}
        >
          {note.text}
        </p>
      )}

      <ul className="divide-y divide-[var(--border-subtle)]">
        {rows.map((r) => {
          const isRecent = recent(r);
          return (
            <li key={r.customerId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="font-bold text-heading">
                  {r.name} <span className="text-sm font-normal text-muted">· {r.mobile}</span>
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {mr ? "ऑर्डर" : "Orders"}{" "}
                  {r.orderNumbers.map((n, i) => (
                    <span key={n}>
                      {i > 0 && ", "}
                      <Link href={`/owner/orders/${n}`} className="font-medium text-clay-700 hover:underline dark:text-clay-400">
                        #{n}
                      </Link>
                    </span>
                  ))}
                  {r.lastRemindedAt && (
                    <span className="ml-1">
                      · {mr ? "शेवटची आठवण" : "last reminded"} {formatDateTime(r.lastRemindedAt, lang)}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-display text-xl text-clay-700 dark:text-clay-400">{money(r.due)}</p>
                {isRecent ? (
                  <span className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-leaf-50 px-3 text-xs font-bold text-leaf-800 dark:bg-leaf-950/60 dark:text-leaf-300">
                    <IconCheck className="h-3.5 w-3.5" />
                    {mr ? "पाठवली" : "Sent"}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void send([r.customerId])}
                    disabled={busy !== null}
                    className="stitch-btn-secondary px-3 text-sm"
                  >
                    <IconBell className="h-4 w-4" />
                    {busy === r.customerId ? "…" : mr ? "आठवण पाठवा" : "Remind"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
