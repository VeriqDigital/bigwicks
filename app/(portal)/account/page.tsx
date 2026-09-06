import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/authorization";

export default async function AccountPage() {
  const user = await requireUser();
  redirect(user.role === "ADMIN" ? "/admin" : "/portal");
}
