"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import type { Lang } from "@/lib/i18n/i18n";
import type { CustomerView } from "@/services/customerService";

export function CustomerForm({
  customer,
  onDone,
  onCancel,
  lang,
}: {
  customer?: CustomerView;
  onDone: () => void;
  onCancel: () => void;
  lang: Lang;
}) {
  const router = useRouter();
  const isEdit = Boolean(customer);

  const [name, setName] = useState(customer?.name ?? "");
  const [mobile, setMobile] = useState(customer?.mobile ?? "");
  const [pin, setPin] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    "stitch-input text-sm";
  const labelClass = "mb-1.5 block text-xs font-semibold text-earth-700 dark:text-earth-300";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const body = isEdit
        ? { name, mobile, ...(pin ? { pin } : {}) }
        : { name, mobile, pin };
      const res = await apiFetch(
        isEdit ? `/api/customers/${customer!.id}` : "/api/customers",
        { method: isEdit ? "PATCH" : "POST", body },
      );
      if (!res.ok) {
        setError(res.error?.message ?? (lang === "mr" ? "कृपया पुन्हा प्रयत्न करा" : "Operation failed. Please try again."));
        return;
      }
      router.refresh();
      onDone();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <h2 className="text-lg font-bold tracking-tight text-earth-900 dark:text-earth-100 font-display">
        {isEdit
          ? (lang === "mr" ? "ग्राहक माहिती बदला" : "Edit Customer Details")
          : (lang === "mr" ? "नवीन ग्राहक खाते तयार करा" : "Add New Customer")}
      </h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="customer-name" className={labelClass}>
            {lang === "mr" ? "पूर्ण नाव" : "Full Name"}
          </label>
          <input
            id="customer-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="customer-mobile" className={labelClass}>
            {lang === "mr" ? "मोबाईल क्रमांक" : "Mobile Number"}
          </label>
          <input
            id="customer-mobile"
            required
            type="tel"
            inputMode="numeric"
            pattern="[0-9]{10}"
            maxLength={10}
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="customer-pin" className={labelClass}>
            {isEdit
              ? (lang === "mr" ? "नवीन पिन (ऐच्छिक)" : "New PIN (optional)")
              : (lang === "mr" ? "तात्पुरता 4-अंकी पिन" : "Temp 4-Digit PIN")}
          </label>
          <input
            id="customer-pin"
            type="password"
            inputMode="numeric"
            maxLength={4}
            pattern="[0-9]{4}"
            required={!isEdit}
            placeholder={isEdit ? (lang === "mr" ? "रिकामे सोडा" : "Leave blank") : "0000"}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className={inputClass}
          />
        </div>
      </div>

      {error && <p className="text-sm font-medium text-clay-600 dark:text-clay-400">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="stitch-btn-primary text-sm"
        >
          {pending ? "..." : isEdit ? (lang === "mr" ? "जतन करा" : "Save Changes") : (lang === "mr" ? "ग्राहक तयार करा" : "Create Account")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="stitch-btn-secondary text-sm"
        >
          {lang === "mr" ? "रद्द करा" : "Cancel"}
        </button>
      </div>

      <p className="text-xs text-earth-500 dark:text-earth-400">
        {isEdit
          ? (lang === "mr"
              ? "टीप: नवीन पिन दिल्यास ग्राहकाला पहिल्या लॉगिनवर तो बदलावा लागेल."
              : "Note: Setting a new PIN forces the customer to change it on their next login.")
          : (lang === "mr"
              ? "ग्राहकाला हा पिन द्या — पहिल्या लॉगिनवर तो/ती नवीन पिन सेट करेल."
              : "Provide this temporary PIN to the customer. They will be prompted to set a private PIN on first login.")}
      </p>
    </form>
  );
}