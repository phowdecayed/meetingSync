import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  const isApiAuthRoute = nextUrl.pathname.startsWith('/api/auth')
  const isPublicRoute = ['/login', '/register'].includes(nextUrl.pathname)

  // Allow API authentication routes to be accessed
  if (isApiAuthRoute) {
    return
  }

  // If the user is on a public route and is logged in, redirect to dashboard
  if (isPublicRoute) {
    if (isLoggedIn) {
      return Response.redirect(new URL('/dashboard', nextUrl))
    }
    return
  }

  // If the user is not logged in and not on a public route, redirect to login
  if (!isLoggedIn) {
    let from = nextUrl.pathname
    if (nextUrl.search) {
      from += nextUrl.search
    }

    return Response.redirect(
      new URL(`/login?from=${encodeURIComponent(from)}`, nextUrl),
    )
  }
})

// Match all routes except for API, Next.js static files, Next.js image optimization files, and favicon.
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
