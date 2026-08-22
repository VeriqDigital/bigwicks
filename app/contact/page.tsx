import type { Metadata } from "next";
import Image from "next/image";
import ContactForm from "@/components/contact/ContactForm";
import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact & Visit",
  description:
    "Contact Big Wicks Fireworks in La Porte, Indiana, call the store, view current hours, or get directions from New Buffalo and the surrounding area.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Big Wicks Fireworks",
    description:
      "Send Big Wicks a question, call the store, view current hours, or get directions to our La Porte, Indiana location.",
    url: "/contact",
  },
};

export default function ContactPage() {
  return (
    <>
      <section className="border-b border-[#303034] bg-[#151517] py-16 text-white md:py-20 lg:py-24">
        <Container>
          <div className="max-w-4xl">
            <p className="text-sm font-bold text-[#ff6872]">Contact Big Wicks</p>
            <h1 className="text-balance mt-4 font-heading text-5xl font-bold uppercase leading-[0.9] sm:text-6xl md:text-7xl">
              Got a question?
              <span className="block text-[#ff5963]">We&apos;re here to help.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75">
              Reach out with questions about products, the store, current promotions,
              or planning your visit to Big Wicks.
            </p>
          </div>
        </Container>
      </section>

      <section className="bg-(--background) py-20 md:py-24 lg:py-28">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1.18fr_0.82fr] lg:items-start">
            <ContactForm />

            <aside className="space-y-6" aria-label="Big Wicks store information">
              <figure className="relative aspect-[16/10] overflow-hidden rounded-[7px] border border-[#d5d5d0] bg-[#deded9]">
                <Image
                  src="/images/store/big-wicks-storefront-night.jpg"
                  alt="Big Wicks Fireworks storefront illuminated in La Porte, Indiana"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                />
              </figure>

              <div className="rounded-[7px] border border-[#d5d5d0] bg-white p-6 sm:p-8">
                <h2 className="font-heading text-3xl font-bold uppercase text-[#171719]">
                  {siteConfig.name}
                </h2>

                <address className="mt-5 not-italic text-base leading-7 text-[#545451]">
                  <p>{siteConfig.contact.addressLine1}</p>
                  <p>
                    {siteConfig.contact.city}, {siteConfig.contact.state}{" "}
                    {siteConfig.contact.postalCode}
                  </p>
                  <a
                    href={siteConfig.contact.phoneHref}
                    className="mt-4 inline-block text-xl font-bold text-(--red) hover:text-(--red-hover)"
                  >
                    {siteConfig.contact.phone}
                  </a>
                  <a
                    href={siteConfig.contact.emailHref}
                    className="mt-2 block break-all font-semibold text-[#343431] hover:text-(--red-hover)"
                  >
                    {siteConfig.contact.email}
                  </a>
                </address>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                  <Button href={siteConfig.contact.mapUrl} newTab>Get Directions</Button>
                  <Button href={siteConfig.contact.phoneHref} variant="dark">Call The Store</Button>
                </div>

                <div className="mt-7 border-t border-[#e3e3df] pt-6">
                  <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-(--red)">
                    Follow Big Wicks
                  </h3>
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
                    {siteConfig.socialLinks.map(({ label, href }) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-[#171719] hover:text-(--red-hover)"
                      >
                        {label} <span aria-hidden="true">↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[7px] border border-[#d5d5d0] bg-white p-6 sm:p-8">
                <h2 className="font-heading text-3xl font-bold uppercase text-[#171719]">
                  Current store hours
                </h2>
                <dl className="mt-6 space-y-3 text-sm">
                  {siteConfig.hours.map(({ day, hours }) => (
                    <div
                      key={day}
                      className="flex justify-between gap-5 border-b border-[#e3e3df] pb-3 last:border-0 last:pb-0"
                    >
                      <dt className="text-[#62625f]">{day}</dt>
                      <dd className="font-bold text-[#171719]">{hours}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-5 text-sm leading-6 text-[#777773]">
                  Hours may change seasonally. Call ahead to confirm before a long trip.
                </p>
              </div>
            </aside>
          </div>
        </Container>
      </section>
    </>
  );
}
