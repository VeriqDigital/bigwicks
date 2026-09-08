import { defineConfig } from "vitest/config";
import invitations from "./invitations.config";
export default defineConfig({ ...invitations, test: { ...invitations.test,
  include: [...invitations.test!.include!, "tests/integration/customers.test.ts", "tests/integration/pricing.test.ts",
    "tests/security/admin-revocation.test.ts"],
} });
