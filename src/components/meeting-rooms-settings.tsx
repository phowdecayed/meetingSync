'use client'

import { useState } from 'react'
import { Resolver, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { MeetingRoom } from '@prisma/client'
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const roomFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  capacity: z.coerce.number().min(1, {
    message: 'Capacity must be at least 1.',
  }),
  location: z.string().min(2, {
    message: 'Location must be at least 2 characters.',
  }),
})

type RoomFormValues = z.infer<typeof roomFormSchema>

interface MeetingRoomsSettingsProps {
  initialRooms: MeetingRoom[]
}

export function MeetingRoomsSettings({
  initialRooms,
}: MeetingRoomsSettingsProps) {
  const { toast } = useToast()
  const [rooms, setRooms] = useState<MeetingRoom[]>(initialRooms)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingRoom, setEditingRoom] = useState<MeetingRoom | null>(null)

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema) as Resolver<RoomFormValues>,
    defaultValues: {
      name: '',
      capacity: 1,
      location: '',
    },
  })

  const handleDialogOpen = (room: MeetingRoom | null = null) => {
    setEditingRoom(room)
    if (room) {
      form.reset({
        name: room.name,
        capacity: room.capacity,
        location: room.location,
      })
    } else {
      form.reset({ name: '', capacity: 1, location: '' })
    }
    setIsDialogOpen(true)
  }

  const onSubmit = async (data: z.output<typeof roomFormSchema>) => {
    setIsLoading(true)
    const url = editingRoom
      ? `/api/meeting-rooms/${editingRoom.id}`
      : '/api/meeting-rooms'
    const method = editingRoom ? 'PATCH' : 'POST'

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Something went wrong')
      }

      const savedRoom = await response.json()

      if (editingRoom) {
        setRooms(rooms.map((r) => (r.id === savedRoom.id ? savedRoom : r)))
      } else {
        setRooms([...rooms, savedRoom])
      }

      toast({
        title: 'Success',
        description: `Meeting room ${
          editingRoom ? 'updated' : 'created'
        } successfully.`,
      })
      setIsDialogOpen(false)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'An unknown error occurred.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/meeting-rooms/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Something went wrong')
      }

      setRooms(rooms.filter((r) => r.id !== id))
      toast({
        title: 'Success',
        description: 'Meeting room deleted successfully.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'An unknown error occurred.',
      })
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Capacity</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="text-right">
              <Button size="sm" onClick={() => handleDialogOpen()}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Room
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rooms.map((room) => (
            <TableRow key={room.id}>
              <TableCell className="font-medium">{room.name}</TableCell>
              <TableCell>{room.capacity}</TableCell>
              <TableCell>{room.location}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDialogOpen(room)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="text-destructive h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently
                        delete the meeting room.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(room.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? 'Edit Meeting Room' : 'Add New Meeting Room'}
            </DialogTitle>
            <DialogDescription>
              Fill in the details for the meeting room.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Conference Room A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 2nd Floor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingRoom ? 'Save Changes' : 'Create Room'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
