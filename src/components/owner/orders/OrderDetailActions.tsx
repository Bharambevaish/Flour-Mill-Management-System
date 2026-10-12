"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/http/client";
import { IconBell, IconPrinter } from "@/components/common/Icons";
import { PaymentModal } from "@/components/owner/payments/PaymentModal";
import { OrderActionModal } from "./OrderActionModal";
import { CancelOrderDialog } from "./CancelOrderDialog";
import type { Lang } from "@/lib/i18n/format";
import type { OrderView } from "@/services/orderService";

const NEXT_LABEL: Partial<Record<OrderView["status"], { mr: string; en: string }>> = {
  pending: { mr: "दळण्यास सुरू करा", en: "Start milling" },
  processing: { mr: "तयार झाले", en: "Mark as ready" },
  completed: { mr: "घेतला", en: "Mark as collected" },
};

/** Every action the owner can take on one order, from its detail page. */
export function OrderDetailActions({ order, lang }: { order: OrderView; lang: Lang }) {
  const mr = lang === "mr";
  const [modal, setModal] = useState<"step" | "pay" | "cancel" | null>(null);
  const [remind, setRemind] = useState<"idle" | "busy" | "sent" | "recent" | "error">("idle");

  const next = NEXT_LABEL[order.status];
  const live = order.status !== "collected" && order.status !== "cancelled";

  async function sendReminder() {
    if (!order.customer) return;
    setRemind("busy");
    const res = await apiFetch<{ sent: number; skippedRecent: number }>("/api/owner/notifications/reminders", {
      method: "POST",
      body: { customerIds: [order.customer.id] },
    });
    if (!res.ok || !res.data) return setRemind("error");
    setRemind(res.data.sent > 0 ? "sent" : res.data.skippedRecent > 0 ? "recent" : "error");
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {next && (
          <button type="button" onClick={() => setModal("step")} className="stitch-btn-primary px-4">
            {mr ? next.mr : next.en}
          </button>
        )}
        {order.outstanding > 0 && (
          <button type="button" onClick={() => setModal("pay")} className={next ? "stitch-btn-secondary px-4" : "stitch-btn-primary px-4"}>
            {mr ? "पैसे स्वीकारा" : "Collect payment"}
          </button>
        )}
        {order.outstanding > 0 && order.customer && (
          <button
            type="button"
            onClick={() => void sendReminder()}
            disabled={remind === "busy" || remind === "sent" || remind === "recent"}
            className="stitch-btn-secondary px-4"
          >
            <IconBell className="h-4 w-4" />
            {remind === "sent"
              ? mr ? "आठवण पाठवली" : "Reminder sent"
              : remind === "recent"
                ? mr ? "नुकतीच पाठवली होती" : "Reminded recently"
                : remind === "error"
                  ? mr ? "पुन्हा प्रयत्न करा" : "Try again"
                  : mr ? "उधारी आठवण पाठवा" : "Send reminder"}
          </button>
        )}
        <Link href={`/print/receipt/${order.orderId}`} target="_blank" className="stitch-btn-secondary px-4">
          <IconPrinter className="h-4 w-4" />
          {mr ? "पावती" : "Receipt"}
        </Link>
        {live && (
          <button
            type="button"
            onClick={() => setModal("cancel")}
            className="inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-semibold text-earth-600 hover:bg-earth-100 hover:text-red-700 dark:text-earth-400 dark:hover:bg-earth-800"
          >
            {mr ? "ऑर्डर रद्द करा" : "Cancel order"}
          </button>
        )}
      </div>

      {modal === "step" && <OrderActionModal order={order} lang={lang} onClose={() => setModal(null)} />}
      {modal === "pay" && <PaymentModal order={order} lang={lang} onClose={() => setModal(null)} />}
      {modal === "cancel" && <CancelOrderDialog order={order} lang={lang} onClose={() => setModal(null)} />}
    </>
  );
}
