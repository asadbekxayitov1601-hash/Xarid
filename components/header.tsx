"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useBasket } from "./basket-provider";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeSwitcher } from "./theme-switcher";
import { t, type Locale } from "@/lib/i18n";
import { ShoppingBasket, Receipt, Store, LogIn, LogOut, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useReducedMotion } from "@/lib/use-reduced-motion-pref";
import { springSnappy } from "@/lib/motion-presets";

export function Header({
  locale,
  userName,
  isSeller = false,
}: {
  locale: Locale;
  userName: string | null;
  // True when the logged-in user owns a SUPPLIER org (computed server-side in
  // layout.tsx) — surfaces the seller-only "My profile" link in the account menu.
  isSeller?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { count } = useBasket();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const reduce = useReducedMotion();
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close the account menu on outside-click and Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  // Close the menu whenever the route changes (e.g. tapping "My orders").
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const tabs = [
    { href: "/catalog", id: "catalog", label: t(locale, "nav_catalog"), icon: Store },
    { href: "/basket", id: "basket", label: t(locale, "nav_basket"), icon: ShoppingBasket },
    { href: "/orders", id: "orders", label: t(locale, "nav_orders"), icon: Receipt },
  ];

  async function logout() {
    setMenuOpen(false);
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
            aria-hidden
            className="relative flex h-9 w-9 items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent))",
              boxShadow: "var(--shadow-glow-accent)",
            }}
          >
            <ShoppingBasket size={18} strokeWidth={2.5} style={{ color: "var(--on-accent)" }} />
          </motion.div>
          <span
            className="font-display text-lg font-extrabold tracking-tight transition-colors duration-200 group-hover:text-[color:var(--accent)]"
            style={{ color: "var(--text-primary)" }}
          >
            Xarid
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
                aria-current={active ? "page" : undefined}
                className="relative flex items-center gap-1.5 rounded-full px-3 py-2 font-display text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] sm:px-4"
                style={{ color: active ? "var(--on-accent)" : "var(--text-secondary)" }}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    transition={reduce ? { duration: 0 } : springSnappy}
                    aria-hidden
                    className="absolute inset-0 -z-[1] rounded-full"
                    style={{ background: "var(--accent)", boxShadow: "var(--shadow-glow-accent)" }}
                  />
                )}
                <Icon size={15} className="relative z-[1]" />
                <span className="relative z-[1] hidden sm:block">{label}</span>
                {id === "basket" && count > 0 && (
                  <motion.span
                    initial={{ scale: reduce ? 1 : 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-1 -top-1 z-[2] flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: "var(--accent-2)", color: "var(--on-accent)" }}
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

          {/* Auth — custom phone/password session (lib/session.ts). */}
          {userName ? (
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={t(locale, "acct_menu_label")}
                className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-1.5 text-sm font-medium border border-border-primary bg-bg-secondary/80 transition-colors hover:border-[color:var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] cursor-pointer sm:pr-2"
                style={{ color: "var(--text-primary)" }}
              >
                <span
                  aria-hidden
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full font-display text-xs font-bold uppercase"
                  style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                >
                  {userName.trim().charAt(0) || "?"}
                </span>
                <span className="font-display hidden max-w-24 truncate sm:block">{userName}</span>
                <ChevronDown
                  size={14}
                  aria-hidden
                  className="hidden flex-shrink-0 transition-transform duration-200 sm:block"
                  style={{
                    color: "var(--text-secondary)",
                    transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    role="menu"
                    aria-label={t(locale, "acct_menu_label")}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.96 }}
                    animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.96 }}
                    transition={reduce ? { duration: 0.1 } : springSnappy}
                    className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 origin-top-right overflow-hidden rounded-2xl border border-border-primary p-1.5 shadow-xl"
                    style={{
                      background: "var(--glass-bg)",
                      backdropFilter: "blur(20px)",
                      WebkitBackdropFilter: "blur(20px)",
                    }}
                  >
                    <div
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
                      role="presentation"
                    >
                      <span
                        aria-hidden
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-display text-sm font-bold uppercase"
                        style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                      >
                        {userName.trim().charAt(0) || "?"}
                      </span>
                      <span
                        className="font-display min-w-0 flex-1 truncate text-sm font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {userName}
                      </span>
                    </div>

                    <div
                      className="my-1 h-px"
                      role="separator"
                      aria-hidden
                      style={{ background: "var(--border-color)" }}
                    />

                    <Link
                      href="/orders"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                      style={{ color: "var(--text-primary)" }}
                    >
                      <Receipt size={16} style={{ color: "var(--accent)" }} aria-hidden />
                      <span className="font-display">{t(locale, "acct_menu_my_orders")}</span>
                    </Link>

                    {isSeller && (
                      <Link
                        href="/supplier/profile"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                        style={{ color: "var(--text-primary)" }}
                      >
                        <Store size={16} style={{ color: "var(--accent)" }} aria-hidden />
                        <span className="font-display">{t(locale, "acct_menu_profile")}</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      role="menuitem"
                      onClick={logout}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] cursor-pointer"
                      style={{ color: "var(--text-primary)" }}
                    >
                      <LogOut size={16} className="text-red-400" aria-hidden />
                      <span className="font-display">{t(locale, "acct_menu_logout")}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link
              href="/auth"
              className="font-display flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all hover:text-[color:var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
              style={{ color: "var(--text-secondary)" }}
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
