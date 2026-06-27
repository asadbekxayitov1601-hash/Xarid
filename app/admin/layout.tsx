import { requireAdmin } from "@/lib/admin";
import { AdminShell } from "@/components/admin/admin-shell";

// Gate the whole /admin subtree (defense-in-depth on top of per-page/per-action
// requireAdmin) and wrap it in the unified branded shell (sidebar + header).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const userName = admin.name || admin.phone || "Admin";
  return <AdminShell userName={userName}>{children}</AdminShell>;
}
