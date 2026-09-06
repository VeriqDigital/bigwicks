import Link from "next/link";
import { redirect } from "next/navigation";
import { accountTokenUsable, consumeAccountToken, invalidLinkMessage, tokenDigest, type PasswordResult } from "@/lib/auth/account-tokens";
import type { AccountTokenPurpose } from "@/generated/prisma/client";
import PasswordForm from "./password-form";

export default async function TokenPage({ raw, purpose }: { raw: unknown; purpose: AccountTokenPurpose }) {
  const digest = tokenDigest(raw);
  if (!digest || !await accountTokenUsable(digest, purpose)) return <>
    <h1 className="font-heading text-4xl font-bold">Link unavailable</h1>
    <p className="mt-4">{invalidLinkMessage}</p>
    <Link href={purpose === "ACCOUNT_SETUP" ? "/contact" : "/forgot-password"} className="mt-6 inline-block underline">{purpose === "ACCOUNT_SETUP" ? "Contact Big Wicks" : "Request a new reset link"}</Link>
  </>;
  async function savePassword(_state: PasswordResult, form: FormData): Promise<PasswordResult> {
    "use server";
    // Next encrypts this closure. No raw token or identity is passed as a prop
    // or accepted from form fields. The DB still revalidates on every submission.
    const result = await consumeAccountToken(digest!, purpose, form);
    if (result.success) redirect("/login?password=updated");
    return result;
  }
  const setup = purpose === "ACCOUNT_SETUP";
  return <>
    <h1 className="font-heading text-4xl font-bold">{setup ? "Set up your account" : "Reset your password"}</h1>
    <p className="mt-4">{setup ? "Choose a password for your Big Wicks wholesale account. Account access remains subject to Big Wicks approval." : "Choose a new password for your Big Wicks account. This signs out all existing sessions."}</p>
    <PasswordForm action={savePassword} label={setup ? "Set password" : "Reset password"} />
    <Link href="/login" className="mt-6 inline-block underline">Back to sign in</Link>
  </>;
}
