"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Loader2, Plus, RefreshCw, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Tipe data untuk akun Zoom
type ZoomAccount = {
  id: string;
  clientId: string;
  clientSecret: string;
  accountId: string;
  hostKey?: string;
  createdAt: string;
  updatedAt: string;
};

export function ZoomSettings() {
  const [accounts, setAccounts] = useState<ZoomAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // State untuk menyimpan kredensial Zoom
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [accountId, setAccountId] = useState("");
  const [hostKey, setHostKey] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchZoomAccounts();
  }, []);

  async function fetchZoomAccounts() {
    try {
      setLoading(true);
      const response = await fetch("/api/zoom-accounts");

      if (!response.ok) {
        throw new Error("Failed to fetch Zoom accounts");
      }

      const data = await response.json();
      setAccounts(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch Zoom accounts",
      });
    } finally {
      setLoading(false);
    }
  }

  // Fungsi untuk menangani verifikasi kredensial
  async function handleVerify() {
    if (!clientId || !clientSecret || !accountId) {
      toast({
        variant: "destructive",
        title: "Kolom Hilang",
        description: "Harap isi semua kolom yang diperlukan untuk verifikasi.",
      });
      return;
    }

    setVerifying(true);
    try {
      const response = await fetch("/api/zoom/verify-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret, accountId }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Sukses",
          description: "Kredensial berhasil diverifikasi.",
        });
      } else {
        throw new Error(result.message || "Gagal memverifikasi kredensial.");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Verifikasi",
        description: error.message,
      });
    } finally {
      setVerifying(false);
    }
  }

  // Fungsi untuk menangani submit form
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!clientId || !clientSecret || !accountId) {
      toast({
        variant: "destructive",
        title: "Kolom Hilang",
        description: "Harap isi semua kolom yang diperlukan.",
      });
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/zoom-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          clientSecret,
          accountId,
          hostKey,
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal menyimpan kredensial Zoom");
      }

      toast({
        title: "Sukses",
        description: "Kredensial Zoom berhasil disimpan.",
      });

      // Reset form dan sembunyikan
      setClientId("");
      setClientSecret("");
      setAccountId("");
      setHostKey("");
      setShowForm(false);

      // Refresh daftar akun
      fetchZoomAccounts();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal menyimpan kredensial Zoom",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch("/api/zoom-accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete Zoom account");
      }

      toast({
        title: "Success",
        description: "Zoom account deleted successfully",
      });

      // Refresh accounts list
      fetchZoomAccounts();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete Zoom account",
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
                  <div className="grid grid-cols-4 p-4 font-medium border-b">
                    <div>Client ID</div>
                    <div>Account ID</div>
                    <div>Host Key</div>
                    <div></div>
                  </div>
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="grid grid-cols-4 p-4 items-center border-b last:border-0"
                    >
                      <div className="truncate">{account.clientId}</div>
                      <div className="truncate">
                        {account.accountId || "Not set"}
                      </div>
                      <div className="truncate">
                        {account.hostKey || "Not set"}
                      </div>
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
              <div className="mt-8">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-lg font-medium">
                    Tambah Kredensial Zoom Baru
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="clientId">Client ID (wajib)</Label>
                    <Input
                      id="clientId"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder="Masukkan Client ID Zoom Anda"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientSecret">Client Secret (wajib)</Label>
                    <Input
                      id="clientSecret"
                      type="password"
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      placeholder="Masukkan Client Secret Zoom Anda"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountId">Account ID (wajib)</Label>
                    <Input
                      id="accountId"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      placeholder="Masukkan Account ID Zoom Anda"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hostKey">Host Key</Label>
                    <Input
                      id="hostKey"
                      value={hostKey}
                      onChange={(e) => setHostKey(e.target.value)}
                      placeholder="Masukkan Host Key Zoom Anda"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Host Key digunakan untuk mengklaim host saat meeting
                      berlangsung
                    </p>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                      disabled={submitting || verifying}
                    >
                      Batal
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleVerify}
                      disabled={submitting || verifying}
                    >
                      {verifying && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Verifikasi
                    </Button>
                    <Button type="submit" disabled={submitting || verifying}>
                      {submitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Simpan
                    </Button>
                  </div>
                </form>
              </div>
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
