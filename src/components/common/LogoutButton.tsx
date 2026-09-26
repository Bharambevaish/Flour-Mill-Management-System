"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    const res = await apiFetch("/api/auth/logout");
    router.push("/");
    void res;
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-900 shadow-xs transition-all hover:bg-rose-50 hover:border-rose-300 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
    >
      {pending ? "..." : "लॉगआउट / Logout"}
    </button>
  );
}