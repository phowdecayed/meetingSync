'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    // This effect is for client-side protection, though the UI handles it gracefully.
    if (!isLoading && user && user.role !== 'admin') {
      // You could redirect, but showing the message is clearer for the user.
      // router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-headline font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">Application Settings</h1>
        <p className="text-muted-foreground">Manage global application settings. (Admin Only)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Manage general settings for the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <Label htmlFor="allow-registration" className="flex flex-col space-y-1">
              <span>Allow New User Registrations</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Enable or disable the public registration page.
              </span>
            </Label>
            <Switch id="allow-registration" defaultChecked disabled />
          </div>
          <div className="space-y-2 max-w-sm">
            <Label htmlFor="default-role">Default Role for New Users</Label>
            <Select defaultValue="member" disabled>
                <SelectTrigger id="default-role" className="w-[180px]">
                    <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Manage third-party integrations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="zoom-api-key">Zoom API Key</Label>
            <Input id="zoom-api-key" type="password" defaultValue="••••••••••••••••" disabled />
          </div>
          <Button disabled>Update Integrations</Button>
        </CardContent>
      </Card>
    </div>
  );
}
