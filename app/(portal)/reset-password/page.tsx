import type { Metadata } from "next";
import TokenPage from "../token-page";

export const metadata: Metadata = { title: "Reset your password", description: "Choose a new Big Wicks account password.", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  return <TokenPage raw={(await searchParams).token} purpose="PASSWORD_RESET" />;
}
