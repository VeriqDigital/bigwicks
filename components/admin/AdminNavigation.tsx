import Link from "next/link";
import { logout } from "@/app/(portal)/login/actions";

// Rendered only after the admin layout's authorization check. Each destination
// and mutation independently authorizes access as well.
export default function AdminNavigation() {
  return <nav aria-label="Administration navigation" className="mb-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-(--border) pb-4 text-sm font-semibold">
    <Link href="/admin/customers" className="inline-flex min-h-11 items-center underline underline-offset-4">Customers</Link>
    <Link href="/admin/pricing" className="inline-flex min-h-11 items-center underline underline-offset-4">Pricing</Link>
    <Link href="/studio" prefetch={false} className="inline-flex min-h-11 items-center underline underline-offset-4">Catalog Studio</Link>
    <Link href="/" className="inline-flex min-h-11 items-center underline underline-offset-4">Public website</Link>
    <form action={logout}><button className="min-h-11 rounded-sm border border-(--border) px-4">Sign out</button></form>
  </nav>;
}
