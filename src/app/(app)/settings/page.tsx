'use client'

import { useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Loader2, Eye, EyeOff } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { useSettingsStore } from '@/store/use-settings-store'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const user = session?.user
  const { toast } = useToast()
  const { appName, appDescription, isAllowRegistration, setSettings } =
    useSettingsStore()

  // State untuk pengaturan umum
  const [saving, setSaving] = useState(false)
  const [defaultRole, setDefaultRole] = useState<'member' | 'admin'>('member')
  const [defaultResetPassword, setDefaultResetPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const payload: {
        allowRegistration: boolean
        defaultRole: 'member' | 'admin'
        appName: string
        appDescription: string
        defaultResetPassword?: string
      } = {
        allowRegistration: isAllowRegistration,
        defaultRole,
        appName,
        appDescription,
      }
      if (defaultResetPassword) {
        payload.defaultResetPassword = defaultResetPassword
      }

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Gagal menyimpan pengaturan')
      }
      const data = await res.json()
      setSettings({
        appName: data.appName,
        appDescription: data.appDescription,
        isAllowRegistration: data.allowRegistration,
      })

      toast({
        title: 'Berhasil',
        description: 'Pengaturan berhasil disimpan.',
      })
      setDefaultResetPassword('') // Clear the field after saving
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal menyimpan',
        description: (error as Error).message,
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
              <>
                <div className="max-w-sm space-y-2">
                  <Label htmlFor="app-name">Nama Aplikasi</Label>
                  <Input
                    id="app-name"
                    value={appName}
                    onChange={(e) => setSettings({ appName: e.target.value })}
                    disabled={saving}
                    placeholder="e.g. MeetingSync"
                  />
                </div>
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="app-description">Deskripsi Aplikasi</Label>
                  <Textarea
                    id="app-description"
                    value={appDescription}
                    onChange={(e) =>
                      setSettings({ appDescription: e.target.value })
                    }
                    disabled={saving}
                    placeholder="Describe your application"
                  />
                </div>
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
                    checked={isAllowRegistration}
                    onCheckedChange={(checked) =>
                      setSettings({ isAllowRegistration: checked })
                    }
                    disabled={saving}
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
                    disabled={saving}
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
                <div className="max-w-sm space-y-2">
                  <Label htmlFor="default-reset-password">
                    Default Reset Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="default-reset-password"
                      type={showPassword ? 'text' : 'password'}
                      value={defaultResetPassword}
                      onChange={(e) => setDefaultResetPassword(e.target.value)}
                      placeholder="Kosongkan jika tidak ingin diubah"
                      disabled={saving}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 text-gray-500"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Kata sandi ini akan digunakan saat admin mereset password
                    pengguna.
                  </p>
                </div>
                <div className="pt-2">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Simpan Pengaturan
                  </Button>
                </div>
              </>
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
