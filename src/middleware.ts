import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  const isPublicRoute = ['/login', '/register'].includes(nextUrl.pathname)

  if (isPublicRoute && isLoggedIn) {
    return Response.redirect(new URL('/dashboard', nextUrl))
  }

  // Untuk semua rute lain yang dilindungi, callback `authorized` di auth.ts
  // akan secara otomatis menangani pengalihan jika pengguna tidak login.
  return
})

// Konfigurasi matcher ini memastikan middleware berjalan pada rute yang tepat.
// Rute yang tidak cocok akan diabaikan oleh middleware.
export const config = {
  matcher: [
    '/((?!api/public/meetings|_next/static|_next/image|favicon.ico|$).*)',
  ],
}