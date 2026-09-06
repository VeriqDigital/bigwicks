import "server-only";
import { argon2id, hash, verify } from "argon2";

const options = { type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string) {
  if (password.length < 15 || password.length > 128) {
    throw new Error("Passwords must contain 15 to 128 characters.");
  }
  return hash(password, options);
}

// A real hash with the same work factor prevents fast unknown-email responses.
let dummyHash: Promise<string> | undefined;
export async function verifyPassword(password: string, passwordHash?: string) {
  const target = passwordHash ?? await (dummyHash ??= hash("unused-dummy-password", options));
  try {
    return await verify(target, password);
  } catch {
    return false;
  }
}
