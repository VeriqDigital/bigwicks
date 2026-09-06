"use client";

import Image, { type ImageLoaderProps } from "next/image";
import { useState } from "react";

export function catalogImageLoader({ src, width }: ImageLoaderProps) {
  const url = new URL(src);
  if (url.protocol !== "https:" || url.hostname !== "cdn.sanity.io" || !url.pathname.startsWith("/images/") || url.port || url.username || url.password) throw new Error("Invalid catalog image.");
  // The DTO already contains an asset URL. No asset query or new SDK is needed.
  url.search = new URLSearchParams({ w: String(Math.min(width, 960)), h: "720", fit: "max", auto: "format" }).toString();
  url.hash = "";
  return url.href;
}

export default function ProductImage({ image }: { image: { url: string; alt: string } | null }) {
  const [failed, setFailed] = useState(false);
  let usable = false;
  if (image) {
    try { catalogImageLoader({ src: image.url, width: 320 }); usable = true; }
    catch { /* A malformed optional image must not break the catalog. */ }
  }
  return <div className="relative aspect-[4/3] overflow-hidden border-b border-(--border) bg-[#eeeee9]">
    {image && usable && !failed ? <Image src={image.url} alt={image.alt} loader={catalogImageLoader} fill
      sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) calc((100vw - 80px) / 2), (max-width: 1279px) 30vw, (max-width: 1535px) 23vw, 294px"
      className="object-contain p-4" onError={() => setFailed(true)} /> :
      <div className="flex h-full flex-col items-center justify-center gap-3 text-(--muted)">
        <svg aria-hidden="true" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="m12 3 9 5v9l-9 5-9-5V8l9-5Z M3 8l9 5 9-5 M12 13v9 M7.5 5.5l9 5V15" /></svg>
        <span className="text-sm">Image unavailable</span>
      </div>}
  </div>;
}
