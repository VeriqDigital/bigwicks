import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "2304kb" } },
  serverExternalPackages: ["exceljs", "saxes"],
  outputFileTracingIncludes: { "/*": ["./lib/order-sheets/runtime/*.mjs"] },
  images: { qualities: [75, 90] },
  async headers() {
    return ["/setup-account", "/reset-password", "/forgot-password"].map((source) => ({
      source,
      headers: [
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
        { key: "Cache-Control", value: "private, no-store" },
      ],
    }));
  },
};

export default nextConfig;
