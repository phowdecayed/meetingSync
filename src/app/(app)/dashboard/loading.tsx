import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <Skeleton className="h-8 w-48 rounded-md" />
          <Skeleton className="mt-2 h-4 w-64 rounded-md" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <Skeleton className="h-4 w-32 rounded-md" />
              </CardTitle>
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12 rounded-md" />
              <Skeleton className="mt-1 h-3 w-40 rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-6 w-40 rounded-md" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="flex h-[350px] w-full items-end gap-2">
              {[...Array(7)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="w-full rounded-t-lg"
                  style={{ height: `${Math.random() * 80 + 20}%` }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-6 w-32 rounded-md" />
            </CardTitle>
            <Skeleton className="mt-2 h-4 w-48 rounded-md" />
          </CardHeader>
          <CardContent className="grid gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="ml-4 space-y-2">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-3 w-24 rounded-md" />
                </div>
                <Skeleton className="ml-auto h-4 w-10 rounded-md" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
