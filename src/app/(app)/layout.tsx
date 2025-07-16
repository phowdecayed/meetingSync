'use client'

import { useSession } from 'next-auth/react'
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar'
import { DashboardHeader } from '@/components/dashboard-header'
import { SidebarNav } from '@/components/sidebar-nav'
import { Loader2 } from 'lucide-react'
import { TourProvider } from '@/components/tour-provider'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession({ required: true })

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" aria-label="Sidebar">
        <SidebarNav />
      </Sidebar>
      <SidebarInset>
        <DashboardHeader />
        <main className="p-4 md:p-6 lg:p-8" role="main">
          {children}
        </main>
      </SidebarInset>
      <TourProvider />
    </SidebarProvider>
  )
}
