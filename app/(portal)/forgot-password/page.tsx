import type { Metadata } from "next";
import Link from "next/link";
import ResetRequestForm from "./reset-request-form";

export const metadata: Metadata = { title: "Forgot password", description: "Request a Big Wicks account password reset.", robots: { index: false, follow: false } };
export const maxDuration = 30;

export default function ForgotPasswordPage() {
  return <>
    <h1 className="font-heading text-4xl font-bold">Forgot password?</h1>
    <p className="mt-4">Enter your login email to request a password reset link.</p>
    <ResetRequestForm />
    <Link href="/login" className="mt-6 inline-block underline">Back to sign in</Link>
  </>;
}
