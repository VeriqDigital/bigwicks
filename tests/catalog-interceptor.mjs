// Node preload used only by the isolated browser runner. No application test
// switch or mock endpoint is compiled into the shipped application.
import { readFile } from "node:fs/promises";

if (!process.env.TEST_CATALOG_CONTENT_FILE || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID !== "testonly") throw new Error("Missing isolated catalog configuration.");
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  if (url.hostname.endsWith(".sanity.io")) {
    if (url.hostname !== "testonly.api.sanity.io" || !url.pathname.includes("/data/query/test")) throw new Error("Unexpected Sanity request in test.");
    const fixture = JSON.parse(await readFile(process.env.TEST_CATALOG_CONTENT_FILE, "utf8"));
    if (fixture.fail) return Response.json({ error: "FICTIONAL_PROVIDER_SECRET" }, { status: 503 });
    return Response.json({ result: fixture.products });
  }
  return originalFetch(input, init);
};
