// Shared by Studio validation and server normalization. Never accept embed HTML.
export function productVideo(value: unknown): { embedUrl: string; provider: string } | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    let id: string | null = null;
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
      id = url.pathname === "/watch" ? url.searchParams.get("v") : /^\/(?:embed|shorts)\/([\w-]+)\/?$/.exec(url.pathname)?.[1] ?? null;
    } else if (url.hostname === "youtu.be") {
      id = /^\/([\w-]+)\/?$/.exec(url.pathname)?.[1] ?? null;
    }
    if (id && /^[\w-]{11}$/.test(id)) return { embedUrl: `https://www.youtube-nocookie.com/embed/${id}`, provider: "YouTube" };
    if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(url.hostname)) {
      const match = /^\/(?:video\/)?([1-9][0-9]{0,11})\/?$/.exec(url.pathname);
      if (match) return { embedUrl: `https://player.vimeo.com/video/${match[1]}`, provider: "Vimeo" };
    }
  } catch { /* Invalid optional content is omitted. */ }
  return null;
}
