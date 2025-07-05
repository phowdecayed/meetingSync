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
import { Loader2, Trash2, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getZoomAccounts, addZoomAccount, removeZoomAccount } from '@/lib/data';

type ZoomAccount = {
  id: string;
  email: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const { toast } = useToast();

  // State for global API credentials
  const [zoomClientId, setZoomClientId] = useState('CLIENT_ID_FROM_ZOOM');
  const [zoomClientSecret, setZoomClientSecret] = useState('CLIENT_SECRET_FROM_ZOOM');
  const [isSaving, setIsSaving] = useState(false);

  // State for zoom account pool
  const [accounts, setAccounts] = useState<ZoomAccount[]>([]);
  const [isAccountsLoading, setIsAccountsLoading] = useState(true);
  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthLoading && user && user.role !== 'admin') {
      // router.push('/dashboard');
    }
  }, [user, isAuthLoading, router]);

  useEffect(() => {
    async function loadAccounts() {
      if (user?.role !== 'admin') return;
      setIsAccountsLoading(true);
      try {
        const fetchedAccounts = await getZoomAccounts();
        setAccounts(fetchedAccounts);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load Zoom accounts.' })
      } finally {
        setIsAccountsLoading(false);
      }
    }
    loadAccounts();
  }, [user, toast]);
  
  const handleSaveCredentials = async () => {
    setIsSaving(true);
    await new Promise(res => setTimeout(res, 1500));
    setIsSaving(false);
    toast({
        title: "Credentials Saved",
        description: "Your Zoom API credentials have been updated.",
    });
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountEmail.trim()) return;
    setIsAdding(true);
    try {
        const newAccount = await addZoomAccount(newAccountEmail);
        setAccounts([...accounts, newAccount]);
        setNewAccountEmail('');
        toast({
            title: "Account Added",
            description: `Successfully added ${newAccount.email}.`,
        });
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: (error as Error).message,
        });
    } finally {
        setIsAdding(false);
    }
  };

  const handleRemoveAccount = async (id: string) => {
    setDeletingId(id);
    try {
        await removeZoomAccount(id);
        setAccounts(accounts.filter(acc => acc.id !== id));
        toast({
            title: "Account Removed",
            description: `The account has been removed from the pool.`,
        });
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: (error as Error).message,
        });
    } finally {
        setDeletingId(null);
    }
  };

  if (isAuthLoading || !user) {
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
          <CardTitle>Zoom API Credentials</CardTitle>
          <CardDescription>
            Connect using Server-to-Server OAuth credentials. These apply to all accounts in the pool.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
            <Button onClick={handleSaveCredentials} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Credentials
            </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Zoom Account Pool</CardTitle>
            <CardDescription>Manage the pool of Zoom accounts used for scheduling meetings to load balance requests.</CardDescription>
        </CardHeader>
        <CardContent>
            {isAccountsLoading ? (
                <div className="flex justify-center items-center h-24">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-4">
                    {accounts.map(account => (
                        <div key={account.id} className="flex items-center justify-between rounded-lg border p-3 pl-4">
                            <span className="text-sm font-medium">{account.email}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive h-8 w-8"
                                disabled={deletingId === account.id}
                                onClick={() => handleRemoveAccount(account.id)}
                            >
                                {deletingId === account.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                                <span className="sr-only">Remove Account</span>
                            </Button>
                        </div>
                    ))}
                    {accounts.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No accounts in the pool. Add one below.</p>
                    )}
                </div>
            )}
        </CardContent>
        <CardFooter className="border-t pt-6">
            <form onSubmit={handleAddAccount} className="flex w-full items-center gap-2">
                <Input
                    placeholder="new-account@example.com"
                    value={newAccountEmail}
                    onChange={(e) => setNewAccountEmail(e.target.value)}
                    disabled={isAdding}
                />
                <Button type="submit" disabled={isAdding || !newAccountEmail.trim()}>
                    {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Add
                </Button>
            </form>
        </CardFooter>
      </Card>
    </div>
  );
}
