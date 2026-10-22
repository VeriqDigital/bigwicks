"use client";

import { useSelectedLayoutSegment } from "next/navigation";

// Keep route selection at the root layout boundary. Server-rendered children
// and footer stay server components, and all non-Studio routes keep their shell.
export default function SiteShell({ children, navbar, footer }: {
  children: React.ReactNode;
  navbar: React.ReactNode;
  footer: React.ReactNode;
}) {
  const segment = useSelectedLayoutSegment();

  if (segment === "studio") {
    return <main className="studio-viewport h-dvh min-h-0 shrink-0 overflow-hidden">{children}</main>;
  }

  return <>{navbar}<main className="flex-1">{children}</main>{footer}</>;
}
