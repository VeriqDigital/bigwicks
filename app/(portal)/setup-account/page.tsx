import type { Metadata } from "next";
import TokenPage from "../token-page";

export const metadata: Metadata = { title: "Set up your account", description: "Choose your Big Wicks account password.", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function SetupAccountPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  return <TokenPage raw={(await searchParams).token} purpose="ACCOUNT_SETUP" />;
}
