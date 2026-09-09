import { StringDecoder } from "node:string_decoder";
import type { ReadStream, WriteStream } from "node:tty";
import { BootstrapError } from "./plan";

// Two entries in one raw-mode session. No characters or masking length are echoed.
export function readHiddenPassword(input: ReadStream = process.stdin, output: WriteStream = process.stderr): Promise<string> {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== "function" || input.isRaw || input.listenerCount("data") || input.listenerCount("readable")) {
    return Promise.reject(new BootstrapError("Secure exclusive terminal input is unavailable. Use an interactive terminal; piped/visible password input is refused."));
  }
  return new Promise((resolve, reject) => {
    let current = "", first = "", phase = 0, finished = false, skipLf = false;
    const decoder = new StringDecoder("utf8");
    const timeout = setTimeout(() => cancel(), 5 * 60 * 1000);
    function finish(error?: BootstrapError) {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      input.pause();
      input.removeListener("data", data); input.removeListener("end", cancel); input.removeListener("error", cancel);
      for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) process.removeListener(signal, cancel);
      try { input.setRawMode(false); } catch { error = new BootstrapError("Terminal restoration failed; password discarded. Close/reset the terminal before retrying."); }
      output.write("\n");
      const result = first;
      current = ""; first = "";
      if (error) reject(error); else resolve(result);
    }
    function cancel() { finish(new BootstrapError("Hidden password input cancelled or unavailable. No bootstrap write attempted.")); }
    function data(chunk: Buffer | string) {
      const text = typeof chunk === "string" ? chunk : decoder.write(chunk);
      for (const character of text) {
        if (finished) return;
        if (skipLf && character === "\n") { skipLf = false; continue; }
        skipLf = false;
        if (character === "\r" || character === "\n") {
          skipLf = character === "\r";
          if (current.length < 15 || current.length > 128) return finish(new BootstrapError("Passwords must contain 15 to 128 characters."));
          if (phase === 0) { first = current; current = ""; phase = 1; output.write("\nConfirm ADMIN password (hidden): "); }
          else if (current !== first) return finish(new BootstrapError("Password entries differ. No bootstrap write attempted."));
          else return finish();
        } else if (character === "\b" || character === "\u007f") {
          current = Array.from(current).slice(0, -1).join("");
        } else if (/[\u0000-\u001f\u007f-\u009f]/.test(character)) {
          return cancel();
        } else {
          current += character;
          if (current.length > 128) return finish(new BootstrapError("Passwords must contain 15 to 128 characters."));
        }
      }
    }
    try {
      input.setRawMode(true);
      if (!input.isRaw) return cancel();
      input.on("data", data); input.once("end", cancel); input.once("error", cancel);
      for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) process.once(signal, cancel);
      output.write("Initial ADMIN password (hidden, 15–128 characters; Ctrl+C cancels): ");
      input.resume();
    } catch { cancel(); }
  });
}
