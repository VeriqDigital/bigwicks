import { defineConfig } from "vitest/config";
import base from "../../vitest.config";
export default defineConfig({ ...base, test: {
  include: ["tests/unit/**/*.test.ts", "tests/integration/account-tokens.test.ts", "tests/integration/customer-batch.test.ts",
    "tests/integration/database.test.ts", "tests/security/reproductions.test.ts", "tests/security/invitation-concurrency.test.ts", "tests/security/contact.test.ts"],
  fileParallelism: false,
} });
