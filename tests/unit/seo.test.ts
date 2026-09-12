import { afterEach, expect, it, vi } from "vitest";
import sitemap from "../../app/sitemap";
import robots from "../../app/robots";
import { getSiteUrl } from "../../config/seo";
import { metadata as home } from "../../app/page";
import { metadata as contact } from "../../app/contact/page";
import { metadata as newBuffalo } from "../../app/fireworks-near-new-buffalo-mi/page";
import { metadata as wholesale } from "../../app/wholesale/page";
import { publicRoutes, storefrontImage } from "../../config/seo";
import { storeJsonLd, websiteJsonLd, pageJsonLd, serializeJsonLd } from "../../config/structured-data";
import { siteConfig, navigation } from "../../config/site";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { metadata as utility } from "../../app/(portal)/layout";
import nextConfig from "../../next.config";

// Metadata imports must not initialize contact delivery or private services.
vi.mock("@/components/contact/ContactForm", () => ({ default: () => null }));

afterEach(() => vi.unstubAllEnvs());

it("declares four unique public titles, descriptions, canonicals and matching social metadata", () => {
  const pages = [home, contact, newBuffalo, wholesale];
  expect(publicRoutes).toEqual(["/", "/contact", "/fireworks-near-new-buffalo-mi", "/wholesale"]);
  expect(new Set(pages.map(page => JSON.stringify(page.title))).size).toBe(4);
  expect(new Set(pages.map(page => page.description)).size).toBe(4);
  pages.forEach((page, index) => {
    expect(page.alternates).toEqual({ canonical: publicRoutes[index] });
    expect(page.title).toEqual({ absolute: expect.any(String) });
    expect(page.description?.length).toBeGreaterThan(60);
    expect(page.openGraph).toMatchObject({ title: (page.title as { absolute: string }).absolute, description: page.description, url: publicRoutes[index], images: [{ url: storefrontImage }] });
    expect(page.twitter).toMatchObject({ title: (page.title as { absolute: string }).absolute, description: page.description, images: [storefrontImage] });
  });
  expect(home.title).toEqual({ absolute: "Big Wicks Fireworks | La Porte, Indiana Fireworks Store" });
  expect(navigation.find(item => item.label === "Wholesale")?.href).toBe("/wholesale");
});

it.each(["https://www.example.test", "https://www.example.test/", "https://alternate.example.test"])(
  "uses the configured origin %s for exactly four URL-only public entries and robots",
  (origin) => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", origin);
    expect(getSiteUrl().href).toBe(new URL(origin).href);
    expect(sitemap()).toEqual([
      { url: new URL("/", origin).href },
      { url: new URL("/contact", origin).href },
      { url: new URL("/fireworks-near-new-buffalo-mi", origin).href },
      { url: new URL("/wholesale", origin).href },
    ]);
    expect(robots().sitemap).toBe(new URL("/sitemap.xml", origin).href);
    // Exact URL-only equality also excludes redirects, utility/API/product routes,
    // query strings, fragments, arbitrary dates and private pricing/customer fields.
  },
);

it("preserves the local fallback", () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined);
  expect(getSiteUrl().href).toBe("http://localhost:3000/");
  expect(sitemap()).toEqual(publicRoutes.map(path => ({ url: new URL(path, "http://localhost:3000").href })));
  expect(robots().sitemap).toBe("http://localhost:3000/sitemap.xml");
});

it.each(["https://www.example.test", "https://alternate.example.test/"])("derives truthful linked entities from %s", origin => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", origin);
  const absolute = (path: string) => new URL(path, origin).href;
  const store = storeJsonLd();
  expect(store).toMatchObject({
    "@type": "Store", "@id": absolute("/#store"), url: absolute("/"),
    name: siteConfig.name, telephone: siteConfig.contact.phone, email: siteConfig.contact.email,
    address: { "@type": "PostalAddress", streetAddress: siteConfig.contact.addressLine1, addressLocality: siteConfig.contact.city, addressRegion: siteConfig.contact.state, postalCode: siteConfig.contact.postalCode, addressCountry: "US" },
    openingHours: siteConfig.hours.map(row => row.schema),
    sameAs: siteConfig.socialLinks.map(row => row.href), hasMap: siteConfig.contact.mapUrl,
    logo: absolute("/Big wicks logo background removed.png"), image: absolute(storefrontImage),
  });
  expect(websiteJsonLd()).toEqual({ "@context": "https://schema.org", "@type": "WebSite", "@id": absolute("/#website"), name: siteConfig.shortName, url: absolute("/"), publisher: { "@id": store["@id"] } });
  const pages = (["/fireworks-near-new-buffalo-mi", "/wholesale"] as const).map(path => pageJsonLd(path, "Visible title", "Visible description"));
  for (const [index, path] of ["/fireworks-near-new-buffalo-mi", "/wholesale"].entries()) {
    expect(pages[index]["@graph"][0]).toMatchObject({ "@type": "WebPage", url: absolute(path), about: { "@id": store["@id"] }, isPartOf: { "@id": absolute("/#website") } });
    expect(pages[index]["@graph"][1]).toMatchObject({ "@type": "BreadcrumbList", itemListElement: [{ position: 1, name: "Home", item: absolute("/") }, { position: 2, name: "Visible title", item: absolute(path) }] });
  }
  const json = JSON.stringify([store, websiteJsonLd(), ...pages]);
  expect(json).not.toMatch(/aggregateRating|review|priceRange|offers|ProductPrice|customerId|catalogKey|discount|SearchAction|GeoCoordinates|foundingDate|award|acceptedPaymentMethod/);
  expect(json).not.toMatch(/localhost|vercel\.app/);
});

it("safely serializes JSON-LD script contents", () => {
  const value = { name: "</script><script>test</script>" };
  expect(serializeJsonLd(value)).not.toContain("<");
  expect(JSON.parse(serializeJsonLd(value))).toEqual(value);
});

it("keeps new public dependency trees config/static-only with no private operational imports", () => {
  const visited = new Set<string>();
  function inspect(file: string) {
    if (visited.has(file)) return;
    visited.add(file);
    const source = readFileSync(file, "utf8");
    expect(source, file).not.toMatch(/@prisma|next-auth|@sanity|next-sanity|ProductPrice|catalogKey|customerId|tierId|DATABASE_URL|process\.env\.(?!NEXT_PUBLIC_SITE_URL)|fetch\s*\(/);
    for (const match of source.matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/g)) {
      const name = match[1];
      if (!(name.startsWith("@/") || name.startsWith("."))) continue;
      expect(name, file).not.toMatch(/(?:auth|lib\/|sanity\/|prisma\/|portal\/|admin\/)/);
      const base = name.startsWith("@/") ? resolve(name.slice(2)) : resolve(dirname(file), name);
      const next = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
      expect(next, `Resolvable import ${name}`).toBeTruthy();
      if (next) inspect(next);
    }
  }
  inspect(resolve("app/fireworks-near-new-buffalo-mi/page.tsx"));
  inspect(resolve("app/wholesale/page.tsx"));
  expect(readFileSync("app/wholesale/page.tsx", "utf8")).toContain('href="/account" prefetch={false}');
});

it.each(["", "not a URL"])("fails clearly on malformed configuration %j", (origin) => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", origin);
  expect(getSiteUrl).toThrow(TypeError);
  expect(sitemap).toThrow(TypeError);
  expect(robots).toThrow(TypeError);
});

it("preserves every existing crawl disallow and utility-layout noindex", () => {
  expect(robots().rules).toEqual({
    userAgent: "*", allow: "/",
    disallow: ["/admin", "/portal", "/account", "/api/auth/", "/setup-account", "/reset-password", "/forgot-password", "/studio"],
  });
  expect(utility.robots).toEqual({ index: false, follow: false });
});

it("preserves token/recovery response indexing and privacy headers", async () => {
  const headers = await nextConfig.headers!();
  for (const source of ["/setup-account", "/reset-password", "/forgot-password"]) {
    expect(headers.find((rule) => rule.source === source)?.headers).toEqual(expect.arrayContaining([
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Cache-Control", value: "private, no-store" },
    ]));
  }
});
