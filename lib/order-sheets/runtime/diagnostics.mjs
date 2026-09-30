// Safe, bounded operational codes. Never persist raw exceptions or cell contents.
export const FAILURE_MESSAGES = Object.freeze({
  PINNED_CONFIG_INVALID: "The pinned template or configuration is invalid or unsupported. Contact the site maintainer; another identical retry will not correct it. Activating a replacement affects future orders only.",
  SAVED_TOTAL_INVALID: "Saved amounts could not be verified for export. Contact the site maintainer; the saved order has not been changed.",
  OUTPUT_LIMIT: "This pinned export exceeds a spreadsheet or output limit. Contact the site maintainer; another identical retry will not reduce it.",
  WORKER_BUSY: "Workbook processing is busy. Retry when capacity is available.",
  WORKER_TIMEOUT: "Workbook processing timed out. Retry once; if it repeats, contact the site maintainer about this pinned export.",
  WORKER_UNAVAILABLE: "The workbook processor could not start. Contact the site maintainer to check the runtime before retrying.",
  GENERATION_FAILED: "Excel generation failed. Retry once; if it repeats, contact the site maintainer. The saved order is unchanged.",
});
export const failureCode = (value) => typeof value === "string" && Object.hasOwn(FAILURE_MESSAGES, value) ? value : "GENERATION_FAILED";
export const failureMessage = (value) => `${failureCode(value)}: ${FAILURE_MESSAGES[failureCode(value)]}`;
