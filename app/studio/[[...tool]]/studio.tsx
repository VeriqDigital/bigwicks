"use client";

import dynamic from "next/dynamic";

// Defer configuration too: importing sanity eagerly also loads its global CSS,
// even when the server displays the unconfigured fallback instead of Studio.
const StudioClient = dynamic(() => import("./studio-client"), {
  ssr: false, loading: () => <p className="p-6" role="status">Loading catalog Studio…</p>,
});

export default function Studio() { return <StudioClient />; }
