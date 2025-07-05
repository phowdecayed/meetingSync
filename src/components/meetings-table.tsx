
"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { Meeting } from '@/lib/data';
import { format } from 'date-fns';
import { useMeetingStore } from '@/store/use-meeting-store';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
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
} from "@/components/ui/alert-dialog"
import { Card } from '@/components/ui/card';
import { MeetingDetailsDialog } from './meeting-details-dialog';

type MeetingsTableProps = {
  initialMeetings: Meeting[];
};

export function MeetingsTable({ initialMeetings }: MeetingsTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { meetings, setMeetings, deleteMeeting } = useMeetingStore();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [meetingToView, setMeetingToView] = useState<Meeting | null>(null);
  const { data: session } = useSession();
  const currentUser = session?.user;

  useEffect(() => {
    setMeetings(initialMeetings);
  }, [initialMeetings, setMeetings]);

  const now = new Date();
  const upcomingMeetings = meetings.filter(m => new Date(m.date) >= now).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const pastMeetings = meetings.filter(m => new Date(m.date) < now).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    try {
        await deleteMeeting(id);
        toast({
            title: "Meeting Deleted",
            description: "The meeting has been successfully removed.",
        });
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to delete meeting. Please try again.",
        });
    } finally {
        setIsDeleting(null);
    }
  };

  const MeetingRow = ({ meeting }: { meeting: Meeting }) => {
    const canManage = currentUser?.role === 'admin' || currentUser?.id === meeting.organizerId;
    
    return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{meeting.title}</div>
        <div className="text-sm text-muted-foreground truncate max-w-xs">{meeting.description || 'No description'}</div>
      </TableCell>
      <TableCell>{format(new Date(meeting.date), 'PP p')}</TableCell>
      <TableCell>{meeting.duration} min</TableCell>
      <TableCell>
        <Badge variant="secondary" className="whitespace-nowrap">{meeting.participants.length} Participant{meeting.participants.length !== 1 ? 's' : ''}</Badge>
      </TableCell>
      <TableCell className="text-right">
        <AlertDialog>
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setMeetingToView(meeting)}>
                    <Eye className="mr-2 h-4 w-4" /> View Details
                </DropdownMenuItem>
                {canManage && (
                    <>
                        <DropdownMenuItem onClick={() => router.push(`/meetings/${meeting.id}/edit`)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                    </>
                )}
            </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the meeting
                        and remove its data from our servers.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={() => handleDelete(meeting.id)}
                        disabled={isDeleting === meeting.id}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isDeleting === meeting.id ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )};
  
  const MeetingTableContent = ({ data }: { data: Meeting[] }) => {
    if (data.length === 0) {
      return (
        <div className="text-center p-8 text-muted-foreground">
          No meetings found.
        </div>
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Title</TableHead>
            <TableHead>Date & Time</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Participants</TableHead>
            <TableHead><span className="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(meeting => <MeetingRow key={meeting.id} meeting={meeting} />)}
        </TableBody>
      </Table>
    );
  }

  return (
    <>
        <Tabs defaultValue="upcoming">
        <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
            <Card>
            <MeetingTableContent data={upcomingMeetings} />
            </Card>
        </TabsContent>
        <TabsContent value="past">
            <Card>
                <MeetingTableContent data={pastMeetings} />
            </Card>
        </TabsContent>
        </Tabs>
        <MeetingDetailsDialog 
            isOpen={!!meetingToView}
            onClose={() => setMeetingToView(null)}
            meeting={meetingToView}
        />
    </>
  );
}
