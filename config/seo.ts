// Shared by page metadata and the public crawler routes. Configure an origin,
// without a path, query or fragment; production origin approval is a launch gate.
export function getSiteUrl(): URL {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
}
