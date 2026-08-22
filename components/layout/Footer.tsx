import Image from "next/image";
import Link from "next/link";
import { footerLinks, siteConfig } from "@/config/site";

const Footer = () => (
  <footer className="relative w-full border-t-4 border-(--red) bg-[#101012] text-white">
    <div className="absolute right-0 top-0 h-1 w-[15%] translate-y-full bg-(--accent)" aria-hidden="true" />
    <div className="mx-auto w-full max-w-(--container-width) px-6 py-16 lg:py-20">
      <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.15fr_0.65fr_0.85fr_0.85fr]">
        <div>
          <div className="relative h-24 w-full max-w-[310px] border-l-4 border-l-(--red) border-b-4 border-b-(--red) bg-[#f5f5f2]">
            <span className="absolute inset-2 block"><Image src="/images/brand/big-wicks-logo.jpg" alt="Big Wicks Fireworks" fill className="object-contain" sizes="310px" /></span>
          </div>
          <p className="mt-7 max-w-sm leading-7 text-[#b7afa6]">A huge fireworks selection, strong value, and friendly guidance just south of New Buffalo.</p>
          <p className="mt-5 border-l-2 border-(--red) pl-4 font-heading text-lg font-bold uppercase text-white">Drive By The Rest… <span className="text-(--accent)">Stop At The Best!</span></p>
        </div>

        <nav aria-label="Footer navigation">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#ff5963]">Explore</h2>
          <ul className="mt-6 space-y-4 text-sm font-semibold text-[#c0b9b1]">
            {footerLinks.map((link) => <li key={link.label}><Link href={link.href} className="transition hover:text-white">{link.label}</Link></li>)}
          </ul>
        </nav>

        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#ff5963]">Visit the store</h2>
          <address className="mt-6 not-italic leading-7 text-[#c0b9b1]">
            <p>{siteConfig.contact.addressLine1}</p>
            <p>{siteConfig.contact.city}, {siteConfig.contact.state} {siteConfig.contact.postalCode}</p>
            <a href={siteConfig.contact.phoneHref} className="mt-4 block text-xl font-bold text-white hover:text-(--accent)">{siteConfig.contact.phone}</a>
            <a href={siteConfig.contact.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 border-b-2 border-(--red) pb-1 text-sm font-bold text-white hover:text-(--accent)">Open directions <span aria-hidden="true">→</span></a>
          </address>
        </div>

        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#ff5963]">Store hours</h2>
          <dl className="mt-6 space-y-2 text-sm text-[#c0b9b1]">
            {siteConfig.hours.map(({ day, hours }) => (
              <div key={day} className="flex justify-between gap-4"><dt>{day.slice(0, 3)}</dt><dd className="font-semibold text-white">{hours}</dd></div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-5 text-[#847d77]">Hours may change seasonally. Call to confirm before a long trip.</p>
        </div>
      </div>

      <div className="mt-14 flex flex-col gap-4 border-t border-[#332d29] pt-7 text-xs text-[#847d77] sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
        <p>Website designed by <Link href="https://www.veriqdigital.com/" target="_blank" rel="noopener noreferrer" className="text-[#bbb4ac] hover:text-(--accent)">Veriq Digital</Link></p>
      </div>
    </div>
  </footer>
);

export default Footer;
