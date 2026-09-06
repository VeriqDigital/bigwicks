import type { Metadata } from "next";
import Link from "next/link";
import { requireCustomer } from "@/lib/auth/authorization";
import { getAvailableCatalogForCustomer } from "@/lib/catalog/service";
import { logout } from "@/app/(portal)/login/actions";
import Catalog from "@/components/catalog/Catalog";

export const metadata: Metadata = {
  title: "Wholesale catalog",
  description: "Big Wicks wholesale customer catalog.",
  robots: { index: false, follow: false },
};

export default async function CustomerPortalPage() {
  const { customer, email } = await requireCustomer();
  const catalog = await getAvailableCatalogForCustomer();
  return <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 lg:py-10">
    <nav aria-label="Wholesale navigation" className="mb-7 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-(--border) pb-4 text-sm font-semibold">
      <a href="/portal" aria-current="page" className="inline-flex min-h-11 items-center border-b-2 border-(--red)">Catalog</a>
      <Link href="/" className="inline-flex min-h-11 items-center hover:underline">Public website</Link>
      <form action={logout} className="sm:ml-auto">
        <button className="min-h-11 rounded-sm border border-(--border) bg-white px-5 hover:border-current">Sign out</button>
      </form>
    </nav>
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-(--muted)">Wholesale customer portal</p>
        <h1 className="font-heading text-4xl font-bold uppercase sm:text-5xl">Wholesale catalog</h1>
        <p className="mt-3 wrap-anywhere">Signed in for {customer.companyName}.</p>
      </div>
      <details id="wholesale-account" className="max-w-full scroll-mt-48 text-sm">
        <summary className="min-h-11 cursor-pointer py-3 font-semibold">Wholesale account details</summary>
        <p className="max-w-sm wrap-anywhere pb-3">{email}</p>
      </details>
    </header>
    {catalog.status === "ready" ? <Catalog products={catalog.products} /> :
      <section aria-labelledby="catalog-unavailable" className="border-l-4 border-(--red) bg-white p-6 sm:p-8">
        <h2 id="catalog-unavailable" className="font-heading text-2xl font-bold">Catalog temporarily unavailable</h2>
        <p role="status" className="mt-3">{catalog.message}</p>
        <a href="/portal" className="mt-5 inline-flex min-h-12 items-center rounded-sm bg-(--red) px-5 font-semibold text-white hover:bg-(--red-hover)">Try again</a>
      </section>}
  </div>;
}
