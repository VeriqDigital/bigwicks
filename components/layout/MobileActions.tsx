"use client";

import { useEffect, useState } from "react";
import { siteConfig } from "@/config/site";

// Mounted only by public retail pages, never by the shared/private layouts.
export default function MobileActions() {
  const [footerVisible, setFooterVisible] = useState(false);
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) =>
      setFooterVisible(entry.isIntersecting),
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);
  return (
    <nav
      className="mobile-actions"
      aria-label="Quick store actions"
      hidden={footerVisible}
    >
      <a
        href={siteConfig.contact.mapUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Get Directions <span aria-hidden="true">↗</span>
      </a>
      <a href={siteConfig.contact.phoneHref}>Call The Store</a>
    </nav>
  );
}
