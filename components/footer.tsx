import Link from "next/link";
import Image from "next/image";
import { ShoppingBasket } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";

export function Footer({ locale }: { locale: Locale }) {
  // Consumer links stay prominent.
  const navLinks = [
    { href: "/catalog", label: t(locale, "nav_catalog") },
    { href: "/orders", label: t(locale, "nav_orders") },
    { href: "/auth", label: t(locale, "auth_signin") },
  ];

  // De-emphasized fulfillment-side entry points (Yandex-style: shops + couriers
  // behind the consumer storefront). Reachable, but secondary.
  const businessLinks = [
    { href: "/supplier", label: t(locale, "b2c_foot_business") },
    { href: "/driver", label: t(locale, "b2c_foot_couriers") },
  ];

  return (
    <footer className="w-full border-t border-border-primary bg-bg-secondary/30 px-6 py-10 text-center text-text-primary transition-colors duration-300">
      <div className="mx-auto flex items-center justify-center gap-2">
        <div className="relative h-9 w-9 overflow-hidden rounded-xl">
          <Image
            src="/logo.png"
            alt="Xarid Logo"
            fill
            sizes="36px"
            className="object-contain"
          />
          {/* Current/Previous logo (preserved):
          <span
            className="absolute inset-0 grid place-items-center rounded-lg shadow-[var(--shadow-md)]"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            <ShoppingBasket size={16} strokeWidth={2.5} />
          </span>
          */}
        </div>
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

      <p className="mt-4 text-xs font-semibold text-text-secondary">
        {t(locale, "b2c_foot_tagline")}
      </p>

      {/* Demoted business / courier cluster — smaller, dimmer than consumer nav. */}
      <nav className="mx-auto mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {businessLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="text-[11px] font-semibold text-text-secondary/60 transition-colors hover:text-[color:var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] rounded"
          >
            {label}
          </Link>
        ))}
      </nav>

      <p className="mt-4 text-[10px] font-bold text-text-secondary/50">
        © {new Date().getFullYear()} Xarid · {t(locale, "footer_rights")}
      </p>
    </footer>
  );
}
