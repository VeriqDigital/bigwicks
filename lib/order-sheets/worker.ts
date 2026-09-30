import "server-only";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
// Explicit runtime imports allow Next's tracer to follow worker dependencies.
import "exceljs";
import "saxes";
import { LIMITS } from "./runtime/limits.mjs";
import { failureCode } from "./runtime/diagnostics.mjs";
import type {
  Configuration,
  Generation,
  Inspection,
  SavedSheetOrder,
} from "./types";

export class OrderSheetError extends Error {
  readonly code: string;
  constructor(message: string, code: unknown = "GENERATION_FAILED") {
    super(message);
    this.code = failureCode(code);
  }
}
let runningWorkers = 0;
export function sheetMessage(error: unknown) {
  return error instanceof OrderSheetError
    ? error.message
    : "Order sheets are temporarily unavailable. Refresh and try again; saved orders remain unchanged.";
}
async function run<T>(input: object): Promise<T> {
  if (runningWorkers >= LIMITS.concurrentWorkers)
    throw new OrderSheetError(
      "Workbook processing is busy. Retry in a moment.",
      "WORKER_BUSY",
    );
  runningWorkers++;
  try {
    return await new Promise<T>((done, reject) => {
      const child = spawn(
        process.execPath,
        [
          `--max-old-space-size=${LIMITS.heapMb}`,
          resolve("lib/order-sheets/runtime/worker.mjs"),
        ],
        {
          stdio: ["pipe", "pipe", "ignore"],
          windowsHide: true,
          // Do not pass credentials, loader hooks or provider configuration into file processing.
          env: {
            SystemRoot: process.env.SystemRoot,
            WINDIR: process.env.WINDIR,
            PATH: process.env.PATH,
            NODE_ENV: "production",
          },
        },
      );
      let size = 0;
      const chunks: Buffer[] = [];
      let settled = false;
      const finish = (error?: Error, result?: T) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) reject(error);
        else done(result!);
      };
      const timer = setTimeout(() => {
        child.kill();
        finish(
          new OrderSheetError(
            "Workbook processing exceeded its time limit. Simplify the source or retry the saved export.",
            "WORKER_TIMEOUT",
          ),
        );
      }, LIMITS.milliseconds);
      child.once("error", () =>
        finish(new OrderSheetError("Workbook processor could not start.", "WORKER_UNAVAILABLE")),
      );
      child.stdin.on("error", () => {
        /* Exit handler reports one safe error. */
      });
      child.stdout.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > LIMITS.output * 2) {
          child.kill();
          finish(new OrderSheetError("Workbook output exceeded its limit.", "OUTPUT_LIMIT"));
        } else chunks.push(chunk);
      });
      child.once("close", (code) => {
        try {
          const output = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          if (code !== 0 || output.error)
            finish(
              new OrderSheetError(
                output.error || "Workbook processing failed.",
                output.code,
              ),
            );
          else finish(undefined, output.result as T);
        } catch {
          finish(
            new OrderSheetError(
              "Workbook processing failed. Retry or correct the source.",
            ),
          );
        }
      });
      child.stdin.end(JSON.stringify(input));
    });
  } finally {
    runningWorkers--;
  }
}
export const inspectOrderSheet = (bytes: Uint8Array) =>
  run<Inspection>({
    operation: "inspect",
    bytes: Buffer.from(bytes).toString("base64"),
  });
export const generateOrderSheet = (
  order: SavedSheetOrder,
  template: { bytes: string; configuration: Configuration } | null,
  absence: string,
) => run<Generation>({ operation: "generate", order, template, absence });
