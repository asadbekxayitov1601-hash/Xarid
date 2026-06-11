import Link from "next/link";

const nav = [
  { href: "/admin", label: "Bugun" },
  { href: "/admin/orders", label: "Buyurtmalar" },
  { href: "/admin/suppliers", label: "Yetkazib beruvchilar" },
  { href: "/admin/drivers", label: "Haydovchilar" },
  { href: "/admin/routes", label: "Marshrut" },
  { href: "/admin/finance", label: "Moliya" },
];

// Auth is enforced per-page via requireAdmin() (the login page shares this
// layout, so the guard can't live here).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav className="-mx-4 mb-4 flex gap-2 overflow-x-auto border-b border-stone-200 px-4 pb-3 text-sm">
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="whitespace-nowrap rounded-full border border-stone-300 bg-white px-3 py-1.5 hover:bg-stone-100"
          >
            {n.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
