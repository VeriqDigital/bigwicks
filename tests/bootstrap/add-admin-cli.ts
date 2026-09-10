// Child-process CLI test adapter: fictional password stays in memory. This is not
// an operator entrypoint and cannot use application credentials or remote SQL.
import { parseTarget } from "../../scripts/production/plan";

const connection = parseTarget(process.env.DATABASE_URL);
if (connection.target.host !== "127.0.0.1" || connection.target.database !== "bootstrap_disposable" || !process.env.NODE_OPTIONS?.includes("tests/security/isolation.cjs")) throw Error("Use tests/bootstrap/run.mjs only.");

const password = "Fictional-additional-admin-7E";
Object.assign(process.stdin, {
  isTTY: true, isRaw: false,
  setRawMode(mode: boolean) { Object.assign(process.stdin, { isRaw: mode }); return process.stdin; },
});
Object.assign(process.stdout, { isTTY: true });
Object.assign(process.stderr, { isTTY: true });
const write = process.stderr.write.bind(process.stderr);
process.stderr.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
  const result = Reflect.apply(write, process.stderr, [chunk, ...rest]);
  if (/Initial ADMIN password|Confirm ADMIN password/.test(chunk.toString())) {
    queueMicrotask(() => process.stdin.emit("data", Buffer.from(`${password}\r`)));
  }
  return result;
}) as typeof process.stderr.write;

void import("../../scripts/production/add-admin");
