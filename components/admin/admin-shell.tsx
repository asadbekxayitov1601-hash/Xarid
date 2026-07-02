"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, ClipboardList, Store, Truck, Navigation, Route, Wallet,
  BarChart3, LogOut, Menu, X, MessageCircle,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Bosh sahifa", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Buyurtmalar", icon: ClipboardList },
  { href: "/admin/suppliers", label: "Do'konlar", icon: Store },
  { href: "/admin/drivers", label: "Haydovchilar", icon: Truck },
  { href: "/admin/dispatch", label: "Xarid Go", icon: Navigation },
  { href: "/admin/routes", label: "Marshrut", icon: Route },
  { href: "/admin/finance", label: "Moliya", icon: Wallet },
  { href: "/admin/support", label: "Yordam", icon: MessageCircle },
  { href: "/admin/analytics", label: "Tahlil", icon: BarChart3 },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

// Unified branded admin shell: a cream+green sidebar (desktop) / drawer (mobile)
// that navigates the real admin pages, plus a sticky header showing the current
// section. Wraps every /admin page via app/admin/layout.tsx.
export function AdminShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const current = NAV.find((n) => isActive(pathname, n.href, n.exact));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/auth");
    router.refresh();
  }

  const NavList = () => (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(pathname, href, exact);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors"
            style={{
              background: active ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent",
              color: active ? "var(--accent)" : "var(--text-secondary)",
              border: active
                ? "1px solid color-mix(in srgb, var(--accent) 30%, transparent)"
                : "1px solid transparent",
            }}
          >
            <Icon size={18} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const Brand = () => (
    <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-5 py-5">
      <span className="relative h-9 w-9 overflow-hidden rounded-xl">
        <Image src="/logo.png" alt="Xarid" fill sizes="36px" className="object-contain" priority />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-base font-extrabold text-text-primary">Xarid</span>
        <span className="block text-xs text-text-secondary">Boshqaruv paneli</span>
      </span>
    </Link>
  );

  const Footer = () => (
    <div className="border-t border-border-primary p-3">
      <div className="mb-2 flex items-center gap-2.5 rounded-xl px-3 py-2" style={{ background: "var(--bg-secondary)" }}>
        <span
          className="grid h-8 w-8 place-items-center rounded-full text-sm font-bold"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
        >
          {(userName[0] || "A").toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-text-primary">{userName}</span>
          <span className="block text-xs text-text-secondary">Administrator</span>
        </span>
      </div>
      <button
        type="button"
        onClick={logout}
        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:text-red-500"
      >
        <LogOut size={18} aria-hidden /> Chiqish
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Desktop sidebar */}
      <aside
        className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col border-r border-border-primary lg:flex"
        style={{ background: "var(--bg-secondary)" }}
      >
        <Brand />
        <NavList />
        <Footer />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border-primary lg:hidden"
              style={{ background: "var(--bg-secondary)" }}
            >
              <Brand />
              <NavList />
              <Footer />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-30 flex items-center gap-3 border-b border-border-primary px-4 py-3 sm:px-6"
          style={{ background: "color-mix(in srgb, var(--bg-primary) 85%, transparent)", backdropFilter: "blur(8px)" }}
        >
          <button
            type="button"
            aria-label="Menyu"
            onClick={() => setOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg text-text-secondary hover:bg-bg-secondary lg:hidden"
          >
            <Menu size={20} />
          </button>
          <h1 className="font-display text-lg font-bold text-text-primary">
            {current?.label ?? "Admin"}
          </h1>
          <span
            className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{
              background: "var(--status-success-bg)",
              color: "var(--status-success)",
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--status-success)" }} /> Jonli
          </span>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
