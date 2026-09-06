import "server-only";
import { getDb } from "@/lib/db";

export const principalSelect = {
  id: true,
  email: true,
  role: true,
  active: true,
  sessionVersion: true,
  customer: {
    select: { id: true, companyName: true, active: true, pricingTierId: true },
  },
} as const;

export type Principal = NonNullable<Awaited<ReturnType<typeof findPrincipal>>>;

export function findPrincipal(id: string) {
  return getDb().user.findUnique({ where: { id }, select: principalSelect });
}

export function isActivePrincipal(user: {
  active: boolean;
  role: string;
  customer: { active: boolean } | null;
} | null): boolean {
  if (!user?.active) return false;
  if (user.role === "ADMIN") return user.customer === null;
  return user.role === "CUSTOMER" && user.customer?.active === true;
}

export async function resolvePrincipal(id: unknown, version: unknown) {
  if (typeof id !== "string" || !Number.isInteger(version)) return null;
  const user = await findPrincipal(id);
  return user && isActivePrincipal(user) && user.sessionVersion === version ? user : null;
}
