"use client";

import Image from "next/image";
import Link from "next/link";
import { footerLinks, siteConfig } from "@/config/site";
import LeadModal from "./LeadModal";
import useLeadModal from "./useLeadModal";

const Footer = () => {
  const modal = useLeadModal();
  return (
    <footer className="w-full border-t-4 border-(--accent) bg-[#0b0b0b] text-white">
      <div className="mx-auto w-full max-w-(--container-width) px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.2fr_0.7fr_1fr]">
          <div>
            <div className="relative h-20 w-64"><Image src="/logo.png" alt="S&B Express" fill className="object-contain object-left" sizes="256px" /></div>
            <p className="mt-5 max-w-md leading-7 text-[#9f9f9f]">{siteConfig.description}</p>
            <p className="mt-5 font-heading text-lg font-black uppercase text-white">Reliable miles. Honest service.</p>
          </div>
          <nav aria-label="Footer navigation">
            <h2 className="font-heading text-sm font-black uppercase tracking-[0.2em] text-(--accent)">Navigation</h2>
            <ul className="mt-6 space-y-4 text-sm font-semibold text-[#b2b2b2]">
              {footerLinks.map((link) => <li key={link.label}>{"href" in link ? <Link href={link.href} className="hover:text-(--accent)">{link.label}</Link> : <button type="button" onClick={() => modal.openModal(link.modal)} className="cursor-pointer hover:text-(--accent)">{link.label}</button>}</li>)}
            </ul>
          </nav>
          <div>
            <h2 className="font-heading text-sm font-black uppercase tracking-[0.2em] text-(--accent)">Contact</h2>
            <address className="mt-6 space-y-2 not-italic text-[#b2b2b2]">
              <p>{siteConfig.contact.address}</p><p>{siteConfig.contact.serviceArea}</p>
              <a href={siteConfig.contact.phoneHref} className="mt-5 block font-heading text-2xl font-black text-white hover:text-(--accent)">{siteConfig.contact.phone}</a>
              <a href={siteConfig.contact.emailHref} className="block hover:text-white">{siteConfig.contact.email}</a>
            </address>
          </div>
        </div>
        <div className="mt-14 flex flex-col gap-4 border-t border-[#303030] pt-7 text-xs text-[#777] sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 S&amp;B Express. All rights reserved.</p>
          <p>Website designed by <Link href="https://www.veriqdigital.com/" target="_blank" rel="noopener noreferrer" className="text-[#aaa] hover:text-(--accent)">Veriq Digital</Link></p>
        </div>
      </div>
      {modal.activeModal && <LeadModal activeModal={modal.activeModal} hasSubmitted={modal.hasSubmitted} isSubmitting={modal.isSubmitting} onClose={modal.closeModal} onSubmit={modal.handleFormSubmit} submitError={modal.submitError} />}
    </footer>
  );
};

export default Footer;
