"use client";

import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();
  const other: Locale = locale === "uz" ? "ru" : "uz";

  return (
    <button
      onClick={() => {
        document.cookie = `${LOCALE_COOKIE}=${other};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
        router.refresh();
      }}
      className="rounded-full border border-stone-300 px-2.5 py-1 text-xs font-semibold uppercase text-stone-600 hover:bg-stone-100"
      aria-label="Til / Язык"
    >
      {other}
    </button>
  );
}
