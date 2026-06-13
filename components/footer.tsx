import Link from "next/link";
import { ShoppingBasket } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";

export function Footer({ locale }: { locale: Locale }) {
  const navLinks = [
    { href: "/catalog", label: t(locale, "nav_catalog") },
    { href: "/orders", label: t(locale, "nav_orders") },
    { href: "/supplier", label: t(locale, "supplier_portal_title") },
    { href: "/auth", label: t(locale, "auth_signin") },
  ];

  return (
    <footer className="w-full border-t border-border-primary bg-bg-secondary/30 px-6 py-10 text-center text-text-primary transition-colors duration-300">
      <div className="mx-auto flex items-center justify-center gap-2">
        <span
          aria-hidden
          className="grid h-8 w-8 place-items-center rounded-lg shadow-[var(--shadow-md)]"
          style={{ background: "var(--accent)", color: "var(--bg-primary)" }}
        >
          <ShoppingBasket size={16} strokeWidth={2.5} />
        </span>
        <span className="font-display text-lg font-extrabold tracking-tight">Xarid</span>
      </div>

      <nav className="mx-auto mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {navLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="font-display text-sm font-semibold text-text-secondary transition-colors hover:text-[color:var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] rounded"
          >
            {label}
          </Link>
        ))}
      </nav>
      <p className="mt-2 text-xs font-semibold text-text-secondary">
        {t(locale, "hero_title_pre")} {t(locale, "hero_title_accent")}
      </p>
      <p className="mt-4 text-[10px] font-bold text-text-secondary/50">
        © {new Date().getFullYear()} Xarid · {t(locale, "footer_rights")}
      </p>
    </footer>
  );
}
