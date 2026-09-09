import { afterEach, expect, it, vi } from "vitest";
import sitemap from "../../app/sitemap";
import robots from "../../app/robots";
import { getSiteUrl } from "../../config/seo";
import { metadata as home } from "../../app/page";
import { metadata as contact } from "../../app/contact/page";
import { metadata as utility } from "../../app/(portal)/layout";
import nextConfig from "../../next.config";

// Metadata imports must not initialize contact delivery or private services.
vi.mock("@/components/contact/ContactForm", () => ({ default: () => null }));

afterEach(() => vi.unstubAllEnvs());

it("declares page-specific public canonicals without overriding other homepage metadata", () => {
  expect(home).toEqual({ alternates: { canonical: "/" } });
  expect(contact.alternates).toEqual({ canonical: "/contact" });
});

it.each(["https://www.example.test", "https://www.example.test/", "https://alternate.example.test"])(
  "uses the configured origin %s for exactly two URL-only public entries and robots",
  (origin) => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", origin);
    expect(getSiteUrl().href).toBe(new URL(origin).href);
    expect(sitemap()).toEqual([
      { url: new URL("/", origin).href },
      { url: new URL("/contact", origin).href },
    ]);
    expect(robots().sitemap).toBe(new URL("/sitemap.xml", origin).href);
    // Exact URL-only equality also excludes redirects, utility/API/product routes,
    // query strings, fragments, arbitrary dates and private pricing/customer fields.
  },
);

it("preserves the local fallback", () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined);
  expect(getSiteUrl().href).toBe("http://localhost:3000/");
  expect(sitemap()).toEqual([{ url: "http://localhost:3000/" }, { url: "http://localhost:3000/contact" }]);
  expect(robots().sitemap).toBe("http://localhost:3000/sitemap.xml");
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
