import "server-only";
import type { AccountTokenPurpose } from "@/generated/prisma/client";

export function accountEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.ACCOUNT_FROM_EMAIL?.trim();
  const origin = new URL(process.env.AUTH_URL ?? "");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
  if (!apiKey || !from || /[\r\n]/.test(from) || origin.username || origin.password ||
      origin.search || origin.hash || origin.pathname !== "/" ||
      (origin.protocol !== "https:" && !(local && origin.protocol === "http:"))) {
    throw new Error("Account email configuration is invalid.");
  }
  return { apiKey, from, origin: origin.origin };
}

export async function sendAccountEmail(email: string, rawToken: string, purpose: AccountTokenPurpose, id: string) {
  const { apiKey, from, origin } = accountEmailConfig();
  const setup = purpose === "ACCOUNT_SETUP";
  const url = new URL(setup ? "/setup-account" : "/reset-password", origin);
  url.searchParams.set("token", rawToken);
  const text = [
    "Big Wicks Fireworks",
    "",
    setup ? "Big Wicks has created a wholesale account for you. Choose your password using the link below." : "Use the link below to reset your Big Wicks account password.",
    "",
    url.toString(),
    "",
    `This link expires in ${setup ? "24 hours" : "1 hour"} and can be used once. A newer link replaces an earlier link.`,
    setup ? "Setting a password does not change account access approved by Big Wicks. If this email was unexpected, ignore it or contact Big Wicks." : "If you did not request a password reset, you can ignore this email.",
  ].join("\n");
  // Never log provider payloads, errors, URLs or tokens. Acceptance is not inbox delivery.
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `big-wicks-account-${id}` },
    body: JSON.stringify({ from, to: [email], subject: setup ? "Set up your Big Wicks account" : "Reset your Big Wicks password", text }),
    signal: AbortSignal.timeout(10_000), cache: "no-store",
  });
  if (!response.ok) throw new Error("Account email delivery failed.");
}
