import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyUserCredentials } from "@/lib/data";
import type { NextAuthConfig } from "next-auth";
import crypto from "crypto";

// Membuat secret yang konsisten atau menggunakan environment variable jika tersedia
const getAuthSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error("FATAL: NEXTAUTH_SECRET environment variable is not set.");
    // Di lingkungan pengembangan, kita bisa menggunakan nilai default,
    // tetapi di produksi, kita harus menghentikan proses.
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXTAUTH_SECRET is not set in production environment.");
    } else {
      // Menggunakan nilai default hanya untuk pengembangan
      return "this-is-a-development-secret-do-not-use-in-production";
    }
  }
  return secret;
};

export const authConfig = {
  providers: [
    Credentials({
      async authorize(credentials) {
        if (credentials?.email && credentials.password) {
          const user = await verifyUserCredentials(
            credentials.email as string,
            credentials.password as string,
          );

          if (user) {
            // Ensure the returned object matches NextAuth's User type expectations
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            };
          }
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // User is available on initial sign-in
        token.id = user.id;
        token.role = user.role;
      }
      // If the session is updated (e.g., user updates their name), reflect it in the token
      if (trigger === "update" && session?.user?.name) {
        token.name = session.user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "admin" | "member";
      }
      return session;
    },
  },
  secret: getAuthSecret(),
  trustHost: true,
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
