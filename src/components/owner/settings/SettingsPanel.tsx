"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { apiFetch } from "@/lib/client";
import { GRAINS, SIZES, DEFAULT_RATES } from "@/lib/millings";

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/** Password field with a show/hide toggle button. */
function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="stitch-input pr-10 text-sm"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          title={visible ? "लपवा / Hide" : "दाखवा / Show"}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          {visible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

interface SettingsShape {
  millName?: string;
  phone?: string;
  address?: string;
  currency?: string;
  defaultLanguage?: "mr" | "en";
  rates?: Record<string, Record<string, number>>;
  notifications?: {
    inApp: boolean;
    webPush: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
}

interface SettingsPanelProps {
  initialSettings?: SettingsShape;
  initialTheme?: "dark" | "light";
  initialTwoFaEnabled?: boolean;
  initialLang?: "mr" | "en";
}

type TabId = "general" | "rates" | "notifs" | "security";

type Notice = { text: string; type: "success" | "error" } | null;

export function SettingsPanel({
  initialSettings,
  initialTheme = "dark",
  initialTwoFaEnabled = false,
  initialLang = "en",
}: SettingsPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("general");

  const [millName, setMillName] = useState(initialSettings?.millName || "श्री गणेश फिड मील (Flour Mill)");
  const [phone, setPhone] = useState(initialSettings?.phone || "");
  const [address, setAddress] = useState(initialSettings?.address || "");
  const [currency, setCurrency] = useState(initialSettings?.currency || "₹");
  const [defaultLanguage, setDefaultLanguage] = useState<"mr" | "en">(
    initialSettings?.defaultLanguage === "en" ? "en" : "mr",
  );
  const [rates, setRates] = useState<Record<string, Record<string, number>>>(
    initialSettings?.rates
      ? { ...initialSettings.rates }
      : (structuredClone(DEFAULT_RATES) as Record<string, Record<string, number>>),
  );
  const [notifs, setNotifs] = useState(
    initialSettings?.notifications || { inApp: true, webPush: true, sms: false, whatsapp: false },
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Notice>(null);

  /* -------- derived validation + dirty tracking (one global Save) -------- */

  const current = useMemo(
    () => ({ millName, phone, address, currency, defaultLanguage, rates, notifications: notifs }),
    [millName, phone, address, currency, defaultLanguage, rates, notifs],
  );

  const initial = useMemo(
    () => ({
      millName: initialSettings?.millName || "श्री गणेश फिड मील (Flour Mill)",
      phone: initialSettings?.phone || "",
      address: initialSettings?.address || "",
      currency: initialSettings?.currency || "₹",
      defaultLanguage: initialSettings?.defaultLanguage === "en" ? "en" : "mr",
      rates: initialSettings?.rates
        ? { ...initialSettings.rates }
        : (structuredClone(DEFAULT_RATES) as Record<string, Record<string, number>>),
      notifications: initialSettings?.notifications || { inApp: true, webPush: true, sms: false, whatsapp: false },
    }),
    [initialSettings],
  );

  const dirty = JSON.stringify(current) !== JSON.stringify(initial);
  const invalidRates = Object.values(rates).some((sizes) =>
    Object.values(sizes).some((n) => !Number.isFinite(n) || n < 0),
  );
  const invalid = !millName.trim() || invalidRates;

  /* ------------------------------ handlers ------------------------------ */

  function handleRateChange(grain: string, size: string, val: string) {
    const num = val === "" ? 0 : Number(val);
    setRates((prev) => ({
      ...prev,
      [grain]: {
        ...(prev[grain] || {}),
        [size]: Number.isFinite(num) ? num : 0,
      },
    }));
  }

  async function saveSettings() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch<{ settings?: SettingsShape }>("/api/owner/settings", {
        method: "PATCH",
        body: current,
      });
      if (res.ok) {
        // Apply the mill-wide default language to this session immediately.
        if (defaultLanguage !== initial.defaultLanguage) {
          document.cookie = `lang=${defaultLanguage}; path=/; max-age=31536000; SameSite=Lax`;
        }
        setMessage({ text: "सेटिंग्स सेव्ह झाल्या! / Settings saved successfully!", type: "success" });
        router.refresh();
      } else {
        setMessage({ text: `सेव्ह करताना त्रुटी आली: ${res.error?.message ?? "Save failed"}`, type: "error" });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error saving settings";
      setMessage({ text: errorMsg, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------- Security tab state ------------------------- */

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passBusy, setPassBusy] = useState(false);
  const [passMsg, setPassMsg] = useState<Notice>(null);

  const [twoFaEnabled, setTwoFaEnabled] = useState(initialTwoFaEnabled);
  const [twoFaStep, setTwoFaStep] = useState<"idle" | "setup" | "disable">("idle");
  const [setupInfo, setSetupInfo] = useState<{
    otpauthUrl: string;
    qrDataUrl: string;
    secret: string;
  } | null>(null);
  const [twoFaCode, setTwoFaCode] = useState("");
  const [twoFaBusy, setTwoFaBusy] = useState(false);
  const [twoFaError, setTwoFaError] = useState<string | null>(null);

  async function changePassword() {
    setPassMsg(null);
    setPassBusy(true);
    try {
      if (newPassword.length < 8) {
        setPassMsg({ text: "नवा पासवर्ड किमान 8 अक्षरांचा असावा / New password must be at least 8 characters", type: "error" });
        return;
      }
      if (newPassword !== confirmPassword) {
        setPassMsg({ text: "पासवर्ड जुळत नाहीत / Passwords do not match", type: "error" });
        return;
      }
      const res = await apiFetch("/api/auth/owner/change-password", {
        method: "PATCH",
        body: { currentPassword, newPassword },
      });
      if (res.ok) {
        setPassMsg({ text: "पासवर्ड बदलला! / Password changed successfully", type: "success" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPassMsg({ text: res.error?.message ?? "पासवर्ड बदलता आला नाही / Failed to change password", type: "error" });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Network error";
      setPassMsg({ text: `${errorMsg} — कृपया पुन्हा प्रयत्न करा / Please try again`, type: "error" });
    } finally {
      setPassBusy(false);
    }
  }

  async function startTotpSetup() {
    setTwoFaError(null);
    setTwoFaBusy(true);
    try {
      const res = await apiFetch<{ otpauthUrl: string; qrDataUrl: string; secret: string }>(
        "/api/auth/owner/2fa/setup",
      );
      if (res.ok && res.data) {
        setSetupInfo(res.data);
        setTwoFaStep("setup");
        setTwoFaCode("");
      } else {
        setTwoFaError(res.error?.message ?? "2FA सेटअप अयशस्वी / 2FA setup failed");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Network error";
      setTwoFaError(`${errorMsg} — कृपया पुन्हा प्रयत्न करा / Please try again`);
    } finally {
      setTwoFaBusy(false);
    }
  }

  async function confirmTotp() {
    if (!/^\d{6}$/.test(twoFaCode)) return;
    setTwoFaError(null);
    setTwoFaBusy(true);
    try {
      const res = await apiFetch("/api/auth/owner/2fa/verify", { body: { code: twoFaCode } });
      if (res.ok) {
        setTwoFaEnabled(true);
        setTwoFaStep("idle");
        setSetupInfo(null);
        setTwoFaCode("");
        router.refresh();
      } else {
        setTwoFaError(res.error?.message ?? "Invalid verification code");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Network error";
      setTwoFaError(`${errorMsg} — कृपया पुन्हा प्रयत्न करा / Please try again`);
    } finally {
      setTwoFaBusy(false);
    }
  }

  async function disableTotp() {
    if (!/^\d{6}$/.test(twoFaCode)) return;
    setTwoFaError(null);
    setTwoFaBusy(true);
    try {
      const res = await apiFetch("/api/auth/owner/2fa/disable", { body: { code: twoFaCode } });
      if (res.ok) {
        setTwoFaEnabled(false);
        setTwoFaStep("idle");
        setTwoFaCode("");
        router.refresh();
      } else {
        setTwoFaError(res.error?.message ?? "Invalid code");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Network error";
      setTwoFaError(`${errorMsg} — कृपया पुन्हा प्रयत्न करा / Please try again`);
    } finally {
      setTwoFaBusy(false);
    }
  }

  /* ------------------------------- render ------------------------------- */

  const tabClass = (id: TabId) =>
    `border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
      activeTab === id
        ? "border-rose-600 text-rose-700 dark:border-rose-400 dark:text-rose-400"
        : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
    }`;

  const inputClass =
    "stitch-input text-sm";

  return (
    <div className="flex flex-col gap-6">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap border-b border-rose-100 dark:border-zinc-800">
        <button onClick={() => setActiveTab("general")} className={tabClass("general")}>
          १. भाषा व चक्की प्रोफाइल / Profile &amp; Lang
        </button>
        <button onClick={() => setActiveTab("rates")} className={tabClass("rates")}>
          २. दळणाचे दर ({currency}/KG) / Milling Rates
        </button>
        <button onClick={() => setActiveTab("notifs")} className={tabClass("notifs")}>
          ३. सूचना चॅनेल्स / Notifications
        </button>
        <button onClick={() => setActiveTab("security")} className={tabClass("security")}>
          ४. सुरक्षा आणि 2FA / Security
        </button>
      </div>

      {message && (
        <div
          className={`rounded-2xl border p-4 text-sm font-medium shadow-soft ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-300"
              : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/50 dark:text-rose-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tab 1: General & Profile */}
      {activeTab === "general" && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-[var(--border-subtle)] bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-base font-bold text-zinc-900 dark:text-zinc-100 font-[family-name:var(--font-plus-jakarta)]">
              भाषा आणि देखावा / Language &amp; Display Toggle
            </h3>
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">तुमची भाषा / Your session language</p>
                <LanguageToggle initialLang={initialLang} />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">थीम निवडा / Theme Toggle</p>
                <ThemeToggle initialTheme={initialTheme} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  मिलची डीफॉल्ट भाषा / Mill default language
                </label>
                <select
                  value={defaultLanguage}
                  onChange={(e) => setDefaultLanguage(e.target.value as "mr" | "en")}
                  className="stitch-input text-sm py-2 px-3"
                >
                  <option value="mr">मराठी</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--border-subtle)] bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-base font-bold text-zinc-900 dark:text-zinc-100 font-[family-name:var(--font-plus-jakarta)]">
              चक्की माहिती / Mill Profile
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  चक्कीचे नाव / Mill Name
                </label>
                <input
                  type="text"
                  value={millName}
                  onChange={(e) => setMillName(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  संपर्क मोबाईल / Contact Mobile
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  चलनाचे चिन्ह / Currency Symbol
                </label>
                <input
                  type="text"
                  value={currency}
                  maxLength={8}
                  onChange={(e) => setCurrency(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  पत्ता / Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Main Road, Village, District"
                  className={inputClass}
                />
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Tab 2: Milling Rates */}
      {activeTab === "rates" && (
        <section className="rounded-2xl border border-[var(--border-subtle)] bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-1 text-base font-bold text-zinc-900 dark:text-zinc-100 font-[family-name:var(--font-plus-jakarta)]">
            दळणाचे डीफॉल्ट दर ({currency} / KG)
          </h3>
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            नवीन ऑर्डर घेताना हे दर आपोआप लागू होतील (ऑर्डर घेताना बदलता येतात)
          </p>
          {invalidRates && (
            <p className="mb-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
              कृपया वैध दर टाका (शून्य किंवा त्याहून अधिक) / Rates must be zero or more
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-rose-100 bg-rose-50/40 text-xs font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">धान्य / Grain</th>
                  {SIZES.map((s) => (
                    <th key={s.key} className="px-4 py-3">
                      {s.mr} / {s.en} ({currency}/kg)
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-50 dark:divide-zinc-800">
                {GRAINS.map((g) => (
                  <tr key={g.key} className="hover:bg-rose-50/20 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                      {g.mr} / {g.en}
                    </td>
                    {SIZES.map((s) => (
                      <td key={s.key} className="px-4 py-2">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={rates[g.key]?.[s.key] ?? DEFAULT_RATES[g.key]?.[s.key] ?? 5}
                          onChange={(e) => handleRateChange(g.key, s.key, e.target.value)}
                          className="stitch-input w-24 px-2.5 py-1.5 text-sm"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tab 3: Notifications */}
      {activeTab === "notifs" && (
        <section className="rounded-2xl border border-[var(--border-subtle)] bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-4 text-base font-bold text-zinc-900 dark:text-zinc-100 font-[family-name:var(--font-plus-jakarta)]">
            सूचना चॅनेल्स / Notification Channels &amp; Integrations
          </h3>

          <div className="space-y-3">
            {(
              [
                {
                  key: "inApp" as const,
                  title: "इन-ॲप ट्रे / In-App Tray",
                  desc: "ॲपमध्ये ग्राहक आणि मालकाला सूचना दिसतील",
                  checked: notifs.inApp,
                  toggle: () => setNotifs({ ...notifs, inApp: !notifs.inApp }),
                },
                {
                  key: "webPush" as const,
                  title: "वेब पुश / Web Push (PWA)",
                  desc: "मोबाईल व ब्राऊझर पुश नोटिफिकेशन्स",
                  checked: notifs.webPush,
                  toggle: () => setNotifs({ ...notifs, webPush: !notifs.webPush }),
                },
                {
                  key: "sms" as const,
                  title: "SMS (MSG91 Gateway)",
                  desc: "ग्राहकांना एसएमएस संदेश (DLT Sender ID आवश्यक)",
                  checked: notifs.sms,
                  toggle: () => setNotifs({ ...notifs, sms: !notifs.sms }),
                },
                {
                  key: "whatsapp" as const,
                  title: "WhatsApp (Meta Cloud API)",
                  desc: "व्हाट्सॲपवर दळण तयार झाल्याचे मेसेज पाठवा",
                  checked: notifs.whatsapp,
                  toggle: () => setNotifs({ ...notifs, whatsapp: !notifs.whatsapp }),
                },
              ] as const
            ).map((c) => (
              <label key={c.key} className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] p-3.5 hover:bg-rose-50/20 dark:border-zinc-800 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors">
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">{c.title}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{c.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={c.checked}
                  onChange={c.toggle}
                  className="h-4 w-4 rounded accent-rose-700"
                />
              </label>
            ))}
          </div>
        </section>
      )}

      {/* Tab 4: Security */}
      {activeTab === "security" && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-[var(--border-subtle)] bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-base font-bold text-zinc-900 dark:text-zinc-100 font-[family-name:var(--font-plus-jakarta)]">
              पासवर्ड बदला / Change Owner Password
            </h3>
            <div className="grid max-w-md grid-cols-1 gap-4">
              <PasswordInput
                id="current-password"
                label="सध्याचा पासवर्ड / Current Password"
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
              />
              <PasswordInput
                id="new-password"
                label="नवीन पासवर्ड / New Password"
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
              />
              <PasswordInput
                id="confirm-new-password"
                label="नवीन पासवर्ड पुन्हा / Confirm New Password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
              />
              {passMsg && (
                <p className={`text-sm font-medium ${passMsg.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {passMsg.text}
                </p>
              )}
              <div>
                <button
                  type="button"
                  disabled={passBusy || !currentPassword || !newPassword || !confirmPassword}
                  onClick={changePassword}
                  className="stitch-btn-primary text-sm"
                >
                  {passBusy ? "..." : "पासवर्ड बदला / Change Password"}
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--border-subtle)] bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-[family-name:var(--font-plus-jakarta)]">
                  टू-फॅक्टर ऑथेंटिकेशन (TOTP 2FA)
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Google Authenticator / QR द्वारे अतिरिक्त सुरक्षा
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  twoFaEnabled
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {twoFaEnabled ? "ON" : "OFF"}
              </span>
            </div>

            {twoFaError && <p className="mb-3 text-sm font-medium text-rose-600 dark:text-rose-400">{twoFaError}</p>}

            {twoFaStep === "idle" && (
              <div>
                {twoFaEnabled ? (
                  <div className="flex max-w-md flex-col gap-3">
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                      डिसेबल करण्यासाठी आपल्या ऑथेंटिकेटर ऍपमधील 6-अंकी कोड टाका / Enter your current 6-digit code to disable
                    </p>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="••••••"
                      value={twoFaCode}
                      onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ""))}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      disabled={twoFaBusy || twoFaCode.length !== 6}
                      onClick={() => {
                        void disableTotp();
                      }}
                      className="stitch-btn-secondary text-sm border-rose-300 text-rose-700 hover:bg-rose-50"
                    >
                      {twoFaBusy ? "..." : "2FA बंद करा / Disable 2FA"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={twoFaBusy}
                    onClick={() => {
                      void startTotpSetup();
                    }}
                    className="stitch-btn-secondary text-sm"
                  >
                    {twoFaBusy ? "..." : "2FA सेट करा / Enable 2FA"}
                  </button>
                )}
              </div>
            )}

            {twoFaStep === "setup" && setupInfo && (
              <div className="max-w-md space-y-3">
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  Google Authenticator किंवा इतर ऍपने हा QR स्कॅन करा / Scan this QR with your authenticator app:
                </p>
                <div className="inline-block rounded-xl border border-[var(--border-subtle)] bg-white p-3 dark:border-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={setupInfo.qrDataUrl} alt="TOTP QR code" className="h-40 w-40" />
                </div>
                <div>
                  <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
                    QR स्कॅन करता येत नसेल तर हा कोड लिहून ठेवा / Manual fallback secret:
                  </p>
                  <code className="rounded bg-rose-50 border border-rose-100 px-2 py-1 text-xs text-rose-900 dark:bg-zinc-800 dark:text-zinc-100">
                    {setupInfo.secret}
                  </code>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    6-अंकी कोड / 6-digit Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="••••••"
                    value={twoFaCode}
                    onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ""))}
                    className={inputClass}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={twoFaBusy || twoFaCode.length !== 6}
                    onClick={() => {
                      void confirmTotp();
                    }}
                    className="stitch-btn-primary text-sm"
                  >
                    {twoFaBusy ? "..." : "पडताळून चालू करा / Verify & Enable"}
                  </button>
                  <button
                    type="button"
                    disabled={twoFaBusy}
                    onClick={() => {
                      setTwoFaStep("idle");
                      setSetupInfo(null);
                      setTwoFaCode("");
                      setTwoFaError(null);
                    }}
                    className="stitch-btn-secondary text-sm"
                  >
                    रद्द / Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        {invalid && (
          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
            कृपया मिलचे नाव आणि वैध दर तपासा / Fix the mill name or rate values first
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            void saveSettings();
          }}
          disabled={saving || !dirty || invalid}
          title={!dirty ? "No unsaved changes" : undefined}
          className="stitch-btn-primary text-sm"
        >
          {saving ? "सेव्ह होत आहे... / Saving..." : "सेटिंग्स सेव्ह करा / Save Settings"}
        </button>
      </div>
    </div>
  );
}