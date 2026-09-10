import { Prisma, type PrismaClient } from "../../generated/prisma/client";
import { hashPassword } from "../../lib/auth/password";
import { BootstrapError, parseRequest, type Target } from "./plan";

type AddAdminRequest = { target: Target; email: string };
const duplicateMessage = "Email already exists. Additional ADMIN creation refused; no existing user was changed.";

export function parseAddAdminRequest(args: string[], target: Target): AddAdminRequest {
  // Reuse bootstrap's strict flags, target acknowledgements and auth email validation,
  // but never accept its initial-bootstrap apply/plan mode.
  if (args.includes("--apply")) throw new BootstrapError("db:add-admin does not accept --apply. Use --help.");
  const { email } = parseRequest(args, target);
  return { target, email };
}

export async function inspectAdditionalAdmin(db: PrismaClient, request: AddAdminRequest) {
  try {
    if (await db.user.findUnique({ where: { email: request.email }, select: { id: true } })) {
      throw new BootstrapError(duplicateMessage);
    }
  } catch (error) {
    if (error instanceof BootstrapError) throw error;
    throw new BootstrapError("Additional ADMIN inspection failed. Check the confirmed target, schema and operator access without printing credentials. No write attempted.");
  }
}

export async function createAdditionalAdmin(db: PrismaClient, request: AddAdminRequest, password: string) {
  if (password.length < 15 || password.length > 128) throw new BootstrapError("Passwords must contain 15 to 128 characters.");
  try {
    // Shared Argon2id policy; terminal input and hashing never hold a transaction open.
    const passwordHash = await hashPassword(password);
    return await db.$transaction(async tx => {
      const [identity] = await tx.$queryRaw<{ database: string }[]>`SELECT current_database() AS database`;
      if (identity.database !== request.target.database) throw new BootstrapError("Connected database identity differs from the confirmed target. No write attempted.");
      if (await tx.user.findUnique({ where: { email: request.email }, select: { id: true } })) {
        throw new BootstrapError(duplicateMessage);
      }
      // No update/upsert or nested relation writes. The unique email constraint
      // arbitrates a competing insert after the existence check.
      const admin = await tx.user.create({
        data: { email: request.email, passwordHash, role: "ADMIN", active: true, sessionVersion: 0 },
        select: { email: true, role: true, active: true },
      });
      return { ...admin, customersCreated: 0, emailsSent: 0 };
    }, { isolationLevel: "ReadCommitted", maxWait: 10000, timeout: 15000 });
  } catch (error) {
    if (error instanceof BootstrapError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new BootstrapError(duplicateMessage);
    }
    // A lost acknowledgement can follow a committed insert. Never retry automatically.
    throw new BootstrapError("Additional ADMIN creation failed or its result is uncertain. STOP and independently check whether the email exists before retrying; investigate operator access/database errors without printing credentials.");
  }
}
