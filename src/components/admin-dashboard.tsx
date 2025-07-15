import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Video, KeyRound } from 'lucide-react'
import Link from 'next/link'
import { getAdminDashboardStats } from '@/lib/data'
import { MeetingsOverviewChart } from './meetings-overview-chart'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'

function getInitials(name: string = ''): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export async function AdminDashboard() {
  const stats = await getAdminDashboardStats()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="font-headline text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Gambaran umum dan statistik keseluruhan sistem.
          </p>
        </div>
      </div>

      {/* Kartu Statistik Utama */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Pengguna
            </CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-muted-foreground text-xs">
              Pengguna terdaftar di sistem
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rapat</CardTitle>
            <Video className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMeetings}</div>
            <p className="text-muted-foreground text-xs">
              Jumlah rapat yang telah dibuat
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Akun Zoom Terhubung
            </CardTitle>
            <KeyRound className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.connectedZoomAccounts}
            </div>
            <p className="text-muted-foreground text-xs">
              Akun Zoom S2S yang aktif
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Kolom Kiri: Grafik */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Gambaran Rapat Sistem</CardTitle>
              <CardDescription>
                Jumlah rapat yang dijadwalkan selama 7 hari ke depan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MeetingsOverviewChart
                chartData={stats.meetingsPerDay.map((data) => ({
                  date: data.date,
                  meetings: data.count,
                }))}
              />
            </CardContent>
          </Card>
        </div>

        {/* Kolom Kanan: Tindakan & Pengguna Teraktif */}
        <div className="space-y-8 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Tindakan Cepat</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Link href="/users">
                <Button className="w-full">Kelola Pengguna</Button>
              </Link>
              <Link href="/settings">
                <Button className="w-full" variant="outline">
                  Pengaturan Aplikasi
                </Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pengguna Teraktif</CardTitle>
              <CardDescription>
                Pengguna yang paling banyak membuat rapat.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.mostActiveUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={`https://xsgames.co/randomusers/avatar.php?g=pixel&name=${encodeURIComponent(user.name)}`}
                      />
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-muted-foreground text-sm">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{user.meetingCount}</p>
                    <p className="text-muted-foreground text-xs">rapat</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
