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
    <div className="glass-card card-3d rounded-2xl border border-white/8 bg-stone-900/40 p-6 shadow-lg">
      <h3 className="font-bold text-white text-base">{title}</h3>
      <p className="mt-1.5 text-sm text-stone-400 leading-relaxed">{text}</p>
      {state === "done" ? (
        <p className="mt-4 rounded-xl bg-emerald-500/15 border border-emerald-500/20 p-4 text-sm font-semibold text-emerald-300">
          <i className="fa-solid fa-circle-check mr-2" />
          {t(locale, "thanks")}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <input name="name" required placeholder={t(locale, "ph_name")} className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder-stone-500" />
          <input name="phone" required placeholder={t(locale, "ph_phone")} className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder-stone-500" />
          <input name="district" placeholder={t(locale, "ph_district")} className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder-stone-500" />
          <button
            disabled={state === "sending"}
            className="w-full rounded-xl bg-emerald-500 py-3 font-bold text-stone-950 shadow-lg shadow-emerald-500/10 hover:bg-emerald-400 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {state === "sending" ? t(locale, "sending") : t(locale, "btn_send")}
          </button>
          {state === "error" && <p className="text-sm text-red-400 font-semibold mt-2">{t(locale, "error_generic")}</p>}
        </form>
      )}
    </div>
  );
}
