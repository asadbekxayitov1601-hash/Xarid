"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

// Dedicated sign in / sign up page (web users). Telegram Mini App users
// are authenticated automatically and never need this.
export function AuthClient({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        phone: form.get("phone"),
        password: form.get("password"),
        name: form.get("name"),
      }),
    }).catch(() => null);

    if (res?.ok) {
      router.push("/catalog");
      router.refresh();
      return;
    }
    const data = await res?.json().catch(() => null);
    setError(
      data?.error === "taken"
        ? t(locale, "auth_taken")
        : data?.error === "phone"
          ? t(locale, "auth_bad_phone")
          : t(locale, "auth_invalid")
    );
    setBusy(false);
  }

  return (
    <div className="scene-perspective relative mx-auto w-full max-w-md px-4 pt-10">
      <div className="blob left-[-80px] top-[-20px] h-56 w-56 bg-emerald-300/50" />
      <div className="blob blob-2 right-[-60px] top-[40%] h-48 w-48 bg-amber-300/40" />

      <div className="card-3d relative rounded-3xl border border-stone-200 bg-white p-7 shadow-xl">
        <div className="flex items-center gap-2.5">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-600 text-lg font-extrabold text-white">
            X
          </span>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">
              {mode === "signin" ? t(locale, "auth_signin") : t(locale, "auth_signup")}
            </h1>
            <p className="text-xs text-stone-500">{t(locale, "auth_subtitle")}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-2xl bg-stone-100 p-1 text-sm font-semibold">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`rounded-xl py-2 transition ${mode === m ? "bg-white shadow" : "text-stone-500"}`}
            >
              <i className={`fa-solid ${m === "signin" ? "fa-right-to-bracket" : "fa-user-plus"} mr-1.5 text-xs`} />
              {t(locale, m === "signin" ? "auth_signin" : "auth_signup")}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          {mode === "signup" && (
            <div className="relative">
              <i className="fa-solid fa-shop pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-stone-400" />
              <input
                name="name"
                placeholder={t(locale, "ph_person_name")}
                className="w-full rounded-xl border border-stone-300 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          )}
          <div className="relative">
            <i className="fa-solid fa-phone pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-stone-400" />
            <input
              name="phone"
              required
              placeholder="+998 90 123 45 67"
              className="w-full rounded-xl border border-stone-300 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div className="relative">
            <i className="fa-solid fa-lock pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-stone-400" />
            <input
              name="password"
              type="password"
              required
              minLength={6}
              placeholder={t(locale, "ph_password")}
              className="w-full rounded-xl border border-stone-300 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
              <i className="fa-solid fa-circle-exclamation mr-1.5" />
              {error}
            </p>
          )}

          <button
            disabled={busy}
            className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? (
              <i className="fa-solid fa-spinner fa-spin" />
            ) : (
              <>
                {t(locale, mode === "signin" ? "auth_signin" : "auth_signup")}
                <i className="fa-solid fa-arrow-right ml-2 text-sm" />
              </>
            )}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-sm text-stone-500 hover:text-emerald-700"
        >
          {t(locale, mode === "signin" ? "auth_no_account" : "auth_have_account")}{" "}
          <span className="font-semibold text-emerald-700">
            {t(locale, mode === "signin" ? "auth_signup" : "auth_signin")}
          </span>
        </button>
      </div>
    </div>
  );
}
