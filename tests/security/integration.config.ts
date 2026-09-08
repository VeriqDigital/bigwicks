import { defineConfig, mergeConfig } from "vitest/config";
import base from "../../vitest.integration.config";
export default mergeConfig(base, defineConfig({ test: { include: ["tests/security/reproductions.test.ts", "tests/security/contact.test.ts", "tests/security/invitation-concurrency.test.ts", "tests/security/admin-revocation.test.ts"] } }));
