import { defineConfig } from "vitest/config";
import base from "../../vitest.config";
export default defineConfig({ ...base, test: {
  include: ["tests/unit/bootstrap.test.ts", "tests/bootstrap/database.test.ts", "tests/bootstrap/add-admin.test.ts"],
  fileParallelism: false, testTimeout: 30000, hookTimeout: 30000, clearMocks: true,
} });
