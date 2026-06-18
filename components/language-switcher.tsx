"use client";

import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { motion } from "motion/react";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();

  function selectLocale(selected: Locale) {
    if (selected === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${selected};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    router.refresh();
  }

  return (
    <div
      className="relative rounded-full flex items-center flex-shrink-0 h-8 w-20 select-none border border-border-primary bg-bg-secondary/90 transition-all duration-300"
      aria-label="Toggle language"
    >
      <motion.div
        animate={{ x: locale === "uz" ? 2 : 38 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="absolute w-9 h-7 rounded-full bg-emerald-500 shadow-md"
      />
      <button
        type="button"
        onClick={() => selectLocale("uz")}
        className="relative z-10 flex-1 text-center text-xs font-bold transition-colors duration-200 cursor-pointer h-full flex items-center justify-center"
        style={{
          color: locale === "uz" ? "var(--on-accent)" : "var(--text-secondary)",
          fontFamily: "Outfit, sans-serif",
        }}
      >
        UZ
      </button>
      <button
        type="button"
        onClick={() => selectLocale("ru")}
        className="relative z-10 flex-1 text-center text-xs font-bold transition-colors duration-200 cursor-pointer h-full flex items-center justify-center"
        style={{
          color: locale === "ru" ? "var(--on-accent)" : "var(--text-secondary)",
          fontFamily: "Outfit, sans-serif",
        }}
      >
        RU
      </button>
    </div>
  );
}
