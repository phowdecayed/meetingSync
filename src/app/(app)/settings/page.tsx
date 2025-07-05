import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and application settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your personal information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" defaultValue="Admin User" disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" defaultValue="admin@example.com" disabled />
          </div>
          <Button disabled>Update Profile</Button>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Change your password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input id="current-password" type="password" disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input id="new-password" type="password" disabled />
          </div>
          <Button disabled>Change Password</Button>
        </CardContent>
      </Card>
    </div>
  );
}
