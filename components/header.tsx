"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBasket } from "./basket-provider";

const tabs = [
  { href: "/catalog", label: "Katalog" },
  { href: "/basket", label: "Savat" },
  { href: "/orders", label: "Buyurtmalar" },
];

export function Header() {
  const pathname = usePathname();
  const { count } = useBasket();

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-emerald-700">
          Xarid
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-full px-3 py-1.5 ${
                pathname.startsWith(t.href)
                  ? "bg-emerald-600 text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {t.label}
              {t.href === "/basket" && count > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-xs font-semibold text-stone-900">
                  {count}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
