'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2, Plus, RefreshCw, Trash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ZoomAccount = {
  id: string;
  apiKey: string;
  accountId?: string;
  createdAt: string;
  updatedAt: string;
};

export function ZoomSettings() {
  const [accounts, setAccounts] = useState<ZoomAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [accountId, setAccountId] = useState('');

  useEffect(() => {
    fetchZoomAccounts();
  }, []);

  async function fetchZoomAccounts() {
    try {
      setLoading(true);
      const response = await fetch('/api/zoom-accounts');
      
      if (!response.ok) {
        throw new Error('Failed to fetch Zoom accounts');
      }
      
      const data = await response.json();
      setAccounts(data);
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "Failed to fetch Zoom accounts" 
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!apiKey || !apiSecret) {
      toast({ 
        variant: "destructive", 
        title: "Missing Fields", 
        description: "Please fill in all required fields" 
      });
      return;
    }
    
    try {
      setSubmitting(true);
      
      const response = await fetch('/api/zoom-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          apiSecret,
          accountId: accountId || undefined,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save Zoom credentials');
      }
      
      toast({ title: "Success", description: "Zoom credentials saved successfully" });
      
      // Reset form and hide it
      setApiKey('');
      setApiSecret('');
      setAccountId('');
      setShowForm(false);
      
      // Refresh accounts list
      fetchZoomAccounts();
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "Failed to save Zoom credentials" 
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch('/api/zoom-accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete Zoom account');
      }
      
      toast({ title: "Success", description: "Zoom account deleted successfully" });
      
      // Refresh accounts list
      fetchZoomAccounts();
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "Failed to delete Zoom account" 
      });
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Zoom Integration Settings</CardTitle>
        <CardDescription>
          Manage your Zoom API credentials for meeting integration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {accounts.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Saved Zoom Credentials</h3>
                <div className="rounded-md border">
                  <div className="grid grid-cols-3 p-4 font-medium border-b">
                    <div>API Key</div>
                    <div>Account ID</div>
                    <div></div>
                  </div>
                  {accounts.map((account) => (
                    <div key={account.id} className="grid grid-cols-3 p-4 items-center border-b last:border-0">
                      <div className="truncate">{account.apiKey}</div>
                      <div className="truncate">{account.accountId || 'Not set'}</div>
                      <div className="flex justify-end">
                        <Button 
                          variant="destructive" 
                          size="icon"
                          onClick={() => handleDelete(account.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No Zoom credentials found. Add your first one below.
              </div>
            )}

            {showForm ? (
              <form onSubmit={handleSubmit} className="space-y-4 mt-8">
                <h3 className="text-lg font-medium">Add New Zoom Credentials</h3>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key (required)</Label>
                  <Input 
                    id="apiKey" 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Zoom API Key"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiSecret">API Secret (required)</Label>
                  <Input 
                    id="apiSecret"
                    type="password" 
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Enter your Zoom API Secret"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountId">Account ID / User ID (optional)</Label>
                  <Input 
                    id="accountId" 
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    placeholder="Enter your Zoom Account ID or User ID (optional)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Jika tidak diisi, akan menggunakan user default dari API Key.
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Credentials
                  </Button>
                </div>
              </form>
            ) : (
              <div className="mt-4 text-center">
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Zoom Credentials
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={fetchZoomAccounts}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <a 
          href="https://marketplace.zoom.us/develop/create" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-sm text-blue-500 hover:underline"
        >
          Need help? Visit Zoom Developer Portal
        </a>
      </CardFooter>
    </Card>
  );
} 