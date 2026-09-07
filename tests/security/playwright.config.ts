import { defineConfig } from "@playwright/test";
import base from "../../playwright.config";
// An unreachable local proxy blocks browser egress; local test routes bypass it.
export default defineConfig({ ...base, testDir: "../e2e", outputDir: "../../test-results",
  use: { ...base.use, proxy: { server: "http://127.0.0.1:9", bypass: "localhost,127.0.0.1,[::1]" } },
});
