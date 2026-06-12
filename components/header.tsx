"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBasket } from "./basket-provider";
import { LanguageSwitcher } from "./language-switcher";
import { t, type Locale } from "@/lib/i18n";

export function Header({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const { count } = useBasket();

  const tabs = [
    { href: "/catalog", label: t(locale, "nav_catalog") },
    { href: "/basket", label: t(locale, "nav_basket") },
    { href: "/orders", label: t(locale, "nav_orders") },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-600 text-sm font-extrabold text-white">
            X
          </span>
          <span className="text-lg font-extrabold tracking-tight text-stone-900">arid</span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-full px-3 py-1.5 ${
                pathname.startsWith(tab.href)
                  ? "bg-emerald-600 text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {tab.label}
              {tab.href === "/basket" && count > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-xs font-semibold text-stone-900">
                  {count}
                </span>
              )}
            </Link>
          ))}
          <LanguageSwitcher locale={locale} />
        </nav>
      </div>
    </header>
  );
}
