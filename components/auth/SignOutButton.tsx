import { logout } from "@/app/(portal)/login/actions";

export default function SignOutButton() {
  return <form action={logout} className="mt-8">
    <button className="min-h-12 rounded border border-current px-5 font-semibold">Sign out</button>
  </form>;
}
