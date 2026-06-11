"use client";

import { useState } from "react";
import { t, type Locale } from "@/lib/i18n";

export function LeadForm({
  locale,
  role,
  title,
  text,
}: {
  locale: Locale;
  role: "BUYER" | "SUPPLIER";
  title: string;
  text: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("sending");
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        name: form.get("name"),
        phone: form.get("phone"),
        district: form.get("district"),
      }),
    }).catch(() => null);
    setState(res?.ok ? "done" : "error");
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-stone-600">{text}</p>
      {state === "done" ? (
        <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
          {t(locale, "thanks")}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <input name="name" required placeholder={t(locale, "ph_name")} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          <input name="phone" required placeholder={t(locale, "ph_phone")} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          <input name="district" placeholder={t(locale, "ph_district")} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          <button
            disabled={state === "sending"}
            className="w-full rounded-lg bg-emerald-600 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {state === "sending" ? t(locale, "sending") : t(locale, "btn_send")}
          </button>
          {state === "error" && <p className="text-sm text-red-600">{t(locale, "error_generic")}</p>}
        </form>
      )}
    </div>
  );
}
