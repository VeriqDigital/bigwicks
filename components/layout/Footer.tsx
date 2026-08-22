import Image from "next/image";
import Link from "next/link";
import { footerLinks, siteConfig } from "@/config/site";

const Footer = () => (
  <footer className="w-full border-t border-[#303034] bg-[#151517] text-white">
    <div className="mx-auto w-full max-w-(--container-width) px-6 py-16 lg:py-20">
      <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.15fr_0.65fr_0.85fr_0.6fr_0.85fr] lg:gap-8">
        <div>
          <div className="relative h-28 w-full max-w-[330px]">
            <Image
              src="/Big wicks logo background removed.png"
              alt="Big Wicks Fireworks"
              fill
              className="object-contain object-left"
              sizes="330px"
            />
          </div>
          <p className="mt-6 max-w-sm leading-7 text-[#b7b7b3]">
            A huge fireworks selection, strong value, and friendly guidance just
            south of New Buffalo.
          </p>
          <p className="mt-5 font-heading text-lg font-bold uppercase text-white">
            Drive By The Rest…{" "}
            <span className="text-[#ff6872]">Stop At The Best!</span>
          </p>
        </div>

        <nav aria-label="Footer navigation">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#ff5963]">
            Explore
          </h2>
          <ul className="mt-6 space-y-4 text-sm font-semibold text-[#c0c0bc]">
            {footerLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="transition hover:text-[#ff6872]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#ff5963]">
            Visit the store
          </h2>
          <address className="mt-6 not-italic leading-7 text-[#c0c0bc]">
            <p>{siteConfig.contact.addressLine1}</p>
            <p>
              {siteConfig.contact.city}, {siteConfig.contact.state}{" "}
              {siteConfig.contact.postalCode}
            </p>
            <a
              href={siteConfig.contact.phoneHref}
              className="mt-4 block text-xl font-bold text-white hover:text-[#ff6872]"
            >
              {siteConfig.contact.phone}
            </a>
            <a
              href={siteConfig.contact.emailHref}
              className="mt-2 block break-all text-sm font-semibold text-white hover:text-[#ff6872]"
            >
              {siteConfig.contact.email}
            </a>
            <a
              href={siteConfig.contact.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-white hover:text-[#ff6872]"
            >
              Open directions <span aria-hidden="true">→</span>
            </a>
          </address>
        </div>

        <nav aria-label="Social media">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#ff5963]">
            Follow
          </h2>
          <ul className="mt-6 space-y-4 text-sm font-semibold text-[#c0c0bc]">
            {siteConfig.socialLinks.map(({ label, href }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-[#ff6872]"
                >
                  {label} <span aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#ff5963]">
            Store hours
          </h2>
          <dl className="mt-6 space-y-2 text-sm text-[#c0c0bc]">
            {siteConfig.hours.map(({ day, hours }) => (
              <div key={day} className="flex justify-between gap-4">
                <dt>{day.slice(0, 3)}</dt>
                <dd className="font-semibold text-white">{hours}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-5 text-[#8f8f8c]">
            Hours may change seasonally. Call to confirm before a long trip.
          </p>
        </div>
      </div>

      <div className="mt-14 flex flex-col gap-4 border-t border-[#303034] pt-7 text-xs text-[#8f8f8c] sm:flex-row sm:items-center sm:justify-between">
        <p>
          &copy; {new Date().getFullYear()} {siteConfig.name}. All rights
          reserved.
        </p>
        <p>
          Website designed by{" "}
          <Link
            href="https://www.veriqdigital.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#c4c4c0] hover:text-[#ff6872]"
          >
            Veriq
          </Link>
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
