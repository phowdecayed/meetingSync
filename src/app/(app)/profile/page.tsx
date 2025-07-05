'use client';

import { useAuthStore } from '@/store/use-auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Edit, UserCheck, Users, Calendar } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getMeetings, type Meeting } from '@/lib/data';

const profileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, { message: 'Current password is required.' }),
  newPassword: z.string().min(8, { message: 'New password must be at least 8 characters.' }),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});


function getInitials(name: string = ""): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

export default function ProfilePage() {
  const { user, isLoading: isAuthLoading, updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isMeetingsLoading, setIsMeetingsLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: {
      name: user?.name || '',
    },
  });
  
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({ name: user.name });
    }
  }, [user, form, isEditing]);

  useEffect(() => {
    async function loadMeetings() {
      if (!user) return;
      setIsMeetingsLoading(true);
      const allMeetings = await getMeetings();
      setMeetings(allMeetings);
      setIsMeetingsLoading(false);
    }
    loadMeetings();
  }, [user]);

  async function onSubmit(values: z.infer<typeof profileSchema>) {
    setIsSaving(true);
    try {
      await updateUser({ name: values.name });
      toast({
        title: "Profile Updated",
        description: "Your name has been successfully updated.",
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: (error as Error).message || "Something went wrong.",
      });
    } finally {
      setIsSaving(false);
    }
  }
  
  async function onPasswordSubmit(values: z.infer<typeof passwordSchema>) {
    setIsPasswordSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    // In a real app, you'd call an API to change the password.
    // We'll just show a success toast for this demo.
    toast({
        title: "Password Updated",
        description: "Your password has been successfully changed.",
    });
    passwordForm.reset();
    setIsPasswordSaving(false);
  }

  if (isAuthLoading || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const meetingsOrganized = meetings.filter(m => m.organizerId === user.id).length;
  const meetingsAttended = meetings.filter(m => m.participants.includes(user.email) && m.organizerId !== user.id).length;
  const now = new Date();
  const upcomingMeetingsCount = meetings.filter(m => (m.organizerId === user.id || m.participants.includes(user.email)) && new Date(m.date) >= now).length;


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">My Profile</h1>
        <p className="text-muted-foreground">View and manage your personal information and statistics.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
            <Card>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                    <CardTitle className="text-2xl">Personal Information</CardTitle>
                    <CardDescription>Update your name and view your details.</CardDescription>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setIsEditing(!isEditing)} disabled={isSaving}>
                        <Edit className="h-5 w-5" />
                        <span className="sr-only">Edit Profile</span>
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20">
                        <AvatarImage src={`https://xsgames.co/randomusers/avatar.php?g=pixel&name=${encodeURIComponent(user.name)}`} alt={user.name} data-ai-hint="user avatar" />
                        <AvatarFallback className="text-2xl">{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <h2 className="text-2xl font-semibold">{form.watch('name')}</h2>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                    </div>
                    </div>

                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                            <Input {...field} readOnly={!isEditing} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" value={user.email} readOnly />
                    </div>
                </CardContent>
                {isEditing && (
                    <CardFooter className="justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => { setIsEditing(false); form.reset({ name: user.name }); }}>Cancel</Button>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                    </CardFooter>
                )}
                </form>
            </Form>
            </Card>
            
            <Card>
                <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                        <CardHeader>
                            <CardTitle className="text-2xl">Change Password</CardTitle>
                            <CardDescription>Enter your current password and a new password.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField
                                control={passwordForm.control}
                                name="currentPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Current Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} placeholder="••••••••" />
                                        </FormControl>
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
                                        <FormControl>
                                            <Input type="password" {...field} placeholder="••••••••" />
                                        </FormControl>
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
                                        <FormControl>
                                            <Input type="password" {...field} placeholder="••••••••" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                        <CardFooter className="justify-end">
                            <Button type="submit" disabled={isPasswordSaving}>
                                {isPasswordSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Update Password
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>
        </div>

        <div className="lg:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">My Statistics</CardTitle>
                    <CardDescription>Your meeting activity at a glance.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isMeetingsLoading ? (
                        <div className="flex justify-center items-center h-48">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="flex items-center gap-3">
                                    <UserCheck className="h-6 w-6 text-primary" />
                                    <span className="font-medium">Meetings Organized</span>
                                </div>
                                <span className="text-xl font-bold">{meetingsOrganized}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="flex items-center gap-3">
                                <Users className="h-6 w-6 text-primary" />
                                    <span className="font-medium">Meetings Attended</span>
                                </div>
                                <span className="text-xl font-bold">{meetingsAttended}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="flex items-center gap-3">
                                    <Calendar className="h-6 w-6 text-primary" />
                                    <span className="font-medium">Upcoming Meetings</span>
                                </div>
                                <span className="text-xl font-bold">{upcomingMeetingsCount}</span>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
