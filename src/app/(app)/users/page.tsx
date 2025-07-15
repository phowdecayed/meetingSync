import { getUsers } from '@/lib/data'
import { UsersTable } from './users-table' // We will create this next
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="rounded-md border">
        <div className="divide-y">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="w-1/4">
                <Skeleton className="h-4 w-full" />
              </div>
              <div className="w-1/3">
                <Skeleton className="h-4 w-full" />
              </div>
              <div className="w-1/6">
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-24" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  )
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams
  const query = Array.isArray(resolvedSearchParams.query)
    ? resolvedSearchParams.query[0] || ''
    : resolvedSearchParams.query || ''
  const currentPage = Number(resolvedSearchParams.page) || 1
  const perPage = Number(resolvedSearchParams.per_page) || 10

  const { users, total } = await getUsers({
    page: currentPage,
    perPage,
    query,
  })

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          View, search, and manage all users in the system.
        </p>
      </div>
      <Suspense fallback={<TableSkeleton />}>
        <UsersTable
          users={users}
          totalPages={totalPages}
          currentPage={currentPage}
          perPage={perPage}
          query={query}
        />
      </Suspense>
    </div>
  )
}
