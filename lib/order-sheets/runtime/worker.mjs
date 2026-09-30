// Private Node subprocess entry point. Never imported by client code.
import { inspectWorkbook, generateWorkbook } from "./workbook.mjs";
import { LIMITS, SheetError } from "./limits.mjs";
try {
  let size = 0;
  const chunks = [];
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > 6 * 1024 * 1024) throw Error();
    chunks.push(chunk);
  }
  const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  const result =
    input.operation === "inspect"
      ? await inspectWorkbook(Buffer.from(input.bytes, "base64"))
      : input.operation === "generate"
        ? await generateWorkbook(input.order, input.template, input.absence)
        : null;
  if (!result) throw Error();
  const output = JSON.stringify({ result });
  if (Buffer.byteLength(output) > LIMITS.output * 2) throw Error();
  process.stdout.write(output);
} catch (error) {
  process.stdout.write(
    JSON.stringify({
      error:
        error instanceof SheetError
          ? error.message
          : "Workbook processing failed. Correct the source layout or retry the saved export.",
    }),
  );
  process.exitCode = 1;
}
