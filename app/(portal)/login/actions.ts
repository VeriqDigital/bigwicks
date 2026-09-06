"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export async function login(_state: string, formData: FormData): Promise<string> {
  try {
    await signIn("credentials", {
      email: formData.get("email"), password: formData.get("password"), redirectTo: "/account",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Unable to sign in. Check your details or try again later.";
    }
    throw error; // Next.js redirects must propagate.
  }
  return "";
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
