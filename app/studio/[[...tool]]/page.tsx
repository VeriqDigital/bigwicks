import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/authorization";
import { sanityEnvironment } from "@/sanity/environment";
import Studio from "./studio";

export const metadata: Metadata = { title: "Catalog Studio", robots: { index: false, follow: false } };

export default async function StudioPage() {
  await requireAdmin();
  if (!sanityEnvironment()) return <section className="mx-auto max-w-3xl px-5 py-16">
    <h1 className="font-heading text-4xl font-bold">Catalog Studio is not configured</h1>
    <p className="mt-4">Configure the Sanity project and dataset before editing catalog content. No catalog data has been created.</p>
  </section>;
  return <section aria-label="Catalog Studio" className="h-dvh"><Studio /></section>;
}
