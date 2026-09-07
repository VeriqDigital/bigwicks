import { defineConfig } from "vitest/config";
import base from "../../vitest.config";
export default defineConfig({ ...base, test: { include: ["tests/security/reproductions.test.ts"], fileParallelism: false } });
