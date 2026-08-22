"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { navigation, primaryCta, siteConfig } from "@/config/site";
import LeadModal from "./LeadModal";
import type { ModalType } from "./LeadModal";
import useLeadModal from "./useLeadModal";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const modal = useLeadModal();

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setIsMenuOpen(false);
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  const handleModalOpen = (type: ModalType) => {
    setIsMenuOpen(false);
    modal.openModal(type);
  };

  const navClass = "font-heading text-sm font-extrabold uppercase tracking-[0.12em] text-[#d8d8d8] transition-colors hover:text-(--accent)";

  return (
    <header className="sticky inset-x-0 top-0 z-50 border-b-2 border-(--accent) bg-[#0d0d0d] shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
      <div className="border-b border-[#2b2b2b] bg-[#171717]">
        <div className="mx-auto hidden h-9 max-w-(--container-width) items-center justify-between px-6 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#8e8e8e] lg:flex">
          <p>Chicagoland-based freight transportation</p>
          <div className="flex gap-6"><span>Licensed &amp; insured</span><span>Regional service</span></div>
        </div>
      </div>

      <nav className="mx-auto flex h-20 max-w-(--container-width) items-center justify-between px-4 sm:px-6 lg:h-24">
        <Link href="/" className="relative block h-16 w-56 shrink-0 sm:w-64 lg:h-20 lg:w-72" aria-label="S&B Express home">
          <Image src="/logo.png" alt="S&B Express" fill className="object-contain object-left" sizes="(max-width: 640px) 224px, (max-width: 1024px) 256px, 288px" preload />
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {navigation.map((item) => "href" in item ? (
            <Link key={item.href} href={item.href} className={navClass}>{item.label}</Link>
          ) : (
            <button key={item.label} type="button" onClick={() => modal.openModal(item.modal)} className={`${navClass} cursor-pointer`}>{item.label}</button>
          ))}
          <Button onClick={() => modal.openModal(primaryCta.modal)}>{primaryCta.label}</Button>
        </div>

        <div className="flex items-center gap-3 lg:hidden">
          <a href={siteConfig.contact.phoneHref} className="hidden border border-[#555] px-4 py-2 font-heading text-xs font-black uppercase tracking-wider text-white sm:block">Call now</a>
          <button type="button" className="flex size-11 items-center justify-center border border-[#555] text-white hover:border-(--accent) hover:text-(--accent)" aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={isMenuOpen} aria-controls="mobile-navigation-menu" onClick={() => setIsMenuOpen((open) => !open)}>
            <span className="grid gap-1.5" aria-hidden="true">
              <span className={`block h-0.5 w-5 bg-current transition-transform ${isMenuOpen ? "translate-y-2 rotate-45" : ""}`} />
              <span className={`block h-0.5 w-5 bg-current transition-opacity ${isMenuOpen ? "opacity-0" : ""}`} />
              <span className={`block h-0.5 w-5 bg-current transition-transform ${isMenuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </nav>

      {isMenuOpen && (
        <div id="mobile-navigation-menu" className="border-t border-[#303030] bg-[#111111] p-3 text-white lg:hidden">
          <div className="grid">
            {navigation.map((item) => "href" in item ? (
              <Link key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)} className="border-b border-[#303030] px-4 py-4 font-heading font-black uppercase tracking-[0.12em] hover:text-(--accent)">{item.label}</Link>
            ) : (
              <button key={item.label} type="button" onClick={() => handleModalOpen(item.modal)} className="border-b border-[#303030] px-4 py-4 text-left font-heading font-black uppercase tracking-[0.12em] hover:text-(--accent)">{item.label}</button>
            ))}
            <button type="button" onClick={() => handleModalOpen(primaryCta.modal)} className="mt-3 bg-(--accent) px-4 py-4 font-heading font-black uppercase tracking-[0.12em] text-[#111]">{primaryCta.label}</button>
          </div>
        </div>
      )}

      {modal.activeModal && <LeadModal activeModal={modal.activeModal} hasSubmitted={modal.hasSubmitted} isSubmitting={modal.isSubmitting} onClose={modal.closeModal} onSubmit={modal.handleFormSubmit} submitError={modal.submitError} />}
    </header>
  );
};

export default Navbar;
