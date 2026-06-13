"use client";

// Top-level fallback (Agent 3). global-error replaces the ROOT layout when the
// layout itself (or anything above the route error boundary) throws, so it must
// render its own <html>/<body> and cannot assume globals.css, providers or
// fonts are available. Keep it minimal and inline-styled. Copy is translated
// via t(); locale is read from the cookie.

import { useEffect, useState } from "react";
import { LOCALE_COOKIE, t, type Locale } from "@/lib/i18n";

function readLocale(): Locale {
  if (typeof document === "undefined") return "uz";
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`));
  const value = match?.[1];
  if (value === "ru") return "ru";
  if (value === "en") return "en";
  return "uz";
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<Locale>("uz");

  useEffect(() => {
    setLocale(readLocale());
    console.error("[global error]", error?.digest, error);
  }, [error]);

  return (
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#020202",
          color: "#f7f6fb",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          padding: "1.5rem",
        }}
      >
        <div role="alert" style={{ textAlign: "center", maxWidth: 420 }}>
          <div aria-hidden="true" style={{ fontSize: 48, marginBottom: 16 }}>
            🛠️
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>
            {t(locale, "err_title")}
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.7, margin: "0 0 24px" }}>
            {t(locale, "err_body")}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "12px 20px",
              borderRadius: 16,
              border: "none",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              background: "#A556FB",
              color: "#ffffff",
            }}
          >
            {t(locale, "err_retry")}
          </button>
          {error?.digest && (
            <p style={{ fontSize: 10, marginTop: 24, opacity: 0.4 }}>{error.digest}</p>
          )}
        </div>
      </body>
    </html>
  );
}
