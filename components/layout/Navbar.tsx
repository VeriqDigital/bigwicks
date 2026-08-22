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
    <header className="sticky inset-x-0 top-0 z-50 bg-[#151517]">
      <div className="border-b border-white/10 bg-[#101012]">
        <div className="mx-auto flex h-8 max-w-(--container-width) items-center justify-between gap-4 px-4 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#d2cdc5] sm:px-6 sm:text-[0.68rem]">
          <p className="truncate">{siteConfig.announcement.message}</p>
          <Link
            href={siteConfig.announcement.href}
            className="hidden shrink-0 text-[#ff6872] hover:text-white sm:block"
          >
            {siteConfig.announcement.actionLabel}
          </Link>
        </div>
      </div>

      <nav
        className="mx-auto flex h-[86px] max-w-(--container-width) items-center justify-between border-b border-white/10 px-4 sm:px-6 lg:h-[104px]"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className="relative block h-[66px] w-[190px] shrink-0 sm:h-[72px] sm:w-[220px] lg:h-[88px] lg:w-[276px]"
          aria-label="Big Wicks Fireworks home"
        >
          <span className="absolute inset-0 block">
            <Image
              src="/Big wicks logo background removed.png"
              alt="Big Wicks Fireworks"
              fill
              className="object-contain object-left"
              sizes="(max-width: 640px) 190px, (max-width: 1024px) 220px, 276px"
              preload
            />
          </span>
        </Link>

        <div className="hidden items-center gap-6 lg:flex xl:gap-8">
          {navigation.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="py-3 text-xs font-bold uppercase tracking-[0.1em] text-[#f2f2ef] transition-colors hover:text-[#ff6872]"
            >
              {item.label}
            </Link>
          ))}
          <Button href={primaryCta.href} newTab>
            {primaryCta.label}
          </Button>
        </div>

        <div className="flex items-center gap-3 lg:hidden">
          <a
            href={siteConfig.contact.phoneHref}
            className="hidden rounded-[3px] border border-[#5a514b] px-3 py-2 text-xs font-bold uppercase tracking-wider text-white sm:block"
          >
            Call now
          </a>
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-[3px] border border-white/30 text-white transition hover:border-(--red) hover:text-[#ff6872]"
            aria-label={
              isMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation-menu"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span className="grid gap-1.5" aria-hidden="true">
              <span
                className={`block h-0.5 w-5 bg-current transition-transform ${isMenuOpen ? "translate-y-2 rotate-45" : ""}`}
              />
              <span
                className={`block h-0.5 w-5 bg-current transition-opacity ${isMenuOpen ? "opacity-0" : ""}`}
              />
              <span
                className={`block h-0.5 w-5 bg-current transition-transform ${isMenuOpen ? "-translate-y-2 -rotate-45" : ""}`}
              />
            </span>
          </button>
        </div>
      </nav>

      {isMenuOpen && (
        <div
          id="mobile-navigation-menu"
          className="border-t border-[#3a3a3f] bg-[#151517] p-3 text-white lg:hidden"
        >
          <div className="grid">
            {navigation.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className="border-b border-[#3a3a3f] px-4 py-4 text-sm font-bold uppercase tracking-[0.1em] hover:bg-[#242428] hover:text-[#ff6872]"
              >
                {item.label}
              </Link>
            ))}
            <a
              href={primaryCta.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsMenuOpen(false)}
              className="mt-3 rounded-[3px] bg-(--red) px-4 py-4 text-center text-xs font-extrabold uppercase tracking-[0.14em] text-white"
            >
              {primaryCta.label}
            </a>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
