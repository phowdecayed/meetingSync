'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const { toast } = useToast();

  // State for integration settings
  const [zoomAccountId, setZoomAccountId] = useState('ACCOUNT_ID_FROM_ZOOM');
  const [zoomClientId, setZoomClientId] = useState('CLIENT_ID_FROM_ZOOM');
  const [zoomClientSecret, setZoomClientSecret] = useState('CLIENT_SECRET_FROM_ZOOM');
  const [isSaving, setIsSaving] = useState(false);


  useEffect(() => {
    if (!isLoading && user && user.role !== 'admin') {
      // You could redirect, but showing the message is clearer for the user.
      // router.push('/dashboard');
    }
  }, [user, isLoading, router]);
  
  const handleSaveIntegrations = async () => {
    setIsSaving(true);
    // In a real app, you would encrypt and save these to a secure backend.
    await new Promise(res => setTimeout(res, 1500));
    setIsSaving(false);
    toast({
        title: "Integrations Saved",
        description: "Your Zoom API credentials have been updated.",
    });
  };

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
          <CardTitle>Zoom Integration</CardTitle>
          <CardDescription>
            Connect using Server-to-Server OAuth credentials from your Zoom account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="zoom-account-id">Account ID</Label>
                <Input 
                    id="zoom-account-id"
                    value={zoomAccountId}
                    onChange={(e) => setZoomAccountId(e.target.value)}
                    placeholder="Your Zoom Account ID"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="zoom-client-id">Client ID</Label>
                <Input 
                    id="zoom-client-id"
                    value={zoomClientId}
                    onChange={(e) => setZoomClientId(e.target.value)}
                    placeholder="Your Zoom App's Client ID"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="zoom-client-secret">Client Secret</Label>
                <Input 
                    id="zoom-client-secret" 
                    type="password" 
                    value={zoomClientSecret}
                    onChange={(e) => setZoomClientSecret(e.target.value)}
                    placeholder="Your Zoom App's Client Secret"
                />
            </div>
        </CardContent>
        <CardFooter className="justify-end">
            <Button onClick={handleSaveIntegrations} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Credentials
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
