'use client';

import { useAuthStore } from '@/store/use-auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

function getInitials(name: string = ""): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

export default function ProfilePage() {
  const { user, isLoading } = useAuthStore();

  if (isLoading || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">My Profile</h1>
        <p className="text-muted-foreground">View your personal information.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={`https://placehold.co/100x100.png`} alt={user.name} data-ai-hint="user avatar" />
              <AvatarFallback className="text-2xl">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-3xl">{user.name}</CardTitle>
              <CardDescription className="mt-1">
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-sm">
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
           <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={user.name} readOnly />
          </div>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" value={user.email} readOnly />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
