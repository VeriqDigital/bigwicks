"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { navigation, primaryCta, siteConfig } from "@/config/site";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  return (
    <header className="sticky inset-x-0 top-0 z-50 bg-[#111113]/97 shadow-[0_10px_28px_rgba(0,0,0,0.34)] backdrop-blur-xl">
      <div className="border-b border-[#343438] bg-[#1d1d20]">
        <div className="mx-auto flex h-8 max-w-(--container-width) items-center justify-between gap-4 px-4 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#d2cdc5] sm:px-6 sm:text-[0.68rem]">
          <p className="truncate">{siteConfig.announcement.message}</p>
          <Link href={siteConfig.announcement.href} className="hidden shrink-0 text-(--accent) underline decoration-(--red) decoration-2 underline-offset-4 hover:text-(--accent-hover) sm:block">{siteConfig.announcement.actionLabel}</Link>
        </div>
      </div>

      <nav className="relative mx-auto flex h-[82px] max-w-(--container-width) items-center justify-between px-4 sm:px-6 lg:h-[96px]" aria-label="Main navigation">
        <Link href="/" className="relative block h-16 w-[180px] shrink-0 border-l-4 border-l-(--red) border-b-4 border-b-(--red) bg-[#f5f5f2] shadow-[4px_4px_0_rgba(0,0,0,0.22)] sm:w-[202px] lg:h-[78px] lg:w-[236px]" aria-label="Big Wicks Fireworks home">
          <span className="absolute inset-1.5 block">
            <Image src="/images/brand/big-wicks-logo.jpg" alt="Big Wicks Fireworks" fill className="object-contain" sizes="(max-width: 1024px) 202px, 236px" preload />
          </span>
          <span className="absolute right-0 top-0 h-2 w-8 bg-(--accent)" aria-hidden="true" />
        </Link>

        <div className="hidden items-center gap-6 lg:flex xl:gap-8">
          {navigation.map((item) => {
            const isShop = item.label === "Shop Fireworks";
            const isDeals = item.label === "Deals";
            return (
              <Link key={item.label} href={item.href} className={`group relative py-3 text-xs font-bold uppercase tracking-[0.12em] transition-colors ${isShop ? "text-[#ff5963]" : "text-[#f2f2ef] hover:text-white"}`}>
                {isDeals && <span className="mr-2 inline-block size-1.5 bg-(--accent) align-middle" aria-hidden="true" />}
                {item.label}
                <span className={`absolute inset-x-0 bottom-1 h-0.5 origin-left bg-(--red) transition-transform ${isShop ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} aria-hidden="true" />
              </Link>
            );
          })}
          <Button href={primaryCta.href} newTab>{primaryCta.label}</Button>
        </div>

        <div className="flex items-center gap-3 lg:hidden">
          <a href={siteConfig.contact.phoneHref} className="hidden rounded-[3px] border border-[#5a514b] px-3 py-2 text-xs font-bold uppercase tracking-wider text-white sm:block">Call now</a>
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-[3px] border border-[#5a514b] text-white transition hover:border-(--accent) hover:text-(--accent)"
            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation-menu"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span className="grid gap-1.5" aria-hidden="true">
              <span className={`block h-0.5 w-5 bg-current transition-transform ${isMenuOpen ? "translate-y-2 rotate-45" : ""}`} />
              <span className={`block h-0.5 w-5 bg-current transition-opacity ${isMenuOpen ? "opacity-0" : ""}`} />
              <span className={`block h-0.5 w-5 bg-current transition-transform ${isMenuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex h-1" aria-hidden="true"><span className="flex-1 bg-(--red)" /><span className="w-[12%] bg-(--accent)" /></div>
      </nav>

      {isMenuOpen && (
        <div id="mobile-navigation-menu" className="border-t border-[#3a3a3f] bg-[#151517] p-3 text-white lg:hidden">
          <div className="grid">
            {navigation.map((item) => (
              <Link key={item.label} href={item.href} onClick={() => setIsMenuOpen(false)} className="border-b border-[#3a3a3f] px-4 py-4 text-sm font-bold uppercase tracking-[0.12em] hover:bg-[#242428] hover:text-[#ff5a65]">{item.label}</Link>
            ))}
            <a href={primaryCta.href} target="_blank" rel="noopener noreferrer" onClick={() => setIsMenuOpen(false)} className="mt-3 rounded-[3px] bg-(--red) px-4 py-4 text-center text-xs font-extrabold uppercase tracking-[0.14em] text-white">{primaryCta.label}</a>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
