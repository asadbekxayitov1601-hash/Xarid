import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

const nav = [
  { href: "/admin", label: "Bugun" },
  { href: "/admin/orders", label: "Buyurtmalar" },
  { href: "/admin/suppliers", label: "Do'konlar" },
  { href: "/admin/drivers", label: "Haydovchilar" },
  { href: "/admin/dispatch", label: "Xarid Go" },
  { href: "/admin/routes", label: "Marshrut" },
  { href: "/admin/finance", label: "Moliya" },
];

// Defense-in-depth: gate the whole /admin subtree here (there is no longer a
// login page under /admin), in addition to the per-page requireAdmin() guards.
// A non-admin is redirected to the normal /auth login.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
      <nav className="-mx-4 mb-4 flex gap-2 overflow-x-auto border-b border-stone-200 px-4 pb-3 text-sm sm:-mx-6 sm:px-6">
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
