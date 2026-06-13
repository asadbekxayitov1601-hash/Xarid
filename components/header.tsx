"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useBasket } from "./basket-provider";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeSwitcher } from "./theme-switcher";
import { t, type Locale } from "@/lib/i18n";
import { ShoppingBasket, Receipt, Store, LogIn, LogOut, User } from "lucide-react";
import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/use-reduced-motion-pref";
import { springSnappy } from "@/lib/motion-presets";
import { isClerkPublishableConfigured } from "@/lib/clerk";
import { SignInButton, SignUpButton, UserButton, SignedIn, SignedOut } from "@clerk/nextjs";

function Show({ when, children }: { when: "signed-in" | "signed-out"; children: React.ReactNode }) {
  if (when === "signed-in") {
    return <SignedIn>{children}</SignedIn>;
  }
  return <SignedOut>{children}</SignedOut>;
}

export function Header({ locale, userName }: { locale: Locale; userName: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { count } = useBasket();
  const [scrolled, setScrolled] = useState(false);
  const reduce = useReducedMotion();

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
            className="relative flex h-9 w-9 items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent))",
              boxShadow: "var(--shadow-glow-accent)",
            }}
          >
            <span className="font-display text-lg font-black leading-none" style={{ color: "var(--bg-primary)" }}>X</span>
          </motion.div>
          <span
            className="font-display text-lg font-bold tracking-tight transition-colors duration-200 group-hover:text-[color:var(--accent)]"
            style={{ color: "var(--text-primary)" }}
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
                aria-current={active ? "page" : undefined}
                className="relative flex items-center gap-1.5 rounded-full px-3 py-2 font-display text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] sm:px-4"
                style={{ color: active ? "var(--bg-primary)" : "var(--text-secondary)" }}
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
                    style={{ background: "var(--accent-2)", color: "var(--bg-primary)" }}
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
          {isClerkPublishableConfigured() ? (
            <div className="flex items-center gap-2">
              <Show when="signed-out">
                <div className="flex items-center gap-2">
                  <SignInButton mode="modal">
                    <button
                      className="font-display flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all hover:text-[color:var(--accent)] cursor-pointer"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <LogIn size={15} />
                      <span className="hidden sm:block">{t(locale, "auth_signin")}</span>
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button
                      className="font-display flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all bg-[color:var(--accent)] hover:opacity-90 cursor-pointer"
                      style={{ color: "var(--bg-primary)", boxShadow: "var(--shadow-glow-accent)" }}
                    >
                      <span>{t(locale, "auth_signup")}</span>
                    </button>
                  </SignUpButton>
                </div>
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </div>
          ) : userName ? (
            <div className="flex items-center gap-2">
              <div
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-border-primary bg-bg-secondary/80"
                style={{ color: "var(--text-primary)" }}
              >
                <User size={14} style={{ color: "var(--accent)" }} />
                <span className="font-display max-w-24 truncate">{userName}</span>
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
