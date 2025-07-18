import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { verifyUserCredentials } from '@/lib/data'
import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  providers: [
    Credentials({
      async authorize(credentials) {
        if (credentials?.email && credentials.password) {
          const user = await verifyUserCredentials(
            credentials.email as string,
            credentials.password as string,
          )

          if (user) {
            // Ensure the returned object matches NextAuth's User type expectations
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            }
          }
        }
        return null
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth }) {
      // Logika untuk melindungi rute API
      // Jika token ada (pengguna login), otorisasi berhasil
      return !!auth?.user
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // User is available on initial sign-in
        token.id = user.id
        token.role = user.role
      }
      // If the session is updated (e.g., user updates their name), reflect it in the token
      if (trigger === 'update' && session?.user?.name) {
        token.name = session.user.name
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as 'admin' | 'member'
      }
      return session
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 3 * 60 * 60, // 3 jam
  },
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
