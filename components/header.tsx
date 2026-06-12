"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useBasket } from "./basket-provider";
import { LanguageSwitcher } from "./language-switcher";
import { t, type Locale } from "@/lib/i18n";

export function Header({ locale, userName }: { locale: Locale; userName: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { count } = useBasket();

  const tabs = [
    { href: "/catalog", label: t(locale, "nav_catalog"), icon: "fa-store" },
    { href: "/basket", label: t(locale, "nav_basket"), icon: "fa-basket-shopping" },
    { href: "/orders", label: t(locale, "nav_orders"), icon: "fa-receipt" },
  ];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-600 text-sm font-extrabold text-white shadow-sm">
            X
          </span>
          <span className="text-lg font-extrabold tracking-tight text-stone-900">arid</span>
        </Link>

        <nav className="ml-auto flex items-center gap-1 text-sm">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${
                pathname.startsWith(tab.href)
                  ? "bg-emerald-600 text-white shadow"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              <i className={`fa-solid ${tab.icon} text-xs`} aria-hidden />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.href === "/basket" && count > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-xs font-bold text-stone-900">
                  {count}
                </span>
              )}
            </Link>
          ))}

          {userName ? (
            <button
              onClick={logout}
              title={t(locale, "logout")}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-stone-600 transition hover:bg-stone-100"
            >
              <i className="fa-solid fa-circle-user text-base text-emerald-600" aria-hidden />
              <span className="hidden max-w-24 truncate sm:inline">{userName}</span>
              <i className="fa-solid fa-arrow-right-from-bracket text-xs" aria-hidden />
            </button>
          ) : (
            <Link
              href="/auth"
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${
                pathname.startsWith("/auth") ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              <i className="fa-solid fa-user text-xs" aria-hidden />
              <span className="hidden sm:inline">{t(locale, "auth_signin")}</span>
            </Link>
          )}

          <LanguageSwitcher locale={locale} />
        </nav>
      </div>
    </header>
  );
}
