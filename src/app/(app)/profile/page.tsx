'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, UserCheck, Users, Calendar, Eye, EyeOff } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import type { Meeting } from '@/lib/data'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { signOut } from 'next-auth/react'
import { AlertTriangle } from 'lucide-react'

const profileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
})

const passwordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { message: 'Current password is required.' }),
    newPassword: z
      .string()
      .min(8, { message: 'New password must be at least 8 characters.' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match.",
    path: ['confirmPassword'],
  })

function getInitials(name: string = ''): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function ProfileStatistic({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: number | string
}) {
  return (
    <div className="bg-background/50 hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 transition-all">
      <div className="flex items-center gap-3">
        <Icon className="text-muted-foreground h-5 w-5" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-primary text-lg font-bold">{value}</span>
    </div>
  )
}

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession()
  const user = session?.user
  const [isSaving, setIsSaving] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [isMeetingsLoading, setIsMeetingsLoading] = useState(true)
  const { toast } = useToast()

  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: {
      name: user?.name || '',
      email: user?.email || '',
    },
  })

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const watchedEmail = form.watch('email')
  const isEmailDirty = watchedEmail !== user?.email

  useEffect(() => {
    if (user) {
      form.reset({ name: user.name || '', email: user.email || '' })
    }
  }, [user, form])

  useEffect(() => {
    async function loadMeetings() {
      if (!user) return
      setIsMeetingsLoading(true)
      try {
        const response = await fetch('/api/meetings')
        if (!response.ok) throw new Error('Failed to load meetings')
        const allMeetings = await response.json()
        setMeetings(allMeetings)
      } catch {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load meetings.',
        })
      } finally {
        setIsMeetingsLoading(false)
      }
    }
    loadMeetings()
  }, [user, toast])

  async function onSubmit(values: z.infer<typeof profileSchema>) {
    if (!user) return
    setIsSaving(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile')
      }

      if (result.emailChanged) {
        toast({
          title: 'Email Changed Successfully',
          description:
            'Your email has been updated. Please log in with your new email.',
        })
        // Log out the user and redirect to login page
        await signOut({ callbackUrl: '/login' })
      } else {
        // If only name was changed, just update the session
        await updateSession({ user: { ...session?.user, name: values.name } })
        toast({
          title: 'Profile Updated',
          description: 'Your name has been successfully updated.',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: (error as Error).message || 'Something went wrong.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function onPasswordSubmit(values: z.infer<typeof passwordSchema>) {
    setIsChangingPassword(true)
    try {
      const response = await fetch('/api/profile/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to change password')
      }

      toast({
        title: 'Password Changed',
        description: 'Your password has been successfully updated.',
      })
      passwordForm.reset()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Change Password Failed',
        description: (error as Error).message || 'Something went wrong.',
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (status === 'loading' || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    )
  }

  const meetingsOrganized = meetings.filter(
    (m) => m.organizerId === user.id,
  ).length
  const meetingsAttended = meetings.filter((m) => {
    const userEmail = user.email || ''
    return m.participants.includes(userEmail) && m.organizerId !== user.id
  }).length
  const now = new Date()
  const upcomingMeetingsCount = meetings.filter((m) => {
    const userEmail = user.email || ''
    return (
      (m.organizerId === user.id || m.participants.includes(userEmail)) &&
      new Date(m.date) >= now
    )
  }).length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information and see your activity.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Profile Card & Stats */}
        <div className="space-y-8 lg:col-span-1">
          <Card className="from-primary/5 to-background/0 bg-gradient-to-br text-center">
            <CardContent className="p-6">
              <Avatar className="border-primary/50 mx-auto mb-4 h-24 w-24 border-2">
                <AvatarImage
                  src={`https://xsgames.co/randomusers/avatar.php?g=pixel&name=${encodeURIComponent(user.name || '')}`}
                  alt={user.name || ''}
                  data-ai-hint="user avatar"
                />
                <AvatarFallback className="text-3xl">
                  {getInitials(user.name || '')}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-semibold">{user.name}</h2>
              <p className="text-muted-foreground">{user.email}</p>
              <Badge
                className="mt-2"
                variant={user.role === 'admin' ? 'default' : 'secondary'}
              >
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isMeetingsLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="text-primary h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
                  <ProfileStatistic
                    icon={UserCheck}
                    label="Meetings Organized"
                    value={meetingsOrganized}
                  />
                  <ProfileStatistic
                    icon={Users}
                    label="Meetings Attended"
                    value={meetingsAttended}
                  />
                  <ProfileStatistic
                    icon={Calendar}
                    label="Upcoming Meetings"
                    value={upcomingMeetingsCount}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Tabs for Editing */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="edit-profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit-profile">Edit Profile</TabsTrigger>
              <TabsTrigger value="change-password">Change Password</TabsTrigger>
            </TabsList>

            <TabsContent value="edit-profile">
              <Card>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>
                        Update your public display name and email address.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {isEmailDirty && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Warning</AlertTitle>
                          <AlertDescription>
                            Changing your email will update your login
                            credentials. You will be logged out after saving.
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                    <CardFooter className="justify-end">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Save Changes
                      </Button>
                    </CardFooter>
                  </form>
                </Form>
              </Card>
            </TabsContent>

            <TabsContent value="change-password">
              <Card>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                    <CardHeader>
                      <CardTitle>Security</CardTitle>
                      <CardDescription>
                        Update your account password.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input
                                  type={
                                    showCurrentPassword ? 'text' : 'password'
                                  }
                                  {...field}
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 text-gray-500"
                                onClick={() =>
                                  setShowCurrentPassword(!showCurrentPassword)
                                }
                              >
                                {showCurrentPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input
                                  type={showNewPassword ? 'text' : 'password'}
                                  {...field}
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 text-gray-500"
                                onClick={() =>
                                  setShowNewPassword(!showNewPassword)
                                }
                              >
                                {showNewPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input
                                  type={
                                    showConfirmPassword ? 'text' : 'password'
                                  }
                                  {...field}
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 text-gray-500"
                                onClick={() =>
                                  setShowConfirmPassword(!showConfirmPassword)
                                }
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                    <CardFooter className="justify-end">
                      <Button type="submit" disabled={isChangingPassword}>
                        {isChangingPassword && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Update Password
                      </Button>
                    </CardFooter>
                  </form>
                </Form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
