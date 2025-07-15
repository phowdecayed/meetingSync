// src/app/not-found.tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-bold">404 - Page Not Found</h1>
      <p className="text-muted-foreground mt-4">
        The page you are looking for does not exist.
      </p>
      <Link href="/dashboard" className="mt-6 text-blue-500 hover:underline">
        Go back to Dashboard
      </Link>
    </div>
  )
}
