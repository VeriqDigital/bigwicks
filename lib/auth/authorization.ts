import "server-only";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { resolvePrincipal } from "./principal";

export async function getCurrentUser() {
  const session = await auth();
  return resolvePrincipal(session?.user?.id, session?.user?.sessionVersion);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") notFound();
  return user;
}

export async function requireCustomer() {
  const user = await requireUser();
  if (user.role !== "CUSTOMER" || !user.customer?.active) notFound();
  return { ...user, customer: user.customer };
}
