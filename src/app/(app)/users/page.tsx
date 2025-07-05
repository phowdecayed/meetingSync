'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { users as allUsers } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';

function getInitials(name: string = "") {
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

export default function UsersPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && user && user.role !== 'admin') {
      router.push('/dashboard');
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
        <h1 className="text-3xl font-headline font-bold">User Management</h1>
        <p className="text-muted-foreground">View and manage all users in the system.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={`https://placehold.co/100x100.png`} alt={u.name} data-ai-hint="user avatar" />
                        <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                      {u.role}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
