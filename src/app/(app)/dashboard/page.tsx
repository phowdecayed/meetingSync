import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { AdminDashboard } from '@/components/admin-dashboard'
import { UserDashboard } from '@/components/user-dashboard'
import { Skeleton } from '@/components/ui/skeleton'

function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <Skeleton className="h-8 w-48 rounded-md" />
          <Skeleton className="mt-2 h-4 w-64 rounded-md" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2 rounded-lg border p-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <Skeleton className="h-[400px] w-full" />
        </div>
        <div className="space-y-8 lg:col-span-1">
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const session = await auth()
  const isAdmin = session?.user?.role === 'admin'

  return (
    <Suspense fallback={<DashboardLoadingSkeleton />}>
      {isAdmin ? <AdminDashboard /> : <UserDashboard />}
    </Suspense>
  )
}
