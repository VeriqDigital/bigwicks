// Loaded ONLY by the isolated integration runner, never imported by application
// code. Intercepts Resend at the transport boundary; no real email leaves tests.
import { access, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { watch } from "node:fs";

// Test-only provider barrier: creating `hold` pauses acceptance; removing it
// releases acceptance. Watch before checking existence to avoid a missed release.
async function providerBarrier() {
  await new Promise((resolve, reject) => {
    const directory = process.env.TEST_ACCOUNT_MAIL_DIR;
    const watcher = watch(directory, () => { void check(); });
    const timeout = setTimeout(() => finish(new Error("Isolated provider barrier timed out.")), 15000);
    function finish(error) { clearTimeout(timeout); watcher.close(); if (error) reject(error); else resolve(); }
    async function check() { try { await access(join(directory, "hold")); } catch { finish(); } }
    watcher.once("error", finish);
    void check();
  });
}

if (!process.env.TEST_ACCOUNT_MAIL_DIR || process.env.RESEND_API_KEY !== "isolated-test-key") throw new Error("Missing isolated email test configuration.");
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (new URL(url).hostname === "api.resend.com") {
    let stall = false;
    try { await access(join(process.env.TEST_ACCOUNT_MAIL_DIR, "timeout")); stall = true; } catch { /* No timeout fixture. */ }
    if (stall) {
      // Exercise the application's actual timeout without contacting the provider.
      return new Promise((_resolve, reject) => {
        if (!init.signal) return reject(new Error("Missing isolated provider timeout signal."));
        if (init.signal.aborted) return reject(init.signal.reason);
        init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true });
      });
    }
    try {
      await access(join(process.env.TEST_ACCOUNT_MAIL_DIR, "fail"));
      return new Response("{}", { status: 503 });
    } catch { /* Normal test delivery. */ }
    const body = JSON.parse(init.body);
    await writeFile(join(process.env.TEST_ACCOUNT_MAIL_DIR, `${randomUUID()}.json`), JSON.stringify(body));
    await providerBarrier();
    return Response.json({ id: randomUUID() });
  }
  return originalFetch(input, init);
};
