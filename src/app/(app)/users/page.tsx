'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { type User } from '@/lib/data'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Loader2, MoreHorizontal, Edit, Trash2, PlusCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

function getInitials(name: string = '') {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

const addUserSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  role: z.enum(['admin', 'member']),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters.' }),
})

export default function UsersPage() {
  const { data: session, status } = useSession()
  const currentUser = session?.user
  const { toast } = useToast()

  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // State for dialogs
  const [userToEdit, setUserToEdit] = useState<User | null>(null)
  const [newRole, setNewRole] = useState<'admin' | 'member'>('member')
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isCreatingUser, setIsCreatingUser] = useState(false)

  const addUserForm = useForm<z.infer<typeof addUserSchema>>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'member',
      password: '',
    },
  })

  useEffect(() => {
    async function loadUsers() {
      if (currentUser?.role !== 'admin') return
      setIsLoading(true)
      try {
        const response = await fetch('/api/users')
        if (!response.ok) {
          throw new Error('Failed to fetch users')
        }
        const fetchedUsers = await response.json()
        const sortedUsers = fetchedUsers.sort((a: User, b: User) =>
          a.name.localeCompare(b.name),
        )
        setUsers(sortedUsers)
      } catch {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load users. Please try again later.',
        })
      } finally {
        setIsLoading(false)
      }
    }
    loadUsers()
  }, [currentUser, toast])

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [users, searchQuery])

  const handleOpenEditDialog = (user: User) => {
    setUserToEdit(user)
    setNewRole(user.role)
  }

  const handleUpdateRole = async () => {
    if (!userToEdit) return

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: userToEdit.id,
          role: newRole,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update user role')
      }

      setUsers(
        users
          .map((u) => (u.id === userToEdit.id ? { ...u, role: newRole } : u))
          .sort((a, b) => a.name.localeCompare(b.name)),
      )

      toast({
        title: 'Success',
        description: `User ${userToEdit.name}'s role has been updated to ${newRole}.`,
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update user role.',
      })
    } finally {
      setUserToEdit(null)
    }
  }

  const handleOpenDeleteDialog = (user: User) => {
    setUserToDelete(user)
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    try {
      const response = await fetch(`/api/users?id=${userToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete user')
      }

      setUsers(users.filter((u) => u.id !== userToDelete.id))
      toast({
        title: 'User Deleted',
        description: `User ${userToDelete.name} has been removed.`,
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete user.',
      })
    } finally {
      setUserToDelete(null)
    }
  }

  const handleAddUser = async (values: z.infer<typeof addUserSchema>) => {
    setIsCreatingUser(true)
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create user')
      }

      const newUser = await response.json()
      setUsers([...users, newUser].sort((a, b) => a.name.localeCompare(b.name)))
      toast({
        title: 'User Created',
        description: `User ${newUser.name} has been added to the system.`,
      })
      setIsAddUserOpen(false)
      addUserForm.reset()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message || 'Failed to create user.',
      })
    } finally {
      setIsCreatingUser(false)
    }
  }

  if (status === 'loading' || !currentUser) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (currentUser.role !== 'admin') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-headline text-3xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    )
  }

  const UserTable = ({ data }: { data: User[] }) => {
    if (data.length === 0) {
      return (
        <div className="text-muted-foreground p-8 text-center">
          {searchQuery
            ? 'No users match your search.'
            : 'No users found in the system.'}
        </div>
      )
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead className="hidden sm:table-cell">Email</TableHead>
            <TableHead className="hidden md:table-cell">Role</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={`https://xsgames.co/randomusers/avatar.php?g=pixel&name=${encodeURIComponent(user.name)}`}
                      alt={user.name}
                      data-ai-hint="user avatar"
                    />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-muted-foreground text-sm sm:hidden">
                      {user.email}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {user.email}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge
                  variant={user.role === 'admin' ? 'default' : 'secondary'}
                >
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {user.id !== currentUser.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => handleOpenEditDialog(user)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Edit Role</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleOpenDeleteDialog(user)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            View, search, and manage all users in the system.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-auto sm:w-64"
          />
          <Button onClick={() => setIsAddUserOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
            </div>
          ) : (
            <UserTable data={filteredUsers} />
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Enter the details for the new user.
            </DialogDescription>
          </DialogHeader>
          <Form {...addUserForm}>
            <form
              onSubmit={addUserForm.handleSubmit(handleAddUser)}
              className="space-y-4"
            >
              <FormField
                control={addUserForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addUserForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addUserForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addUserForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddUserOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreatingUser}>
                  {isCreatingUser && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create User
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog
        open={!!userToEdit}
        onOpenChange={(isOpen) => !isOpen && setUserToEdit(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role for {userToEdit?.name}</DialogTitle>
            <DialogDescription>
              Change the role for this user. Be careful, promoting a user to
              admin gives them full access.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid gap-2">
              <Label htmlFor="role-select">Role</Label>
              <Select
                value={newRole}
                onValueChange={(value: 'admin' | 'member') => setNewRole(value)}
              >
                <SelectTrigger id="role-select">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToEdit(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Alert Dialog */}
      <AlertDialog
        open={!!userToDelete}
        onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              account for {userToDelete?.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDeleteUser}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
