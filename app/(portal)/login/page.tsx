import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/authorization";
import LoginForm from "./login-form";

export const metadata: Metadata = { title: "Account sign in", description: "Sign in to your approved Big Wicks account." };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/portal");
  return <>
    <h1 className="font-heading text-4xl font-bold">Account sign in</h1>
    <p className="mt-4">Access for approved wholesale customers and Big Wicks staff.</p>
    <LoginForm />
  </>;
}
