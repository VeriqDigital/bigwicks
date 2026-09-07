import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({ ...base, testDir: ".", testMatch: "http.spec.ts", projects: [{ name: "chromium", use: { browserName: "chromium" } }] });
