"use client";

// Route-level error boundary (Agent 3). Next.js renders this instead of a raw
// 500 / "Application error" screen whenever a route segment throws on the
// client or during a dynamic render. It must be a Client Component.
//
// The most common trigger is the catalog/health DB query failing when no
// Postgres is reachable; the catalog page now catches that itself, but this
// boundary is the safety net for any other route. Copy is translated via t();
// locale is read from the cookie (server context isn't available here).

import { useEffect, useState } from "react";
import Link from "next/link";
import { LOCALE_COOKIE, t, type Locale } from "@/lib/i18n";

function readLocale(): Locale {
  if (typeof document === "undefined") return "uz";
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`));
  const value = match?.[1];
  if (value === "ru") return "ru";
  if (value === "en") return "en";
  return "uz";
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<Locale>("uz");

  useEffect(() => {
    setLocale(readLocale());
    // Surface the digest in the console for diagnosis; users see friendly copy.
    console.error("[route error]", error?.digest, error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <div role="alert" className="glass-card rounded-3xl text-center px-6 py-16 max-w-md w-full">
        <div className="text-5xl mb-5 motion-safe:float-a" aria-hidden="true">
          🛠️
        </div>
        <h1
          className="text-lg font-bold text-text-primary"
          style={{ fontFamily: "var(--font-display, Outfit), sans-serif" }}
        >
          {t(locale, "err_title")}
        </h1>
        <p className="text-sm mt-2 text-text-secondary leading-relaxed">
          {t(locale, "err_body")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-7">
          <button
            type="button"
            onClick={() => reset()}
            className="px-5 py-3 rounded-2xl text-sm font-bold transition-all glow-button"
            style={{
              background: "var(--accent)",
              color: "var(--bg-primary)",
              fontFamily: "var(--font-display, Outfit), sans-serif",
            }}
          >
            {t(locale, "err_retry")}
          </button>
          <Link
            href="/"
            className="px-5 py-3 rounded-2xl text-sm font-semibold transition-all border border-border-primary text-text-primary hover:bg-bg-secondary/60"
            style={{ fontFamily: "var(--font-display, Outfit), sans-serif" }}
          >
            {t(locale, "err_home")}
          </Link>
        </div>
        {error?.digest && (
          <p className="text-[10px] mt-6 text-text-secondary/50 tabular-nums select-all">
            {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
