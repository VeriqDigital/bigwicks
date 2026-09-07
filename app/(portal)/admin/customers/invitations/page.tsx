import type { Metadata } from "next";
import Link from "next/link";
import { listInvitationCandidates } from "@/lib/admin/customer-invitations";
import InvitationForm from "./invitation-form";
export const metadata: Metadata = { title: "Customer invitations" };
export const maxDuration = 300;
export default async function InvitationsPage() {
  const candidates = await listInvitationCandidates();
  return <>
    <Link href="/admin/customers" className="underline">Back to customers</Link>
    <h1 className="mt-5 font-heading text-4xl font-bold">Customer invitations</h1>
    <p className="mt-3">Select up to 25 active customers who have not set a password, then review and confirm the recipients. Nothing is sent until confirmation. Sending a new link replaces earlier setup links.</p>
    <p className="mt-3 text-sm">Emails are sent sequentially. Keep this page open until results appear. After an interruption, refresh and check delivery status before selecting recipients again.</p>
    {candidates.truncated && <p className="mt-3">Showing the first 500 eligible accounts. Use individual customer management for other accounts.</p>}
    <InvitationForm rows={candidates.rows} />
  </>;
}
