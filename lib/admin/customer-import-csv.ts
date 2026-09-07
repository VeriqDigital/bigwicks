import "server-only";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { customerFieldsSchema } from "./customer-validation";

export const MAX_CUSTOMER_BYTES = 128 * 1024;
export const MAX_CUSTOMER_ROWS = 250;
export const customerHeaders = ["companyName", "customerNumber", "email", "pricingTier", "active"] as const;
export class CustomerBatchError extends Error {}
const plain = (max: number) => z.string().max(max).refine((v) => !/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(v), "Control characters are not allowed.");
export const importRowSchema = z.object({
  companyName: plain(200).pipe(customerFieldsSchema.shape.companyName),
  customerNumber: plain(100).transform((v) => customerFieldsSchema.shape.customerNumber.parse(v)).refine((v) => !!v, "Enter a customer number.").transform((v) => v!),
  email: plain(254).pipe(customerFieldsSchema.shape.email),
  pricingTier: plain(100).transform((v) => v.trim()).pipe(z.string().min(1)),
  active: z.boolean(),
}).strict();
export type CustomerImportRow = z.infer<typeof importRowSchema>;
export type CustomerImportIssue = { row: number; field: string; message: string };
export function parseCustomerCsv(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_CUSTOMER_BYTES) throw new CustomerBatchError("Choose a nonempty CSV file no larger than 128 KiB.");
  let records: string[][];
  try {
    let count = 0;
    records = parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes), { bom: true, skip_empty_lines: true, max_record_size: 2048,
      on_record: (record: string[]) => { if (++count > MAX_CUSTOMER_ROWS + 1) throw Error(); return record; } });
  } catch { throw new CustomerBatchError("Invalid CSV: use UTF-8, valid comma-separated quoting, at most 250 rows and 2,048 characters per record."); }
  const headers = records.shift();
  if (!headers || headers.length !== customerHeaders.length || new Set(headers).size !== headers.length || customerHeaders.some((h) => !headers.includes(h))) throw new CustomerBatchError("Use exactly companyName, customerNumber, email, pricingTier, active. No other columns are accepted.");
  if (!records.length) throw new CustomerBatchError("The CSV must contain at least one customer.");
  const rows: CustomerImportRow[] = []; const errors: CustomerImportIssue[] = [];
  const emails = new Map<string, number>(); const numbers = new Map<string, number>();
  records.forEach((record, index) => {
    const row = index + 2;
    const get = (key: string) => record[headers.indexOf(key)];
    const rawActive = get("active");
    const parsed = importRowSchema.safeParse({ companyName: get("companyName"), customerNumber: get("customerNumber"), email: get("email"), pricingTier: get("pricingTier"),
      active: rawActive === "true" ? true : rawActive === "false" ? false : rawActive });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) errors.push({ row, field: String(issue.path[0]), message: issue.path[0] === "active" ? "Use exactly true or false." : "Required valid text within the field limit; check format and control characters." });
      return;
    }
    for (const [field, seen] of [["email", emails], ["customerNumber", numbers]] as const) {
      const value = parsed.data[field]; const previous = seen.get(value);
      if (previous) errors.push({ row, field, message: `Duplicates row ${previous}.` }); else seen.set(value, row);
    }
    rows.push(parsed.data);
  });
  return { rows, rowsRead: records.length, errors };
}
