import "server-only";
import NextAuth, { AuthError } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authorizeCredentials } from "@/lib/auth/credentials";
import { resolvePrincipal } from "@/lib/auth/principal";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: process.env.NODE_ENV !== "production" || process.env.VERCEL === "1" || process.env.AUTH_TRUST_HOST === "true",
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  providers: [Credentials({
    credentials: { email: { type: "email" }, password: { type: "password" } },
    authorize: authorizeCredentials,
  })],
  callbacks: {
    async jwt({ token, user }) {
      if (user) return { sub: user.id, sessionVersion: user.sessionVersion };
      // Ignore browser session updates; revoke disabled, deleted or version-changed identities.
      const current = await resolvePrincipal(token.sub, token.sessionVersion);
      return current ? { sub: current.id, sessionVersion: current.sessionVersion } : null;
    },
    session({ session, token }) {
      return { expires: session.expires, user: { id: token.sub!, sessionVersion: token.sessionVersion as number } };
    },
    redirect({ baseUrl }) {
      // All post-login navigation is resolved from the database at /account.
      // Never accept a browser-supplied destination (including external URLs).
      return `${baseUrl}/account`;
    },
  },
  logger: {
    error(error) {
      // Do not log credentials, connection strings, user data or nested provider errors.
      const type = error instanceof AuthError ? error.type : "UnknownAuthError";
      if (type !== "CredentialsSignin") console.error("Authentication failed:", type);
    },
  },
});
