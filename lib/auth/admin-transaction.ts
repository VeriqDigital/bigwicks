import "server-only";
import type { Prisma } from "@/generated/prisma/client";

export type AdminActor = { id: string; sessionVersion: number };
export const adminSessionChangedMessage = "Your administrator session changed. Reload and sign in again before retrying.";
export class AdminSessionChangedError extends Error {
  constructor() { super(adminSessionChangedMessage); }
}

// First lock in an ADMIN mutation/claim. SHARE blocks UPDATE/DELETE (including
// non-key active/role/version updates) until commit, while allowing concurrent
// actions by the same actor. Never upgrade this lock or hold it during mail I/O.
export async function lockAdminActor(tx: Prisma.TransactionClient, actor: AdminActor) {
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${actor.id} FOR SHARE`;
  const user = await tx.user.findUnique({ where: { id: actor.id }, select: {
    id: true, active: true, role: true, sessionVersion: true, customer: { select: { id: true } },
  } });
  if (!user || user.id !== actor.id || !user.active || user.role !== "ADMIN" ||
      user.customer || user.sessionVersion !== actor.sessionVersion) throw new AdminSessionChangedError();
}
