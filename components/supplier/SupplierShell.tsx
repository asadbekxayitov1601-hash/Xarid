"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  BarChart3,
  Building2,
  LayoutDashboard,
  Package,
} from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

type NavKey = "dashboard" | "analytics" | "products" | "profile";

const NAV: { key: NavKey; href: string; labelKey:
  "supplier_nav_dashboard"
  | "supplier_nav_analytics"
  | "supplier_nav_products"
  | "supplier_nav_profile"; icon: ReactNode }[] = [
  { key: "dashboard", href: "/supplier", labelKey: "supplier_nav_dashboard", icon: <LayoutDashboard size={14} /> },
  { key: "analytics", href: "/supplier/analytics", labelKey: "supplier_nav_analytics", icon: <BarChart3 size={14} /> },
  { key: "products", href: "/supplier/products/new", labelKey: "supplier_nav_products", icon: <Package size={14} /> },
  { key: "profile", href: "/supplier/profile", labelKey: "supplier_nav_profile", icon: <Building2 size={14} /> },
];

// Shared header + tab strip rendered on every /supplier/* page. Keeps the
// existing /supplier page intact (it renders its own SupplierClient body)
// while adding cross-section nav so a deliver-account user can switch between
// orders, analytics, products, and profile without going back to the URL bar.
export function SupplierShell({
  locale,
  orgName,
  children,
}: {
  locale: Locale;
  orgName: string;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "";

  return (
    <div className="min-h-screen pt-20 pb-12 relative bg-bg-primary">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="blob"
          style={{
            width: 480,
            height: 480,
            top: "-12%",
            left: "-8%",
            background: "var(--accent)",
          }}
          aria-hidden
        />
        <div
          className="blob blob-2"
          style={{
            width: 360,
            height: 360,
            bottom: "-6%",
            right: "-8%",
            background: "var(--accent-2)",
            opacity: 0.18,
          }}
          aria-hidden
        />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <header className="glass-card rounded-2xl p-5 flex items-center gap-4">
          <div
            className="grid h-12 w-12 place-items-center rounded-xl text-xl font-extrabold"
            style={{
              background:
                "linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent) 60%, var(--bg-primary)))",
              color: "var(--bg-primary)",
              fontFamily: "var(--font-display, Inter)",
              boxShadow: "var(--shadow-glow-accent)",
            }}
            aria-hidden
          >
            {(orgName || "?").trim().charAt(0).toUpperCase() || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="font-bold text-base sm:text-lg text-text-primary truncate"
              style={{ fontFamily: "var(--font-display, Inter)" }}
            >
              {orgName}
            </div>
            <div className="text-xs text-text-secondary">
              {t(locale, "supplier_portal_subtitle")}
            </div>
          </div>
        </header>

        <nav
          aria-label={t(locale, "supplier_portal_title")}
          className="glass-card rounded-2xl p-1.5 flex flex-wrap gap-1.5"
        >
          {NAV.map((item) => {
            const active =
              item.key === "dashboard"
                ? pathname === "/supplier"
                : pathname.startsWith(item.href.replace(/\/new$/, ""));
            return (
              <Link
                key={item.key}
                href={item.href}
                className="flex-1 min-w-[42%] sm:min-w-0 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold transition-colors"
                style={
                  active
                    ? {
                        background: "var(--accent)",
                        color: "var(--bg-primary)",
                        fontFamily: "var(--font-display, Inter)",
                      }
                    : { color: "var(--text-secondary)" }
                }
              >
                {item.icon}
                {t(locale, item.labelKey)}
              </Link>
            );
          })}
        </nav>

        <main>{children}</main>
      </div>
    </div>
  );
}
