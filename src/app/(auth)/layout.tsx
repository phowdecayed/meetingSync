'use client'

import { useSettingsStore } from '@/store/use-settings-store'
import { useEffect, useState } from 'react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { appName, appDescription, isLoading } = useSettingsStore()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (isLoading || !isClient) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        {/* Optional: Add a loader here */}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full">
      <div
        className="bg-primary/80 text-primary-foreground relative hidden items-center justify-center bg-cover bg-center p-12 lg:flex lg:w-1/2"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)',
        }}
      >
        <div className="bg-primary/80 absolute inset-0" />
        <div className="relative z-10 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent mx-auto mb-6 h-20 w-20"
          >
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
            <circle cx="12" cy="13" r="3"></circle>
          </svg>
          <h1 className="font-headline text-4xl font-bold">{appName}</h1>
          <p className="text-primary-foreground/80 mt-4 text-lg">
            {appDescription}
          </p>
        </div>
      </div>
      <div className="bg-background flex w-full items-center justify-center p-8 lg:w-1/2">
        {children}
      </div>
    </div>
  )
}
