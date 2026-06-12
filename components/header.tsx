"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useBasket } from "./basket-provider";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeSwitcher } from "./theme-switcher";
import { t, type Locale } from "@/lib/i18n";
import { ShoppingBasket, Receipt, Store, LogIn, LogOut, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function Header({ locale, userName }: { locale: Locale; userName: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { count } = useBasket();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const tabs = [
    { href: "/catalog", id: "catalog", label: t(locale, "nav_catalog"), icon: Store },
    { href: "/basket", id: "basket", label: t(locale, "nav_basket"), icon: ShoppingBasket },
    { href: "/orders", id: "orders", label: t(locale, "nav_orders"), icon: Receipt },
  ];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.refresh();
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled
          ? "var(--glass-bg)"
          : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled
          ? "1px solid var(--border-color)"
          : "none",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 group flex-shrink-0"
        >
          <motion.div
            whileHover={{ scale: 1.08 }}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #10b981, #059669)",
              boxShadow: "0 0 20px rgba(16,185,129,0.4)",
            }}
          >
            <span className="text-white font-black text-lg leading-none" style={{ fontFamily: "Outfit, sans-serif" }}>X</span>
          </motion.div>
          <span
            className="text-lg font-bold tracking-tight transition-colors duration-200 group-hover:text-emerald-500"
            style={{ fontFamily: "Outfit, sans-serif", color: "var(--text-primary)" }}
          >
            arid
          </span>
        </Link>

        {/* Nav Tabs */}
        <nav className="flex items-center gap-1 flex-1 justify-center">
          {tabs.map(({ href, id, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={id}
                href={href}
                className="relative flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200"
                style={{
                  background: active ? "#10b981" : "transparent",
                  color: active ? "#0c0a09" : "var(--text-secondary)",
                  boxShadow: active ? "0 0 16px rgba(16,185,129,0.35)" : "none",
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                <Icon size={15} />
                <span className="hidden sm:block">{label}</span>
                {id === "basket" && count > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "#f59e0b", color: "#0c0a09" }}
                  >
                    {count > 9 ? "9+" : count}
                  </motion.span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <ThemeSwitcher />
          <LanguageSwitcher locale={locale} />

          {/* Auth */}
          {userName ? (
            <div className="flex items-center gap-2">
              <div
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-border-primary bg-bg-secondary/80"
                style={{ color: "var(--text-primary)" }}
              >
                <User size={14} className="text-emerald-500" />
                <span style={{ fontFamily: "Outfit, sans-serif" }} className="max-w-24 truncate">{userName}</span>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-full hover:bg-red-500/10 transition-colors cursor-pointer"
                title={t(locale, "logout")}
              >
                <LogOut size={16} className="text-red-400" />
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:text-emerald-500"
              style={{ color: "var(--text-secondary)", fontFamily: "Outfit, sans-serif" }}
            >
              <LogIn size={15} />
              <span className="hidden sm:block">{t(locale, "auth_signin")}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
