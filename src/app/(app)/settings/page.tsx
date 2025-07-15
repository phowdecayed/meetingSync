'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ZoomSettings } from '@/components/zoom-settings'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const user = session?.user
  const { toast } = useToast()

  // State untuk pengaturan umum
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [saving, setSaving] = useState(false)
  const [allowRegistration, setAllowRegistration] = useState(true)
  const [defaultRole, setDefaultRole] = useState<'member' | 'admin'>('member')

  useEffect(() => {
    async function fetchSettings() {
      setLoadingSettings(true)
      try {
        const res = await fetch('/api/settings')
        if (!res.ok) throw new Error('Gagal mengambil data pengaturan')
        const data = await res.json()
        setAllowRegistration(data.allowRegistration)
        setDefaultRole(data.defaultRole)
      } catch {
        toast({
          variant: 'destructive',
          title: 'Gagal memuat pengaturan',
          description: 'Terjadi kesalahan saat mengambil data pengaturan.',
        })
      } finally {
        setLoadingSettings(false)
      }
    }
    fetchSettings()
  }, [toast])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowRegistration, defaultRole }),
      })
      if (!res.ok) throw new Error('Gagal menyimpan pengaturan')
      toast({
        title: 'Berhasil',
        description: 'Pengaturan berhasil disimpan.',
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Gagal menyimpan',
        description: 'Terjadi kesalahan saat menyimpan pengaturan.',
      })
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (user.role !== 'admin') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-headline text-3xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold">
          Pengaturan Aplikasi
        </h1>
        <p className="text-muted-foreground">
          Kelola pengaturan aplikasi secara global. (Hanya Admin)
        </p>
      </div>

      <Tabs defaultValue="umum" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="umum">Umum</TabsTrigger>
          <TabsTrigger value="zoom">Integrasi Zoom</TabsTrigger>
        </TabsList>
        <TabsContent value="umum">
          <Card>
            <CardHeader>
              <CardTitle>Umum</CardTitle>
              <CardDescription>
                Kelola pengaturan umum aplikasi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingSettings ? (
                <div className="flex h-24 items-center justify-center">
                  <Loader2 className="text-primary h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                    <Label
                      htmlFor="allow-registration"
                      className="flex flex-col space-y-1"
                    >
                      <span>Izinkan Registrasi Pengguna Baru</span>
                      <span className="text-muted-foreground leading-snug font-normal">
                        Aktifkan atau nonaktifkan halaman registrasi publik.
                      </span>
                    </Label>
                    <Switch
                      id="allow-registration"
                      checked={allowRegistration}
                      onCheckedChange={setAllowRegistration}
                      disabled={saving || user?.role !== 'admin'}
                    />
                  </div>
                  <div className="max-w-sm space-y-2">
                    <Label htmlFor="default-role">
                      Peran Default untuk Pengguna Baru
                    </Label>
                    <Select
                      value={defaultRole}
                      onValueChange={(v) =>
                        setDefaultRole(v as 'member' | 'admin')
                      }
                      disabled={saving || user?.role !== 'admin'}
                    >
                      <SelectTrigger id="default-role" className="w-[180px]">
                        <SelectValue placeholder="Pilih peran" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Anggota</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {user?.role === 'admin' && (
                    <div className="pt-2">
                      <Button onClick={handleSave} disabled={saving}>
                        {saving && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Simpan Pengaturan
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="zoom">
          <Card>
            <CardHeader>
              <CardTitle>Integrasi Zoom</CardTitle>
              <CardDescription>
                Hubungkan akun Zoom Anda untuk mengaktifkan konferensi video
                pada rapat.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ZoomSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
