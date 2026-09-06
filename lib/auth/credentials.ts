import "server-only";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { isActivePrincipal, principalSelect } from "./principal";
import { allowCredentialAttempt } from "./rate-limit";
import { verifyPassword } from "./password";
import { loginEmailSchema } from "./validation";

const credentialsSchema = z.object({
  email: loginEmailSchema,
  password: z.string().min(1).max(128),
});

export async function authorizeCredentials(credentials: Partial<Record<string, unknown>>) {
  const parsed = credentialsSchema.safeParse(credentials);
  if (!parsed.success) return null;
  const { email, password } = parsed.data;
  if (!await allowCredentialAttempt(email)) return null;
  const user = await getDb().user.findUnique({
    where: { email }, select: { ...principalSelect, passwordHash: true },
  });
  const validPassword = await verifyPassword(password, user?.passwordHash ?? undefined);
  if (!validPassword || !user?.passwordHash || !isActivePrincipal(user)) return null;
  return { id: user.id, sessionVersion: user.sessionVersion };
}
