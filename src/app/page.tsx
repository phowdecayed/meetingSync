'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import PublicCalendar from '@/components/public-calendar'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (status !== 'loading') {
      if (session) {
        router.replace('/dashboard')
      } else {
        setIsReady(true)
      }
    }
  }, [session, status, router])

  if (!isReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="text-primary h-12 w-12 animate-spin" />
      </div>
    )
  }

  return <PublicCalendar />
}
