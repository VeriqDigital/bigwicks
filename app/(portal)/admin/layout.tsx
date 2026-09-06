import { requireAdmin } from "@/lib/auth/authorization";
import AdminNavigation from "@/components/admin/AdminNavigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <><AdminNavigation />{children}</>;
}
