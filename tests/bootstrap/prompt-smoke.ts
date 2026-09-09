// Terminal-only smoke, no database imports/connections and only a fictional value.
import { readHiddenPassword } from "../../scripts/production/password-input";
void readHiddenPassword().then(value => {
  if (value !== "Fictional-terminal-password") throw Error("Fictional input mismatch");
  if (process.stdin.isRaw) throw Error("Terminal remained raw");
  console.log("PASS hidden terminal entry, confirmation and terminal restoration; no value echoed.");
}).catch(() => { console.error("Terminal smoke refused or cancelled safely."); process.exitCode = 1; });
